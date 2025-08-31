const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const { validateWalletAuth, validateAdminAuth, validateTwoFactorSetup } = require('../middleware/validation');
const { validateRequest, logRequest, generateToken, generateAuthMessage } = require('../middleware/auth');
const { authLimiter, adminAuthLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

// Apply logging to all routes
router.use(logRequest);

// Get authentication message for wallet signing
router.get('/message/:walletAddress', authLimiter, async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }
    
    const timestamp = Date.now();
    const message = generateAuthMessage(walletAddress, timestamp);
    
    res.json({
      success: true,
      data: {
        message,
        timestamp
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Wallet authentication
router.post('/wallet', authLimiter, validateWalletAuth, validateRequest, async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    // Verify signature using ethers
    const { ethers } = require('ethers');
    
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.security('Invalid wallet signature attempt', {
        walletAddress,
        recoveredAddress,
        ip: req.ip,
        userAgent: req.get('User-Agent')
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
      
      logger.info('New user registered', {
        userId: user._id,
        walletAddress: user.walletAddress,
        ip: req.ip
      });
    }
    
    // Update user login info
    await user.addIpAddress(req.ip);
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      walletAddress: user.walletAddress,
      isAdmin: false
    });
    
    logger.audit('User authenticated via wallet', {
      userId: user._id,
      walletAddress: user.walletAddress,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          totalClaimed: user.totalClaimed,
          totalClaimable: user.totalClaimable,
          claimCount: user.claimCount,
          lastClaimDate: user.lastClaimDate,
          canClaim: user.canClaim()
        }
      }
    });
    
  } catch (error) {
    logger.error('Wallet authentication error', {
      error: error.message,
      walletAddress: req.body.walletAddress,
      ip: req.ip
    });
    next(error);
  }
});

// Admin login
router.post('/admin/login', adminAuthLimiter, validateAdminAuth, validateRequest, async (req, res, next) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    
    // Find admin
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin || !admin.isActive) {
      logger.security('Admin login attempt with invalid email', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (admin.isLocked) {
      logger.security('Admin login attempt on locked account', {
        adminId: admin._id,
        email,
        ip: req.ip
      });
      
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }
    
    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      await admin.incrementLoginAttempts();
      await admin.addLoginHistory(req.ip, req.get('User-Agent'), false);
      
      logger.security('Admin login attempt with invalid password', {
        adminId: admin._id,
        email,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check 2FA if enabled
    if (admin.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(400).json({
          success: false,
          error: 'Two-factor authentication code required'
        });
      }
      
      const verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });
      
      if (!verified) {
        await admin.incrementLoginAttempts();
        await admin.addLoginHistory(req.ip, req.get('User-Agent'), false);
        
        logger.security('Admin login attempt with invalid 2FA code', {
          adminId: admin._id,
          email,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid two-factor authentication code'
        });
      }
    }
    
    // Successful login
    await admin.addLoginHistory(req.ip, req.get('User-Agent'), true);
    
    const token = generateToken({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      isAdmin: true
    });
    
    logger.audit('Admin authenticated', {
      adminId: admin._id,
      email: admin.email,
      role: admin.role,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions,
          twoFactorEnabled: admin.twoFactorEnabled
        }
      }
    });
    
  } catch (error) {
    logger.error('Admin authentication error', {
      error: error.message,
      email: req.body.email,
      ip: req.ip
    });
    next(error);
  }
});

// Setup 2FA for admin
router.post('/admin/2fa/setup', adminAuthLimiter, async (req, res, next) => {
  try {
    // This would typically require admin authentication
    // For setup, we'll use email/password verification
    const { email, password } = req.body;
    
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin || !await admin.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `GTC Admin (${admin.email})`,
      issuer: 'Green Candle Token'
    });
    
    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    // Save secret (temporarily, until verified)
    admin.twoFactorSecret = secret.base32;
    await admin.save();
    
    logger.audit('Admin 2FA setup initiated', {
      adminId: admin._id,
      email: admin.email,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: [] // Could implement backup codes
      }
    });
    
  } catch (error) {
    logger.error('2FA setup error', error);
    next(error);
  }
});

// Verify and enable 2FA
router.post('/admin/2fa/verify', adminAuthLimiter, validateTwoFactorSetup, validateRequest, async (req, res, next) => {
  try {
    const { email, password, token } = req.body;
    
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin || !await admin.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    if (!admin.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: '2FA setup not initiated'
      });
    }
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      logger.security('Invalid 2FA verification attempt', {
        adminId: admin._id,
        email: admin.email,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }
    
    // Enable 2FA
    admin.twoFactorEnabled = true;
    await admin.save();
    
    logger.audit('Admin 2FA enabled', {
      adminId: admin._id,
      email: admin.email,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });
    
  } catch (error) {
    logger.error('2FA verification error', error);
    next(error);
  }
});

// Disable 2FA
router.post('/admin/2fa/disable', adminAuthLimiter, async (req, res, next) => {
  try {
    const { email, password, token } = req.body;
    
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin || !await admin.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    if (!admin.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled'
      });
    }
    
    // Verify current token
    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }
    
    // Disable 2FA
    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = null;
    await admin.save();
    
    logger.audit('Admin 2FA disabled', {
      adminId: admin._id,
      email: admin.email,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
    
  } catch (error) {
    logger.error('2FA disable error', error);
    next(error);
  }
});

module.exports = router;