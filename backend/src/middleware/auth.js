const jwt = require('jsonwebtoken');
const User = process.env.USE_MONGODB === 'true' ? require('../models/User') : require('../models/User.json');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies JWT and attaches user to req.user.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User account not found or deactivated.');
  }

  req.user = user;
  next();
});

/**
 * Restricts route access to specified roles.
 * Usage: authorize('admin') or authorize('admin', 'agent')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, `Access denied. Required role: ${roles.join(' or ')}.`);
  }
  next();
};

/**
 * Restricts route access to admin only.
 */
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }
  next();
};

module.exports = { authenticate, authorize, authorizeAdmin };
