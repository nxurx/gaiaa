const Lead = process.env.USE_MONGODB === 'true' ? require('../models/Lead') : require('../models/Lead.json');
const User = process.env.USE_MONGODB === 'true' ? require('../models/User') : require('../models/User.json');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { buildDateFilter, parsePagination } = require('../utils/queryHelpers');
const { sendDiscordNotification } = require('../services/discord.service');

function normalizeImportedLead(row, defaults = {}) {
  const tags = Array.isArray(defaults.tags)
    ? defaults.tags
    : String(defaults.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);

  return {
    name: row.name || row.businessName || row.company || 'Unnamed business',
    company: row.company || row.name || row.businessName || '',
    email: row.email || `noreply+${Date.now()}${Math.floor(Math.random() * 10000)}@import.local`,
    phone: row.phone || '0000000000',
    website: row.website || '',
    address: row.address || '',
    rating: row.rating ? String(row.rating) : '',
    reviews: row.reviews || row.reviewCount ? String(row.reviews || row.reviewCount) : '',
    serviceRequested: defaults.industry || row.industry || row.category || row.serviceRequested || 'General',
    industry: defaults.industry || row.industry || row.category || '',
    message: row.notes || row.message || `Imported from ${defaults.source || 'scraper'}`,
    source: defaults.source || row.source || 'google_maps_scraper',
    assignedTo: defaults.assignedTo || null,
    campaign: defaults.campaign || row.campaign || '',
    tags,
    priority: defaults.priority || row.priority || 'normal',
    customFields: row.customFields || {},
    enrichment: row.enrichment || {
      category: row.category || '',
      socialLinks: row.socialLinks || [],
      scraperLink: row.link || '',
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

  let leads, total;

  if (process.env.USE_MONGODB === 'true') {
    [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'username role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);
  } else {
    const allLeads = Lead.find(filter);
    total = allLeads.length;
    leads = allLeads
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);
  }

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

  let lead;
  if (process.env.USE_MONGODB === 'true') {
    lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'contacted' },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'username role');
  } else {
    lead = await Lead.findById(req.params.id);
    if (!lead) throw new ApiError(404, 'Lead not found.');
    lead.assignedTo = assignedTo;
    lead.status = 'contacted';
    lead.updatedAt = new Date().toISOString();
    await lead.save();
  }

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
 */
const bulkImportLeads = asyncHandler(async (req, res) => {
  const { leads = [], assignTo, campaign = '', tags = [], priority = 'normal', source = 'google_maps_scraper', industry = '' } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    throw new ApiError(400, 'At least one lead is required.');
  }

  if (assignTo) {
    const agent = await User.findOne({ _id: assignTo, role: 'agent', isActive: true });
    if (!agent) throw new ApiError(404, 'Active agent not found with the provided ID.');
  }

  const imported = [];
  const duplicates = [];
  const errors = [];

  for (const row of leads) {
    try {
      const payload = normalizeImportedLead(row, {
        assignedTo: assignTo || null,
        campaign,
        tags,
        priority,
        source,
        industry,
      });

      // Check for duplicates - simplified for JSON database
      let existing = null;
      if (process.env.USE_MONGODB === 'true') {
        const dupeFilter = {
          $or: [
            payload.phone && payload.phone !== '0000000000' ? { phone: payload.phone } : null,
            payload.email && !payload.email.includes('@import.local') ? { email: payload.email } : null,
            payload.website ? { website: payload.website } : null,
            { name: payload.name, address: payload.address },
          ].filter(Boolean),
        };
        existing = await Lead.findOne(dupeFilter);
      } else {
        // Simple deduplication for JSON database
        if (payload.phone && payload.phone !== '0000000000') {
          existing = await Lead.findOne({ phone: payload.phone });
        }
        if (!existing && payload.email && !payload.email.includes('@import.local')) {
          existing = await Lead.findOne({ email: payload.email });
        }
        if (!existing && payload.website) {
          existing = await Lead.findOne({ website: payload.website });
        }
        if (!existing) {
          existing = await Lead.findOne({ name: payload.name, address: payload.address });
        }
      }

      if (existing) {
        duplicates.push({ name: payload.name, reason: 'Already exists in lead database' });
        continue;
      }

      const lead = await Lead.create(payload);
      imported.push(lead);
    } catch (error) {
      errors.push({ name: row.name || row.businessName || 'Unknown', error: error.message });
    }
  }

  if (imported.length) {
    sendDiscordNotification('Scraped Leads Sent To Queue', imported[0], req.user, {
      notes: `${imported.length} leads imported into the call queue. Duplicates skipped: ${duplicates.length}. Errors: ${errors.length}.`,
    }).catch(() => {});
  }

  sendSuccess(res, {
    statusCode: 201,
    message: 'Bulk import complete',
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

