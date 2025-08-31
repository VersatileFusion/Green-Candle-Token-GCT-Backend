const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'users.read',
      'users.write',
      'users.delete',
      'claims.read',
      'claims.write',
      'claims.approve',
      'transactions.read',
      'merkle.manage',
      'settings.read',
      'settings.write',
      'logs.read'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  sessionToken: {
    type: String,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    success: Boolean
  }]
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.sessionToken;
      return ret;
    }
  }
});

// Indexes
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Virtual for account locked status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing middleware
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to handle failed login attempts
adminSchema.methods.incrementLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to add login history
adminSchema.methods.addLoginHistory = function(ip, userAgent, success = true) {
  this.loginHistory.push({
    timestamp: new Date(),
    ip,
    userAgent,
    success
  });
  
  // Keep only last 50 login attempts
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(-50);
  }
  
  if (success) {
    this.lastLogin = new Date();
    this.resetLoginAttempts();
  }
  
  return this.save();
};

// Instance method to check permissions
adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions.includes(permission);
};

// Static method to create default admin
adminSchema.statics.createDefaultAdmin = async function() {
  const existingAdmin = await this.findOne({ role: 'super_admin' });
  if (existingAdmin) return existingAdmin;
  
  const defaultAdmin = new this({
    email: process.env.ADMIN_EMAIL || 'admin@GTC-token.com',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!@#',
    name: 'Super Administrator',
    role: 'super_admin',
    permissions: [
      'users.read', 'users.write', 'users.delete',
      'claims.read', 'claims.write', 'claims.approve',
      'transactions.read', 'merkle.manage',
      'settings.read', 'settings.write', 'logs.read'
    ]
  });
  
  return await defaultAdmin.save();
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;