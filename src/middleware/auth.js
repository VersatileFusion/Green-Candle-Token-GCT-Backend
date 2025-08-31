const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin token
    if (decoded.isAdmin) {
      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin token'
        });
      }
      req.admin = admin;
      req.user = null;
    } else {
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid user token'
        });
      }
      req.user = user;
      req.admin = null;
    }
    
    next();
  } catch (error) {
    logger.security('Token authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Middleware to require admin authentication
const requireAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});
    
    if (!req.admin) {
      logger.security('Non-admin attempted to access admin endpoint', {
        userId: req.user?._id,
        ip: req.ip,
        endpoint: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check admin permissions
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      if (!req.admin.hasPermission(permission)) {
        logger.security('Admin attempted to access endpoint without permission', {
          adminId: req.admin._id,
          permission,
          ip: req.ip,
          endpoint: req.path
        });
        
        return res.status(403).json({
          success: false,
          error: `Permission '${permission}' required`
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to authenticate wallet signature
const authenticateWallet = async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, signature, and message are required'
      });
    }
    
    // Verify signature using ethers
    const { ethers } = require('ethers');
    
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        logger.security('Invalid wallet signature', {
          walletAddress,
          recoveredAddress,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
      
      // Find or create user
      let user = await User.findByWallet(walletAddress);
      
      if (!user) {
        user = new User({
          walletAddress: walletAddress.toLowerCase()
        });
        await user.save();
        
        logger.info('New user created', {
          userId: user._id,
          walletAddress: user.walletAddress
        });
      }
      
      // Update user's IP and login info
      await user.addIpAddress(req.ip);
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();
      
      req.user = user;
      next();
      
    } catch (signatureError) {
      logger.security('Signature verification failed', {
        error: signatureError.message,
        walletAddress,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
    
  } catch (error) {
    logger.error('Wallet authentication error', error);
    next(error);
  }
};

// Middleware to validate request data
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    logger.security('Validation failed', {
      errors: formattedErrors,
      ip: req.ip,
      endpoint: req.path
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  
  next();
};

// Middleware to log requests
const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    adminId: req.admin?._id
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id,
      adminId: req.admin?._id
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Generate JWT token
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Generate wallet authentication message
const generateAuthMessage = (walletAddress, timestamp = Date.now()) => {
  return `Welcome to GTC Token Platform!\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nSign this message to authenticate your wallet.`;
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  authenticateWallet,
  validateRequest,
  logRequest,
  generateToken,
  generateAuthMessage
};