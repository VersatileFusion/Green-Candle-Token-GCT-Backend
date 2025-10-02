const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin, logRequest } = require('../middleware/auth');
const { validateRequest, validateWalletParam, validatePagination } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');
const priceService = require('../services/priceService');
const memoryCache = require('../services/memoryCache');
const logger = require('../utils/logger');

// Apply rate limiting and logging to all routes
router.use(apiLimiter);
router.use(logRequest);

// Get current token price
router.get('/current/:address?', validateWalletParam('address'), validateRequest, async (req, res, next) => {
  try {
    const contractAddress = req.params.address || process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address not provided and not configured'
      });
    }
    
    // Check cache first
    const cachedPrice = await memoryCache.getCachedPrice(contractAddress);
    if (cachedPrice) {
      return res.json({
        success: true,
        data: {
          ...cachedPrice,
          cached: true
        }
      });
    }
    
    // Fetch fresh price
    const price = await priceService.getTokenPrice(contractAddress);
    
    // Cache the result
    await memoryCache.cachePrice(contractAddress, price, 300);
    
    res.json({
      success: true,
      data: {
        ...price,
        cached: false
      }
    });
    
  } catch (error) {
    logger.error('Get current price error', { error: error.message });
    next(error);
  }
});

// Get historical prices
router.get('/historical/:address?', validateWalletParam('address'), validateRequest, async (req, res, next) => {
  try {
    const contractAddress = req.params.address || process.env.CONTRACT_ADDRESS;
    const days = parseInt(req.query.days) || 7;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address not provided and not configured'
      });
    }
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days parameter must be between 1 and 365'
      });
    }
    
    // Check cache first
    const cacheKey = `${contractAddress}_${days}`;
    const cachedHistorical = memoryCache.getHistorical(cacheKey);
    if (cachedHistorical) {
      return res.json({
        success: true,
        data: {
          ...cachedHistorical,
          cached: true
        }
      });
    }
    
    // Fetch fresh historical data
    const historical = await priceService.getHistoricalPrices(contractAddress, days);
    
    // Cache the result
    memoryCache.setHistorical(cacheKey, historical);
    
    res.json({
      success: true,
      data: {
        ...historical,
        cached: false
      }
    });
    
  } catch (error) {
    logger.error('Get historical prices error', { error: error.message });
    next(error);
  }
});

// Get price comparison across sources
router.get('/comparison/:address?', validateWalletParam('address'), validateRequest, async (req, res, next) => {
  try {
    const contractAddress = req.params.address || process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address not provided and not configured'
      });
    }
    
    // Check cache first
    const cachedComparison = memoryCache.getComparison(contractAddress);
    if (cachedComparison) {
      return res.json({
        success: true,
        data: {
          ...cachedComparison,
          cached: true
        }
      });
    }
    
    // Fetch fresh comparison
    const comparison = await priceService.getPriceComparison(contractAddress);
    
    // Cache the result
    memoryCache.setComparison(contractAddress, comparison);
    
    res.json({
      success: true,
      data: {
        ...comparison,
        cached: false
      }
    });
    
  } catch (error) {
    logger.error('Get price comparison error', { error: error.message });
    next(error);
  }
});

// Get price statistics
router.get('/stats/:address?', validateWalletParam('address'), validateRequest, async (req, res, next) => {
  try {
    const contractAddress = req.params.address || process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address not provided and not configured'
      });
    }
    
    // Get current price
    const currentPrice = await priceService.getTokenPrice(contractAddress);
    
    // Get 24h historical data for statistics
    const historical24h = await priceService.getHistoricalPrices(contractAddress, 1);
    
    // Calculate basic statistics
    const prices = historical24h.prices.map(p => parseFloat(p.price));
    const volumes = historical24h.volumes.map(v => parseFloat(v.volume));
    
    const stats = {
      current: {
        price: currentPrice.price,
        change24h: currentPrice.change24h,
        marketCap: currentPrice.marketCap,
        volume24h: currentPrice.volume24h
      },
      historical: {
        high24h: Math.max(...prices).toString(),
        low24h: Math.min(...prices).toString(),
        avg24h: (prices.reduce((a, b) => a + b, 0) / prices.length).toString(),
        totalVolume24h: volumes.reduce((a, b) => a + b, 0).toString()
      },
      volatility: {
        priceRange: (Math.max(...prices) - Math.min(...prices)).toString(),
        priceRangePercent: (((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices)) * 100).toFixed(2) + '%'
      },
      lastUpdated: new Date().toISOString(),
      source: currentPrice.source
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Get price stats error', { error: error.message });
    next(error);
  }
});

// Get available price sources
router.get('/sources', async (req, res, next) => {
  try {
    const sources = priceService.getSourceStatus();
    
    res.json({
      success: true,
      data: {
        sources,
        totalSources: sources.length,
        activeSources: sources.filter(s => s.enabled).length
      }
    });
    
  } catch (error) {
    logger.error('Get price sources error', { error: error.message });
    next(error);
  }
});

// Admin endpoints for price management
router.get('/admin/cache/stats', requireAdmin, async (req, res, next) => {
  try {
    const stats = memoryCache.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Get cache stats error', { error: error.message });
    next(error);
  }
});

router.post('/admin/cache/clear', requireAdmin, async (req, res, next) => {
  try {
    memoryCache.clear();
    
    logger.admin('Cache cleared by admin', {
      adminId: req.admin._id,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
    
  } catch (error) {
    logger.error('Clear cache error', { error: error.message });
    next(error);
  }
});

router.post('/admin/cache/warm/:address?', requireAdmin, validateWalletParam('address'), validateRequest, async (req, res, next) => {
  try {
    const contractAddress = req.params.address || process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address not provided and not configured'
      });
    }
    
    // Warm all caches
    await memoryCache.warmAllCaches(contractAddress);
    
    logger.admin('Cache warmed by admin', {
      adminId: req.admin._id,
      contractAddress,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Cache warmed successfully',
      data: {
        contractAddress,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Warm cache error', { error: error.message });
    next(error);
  }
});

router.put('/admin/sources/:sourceName', requireAdmin, async (req, res, next) => {
  try {
    const { sourceName } = req.params;
    const { enabled, priority, timeout } = req.body;
    
    const updateData = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (priority !== undefined) updateData.priority = priority;
    if (timeout !== undefined) updateData.timeout = timeout;
    
    priceService.updateSourceConfig(sourceName, updateData);
    
    logger.admin('Price source config updated', {
      adminId: req.admin._id,
      sourceName,
      updateData,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Price source configuration updated',
      data: {
        sourceName,
        config: updateData
      }
    });
    
  } catch (error) {
    logger.error('Update price source config error', { error: error.message });
    next(error);
  }
});

router.post('/admin/sources/:sourceName/enable', requireAdmin, async (req, res, next) => {
  try {
    const { sourceName } = req.params;
    
    priceService.enableSource(sourceName);
    
    logger.admin('Price source enabled', {
      adminId: req.admin._id,
      sourceName,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: `Price source ${sourceName} enabled`
    });
    
  } catch (error) {
    logger.error('Enable price source error', { error: error.message });
    next(error);
  }
});

router.post('/admin/sources/:sourceName/disable', requireAdmin, async (req, res, next) => {
  try {
    const { sourceName } = req.params;
    
    priceService.disableSource(sourceName);
    
    logger.admin('Price source disabled', {
      adminId: req.admin._id,
      sourceName,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: `Price source ${sourceName} disabled`
    });
    
  } catch (error) {
    logger.error('Disable price source error', { error: error.message });
    next(error);
  }
});

// Health check for price service
router.get('/health', async (req, res, next) => {
  try {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return res.status(503).json({
        success: false,
        error: 'Price service not configured - no contract address'
      });
    }
    
    // Try to get a price to test the service
    const price = await priceService.getTokenPrice(contractAddress);
    const sources = priceService.getSourceStatus();
    const cacheStats = memoryCache.getStats();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        price: {
          value: price.price,
          source: price.source,
          lastUpdated: price.lastUpdated
        },
        sources: {
          total: sources.length,
          active: sources.filter(s => s.enabled).length
        },
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Price service health check failed', { error: error.message });
    
    res.status(503).json({
      success: false,
      error: 'Price service unhealthy',
      details: error.message
    });
  }
});

module.exports = router;