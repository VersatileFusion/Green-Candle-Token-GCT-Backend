/**
 * Script to create default admin user
 * Run this script after setting up the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

async function createDefaultAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/GTC-backend', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      return;
    }
    
    // Create default admin
    const defaultAdmin = await Admin.createDefaultAdmin();
    
    console.log('✅ Default admin created successfully!');
    console.log('Email:', defaultAdmin.email);
    console.log('Password:', process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!@#');
    console.log('Role:', defaultAdmin.role);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the default password after first login!');
    console.log('⚠️  IMPORTANT: Enable 2FA for enhanced security!');
    
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
    logger.error('Create default admin script error', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  createDefaultAdmin();
}

module.exports = createDefaultAdmin;