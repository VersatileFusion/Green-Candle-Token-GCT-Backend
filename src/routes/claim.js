const express = require('express');
const router = express.Router();

const { authenticateWallet, requireAdmin, requirePermission, logRequest } = require('../middleware/auth');
const { validateClaim, validateAdminClaim, validateRequest } = require('../middleware/validation');
const { claimLimiter, userClaimLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const ClaimTransaction = require('../models/ClaimTransaction');
const MerkleTreeModel = require('../models/MerkleTree');
const logger = require('../utils/logger');

// Apply logging to all routes
router.use(logRequest);

// Self-claim endpoint
router.post('/self', claimLimiter, userClaimLimiter, validateClaim, validateRequest, authenticateWallet, async (req, res, next) => {
  try {
    const { walletAddress, amount } = req.body;
    const user = req.user;
    
    // Get active merkle tree
    const activeMerkleTree = await MerkleTreeModel.getActiveTree();
    
    if (!activeMerkleTree) {
      return res.status(400).json({
        success: false,
        error: 'No active token distribution available'
      });
    }
    
    // Check if user is eligible
    const proof = activeMerkleTree.getProofForWallet(walletAddress);
    
    if (!proof) {
      logger.security('Claim attempt from ineligible wallet', {
        walletAddress,
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: 'Wallet address not eligible for token claim'
      });
    }
    
    // Verify the amount doesn't exceed allocation
    if (BigInt(amount) > BigInt(proof.amount)) {
      return res.status(400).json({
        success: false,
        error: 'Claim amount exceeds allocation'
      });
    }
    
    // Check if user can claim (time restrictions)
    if (!user.canClaim()) {
      return res.status(429).json({
        success: false,
        error: 'Must wait 24 hours between claims'
      });
    }
    
    // Check remaining claimable amount
    const remaining = user.getRemainingClaimable();
    if (BigInt(remaining) < BigInt(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Claim amount exceeds remaining claimable balance'
      });
    }
    
    // Check for pending claims
    const pendingClaim = await ClaimTransaction.findOne({
      user: user._id,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (pendingClaim) {
      return res.status(400).json({
        success: false,
        error: 'You have a pending claim transaction'
      });
    }
    
    // Create claim transaction
    const claimTransaction = new ClaimTransaction({
      user: user._id,
      walletAddress: user.walletAddress,
      amount,
      type: 'self_claim',
      status: 'pending',
      merkleProof: proof.proof,
      merkleIndex: proof.index,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await claimTransaction.save();
    
    logger.claim('Self-claim initiated', {
      claimId: claimTransaction._id,
      userId: user._id,
      walletAddress: user.walletAddress,
      amount,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        claimId: claimTransaction._id,
        status: 'pending',
        amount,
        merkleProof: proof.proof,
        merkleIndex: proof.index,
        message: 'Claim transaction created. Please wait for processing.'
      }
    });
    
  } catch (error) {
    logger.error('Self-claim error', {
      error: error.message,
      walletAddress: req.body.walletAddress,
      amount: req.body.amount,
      ip: req.ip
    });
    next(error);
  }
});

// Admin claim endpoint
router.post('/admin', requireAdmin, requirePermission('claims.write'), validateAdminClaim, validateRequest, async (req, res, next) => {
  try {
    const { walletAddress, amount, adminNote } = req.body;
    const admin = req.admin;
    
    // Find or create user
    let user = await User.findByWallet(walletAddress);
    
    if (!user) {
      user = new User({
        walletAddress: walletAddress.toLowerCase()
      });
      await user.save();
      
      logger.info('New user created by admin claim', {
        userId: user._id,
        walletAddress: user.walletAddress,
        adminId: admin._id
      });
    }
    
    // Get active merkle tree
    const activeMerkleTree = await MerkleTreeModel.getActiveTree();
    
    if (!activeMerkleTree) {
      return res.status(400).json({
        success: false,
        error: 'No active token distribution available'
      });
    }
    
    // Check if user is eligible (for admin claims, we might be more flexible)
    const proof = activeMerkleTree.getProofForWallet(walletAddress);
    
    if (!proof) {
      // For admin claims, we might allow claims even if not in merkle tree
      // But we need to create a dummy proof or handle differently
      return res.status(400).json({
        success: false,
        error: 'Wallet address not found in current distribution. Please update merkle tree first.'
      });
    }
    
    // Check for pending claims
    const pendingClaim = await ClaimTransaction.findOne({
      user: user._id,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (pendingClaim) {
      return res.status(400).json({
        success: false,
        error: 'User has a pending claim transaction'
      });
    }
    
    // Create admin claim transaction
    const claimTransaction = new ClaimTransaction({
      user: user._id,
      walletAddress: user.walletAddress,
      amount,
      type: 'admin_claim',
      status: 'pending',
      merkleProof: proof.proof,
      merkleIndex: proof.index,
      adminId: admin._id,
      adminNote,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await claimTransaction.save();
    
    logger.admin('Admin claim initiated', {
      claimId: claimTransaction._id,
      adminId: admin._id,
      adminEmail: admin.email,
      userId: user._id,
      walletAddress: user.walletAddress,
      amount,
      adminNote,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        claimId: claimTransaction._id,
        status: 'pending',
        amount,
        walletAddress: user.walletAddress,
        adminNote,
        message: 'Admin claim transaction created successfully.'
      }
    });
    
  } catch (error) {
    logger.error('Admin claim error', {
      error: error.message,
      adminId: req.admin._id,
      walletAddress: req.body.walletAddress,
      amount: req.body.amount,
      ip: req.ip
    });
    next(error);
  }
});

// Get claim status
router.get('/status/:claimId', async (req, res, next) => {
  try {
    const { claimId } = req.params;
    
    const claim = await ClaimTransaction.findById(claimId)
      .populate('user', 'walletAddress')
      .populate('adminId', 'name email');
    
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
    logger.error('Get claim status error', {
      error: error.message,
      claimId: req.params.claimId,
      ip: req.ip
    });
    next(error);
  }
});

// Update claim status (admin only)
router.patch('/status/:claimId', requireAdmin, requirePermission('claims.approve'), async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { status, transactionHash, failureReason, adminNote } = req.body;
    const admin = req.admin;
    
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const claim = await ClaimTransaction.findById(claimId);
    
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim transaction not found'
      });
    }
    
    // Update claim transaction
    const updateData = { status };
    
    if (transactionHash) {
      updateData.transactionHash = transactionHash;
    }
    
    if (failureReason) {
      updateData.failureReason = failureReason;
    }
    
    if (adminNote) {
      updateData.adminNote = adminNote;
    }
    
    await claim.updateStatus(status, updateData);
    
    // If completed, update user's claim data
    if (status === 'completed') {
      const user = await User.findById(claim.user);
      if (user) {
        await user.updateClaim(claim.amount);
      }
    }
    
    logger.admin('Claim status updated', {
      claimId,
      adminId: admin._id,
      adminEmail: admin.email,
      oldStatus: claim.status,
      newStatus: status,
      transactionHash,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        claimId,
        status,
        transactionHash,
        message: 'Claim status updated successfully'
      }
    });
    
  } catch (error) {
    logger.error('Update claim status error', {
      error: error.message,
      claimId: req.params.claimId,
      adminId: req.admin._id,
      ip: req.ip
    });
    next(error);
  }
});

// Retry failed claim (admin only)
router.post('/retry/:claimId', requireAdmin, requirePermission('claims.write'), async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const admin = req.admin;
    
    const claim = await ClaimTransaction.findById(claimId);
    
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim transaction not found'
      });
    }
    
    if (claim.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed claims can be retried'
      });
    }
    
    if (claim.retryCount >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum retry attempts reached'
      });
    }
    
    // Reset claim to pending status
    claim.status = 'pending';
    claim.failureReason = null;
    await claim.incrementRetry();
    
    logger.admin('Claim retry initiated', {
      claimId,
      adminId: admin._id,
      adminEmail: admin.email,
      retryCount: claim.retryCount,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        claimId,
        status: 'pending',
        retryCount: claim.retryCount,
        message: 'Claim retry initiated successfully'
      }
    });
    
  } catch (error) {
    logger.error('Retry claim error', {
      error: error.message,
      claimId: req.params.claimId,
      adminId: req.admin._id,
      ip: req.ip
    });
    next(error);
  }
});

// Get pending claims (admin only)
router.get('/pending', requireAdmin, requirePermission('claims.read'), async (req, res, next) => {
  try {
    const pendingClaims = await ClaimTransaction.getPendingClaims();
    
    res.json({
      success: true,
      data: {
        claims: pendingClaims,
        count: pendingClaims.length
      }
    });
    
  } catch (error) {
    logger.error('Get pending claims error', {
      error: error.message,
      adminId: req.admin._id,
      ip: req.ip
    });
    next(error);
  }
});

// Get retryable claims (admin only)
router.get('/retryable', requireAdmin, requirePermission('claims.read'), async (req, res, next) => {
  try {
    const retryableClaims = await ClaimTransaction.getRetryableClaims();
    
    res.json({
      success: true,
      data: {
        claims: retryableClaims,
        count: retryableClaims.length
      }
    });
    
  } catch (error) {
    logger.error('Get retryable claims error', {
      error: error.message,
      adminId: req.admin._id,
      ip: req.ip
    });
    next(error);
  }
});

module.exports = router;