# Shared Utilities

This directory contains shared utilities, middleware, and types used across all services in the Threads Clone application.

## Directory Structure

```
shared/
├── middleware/     # Common middleware (CORS, rate limiting, security)
├── types/         # Common types and GraphQL definitions
├── utils/         # Utility functions (auth, logging, error handling)
├── index.js       # Main entry point exporting all utilities
└── package.json   # Dependencies and metadata
```

## Utilities

### Authentication (`utils/auth.js`)
- JWT token generation and verification
- User authentication middleware
- Token extraction and validation

### Logging (`utils/logger.js`)
- Winston-based logging configuration
- Console and file transports
- Log rotation and formatting

### Error Handling (`utils/errors.js`)
- Custom error classes
- Centralized error handler
- Error logging and formatting

## Middleware

### CORS (`middleware/cors.js`)
- CORS configuration with allowed origins
- Security headers
- Credentials handling

### Rate Limiting (`middleware/rateLimit.js`)
- API rate limiting
- Auth-specific rate limiting
- Password reset rate limiting

### Security (`middleware/security.js`)
- Helmet configuration
- XSS protection
- MongoDB query sanitization
- Security headers

## Types

### Common Types (`types/index.js`)
- User roles and permissions
- Chat and message types
- Notification types
- Post types and privacy levels

### GraphQL Types (`types/graphql.js`)
- Common scalar types
- Interfaces and unions
- Input types
- Directives
- Enums

## Usage

1. Install dependencies:
```bash
npm install
```

2. Import utilities in your service:
```javascript
import {
  // Auth utilities
  generateToken,
  verifyToken,
  authenticate,
  
  // Logging
  setupLogger,
  
  // Error handling
  errorHandler,
  ValidationError,
  
  // Middleware
  corsMiddleware,
  apiLimiter,
  securityMiddleware,
  
  // Types
  UserRole,
  ChatType,
  typeDefs
} from '../../shared/index.js';
```

3. Apply middleware in your service:
```javascript
import express from 'express';
import { corsMiddleware, apiLimiter, securityMiddleware } from '../../shared/index.js';

const app = express();

app.use(corsMiddleware);
app.use('/api', apiLimiter);
app.use(securityMiddleware);
```

## Environment Variables

Required environment variables:
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (default: '7d')
- `FRONTEND_URL`: Frontend application URL
- `LOG_LEVEL`: Logging level (default: 'info')

## Development

1. Install dev dependencies:
```bash
npm install --save-dev
```

2. Run linting:
```bash
npm run lint
```

3. Format code:
```bash
npm run format
``` 