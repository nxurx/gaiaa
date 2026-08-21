const jwt = require('jsonwebtoken');
const User = process.env.USE_MONGODB === 'true' ? require('../models/User') : require('../models/User.json');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  let user;
  if (process.env.USE_MONGODB === 'true') {
    user = await User.findOne({ username, isActive: true }).select('+password');
  } else {
    user = await User.findOne({ username, isActive: true });
  }
  
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  const token = generateToken(user._id);

  // Remove password before sending
  const userObj = user.toJSON();

  sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data: { token, user: userObj },
  });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.user });
});

module.exports = { login, getMe };
