import { UserInputError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { setupLogger } from 'threads-clone-shared/utils/logger.js';

const logger = setupLogger('chat-resolvers');
const pubsub = new PubSub();

const resolvers = {
  Query: {
    myChats: async (_, { limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const chats = await Chat.find({ participants: user.id })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('participants', 'id username fullName avatar')
          .populate('lastMessage')
          .populate('unreadCounts.user', 'id username');

        return chats;
      } catch (error) {
        logger.error('Error fetching chats:', error);
        throw new Error('Error fetching chats');
      }
    },

    chat: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const chat = await Chat.findOne({
          _id: id,
          participants: user.id
        })
          .populate('participants', 'id username fullName avatar')
          .populate('lastMessage')
          .populate('unreadCounts.user', 'id username');

        if (!chat) throw new UserInputError('Chat not found');
        return chat;
      } catch (error) {
        logger.error('Error fetching chat:', error);
        throw new Error('Error fetching chat');
      }
    },

    messages: async (_, { chatId, limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        // Verify user is part of the chat
        const chat = await Chat.findOne({
          _id: chatId,
          participants: user.id
        });

        if (!chat) throw new UserInputError('Chat not found');

        const messages = await Message.find({ chat: chatId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('sender', 'id username fullName avatar')
          .populate('replyTo')
          .populate('readBy.user', 'id username');

        return messages.reverse();
      } catch (error) {
        logger.error('Error fetching messages:', error);
        throw new Error('Error fetching messages');
      }
    },

    unreadCounts: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const chats = await Chat.find({ participants: user.id })
          .populate('unreadCounts.user', 'id username');

        return chats.map(chat => ({
          chat: chat._id,
          count: chat.unreadCounts.find(uc => uc.user._id.toString() === user.id)?.count || 0
        }));
      } catch (error) {
        logger.error('Error fetching unread counts:', error);
        throw new Error('Error fetching unread counts');
      }
    }
  },

  Mutation: {
    createChat: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const { participantIds, type, name } = input;

        // Add current user to participants
        const allParticipants = [...new Set([...participantIds, user.id])];

        // For direct chats, check if chat already exists
        if (type === 'DIRECT' && allParticipants.length === 2) {
          const existingChat = await Chat.findOne({
            type: 'DIRECT',
            participants: { $all: allParticipants, $size: allParticipants.length }
          });

          if (existingChat) {
            return existingChat;
          }
        }

        const chat = await Chat.create({
          participants: allParticipants,
          type,
          name: type === 'DIRECT' ? null : name
        });

        await chat.populate('participants', 'id username fullName avatar');

        pubsub.publish('CHAT_CREATED', {
          chatCreated: chat
        });

        return chat;
      } catch (error) {
        logger.error('Error creating chat:', error);
        throw new Error('Error creating chat');
      }
    },

    sendMessage: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const { chatId, content, type, fileUrl, replyToId } = input;

        // Verify user is part of the chat
        const chat = await Chat.findOne({
          _id: chatId,
          participants: user.id
        });

        if (!chat) throw new UserInputError('Chat not found');

        // Create message
        const message = await Message.create({
          chat: chatId,
          sender: user.id,
          content,
          type,
          fileUrl,
          replyTo: replyToId,
          readBy: [{ user: user.id }] // Mark as read by sender
        });

        await message.populate('sender', 'id username fullName avatar');
        if (replyToId) {
          await message.populate('replyTo');
        }

        // Update chat's last message
        chat.lastMessage = message._id;
        await chat.save();

        // Update unread counts for other participants
        for (const participant of chat.participants) {
          if (participant.toString() !== user.id) {
            const unreadCount = chat.unreadCounts.find(uc => 
              uc.user.toString() === participant.toString()
            );
            if (unreadCount) {
              unreadCount.count += 1;
            } else {
              chat.unreadCounts.push({ user: participant, count: 1 });
            }
          }
        }
        await chat.save();

        pubsub.publish('MESSAGE_ADDED', {
          messageAdded: message
        });

        return message;
      } catch (error) {
        logger.error('Error sending message:', error);
        throw new Error('Error sending message');
      }
    },

    updateChat: async (_, { id, input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const chat = await Chat.findOne({
          _id: id,
          participants: user.id
        });

        if (!chat) throw new UserInputError('Chat not found');

        // Only allow name updates for group chats
        if (input.name && chat.type === 'DIRECT') {
          throw new ForbiddenError('Cannot update name of direct chat');
        }

        Object.assign(chat, input);
        await chat.save();

        await chat.populate('participants', 'id username fullName avatar');
        await chat.populate('lastMessage');
        await chat.populate('unreadCounts.user', 'id username');

        pubsub.publish('CHAT_UPDATED', {
          chatUpdated: chat
        });

        return chat;
      } catch (error) {
        logger.error('Error updating chat:', error);
        throw new Error('Error updating chat');
      }
    },

    markMessagesAsRead: async (_, { chatId }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const chat = await Chat.findOne({
          _id: chatId,
          participants: user.id
        });

        if (!chat) throw new UserInputError('Chat not found');

        // Reset unread count for user
        const unreadCount = chat.unreadCounts.find(uc => 
          uc.user.toString() === user.id
        );
        if (unreadCount) {
          unreadCount.count = 0;
          await chat.save();
        }

        // Mark all messages as read
        await Message.updateMany(
          {
            chat: chatId,
            'readBy.user': { $ne: user.id }
          },
          {
            $push: {
              readBy: {
                user: user.id,
                readAt: new Date()
              }
            }
          }
        );

        pubsub.publish('CHAT_UPDATED', {
          chatUpdated: chat
        });

        return true;
      } catch (error) {
        logger.error('Error marking messages as read:', error);
        throw new Error('Error marking messages as read');
      }
    },

    deleteMessage: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const message = await Message.findOne({
          _id: id,
          sender: user.id
        });

        if (!message) throw new UserInputError('Message not found');

        await message.markAsDeleted();

        pubsub.publish('MESSAGE_UPDATED', {
          messageUpdated: message
        });

        return true;
      } catch (error) {
        logger.error('Error deleting message:', error);
        throw new Error('Error deleting message');
      }
    },

    leaveChat: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const chat = await Chat.findOne({
          _id: id,
          participants: user.id,
          type: 'GROUP'
        });

        if (!chat) throw new UserInputError('Chat not found or not a group chat');

        // Remove user from participants
        chat.participants = chat.participants.filter(
          p => p.toString() !== user.id
        );

        // Remove user's unread count
        chat.unreadCounts = chat.unreadCounts.filter(
          uc => uc.user.toString() !== user.id
        );

        await chat.save();

        pubsub.publish('CHAT_UPDATED', {
          chatUpdated: chat
        });

        return true;
      } catch (error) {
        logger.error('Error leaving chat:', error);
        throw new Error('Error leaving chat');
      }
    }
  },

  Subscription: {
    messageAdded: {
      subscribe: (_, { chatId }, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['MESSAGE_ADDED']);
      }
    },
    chatUpdated: {
      subscribe: (_, { chatId }, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['CHAT_UPDATED']);
      }
    },
    messageUpdated: {
      subscribe: (_, { chatId }, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['MESSAGE_UPDATED']);
      }
    }
  }
};

export default resolvers; 