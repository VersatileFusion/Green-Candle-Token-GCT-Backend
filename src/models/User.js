const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum wallet address format'
    }
  },
  email: {
    type: String,
    sparse: true, // Allows multiple null values
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalClaimed: {
    type: String, // Using string to handle large numbers
    default: '0'
  },
  totalClaimable: {
    type: String, // Total amount user is eligible to claim
    default: '0'
  },
  claimCount: {
    type: Number,
    default: 0
  },
  lastClaimDate: {
    type: Date,
    default: null
  },
  merkleProof: {
    type: [String], // Array of merkle proof hashes
    default: []
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
  loginCount: {
    type: Number,
    default: 0
  },
  ipAddresses: [{
    ip: String,
    lastUsed: { type: Date, default: Date.now }
  }],
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.twoFactorSecret;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isAdmin: 1 });
userSchema.index({ lastClaimDate: 1 });
userSchema.index({ createdAt: 1 });

// Static method to find user by wallet address
userSchema.statics.findByWallet = function(address) {
  return this.findOne({ walletAddress: address.toLowerCase() });
};

// Instance method to check if user can claim
userSchema.methods.canClaim = function() {
  if (!this.lastClaimDate) return true;
  
  const now = new Date();
  const lastClaim = new Date(this.lastClaimDate);
  const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
  
  // Users can claim once every 24 hours
  return hoursSinceLastClaim >= 24;
};

// Instance method to get remaining claimable amount
userSchema.methods.getRemainingClaimable = function() {
  const total = BigInt(this.totalClaimable);
  const claimed = BigInt(this.totalClaimed);
  return (total - claimed).toString();
};

// Instance method to update claim
userSchema.methods.updateClaim = function(amount) {
  const currentClaimed = BigInt(this.totalClaimed);
  const newAmount = BigInt(amount);
  
  this.totalClaimed = (currentClaimed + newAmount).toString();
  this.claimCount += 1;
  this.lastClaimDate = new Date();
  
  return this.save();
};

// Instance method to add IP address
userSchema.methods.addIpAddress = function(ip) {
  const existingIp = this.ipAddresses.find(addr => addr.ip === ip);
  
  if (existingIp) {
    existingIp.lastUsed = new Date();
  } else {
    this.ipAddresses.push({ ip, lastUsed: new Date() });
    
    // Keep only last 10 IP addresses
    if (this.ipAddresses.length > 10) {
      this.ipAddresses = this.ipAddresses.slice(-10);
    }
  }
  
  return this.save();
};

// Pre-save middleware to ensure wallet address is lowercase
userSchema.pre('save', function(next) {
  if (this.walletAddress) {
    this.walletAddress = this.walletAddress.toLowerCase();
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;