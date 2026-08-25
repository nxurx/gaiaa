require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const User = require('../models/User');
const connectMongoDB = require('../config/db');
const logger = require('./logger');

const seed = async () => {
  try {
    await connectMongoDB();
    logger.info('Connected to MongoDB for seeding...');

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ username: adminUsername });
    if (existingAdmin) {
      logger.info('Admin account already exists. Skipping seed.');
      process.exit(0);
    }

    await User.create({
      username: adminUsername,
      password: adminPassword,
      role: 'admin',
    });

    logger.info(`Admin user "${adminUsername}" created successfully.`);
    process.exit(0);
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    process.exit(1);
  }
};

seed();
