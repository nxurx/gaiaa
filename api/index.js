const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });

// Set default JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'default-jwt-secret-change-in-production';
}

const app = require('../backend/src/app');
const connectMongoDB = require('../backend/src/config/db');

// Auto-seed admin user for ephemeral Vercel database
let isSeeded = false;
async function ensureAdminUser() {
  if (isSeeded) return;
  
  try {
    const User = require('../backend/src/models/User');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log(`Checking for admin user "${adminUsername}"...`);
    const existingAdmin = await User.findOne({ username: adminUsername });
    console.log(`Existing admin found: ${!!existingAdmin}`);
    
    if (!existingAdmin) {
      console.log(`Creating admin user with username: ${adminUsername}`);
      // User.create will hash the password, so pass plain text
      await User.create({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
      });
      console.log(`✓ Admin user "${adminUsername}" created automatically for Vercel deployment.`);
    }
    isSeeded = true;
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
}

module.exports = async (req, res) => {
  try {
    await connectMongoDB();
    await ensureAdminUser();
    return app(req, res);
  } catch (error) {
    console.error('Vercel API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize backend.',
      error: error.message,
    });
  }
};
