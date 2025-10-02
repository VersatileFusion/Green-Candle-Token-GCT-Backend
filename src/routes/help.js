/**
 * Help Center Routes for GCT Token Platform
 * Handles help articles, categories, and search
 */

const express = require('express');
const router = express.Router();

const { requireAdmin, logRequest } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const HelpArticle = require('../models/HelpArticle');
const logger = require('../utils/logger');

// Apply middleware to all routes
router.use(logRequest);
router.use(apiLimiter);

// Get all help articles (public)
router.get('/articles', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      featured, 
      sort = 'publishedAt' 
    } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    
    let query = HelpArticle.find(filter);
    
    // Handle search
    if (search) {
      query = HelpArticle.find({
        $text: { $search: search },
        status: 'published'
      });
    }
    
    // Apply sorting
    const sortOptions = {};
    if (search) {
      sortOptions.score = { $meta: 'textScore' };
    }
    sortOptions[sort] = sort === 'publishedAt' ? -1 : -1;
    sortOptions.priority = -1;
    sortOptions.order = 1;
    
    const articles = await query
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('author', 'name email')
      .select('-content'); // Exclude full content for list view
    
    const total = await HelpArticle.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get help articles error', { error: error.message });
    next(error);
  }
});

// Get single help article (public)
router.get('/articles/:id', async (req, res, next) => {
  try {
    const article = await HelpArticle.findById(req.params.id)
      .populate('author', 'name email')
      .populate('lastUpdatedBy', 'name email');
    
    if (!article || article.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'Help article not found'
      });
    }
    
    // Increment view count
    await article.incrementViews();
    
    res.json({
      success: true,
      data: { article }
    });
    
  } catch (error) {
    logger.error('Get help article error', { error: error.message });
    next(error);
  }
});

// Get help categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await HelpArticle.distinct('category', { status: 'published' });
    
    const categoryData = await Promise.all(
      categories.map(async (category) => {
        const count = await HelpArticle.countDocuments({ 
          category, 
          status: 'published' 
        });
        return { name: category, count };
      })
    );
    
    res.json({
      success: true,
      data: { categories: categoryData }
    });
    
  } catch (error) {
    logger.error('Get help categories error', { error: error.message });
    next(error);
  }
});

// Get featured articles
router.get('/featured', async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    
    const articles = await HelpArticle.getFeatured(parseInt(limit));
    
    res.json({
      success: true,
      data: { articles }
    });
    
  } catch (error) {
    logger.error('Get featured articles error', { error: error.message });
    next(error);
  }
});

// Get popular articles
router.get('/popular', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const articles = await HelpArticle.getPopular(parseInt(limit));
    
    res.json({
      success: true,
      data: { articles }
    });
    
  } catch (error) {
    logger.error('Get popular articles error', { error: error.message });
    next(error);
  }
});

// Search help articles
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const articles = await HelpArticle.search(q.trim(), parseInt(limit));
    
    res.json({
      success: true,
      data: { 
        articles,
        query: q.trim(),
        count: articles.length
      }
    });
    
  } catch (error) {
    logger.error('Search help articles error', { error: error.message });
    next(error);
  }
});

// Rate article helpfulness
router.post('/articles/:id/rate', async (req, res, next) => {
  try {
    const { helpful } = req.body;
    
    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Helpful rating must be true or false'
      });
    }
    
    const article = await HelpArticle.findById(req.params.id);
    
    if (!article || article.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'Help article not found'
      });
    }
    
    if (helpful) {
      await article.markHelpful();
    } else {
      await article.markNotHelpful();
    }
    
    res.json({
      success: true,
      data: {
        helpful: article.helpful,
        notHelpful: article.notHelpful,
        helpfulPercentage: article.helpfulPercentage
      }
    });
    
  } catch (error) {
    logger.error('Rate article error', { error: error.message });
    next(error);
  }
});

// Admin routes for managing help articles
router.post('/articles', requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      tags = [],
      priority = 0,
      featured = false,
      order = 0
    } = req.body;
    
    const article = new HelpArticle({
      title,
      content,
      excerpt,
      category,
      tags,
      priority,
      featured,
      order,
      author: req.admin._id
    });
    
    await article.save();
    
    logger.info('Help article created', {
      articleId: article._id,
      title: article.title,
      authorId: req.admin._id
    });
    
    res.json({
      success: true,
      data: { article }
    });
    
  } catch (error) {
    logger.error('Create help article error', { error: error.message });
    next(error);
  }
});

// Update help article (admin)
router.put('/articles/:id', requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      priority,
      featured,
      order,
      status
    } = req.body;
    
    const article = await HelpArticle.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Help article not found'
      });
    }
    
    // Update fields
    if (title) article.title = title;
    if (content) article.content = content;
    if (excerpt !== undefined) article.excerpt = excerpt;
    if (category) article.category = category;
    if (tags) article.tags = tags;
    if (priority !== undefined) article.priority = priority;
    if (featured !== undefined) article.featured = featured;
    if (order !== undefined) article.order = order;
    if (status) article.status = status;
    
    article.lastUpdatedBy = req.admin._id;
    
    await article.save();
    
    logger.info('Help article updated', {
      articleId: article._id,
      title: article.title,
      authorId: req.admin._id
    });
    
    res.json({
      success: true,
      data: { article }
    });
    
  } catch (error) {
    logger.error('Update help article error', { error: error.message });
    next(error);
  }
});

// Delete help article (admin)
router.delete('/articles/:id', requireAdmin, async (req, res, next) => {
  try {
    const article = await HelpArticle.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Help article not found'
      });
    }
    
    await HelpArticle.findByIdAndDelete(req.params.id);
    
    logger.info('Help article deleted', {
      articleId: article._id,
      title: article.title,
      authorId: req.admin._id
    });
    
    res.json({
      success: true,
      message: 'Help article deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete help article error', { error: error.message });
    next(error);
  }
});

// Publish article (admin)
router.post('/articles/:id/publish', requireAdmin, async (req, res, next) => {
  try {
    const article = await HelpArticle.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Help article not found'
      });
    }
    
    await article.publish();
    
    logger.info('Help article published', {
      articleId: article._id,
      title: article.title,
      authorId: req.admin._id
    });
    
    res.json({
      success: true,
      message: 'Article published successfully'
    });
    
  } catch (error) {
    logger.error('Publish article error', { error: error.message });
    next(error);
  }
});

// Get help statistics (admin)
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const totalArticles = await HelpArticle.countDocuments();
    const publishedArticles = await HelpArticle.countDocuments({ status: 'published' });
    const draftArticles = await HelpArticle.countDocuments({ status: 'draft' });
    const archivedArticles = await HelpArticle.countDocuments({ status: 'archived' });
    
    const categoryStats = await HelpArticle.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const popularArticles = await HelpArticle.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(5)
      .select('title views helpful');
    
    res.json({
      success: true,
      data: {
        total: totalArticles,
        published: publishedArticles,
        draft: draftArticles,
        archived: archivedArticles,
        categories: categoryStats,
        popular: popularArticles
      }
    });
    
  } catch (error) {
    logger.error('Get help stats error', { error: error.message });
    next(error);
  }
});

module.exports = router;