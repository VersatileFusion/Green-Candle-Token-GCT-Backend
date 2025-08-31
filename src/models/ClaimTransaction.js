const mongoose = require('mongoose');

const claimTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  amount: {
    type: String, // Using string to handle large numbers
    required: true
  },
  type: {
    type: String,
    enum: ['self_claim', 'admin_claim'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  transactionHash: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid transaction hash format'
    }
  },
  blockNumber: {
    type: Number,
    default: null
  },
  blockHash: {
    type: String,
    default: null
  },
  gasUsed: {
    type: String,
    default: null
  },
  gasPrice: {
    type: String,
    default: null
  },
  merkleProof: {
    type: [String],
    required: true
  },
  merkleIndex: {
    type: Number,
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  adminNote: {
    type: String,
    maxlength: 500
  },
  failureReason: {
    type: String,
    maxlength: 500
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
claimTransactionSchema.index({ user: 1, createdAt: -1 });
claimTransactionSchema.index({ walletAddress: 1, createdAt: -1 });
claimTransactionSchema.index({ status: 1, createdAt: -1 });
claimTransactionSchema.index({ type: 1, createdAt: -1 });
claimTransactionSchema.index({ transactionHash: 1 });
claimTransactionSchema.index({ adminId: 1, createdAt: -1 });

// Virtual for formatted amount
claimTransactionSchema.virtual('formattedAmount').get(function() {
  return (BigInt(this.amount) / BigInt('1000000000000000000')).toString();
});

// Instance method to update transaction status
claimTransactionSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  if (additionalData.transactionHash) {
    this.transactionHash = additionalData.transactionHash;
  }
  
  if (additionalData.blockNumber) {
    this.blockNumber = additionalData.blockNumber;
  }
  
  if (additionalData.blockHash) {
    this.blockHash = additionalData.blockHash;
  }
  
  if (additionalData.gasUsed) {
    this.gasUsed = additionalData.gasUsed;
  }
  
  if (additionalData.gasPrice) {
    this.gasPrice = additionalData.gasPrice;
  }
  
  if (additionalData.failureReason) {
    this.failureReason = additionalData.failureReason;
  }
  
  return this.save();
};

// Instance method to increment retry count
claimTransactionSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

// Static method to get user's claim history
claimTransactionSchema.statics.getUserClaimHistory = function(userId, limit = 10, skip = 0) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'walletAddress')
    .populate('adminId', 'name email');
};

// Static method to get pending claims
claimTransactionSchema.statics.getPendingClaims = function() {
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .populate('user', 'walletAddress')
    .populate('adminId', 'name email');
};

// Static method to get failed claims that can be retried
claimTransactionSchema.statics.getRetryableClaims = function() {
  return this.find({
    status: 'failed',
    retryCount: { $lt: 3 }, // Max 3 retries
    $or: [
      { lastRetryAt: null },
      { lastRetryAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } } // 30 minutes ago
    ]
  }).sort({ createdAt: 1 });
};

// Static method to get statistics
claimTransactionSchema.statics.getStats = async function(dateFilter = {}) {
  const pipeline = [
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Pre-save middleware
claimTransactionSchema.pre('save', function(next) {
  if (this.walletAddress) {
    this.walletAddress = this.walletAddress.toLowerCase();
  }
  next();
});

const ClaimTransaction = mongoose.model('ClaimTransaction', claimTransactionSchema);

module.exports = ClaimTransaction;