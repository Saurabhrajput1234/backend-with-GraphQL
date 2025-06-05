// Common GraphQL type definitions
export const commonTypes = `
  # Common scalar types
  scalar Date
  scalar Upload
  scalar JSON

  # Common interfaces
  interface Node {
    id: ID!
  }

  interface Timestamped {
    createdAt: Date!
    updatedAt: Date!
  }

  # Common input types
  input PaginationInput {
    limit: Int
    offset: Int
    cursor: String
  }

  input SortInput {
    field: String!
    order: SortOrder!
  }

  enum SortOrder {
    ASC
    DESC
  }

  # Common response types
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type PaginatedResponse {
    items: [Node!]!
    total: Int!
    pageInfo: PageInfo!
  }

  # Common error types
  type ValidationError {
    field: String!
    message: String!
  }

  type Error {
    code: String!
    message: String!
    details: [String!]
  }

  # Common union types
  union MutationResult = Success | Error

  type Success {
    success: Boolean!
    message: String
  }
`;

// Common directives
export const commonDirectives = `
  directive @auth(requires: [UserRole!]!) on OBJECT | FIELD_DEFINITION
  directive @rateLimit(limit: Int!, window: Int!) on FIELD_DEFINITION
  directive @cacheControl(maxAge: Int, scope: CacheControlScope) on OBJECT | FIELD_DEFINITION

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  enum UserRole {
    USER
    ADMIN
    MODERATOR
  }
`;

// Common enums
export const commonEnums = `
  enum MediaType {
    IMAGE
    VIDEO
    AUDIO
    FILE
  }

  enum PrivacyLevel {
    PUBLIC
    FRIENDS
    PRIVATE
  }

  enum NotificationPriority {
    LOW
    MEDIUM
    HIGH
  }
`;

// Common input types
export const commonInputs = `
  input DateRangeInput {
    startDate: Date!
    endDate: Date!
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
    name: String
  }

  input MediaInput {
    type: MediaType!
    url: String!
    thumbnail: String
    metadata: JSON
  }
`;

// Export all GraphQL type definitions
export const typeDefs = `
  ${commonTypes}
  ${commonDirectives}
  ${commonEnums}
  ${commonInputs}
`; 