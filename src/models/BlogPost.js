const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
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
    trim: true
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
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  featuredImage: {
    type: String,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  publishedAt: {
    type: Date,
    default: null
  },
  seoTitle: {
    type: String,
    maxlength: 60
  },
  seoDescription: {
    type: String,
    maxlength: 160
  },
  seoKeywords: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better performance
blogPostSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
blogPostSchema.index({ category: 1 });
blogPostSchema.index({ status: 1 });
blogPostSchema.index({ author: 1 });
blogPostSchema.index({ publishedAt: -1 });
blogPostSchema.index({ views: -1 });
blogPostSchema.index({ tags: 1 });

// Virtual for URL slug
blogPostSchema.virtual('slug').get(function() {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
});

// Pre-save middleware to set publishedAt
blogPostSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Instance method to increment views
blogPostSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to add like
blogPostSchema.methods.addLike = function() {
  this.likes += 1;
  return this.save();
};

// Instance method to remove like
blogPostSchema.methods.removeLike = function() {
  if (this.likes > 0) {
    this.likes -= 1;
  }
  return this.save();
};

// Static method to get popular posts
blogPostSchema.statics.getPopularPosts = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ views: -1 })
    .limit(limit)
    .populate('author', 'name email')
    .select('title excerpt views publishedAt featuredImage');
};

// Static method to get recent posts
blogPostSchema.statics.getRecentPosts = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name email')
    .select('title excerpt publishedAt featuredImage');
};

// Static method to get posts by category
blogPostSchema.statics.getPostsByCategory = function(category, limit = 10) {
  return this.find({ status: 'published', category })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name email')
    .select('title excerpt publishedAt featuredImage');
};

// Static method to search posts
blogPostSchema.statics.searchPosts = function(query, limit = 10) {
  return this.find({
    status: 'published',
    $text: { $search: query }
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .populate('author', 'name email')
    .select('title excerpt publishedAt featuredImage');
};

// Static method to get related posts
blogPostSchema.statics.getRelatedPosts = function(postId, limit = 5) {
  return this.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(postId) } },
    { $unwind: '$tags' },
    {
      $lookup: {
        from: 'blogposts',
        localField: 'tags',
        foreignField: 'tags',
        as: 'related'
      }
    },
    { $unwind: '$related' },
    { $match: { 'related._id': { $ne: mongoose.Types.ObjectId(postId) } } },
    { $replaceRoot: { newRoot: '$related' } },
    { $limit: limit }
  ]);
};

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = BlogPost;