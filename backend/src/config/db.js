const mongoose = require('mongoose');
const logger = require('../utils/logger');

let cachedConnection = null;
let pendingConnection = null;

const connectDB = async () => {
  if (cachedConnection || mongoose.connection.readyState === 1) {
    return cachedConnection || mongoose.connection;
  }

  if (pendingConnection) {
    return pendingConnection;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  try {
    pendingConnection = mongoose.connect(mongoUri, {
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
