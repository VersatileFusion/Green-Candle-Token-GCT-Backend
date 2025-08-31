const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  }
});

// Strict rate limiter for claim operations
const claimLimiter = rateLimit({
  windowMs: parseInt(process.env.CLAIM_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.CLAIM_RATE_LIMIT_MAX_REQUESTS) || 10,
  message: {
    success: false,
    error: 'Too many claim attempts from this IP. Please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.CLAIM_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Claim rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      walletAddress: req.body?.walletAddress
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many claim attempts from this IP. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.CLAIM_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000) / 1000)
    });
  }
});

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please try again later.',
    retryAfter: 900 // 15 minutes
  },
  handler: (req, res) => {
    logger.security('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP. Please try again later.',
      retryAfter: 900
    });
  }
});

// Admin login rate limiter
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per IP for admin
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many admin login attempts from this IP. Please try again later.',
    retryAfter: 900
  },
  handler: (req, res) => {
    logger.security('Admin auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many admin login attempts from this IP. Please try again later.',
      retryAfter: 900
    });
  }
});

// Slow down middleware for progressive delays
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow 10 requests per 15 minutes at full speed
  delayMs: 500, // Add 500ms delay after 10 requests
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  onLimitReached: (req, res, options) => {
    logger.security('Speed limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
  }
});

// Per-user rate limiter for claims
const createUserClaimLimiter = () => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const userId = req.user?._id?.toString();
    const walletAddress = req.body?.walletAddress?.toLowerCase();
    
    if (!userId && !walletAddress) {
      return next();
    }
    
    const key = userId || walletAddress;
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 0, resetTime: now + windowMs });
    }
    
    const userAttempts = attempts.get(key);
    
    // Reset if window has passed
    if (now > userAttempts.resetTime) {
      userAttempts.count = 0;
      userAttempts.resetTime = now + windowMs;
    }
    
    // Check if user has exceeded limit (1 claim per 24 hours)
    if (userAttempts.count >= 1) {
      const retryAfter = Math.ceil((userAttempts.resetTime - now) / 1000);
      
      logger.security('User claim limit exceeded', {
        userId,
        walletAddress,
        ip: req.ip
      });
      
      return res.status(429).json({
        success: false,
        error: 'You can only claim once every 24 hours.',
        retryAfter
      });
    }
    
    userAttempts.count++;
    next();
  };
};

// Cleanup old entries periodically
const cleanupAttempts = (attempts) => {
  const now = Date.now();
  for (const [key, value] of attempts.entries()) {
    if (now > value.resetTime) {
      attempts.delete(key);
    }
  }
};

// Create user claim limiter instance
const userClaimLimiter = createUserClaimLimiter();

// Cleanup interval (every hour)
setInterval(() => {
  // This would need to be implemented with a shared store in production
  // For now, it's just a placeholder
}, 60 * 60 * 1000);

module.exports = {
  apiLimiter,
  claimLimiter,
  authLimiter,
  adminAuthLimiter,
  speedLimiter,
  userClaimLimiter
};