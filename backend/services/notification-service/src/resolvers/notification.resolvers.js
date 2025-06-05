import { UserInputError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import Notification from '../models/Notification.js';
import { setupLogger } from 'threads-clone-shared/utils/logger.js';

const logger = setupLogger('notification-resolvers');
const pubsub = new PubSub();

const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';
const NOTIFICATION_UPDATED = 'NOTIFICATION_UPDATED';
const NOTIFICATION_DELETED = 'NOTIFICATION_DELETED';

const resolvers = {
  Query: {
    myNotifications: async (_, { limit, offset, filter }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const query = { recipient: user.id };
        
        if (filter) {
          if (filter.type) query.type = filter.type;
          if (filter.isRead !== undefined) query.isRead = filter.isRead;
          if (filter.fromDate || filter.toDate) {
            query.createdAt = {};
            if (filter.fromDate) query.createdAt.$gte = new Date(filter.fromDate);
            if (filter.toDate) query.createdAt.$lte = new Date(filter.toDate);
          }
        }

        const notifications = await Notification.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('sender', 'id username fullName avatar')
          .populate('post', 'id content')
          .populate('comment', 'id content')
          .populate('chat', 'id name')
          .populate('message', 'id content');

        return notifications;
      } catch (error) {
        logger.error('Error fetching notifications:', error);
        throw new Error('Error fetching notifications');
      }
    },

    unreadCount: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const count = await Notification.countDocuments({
          recipient: user.id,
          isRead: false
        });
        return count;
      } catch (error) {
        logger.error('Error getting unread count:', error);
        throw new Error('Error getting unread count');
      }
    }
  },

  Mutation: {
    markAsRead: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const notification = await Notification.findOne({
          _id: id,
          recipient: user.id
        });

        if (!notification) {
          throw new UserInputError('Notification not found');
        }

        if (!notification.isRead) {
          notification.isRead = true;
          await notification.save();

          pubsub.publish(NOTIFICATION_UPDATED, {
            notificationUpdated: notification
          });
        }

        return notification;
      } catch (error) {
        logger.error('Error marking notification as read:', error);
        throw new Error('Error marking notification as read');
      }
    },

    markAllAsRead: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const result = await Notification.updateMany(
          { recipient: user.id, isRead: false },
          { $set: { isRead: true } }
        );

        // Publish update for each notification
        const notifications = await Notification.find({
          recipient: user.id,
          isRead: true
        });

        notifications.forEach(notification => {
          pubsub.publish(NOTIFICATION_UPDATED, {
            notificationUpdated: notification
          });
        });

        return result.modifiedCount > 0;
      } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        throw new Error('Error marking all notifications as read');
      }
    },

    deleteNotification: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const notification = await Notification.findOneAndDelete({
          _id: id,
          recipient: user.id
        });

        if (!notification) {
          throw new UserInputError('Notification not found');
        }

        pubsub.publish(NOTIFICATION_DELETED, {
          notificationDeleted: id
        });

        return true;
      } catch (error) {
        logger.error('Error deleting notification:', error);
        throw new Error('Error deleting notification');
      }
    },

    deleteAllNotifications: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const notifications = await Notification.find({ recipient: user.id });
        const result = await Notification.deleteMany({ recipient: user.id });

        // Publish deletion for each notification
        notifications.forEach(notification => {
          pubsub.publish(NOTIFICATION_DELETED, {
            notificationDeleted: notification.id
          });
        });

        return result.deletedCount > 0;
      } catch (error) {
        logger.error('Error deleting all notifications:', error);
        throw new Error('Error deleting all notifications');
      }
    }
  },

  Subscription: {
    notificationAdded: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([NOTIFICATION_ADDED]);
      }
    },
    notificationUpdated: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([NOTIFICATION_UPDATED]);
      }
    },
    notificationDeleted: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator([NOTIFICATION_DELETED]);
      }
    }
  }
};

// Helper function to create and publish notifications
export const createNotification = async ({
  recipient,
  sender,
  type,
  post,
  comment,
  chat,
  message
}) => {
  try {
    const notification = new Notification({
      recipient,
      sender,
      type,
      post,
      comment,
      chat,
      message
    });

    await notification.save();

    const populatedNotification = await Notification.findById(notification.id)
      .populate('sender', 'id username fullName avatar')
      .populate('post', 'id content')
      .populate('comment', 'id content')
      .populate('chat', 'id name')
      .populate('message', 'id content');

    pubsub.publish(NOTIFICATION_ADDED, {
      notificationAdded: populatedNotification
    });

    return populatedNotification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw new Error('Error creating notification');
  }
};

export default resolvers; 