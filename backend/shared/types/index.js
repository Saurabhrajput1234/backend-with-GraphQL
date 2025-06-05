// Common types used across services
export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

export const ChatType = {
  DIRECT: 'direct',
  GROUP: 'group'
};

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  AUDIO: 'audio'
};

export const NotificationType = {
  FOLLOW: 'follow',
  LIKE: 'like',
  COMMENT: 'comment',
  MENTION: 'mention',
  MESSAGE: 'message',
  SYSTEM: 'system'
};

export const PostPrivacy = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private'
};

export const PostType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  POLL: 'poll'
};

// Common interfaces
export const PaginationInput = {
  limit: 'Int',
  offset: 'Int',
  cursor: 'String'
};

export const PaginationInfo = {
  hasMore: 'Boolean!',
  nextCursor: 'String',
  total: 'Int!'
};

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc'
};

// Common input types
export const DateRangeInput = {
  startDate: 'String!',
  endDate: 'String!'
};

export const LocationInput = {
  latitude: 'Float!',
  longitude: 'Float!',
  name: 'String'
};

// Common response types
export const SuccessResponse = {
  success: 'Boolean!',
  message: 'String'
};

export const ErrorResponse = {
  error: 'String!',
  message: 'String',
  code: 'String',
  details: '[String!]'
}; 