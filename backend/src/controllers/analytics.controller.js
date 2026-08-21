const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Call = require('../models/Call');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { buildDateFilter } = require('../utils/queryHelpers');

const DAY_MS = 24 * 60 * 60 * 1000;

const getOverview = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = buildDateFilter(from, to);
  const leadMatch = dateFilter;
  const callMatch = dateFilter;
  const leadWindowMatch = dateFilter.createdAt ? dateFilter : { createdAt: { $gte: daysAgo(30) } };
  const callWindowMatch = dateFilter.createdAt ? dateFilter : { createdAt: { $gte: daysAgo(30) } };

  const [
    totalLeads,
    totalCalls,
    totalUsers,
    totalDurationRow,
    leadsByStatus,
    callsByStatus,
    leadsBySource,
    leadsByService,
    dailyLeads,
    dailyCalls,
    dailyConversions,
    hourlyCalls,
    agentLeaderboard,
    recentTrend,
  ] = await Promise.all([
    Lead.countDocuments(leadMatch),
    Call.countDocuments(callMatch),
    User.countDocuments({ isActive: true }),
    Call.aggregate([
      { $match: callMatch },
      { $group: { _id: null, totalDuration: { $sum: '$duration' } } },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Call.aggregate([
      { $match: callMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: '$serviceRequested', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Lead.aggregate([
      { $match: leadWindowMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: callWindowMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      {
        $match: {
          ...leadWindowMatch,
          status: 'converted',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: callMatch },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: callMatch },
      {
        $group: {
          _id: '$agent',
          calls: { $sum: 1 },
          answered: {
            $sum: {
              $cond: [{ $eq: ['$status', 'answered'] }, 1, 0],
            },
          },
          totalDuration: { $sum: '$duration' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'leads',
          let: { agentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$assignedTo', '$$agentId'] } } },
            {
              $group: {
                _id: null,
                leads: { $sum: 1 },
                converted: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'converted'] }, 1, 0],
                  },
                },
              },
            },
          ],
          as: 'leadStats',
        },
      },
      {
        $project: {
          _id: 1,
          username: '$user.username',
          role: '$user.role',
          isActive: '$user.isActive',
          calls: 1,
          answered: 1,
          totalDuration: 1,
          leads: { $ifNull: [{ $first: '$leadStats.leads' }, 0] },
          converted: { $ifNull: [{ $first: '$leadStats.converted' }, 0] },
        },
      },
      { $sort: { calls: -1, converted: -1, username: 1 } },
      { $limit: 8 },
    ]),
    getTrendComparison(dateFilter),
  ]);

  const leadStatusMap = formatGrouped(leadsByStatus);
  const callStatusMap = formatGrouped(callsByStatus);

  sendSuccess(res, {
    data: {
      totals: buildTotals({
        totalLeads,
        totalCalls,
        activeUsers: totalUsers,
        totalDuration: totalDurationRow[0]?.totalDuration || 0,
        leadsByStatus: leadStatusMap,
        callsByStatus: callStatusMap,
      }),
      leadsByStatus: leadStatusMap,
      callsByStatus: callStatusMap,
      leadsBySource: formatGrouped(leadsBySource),
      leadsByService: formatGrouped(leadsByService),
      dailyLeads,
      dailyCalls,
      dailyConversions,
      hourlyCalls: normalizeHourlyCalls(hourlyCalls),
      agentLeaderboard: agentLeaderboard.map(formatAgentRow),
      recentTrend,
    },
  });
});

const getUserAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const agentId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    throw new ApiError(404, 'User not found.');
  }

  const user = await User.findById(agentId);
  if (!user) throw new ApiError(404, 'User not found.');

  const dateFilter = buildDateFilter(from, to);
  const agentLeadFilter = { ...dateFilter, assignedTo: user._id };
  const agentCallFilter = { ...dateFilter, agent: user._id };
  const agentLeadWindowFilter = agentLeadFilter.createdAt
    ? agentLeadFilter
    : { ...agentLeadFilter, createdAt: { $gte: daysAgo(30) } };
  const agentCallWindowFilter = agentCallFilter.createdAt
    ? agentCallFilter
    : { ...agentCallFilter, createdAt: { $gte: daysAgo(30) } };

  const [
    totalLeads,
    totalCalls,
    totalDurationRow,
    leadsByStatus,
    callsByStatus,
    leadsBySource,
    leadsByService,
    dailyLeads,
    dailyCalls,
    dailyConversions,
    hourlyCalls,
    detailedLeads,
    detailedCalls,
  ] = await Promise.all([
    Lead.countDocuments(agentLeadFilter),
    Call.countDocuments(agentCallFilter),
    Call.aggregate([
      { $match: agentCallFilter },
      { $group: { _id: null, totalDuration: { $sum: '$duration' } } },
    ]),
    Lead.aggregate([
      { $match: agentLeadFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Call.aggregate([
      { $match: agentCallFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: agentLeadFilter },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: agentLeadFilter },
      { $group: { _id: '$serviceRequested', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Lead.aggregate([
      { $match: agentLeadWindowFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: agentCallWindowFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      {
        $match: {
          ...agentLeadWindowFilter,
          status: 'converted',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Call.aggregate([
      { $match: agentCallFilter },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Lead.find(agentLeadFilter).sort({ updatedAt: -1 }).lean(),
    Call.find(agentCallFilter)
      .populate('lead')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const leadStatusMap = formatGrouped(leadsByStatus);
  const callStatusMap = formatGrouped(callsByStatus);
  const leadDetails = detailedLeads.map(formatLeadDetail);
  const callDetails = detailedCalls.map(formatCallDetail);

  sendSuccess(res, {
    data: {
      user: { _id: user._id, username: user.username, role: user.role, isActive: user.isActive },
      totals: buildTotals({
        totalLeads,
        totalCalls,
        totalDuration: totalDurationRow[0]?.totalDuration || 0,
        leadsByStatus: leadStatusMap,
        callsByStatus: callStatusMap,
      }),
      leadsByStatus: leadStatusMap,
      callsByStatus: callStatusMap,
      leadsBySource: formatGrouped(leadsBySource),
      leadsByService: formatGrouped(leadsByService),
      dailyLeads,
      dailyCalls,
      dailyConversions,
      hourlyCalls: normalizeHourlyCalls(hourlyCalls),
      details: {
        interestedBusinesses: leadDetails.filter((lead) => lead.status === 'converted'),
        saidNoBusinesses: leadDetails.filter((lead) => lead.status === 'lost'),
        contactedBusinesses: leadDetails.filter((lead) => lead.status === 'contacted'),
        newBusinesses: leadDetails.filter((lead) => lead.status === 'new'),
        calls: callDetails,
        noAnswerCalls: callDetails.filter((call) => call.status === 'missed' || call.status === 'no_answer'),
        saidNoCalls: callDetails.filter((call) => call.leadStatus === 'lost'),
        interestedCalls: callDetails.filter((call) => call.leadStatus === 'converted'),
      },
    },
  });
});

async function getTrendComparison(dateFilter) {
  const now = new Date();
  const end = dateFilter.createdAt?.$lte ? new Date(dateFilter.createdAt.$lte) : now;
  const start = dateFilter.createdAt?.$gte
    ? new Date(dateFilter.createdAt.$gte)
    : daysAgo(7);

  const span = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
  const previousStart = new Date(start.getTime() - span * DAY_MS);
  const previousEnd = new Date(end.getTime() - span * DAY_MS);

  const [currentLeads, previousLeads, currentCalls, previousCalls, currentConverted, previousConverted] = await Promise.all([
    Lead.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Lead.countDocuments({ createdAt: { $gte: previousStart, $lte: previousEnd } }),
    Call.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Call.countDocuments({ createdAt: { $gte: previousStart, $lte: previousEnd } }),
    Lead.countDocuments({ status: 'converted', updatedAt: { $gte: start, $lte: end } }),
    Lead.countDocuments({ status: 'converted', updatedAt: { $gte: previousStart, $lte: previousEnd } }),
  ]);

  return {
    windowDays: span,
    leads: { current: currentLeads, previous: previousLeads, changePct: pctChange(currentLeads, previousLeads) },
    calls: { current: currentCalls, previous: previousCalls, changePct: pctChange(currentCalls, previousCalls) },
    converted: { current: currentConverted, previous: previousConverted, changePct: pctChange(currentConverted, previousConverted) },
  };
}

function buildTotals({ totalLeads, totalCalls, activeUsers = null, totalDuration = 0, leadsByStatus = {}, callsByStatus = {} }) {
  const newLeads = leadsByStatus.new || 0;
  const contactedLeads = leadsByStatus.contacted || 0;
  const convertedLeads = leadsByStatus.converted || 0;
  const lostLeads = leadsByStatus.lost || 0;
  const workedLeads = contactedLeads + convertedLeads + lostLeads;
  const answeredCalls = callsByStatus.answered || 0;
  const missedCalls = callsByStatus.missed || 0;
  const noAnswerCalls = callsByStatus.no_answer || 0;

  return {
    leads: totalLeads,
    calls: totalCalls,
    activeUsers,
    newLeads,
    contactedLeads,
    convertedLeads,
    lostLeads,
    workedLeads,
    unworkedLeads: Math.max(totalLeads - workedLeads, 0),
    answeredCalls,
    missedCalls,
    noAnswerCalls,
    totalDuration,
    avgCallDuration: totalCalls ? Math.round(totalDuration / totalCalls) : 0,
    callsPerLead: totalLeads ? roundTo(totalCalls / totalLeads, 2) : 0,
    contactRate: totalLeads ? Math.round((workedLeads / totalLeads) * 100) : 0,
    conversionRate: totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0,
    answerRate: totalCalls ? Math.round((answeredCalls / totalCalls) * 100) : 0,
  };
}

function normalizeHourlyCalls(rows) {
  const map = rows.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: map[hour] || 0,
  }));
}

function formatAgentRow(row) {
  return {
    _id: row._id,
    username: row.username,
    role: row.role,
    isActive: row.isActive,
    calls: row.calls,
    answered: row.answered,
    leads: row.leads,
    converted: row.converted,
    totalDuration: row.totalDuration,
    avgCallDuration: row.calls ? Math.round(row.totalDuration / row.calls) : 0,
    answerRate: row.calls ? Math.round((row.answered / row.calls) * 100) : 0,
    conversionRate: row.leads ? Math.round((row.converted / row.leads) * 100) : 0,
  };
}

function formatLeadDetail(lead) {
  return {
    _id: lead._id,
    name: lead.name || 'Unknown business',
    email: lead.email || '',
    phone: lead.phone || '',
    serviceRequested: lead.serviceRequested || 'General',
    message: lead.message || '',
    source: lead.source || 'Unknown',
    status: lead.status || 'new',
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function formatCallDetail(call) {
  return {
    _id: call._id,
    status: call.status,
    duration: call.duration || 0,
    notes: call.notes || '',
    createdAt: call.createdAt,
    leadId: call.lead?._id || null,
    leadName: call.lead?.name || 'Unknown business',
    leadPhone: call.lead?.phone || '',
    leadEmail: call.lead?.email || '',
    serviceRequested: call.lead?.serviceRequested || 'General',
    leadMessage: call.lead?.message || '',
    leadSource: call.lead?.source || '',
    leadStatus: call.lead?.status || null,
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatGrouped(arr) {
  return arr.reduce((acc, { _id, count }) => {
    acc[_id || 'Unknown'] = count;
    return acc;
  }, {});
}

module.exports = { getOverview, getUserAnalytics };
