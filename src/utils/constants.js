/**
 * Application constants
 */

// User roles and permissions
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  USERS_DELETE: 'users.delete',
  CLAIMS_READ: 'claims.read',
  CLAIMS_WRITE: 'claims.write',
  CLAIMS_APPROVE: 'claims.approve',
  TRANSACTIONS_READ: 'transactions.read',
  MERKLE_MANAGE: 'merkle.manage',
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',
  LOGS_READ: 'logs.read'
};

// Transaction statuses
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Claim types
const CLAIM_TYPES = {
  SELF_CLAIM: 'self_claim',
  ADMIN_CLAIM: 'admin_claim'
};

// Blockchain networks
const NETWORKS = {
  BSC_MAINNET: {
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com'
  },
  BSC_TESTNET: {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    blockExplorer: 'https://testnet.bscscan.com'
  }
};

// Rate limiting configurations
const RATE_LIMITS = {
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  },
  ADMIN_AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 3
  },
  CLAIM: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 10
  },
  USER_CLAIM: {
    WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
    MAX_REQUESTS: 1
  }
};

// Token decimals (assuming 18 decimals like most ERC20 tokens)
const TOKEN_DECIMALS = 18;
const WEI_MULTIPLIER = BigInt(10 ** TOKEN_DECIMALS);

// Security constants
const SECURITY = {
  JWT_EXPIRES_IN: '24h',
  BCRYPT_ROUNDS: 12,
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 2 * 60 * 60 * 1000, // 2 hours
  TWO_FA_WINDOW: 2, // TOTP window
  PASSWORD_MIN_LENGTH: 8
};

// Validation patterns
const VALIDATION_PATTERNS = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TRANSACTION_HASH: /^0x[a-fA-F0-9]{64}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NUMERIC_STRING: /^\d+$/,
  HEX_STRING: /^0x[a-fA-F0-9]+$/
};

// API response messages
const MESSAGES = {
  SUCCESS: {
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    CLAIM_CREATED: 'Claim created successfully',
    CLAIM_UPDATED: 'Claim updated successfully',
    MERKLE_TREE_CREATED: 'Merkle tree created successfully',
    MERKLE_TREE_ACTIVATED: 'Merkle tree activated successfully',
    ADMIN_CREATED: 'Admin created successfully',
    TWO_FA_ENABLED: 'Two-factor authentication enabled successfully',
    TWO_FA_DISABLED: 'Two-factor authentication disabled successfully'
  },
  ERROR: {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_FAILED: 'Validation failed',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_TOKEN: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    CLAIM_NOT_ALLOWED: 'Claim not allowed',
    MERKLE_TREE_NOT_FOUND: 'No active merkle tree found',
    WALLET_NOT_ELIGIBLE: 'Wallet not eligible for claim',
    PENDING_CLAIM_EXISTS: 'Pending claim already exists',
    INVALID_SIGNATURE: 'Invalid wallet signature',
    BLOCKCHAIN_ERROR: 'Blockchain operation failed',
    DATABASE_ERROR: 'Database operation failed',
    INTERNAL_ERROR: 'Internal server error'
  }
};

// Log levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Event types for logging
const EVENT_TYPES = {
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  CLAIM_INITIATED: 'claim_initiated',
  CLAIM_COMPLETED: 'claim_completed',
  CLAIM_FAILED: 'claim_failed',
  MERKLE_TREE_CREATED: 'merkle_tree_created',
  MERKLE_TREE_ACTIVATED: 'merkle_tree_activated',
  SECURITY_VIOLATION: 'security_violation',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  BLOCKCHAIN_TRANSACTION: 'blockchain_transaction'
};

// Default pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// File upload limits
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['text/csv', 'application/json']
};

// Database collection names
const COLLECTIONS = {
  USERS: 'users',
  ADMINS: 'admins',
  CLAIM_TRANSACTIONS: 'claimtransactions',
  MERKLE_TREES: 'merkletrees',
  SESSIONS: 'sessions'
};

// Environment types
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// Time constants (in milliseconds)
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
};

// Regex patterns for common validations
const REGEX = {
  WALLET_ADDRESS: VALIDATION_PATTERNS.ETHEREUM_ADDRESS,
  TX_HASH: VALIDATION_PATTERNS.TRANSACTION_HASH,
  EMAIL: VALIDATION_PATTERNS.EMAIL,
  NUMERIC: VALIDATION_PATTERNS.NUMERIC_STRING,
  HEX: VALIDATION_PATTERNS.HEX_STRING,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

module.exports = {
  USER_ROLES,
  PERMISSIONS,
  TRANSACTION_STATUS,
  CLAIM_TYPES,
  NETWORKS,
  RATE_LIMITS,
  TOKEN_DECIMALS,
  WEI_MULTIPLIER,
  SECURITY,
  VALIDATION_PATTERNS,
  MESSAGES,
  LOG_LEVELS,
  EVENT_TYPES,
  PAGINATION,
  UPLOAD_LIMITS,
  COLLECTIONS,
  ENVIRONMENTS,
  HTTP_STATUS,
  TIME,
  REGEX
};