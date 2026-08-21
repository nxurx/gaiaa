const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendEnvPath = path.resolve(__dirname, '../backend/.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath });
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath, override: true });

const app = require('../backend/src/app');
const connectDB = require('../backend/src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize backend.',
      error: error.message,
    });
  }
};
