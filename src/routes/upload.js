/**
 * File Upload Routes for GCT Token Platform
 * Handles file uploads for profiles, documents, and merkle data
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { 
  profileUpload, 
  documentUpload, 
  merkleUpload, 
  multipleUpload,
  processImage,
  cleanupFile,
  validateFile,
  extractFileInfo
} = require('../middleware/upload');
const { requireAdmin, authenticateToken, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Serve uploaded files
router.get('/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.csv': 'text/csv',
      '.json': 'application/json'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    logger.error('File serve error', {
      error: error.message,
      filename: req.params.filename
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to serve file'
    });
  }
});

// Upload profile image
router.post('/profile', authenticateToken, profileUpload, processImage, validateFile, extractFileInfo, (req, res) => {
  try {
    logger.info('Profile image uploaded', {
      userId: req.user.id,
      filename: req.fileInfo.filename,
      size: req.fileInfo.size
    });
    
    res.json({
      success: true,
      data: {
        file: req.fileInfo,
        message: 'Profile image uploaded successfully'
      }
    });
    
  } catch (error) {
    logger.error('Profile upload error', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Profile upload failed'
    });
  }
});

// Upload document
router.post('/document', authenticateToken, documentUpload, validateFile, extractFileInfo, (req, res) => {
  try {
    logger.info('Document uploaded', {
      userId: req.user.id,
      filename: req.fileInfo.filename,
      size: req.fileInfo.size
    });
    
    res.json({
      success: true,
      data: {
        file: req.fileInfo,
        message: 'Document uploaded successfully'
      }
    });
    
  } catch (error) {
    logger.error('Document upload error', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Document upload failed'
    });
  }
});

// Upload merkle tree data (admin only)
router.post('/merkle', requireAdmin, merkleUpload, validateFile, extractFileInfo, (req, res) => {
  try {
    logger.info('Merkle data uploaded', {
      adminId: req.admin.id,
      filename: req.fileInfo.filename,
      size: req.fileInfo.size
    });
    
    // Parse the uploaded file to validate merkle data
    const filePath = req.fileInfo.path;
    const ext = path.extname(filePath).toLowerCase();
    
    let merkleData;
    try {
      if (ext === '.json') {
        merkleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else if (ext === '.csv') {
        // Parse CSV (basic implementation)
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        merkleData = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
      } else {
        throw new Error('Unsupported file format for merkle data');
      }
      
      // Validate merkle data structure
      if (!Array.isArray(merkleData) || merkleData.length === 0) {
        throw new Error('Invalid merkle data format');
      }
      
      const requiredFields = ['walletAddress', 'amount'];
      const isValid = merkleData.every(item => 
        requiredFields.every(field => item[field] !== undefined && item[field] !== '')
      );
      
      if (!isValid) {
        throw new Error('Invalid merkle data: missing required fields (walletAddress, amount)');
      }
      
    } catch (parseError) {
      // Clean up invalid file
      fs.unlinkSync(filePath);
      
      return res.status(400).json({
        success: false,
        error: `Invalid merkle data file: ${parseError.message}`
      });
    }
    
    res.json({
      success: true,
      data: {
        file: req.fileInfo,
        merkleData: {
          totalUsers: merkleData.length,
          totalAmount: merkleData.reduce((sum, item) => sum + BigInt(item.amount || '0'), BigInt(0)).toString(),
          sample: merkleData.slice(0, 5) // First 5 entries as sample
        },
        message: 'Merkle data uploaded and validated successfully'
      }
    });
    
  } catch (error) {
    logger.error('Merkle upload error', {
      error: error.message,
      adminId: req.admin?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Merkle upload failed'
    });
  }
});

// Upload multiple files
router.post('/multiple', authenticateToken, multipleUpload, extractFileInfo, (req, res) => {
  try {
    const files = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/uploads/temp/${file.filename}`,
      uploadedAt: new Date()
    }));
    
    logger.info('Multiple files uploaded', {
      userId: req.user.id,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });
    
    res.json({
      success: true,
      data: {
        files: files,
        count: files.length,
        message: 'Files uploaded successfully'
      }
    });
    
  } catch (error) {
    logger.error('Multiple upload error', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Multiple upload failed'
    });
  }
});

// Delete file
router.delete('/:type/:filename', authenticateToken, (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', type, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check permissions (users can only delete their own files)
    if (type === 'profile' && req.user.id) {
      // Add user-specific file validation here if needed
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    
    logger.info('File deleted', {
      userId: req.user.id,
      type: type,
      filename: filename
    });
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    logger.error('File deletion error', {
      error: error.message,
      userId: req.user?.id,
      filename: req.params.filename
    });
    
    res.status(500).json({
      success: false,
      error: 'File deletion failed'
    });
  }
});

// Get upload statistics (admin only)
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const uploadDirs = ['profiles', 'documents', 'merkle', 'temp'];
    const stats = {};
    
    uploadDirs.forEach(dir => {
      const dirPath = path.join(__dirname, '../../uploads', dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        const totalSize = files.reduce((sum, file) => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          return sum + stats.size;
        }, 0);
        
        stats[dir] = {
          fileCount: files.length,
          totalSize: totalSize,
          averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0
        };
      } else {
        stats[dir] = {
          fileCount: 0,
          totalSize: 0,
          averageSize: 0
        };
      }
    });
    
    res.json({
      success: true,
      data: {
        stats: stats,
        totalFiles: Object.values(stats).reduce((sum, stat) => sum + stat.fileCount, 0),
        totalSize: Object.values(stats).reduce((sum, stat) => sum + stat.totalSize, 0)
      }
    });
    
  } catch (error) {
    logger.error('Upload stats error', {
      error: error.message,
      adminId: req.admin?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get upload statistics'
    });
  }
});

// Cleanup old temporary files (admin only)
router.post('/cleanup', requireAdmin, (req, res) => {
  try {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;
    let cleanedSize = 0;
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        cleanedSize += stats.size;
        fs.unlinkSync(filePath);
        cleanedCount++;
      }
    });
    
    logger.info('Temporary files cleaned up', {
      adminId: req.admin.id,
      cleanedCount: cleanedCount,
      cleanedSize: cleanedSize
    });
    
    res.json({
      success: true,
      data: {
        cleanedCount: cleanedCount,
        cleanedSize: cleanedSize,
        message: `Cleaned up ${cleanedCount} temporary files`
      }
    });
    
  } catch (error) {
    logger.error('Cleanup error', {
      error: error.message,
      adminId: req.admin?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

module.exports = router;