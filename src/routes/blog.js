/**
 * Blog/Community Routes for GCT Token Platform
 * Handles blog posts, comments, and community features
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const { authenticateToken, requireAdmin, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const BlogPost = require('../models/BlogPost');
const Comment = require('../models/Comment');
const logger = require('../utils/logger');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/blog/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Get all blog posts
router.get('/posts', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, status = 'published', search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { status };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await BlogPost.find(filter)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('author', 'name email')
      .select('-content'); // Exclude full content for list view
    
    const total = await BlogPost.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get blog posts error', { error: error.message });
    next(error);
  }
});

// Get single blog post
router.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id)
      .populate('author', 'name email')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email'
        }
      });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    res.json({
      success: true,
      data: { post }
    });
    
  } catch (error) {
    logger.error('Get blog post error', { error: error.message });
    next(error);
  }
});

// Create blog post (admin only)
router.post('/posts', requireAdmin, upload.single('featuredImage'), async (req, res, next) => {
  try {
    const { title, content, excerpt, category, tags, status = 'draft' } = req.body;
    
    const post = new BlogPost({
      title,
      content,
      excerpt,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status,
      author: req.user.id,
      featuredImage: req.file ? req.file.filename : null
    });
    
    await post.save();
    
    logger.info('Blog post created', {
      postId: post._id,
      title: post.title,
      authorId: req.user.id
    });
    
    res.json({
      success: true,
      data: { post }
    });
    
  } catch (error) {
    logger.error('Create blog post error', { error: error.message });
    next(error);
  }
});

// Update blog post (admin only)
router.put('/posts/:id', requireAdmin, upload.single('featuredImage'), async (req, res, next) => {
  try {
    const { title, content, excerpt, category, tags, status } = req.body;
    
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (excerpt) post.excerpt = excerpt;
    if (category) post.category = category;
    if (tags) post.tags = tags.split(',').map(tag => tag.trim());
    if (status) post.status = status;
    if (req.file) post.featuredImage = req.file.filename;
    
    await post.save();
    
    logger.info('Blog post updated', {
      postId: post._id,
      title: post.title,
      authorId: req.user.id
    });
    
    res.json({
      success: true,
      data: { post }
    });
    
  } catch (error) {
    logger.error('Update blog post error', { error: error.message });
    next(error);
  }
});

// Delete blog post (admin only)
router.delete('/posts/:id', requireAdmin, async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }
    
    // Delete associated comments
    await Comment.deleteMany({ post: post._id });
    
    await BlogPost.findByIdAndDelete(req.params.id);
    
    logger.info('Blog post deleted', {
      postId: post._id,
      title: post.title,
      authorId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete blog post error', { error: error.message });
    next(error);
  }
});

// Get comments for a post
router.get('/posts/:id/comments', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('author', 'name email')
      .populate('replies.author', 'name email');
    
    const total = await Comment.countDocuments({ post: req.params.id });
    
    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get comments error', { error: error.message });
    next(error);
  }
});

// Create comment
router.post('/posts/:id/comments', authenticateToken, async (req, res, next) => {
  try {
    const { content, parentComment } = req.body;
    
    const comment = new Comment({
      content,
      post: req.params.id,
      author: req.user.id,
      parentComment: parentComment || null
    });
    
    await comment.save();
    
    // Add comment to post
    await BlogPost.findByIdAndUpdate(req.params.id, {
      $push: { comments: comment._id }
    });
    
    logger.info('Comment created', {
      commentId: comment._id,
      postId: req.params.id,
      authorId: req.user.id
    });
    
    res.json({
      success: true,
      data: { comment }
    });
    
  } catch (error) {
    logger.error('Create comment error', { error: error.message });
    next(error);
  }
});

// Update comment
router.put('/comments/:id', authenticateToken, async (req, res, next) => {
  try {
    const { content } = req.body;
    
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    // Check if user owns the comment
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this comment'
      });
    }
    
    comment.content = content;
    comment.updatedAt = new Date();
    await comment.save();
    
    res.json({
      success: true,
      data: { comment }
    });
    
  } catch (error) {
    logger.error('Update comment error', { error: error.message });
    next(error);
  }
});

// Delete comment
router.delete('/comments/:id', authenticateToken, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    // Check if user owns the comment or is admin
    if (comment.author.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this comment'
      });
    }
    
    // Delete replies
    await Comment.deleteMany({ parentComment: comment._id });
    
    // Remove comment from post
    await BlogPost.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });
    
    await Comment.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete comment error', { error: error.message });
    next(error);
  }
});

// Get categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await BlogPost.distinct('category');
    
    res.json({
      success: true,
      data: { categories }
    });
    
  } catch (error) {
    logger.error('Get categories error', { error: error.message });
    next(error);
  }
});

// Get tags
router.get('/tags', async (req, res, next) => {
  try {
    const tags = await BlogPost.distinct('tags');
    
    res.json({
      success: true,
      data: { tags }
    });
    
  } catch (error) {
    logger.error('Get tags error', { error: error.message });
    next(error);
  }
});

// Get blog statistics (admin only)
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const totalPosts = await BlogPost.countDocuments();
    const publishedPosts = await BlogPost.countDocuments({ status: 'published' });
    const draftPosts = await BlogPost.countDocuments({ status: 'draft' });
    const totalComments = await Comment.countDocuments();
    
    const popularPosts = await BlogPost.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(5)
      .select('title views createdAt');
    
    res.json({
      success: true,
      data: {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalComments,
        popularPosts
      }
    });
    
  } catch (error) {
    logger.error('Get blog stats error', { error: error.message });
    next(error);
  }
});

module.exports = router;