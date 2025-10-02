const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likes: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ isApproved: 1 });

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Pre-save middleware to set editedAt
commentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Instance method to add like
commentSchema.methods.addLike = function() {
  this.likes += 1;
  return this.save();
};

// Instance method to remove like
commentSchema.methods.removeLike = function() {
  if (this.likes > 0) {
    this.likes -= 1;
  }
  return this.save();
};

// Instance method to add reply
commentSchema.methods.addReply = function(replyId) {
  this.replies.push(replyId);
  return this.save();
};

// Instance method to remove reply
commentSchema.methods.removeReply = function(replyId) {
  this.replies = this.replies.filter(id => id.toString() !== replyId.toString());
  return this.save();
};

// Static method to get comments for a post
commentSchema.statics.getCommentsForPost = function(postId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ post: postId, parentComment: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('author', 'name email')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'name email'
      }
    });
};

// Static method to get comment count for a post
commentSchema.statics.getCommentCountForPost = function(postId) {
  return this.countDocuments({ post: postId });
};

// Static method to get recent comments
commentSchema.statics.getRecentComments = function(limit = 10) {
  return this.find({ isApproved: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'name email')
    .populate('post', 'title slug');
};

// Static method to get comments by author
commentSchema.statics.getCommentsByAuthor = function(authorId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ author: authorId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('post', 'title slug');
};

// Static method to get pending comments (admin only)
commentSchema.statics.getPendingComments = function() {
  return this.find({ isApproved: false })
    .sort({ createdAt: -1 })
    .populate('author', 'name email')
    .populate('post', 'title slug');
};

// Static method to approve comment
commentSchema.statics.approveComment = function(commentId) {
  return this.findByIdAndUpdate(commentId, { isApproved: true });
};

// Static method to get comment statistics
commentSchema.statics.getCommentStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        approvedComments: {
          $sum: { $cond: ['$isApproved', 1, 0] }
        },
        pendingComments: {
          $sum: { $cond: ['$isApproved', 0, 1] }
        },
        totalLikes: { $sum: '$likes' }
      }
    }
  ]);
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;