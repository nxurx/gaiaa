require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const User = process.env.USE_MONGODB === 'true' ? require('../models/User') : require('../models/User.json');
const { connectDB: connectJsonDB } = require('../config/json-db');
const logger = require('./logger');

const seed = async () => {
  try {
    if (process.env.USE_MONGODB !== 'true') {
      await connectJsonDB();
      logger.info('Using JSON database for seeding...');
    } else {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGO_URI);
      logger.info('Connected to MongoDB for seeding...');
    }

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

    logger.info(`✓ Admin user "${adminUsername}" created successfully with password "${adminPassword}".`);
    process.exit(0);
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    process.exit(1);
  }
};

seed();

