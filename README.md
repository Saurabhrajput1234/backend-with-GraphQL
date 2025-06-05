# Threads Clone - Full Stack Social Media App

A full-stack social media application inspired by Threads, built with React Native (Expo), Node.js, Express, GraphQL, and MongoDB.

## Tech Stack

### Frontend
- React Native with Expo
- Apollo Client for GraphQL
- React Navigation
- Socket.IO Client
- Expo Media Library/ImagePicker

### Backend
- Node.js & Express
- Apollo Server
- GraphQL
- MongoDB with Mongoose
- Socket.IO
- JWT Authentication

## Project Structure

```
backend-with-GraphQL/
├── services/                 # Microservices
│   ├── auth-service/        # Authentication & User Management
│   ├── post-service/        # Post Management
│   ├── chat-service/        # Real-time Chat
│   └── notification-service/ # Notifications
├── shared/                  # Shared utilities and types
├── gateway/                 # API Gateway
└── frontend/               # React Native (Expo) App
```

## Features

- User Authentication & Profile Management
- Post Creation, Updates, and Deletion
- Real-time Chat
- Like, Comment, and Share Functionality
- Real-time Notifications
- Image Upload Support
- GraphQL API
- Microservices Architecture

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Expo CLI
- npm or yarn

### Backend Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=4000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/threads-clone

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h

# Services
AUTH_SERVICE_PORT=4001
POST_SERVICE_PORT=4002
CHAT_SERVICE_PORT=4003
NOTIFICATION_SERVICE_PORT=4004
```

## API Documentation

The GraphQL API documentation is available at `http://localhost:4000/graphql` when the server is running.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
