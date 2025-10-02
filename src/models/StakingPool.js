const mongoose = require('mongoose');

const stakingPoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  apy: {
    type: Number,
    required: true,
    min: 0,
    max: 1000 // Maximum 1000% APY
  },
  minStakeAmount: {
    type: String, // Using string to handle large numbers
    required: true
  },
  maxStakeAmount: {
    type: String, // Using string to handle large numbers
    required: true
  },
  lockPeriod: {
    type: Number, // in days
    required: true,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalStaked: {
    type: String, // Total amount staked in this pool
    default: '0'
  },
  totalPositions: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  metadata: {
    contractAddress: String,
    tokenAddress: String,
    rewardTokenAddress: String,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
stakingPoolSchema.index({ isActive: 1 });
stakingPoolSchema.index({ apy: -1 });
stakingPoolSchema.index({ createdBy: 1 });
stakingPoolSchema.index({ createdAt: -1 });

// Virtual for formatted APY
stakingPoolSchema.virtual('formattedApy').get(function() {
  return `${this.apy}%`;
});

// Virtual for formatted min stake amount
stakingPoolSchema.virtual('formattedMinStake').get(function() {
  return this.formatAmount(this.minStakeAmount);
});

// Virtual for formatted max stake amount
stakingPoolSchema.virtual('formattedMaxStake').get(function() {
  return this.formatAmount(this.maxStakeAmount);
});

// Virtual for formatted total staked
stakingPoolSchema.virtual('formattedTotalStaked').get(function() {
  return this.formatAmount(this.totalStaked);
});

// Instance method to format amount
stakingPoolSchema.methods.formatAmount = function(amount) {
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

// Instance method to check if amount is valid
stakingPoolSchema.methods.isValidAmount = function(amount) {
  const amountBigInt = BigInt(amount);
  const minAmount = BigInt(this.minStakeAmount);
  const maxAmount = BigInt(this.maxStakeAmount);
  
  return amountBigInt >= minAmount && amountBigInt <= maxAmount;
};

// Instance method to update total staked
stakingPoolSchema.methods.updateTotalStaked = function(amount, operation = 'add') {
  const currentTotal = BigInt(this.totalStaked);
  const amountBigInt = BigInt(amount);
  
  if (operation === 'add') {
    this.totalStaked = (currentTotal + amountBigInt).toString();
    this.totalPositions += 1;
  } else if (operation === 'subtract') {
    this.totalStaked = (currentTotal - amountBigInt).toString();
    this.totalPositions = Math.max(0, this.totalPositions - 1);
  }
  
  return this.save();
};

// Static method to get active pools
stakingPoolSchema.statics.getActivePools = function() {
  return this.find({ isActive: true })
    .sort({ apy: -1 })
    .populate('createdBy', 'name email');
};

// Static method to get pools by APY range
stakingPoolSchema.statics.getPoolsByApyRange = function(minApy, maxApy) {
  return this.find({
    isActive: true,
    apy: { $gte: minApy, $lte: maxApy }
  })
    .sort({ apy: -1 })
    .populate('createdBy', 'name email');
};

// Static method to get pools by lock period
stakingPoolSchema.statics.getPoolsByLockPeriod = function(lockPeriod) {
  return this.find({
    isActive: true,
    lockPeriod: lockPeriod
  })
    .sort({ apy: -1 })
    .populate('createdBy', 'name email');
};

// Static method to get popular pools
stakingPoolSchema.statics.getPopularPools = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ totalPositions: -1, apy: -1 })
    .limit(limit)
    .populate('createdBy', 'name email');
};

// Static method to get pool statistics
stakingPoolSchema.statics.getPoolStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPools: { $sum: 1 },
        activePools: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalStaked: {
          $sum: { $toDouble: '$totalStaked' }
        },
        totalPositions: { $sum: '$totalPositions' },
        averageApy: { $avg: '$apy' },
        maxApy: { $max: '$apy' },
        minApy: { $min: '$apy' }
      }
    }
  ]);
};

// Static method to get pools by creator
stakingPoolSchema.statics.getPoolsByCreator = function(creatorId) {
  return this.find({ createdBy: creatorId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
};

const StakingPool = mongoose.model('StakingPool', stakingPoolSchema);

module.exports = StakingPool;