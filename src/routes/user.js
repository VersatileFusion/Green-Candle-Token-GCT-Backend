const express = require('express');
const router = express.Router();

const { authenticateToken, logRequest } = require('../middleware/auth');
const { validatePagination, validateDateRange, validateObjectId } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const ClaimTransaction = require('../models/ClaimTransaction');
const MerkleTreeModel = require('../models/MerkleTree');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);
router.use(authenticateToken);

// Get current user profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get active merkle tree to check eligibility
    const activeMerkleTree = await MerkleTreeModel.getActiveTree();
    let merkleInfo = null;
    
    if (activeMerkleTree) {
      const proof = activeMerkleTree.getProofForWallet(user.walletAddress);
      if (proof) {
        merkleInfo = {
          eligible: true,
          allocation: proof.amount,
          remaining: user.getRemainingClaimable()
        };
      } else {
        merkleInfo = {
          eligible: false,
          allocation: '0',
          remaining: '0'
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          email: user.email,
          totalClaimed: user.totalClaimed,
          totalClaimable: user.totalClaimable,
          claimCount: user.claimCount,
          lastClaimDate: user.lastClaimDate,
          canClaim: user.canClaim(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        merkleInfo
      }
    });
    
  } catch (error) {
    logger.error('Get user profile error', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
});

// Get user's claim history
router.get('/claims', validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const claims = await ClaimTransaction.getUserClaimHistory(
      req.user._id,
      limit,
      skip
    );
    
    const total = await ClaimTransaction.countDocuments({ user: req.user._id });
    
    res.json({
      success: true,
      data: {
        claims,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user claims error', {
      error: error.message,
      userId: req.user._id
    });
    next(error);
  }
});

// Get specific claim transaction
router.get('/claims/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const claim = await ClaimTransaction.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('adminId', 'name email');
    
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: { claim }
    });
    
  } catch (error) {
    logger.error('Get user claim error', {
      error: error.message,
      userId: req.user._id,
      claimId: req.params.id
    });
    next(error);
  }
});

// Get user's statistics
router.get('/stats', validateDateRange, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = { user: req.user._id };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }
    
    // Get claim statistics
    const claimStats = await ClaimTransaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$amount' } }
        }
      }
    ]);
    
    // Get monthly claim history
    const monthlyStats = await ClaimTransaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$amount' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Calculate summary
    const summary = {
      totalClaimed: req.user.totalClaimed,
      totalClaimable: req.user.totalClaimable,
      remainingClaimable: req.user.getRemainingClaimable(),
      claimCount: req.user.claimCount,
      lastClaimDate: req.user.lastClaimDate,
      canClaim: req.user.canClaim()
    };
    
    res.json({
      success: true,
      data: {
        summary,
        claimStats,
        monthlyStats
      }
    });
    
  } catch (error) {
    logger.error('Get user stats error', {
      error: error.message,
      userId: req.user._id
    });
    next(error);
  }
});

// Check user's eligibility in current merkle tree
router.get('/eligibility', async (req, res, next) => {
  try {
    const activeMerkleTree = await MerkleTreeModel.getActiveTree();
    
    if (!activeMerkleTree) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: 'No active distribution available',
          allocation: '0',
          proof: null
        }
      });
    }
    
    const proof = activeMerkleTree.getProofForWallet(req.user.walletAddress);
    
    if (!proof) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: 'Wallet address not found in current distribution',
          allocation: '0',
          proof: null
        }
      });
    }
    
    // Check if user can claim (time-based restrictions)
    if (!req.user.canClaim()) {
      const timeUntilNextClaim = req.user.lastClaimDate ? 
        24 * 60 * 60 * 1000 - (Date.now() - new Date(req.user.lastClaimDate).getTime()) : 0;
      
      return res.json({
        success: true,
        data: {
          eligible: true,
          canClaim: false,
          reason: 'Must wait 24 hours between claims',
          timeUntilNextClaim,
          allocation: proof.amount,
          remaining: req.user.getRemainingClaimable(),
          proof
        }
      });
    }
    
    // Check if user has remaining claimable amount
    const remaining = req.user.getRemainingClaimable();
    if (BigInt(remaining) <= 0) {
      return res.json({
        success: true,
        data: {
          eligible: true,
          canClaim: false,
          reason: 'All allocated tokens have been claimed',
          allocation: proof.amount,
          remaining: '0',
          proof
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        eligible: true,
        canClaim: true,
        allocation: proof.amount,
        remaining,
        proof,
        merkleTree: {
          name: activeMerkleTree.name,
          description: activeMerkleTree.description,
          root: activeMerkleTree.root
        }
      }
    });
    
  } catch (error) {
    logger.error('Check user eligibility error', {
      error: error.message,
      userId: req.user._id
    });
    next(error);
  }
});

// Update user profile (limited fields)
router.patch('/profile', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Only allow updating email for now
    const allowedUpdates = {};
    
    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }
      
      // Check if email is already taken
      if (email) {
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: req.user._id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'Email address is already in use'
          });
        }
      }
      
      allowedUpdates.email = email ? email.toLowerCase() : null;
    }
    
    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );
    
    logger.audit('User profile updated', {
      userId: req.user._id,
      updates: Object.keys(allowedUpdates),
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser._id,
          walletAddress: updatedUser.walletAddress,
          email: updatedUser.email,
          totalClaimed: updatedUser.totalClaimed,
          totalClaimable: updatedUser.totalClaimable,
          claimCount: updatedUser.claimCount,
          lastClaimDate: updatedUser.lastClaimDate,
          canClaim: updatedUser.canClaim(),
          updatedAt: updatedUser.updatedAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Update user profile error', {
      error: error.message,
      userId: req.user._id
    });
    next(error);
  }
});

module.exports = router;