import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';
import { Notification, NotificationType } from '../../components/common/Notification';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';

// GraphQL queries and mutations
const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      id
      type
      sender {
        id
        username
        fullName
        avatar
      }
      post {
        id
        content
      }
      comment {
        id
        content
      }
      chat {
        id
        name
      }
      message {
        id
        content
      }
      isRead
      createdAt
    }
    unreadCount
  }
`;

const MARK_AS_READ = gql`
  mutation MarkAsRead($id: ID!) {
    markAsRead(id: $id) {
      id
      isRead
    }
  }
`;

const MARK_ALL_AS_READ = gql`
  mutation MarkAllAsRead {
    markAllAsRead
  }
`;

const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id)
  }
`;

const DELETE_ALL_NOTIFICATIONS = gql`
  mutation DeleteAllNotifications {
    deleteAllNotifications
  }
`;

const NOTIFICATION_ADDED = gql`
  subscription OnNotificationAdded {
    notificationAdded {
      id
      type
      sender {
        id
        username
        fullName
        avatar
      }
      post {
        id
        content
      }
      comment {
        id
        content
      }
      chat {
        id
        name
      }
      message {
        id
        content
      }
      isRead
      createdAt
    }
  }
`;

const NOTIFICATION_UPDATED = gql`
  subscription OnNotificationUpdated {
    notificationUpdated {
      id
      isRead
    }
  }
`;

const NOTIFICATION_DELETED = gql`
  subscription OnNotificationDeleted {
    notificationDeleted
  }
`;

const ITEMS_PER_PAGE = 20;

export const NotificationsScreen: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Queries and mutations
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: ITEMS_PER_PAGE, offset: 0 },
    fetchPolicy: 'network-only'
  });

  const [markAsRead] = useMutation(MARK_AS_READ);
  const [markAllAsRead] = useMutation(MARK_ALL_AS_READ);
  const [deleteNotification] = useMutation(DELETE_NOTIFICATION);
  const [deleteAllNotifications] = useMutation(DELETE_ALL_NOTIFICATIONS);

  // Subscriptions
  const { data: newNotification } = useSubscription(NOTIFICATION_ADDED);
  const { data: updatedNotification } = useSubscription(NOTIFICATION_UPDATED);
  const { data: deletedNotification } = useSubscription(NOTIFICATION_DELETED);

  // Handle new notifications
  useEffect(() => {
    if (newNotification?.notificationAdded) {
      refetch();
    }
  }, [newNotification, refetch]);

  // Handle updated notifications
  useEffect(() => {
    if (updatedNotification?.notificationUpdated) {
      refetch();
    }
  }, [updatedNotification, refetch]);

  // Handle deleted notifications
  useEffect(() => {
    if (deletedNotification?.notificationDeleted) {
      refetch();
    }
  }, [deletedNotification, refetch]);

  // Load more notifications
  const handleLoadMore = async () => {
    if (!hasMore || loading) return;

    const newOffset = offset + ITEMS_PER_PAGE;
    const { data: newData } = await fetchMore({
      variables: { offset: newOffset },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        const newNotifications = fetchMoreResult.myNotifications;
        setHasMore(newNotifications.length === ITEMS_PER_PAGE);
        setOffset(newOffset);

        return {
          ...prev,
          myNotifications: [...prev.myNotifications, ...newNotifications]
        };
      }
    });
  };

  // Handle marking a notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead({ variables: { id } });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      refetch();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle deleting a notification
  const handleDelete = async (id: string) => {
    try {
      await deleteNotification({ variables: { id } });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle deleting all notifications
  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) {
      return;
    }

    try {
      await deleteAllNotifications();
      refetch();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Icon name="exclamation-circle" className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Notifications</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  const notifications = data?.myNotifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              onClick={handleMarkAllAsRead}
              className="flex items-center"
            >
              <Icon name="check" className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="danger"
              onClick={handleDeleteAll}
              className="flex items-center"
            >
              <Icon name="trash" className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="bell" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
          <p className="text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification: any) => (
            <Notification
              key={notification.id}
              id={notification.id}
              type={notification.type as NotificationType}
              sender={notification.sender}
              post={notification.post}
              comment={notification.comment}
              chat={notification.chat}
              message={notification.message}
              isRead={notification.isRead}
              createdAt={notification.createdAt}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))}

          {hasMore && (
            <div className="text-center py-4">
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center mx-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Icon name="arrow-down" className="w-4 h-4 mr-2" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 