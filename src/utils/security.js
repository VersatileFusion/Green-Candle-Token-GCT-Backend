const crypto = require('crypto');
const logger = require('./logger');

/**
 * Security utility functions
 */
class SecurityUtils {
  
  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Hex encoded token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Generate a secure random string with specified charset
   * @param {number} length - String length
   * @param {string} charset - Character set to use
   * @returns {string} Random string
   */
  static generateRandomString(length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    const charsetLength = charset.length;
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charsetLength);
      result += charset[randomIndex];
    }
    
    return result;
  }
  
  /**
   * Hash a password with salt
   * @param {string} password - Plain text password
   * @param {string} salt - Salt (optional, will generate if not provided)
   * @returns {object} Object with hash and salt
   */
  static hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    return { hash, salt };
  }
  
  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Stored hash
   * @param {string} salt - Stored salt
   * @returns {boolean} True if password matches
   */
  static verifyPassword(password, hash, salt) {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }
  
  /**
   * Create HMAC signature
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @param {string} algorithm - HMAC algorithm
   * @returns {string} HMAC signature
   */
  static createHmacSignature(data, secret, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }
  
  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - Signature to verify
   * @param {string} secret - Secret key
   * @param {string} algorithm - HMAC algorithm
   * @returns {boolean} True if signature is valid
   */
  static verifyHmacSignature(data, signature, secret, algorithm = 'sha256') {
    const expectedSignature = this.createHmacSignature(data, secret, algorithm);
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  }
  
  /**
   * Encrypt data using AES-256-GCM
   * @param {string} plaintext - Data to encrypt
   * @param {string} key - Encryption key (32 bytes)
   * @returns {object} Object with encrypted data, iv, and tag
   */
  static encrypt(plaintext, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('GTC-Backend', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  /**
   * Decrypt data using AES-256-GCM
   * @param {string} encrypted - Encrypted data
   * @param {string} key - Decryption key
   * @param {string} iv - Initialization vector
   * @param {string} tag - Authentication tag
   * @returns {string} Decrypted plaintext
   */
  static decrypt(encrypted, key, iv, tag) {
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('GTC-Backend', 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Sanitize input to prevent XSS
   * @param {string} input - Input string
   * @returns {string} Sanitized string
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
  
  /**
   * Validate and sanitize wallet address
   * @param {string} address - Wallet address
   * @returns {string|null} Sanitized address or null if invalid
   */
  static sanitizeWalletAddress(address) {
    if (typeof address !== 'string') return null;
    
    // Remove whitespace and convert to lowercase
    const cleaned = address.trim().toLowerCase();
    
    // Validate Ethereum address format
    if (!/^0x[a-f0-9]{40}$/.test(cleaned)) {
      return null;
    }
    
    return cleaned;
  }
  
  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} True if valid email format
   */
  static isValidEmail(email) {
    if (typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  /**
   * Check if IP address is suspicious
   * @param {string} ip - IP address
   * @returns {boolean} True if IP appears suspicious
   */
  static isSuspiciousIP(ip) {
    // List of suspicious IP patterns (you can expand this)
    const suspiciousPatterns = [
      /^127\./, // Localhost
      /^192\.168\./, // Private network
      /^10\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
      /^0\.0\.0\.0$/, // Invalid
      /^255\.255\.255\.255$/ // Broadcast
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(ip));
  }
  
  /**
   * Rate limiting helper - check if action is allowed
   * @param {string} key - Unique identifier for the action
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @param {Map} storage - Storage map for tracking attempts
   * @returns {object} Object with allowed status and retry info
   */
  static checkRateLimit(key, maxAttempts, windowMs, storage) {
    const now = Date.now();
    const record = storage.get(key);
    
    if (!record) {
      storage.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }
    
    if (now > record.resetTime) {
      storage.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }
    
    if (record.count >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      };
    }
    
    record.count++;
    return { allowed: true, remaining: maxAttempts - record.count };
  }
  
  /**
   * Generate a secure session ID
   * @returns {string} Session ID
   */
  static generateSessionId() {
    return this.generateSecureToken(48);
  }
  
  /**
   * Create a secure API key
   * @param {string} prefix - Optional prefix for the API key
   * @returns {string} API key
   */
  static generateApiKey(prefix = 'GTC') {
    const randomPart = this.generateSecureToken(32);
    return `${prefix}_${randomPart}`;
  }
  
  /**
   * Hash sensitive data for storage
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} Hashed data
   */
  static hashSensitiveData(data, salt = 'GTC-Backend-Salt') {
    return crypto.createHash('sha256').update(data + salt).digest('hex');
  }
  
  /**
   * Validate and parse JSON safely
   * @param {string} jsonString - JSON string to parse
   * @param {any} defaultValue - Default value if parsing fails
   * @returns {any} Parsed JSON or default value
   */
  static safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('Failed to parse JSON', { jsonString, error: error.message });
      return defaultValue;
    }
  }
  
  /**
   * Create a secure backup code
   * @returns {string} Backup code
   */
  static generateBackupCode() {
    // Generate 8 groups of 4 characters each
    const groups = [];
    for (let i = 0; i < 8; i++) {
      groups.push(this.generateRandomString(4, '0123456789ABCDEF'));
    }
    return groups.join('-');
  }
  
  /**
   * Log security event
   * @param {string} event - Event type
   * @param {object} details - Event details
   */
  static logSecurityEvent(event, details = {}) {
    logger.security(`Security event: ${event}`, {
      timestamp: new Date().toISOString(),
      event,
      ...details
    });
  }
  
  /**
   * Check if password meets security requirements
   * @param {string} password - Password to check
   * @returns {object} Validation result
   */
  static validatePasswordStrength(password) {
    const result = {
      valid: true,
      score: 0,
      issues: []
    };
    
    if (!password) {
      result.valid = false;
      result.issues.push('Password is required');
      return result;
    }
    
    if (password.length < 8) {
      result.valid = false;
      result.issues.push('Password must be at least 8 characters long');
    } else {
      result.score += 1;
    }
    
    if (!/[a-z]/.test(password)) {
      result.valid = false;
      result.issues.push('Password must contain at least one lowercase letter');
    } else {
      result.score += 1;
    }
    
    if (!/[A-Z]/.test(password)) {
      result.valid = false;
      result.issues.push('Password must contain at least one uppercase letter');
    } else {
      result.score += 1;
    }
    
    if (!/\d/.test(password)) {
      result.valid = false;
      result.issues.push('Password must contain at least one number');
    } else {
      result.score += 1;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.valid = false;
      result.issues.push('Password must contain at least one special character');
    } else {
      result.score += 1;
    }
    
    if (password.length >= 12) {
      result.score += 1;
    }
    
    return result;
  }
}

module.exports = SecurityUtils;