const { body, param, query, validationResult } = require('express-validator');

// Ethereum address validation
const isValidEthereumAddress = (value) => {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
};

// Transaction hash validation
const isValidTransactionHash = (value) => {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
};

// Numeric string validation for large numbers
const isValidNumericString = (value) => {
  return /^\d+$/.test(value) && BigInt(value) >= 0;
};

// Common validation rules
const walletAddressValidation = body('walletAddress')
  .notEmpty()
  .withMessage('Wallet address is required')
  .custom((value) => {
    if (!isValidEthereumAddress(value)) {
      throw new Error('Invalid Ethereum wallet address format');
    }
    return true;
  })
  .toLowerCase();

const signatureValidation = body('signature')
  .notEmpty()
  .withMessage('Signature is required')
  .custom((value) => {
    if (process.env.NODE_ENV === 'test') {
      return true; // Skip validation in test mode
    }
    if (value.length !== 132) {
      throw new Error('Invalid signature length');
    }
    return true;
  });

const messageValidation = body('message')
  .notEmpty()
  .withMessage('Message is required')
  .isLength({ min: 10, max: 500 })
  .withMessage('Message must be between 10 and 500 characters');

const emailValidation = body('email')
  .isEmail()
  .withMessage('Invalid email format')
  .normalizeEmail()
  .toLowerCase();

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const amountValidation = body('amount')
  .notEmpty()
  .withMessage('Amount is required')
  .custom((value) => {
    if (!isValidNumericString(value)) {
      throw new Error('Amount must be a valid numeric string');
    }
    if (BigInt(value) <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    return true;
  });

// Validation rules for different endpoints

// User authentication
const validateWalletAuth = [
  walletAddressValidation,
  signatureValidation,
  messageValidation
];

// Admin authentication
const validateAdminAuth = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('Two-factor code must be 6 digits')
    .isNumeric()
    .withMessage('Two-factor code must be numeric')
];

// Claim validation
const validateClaim = [
  walletAddressValidation,
  signatureValidation,
  messageValidation,
  amountValidation
];

// Admin claim validation
const validateAdminClaim = [
  walletAddressValidation,
  amountValidation,
  body('adminNote')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin note must not exceed 500 characters')
    .trim()
];

// User creation/update validation
const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('totalClaimable')
    .optional()
    .custom((value) => {
      if (value && !isValidNumericString(value)) {
        throw new Error('Total claimable must be a valid numeric string');
      }
      return true;
    }),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
    .trim()
];

// Admin creation validation
const validateAdminCreate = [
  emailValidation,
  passwordValidation,
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'moderator'])
    .withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
];

// Merkle tree validation
const validateMerkleTree = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('data')
    .isArray({ min: 1 })
    .withMessage('Data must be a non-empty array'),
  body('data.*.walletAddress')
    .custom((value) => {
      if (!isValidEthereumAddress(value)) {
        throw new Error('Invalid wallet address in data');
      }
      return true;
    }),
  body('data.*.amount')
    .custom((value) => {
      if (!isValidNumericString(value)) {
        throw new Error('Invalid amount in data');
      }
      return true;
    })
];

// Query parameter validations
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'amount', '-amount', 'status', '-status'])
    .withMessage('Invalid sort parameter')
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format')
    .toDate()
];

// Parameter validations
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`)
];

const validateWalletParam = (paramName = 'address') => [
  param(paramName)
    .optional()
    .custom((value) => {
      if (value && !isValidEthereumAddress(value)) {
        throw new Error('Invalid wallet address format');
      }
      return true;
    })
    .toLowerCase()
];

const validateTransactionHash = (paramName = 'hash') => [
  param(paramName)
    .custom((value) => {
      if (!isValidTransactionHash(value)) {
        throw new Error('Invalid transaction hash format');
      }
      return true;
    })
    .toLowerCase()
];

// Two-factor authentication validation
const validateTwoFactorSetup = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Token must be 6 digits')
    .isNumeric()
    .withMessage('Token must be numeric')
];

// Generic request validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validateWalletAuth,
  validateAdminAuth,
  validateClaim,
  validateAdminClaim,
  validateUserUpdate,
  validateAdminCreate,
  validateMerkleTree,
  validatePagination,
  validateDateRange,
  validateObjectId,
  validateWalletParam,
  validateTransactionHash,
  validateTwoFactorSetup,
  validateRequest,
  
  // Individual validators for reuse
  walletAddressValidation,
  signatureValidation,
  messageValidation,
  emailValidation,
  passwordValidation,
  amountValidation
};