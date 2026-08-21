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

  console.log(`Creating user: ${username}, role: ${role}`);

  const existing = await User.findOne({ username });
  if (existing) {
    throw new ApiError(409, `Username "${username}" is already taken.`);
  }

  const user = await User.create({ username, password, role });

  console.log(`User created with ID: ${user._id}, isActive: ${user.isActive}`);

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
 * Hard-deletes the user. CSV lists are shared and not deleted.
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }

  await user.deleteOne();

  sendSuccess(res, { message: `User "${user.username}" deleted permanently.` });
});

/**
 * POST /api/csv-lists  (Admin only)
 * Upload a parsed CSV list (array of row objects) shared across all users.
 * Body: { name: string, rows: object[] }
 */
const uploadCsvList = asyncHandler(async (req, res) => {
  const { name, rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, 'rows must be a non-empty array.');
  }

  const list = await CsvList.create({
    name: name || `List ${new Date().toLocaleDateString()}`,
    uploadedBy: req.user._id,
    rows,
    rowCount: rows.length,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: `CSV list "${list.name}" uploaded (${rows.length} rows).`,
    data: list,
  });
});

/**
 * GET /api/csv-lists  (All authenticated users)
 * Get all CSV lists shared across all users.
 */
const getCsvLists = asyncHandler(async (req, res) => {
  const lists = await CsvList.find()
    .populate('uploadedBy', 'username')
    .sort({ createdAt: -1 })
    .select('-rows'); // exclude rows in list view for performance

  sendSuccess(res, { data: lists });
});

/**
 * GET /api/csv-lists/:listId  (All authenticated users)
 * Returns the full list including all rows.
 */
const getCsvListById = asyncHandler(async (req, res) => {
  const list = await CsvList.findById(req.params.listId)
    .populate('uploadedBy', 'username');
  if (!list) throw new ApiError(404, 'CSV list not found.');

  sendSuccess(res, { data: list });
});

/**
 * DELETE /api/csv-lists/:listId  (Admin only)
 */
const deleteCsvList = asyncHandler(async (req, res) => {
  const list = await CsvList.findByIdAndDelete(req.params.listId);
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
