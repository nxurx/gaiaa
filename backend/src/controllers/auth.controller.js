const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

  console.log(`Login attempt for username: ${username}`);

  // Password is excluded by default in the MongoDB schema, but is required
  // here solely to verify the submitted login password.
  const user = await User.findOne({ username, isActive: true }).select('+password');
  
  console.log(`User found: ${!!user}`);
  
  if (!user) {
    console.log('User not found in database');
    throw new ApiError(401, 'Invalid username or password.');
  }

  const passwordMatch = await user.comparePassword(password);
  console.log(`Password match: ${passwordMatch}`);
  
  if (!passwordMatch) {
    console.log('Password comparison failed');
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
