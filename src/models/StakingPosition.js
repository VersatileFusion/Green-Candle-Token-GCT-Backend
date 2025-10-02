const mongoose = require('mongoose');

const stakingPositionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pool: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StakingPool',
    required: true
  },
  amount: {
    type: String, // Using string to handle large numbers
    required: true
  },
  apy: {
    type: Number,
    required: true
  },
  lockPeriod: {
    type: Number, // in days
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  stakedAt: {
    type: Date,
    default: Date.now
  },
  unlockDate: {
    type: Date,
    required: true
  },
  unstakedAt: {
    type: Date,
    default: null
  },
  rewards: {
    type: String, // Total rewards earned
    default: '0'
  },
  lastRewardCalculation: {
    type: Date,
    default: Date.now
  },
  transactionHash: {
    type: String,
    default: null
  },
  metadata: {
    gasUsed: String,
    gasPrice: String,
    blockNumber: Number,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
stakingPositionSchema.index({ user: 1, createdAt: -1 });
stakingPositionSchema.index({ pool: 1 });
stakingPositionSchema.index({ status: 1 });
stakingPositionSchema.index({ unlockDate: 1 });
stakingPositionSchema.index({ stakedAt: -1 });

// Virtual for formatted amount
stakingPositionSchema.virtual('formattedAmount').get(function() {
  return this.formatAmount(this.amount);
});

// Virtual for formatted rewards
stakingPositionSchema.virtual('formattedRewards').get(function() {
  return this.formatAmount(this.rewards);
});

// Virtual for days remaining
stakingPositionSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'active') return 0;
  
  const now = new Date();
  const unlockDate = new Date(this.unlockDate);
  const diffTime = unlockDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
});

// Virtual for is unlocked
stakingPositionSchema.virtual('isUnlocked').get(function() {
  return new Date() >= this.unlockDate;
});

// Virtual for can unstake
stakingPositionSchema.virtual('canUnstake').get(function() {
  return this.status === 'active' && this.isUnlocked;
});

// Instance method to format amount
stakingPositionSchema.methods.formatAmount = function(amount) {
  if (!amount) return '0';
  const divisor = BigInt('1000000000000000000');
  const value = BigInt(amount);
  const formatted = value / divisor;
  const remainder = value % divisor;
  
  if (remainder === 0n) {
    return formatted.toString();
  }
  
  const remainderStr = remainder.toString().padStart(18, '0');
  const trimmed = remainderStr.replace(/0+$/, '');
  
  if (trimmed === '') {
    return formatted.toString();
  }
  
  return `${formatted}.${trimmed}`;
};

// Instance method to calculate rewards
stakingPositionSchema.methods.calculateRewards = function() {
  if (this.status !== 'active') {
    return BigInt(this.rewards || '0');
  }
  
  const now = new Date();
  const stakedAt = new Date(this.stakedAt);
  const unlockDate = new Date(this.unlockDate);
  
  // Calculate time staked in days
  const timeStaked = Math.min(
    (now - stakedAt) / (1000 * 60 * 60 * 24),
    (unlockDate - stakedAt) / (1000 * 60 * 60 * 24)
  );
  
  if (timeStaked <= 0) return BigInt('0');
  
  // Calculate rewards: (amount * apy * timeStaked) / (365 * 100)
  const amount = BigInt(this.amount);
  const apy = BigInt(Math.floor(this.apy * 100)); // Convert to basis points
  const timeStakedBigInt = BigInt(Math.floor(timeStaked * 100)); // Convert to basis points
  const daysInYear = BigInt(36500); // 365 * 100
  const apyDivisor = BigInt(10000); // 100 * 100
  
  const rewards = (amount * apy * timeStakedBigInt) / (daysInYear * apyDivisor);
  
  return rewards;
};

// Instance method to update rewards
stakingPositionSchema.methods.updateRewards = function() {
  const newRewards = this.calculateRewards();
  this.rewards = newRewards.toString();
  this.lastRewardCalculation = new Date();
  return this.save();
};

// Instance method to complete position
stakingPositionSchema.methods.completePosition = function() {
  this.status = 'completed';
  this.unstakedAt = new Date();
  this.updateRewards();
  return this.save();
};

// Instance method to cancel position
stakingPositionSchema.methods.cancelPosition = function() {
  this.status = 'cancelled';
  this.unstakedAt = new Date();
  return this.save();
};

// Static method to get active positions
stakingPositionSchema.statics.getActivePositions = function() {
  return this.find({ status: 'active' })
    .populate('user', 'walletAddress')
    .populate('pool', 'name apy');
};

// Static method to get positions by user
stakingPositionSchema.statics.getPositionsByUser = function(userId, status = null) {
  const filter = { user: userId };
  if (status) filter.status = status;
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .populate('pool', 'name apy');
};

// Static method to get positions by pool
stakingPositionSchema.statics.getPositionsByPool = function(poolId) {
  return this.find({ pool: poolId })
    .sort({ createdAt: -1 })
    .populate('user', 'walletAddress');
};

// Static method to get positions ready for unstaking
stakingPositionSchema.statics.getPositionsReadyForUnstaking = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    unlockDate: { $lte: now }
  })
    .populate('user', 'walletAddress')
    .populate('pool', 'name apy');
};

// Static method to get staking statistics
stakingPositionSchema.statics.getStakingStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPositions: { $sum: 1 },
        activePositions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedPositions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalStaked: {
          $sum: { $toDouble: '$amount' }
        },
        totalRewards: {
          $sum: { $toDouble: '$rewards' }
        }
      }
    }
  ]);
};

// Static method to get user staking summary
stakingPositionSchema.statics.getUserStakingSummary = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } },
        totalRewards: { $sum: { $toDouble: '$rewards' } }
      }
    }
  ]);
};

// Static method to get positions by date range
stakingPositionSchema.statics.getPositionsByDateRange = function(startDate, endDate) {
  return this.find({
    stakedAt: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .sort({ stakedAt: -1 })
    .populate('user', 'walletAddress')
    .populate('pool', 'name apy');
};

const StakingPosition = mongoose.model('StakingPosition', stakingPositionSchema);

module.exports = StakingPosition;