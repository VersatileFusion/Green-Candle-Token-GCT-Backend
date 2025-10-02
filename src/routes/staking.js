/**
 * Staking Routes for GCT Token Platform
 * Handles staking pools, rewards, and staking operations
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const StakingPool = require('../models/StakingPool');
const StakingPosition = require('../models/StakingPosition');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Get all staking pools
router.get('/pools', async (req, res, next) => {
  try {
    const { active = true } = req.query;
    
    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    
    const pools = await StakingPool.find(filter)
      .sort({ apy: -1 })
      .populate('createdBy', 'name email');
    
    res.json({
      success: true,
      data: { pools }
    });
    
  } catch (error) {
    logger.error('Get staking pools error', { error: error.message });
    next(error);
  }
});

// Get single staking pool
router.get('/pools/:id', async (req, res, next) => {
  try {
    const pool = await StakingPool.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Staking pool not found'
      });
    }
    
    res.json({
      success: true,
      data: { pool }
    });
    
  } catch (error) {
    logger.error('Get staking pool error', { error: error.message });
    next(error);
  }
});

// Create staking pool (admin only)
router.post('/pools', requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      apy,
      minStakeAmount,
      maxStakeAmount,
      lockPeriod,
      isActive = true
    } = req.body;
    
    const pool = new StakingPool({
      name,
      description,
      apy,
      minStakeAmount,
      maxStakeAmount,
      lockPeriod,
      isActive,
      createdBy: req.user.id
    });
    
    await pool.save();
    
    logger.info('Staking pool created', {
      poolId: pool._id,
      name: pool.name,
      apy: pool.apy,
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      data: { pool }
    });
    
  } catch (error) {
    logger.error('Create staking pool error', { error: error.message });
    next(error);
  }
});

// Update staking pool (admin only)
router.put('/pools/:id', requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      apy,
      minStakeAmount,
      maxStakeAmount,
      lockPeriod,
      isActive
    } = req.body;
    
    const pool = await StakingPool.findById(req.params.id);
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Staking pool not found'
      });
    }
    
    // Update fields
    if (name) pool.name = name;
    if (description) pool.description = description;
    if (apy !== undefined) pool.apy = apy;
    if (minStakeAmount !== undefined) pool.minStakeAmount = minStakeAmount;
    if (maxStakeAmount !== undefined) pool.maxStakeAmount = maxStakeAmount;
    if (lockPeriod !== undefined) pool.lockPeriod = lockPeriod;
    if (isActive !== undefined) pool.isActive = isActive;
    
    await pool.save();
    
    logger.info('Staking pool updated', {
      poolId: pool._id,
      name: pool.name,
      updatedBy: req.user.id
    });
    
    res.json({
      success: true,
      data: { pool }
    });
    
  } catch (error) {
    logger.error('Update staking pool error', { error: error.message });
    next(error);
  }
});

// Delete staking pool (admin only)
router.delete('/pools/:id', requireAdmin, async (req, res, next) => {
  try {
    const pool = await StakingPool.findById(req.params.id);
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Staking pool not found'
      });
    }
    
    // Check if pool has active positions
    const activePositions = await StakingPosition.countDocuments({
      pool: pool._id,
      status: 'active'
    });
    
    if (activePositions > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete pool with active staking positions'
      });
    }
    
    await StakingPool.findByIdAndDelete(req.params.id);
    
    logger.info('Staking pool deleted', {
      poolId: pool._id,
      name: pool.name,
      deletedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Staking pool deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete staking pool error', { error: error.message });
    next(error);
  }
});

// Stake tokens
router.post('/stake', authenticateToken, async (req, res, next) => {
  try {
    const { poolId, amount } = req.body;
    
    // Validate pool
    const pool = await StakingPool.findById(poolId);
    if (!pool || !pool.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive staking pool'
      });
    }
    
    // Validate amount
    if (amount < pool.minStakeAmount) {
      return res.status(400).json({
        success: false,
        error: `Minimum stake amount is ${pool.minStakeAmount}`
      });
    }
    
    if (amount > pool.maxStakeAmount) {
      return res.status(400).json({
        success: false,
        error: `Maximum stake amount is ${pool.maxStakeAmount}`
      });
    }
    
    // Create staking position
    const position = new StakingPosition({
      user: req.user.id,
      pool: poolId,
      amount,
      apy: pool.apy,
      lockPeriod: pool.lockPeriod,
      unlockDate: new Date(Date.now() + pool.lockPeriod * 24 * 60 * 60 * 1000)
    });
    
    await position.save();
    
    logger.info('Tokens staked', {
      positionId: position._id,
      userId: req.user.id,
      poolId: poolId,
      amount: amount
    });
    
    res.json({
      success: true,
      data: { position }
    });
    
  } catch (error) {
    logger.error('Stake tokens error', { error: error.message });
    next(error);
  }
});

// Unstake tokens
router.post('/unstake/:positionId', authenticateToken, async (req, res, next) => {
  try {
    const { positionId } = req.params;
    
    const position = await StakingPosition.findById(positionId)
      .populate('pool');
    
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Staking position not found'
      });
    }
    
    // Check if user owns the position
    if (position.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to unstake this position'
      });
    }
    
    // Check if position is active
    if (position.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Position is not active'
      });
    }
    
    // Check if lock period has passed
    if (new Date() < position.unlockDate) {
      return res.status(400).json({
        success: false,
        error: 'Lock period has not expired yet'
      });
    }
    
    // Calculate rewards
    const rewards = position.calculateRewards();
    
    // Update position
    position.status = 'completed';
    position.unstakedAt = new Date();
    position.rewards = rewards;
    await position.save();
    
    logger.info('Tokens unstaked', {
      positionId: position._id,
      userId: req.user.id,
      amount: position.amount,
      rewards: rewards
    });
    
    res.json({
      success: true,
      data: {
        position,
        rewards
      }
    });
    
  } catch (error) {
    logger.error('Unstake tokens error', { error: error.message });
    next(error);
  }
});

// Get user's staking positions
router.get('/positions', authenticateToken, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    
    const positions = await StakingPosition.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('pool', 'name apy');
    
    const total = await StakingPosition.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        positions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get staking positions error', { error: error.message });
    next(error);
  }
});

// Get staking statistics
router.get('/stats', async (req, res, next) => {
  try {
    const totalPools = await StakingPool.countDocuments({ isActive: true });
    const totalStaked = await StakingPosition.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalPositions = await StakingPosition.countDocuments();
    const activePositions = await StakingPosition.countDocuments({ status: 'active' });
    
    res.json({
      success: true,
      data: {
        totalPools,
        totalStaked: totalStaked[0]?.total || 0,
        totalPositions,
        activePositions
      }
    });
    
  } catch (error) {
    logger.error('Get staking stats error', { error: error.message });
    next(error);
  }
});

// Get user's staking rewards
router.get('/rewards', authenticateToken, async (req, res, next) => {
  try {
    const positions = await StakingPosition.find({
      user: req.user.id,
      status: 'active'
    }).populate('pool', 'name apy');
    
    const rewards = positions.map(position => ({
      positionId: position._id,
      poolName: position.pool.name,
      amount: position.amount,
      apy: position.apy,
      currentRewards: position.calculateRewards(),
      unlockDate: position.unlockDate
    }));
    
    res.json({
      success: true,
      data: { rewards }
    });
    
  } catch (error) {
    logger.error('Get staking rewards error', { error: error.message });
    next(error);
  }
});

// Calculate staking rewards (admin only)
router.post('/calculate-rewards', requireAdmin, async (req, res, next) => {
  try {
    const { positionId } = req.body;
    
    const position = await StakingPosition.findById(positionId);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Staking position not found'
      });
    }
    
    const rewards = position.calculateRewards();
    
    res.json({
      success: true,
      data: { rewards }
    });
    
  } catch (error) {
    logger.error('Calculate staking rewards error', { error: error.message });
    next(error);
  }
});

module.exports = router;