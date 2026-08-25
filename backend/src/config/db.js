const mongoose = require('mongoose');
const logger = require('../utils/logger');

let cachedConnection = null;
let pendingConnection = null;

const connectDB = async () => {
  // Skip MongoDB connection for development/testing
  if (process.env.SKIP_MONGODB === 'true') {
    logger.info('MongoDB connection skipped (SKIP_MONGODB=true)');
    return null;
  }

  if (cachedConnection || mongoose.connection.readyState === 1) {
    return cachedConnection || mongoose.connection;
  }

  if (pendingConnection) {
    return pendingConnection;
  }

  try {
    pendingConnection = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });

    const conn = await pendingConnection;
    cachedConnection = conn.connection;
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return cachedConnection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  } finally {
    pendingConnection = null;
  }
};

module.exports = connectDB;
