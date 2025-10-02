/**
 * Activity Model for GCT Token Platform
 * Handles user activities and system events
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'user_login',
      'user_logout',
      'wallet_connected',
      'wallet_disconnected',
      'claim_initiated',
      'claim_completed',
      'claim_failed',
      'stake_created',
      'stake_completed',
      'unstake_initiated',
      'unstake_completed',
      'profile_updated',
      'email_updated',
      'admin_action',
      'system_event',
      'price_update',
      'merkle_tree_updated',
      'bulk_email_sent',
      'cache_cleared'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some activities don't have a user (system events)
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  public: {
    type: Boolean,
    default: true // Whether this activity should be visible to users
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ admin: 1, createdAt: -1 });
activitySchema.index({ public: 1, createdAt: -1 });
activitySchema.index({ status: 1, createdAt: -1 });

// Static methods
activitySchema.statics.createActivity = function(activityData) {
  return this.create(activityData);
};

activitySchema.statics.getUserActivities = function(userId, limit = 20, skip = 0) {
  return this.find({ 
    user: userId, 
    public: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('user', 'walletAddress')
  .populate('admin', 'name email');
};

activitySchema.statics.getPublicActivities = function(limit = 50, skip = 0) {
  return this.find({ 
    public: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('user', 'walletAddress')
  .populate('admin', 'name email');
};

activitySchema.statics.getAdminActivities = function(adminId, limit = 20, skip = 0) {
  return this.find({ 
    admin: adminId 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('user', 'walletAddress')
  .populate('admin', 'name email');
};

activitySchema.statics.getSystemActivities = function(limit = 20, skip = 0) {
  return this.find({ 
    type: { $in: ['system_event', 'price_update', 'merkle_tree_updated'] },
    public: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

activitySchema.statics.getActivitiesByType = function(type, limit = 20, skip = 0) {
  return this.find({ 
    type,
    public: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('user', 'walletAddress')
  .populate('admin', 'name email');
};

activitySchema.statics.getRecentActivities = function(hours = 24, limit = 100) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ 
    createdAt: { $gte: since },
    public: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('user', 'walletAddress')
  .populate('admin', 'name email');
};

activitySchema.statics.getActivityStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Instance methods
activitySchema.methods.markCompleted = function() {
  this.status = 'completed';
  return this.save();
};

activitySchema.methods.markFailed = function() {
  this.status = 'failed';
  return this.save();
};

// Pre-save middleware to set title if not provided
activitySchema.pre('save', function(next) {
  if (!this.title && this.type) {
    const titles = {
      'user_login': 'User logged in',
      'user_logout': 'User logged out',
      'wallet_connected': 'Wallet connected',
      'wallet_disconnected': 'Wallet disconnected',
      'claim_initiated': 'Token claim initiated',
      'claim_completed': 'Token claim completed',
      'claim_failed': 'Token claim failed',
      'stake_created': 'Staking position created',
      'stake_completed': 'Staking completed',
      'unstake_initiated': 'Unstaking initiated',
      'unstake_completed': 'Unstaking completed',
      'profile_updated': 'Profile updated',
      'email_updated': 'Email updated',
      'admin_action': 'Admin action performed',
      'system_event': 'System event',
      'price_update': 'Price updated',
      'merkle_tree_updated': 'Merkle tree updated',
      'bulk_email_sent': 'Bulk email sent',
      'cache_cleared': 'Cache cleared'
    };
    this.title = titles[this.type] || 'Activity occurred';
  }
  next();
});

module.exports = mongoose.model('Activity', activitySchema);