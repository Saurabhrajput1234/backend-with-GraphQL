import mongoose from 'mongoose';

const readReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  readAt: {
    type: String,
    required: true
  }
});

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['TEXT', 'IMAGE', 'FILE'],
    default: 'TEXT'
  },
  fileUrl: {
    type: String,
    trim: true
  },
  readBy: [readReceiptSchema],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ replyTo: 1 });

// Method to mark message as read
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.some(read => read.userId.toString() === userId.toString())) {
    this.readBy.push({
      userId: userId,
      readAt: new Date().toISOString()
    });
    await this.save();
  }
  return this;
};

// Method to mark message as deleted
messageSchema.methods.markAsDeleted = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  await this.save();
  return this;
};

// Method to get message details
messageSchema.methods.toJSON = function() {
  const message = this.toObject();
  delete message.__v;
  return message;
};

const Message = mongoose.model('Message', messageSchema);

export default Message; 