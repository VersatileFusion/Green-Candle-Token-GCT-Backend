const express = require('express');
const router = express.Router();

const { requireAdmin, requirePermission, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Get blockchain network info
router.get('/network', async (req, res, next) => {
  try {
    const networkInfo = await blockchainService.getNetworkInfo();
    
    res.json({
      success: true,
      data: networkInfo
    });
    
  } catch (error) {
    logger.error('Get network info error', {
      error: error.message,
      ip: req.ip
    });
    next(error);
  }
});

// Get token price
router.get('/price', async (req, res, next) => {
  try {
    const priceInfo = await blockchainService.getTokenPrice();
    
    res.json({
      success: true,
      data: priceInfo
    });
    
  } catch (error) {
    logger.error('Get token price error', {
      error: error.message,
      ip: req.ip
    });
    next(error);
  }
});

// Get contract info
router.get('/contract', async (req, res, next) => {
  try {
    const contractInfo = await blockchainService.getContractInfo();
    
    res.json({
      success: true,
      data: contractInfo
    });
    
  } catch (error) {
    logger.error('Get contract info error', {
      error: error.message,
      ip: req.ip
    });
    next(error);
  }
});

// Get wallet balance
router.get('/balance/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }
    
    const balanceInfo = await blockchainService.getWalletBalance(address);
    
    res.json({
      success: true,
      data: balanceInfo
    });
    
  } catch (error) {
    logger.error('Get wallet balance error', {
      error: error.message,
      address: req.params.address,
      ip: req.ip
    });
    next(error);
  }
});

// Get transaction status
router.get('/transaction/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    
    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format'
      });
    }
    
    const transactionInfo = await blockchainService.getTransactionStatus(hash);
    
    res.json({
      success: true,
      data: transactionInfo
    });
    
  } catch (error) {
    logger.error('Get transaction status error', {
      error: error.message,
      hash: req.params.hash,
      ip: req.ip
    });
    next(error);
  }
});

// Process pending claims (admin only)
router.post('/process-claims', requireAdmin, requirePermission('claims.approve'), async (req, res, next) => {
  try {
    const admin = req.admin;
    
    const result = await blockchainService.processPendingClaims();
    
    logger.admin('Pending claims processing initiated', {
      adminId: admin._id,
      adminEmail: admin.email,
      processedCount: result.processedCount,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Process pending claims error', {
      error: error.message,
      adminId: req.admin._id,
      ip: req.ip
    });
    next(error);
  }
});

// Send admin claim (admin only)
router.post('/admin-claim', requireAdmin, requirePermission('claims.write'), async (req, res, next) => {
  try {
    const { claimId } = req.body;
    const admin = req.admin;
    
    if (!claimId) {
      return res.status(400).json({
        success: false,
        error: 'Claim ID is required'
      });
    }
    
    const result = await blockchainService.processAdminClaim(claimId);
    
    logger.admin('Admin claim processed', {
      adminId: admin._id,
      adminEmail: admin.email,
      claimId,
      transactionHash: result.transactionHash,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Process admin claim error', {
      error: error.message,
      adminId: req.admin._id,
      claimId: req.body.claimId,
      ip: req.ip
    });
    next(error);
  }
});

// Update merkle root on contract (admin only)
router.post('/update-merkle-root', requireAdmin, requirePermission('merkle.manage'), async (req, res, next) => {
  try {
    const { merkleTreeId } = req.body;
    const admin = req.admin;
    
    if (!merkleTreeId) {
      return res.status(400).json({
        success: false,
        error: 'Merkle tree ID is required'
      });
    }
    
    const result = await blockchainService.updateMerkleRoot(merkleTreeId);
    
    logger.admin('Merkle root updated on contract', {
      adminId: admin._id,
      adminEmail: admin.email,
      merkleTreeId,
      transactionHash: result.transactionHash,
      newRoot: result.newRoot,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Update merkle root error', {
      error: error.message,
      adminId: req.admin._id,
      merkleTreeId: req.body.merkleTreeId,
      ip: req.ip
    });
    next(error);
  }
});

// Get gas prices
router.get('/gas-price', async (req, res, next) => {
  try {
    const gasPrice = await blockchainService.getGasPrice();
    
    res.json({
      success: true,
      data: gasPrice
    });
    
  } catch (error) {
    logger.error('Get gas price error', {
      error: error.message,
      ip: req.ip
    });
    next(error);
  }
});

// Get block info
router.get('/block/:blockNumber?', async (req, res, next) => {
  try {
    const { blockNumber } = req.params;
    
    const blockInfo = await blockchainService.getBlockInfo(blockNumber);
    
    res.json({
      success: true,
      data: blockInfo
    });
    
  } catch (error) {
    logger.error('Get block info error', {
      error: error.message,
      blockNumber: req.params.blockNumber,
      ip: req.ip
    });
    next(error);
  }
});

// Verify merkle proof
router.post('/verify-proof', async (req, res, next) => {
  try {
    const { walletAddress, amount, proof, merkleRoot } = req.body;
    
    if (!walletAddress || !amount || !proof || !merkleRoot) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const isValid = await blockchainService.verifyMerkleProof(
      walletAddress,
      amount,
      proof,
      merkleRoot
    );
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        walletAddress,
        amount,
        merkleRoot
      }
    });
    
  } catch (error) {
    logger.error('Verify merkle proof error', {
      error: error.message,
      walletAddress: req.body.walletAddress,
      ip: req.ip
    });
    next(error);
  }
});

// Contract events monitoring status (admin only)
router.get('/events', requireAdmin, requirePermission('logs.read'), async (req, res, next) => {
  try {
    const { fromBlock, toBlock, limit = 100 } = req.query;
    
    const events = await blockchainService.getContractEvents({
      fromBlock,
      toBlock,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: events
    });
    
  } catch (error) {
    logger.error('Get contract events error', {
      error: error.message,
      adminId: req.admin._id,
      ip: req.ip
    });
    next(error);
  }
});

// Health check for blockchain connection
router.get('/health', async (req, res, next) => {
  try {
    const health = await blockchainService.getConnectionHealth();
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Blockchain health check error', {
      error: error.message,
      ip: req.ip
    });
    next(error);
  }
});

module.exports = router;