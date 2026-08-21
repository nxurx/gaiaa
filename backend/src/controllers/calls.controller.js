const Call = require('../models/Call');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { buildDateFilter, parsePagination } = require('../utils/queryHelpers');

/**
 * POST /api/calls
 * Agent logs a call (always tied to the authenticated agent).
 */
const createCall = asyncHandler(async (req, res) => {
  const call = await Call.create({ ...req.body, agent: req.user._id });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Call logged successfully',
    data: call,
  });
});

/**
 * GET /api/calls
 * Admins see all. Agents see only their calls.
 * Supports: ?page, ?limit, ?from, ?to, ?agent
 */
const getCalls = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { from, to, agent } = req.query;

  const filter = { ...buildDateFilter(from, to) };

  if (req.user.role === 'agent') {
    filter.agent = req.user._id;
  } else if (agent) {
    filter.agent = agent;
  }

  const [calls, total] = await Promise.all([
    Call.find(filter)
      .populate('agent', 'username role')
      .populate('lead', 'name email phone status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Call.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: calls,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

module.exports = { createCall, getCalls };
