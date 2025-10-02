/**
 * Email Routes for GCT Token Platform
 * Handles email sending, templates, and notifications
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { requireAdmin, authenticateToken, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const User = require('../models/User');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Test email service
router.get('/test', requireAdmin, async (req, res) => {
  try {
    const result = await emailService.testConnection();
    
    res.json({
      success: result.success,
      data: result
    });
    
  } catch (error) {
    logger.error('Email test error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Email test failed'
    });
  }
});

// Send welcome email to user
router.post('/welcome/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!user.email) {
      return res.status(400).json({
        success: false,
        error: 'User has no email address'
      });
    }
    
    const result = await emailService.sendWelcomeEmail(user);
    
    logger.info('Welcome email sent', {
      adminId: req.admin.id,
      userId: user._id,
      email: user.email
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Welcome email sent successfully'
    });
    
  } catch (error) {
    logger.error('Welcome email error', {
      error: error.message,
      adminId: req.admin.id,
      userId: req.params.userId
    });
    
    res.status(500).json({
      success: false,
      error: 'Welcome email failed'
    });
  }
});

// Send claim notification
router.post('/claim-notification/:claimId', requireAdmin, async (req, res) => {
  try {
    const { claimId } = req.params;
    const ClaimTransaction = require('../models/ClaimTransaction');
    
    const claim = await ClaimTransaction.findById(claimId).populate('user');
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }
    
    if (!claim.user || !claim.user.email) {
      return res.status(400).json({
        success: false,
        error: 'User has no email address'
      });
    }
    
    const result = await emailService.sendClaimNotification(claim.user, claim);
    
    logger.info('Claim notification sent', {
      adminId: req.admin.id,
      claimId: claim._id,
      userId: claim.user._id,
      email: claim.user.email
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Claim notification sent successfully'
    });
    
  } catch (error) {
    logger.error('Claim notification error', {
      error: error.message,
      adminId: req.admin.id,
      claimId: req.params.claimId
    });
    
    res.status(500).json({
      success: false,
      error: 'Claim notification failed'
    });
  }
});

// Send password reset email
router.post('/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Save reset token to user (you might want to add these fields to User model)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();
    
    const result = await emailService.sendPasswordResetEmail(user, resetToken);
    
    logger.info('Password reset email sent', {
      userId: user._id,
      email: user.email
    });
    
    res.json({
      success: true,
      data: result,
      message: 'If the email exists, a password reset link has been sent'
    });
    
  } catch (error) {
    logger.error('Password reset email error', {
      error: error.message,
      email: req.body.email
    });
    
    res.status(500).json({
      success: false,
      error: 'Password reset email failed'
    });
  }
});

// Send bulk email to users
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { subject, template, filters, data = {} } = req.body;
    
    if (!subject || !template) {
      return res.status(400).json({
        success: false,
        error: 'Subject and template are required'
      });
    }
    
    // Build user filter
    const userFilter = {};
    if (filters) {
      if (filters.hasEmail) {
        userFilter.email = { $exists: true, $ne: null };
      }
      if (filters.isActive !== undefined) {
        userFilter.isActive = filters.isActive;
      }
      if (filters.createdAfter) {
        userFilter.createdAt = { $gte: new Date(filters.createdAfter) };
      }
    }
    
    const users = await User.find(userFilter).select('email name');
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No users found matching the criteria'
      });
    }
    
    const results = await emailService.sendBulkEmail(users, subject, template, data);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info('Bulk email sent', {
      adminId: req.admin.id,
      totalRecipients: users.length,
      successful: successful,
      failed: failed
    });
    
    res.json({
      success: true,
      data: {
        totalRecipients: users.length,
        successful: successful,
        failed: failed,
        results: results
      },
      message: `Bulk email sent to ${successful} recipients`
    });
    
  } catch (error) {
    logger.error('Bulk email error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Bulk email failed'
    });
  }
});

// Send admin notification
router.post('/admin-notification', requireAdmin, async (req, res) => {
  try {
    const { subject, message, adminIds = [] } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Subject and message are required'
      });
    }
    
    let admins;
    if (adminIds.length > 0) {
      admins = await Admin.find({ _id: { $in: adminIds } });
    } else {
      admins = await Admin.find({ isActive: true });
    }
    
    if (admins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No admins found'
      });
    }
    
    const results = [];
    for (const admin of admins) {
      try {
        const result = await emailService.sendAdminNotification(admin, {
          subject,
          message
        });
        results.push({ adminId: admin._id, success: true, result });
      } catch (error) {
        results.push({ adminId: admin._id, success: false, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info('Admin notification sent', {
      senderAdminId: req.admin.id,
      totalAdmins: admins.length,
      successful: successful,
      failed: failed
    });
    
    res.json({
      success: true,
      data: {
        totalAdmins: admins.length,
        successful: successful,
        failed: failed,
        results: results
      },
      message: `Admin notification sent to ${successful} admins`
    });
    
  } catch (error) {
    logger.error('Admin notification error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Admin notification failed'
    });
  }
});

// Get email statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = emailService.getStats();
    
    // Get user email statistics
    const totalUsers = await User.countDocuments();
    const usersWithEmail = await User.countDocuments({ 
      email: { $exists: true, $ne: null } 
    });
    
    res.json({
      success: true,
      data: {
        service: stats,
        users: {
          total: totalUsers,
          withEmail: usersWithEmail,
          withoutEmail: totalUsers - usersWithEmail
        }
      }
    });
    
  } catch (error) {
    logger.error('Email stats error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get email statistics'
    });
  }
});

// Get available templates
router.get('/templates', requireAdmin, async (req, res) => {
  try {
    const stats = emailService.getStats();
    
    res.json({
      success: true,
      data: {
        templates: stats.availableTemplates,
        count: stats.templatesLoaded
      }
    });
    
  } catch (error) {
    logger.error('Templates list error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

// Send test email
router.post('/test-send', requireAdmin, async (req, res) => {
  try {
    const { to, subject, template, data = {} } = req.body;
    
    if (!to || !subject || !template) {
      return res.status(400).json({
        success: false,
        error: 'To, subject, and template are required'
      });
    }
    
    const result = await emailService.sendEmail(to, subject, template, data);
    
    logger.info('Test email sent', {
      adminId: req.admin.id,
      to: to,
      subject: subject,
      template: template
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Test email sent successfully'
    });
    
  } catch (error) {
    logger.error('Test email error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Test email failed'
    });
  }
});

module.exports = router;