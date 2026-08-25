const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const connectMongoDB = require('./config/db');
const logger = require('./utils/logger');

const backendEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath });
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath, override: true });

const PORT = process.env.PORT || 5000;

// Auto-seed admin user for MongoDB
let isSeeded = false;
async function ensureAdminUser() {
  if (isSeeded) return;
  
  try {
    const User = require('./models/User');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    logger.info(`Checking for admin user: ${adminUsername}`);
    const existingAdmin = await User.findOne({ username: adminUsername });
    logger.info(`Existing admin found: ${!!existingAdmin}`);
    
    if (!existingAdmin) {
      logger.info(`Creating admin user with username: ${adminUsername}`);
      await User.create({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
      });
      logger.info(`✓ Admin user "${adminUsername}" created automatically.`);
    } else {
      logger.info(`Admin user "${adminUsername}" already exists.`);
    }
    isSeeded = true;
  } catch (error) {
    logger.error(`Failed to seed admin user: ${error.message}`);
  }
}

const startServer = async () => {
  try {
    await connectMongoDB();
    await ensureAdminUser();
  } catch (error) {
    logger.error(`MongoDB is required and the server will not start: ${error.message}`);
    process.exit(1);
  }

  const app = require('./app');

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
