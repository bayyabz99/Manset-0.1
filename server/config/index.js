require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'manset-dev-secret-change-in-production',
  rootDir: path.join(__dirname, '../..'),
  uploadsDir: path.join(__dirname, '../../public/uploads'),
  dbPath: path.join(__dirname, '../../data/manset.db'),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
