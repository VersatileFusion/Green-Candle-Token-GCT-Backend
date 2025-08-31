# GTC Backend API Reference

This document provides detailed information about all API endpoints, request/response formats, and authentication methods.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://your-domain.com/api/v1
```

## Authentication

### JWT Token Authentication
Most endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Wallet Signature Authentication
Some endpoints use wallet signature authentication. First get a message, sign it with your wallet, then include the signature in the request.

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalid_value"
    }
  ]
}
```

## Rate Limiting

All endpoints are rate limited:
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Claims**: 10 claims per hour per IP, 1 claim per 24 hours per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Endpoints

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "environment": "development"
}
```

---

## Authentication Endpoints

### GET /auth/message/:walletAddress
Get a message for wallet signature authentication.

**Parameters:**
- `walletAddress` (string): Ethereum wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Welcome to GTC Token Platform!\n\nWallet: 0x742d35...\nTimestamp: 1701944200000\n\nSign this message to authenticate your wallet.",
    "timestamp": 1701944200000
  }
}
```

### POST /auth/wallet
Authenticate using wallet signature.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "signature": "0x...",
  "message": "Welcome to GTC Token Platform!..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6571a1b8c9d2e3f4a5b6c7d8",
      "walletAddress": "0x742d35cc6634c0532925a3b8d23a40b83d8fa16f",
      "totalClaimed": "0",
      "totalClaimable": "1000000000000000000",
      "claimCount": 0,
      "lastClaimDate": null,
      "canClaim": true
    }
  }
}
```

### POST /auth/admin/login
Admin login with email and password.

**Request Body:**
```json
{
  "email": "admin@GTC-token.com",
  "password": "Admin123!@#",
  "twoFactorCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "6571a1b8c9d2e3f4a5b6c7d8",
      "email": "admin@GTC-token.com",
      "name": "Super Administrator",
      "role": "super_admin",
      "permissions": ["users.read", "users.write", "..."],
      "twoFactorEnabled": true
    }
  }
}
```

### POST /auth/admin/2fa/setup
Setup two-factor authentication for admin.

**Request Body:**
```json
{
  "email": "admin@GTC-token.com",
  "password": "Admin123!@#"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backupCodes": []
  }
}
```

---

## User Endpoints

All user endpoints require JWT authentication.

### GET /user/profile
Get current user profile.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6571a1b8c9d2e3f4a5b6c7d8",
      "walletAddress": "0x742d35cc6634c0532925a3b8d23a40b83d8fa16f",
      "email": "user@example.com",
      "totalClaimed": "1000000000000000000",
      "totalClaimable": "5000000000000000000",
      "claimCount": 2,
      "lastClaimDate": "2023-12-07T10:30:00.000Z",
      "canClaim": false,
      "createdAt": "2023-12-01T10:30:00.000Z",
      "updatedAt": "2023-12-07T10:30:00.000Z"
    },
    "merkleInfo": {
      "eligible": true,
      "allocation": "5000000000000000000",
      "remaining": "4000000000000000000"
    }
  }
}
```

### GET /user/claims
Get user's claim history with pagination.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "_id": "6571a1b8c9d2e3f4a5b6c7d8",
        "amount": "1000000000000000000",
        "type": "self_claim",
        "status": "completed",
        "transactionHash": "0x...",
        "createdAt": "2023-12-07T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### GET /user/eligibility
Check user's eligibility for token claims.

**Response:**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "canClaim": true,
    "allocation": "5000000000000000000",
    "remaining": "4000000000000000000",
    "proof": {
      "amount": "5000000000000000000",
      "index": 42,
      "proof": ["0x...", "0x..."]
    },
    "merkleTree": {
      "name": "Phase 1 Distribution",
      "description": "Initial token distribution",
      "root": "0x..."
    }
  }
}
```

### PATCH /user/profile
Update user profile (limited fields).

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      // Updated user object
    }
  }
}
```

---

## Claim Endpoints

### POST /claim/self
Submit a self-claim request.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "amount": "1000000000000000000",
  "signature": "0x...",
  "message": "Welcome to GTC Token Platform!..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claimId": "6571a1b8c9d2e3f4a5b6c7d8",
    "status": "pending",
    "amount": "1000000000000000000",
    "merkleProof": ["0x...", "0x..."],
    "merkleIndex": 42,
    "message": "Claim transaction created. Please wait for processing."
  }
}
```

### POST /claim/admin
Submit an admin claim (admin only).

**Headers:**
```http
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "amount": "1000000000000000000",
  "adminNote": "Manual distribution for presale participant"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claimId": "6571a1b8c9d2e3f4a5b6c7d8",
    "status": "pending",
    "amount": "1000000000000000000",
    "walletAddress": "0x742d35cc6634c0532925a3b8d23a40b83d8fa16f",
    "adminNote": "Manual distribution for presale participant",
    "message": "Admin claim transaction created successfully."
  }
}
```

### GET /claim/status/:claimId
Get claim transaction status.

**Response:**
```json
{
  "success": true,
  "data": {
    "claim": {
      "_id": "6571a1b8c9d2e3f4a5b6c7d8",
      "amount": "1000000000000000000",
      "type": "self_claim",
      "status": "completed",
      "transactionHash": "0x...",
      "blockNumber": 12345678,
      "gasUsed": "21000",
      "createdAt": "2023-12-07T10:30:00.000Z",
      "user": {
        "walletAddress": "0x742d35cc6634c0532925a3b8d23a40b83d8fa16f"
      }
    }
  }
}
```

---

## Admin Endpoints

All admin endpoints require admin JWT authentication and appropriate permissions.

### GET /admin/dashboard
Get dashboard statistics.

**Permissions Required:** `claims.read`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "new24h": 45,
      "active": 320
    },
    "claims": {
      "total": 2840,
      "pending": 15,
      "completed": 2800,
      "failed": 25,
      "claims24h": 120,
      "claims7d": 850
    },
    "amounts": {
      "totalClaimed": "2840000000000000000000"
    },
    "merkleTree": {
      "name": "Phase 1 Distribution",
      "totalUsers": 1000,
      "totalAmount": "5000000000000000000000",
      "createdAt": "2023-12-01T10:30:00.000Z"
    },
    "recentActivity": {
      "claims": [],
      "users": []
    },
    "monthlyStats": []
  }
}
```

### GET /admin/users
Get users list with pagination and search.

**Permissions Required:** `users.read`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by wallet address or email
- `sort` (string): Sort field (e.g., '-createdAt')

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "6571a1b8c9d2e3f4a5b6c7d8",
        "walletAddress": "0x742d35cc6634c0532925a3b8d23a40b83d8fa16f",
        "email": "user@example.com",
        "totalClaimed": "1000000000000000000",
        "totalClaimable": "5000000000000000000",
        "claimCount": 2,
        "isActive": true,
        "createdAt": "2023-12-01T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "pages": 63
    }
  }
}
```

### POST /admin/merkle-trees
Create a new merkle tree.

**Permissions Required:** `merkle.manage`

**Request Body:**
```json
{
  "name": "Phase 2 Distribution",
  "description": "Second phase token distribution",
  "data": [
    {
      "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
      "amount": "1000000000000000000"
    },
    {
      "walletAddress": "0x8ba1f109551bD432803012645Hac136c22C12345",
      "amount": "2000000000000000000"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merkleTree": {
      "id": "6571a1b8c9d2e3f4a5b6c7d8",
      "name": "Phase 2 Distribution",
      "description": "Second phase token distribution",
      "root": "0x...",
      "totalAmount": "3000000000000000000",
      "totalUsers": 2,
      "isActive": false,
      "createdAt": "2023-12-07T10:30:00.000Z"
    }
  }
}
```

---

## Blockchain Endpoints

### GET /blockchain/network
Get blockchain network information.

**Response:**
```json
{
  "success": true,
  "data": {
    "chainId": "97",
    "name": "bnbt",
    "blockNumber": 12345678,
    "rpcUrl": "https://data-seed-prebsc-1-s1.binance.org:8545/",
    "contractAddress": "0x..."
  }
}
```

### GET /blockchain/balance/:address
Get wallet balance (ETH and token).

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6634c0532925a3b8d23a40b83d8fa16f",
    "ethBalance": "0.5",
    "tokenBalance": "1000000000000000000"
  }
}
```

### GET /blockchain/transaction/:hash
Get transaction status.

**Response:**
```json
{
  "success": true,
  "data": {
    "hash": "0x...",
    "status": "success",
    "blockNumber": 12345678,
    "blockHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "0",
    "gasUsed": "21000",
    "gasPrice": "5",
    "confirmations": 10,
    "exists": true
  }
}
```

---

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Common Error Messages

- `Invalid wallet address format`
- `Invalid signature`
- `Token expired`
- `Rate limit exceeded`
- `Wallet address not eligible for token claim`
- `Must wait 24 hours between claims`
- `Pending claim already exists`
- `No active token distribution available`

## Pagination

All list endpoints support pagination with these query parameters:

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `sort` (string): Sort field with optional `-` prefix for descending order

Pagination response format:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Date Filtering

Some endpoints support date range filtering:

- `startDate` (ISO 8601): Start date for filtering
- `endDate` (ISO 8601): End date for filtering

Example: `?startDate=2023-12-01T00:00:00.000Z&endDate=2023-12-07T23:59:59.999Z`