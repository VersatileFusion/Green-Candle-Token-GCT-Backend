/**
 * Cache Management Routes for GCT Token Platform
 * Handles in-memory cache operations and statistics
 */

const express = require('express');
const router = express.Router();

const { requireAdmin, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const memoryCache = require('../services/memoryCache');
const priceService = require('../services/priceService');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);
router.use(requireAdmin);

// Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await memoryCache.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Cache stats error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// Get cache health
router.get('/health', async (req, res) => {
  try {
    const health = await memoryCache.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Cache health error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get cache health'
    });
  }
});

// Clear all cache
router.post('/clear', async (req, res) => {
  try {
    const result = await memoryCache.flushAll();
    
    if (result) {
      logger.info('Cache cleared by admin', {
        adminId: req.admin.id,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'All cache cleared successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache'
      });
    }
    
  } catch (error) {
    logger.error('Cache clear error', {
      error: error.message,
      adminId: req.admin.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Clear cache by pattern
router.post('/clear-pattern', async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required'
      });
    }
    
    const result = await memoryCache.flushPattern(pattern);
    
    if (result) {
      logger.info('Cache pattern cleared by admin', {
        adminId: req.admin.id,
        pattern: pattern,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache pattern'
      });
    }
    
  } catch (error) {
    logger.error('Cache pattern clear error', {
      error: error.message,
      adminId: req.admin.id,
      pattern: req.body.pattern
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache pattern'
    });
  }
});

// Get cache keys
router.get('/keys', async (req, res) => {
  try {
    const { pattern = '*' } = req.query;
    
    const keys = await memoryCache.keys(pattern);
    
    res.json({
      success: true,
      data: {
        keys: keys,
        count: keys.length,
        pattern: pattern
      }
    });
    
  } catch (error) {
    logger.error('Cache keys error', {
      error: error.message,
      adminId: req.admin.id,
      pattern: req.query.pattern
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get cache keys'
    });
  }
});

// Get specific cache value
router.get('/get/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const value = await memoryCache.get(key);
    
    res.json({
      success: true,
      data: {
        key: key,
        value: value,
        exists: value !== null
      }
    });
    
  } catch (error) {
    logger.error('Cache get error', {
      error: error.message,
      adminId: req.admin.id,
      key: req.params.key
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get cache value'
    });
  }
});

// Set cache value
router.post('/set', async (req, res) => {
  try {
    const { key, value, ttl } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Key and value are required'
      });
    }
    
    const result = await memoryCache.set(key, value, ttl);
    
    if (result) {
      logger.info('Cache value set by admin', {
        adminId: req.admin.id,
        key: key,
        ttl: ttl,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Cache value set successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to set cache value'
      });
    }
    
  } catch (error) {
    logger.error('Cache set error', {
      error: error.message,
      adminId: req.admin.id,
      key: req.body.key
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to set cache value'
    });
  }
});

// Delete cache value
router.delete('/delete/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await memoryCache.del(key);
    
    if (result) {
      logger.info('Cache value deleted by admin', {
        adminId: req.admin.id,
        key: key,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Cache value deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete cache value'
      });
    }
    
  } catch (error) {
    logger.error('Cache delete error', {
      error: error.message,
      adminId: req.admin.id,
      key: req.params.key
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete cache value'
    });
  }
});

// Warm cache
router.post('/warm', async (req, res) => {
  try {
    const { type } = req.body;
    
    const warmingTasks = [];
    
    switch (type) {
      case 'price':
        warmingTasks.push(
          priceService.getTokenPrice().then(price => {
            return memoryCache.cachePrice('default', price, 300);
          })
        );
        break;
        
      case 'all':
        // Warm all common caches
        warmingTasks.push(
          priceService.getTokenPrice().then(price => {
            return memoryCache.cachePrice('default', price, 300);
          })
        );
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid cache type. Use "price" or "all"'
        });
    }
    
    const results = await Promise.allSettled(warmingTasks);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info('Cache warmed by admin', {
      adminId: req.admin.id,
      type: type,
      successful: successful,
      failed: failed,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        type: type,
        successful: successful,
        failed: failed,
        results: results.map(r => ({
          status: r.status,
          value: r.status === 'fulfilled' ? r.value : r.reason
        }))
      },
      message: `Cache warmed: ${successful} successful, ${failed} failed`
    });
    
  } catch (error) {
    logger.error('Cache warm error', {
      error: error.message,
      adminId: req.admin.id,
      type: req.body.type
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
});

module.exports = router;