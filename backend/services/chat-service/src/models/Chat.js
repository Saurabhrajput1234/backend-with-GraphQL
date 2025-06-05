import mongoose from 'mongoose';

const unreadCountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  count: {
    type: Number,
    default: 0
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }],
  type: {
    type: String,
    enum: ['DIRECT', 'GROUP'],
    required: true
  },
  name: {
    type: String,
    required: function() {
      return this.type === 'GROUP';
    }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [unreadCountSchema],
  messageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, participants: 1 }, { unique: true, sparse: true });

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