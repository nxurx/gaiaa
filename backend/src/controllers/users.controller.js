const User = require('../models/User');
const CsvList = require('../models/CsvList');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/queryHelpers');

/**
 * POST /api/users  (Admin only)
 */
const createUser = asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  const existing = await User.findOne({ username });
  if (existing) {
    throw new ApiError(409, `Username "${username}" is already taken.`);
  }

  const user = await User.create({ username, password, role });

  sendSuccess(res, {
    statusCode: 201,
    message: 'User created successfully',
    data: user,
  });
});

/**
 * GET /api/users  (Admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  sendSuccess(res, {
    data: users,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

/**
 * PATCH /api/users/:id/deactivate  (Admin only)
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }

  user.isActive = false;
  await user.save();

  sendSuccess(res, { message: 'User deactivated successfully', data: user });
});

/**
 * PATCH /api/users/:id/reactivate  (Admin only)
 */
const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  user.isActive = true;
  await user.save();

  sendSuccess(res, { message: 'User reactivated successfully', data: user });
});

/**
 * DELETE /api/users/:id  (Admin only)
 * Hard-deletes the user. Also removes their CSV lists.
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }

  await Promise.all([
    user.deleteOne(),
    CsvList.deleteMany({ assignedTo: user._id }),
  ]);

  sendSuccess(res, { message: `User "${user.username}" deleted permanently.` });
});

/**
 * POST /api/users/:id/csv-lists  (Admin only)
 * Upload a parsed CSV list (array of row objects) assigned to an agent.
 * Body: { name: string, rows: object[] }
 */
const uploadCsvList = asyncHandler(async (req, res) => {
  const agent = await User.findOne({ _id: req.params.id, role: 'agent' });
  if (!agent) throw new ApiError(404, 'Active agent not found.');

  const { name, rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, 'rows must be a non-empty array.');
  }

  const list = await CsvList.create({
    name: name || `List ${new Date().toLocaleDateString()}`,
    assignedTo: agent._id,
    uploadedBy: req.user._id,
    rows,
    rowCount: rows.length,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: `CSV list "${list.name}" assigned to ${agent.username} (${rows.length} rows).`,
    data: list,
  });
});

/**
 * GET /api/users/:id/csv-lists  (Admin or the agent themselves)
 */
const getCsvLists = asyncHandler(async (req, res) => {
  // Agents can only get their own lists
  if (req.user.role === 'agent' && req.user._id.toString() !== req.params.id) {
    throw new ApiError(403, 'Access denied.');
  }

  const lists = await CsvList.find({ assignedTo: req.params.id })
    .populate('uploadedBy', 'username')
    .sort({ createdAt: -1 })
    .select('-rows'); // exclude rows in list view for performance

  sendSuccess(res, { data: lists });
});

/**
 * GET /api/users/:id/csv-lists/:listId  (Admin or the agent themselves)
 * Returns the full list including all rows.
 */
const getCsvListById = asyncHandler(async (req, res) => {
  if (req.user.role === 'agent' && req.user._id.toString() !== req.params.id) {
    throw new ApiError(403, 'Access denied.');
  }

  const list = await CsvList.findOne({ _id: req.params.listId, assignedTo: req.params.id })
    .populate('uploadedBy', 'username');
  if (!list) throw new ApiError(404, 'CSV list not found.');

  sendSuccess(res, { data: list });
});

/**
 * DELETE /api/users/:id/csv-lists/:listId  (Admin only)
 */
const deleteCsvList = asyncHandler(async (req, res) => {
  const list = await CsvList.findOneAndDelete({ _id: req.params.listId, assignedTo: req.params.id });
  if (!list) throw new ApiError(404, 'CSV list not found.');

  sendSuccess(res, { message: 'CSV list deleted.' });
});

module.exports = {
  createUser,
  getUsers,
  deactivateUser,
  reactivateUser,
  deleteUser,
  uploadCsvList,
  getCsvLists,
  getCsvListById,
  deleteCsvList,
};
