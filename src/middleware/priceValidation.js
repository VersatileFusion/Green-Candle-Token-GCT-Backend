const { body, param, query } = require('express-validator');
const logger = require('../utils/logger');

// Price validation utilities
const isValidPrice = (value) => {
  const price = parseFloat(value);
  return !isNaN(price) && price >= 0 && price <= 1000000; // Reasonable price range
};

const isValidPercentage = (value) => {
  const percentage = parseFloat(value.replace('%', ''));
  return !isNaN(percentage) && percentage >= -100 && percentage <= 1000; // Reasonable percentage range
};

const isValidMarketCap = (value) => {
  const cap = parseFloat(value);
  return !isNaN(cap) && cap >= 0 && cap <= 1000000000000; // Up to 1 trillion
};

const isValidVolume = (value) => {
  const volume = parseFloat(value);
  return !isNaN(volume) && volume >= 0 && volume <= 100000000000; // Up to 100 billion
};

// Price data validation
const validatePriceData = body().custom((value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Price data must be an object');
  }
  
  const { price, change24h, marketCap, volume24h } = value;
  
  if (price && !isValidPrice(price)) {
    throw new Error('Invalid price value');
  }
  
  if (change24h && !isValidPercentage(change24h)) {
    throw new Error('Invalid 24h change percentage');
  }
  
  if (marketCap && !isValidMarketCap(marketCap)) {
    throw new Error('Invalid market cap value');
  }
  
  if (volume24h && !isValidVolume(volume24h)) {
    throw new Error('Invalid 24h volume value');
  }
  
  return true;
});

// Days parameter validation for historical data
const validateDays = query('days')
  .optional()
  .isInt({ min: 1, max: 365 })
  .withMessage('Days must be between 1 and 365')
  .toInt();

// Contract address validation
const validateContractAddress = param('address')
  .optional()
  .custom((value) => {
    if (!value) return true; // Optional parameter
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  })
  .withMessage('Invalid contract address format')
  .toLowerCase();

// Price source validation
const validatePriceSource = param('sourceName')
  .isIn(['coingecko', 'coinmarketcap', 'pancakeswap', 'binance'])
  .withMessage('Invalid price source name');

// Price comparison validation
const validatePriceComparison = body().custom((value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Comparison data must be an object');
  }
  
  const { contractAddress, comparison } = value;
  
  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    throw new Error('Invalid contract address in comparison data');
  }
  
  if (!comparison || typeof comparison !== 'object') {
    throw new Error('Invalid comparison object');
  }
  
  return true;
});

// Cache configuration validation
const validateCacheConfig = body().custom((value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Cache config must be an object');
  }
  
  const { ttl, maxSize, cleanupInterval } = value;
  
  if (ttl !== undefined) {
    if (!Number.isInteger(ttl) || ttl < 1000 || ttl > 3600000) {
      throw new Error('TTL must be between 1000ms and 3600000ms (1 hour)');
    }
  }
  
  if (maxSize !== undefined) {
    if (!Number.isInteger(maxSize) || maxSize < 10 || maxSize > 10000) {
      throw new Error('Max size must be between 10 and 10000');
    }
  }
  
  if (cleanupInterval !== undefined) {
    if (!Number.isInteger(cleanupInterval) || cleanupInterval < 10000 || cleanupInterval > 600000) {
      throw new Error('Cleanup interval must be between 10000ms and 600000ms (10 minutes)');
    }
  }
  
  return true;
});

// Price source configuration validation
const validateSourceConfig = body().custom((value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Source config must be an object');
  }
  
  const { enabled, priority, timeout, apiKey } = value;
  
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw new Error('Enabled must be a boolean');
  }
  
  if (priority !== undefined) {
    if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
      throw new Error('Priority must be between 1 and 10');
    }
  }
  
  if (timeout !== undefined) {
    if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 30000) {
      throw new Error('Timeout must be between 1000ms and 30000ms');
    }
  }
  
  if (apiKey !== undefined && typeof apiKey !== 'string') {
    throw new Error('API key must be a string');
  }
  
  return true;
});

// Price validation middleware
const validatePriceRequest = (req, res, next) => {
  const errors = [];
  
  // Validate price data if present
  if (req.body.price) {
    if (!isValidPrice(req.body.price)) {
      errors.push({
        field: 'price',
        message: 'Invalid price value',
        value: req.body.price
      });
    }
  }
  
  // Validate change24h if present
  if (req.body.change24h) {
    if (!isValidPercentage(req.body.change24h)) {
      errors.push({
        field: 'change24h',
        message: 'Invalid 24h change percentage',
        value: req.body.change24h
      });
    }
  }
  
  // Validate market cap if present
  if (req.body.marketCap) {
    if (!isValidMarketCap(req.body.marketCap)) {
      errors.push({
        field: 'marketCap',
        message: 'Invalid market cap value',
        value: req.body.marketCap
      });
    }
  }
  
  // Validate volume if present
  if (req.body.volume24h) {
    if (!isValidVolume(req.body.volume24h)) {
      errors.push({
        field: 'volume24h',
        message: 'Invalid 24h volume value',
        value: req.body.volume24h
      });
    }
  }
  
  if (errors.length > 0) {
    logger.security('Price validation failed', {
      errors,
      ip: req.ip,
      endpoint: req.path
    });
    
    return res.status(400).json({
      success: false,
      error: 'Price validation failed',
      details: errors
    });
  }
  
  next();
};

// Price sanitization middleware
const sanitizePriceData = (req, res, next) => {
  if (req.body.price) {
    req.body.price = parseFloat(req.body.price).toFixed(8);
  }
  
  if (req.body.change24h) {
    const change = parseFloat(req.body.change24h.replace('%', ''));
    req.body.change24h = `${change.toFixed(2)}%`;
  }
  
  if (req.body.marketCap) {
    req.body.marketCap = parseFloat(req.body.marketCap).toString();
  }
  
  if (req.body.volume24h) {
    req.body.volume24h = parseFloat(req.body.volume24h).toString();
  }
  
  next();
};

// Price rate limiting middleware
const priceRateLimit = (req, res, next) => {
  const ip = req.ip;
  const endpoint = req.path;
  const now = Date.now();
  
  // Simple in-memory rate limiting for price endpoints
  if (!global.priceRateLimit) {
    global.priceRateLimit = new Map();
  }
  
  const key = `${ip}_${endpoint}`;
  const requests = global.priceRateLimit.get(key) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = requests.filter(time => now - time < 60000);
  
  // Check if rate limit exceeded (100 requests per minute)
  if (recentRequests.length >= 100) {
    logger.security('Price endpoint rate limit exceeded', {
      ip,
      endpoint,
      requestCount: recentRequests.length
    });
    
    return res.status(429).json({
      success: false,
      error: 'Too many price requests from this IP',
      retryAfter: 60
    });
  }
  
  // Add current request
  recentRequests.push(now);
  global.priceRateLimit.set(key, recentRequests);
  
  next();
};

// Price data integrity check
const checkPriceIntegrity = (req, res, next) => {
  const { price, change24h, marketCap, volume24h } = req.body;
  
  // Check for suspicious price data
  if (price && parseFloat(price) === 0) {
    logger.warn('Zero price detected', {
      ip: req.ip,
      endpoint: req.path,
      data: req.body
    });
  }
  
  // Check for extreme price changes
  if (change24h) {
    const change = parseFloat(change24h.replace('%', ''));
    if (Math.abs(change) > 50) {
      logger.warn('Extreme price change detected', {
        ip: req.ip,
        endpoint: req.path,
        change24h,
        data: req.body
      });
    }
  }
  
  // Check for unrealistic market cap
  if (marketCap && parseFloat(marketCap) > 1000000000000) {
    logger.warn('Unrealistic market cap detected', {
      ip: req.ip,
      endpoint: req.path,
      marketCap,
      data: req.body
    });
  }
  
  next();
};

module.exports = {
  validatePriceData,
  validateDays,
  validateContractAddress,
  validatePriceSource,
  validatePriceComparison,
  validateCacheConfig,
  validateSourceConfig,
  validatePriceRequest,
  sanitizePriceData,
  priceRateLimit,
  checkPriceIntegrity,
  
  // Utility functions
  isValidPrice,
  isValidPercentage,
  isValidMarketCap,
  isValidVolume
};