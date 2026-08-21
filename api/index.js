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

module.exports = async (req, res) => {
  try {
    await connectJsonDB();
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
