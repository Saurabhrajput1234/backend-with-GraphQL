import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export type NotificationType = 'FOLLOW' | 'LIKE' | 'COMMENT' | 'MENTION' | 'SHARE' | 'MESSAGE' | 'SYSTEM';

export interface NotificationProps {
  id: string;
  type: NotificationType;
  sender?: {
    id: string;
    username: string;
    fullName: string;
    avatar?: string;
  };
  post?: {
    id: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  chat?: {
    id: string;
    name: string;
  };
  message?: {
    id: string;
    content: string;
  };
  isRead: boolean;
  createdAt: string;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'FOLLOW':
      return 'user-plus';
    case 'LIKE':
      return 'heart';
    case 'COMMENT':
      return 'comment';
    case 'MENTION':
      return 'at';
    case 'SHARE':
      return 'share';
    case 'MESSAGE':
      return 'message';
    case 'SYSTEM':
      return 'bell';
    default:
      return 'bell';
  }
};

const getNotificationText = (notification: NotificationProps) => {
  const { type, sender, post, comment, chat, message } = notification;
  const senderName = sender ? `@${sender.username}` : 'Someone';

  switch (type) {
    case 'FOLLOW':
      return `${senderName} started following you`;
    case 'LIKE':
      return `${senderName} liked your post`;
    case 'COMMENT':
      return `${senderName} commented on your post`;
    case 'MENTION':
      return `${senderName} mentioned you in a ${post ? 'post' : 'comment'}`;
    case 'SHARE':
      return `${senderName} shared your post`;
    case 'MESSAGE':
      return `${senderName} sent you a message`;
    case 'SYSTEM':
      return 'You have a new system notification';
    default:
      return 'You have a new notification';
  }
};

const getNotificationLink = (notification: NotificationProps) => {
  const { type, post, comment, chat, message } = notification;

  switch (type) {
    case 'FOLLOW':
      return `/profile/${notification.sender?.username}`;
    case 'LIKE':
    case 'COMMENT':
    case 'SHARE':
      return post ? `/post/${post.id}` : '';
    case 'MENTION':
      return post ? `/post/${post.id}` : comment ? `/post/${comment.id}` : '';
    case 'MESSAGE':
      return chat ? `/chat/${chat.id}` : '';
    case 'SYSTEM':
      return '/notifications';
    default:
      return '';
  }
};

export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  sender,
  post,
  comment,
  chat,
  message,
  isRead,
  createdAt,
  onMarkAsRead,
  onDelete
}) => {
  const notificationText = getNotificationText({ id, type, sender, post, comment, chat, message, isRead, createdAt });
  const notificationLink = getNotificationLink({ id, type, sender, post, comment, chat, message, isRead, createdAt });
  const icon = getNotificationIcon(type);

  const handleClick = () => {
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <Link
      to={notificationLink}
      className={`flex items-start p-4 hover:bg-gray-50 transition-colors ${
        !isRead ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mr-3">
        {sender ? (
          <Avatar
            src={sender.avatar}
            alt={sender.username}
            size="md"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <Icon name={icon} className="w-5 h-5 text-gray-500" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          {notificationText}
        </p>

        {(post || comment || message) && (
          <p className="mt-1 text-sm text-gray-500 truncate">
            {post?.content || comment?.content || message?.content}
          </p>
        )}

        <p className="mt-1 text-xs text-gray-400">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="flex-shrink-0 ml-4">
        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="ml-2 text-gray-400 hover:text-gray-500"
            title="Delete notification"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        )}
      </div>
    </Link>
  );
}; 