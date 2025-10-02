/**
 * File Upload Middleware for GCT Token Platform
 * Handles file uploads with validation, security, and storage
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../utils/logger');

// Ensure upload directories exist
const uploadDirs = {
  profile: 'uploads/profiles',
  documents: 'uploads/documents',
  merkle: 'uploads/merkle',
  temp: 'uploads/temp'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type validation
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const allowedDocumentTypes = ['application/pdf', 'text/csv', 'application/json'];
const allowedMerkleTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel'];

// File size limits (in bytes)
const fileSizeLimits = {
  profile: 5 * 1024 * 1024, // 5MB
  documents: 10 * 1024 * 1024, // 10MB
  merkle: 50 * 1024 * 1024, // 50MB
  temp: 100 * 1024 * 1024 // 100MB
};

// Generate unique filename
const generateFilename = (originalname) => {
  const ext = path.extname(originalname);
  const name = path.basename(originalname, ext);
  const hash = crypto.randomBytes(16).toString('hex');
  return `${name}_${hash}${ext}`;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.uploadType || 'temp';
    cb(null, uploadDirs[uploadType]);
  },
  filename: (req, file, cb) => {
    const filename = generateFilename(file.originalname);
    req.uploadedFilename = filename;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (allowedTypes, maxSize) => (req, file, cb) => {
  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Check file size
  if (file.size && file.size > maxSize) {
    const error = new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
    error.code = 'FILE_TOO_LARGE';
    return cb(error, false);
  }

  cb(null, true);
};

// Create multer instances for different upload types
const createUploader = (uploadType, allowedTypes, maxSize) => {
  return multer({
    storage: storage,
    fileFilter: fileFilter(allowedTypes, maxSize),
    limits: {
      fileSize: maxSize,
      files: 1
    }
  }).single('file');
};

// Profile image upload
const profileUpload = (req, res, next) => {
  req.uploadType = 'profile';
  const uploader = createUploader('profile', allowedImageTypes, fileSizeLimits.profile);
  
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Please upload a valid image (JPEG, PNG, GIF, WebP)'
        });
      }
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'File upload failed'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    next();
  });
};

// Document upload
const documentUpload = (req, res, next) => {
  req.uploadType = 'documents';
  const uploader = createUploader('documents', allowedDocumentTypes, fileSizeLimits.documents);
  
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Please upload a valid document (PDF, CSV, JSON)'
        });
      }
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'File upload failed'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    next();
  });
};

// Merkle tree data upload
const merkleUpload = (req, res, next) => {
  req.uploadType = 'merkle';
  const uploader = createUploader('merkle', allowedMerkleTypes, fileSizeLimits.merkle);
  
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Please upload a valid data file (CSV, JSON, Excel)'
        });
      }
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 50MB'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'File upload failed'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    next();
  });
};

// Multiple files upload
const multipleUpload = (req, res, next) => {
  req.uploadType = 'temp';
  const uploader = multer({
    storage: storage,
    fileFilter: fileFilter([...allowedImageTypes, ...allowedDocumentTypes], fileSizeLimits.temp),
    limits: {
      fileSize: fileSizeLimits.temp,
      files: 10
    }
  }).array('files', 10);
  
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Please upload valid files'
        });
      }
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 100MB per file'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'File upload failed'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }
    
    next();
  });
};

// Image processing middleware
const processImage = async (req, res, next) => {
  if (!req.file || !allowedImageTypes.includes(req.file.mimetype)) {
    return next();
  }
  
  try {
    const inputPath = req.file.path;
    const outputPath = inputPath.replace(path.extname(inputPath), '_processed.jpg');
    
    // Process image with sharp
    await sharp(inputPath)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    // Replace original with processed version
    fs.unlinkSync(inputPath);
    fs.renameSync(outputPath, inputPath);
    
    req.file.processed = true;
    req.file.size = fs.statSync(inputPath).size;
    
    logger.info('Image processed successfully', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size
    });
    
  } catch (error) {
    logger.error('Image processing failed', {
      error: error.message,
      filename: req.file.filename
    });
    
    return res.status(500).json({
      success: false,
      error: 'Image processing failed'
    });
  }
  
  next();
};

// File cleanup middleware
const cleanupFile = (req, res, next) => {
  if (req.file && req.file.path) {
    res.on('finish', () => {
      // Only cleanup if response indicates error
      if (res.statusCode >= 400) {
        try {
          fs.unlinkSync(req.file.path);
          logger.info('Cleaned up uploaded file due to error', {
            filename: req.file.filename,
            statusCode: res.statusCode
          });
        } catch (error) {
          logger.error('Failed to cleanup file', {
            error: error.message,
            filename: req.file.filename
          });
        }
      }
    });
  }
  next();
};

// File validation middleware
const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file provided'
    });
  }
  
  // Additional validation based on upload type
  const uploadType = req.uploadType;
  
  if (uploadType === 'profile') {
    // Validate image dimensions
    sharp(req.file.path)
      .metadata()
      .then(metadata => {
        if (metadata.width < 100 || metadata.height < 100) {
          return res.status(400).json({
            success: false,
            error: 'Image too small. Minimum dimensions: 100x100 pixels'
          });
        }
        if (metadata.width > 2000 || metadata.height > 2000) {
          return res.status(400).json({
            success: false,
            error: 'Image too large. Maximum dimensions: 2000x2000 pixels'
          });
        }
        next();
      })
      .catch(error => {
        logger.error('Image validation failed', error);
        return res.status(500).json({
          success: false,
          error: 'Image validation failed'
        });
      });
  } else {
    next();
  }
};

// File info extraction
const extractFileInfo = (req, res, next) => {
  if (req.file) {
    req.fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${req.uploadType}/${req.file.filename}`,
      uploadedAt: new Date()
    };
  }
  next();
};

module.exports = {
  profileUpload,
  documentUpload,
  merkleUpload,
  multipleUpload,
  processImage,
  cleanupFile,
  validateFile,
  extractFileInfo,
  uploadDirs,
  fileSizeLimits
};