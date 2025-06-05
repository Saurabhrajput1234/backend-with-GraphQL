# Threads Clone Backend

This is the backend service for the Threads Clone application, built with a microservices architecture.

## Services

- **API Gateway** (Port 4000): Entry point for all client requests
- **Auth Service** (Port 4001): Handles user authentication and authorization
- **Chat Service** (Port 4002): Manages real-time chat functionality
- **Notification Service** (Port 4003): Handles user notifications
- **Post Service** (Port 4004): Manages posts and interactions
- **Shared Utilities**: Common code used across all services

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Redis (v7 or higher, for chat and notifications)
- RabbitMQ (v3.12 or higher, for service communication)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies for all services:
```bash
npm run install:all
```

3. Create a `.env` file in the root directory with the following variables:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/threads-clone

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Services
AUTH_SERVICE_PORT=4001
CHAT_SERVICE_PORT=4002
NOTIFICATION_SERVICE_PORT=4003
POST_SERVICE_PORT=4004
GATEWAY_PORT=4000

# Frontend
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log

# Email (for auth service)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@threads-clone.com

# File Upload (for post service)
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880 # 5MB

# Redis (for chat and notification services)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ (for service communication)
RABBITMQ_URL=amqp://localhost:5672

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS=3
```

4. Create required directories:
```bash
mkdir -p logs uploads
```

## Running the Services

### Development Mode

To run all services in development mode with hot reloading:
```bash
npm run dev
```

This will start:
- API Gateway on port 4000
- Auth Service on port 4001
- Chat Service on port 4002
- Notification Service on port 4003
- Post Service on port 4004

### Production Mode

To run all services in production mode:
```bash
npm start
```

### Running Individual Services

You can run individual services using these commands:

```bash
# Development mode
npm run dev:gateway
npm run dev:auth
npm run dev:chat
npm run dev:notification
npm run dev:post

# Production mode
npm run start:gateway
npm run start:auth
npm run start:chat
npm run start:notification
npm run start:post
```

## Available Scripts

- `npm run install:all`: Install dependencies for all services
- `npm run dev`: Run all services in development mode
- `npm start`: Run all services in production mode
- `npm run lint`: Run linting for all services
- `npm run format`: Format code using Prettier

## Service Health Checks

You can check if services are running by accessing these endpoints:

- API Gateway: http://localhost:4000/health
- Auth Service: http://localhost:4001/health
- Chat Service: http://localhost:4002/health
- Notification Service: http://localhost:4003/health
- Post Service: http://localhost:4004/health

## Logs

Logs are stored in the `logs` directory. Each service writes to its own log file:
- `logs/gateway.log`
- `logs/auth.log`
- `logs/chat.log`
- `logs/notification.log`
- `logs/post.log`

## Troubleshooting

1. If a service fails to start, check:
   - Required environment variables are set
   - Required ports are available
   - Dependencies are installed
   - Required services (MongoDB, Redis, RabbitMQ) are running

2. For connection issues:
   - Verify MongoDB connection string
   - Check Redis and RabbitMQ connection details
   - Ensure all services are running
   - Check network connectivity

3. For authentication issues:
   - Verify JWT secret is set
   - Check token expiration time
   - Ensure auth service is running

## Contributing

1. Run linting before committing:
```bash
npm run lint
```

2. Format code:
```bash
npm run format
```

3. Follow the existing code style and structure
4. Add tests for new features
5. Update documentation as needed 