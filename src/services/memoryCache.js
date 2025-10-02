/**
 * In-Memory Cache Service for GCT Token Platform
 * Simple replacement for Redis functionality
 */

const logger = require('../utils/logger');

class MemoryCacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      memoryUsage: 0
    };
  }

  // Set a key-value pair with optional TTL
  async set(key, value, ttl = null) {
    try {
      const data = {
        value: value,
        expires: ttl ? Date.now() + (ttl * 1000) : null
      };
      
      this.cache.set(key, data);
      this.stats.sets++;
      this.updateMemoryUsage();
      
      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  // Get a value by key
  async get(key) {
    try {
      const data = this.cache.get(key);
      
      if (!data) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (data.expires && Date.now() > data.expires) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return data.value;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  // Delete a key
  async del(key) {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.stats.deletes++;
        this.updateMemoryUsage();
      }
      
      logger.debug('Cache delete', { key, deleted });
      return deleted;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      const data = this.cache.get(key);
      
      if (!data) {
        return false;
      }

      // Check if expired
      if (data.expires && Date.now() > data.expires) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  }

  // Set expiration for a key
  async expire(key, ttl) {
    try {
      const data = this.cache.get(key);
      
      if (!data) {
        return false;
      }

      data.expires = Date.now() + (ttl * 1000);
      this.cache.set(key, data);
      
      logger.debug('Cache expire set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache expire error', { key, ttl, error: error.message });
      return false;
    }
  }

  // Get all keys matching a pattern
  async keys(pattern) {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingKeys = [];
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          matchingKeys.push(key);
        }
      }
      
      return matchingKeys;
    } catch (error) {
      logger.error('Cache keys error', { pattern, error: error.message });
      return [];
    }
  }

  // Clear all cache
  async flushAll() {
    try {
      this.cache.clear();
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        memoryUsage: 0
      };
      
      logger.info('Cache flushed all data');
      return { success: true, message: 'All cache cleared' };
    } catch (error) {
      logger.error('Cache flush error', error);
      return { success: false, error: error.message };
    }
  }

  // Clear keys matching pattern
  async flushPattern(pattern) {
    try {
      const keys = await this.keys(pattern);
      let deletedCount = 0;
      
      for (const key of keys) {
        if (this.cache.delete(key)) {
          deletedCount++;
        }
      }
      
      this.updateMemoryUsage();
      
      logger.info(`Cache flushed ${deletedCount} keys matching pattern: ${pattern}`);
      return { success: true, deletedCount, pattern };
    } catch (error) {
      logger.error('Cache flush pattern error', { pattern, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      this.updateMemoryUsage();
      
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
      
      return {
        status: 'connected',
        memory: {
          used: this.stats.memoryUsage,
          peak: this.stats.memoryUsage,
          fragmentation: 0
        },
        stats: {
          keys: this.cache.size,
          hits: this.stats.hits,
          misses: this.stats.misses,
          sets: this.stats.sets,
          deletes: this.stats.deletes,
          hitRate: `${hitRate}%`
        },
        info: {
          version: '1.0.0',
          mode: 'memory',
          uptime: process.uptime()
        }
      };
    } catch (error) {
      logger.error('Cache stats error', error);
      return { status: 'error', error: error.message };
    }
  }

  // Health check
  async healthCheck() {
    try {
      return { status: 'healthy', message: 'Memory cache is responding' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Update memory usage calculation
  updateMemoryUsage() {
    try {
      let totalSize = 0;
      
      for (const [key, data] of this.cache.entries()) {
        totalSize += key.length * 2; // Approximate string size
        totalSize += JSON.stringify(data).length * 2; // Approximate object size
      }
      
      this.stats.memoryUsage = totalSize;
    } catch (error) {
      logger.error('Memory usage calculation error', error);
    }
  }

  // Cache price data
  async cachePrice(symbol, price, ttl = 300) {
    const key = `price:${symbol}`;
    return await this.set(key, price, ttl);
  }

  // Get cached price
  async getCachedPrice(symbol) {
    const key = `price:${symbol}`;
    return await this.get(key);
  }

  // Get historical data
  async getHistorical(key) {
    return await this.get(`historical:${key}`);
  }

  // Set historical data
  async setHistorical(key, data, ttl = 3600) {
    return await this.set(`historical:${key}`, data, ttl);
  }

  // Get comparison data
  async getComparison(address) {
    return await this.get(`comparison:${address}`);
  }

  // Set comparison data
  async setComparison(address, data, ttl = 1800) {
    return await this.set(`comparison:${address}`, data, ttl);
  }

  // Clear all cache (alias for flushAll)
  async clear() {
    return await this.flushAll();
  }

  // Warm all caches
  async warmAllCaches(contractAddress) {
    try {
      const priceService = require('./priceService');
      
      // Warm price cache
      const price = await priceService.getTokenPrice(contractAddress);
      await this.cachePrice(contractAddress, price, 300);
      
      // Warm historical cache (last 24h)
      const historical = await priceService.getHistoricalPrice(contractAddress, '24h');
      await this.setHistorical(`${contractAddress}:24h`, historical, 3600);
      
      // Warm comparison cache
      const comparison = await priceService.getPriceComparison(contractAddress);
      await this.setComparison(contractAddress, comparison, 1800);
      
      logger.info('All caches warmed successfully', { contractAddress });
      return { success: true, message: 'All caches warmed' };
    } catch (error) {
      logger.error('Cache warming failed', { contractAddress, error: error.message });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MemoryCacheService();