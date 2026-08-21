const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const app = require('./app');
const { connectDB: connectMongoDB } = require('./config/db');
const { connectDB: connectJsonDB } = require('./config/json-db');
const logger = require('./utils/logger');

const backendEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath });
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath, override: true });

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Use JSON database (file-based) by default
  if (process.env.USE_MONGODB !== 'true') {
    await connectJsonDB();
  } else {
    try {
      await connectMongoDB();
    } catch (error) {
      logger.warn(`MongoDB connection failed, falling back to JSON database: ${error.message}`);
      await connectJsonDB();
    }
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
};

startServer();
