import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Post content cannot exceed 1000 characters']
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    width: Number,
    height: Number,
    duration: Number // for videos
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [{
    type: String,
    trim: true
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    name: String
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
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
  parentPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ mentions: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' });
postSchema.index({ parentPost: 1 });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for share count
postSchema.virtual('shareCount').get(function() {
  return this.shares.length;
});

// Method to add like
postSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    await this.save();
  }
  return this;
};

// Method to remove like
postSchema.methods.removeLike = async function(userId) {
  this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  await this.save();
  return this;
};

// Method to add comment
postSchema.methods.addComment = async function(commentId) {
  if (!this.comments.includes(commentId)) {
    this.comments.push(commentId);
    await this.save();
  }
  return this;
};

// Method to remove comment
postSchema.methods.removeComment = async function(commentId) {
  this.comments = this.comments.filter(id => id.toString() !== commentId.toString());
  await this.save();
  return this;
};

// Method to add share
postSchema.methods.addShare = async function(userId) {
  if (!this.shares.some(share => share.user.toString() === userId.toString())) {
    this.shares.push({ user: userId });
    await this.save();
  }
  return this;
};

// Method to mark as edited
postSchema.methods.markAsEdited = async function() {
  this.isEdited = true;
  this.editedAt = new Date();
  await this.save();
  return this;
};

// Method to mark as deleted
postSchema.methods.markAsDeleted = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This post was deleted';
  this.media = [];
  await this.save();
  return this;
};

// Method to get post details
postSchema.methods.toJSON = function() {
  const post = this.toObject();
  delete post.__v;
  return post;
};

const Post = mongoose.model('Post', postSchema);

export default Post; 