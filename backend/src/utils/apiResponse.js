/**
 * Standardized API response helpers.
 */
const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

const sendError = (res, { statusCode = 500, message = 'Internal Server Error', errors = [] }) => {
  const payload = { success: false, message };
  if (errors.length > 0) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };
