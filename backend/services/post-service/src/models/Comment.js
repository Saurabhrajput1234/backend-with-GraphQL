import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [{
    type: String,
    trim: true
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ hashtags: 1 });
commentSchema.index({ mentions: 1 });

// Virtual for like count
commentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Method to add like
commentSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    await this.save();
  }
  return this;
};

// Method to remove like
commentSchema.methods.removeLike = async function(userId) {
  this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  await this.save();
  return this;
};

// Method to add reply
commentSchema.methods.addReply = async function(commentId) {
  if (!this.replies.includes(commentId)) {
    this.replies.push(commentId);
    await this.save();
  }
  return this;
};

// Method to remove reply
commentSchema.methods.removeReply = async function(commentId) {
  this.replies = this.replies.filter(id => id.toString() !== commentId.toString());
  await this.save();
  return this;
};

// Method to mark as edited
commentSchema.methods.markAsEdited = async function() {
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save();
  return this;
};

// Method to mark as deleted
commentSchema.methods.markAsDeleted = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This comment was deleted';
  await this.save();
  return this;
};

// Method to get comment details
commentSchema.methods.toJSON = function() {
  const comment = this.toObject();
  delete comment.__v;
  return comment;
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment; 