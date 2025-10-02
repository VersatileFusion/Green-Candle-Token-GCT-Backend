/**
 * Help Article Model for GCT Token Platform
 * Handles help center articles and categories
 */

const mongoose = require('mongoose');

const helpArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'wallet', 'staking', 'claiming', 'trading', 'security', 'technical']
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  views: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  publishedAt: {
    type: Date
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
helpArticleSchema.index({ category: 1, status: 1 });
helpArticleSchema.index({ status: 1, publishedAt: -1 });
helpArticleSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
helpArticleSchema.index({ tags: 1 });

// Virtual for helpful percentage
helpArticleSchema.virtual('helpfulPercentage').get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.helpful / total) * 100);
});

// Methods
helpArticleSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

helpArticleSchema.methods.markHelpful = function() {
  this.helpful += 1;
  return this.save();
};

helpArticleSchema.methods.markNotHelpful = function() {
  this.notHelpful += 1;
  return this.save();
};

helpArticleSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

helpArticleSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Static methods
helpArticleSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ 
    category, 
    status: 'published' 
  })
  .sort({ priority: -1, order: 1, publishedAt: -1 })
  .limit(limit)
  .populate('author', 'name email');
};

helpArticleSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ 
    featured: true, 
    status: 'published' 
  })
  .sort({ priority: -1, publishedAt: -1 })
  .limit(limit)
  .populate('author', 'name email');
};

helpArticleSchema.statics.search = function(query, limit = 20) {
  return this.find({
    $text: { $search: query },
    status: 'published'
  })
  .sort({ score: { $meta: 'textScore' }, priority: -1 })
  .limit(limit)
  .populate('author', 'name email');
};

helpArticleSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ views: -1, helpful: -1 })
    .limit(limit)
    .populate('author', 'name email');
};

module.exports = mongoose.model('HelpArticle', helpArticleSchema);