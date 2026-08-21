const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });

// Set environment to use JSON database for Vercel
process.env.USE_MONGODB = 'false';

const app = require('../backend/src/app');
const { connectDB: connectJsonDB } = require('../backend/src/config/json-db');
const User = require('../backend/src/models/User.json');
const bcrypt = require('bcryptjs');

// Auto-seed admin user for ephemeral Vercel database
let isSeeded = false;
async function ensureAdminUser() {
  if (isSeeded) return;
  
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        username: adminUsername,
        password: hashedPassword,
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
    await connectJsonDB();
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
