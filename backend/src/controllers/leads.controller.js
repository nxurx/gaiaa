const Lead = require('../models/Lead');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { buildDateFilter, parsePagination } = require('../utils/queryHelpers');
const { sendDiscordNotification } = require('../services/discord.service');

// CSV/spreadsheet headers arrive in whatever casing the source file used
// ("Name", "Business Name", "phone_number", etc). Normalize each row's keys
// so field lookups are case-insensitive and punctuation/whitespace-insensitive,
// instead of only matching an exact lowercase key (which silently produced
// blank/garbage leads for any CSV that wasn't already lowercase - including
// Gaia's own scraper CSV export, which uses headers like "Name", "Phone").
function normalizeKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildRowLookup(row) {
  const lookup = {};
  if (!row || typeof row !== 'object') return lookup;
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key);
    // first non-empty match for a given normalized key wins
    if (nk && (lookup[nk] === undefined || lookup[nk] === '')) lookup[nk] = value;
  }
  return lookup;
}

function pick(lookup, candidates) {
  for (const c of candidates) {
    const v = lookup[c];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

const FIELD_CANDIDATES = {
  name: ['name', 'businessname', 'leadname', 'contactname', 'fullname', 'title', 'placename', 'storename'],
  company: ['company', 'business', 'businessname', 'organization', 'org'],
  email: ['email', 'emailaddress', 'contactemail'],
  phone: ['phone', 'phonenumber', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'number'],
  website: ['website', 'url', 'site', 'homepage', 'web', 'domain', 'siteurl'],
  address: ['address', 'fulladdress', 'addr', 'location', 'street', 'city'],
  rating: ['rating', 'avgrating', 'starrating', 'score', 'stars', 'averagerating', 'googlerating'],
  reviews: ['reviews', 'reviewcount', 'numreviews', 'ratingcount', 'totalreviews', 'reviewscount', 'numberofreviews'],
  industry: ['industry', 'category', 'niche', 'servicerequested', 'businesstype', 'genre', 'type', 'tag'],
  notes: ['notes', 'message', 'comment', 'comments', 'description'],
  campaign: ['campaign', 'list', 'listname'],
};

/**
 * Maps one raw CSV/import row into a Lead-shaped payload.
 * Returns { lead } on success, or { error } when the row has no usable
 * name/contact info (instead of silently fabricating a fake lead).
 */
function normalizeImportedLead(row, defaults = {}) {
  const tags = Array.isArray(defaults.tags)
    ? defaults.tags
    : String(defaults.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);

  const lookup = buildRowLookup(row);

  const name = pick(lookup, FIELD_CANDIDATES.name);
  const company = pick(lookup, FIELD_CANDIDATES.company);
  const email = pick(lookup, FIELD_CANDIDATES.email);
  const phone = pick(lookup, FIELD_CANDIDATES.phone);
  const website = pick(lookup, FIELD_CANDIDATES.website);
  const address = pick(lookup, FIELD_CANDIDATES.address);
  const rating = pick(lookup, FIELD_CANDIDATES.rating);
  const reviews = pick(lookup, FIELD_CANDIDATES.reviews);
  const industry = pick(lookup, FIELD_CANDIDATES.industry);
  const notes = pick(lookup, FIELD_CANDIDATES.notes);
  const campaign = pick(lookup, FIELD_CANDIDATES.campaign);

  const resolvedName = name || company;
  const hasContact = Boolean(phone || email || website);

  if (!resolvedName && !hasContact) {
    return { error: 'Empty row: no name and no contact info (phone/email/website).' };
  }
  if (!resolvedName) {
    return { error: 'Missing business/lead name.' };
  }
  if (!hasContact) {
    return { error: `"${resolvedName}": missing contact info - needs a phone, email, or website.` };
  }

  return {
    lead: {
      name: resolvedName,
      company: company || resolvedName,
      email: email || `noreply+${Date.now()}${Math.floor(Math.random() * 10000)}@import.local`,
      phone: phone || '0000000000',
      website,
      address,
      rating: rating ? String(rating) : '',
      reviews: reviews ? String(reviews) : '',
      serviceRequested: defaults.industry || industry || 'General',
      industry: defaults.industry || industry || '',
      message: notes || `Imported from ${defaults.source || 'csv_import'}`,
      source: defaults.source || 'csv_import',
      assignedTo: defaults.assignedTo || null,
      campaign: defaults.campaign || campaign || '',
      tags,
      priority: defaults.priority || 'normal',
      customFields: (row && typeof row.customFields === 'object') ? row.customFields : {},
      enrichment: (row && typeof row.enrichment === 'object') ? row.enrichment : {
        category: industry || '',
        socialLinks: (row && row.socialLinks) || [],
        scraperLink: (row && row.link) || '',
      },
    },
  };
}

/**
 * POST /api/leads  (Public - website form)
 */
const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create(req.body);

  sendDiscordNotification('New Lead Created', lead, req.user, {}).catch(() => {});

  sendSuccess(res, {
    statusCode: 201,
    message: 'Thank you! Your request has been received.',
    data: lead,
  });
});

/**
 * GET /api/leads
 * Admins see all. Agents see only their assigned leads.
 * Supports: ?page, ?limit, ?from, ?to, ?agent, ?status, ?source
 */
const getLeads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { from, to, status, source, agent } = req.query;

  const filter = { ...buildDateFilter(from, to) };

  if (req.user.role === 'agent') {
    filter.assignedTo = req.user._id;
  } else if (agent) {
    filter.assignedTo = agent;
  }

  if (status) filter.status = status;
  if (source) filter.source = source;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: leads,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/leads/:id
 */
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found.');

  if (req.user.role === 'agent' && lead.assignedTo?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied. This lead is not assigned to you.');
  }

  sendSuccess(res, { data: lead });
});

/**
 * PATCH /api/leads/:id/assign  (Admin only)
 */
const assignLead = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;

  const agent = await User.findOne({ _id: assignedTo, role: 'agent', isActive: true });
  if (!agent) throw new ApiError(404, 'Active agent not found with the provided ID.');

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { assignedTo, status: 'contacted' },
    { new: true, runValidators: true }
  ).populate('assignedTo', 'username role');

  if (!lead) throw new ApiError(404, 'Lead not found.');

  sendSuccess(res, { message: `Lead assigned to ${agent.username}`, data: lead });
});

/**
 * PATCH /api/leads/:id/status
 * Admin: any lead. Agent: only their assigned leads.
 */
const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found.');

  if (req.user.role === 'agent' && lead.assignedTo?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied. This lead is not assigned to you.');
  }

  lead.status = req.body.status;
  await lead.save();

  sendDiscordNotification('Lead Status Updated', lead, req.user, { status: lead.status }).catch(() => {});

  sendSuccess(res, { message: 'Lead status updated', data: lead });
});

/**
 * POST /api/leads/bulk-import
 * Bulk import scraped or CSV leads into the call queue with deduplication.
 * Admins can assign to agents. Agents can import for themselves.
 */
const bulkImportLeads = asyncHandler(async (req, res) => {
  const { leads = [], assignTo, campaign = '', tags = [], priority = 'normal', source = 'google_maps_scraper', industry = '' } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    throw new ApiError(400, 'At least one lead is required.');
  }

  // Determine the assignment target
  let assignedTo = assignTo || null;
  if (req.user.role === 'agent') {
    // Agents can only import for themselves
    assignedTo = req.user._id;
  } else if (assignTo) {
    // Admins can assign to specific agents
    const agent = await User.findOne({ _id: assignTo, role: 'agent', isActive: true });
    if (!agent) throw new ApiError(404, 'Active agent not found with the provided ID.');
  }

  const imported = [];
  const duplicates = [];
  const errors = [];

  for (let i = 0; i < leads.length; i++) {
    const row = leads[i];
    try {
      const result = normalizeImportedLead(row, {
        assignedTo,
        campaign,
        tags,
        priority,
        source,
        industry,
      });

      if (result.error) {
        errors.push({ name: `Row ${i + 1}`, error: result.error });
        continue;
      }

      const payload = result.lead;

      // Only match on fields that actually identify a real business - a blank/placeholder
      // phone or generated import email must never be used to dedupe, or every row without
      // a real phone number would collide with each other and get silently dropped.
      const dupeConditions = [];
      if (payload.phone && payload.phone !== '0000000000') dupeConditions.push({ phone: payload.phone });
      if (payload.email && !payload.email.includes('@import.local')) dupeConditions.push({ email: payload.email });
      if (payload.website) dupeConditions.push({ website: payload.website });
      if (payload.address) dupeConditions.push({ name: payload.name, address: payload.address });

      const existing = dupeConditions.length
        ? await Lead.findOne({ $or: dupeConditions })
        : null;

      if (existing) {
        duplicates.push({ name: payload.name, reason: 'Already exists in lead database' });
        continue;
      }

      const lead = await Lead.create(payload);
      imported.push(lead);
    } catch (error) {
      const fallbackName = (row && (row.name || row.Name || row.businessName)) || `Row ${i + 1}`;
      errors.push({ name: fallbackName, error: error.message });
    }
  }

  if (imported.length) {
    sendDiscordNotification('Scraped Leads Sent To Queue', imported[0], req.user, {
      notes: `${imported.length} leads imported into the call queue. Duplicates skipped: ${duplicates.length}. Errors: ${errors.length}.`,
    }).catch(() => {});
  }

  const summaryParts = [`${imported.length} imported`];
  if (duplicates.length) summaryParts.push(`${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} skipped`);
  if (errors.length) summaryParts.push(`${errors.length} row${errors.length === 1 ? '' : 's'} failed`);

  sendSuccess(res, {
    // Never report a hard success (201) if nothing actually made it into the database -
    // the frontend uses this to decide whether to show a success or warning toast.
    statusCode: imported.length > 0 ? 201 : 200,
    message: `Bulk import complete: ${summaryParts.join(', ')}.`,
    data: {
      imported: imported.length,
      skipped: duplicates.length,
      duplicates,
      errors,
      leads: imported,
    },
  });
});

module.exports = { createLead, getLeads, getLeadById, assignLead, updateLeadStatus, bulkImportLeads };
