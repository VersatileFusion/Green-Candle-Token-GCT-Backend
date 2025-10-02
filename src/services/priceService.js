const axios = require('axios');
const logger = require('../utils/logger');

class PriceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.priceSources = {
      coingecko: {
        name: 'CoinGecko',
        enabled: true,
        priority: 1,
        timeout: 5000
      },
      coinmarketcap: {
        name: 'CoinMarketCap',
        enabled: true,
        priority: 2,
        timeout: 5000
      },
      pancakeswap: {
        name: 'PancakeSwap',
        enabled: true,
        priority: 3,
        timeout: 10000
      },
      binance: {
        name: 'Binance',
        enabled: true,
        priority: 4,
        timeout: 5000
      }
    };
    
    this.fallbackPrice = {
      price: '0.01',
      change24h: '0.00%',
      marketCap: '1000000',
      volume24h: '50000',
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    };
    
    this.initializePriceSources();
  }
  
  initializePriceSources() {
    // Initialize with environment variables
    if (process.env.COINGECKO_API_KEY) {
      this.priceSources.coingecko.apiKey = process.env.COINGECKO_API_KEY;
    }
    
    if (process.env.COINMARKETCAP_API_KEY) {
      this.priceSources.coinmarketcap.apiKey = process.env.COINMARKETCAP_API_KEY;
    }
    
    // Set custom contract address for DEX queries
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.network = process.env.NETWORK || 'testnet';
  }
  
  async getTokenPrice(contractAddress = null) {
    const address = contractAddress || this.contractAddress;
    const cacheKey = `price_${address}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.info('Price served from cache', { address, source: cached.data.source });
        return cached.data;
      }
    }
    
    // Try to get price from multiple sources
    const pricePromises = [];
    
    for (const [sourceName, config] of Object.entries(this.priceSources)) {
      if (config.enabled) {
        pricePromises.push(
          this.fetchFromSource(sourceName, address, config)
            .catch(error => {
              logger.warn(`Price fetch failed from ${sourceName}`, { error: error.message });
              return null;
            })
        );
      }
    }
    
    try {
      const results = await Promise.allSettled(pricePromises);
      const validPrices = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        .sort((a, b) => a.priority - b.priority);
      
      let finalPrice;
      
      if (validPrices.length > 0) {
        // Use the highest priority valid price
        finalPrice = validPrices[0];
        
        // Calculate average if we have multiple sources
        if (validPrices.length > 1) {
          finalPrice = this.calculateAveragePrice(validPrices);
        }
      } else {
        // Use fallback price
        finalPrice = { ...this.fallbackPrice };
        logger.warn('All price sources failed, using fallback', { address });
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: finalPrice,
        timestamp: Date.now()
      });
      
      logger.info('Price fetched successfully', { 
        address, 
        source: finalPrice.source, 
        price: finalPrice.price 
      });
      
      return finalPrice;
      
    } catch (error) {
      logger.error('Price fetching failed completely', { error: error.message });
      return { ...this.fallbackPrice };
    }
  }
  
  async fetchFromSource(sourceName, contractAddress, config) {
    const startTime = Date.now();
    
    switch (sourceName) {
      case 'coingecko':
        return await this.fetchFromCoinGecko(contractAddress, config);
      case 'coinmarketcap':
        return await this.fetchFromCoinMarketCap(contractAddress, config);
      case 'pancakeswap':
        return await this.fetchFromPancakeSwap(contractAddress, config);
      case 'binance':
        return await this.fetchFromBinance(contractAddress, config);
      default:
        throw new Error(`Unknown price source: ${sourceName}`);
    }
  }
  
  async fetchFromCoinGecko(contractAddress, config) {
    const url = `https://api.coingecko.com/api/v3/simple/token_price/bsc`;
    const params = {
      contract_addresses: contractAddress,
      vs_currencies: 'usd',
      include_24hr_change: true,
      include_24hr_vol: true,
      include_market_cap: true
    };
    
    if (config.apiKey) {
      params.x_cg_demo_api_key = config.apiKey;
    }
    
    const response = await axios.get(url, {
      params,
      timeout: config.timeout,
      headers: {
        'User-Agent': 'GCT-Backend/1.0'
      }
    });
    
    const data = response.data[contractAddress.toLowerCase()];
    if (!data) {
      throw new Error('Token not found on CoinGecko');
    }
    
    return {
      price: data.usd.toString(),
      change24h: `${data.usd_24h_change?.toFixed(2) || 0}%`,
      marketCap: data.usd_market_cap?.toString() || '0',
      volume24h: data.usd_24h_vol?.toString() || '0',
      lastUpdated: new Date().toISOString(),
      source: 'coingecko',
      priority: config.priority
    };
  }
  
  async fetchFromCoinMarketCap(contractAddress, config) {
    if (!config.apiKey) {
      throw new Error('CoinMarketCap API key required');
    }
    
    // First, get the token ID
    const mapUrl = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map';
    const mapResponse = await axios.get(mapUrl, {
      params: {
        listing_status: 'active',
        limit: 5000
      },
      headers: {
        'X-CMC_PRO_API_KEY': config.apiKey,
        'Accept': 'application/json'
      },
      timeout: config.timeout
    });
    
    const tokenMap = mapResponse.data.data.find(
      token => token.platform?.token_address?.toLowerCase() === contractAddress.toLowerCase()
    );
    
    if (!tokenMap) {
      throw new Error('Token not found on CoinMarketCap');
    }
    
    // Get price data
    const priceUrl = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
    const priceResponse = await axios.get(priceUrl, {
      params: {
        id: tokenMap.id,
        convert: 'USD'
      },
      headers: {
        'X-CMC_PRO_API_KEY': config.apiKey,
        'Accept': 'application/json'
      },
      timeout: config.timeout
    });
    
    const data = priceResponse.data.data[tokenMap.id];
    
    return {
      price: data.quote.USD.price.toString(),
      change24h: `${data.quote.USD.percent_change_24h?.toFixed(2) || 0}%`,
      marketCap: data.quote.USD.market_cap?.toString() || '0',
      volume24h: data.quote.USD.volume_24h?.toString() || '0',
      lastUpdated: new Date().toISOString(),
      source: 'coinmarketcap',
      priority: config.priority
    };
  }
  
  async fetchFromPancakeSwap(contractAddress, config) {
    // PancakeSwap V2 API endpoint
    const url = 'https://api.pancakeswap.info/api/v2/tokens';
    
    const response = await axios.get(url, {
      timeout: config.timeout,
      headers: {
        'User-Agent': 'GCT-Backend/1.0'
      }
    });
    
    const tokenData = response.data.data[contractAddress.toLowerCase()];
    if (!tokenData) {
      throw new Error('Token not found on PancakeSwap');
    }
    
    return {
      price: tokenData.price,
      change24h: `${tokenData.price_BNB ? '0.00' : '0.00'}%`, // PancakeSwap doesn't provide 24h change directly
      marketCap: '0', // Not available from this endpoint
      volume24h: '0', // Not available from this endpoint
      lastUpdated: new Date().toISOString(),
      source: 'pancakeswap',
      priority: config.priority
    };
  }
  
  async fetchFromBinance(contractAddress, config) {
    // Binance doesn't directly support BSC tokens, but we can get BNB price as reference
    const url = 'https://api.binance.com/api/v3/ticker/24hr';
    
    const response = await axios.get(url, {
      params: {
        symbol: 'BNBUSDT'
      },
      timeout: config.timeout,
      headers: {
        'User-Agent': 'GCT-Backend/1.0'
      }
    });
    
    const data = response.data;
    
    // This is a simplified implementation - in reality, you'd need to get the token/BNB pair price
    // and multiply by BNB/USDT price
    return {
      price: '0.01', // Placeholder - would need actual token/BNB pair
      change24h: `${parseFloat(data.priceChangePercent).toFixed(2)}%`,
      marketCap: '0',
      volume24h: data.volume,
      lastUpdated: new Date().toISOString(),
      source: 'binance',
      priority: config.priority
    };
  }
  
  calculateAveragePrice(prices) {
    const validPrices = prices.filter(p => p.price && !isNaN(parseFloat(p.price)));
    
    if (validPrices.length === 0) {
      return this.fallbackPrice;
    }
    
    const avgPrice = validPrices.reduce((sum, p) => sum + parseFloat(p.price), 0) / validPrices.length;
    const avgChange = validPrices.reduce((sum, p) => {
      const change = parseFloat(p.change24h.replace('%', ''));
      return sum + (isNaN(change) ? 0 : change);
    }, 0) / validPrices.length;
    
    return {
      price: avgPrice.toFixed(8),
      change24h: `${avgChange.toFixed(2)}%`,
      marketCap: validPrices[0].marketCap || '0',
      volume24h: validPrices[0].volume24h || '0',
      lastUpdated: new Date().toISOString(),
      source: 'average',
      priority: 0,
      sources: validPrices.map(p => p.source)
    };
  }
  
  async getHistoricalPrices(contractAddress, days = 7) {
    const cacheKey = `historical_${contractAddress}_${days}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout * 10) { // 10 minutes cache for historical
        return cached.data;
      }
    }
    
    try {
      // Try CoinGecko for historical data
      const url = `https://api.coingecko.com/api/v3/coins/bsc/contract/${contractAddress}/market_chart`;
      const params = {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      };
      
      const response = await axios.get(url, {
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'GCT-Backend/1.0'
        }
      });
      
      const data = response.data;
      const historicalData = {
        prices: data.prices.map(([timestamp, price]) => ({
          timestamp: new Date(timestamp).toISOString(),
          price: price.toString()
        })),
        marketCaps: data.market_caps.map(([timestamp, cap]) => ({
          timestamp: new Date(timestamp).toISOString(),
          marketCap: cap.toString()
        })),
        volumes: data.total_volumes.map(([timestamp, volume]) => ({
          timestamp: new Date(timestamp).toISOString(),
          volume: volume.toString()
        })),
        period: `${days} days`,
        source: 'coingecko'
      };
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: historicalData,
        timestamp: Date.now()
      });
      
      return historicalData;
      
    } catch (error) {
      logger.error('Historical price fetch failed', { error: error.message });
      
      // Return mock historical data
      return this.generateMockHistoricalData(days);
    }
  }
  
  generateMockHistoricalData(days) {
    const data = [];
    const now = Date.now();
    const interval = days <= 1 ? 3600000 : 86400000; // 1 hour or 1 day
    const basePrice = 0.01;
    
    for (let i = days * (days <= 1 ? 24 : 1); i >= 0; i--) {
      const timestamp = now - (i * interval);
      const variation = (Math.random() - 0.5) * 0.002; // ±0.1% variation
      const price = basePrice + variation;
      
      data.push({
        timestamp: new Date(timestamp).toISOString(),
        price: Math.max(0, price).toFixed(8),
        marketCap: (parseFloat(price) * 100000000).toString(),
        volume: (Math.random() * 10000).toString()
      });
    }
    
    return {
      prices: data,
      marketCaps: data,
      volumes: data,
      period: `${days} days`,
      source: 'mock'
    };
  }
  
  async getPriceComparison(contractAddress) {
    const sources = Object.keys(this.priceSources).filter(name => this.priceSources[name].enabled);
    const comparison = {};
    
    for (const source of sources) {
      try {
        const price = await this.fetchFromSource(source, contractAddress, this.priceSources[source]);
        comparison[source] = {
          price: price.price,
          source: price.source,
          lastUpdated: price.lastUpdated
        };
      } catch (error) {
        comparison[source] = {
          error: error.message,
          available: false
        };
      }
    }
    
    return {
      contractAddress,
      comparison,
      timestamp: new Date().toISOString()
    };
  }
  
  // Cache management
  clearCache() {
    this.cache.clear();
    logger.info('Price cache cleared');
  }
  
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      timestamp: new Date().toISOString()
    };
  }
  
  // Configuration management
  updateSourceConfig(sourceName, config) {
    if (this.priceSources[sourceName]) {
      this.priceSources[sourceName] = { ...this.priceSources[sourceName], ...config };
      logger.info('Price source config updated', { sourceName, config });
    }
  }
  
  enableSource(sourceName) {
    if (this.priceSources[sourceName]) {
      this.priceSources[sourceName].enabled = true;
      logger.info('Price source enabled', { sourceName });
    }
  }
  
  disableSource(sourceName) {
    if (this.priceSources[sourceName]) {
      this.priceSources[sourceName].enabled = false;
      logger.info('Price source disabled', { sourceName });
    }
  }
  
  getSourceStatus() {
    return Object.entries(this.priceSources).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      priority: config.priority,
      timeout: config.timeout
    }));
  }
}

module.exports = new PriceService();