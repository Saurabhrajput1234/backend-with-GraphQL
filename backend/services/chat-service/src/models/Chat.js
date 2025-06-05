import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat name cannot exceed 100 characters']
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ 'unreadCounts.user': 1 });
chatSchema.index({ lastMessage: 1 });

// Virtual for message count
chatSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chat',
  count: true
});

// Method to get chat details
chatSchema.methods.toJSON = function() {
  const chat = this.toObject();
  delete chat.__v;
  return chat;
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat; 