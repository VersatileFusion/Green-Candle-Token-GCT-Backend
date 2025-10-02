# Price API Documentation

This document provides detailed information about the Price API endpoints for real-time token pricing and historical data.

## Overview

The Price API provides real-time token pricing from multiple sources including CoinGecko, CoinMarketCap, PancakeSwap, and Binance. It includes caching, fallback mechanisms, and comprehensive price validation.

## Base URL

```
Development: http://localhost:3000/api/v1/price
Production: https://your-domain.com/api/v1/price
```

## Authentication

Most endpoints are public and don't require authentication. Admin endpoints require admin authentication:

```http
Authorization: Bearer <admin_jwt_token>
```

## Rate Limiting

- **Public endpoints**: 100 requests per minute per IP
- **Admin endpoints**: Standard admin rate limits apply

## Endpoints

### Get Current Token Price

#### GET /price/current/:address?

Get the current price of a token from multiple sources.

**Parameters:**
- `address` (optional): Contract address. If not provided, uses configured contract address.

**Response:**
```json
{
  "success": true,
  "data": {
    "price": "0.01234567",
    "change24h": "+2.45%",
    "marketCap": "1234567",
    "volume24h": "98765",
    "lastUpdated": "2023-12-07T10:30:00.000Z",
    "source": "coingecko",
    "cached": false
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/price/current/0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F"
```

### Get Historical Prices

#### GET /price/historical/:address?

Get historical price data for a token.

**Parameters:**
- `address` (optional): Contract address
- `days` (query): Number of days (1-365, default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "timestamp": "2023-12-07T10:30:00.000Z",
        "price": "0.01234567"
      }
    ],
    "marketCaps": [
      {
        "timestamp": "2023-12-07T10:30:00.000Z",
        "marketCap": "1234567"
      }
    ],
    "volumes": [
      {
        "timestamp": "2023-12-07T10:30:00.000Z",
        "volume": "98765"
      }
    ],
    "period": "7 days",
    "source": "coingecko",
    "cached": false
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/price/historical/0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F?days=30"
```

### Get Price Comparison

#### GET /price/comparison/:address?

Get price comparison across different sources.

**Parameters:**
- `address` (optional): Contract address

**Response:**
```json
{
  "success": true,
  "data": {
    "contractAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
    "comparison": {
      "coingecko": {
        "price": "0.01234567",
        "source": "coingecko",
        "lastUpdated": "2023-12-07T10:30:00.000Z"
      },
      "coinmarketcap": {
        "price": "0.01234000",
        "source": "coinmarketcap",
        "lastUpdated": "2023-12-07T10:29:00.000Z"
      }
    },
    "timestamp": "2023-12-07T10:30:00.000Z",
    "cached": false
  }
}
```

### Get Price Statistics

#### GET /price/stats/:address?

Get comprehensive price statistics including 24h high/low and volatility.

**Parameters:**
- `address` (optional): Contract address

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "price": "0.01234567",
      "change24h": "+2.45%",
      "marketCap": "1234567",
      "volume24h": "98765"
    },
    "historical": {
      "high24h": "0.01250000",
      "low24h": "0.01200000",
      "avg24h": "0.01225000",
      "totalVolume24h": "150000"
    },
    "volatility": {
      "priceRange": "0.00050000",
      "priceRangePercent": "4.17%"
    },
    "lastUpdated": "2023-12-07T10:30:00.000Z",
    "source": "coingecko"
  }
}
```

### Get Available Price Sources

#### GET /price/sources

Get information about available price sources and their status.

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "name": "coingecko",
        "enabled": true,
        "priority": 1,
        "timeout": 5000
      },
      {
        "name": "coinmarketcap",
        "enabled": true,
        "priority": 2,
        "timeout": 5000
      }
    ],
    "totalSources": 4,
    "activeSources": 4
  }
}
```

### Price Service Health Check

#### GET /price/health

Check the health status of the price service.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "price": {
      "value": "0.01234567",
      "source": "coingecko",
      "lastUpdated": "2023-12-07T10:30:00.000Z"
    },
    "sources": {
      "total": 4,
      "active": 4
    },
    "cache": {
      "size": 15,
      "maxSize": 1000,
      "expiredEntries": 0,
      "hitRate": {
        "hits": 0,
        "misses": 0,
        "rate": "0%"
      },
      "memoryUsage": {
        "bytes": 1024,
        "kb": 1.0,
        "mb": 0.0
      }
    },
    "timestamp": "2023-12-07T10:30:00.000Z"
  }
}
```

## Admin Endpoints

### Get Cache Statistics

#### GET /price/admin/cache/stats

Get detailed cache statistics (Admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "size": 15,
    "maxSize": 1000,
    "expiredEntries": 0,
    "hitRate": {
      "hits": 0,
      "misses": 0,
      "rate": "0%"
    },
    "memoryUsage": {
      "bytes": 1024,
      "kb": 1.0,
      "mb": 0.0
    }
  }
}
```

### Clear Cache

#### POST /price/admin/cache/clear

Clear all cached price data (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

### Warm Cache

#### POST /price/admin/cache/warm/:address?

Warm the cache with fresh price data (Admin only).

**Parameters:**
- `address` (optional): Contract address

**Response:**
```json
{
  "success": true,
  "message": "Cache warmed successfully",
  "data": {
    "contractAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
    "timestamp": "2023-12-07T10:30:00.000Z"
  }
}
```

### Update Price Source Configuration

#### PUT /price/admin/sources/:sourceName

Update configuration for a specific price source (Admin only).

**Parameters:**
- `sourceName`: Name of the price source (coingecko, coinmarketcap, pancakeswap, binance)

**Request Body:**
```json
{
  "enabled": true,
  "priority": 1,
  "timeout": 5000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price source configuration updated",
  "data": {
    "sourceName": "coingecko",
    "config": {
      "enabled": true,
      "priority": 1,
      "timeout": 5000
    }
  }
}
```

### Enable Price Source

#### POST /price/admin/sources/:sourceName/enable

Enable a specific price source (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Price source coingecko enabled"
}
```

### Disable Price Source

#### POST /price/admin/sources/:sourceName/disable

Disable a specific price source (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Price source coingecko disabled"
}
```

## Error Responses

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Too many price requests from this IP",
  "retryAfter": 60
}
```

### Invalid Contract Address
```json
{
  "success": false,
  "error": "Invalid contract address format"
}
```

### Price Service Unhealthy
```json
{
  "success": false,
  "error": "Price service unhealthy",
  "details": "All price sources failed"
}
```

## Configuration

### Environment Variables

```env
# Price Service Configuration
COINGECKO_API_KEY=your-coingecko-api-key-optional
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key-optional

# Price Cache Configuration
PRICE_CACHE_TTL=60000
PRICE_CACHE_MAX_SIZE=1000
PRICE_CACHE_CLEANUP_INTERVAL=60000

# Price Source Configuration
COINGECKO_ENABLED=true
COINGECKO_PRIORITY=1
COINGECKO_TIMEOUT=5000

COINMARKETCAP_ENABLED=true
COINMARKETCAP_PRIORITY=2
COINMARKETCAP_TIMEOUT=5000

PANCAKESWAP_ENABLED=true
PANCAKESWAP_PRIORITY=3
PANCAKESWAP_TIMEOUT=10000

BINANCE_ENABLED=true
BINANCE_PRIORITY=4
BINANCE_TIMEOUT=5000
```

## Price Sources

### CoinGecko
- **Priority**: 1 (highest)
- **API**: Free tier available
- **Features**: Historical data, market cap, volume
- **Rate Limit**: 50 calls/minute (free tier)

### CoinMarketCap
- **Priority**: 2
- **API**: Requires API key
- **Features**: Professional data, high accuracy
- **Rate Limit**: Varies by plan

### PancakeSwap
- **Priority**: 3
- **API**: Public endpoint
- **Features**: DEX pricing, real-time data
- **Rate Limit**: No official limit

### Binance
- **Priority**: 4 (lowest)
- **API**: Public endpoint
- **Features**: Exchange pricing
- **Rate Limit**: 1200 requests/minute

## Caching Strategy

- **Current Price**: 1 minute TTL
- **Historical Data**: 10 minutes TTL
- **Price Comparison**: 5 minutes TTL
- **Cache Size**: Maximum 1000 entries
- **Cleanup**: Every 1 minute

## Fallback Mechanism

1. Try primary source (CoinGecko)
2. Try secondary source (CoinMarketCap)
3. Try tertiary source (PancakeSwap)
4. Try quaternary source (Binance)
5. Use fallback price if all sources fail

## Best Practices

1. **Use caching**: Always check cache before making requests
2. **Handle errors**: Implement proper error handling for price failures
3. **Rate limiting**: Respect rate limits to avoid service disruption
4. **Fallback prices**: Always have fallback prices for critical operations
5. **Monitor health**: Regularly check price service health
6. **Update configuration**: Adjust source priorities based on reliability

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function getTokenPrice(contractAddress) {
  try {
    const response = await axios.get(`http://localhost:3000/api/v1/price/current/${contractAddress}`);
    return response.data.data;
  } catch (error) {
    console.error('Price fetch failed:', error.message);
    return null;
  }
}
```

### Python
```python
import requests

def get_token_price(contract_address):
    try:
        response = requests.get(f'http://localhost:3000/api/v1/price/current/{contract_address}')
        return response.json()['data']
    except Exception as e:
        print(f'Price fetch failed: {e}')
        return None
```

### cURL
```bash
# Get current price
curl -X GET "http://localhost:3000/api/v1/price/current/0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F"

# Get historical data
curl -X GET "http://localhost:3000/api/v1/price/historical/0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F?days=30"

# Get price comparison
curl -X GET "http://localhost:3000/api/v1/price/comparison/0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F"
```