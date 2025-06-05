import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['FOLLOW', 'LIKE', 'COMMENT', 'MENTION', 'SHARE', 'MESSAGE', 'SYSTEM'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });

// Validate that at least one reference (post, comment, chat, message) exists
notificationSchema.pre('save', function(next) {
  if (!this.post && !this.comment && !this.chat && !this.message) {
    next(new Error('Notification must reference at least one entity (post, comment, chat, or message)'));
  }
  next();
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    await this.save();
  }
  return this;
};

// Method to get notification details
notificationSchema.methods.toJSON = function() {
  const notification = this.toObject();
  delete notification.__v;
  return notification;
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification; 