/**
 * Activity Routes for GCT Token Platform
 * Handles activity feeds and system events
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Get public activity feed
router.get('/feed', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      hours = 24 
    } = req.query;
    const skip = (page - 1) * limit;
    
    let activities;
    
    if (hours && parseInt(hours) < 24) {
      // Get recent activities within specified hours
      activities = await Activity.getRecentActivities(parseInt(hours), parseInt(limit));
    } else if (type) {
      // Get activities by type
      activities = await Activity.getActivitiesByType(type, parseInt(limit), skip);
    } else {
      // Get general public activities
      activities = await Activity.getPublicActivities(parseInt(limit), skip);
    }
    
    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          count: activities.length
        }
      }
    });
    
  } catch (error) {
    logger.error('Get activity feed error', { error: error.message });
    next(error);
  }
});

// Get user's personal activity feed
router.get('/user', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const activities = await Activity.getUserActivities(req.user._id, parseInt(limit), skip);
    const total = await Activity.countDocuments({ 
      user: req.user._id, 
      public: true 
    });
    
    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get user activities error', { error: error.message });
    next(error);
  }
});

// Get system activities (admin only)
router.get('/system', requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const activities = await Activity.getSystemActivities(parseInt(limit), skip);
    const total = await Activity.countDocuments({ 
      type: { $in: ['system_event', 'price_update', 'merkle_tree_updated'] },
      public: true 
    });
    
    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get system activities error', { error: error.message });
    next(error);
  }
});

// Get admin activities (admin only)
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const activities = await Activity.getAdminActivities(req.admin._id, parseInt(limit), skip);
    const total = await Activity.countDocuments({ admin: req.admin._id });
    
    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get admin activities error', { error: error.message });
    next(error);
  }
});

// Get activity statistics
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;
    
    const stats = await Activity.getActivityStats();
    const recentCount = await Activity.countDocuments({
      createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
      public: true
    });
    
    const totalActivities = await Activity.countDocuments({ public: true });
    const userActivities = await Activity.countDocuments({ 
      user: { $exists: true },
      public: true 
    });
    const adminActivities = await Activity.countDocuments({ 
      admin: { $exists: true } 
    });
    
    res.json({
      success: true,
      data: {
        total: totalActivities,
        recent: recentCount,
        user: userActivities,
        admin: adminActivities,
        byType: stats,
        timeRange: `${hours} hours`
      }
    });
    
  } catch (error) {
    logger.error('Get activity stats error', { error: error.message });
    next(error);
  }
});

// Create activity (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      type,
      title,
      description,
      data = {},
      user,
      priority = 'medium',
      public: isPublic = true,
      metadata = {}
    } = req.body;
    
    const activity = await Activity.createActivity({
      type,
      title,
      description,
      data,
      user,
      admin: req.admin._id,
      priority,
      public: isPublic,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logger.info('Activity created', {
      activityId: activity._id,
      type: activity.type,
      adminId: req.admin._id
    });
    
    res.json({
      success: true,
      data: { activity }
    });
    
  } catch (error) {
    logger.error('Create activity error', { error: error.message });
    next(error);
  }
});

// Update activity status (admin only)
router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    activity.status = status;
    await activity.save();
    
    logger.info('Activity status updated', {
      activityId: activity._id,
      newStatus: status,
      adminId: req.admin._id
    });
    
    res.json({
      success: true,
      data: { activity }
    });
    
  } catch (error) {
    logger.error('Update activity status error', { error: error.message });
    next(error);
  }
});

// Get activity types
router.get('/types', async (req, res, next) => {
  try {
    const types = [
      { value: 'user_login', label: 'User Login' },
      { value: 'user_logout', label: 'User Logout' },
      { value: 'wallet_connected', label: 'Wallet Connected' },
      { value: 'wallet_disconnected', label: 'Wallet Disconnected' },
      { value: 'claim_initiated', label: 'Claim Initiated' },
      { value: 'claim_completed', label: 'Claim Completed' },
      { value: 'claim_failed', label: 'Claim Failed' },
      { value: 'stake_created', label: 'Stake Created' },
      { value: 'stake_completed', label: 'Stake Completed' },
      { value: 'unstake_initiated', label: 'Unstake Initiated' },
      { value: 'unstake_completed', label: 'Unstake Completed' },
      { value: 'profile_updated', label: 'Profile Updated' },
      { value: 'email_updated', label: 'Email Updated' },
      { value: 'admin_action', label: 'Admin Action' },
      { value: 'system_event', label: 'System Event' },
      { value: 'price_update', label: 'Price Update' },
      { value: 'merkle_tree_updated', label: 'Merkle Tree Updated' },
      { value: 'bulk_email_sent', label: 'Bulk Email Sent' },
      { value: 'cache_cleared', label: 'Cache Cleared' }
    ];
    
    res.json({
      success: true,
      data: { types }
    });
    
  } catch (error) {
    logger.error('Get activity types error', { error: error.message });
    next(error);
  }
});

module.exports = router;