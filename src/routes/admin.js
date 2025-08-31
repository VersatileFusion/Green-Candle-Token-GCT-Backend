const express = require('express');
const router = express.Router();

const { requireAdmin, requirePermission, logRequest } = require('../middleware/auth');
const { 
  validateAdminCreate, 
  validateMerkleTree, 
  validatePagination, 
  validateDateRange,
  validateUserUpdate,
  validateObjectId
} = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ClaimTransaction = require('../models/ClaimTransaction');
const MerkleTreeModel = require('../models/MerkleTree');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);
router.use(requireAdmin);

// Dashboard statistics
router.get('/dashboard', requirePermission('claims.read'), async (req, res, next) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers24h = await User.countDocuments({ createdAt: { $gte: last24h } });
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: last7d } });
    
    // Claim statistics
    const totalClaims = await ClaimTransaction.countDocuments();
    const pendingClaims = await ClaimTransaction.countDocuments({ status: 'pending' });
    const completedClaims = await ClaimTransaction.countDocuments({ status: 'completed' });
    const failedClaims = await ClaimTransaction.countDocuments({ status: 'failed' });
    
    const claims24h = await ClaimTransaction.countDocuments({ createdAt: { $gte: last24h } });
    const claims7d = await ClaimTransaction.countDocuments({ createdAt: { $gte: last7d } });
    
    // Amount statistics
    const totalClaimedResult = await ClaimTransaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
    ]);
    const totalClaimed = totalClaimedResult[0]?.total || 0;
    
    // Active merkle tree info
    const activeMerkleTree = await MerkleTreeModel.getActiveTree();
    
    // Recent activity
    const recentClaims = await ClaimTransaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'walletAddress')
      .populate('adminId', 'name email');
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('walletAddress createdAt lastLogin');
    
    // Monthly statistics
    const monthlyStats = await ClaimTransaction.aggregate([
      { $match: { createdAt: { $gte: last30d } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: { $toDouble: '$amount' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new24h: newUsers24h,
          active: activeUsers
        },
        claims: {
          total: totalClaims,
          pending: pendingClaims,
          completed: completedClaims,
          failed: failedClaims,
          claims24h,
          claims7d
        },
        amounts: {
          totalClaimed: totalClaimed.toString()
        },
        merkleTree: activeMerkleTree ? {
          name: activeMerkleTree.name,
          totalUsers: activeMerkleTree.totalUsers,
          totalAmount: activeMerkleTree.totalAmount,
          createdAt: activeMerkleTree.createdAt
        } : null,
        recentActivity: {
          claims: recentClaims,
          users: recentUsers
        },
        monthlyStats
      }
    });
    
  } catch (error) {
    logger.error('Admin dashboard error', {
      error: error.message,
      adminId: req.admin._id
    });
    next(error);
  }
});

// User management
router.get('/users', requirePermission('users.read'), validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build search filter
    const filter = {};
    if (search) {
      filter.$or = [
        { walletAddress: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .select('-__v');
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get users error', {
      error: error.message,
      adminId: req.admin._id
    });
    next(error);
  }
});

// Get specific user
router.get('/users/:id', requirePermission('users.read'), validateObjectId('id'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get user's claims
    const claims = await ClaimTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('adminId', 'name email');
    
    res.json({
      success: true,
      data: {
        user,
        recentClaims: claims
      }
    });
    
  } catch (error) {
    logger.error('Get user error', {
      error: error.message,
      adminId: req.admin._id,
      userId: req.params.id
    });
    next(error);
  }
});

// Update user
router.patch('/users/:id', requirePermission('users.write'), validateObjectId('id'), validateUserUpdate, async (req, res, next) => {
  try {
    const { email, totalClaimable, notes, isActive } = req.body;
    const admin = req.admin;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Build update object
    const updates = {};
    if (email !== undefined) updates.email = email;
    if (totalClaimable !== undefined) updates.totalClaimable = totalClaimable;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = isActive;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    logger.admin('User updated by admin', {
      adminId: admin._id,
      adminEmail: admin.email,
      userId: user._id,
      walletAddress: user.walletAddress,
      updates: Object.keys(updates),
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: { user: updatedUser }
    });
    
  } catch (error) {
    logger.error('Update user error', {
      error: error.message,
      adminId: req.admin._id,
      userId: req.params.id
    });
    next(error);
  }
});

// Delete user
router.delete('/users/:id', requirePermission('users.delete'), validateObjectId('id'), async (req, res, next) => {
  try {
    const admin = req.admin;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user has pending claims
    const pendingClaims = await ClaimTransaction.countDocuments({
      user: user._id,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (pendingClaims > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete user with pending claims'
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    logger.admin('User deleted by admin', {
      adminId: admin._id,
      adminEmail: admin.email,
      deletedUserId: user._id,
      walletAddress: user.walletAddress,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete user error', {
      error: error.message,
      adminId: req.admin._id,
      userId: req.params.id
    });
    next(error);
  }
});

// Get all claims
router.get('/claims', requirePermission('claims.read'), validatePagination, validateDateRange, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, startDate, endDate, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }
    
    const claims = await ClaimTransaction.find(filter)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .populate('user', 'walletAddress email')
      .populate('adminId', 'name email');
    
    const total = await ClaimTransaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        claims,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get claims error', {
      error: error.message,
      adminId: req.admin._id
    });
    next(error);
  }
});

// Merkle tree management
router.get('/merkle-trees', requirePermission('merkle.manage'), validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const trees = await MerkleTreeModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('adminId', 'name email')
      .select('-leaves'); // Exclude leaves data for list view
    
    const total = await MerkleTreeModel.countDocuments();
    
    res.json({
      success: true,
      data: {
        trees,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get merkle trees error', {
      error: error.message,
      adminId: req.admin._id
    });
    next(error);
  }
});

// Create merkle tree
router.post('/merkle-trees', requirePermission('merkle.manage'), validateMerkleTree, async (req, res, next) => {
  try {
    const { name, description, data } = req.body;
    const admin = req.admin;
    
    // Check if name already exists
    const existingTree = await MerkleTreeModel.findOne({ name });
    if (existingTree) {
      return res.status(400).json({
        success: false,
        error: 'Merkle tree with this name already exists'
      });
    }
    
    // Generate merkle tree data
    const treeData = await MerkleTreeModel.createFromData(data, admin._id);
    
    // Create merkle tree document
    const merkleTree = new MerkleTreeModel({
      name,
      description,
      root: treeData.root,
      totalAmount: treeData.totalAmount,
      totalUsers: treeData.totalUsers,
      leaves: treeData.leaves,
      adminId: admin._id
    });
    
    await merkleTree.save();
    
    logger.admin('Merkle tree created', {
      adminId: admin._id,
      adminEmail: admin.email,
      merkleTreeId: merkleTree._id,
      name,
      totalUsers: treeData.totalUsers,
      totalAmount: treeData.totalAmount,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        merkleTree: {
          id: merkleTree._id,
          name: merkleTree.name,
          description: merkleTree.description,
          root: merkleTree.root,
          totalAmount: merkleTree.totalAmount,
          totalUsers: merkleTree.totalUsers,
          isActive: merkleTree.isActive,
          createdAt: merkleTree.createdAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Create merkle tree error', {
      error: error.message,
      adminId: req.admin._id
    });
    next(error);
  }
});

// Activate merkle tree
router.patch('/merkle-trees/:id/activate', requirePermission('merkle.manage'), validateObjectId('id'), async (req, res, next) => {
  try {
    const admin = req.admin;
    
    const merkleTree = await MerkleTreeModel.findById(req.params.id);
    
    if (!merkleTree) {
      return res.status(404).json({
        success: false,
        error: 'Merkle tree not found'
      });
    }
    
    // Validate tree integrity before activation
    const validation = merkleTree.validateIntegrity();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Cannot activate tree: ${validation.error}`
      });
    }
    
    await merkleTree.activate();
    
    logger.admin('Merkle tree activated', {
      adminId: admin._id,
      adminEmail: admin.email,
      merkleTreeId: merkleTree._id,
      name: merkleTree.name,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Merkle tree activated successfully'
    });
    
  } catch (error) {
    logger.error('Activate merkle tree error', {
      error: error.message,
      adminId: req.admin._id,
      merkleTreeId: req.params.id
    });
    next(error);
  }
});

// Create admin
router.post('/admins', requirePermission('users.write'), validateAdminCreate, async (req, res, next) => {
  try {
    const { email, password, name, role = 'admin', permissions = [] } = req.body;
    const currentAdmin = req.admin;
    
    // Only super_admin can create other admins
    if (currentAdmin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super administrators can create admin accounts'
      });
    }
    
    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Email address is already in use'
      });
    }
    
    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password,
      name,
      role,
      permissions
    });
    
    await newAdmin.save();
    
    logger.admin('New admin created', {
      createdBy: currentAdmin._id,
      createdByEmail: currentAdmin.email,
      newAdminId: newAdmin._id,
      newAdminEmail: newAdmin.email,
      role,
      ip: req.ip
    });
    
    res.json({
      success: true,
      data: {
        admin: {
          id: newAdmin._id,
          email: newAdmin.email,
          name: newAdmin.name,
          role: newAdmin.role,
          permissions: newAdmin.permissions,
          isActive: newAdmin.isActive,
          createdAt: newAdmin.createdAt
        }
      }
    });
    
  } catch (error) {
    logger.error('Create admin error', {
      error: error.message,
      adminId: req.admin._id
    });
    next(error);
  }
});

module.exports = router;