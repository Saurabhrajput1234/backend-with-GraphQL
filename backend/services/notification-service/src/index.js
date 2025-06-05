import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupLogger } from 'threads-clone-shared/utils/logger.js';
import { errorHandler } from 'threads-clone-shared/utils/errors.js';
import { existsSync } from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug: Log file paths and existence
const envPath = join(__dirname, '..', '.env');
console.log('\n=== Notification Service Environment Debug ===');
console.log('Current directory:', __dirname);
console.log('Looking for .env at:', envPath);
console.log('.env file exists:', existsSync(envPath));

// Load environment variables
dotenv.config({ path: envPath });

// Debug: Log all environment variables
console.log('\nEnvironment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***exists***' : '***missing***');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('LOG_LEVEL:', process.env.LOG_LEVEL);
console.log('=====================================\n');

// Validate required environment variables
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('❌ Required environment variables are missing. Check .env file.');
  process.exit(1);
}

// Setup logger
const logger = setupLogger('notification-service');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
};
app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Load GraphQL schema and resolvers
const typesArray = loadFilesSync(join(__dirname, './schema/**/*.graphql'));
import notificationResolvers from './resolvers/notification.resolvers.js';

const typeDefs = mergeTypeDefs(typesArray);
const resolvers = mergeResolvers([notificationResolvers]);

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create Apollo Server
const server = new ApolloServer({
  schema,
  context: async ({ req }) => {
    try {
      // Get token from header
      const token = req.headers.authorization?.split(' ')[1];
      
      // Verify token and get user
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = { id: decoded.id };
        } catch (error) {
          logger.warn('Token verification failed:', error.message);
        }
      }

      return { user };
    } catch (error) {
      logger.error('Context creation error:', error);
      return { user: null };
    }
  },
  formatError: (error) => {
    // Log the error
    logger.error('GraphQL Error:', {
      message: error.message,
      path: error.path,
      extensions: error.extensions
    });

    // Don't expose internal errors to clients
    if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      return {
        message: 'Internal server error',
        path: error.path,
        extensions: { code: 'INTERNAL_SERVER_ERROR' }
      };
    }

    return error;
  }
});

// Start Apollo Server
await server.start();

// Apply Apollo middleware
app.use('/graphql', expressMiddleware(server, {
  cors: corsOptions,
  context: async ({ req }) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = { id: decoded.id };
        } catch (error) {
          logger.warn('Token verification failed:', error.message);
        }
      }
      return { user };
    } catch (error) {
      logger.error('Context creation error:', error);
      return { user: null };
    }
  }
}));

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql'
});

// Use WebSocket server for GraphQL subscriptions
useServer({ 
  schema,
  context: async (ctx) => {
    try {
      // Handle both lowercase and uppercase Authorization header
      const authHeader = ctx.connectionParams?.authorization || ctx.connectionParams?.Authorization;
      const token = authHeader?.split(' ')[1];
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = { id: decoded.id };
        } catch (error) {
          logger.warn('WebSocket token verification failed:', error.message);
        }
      }
      return { user };
    } catch (error) {
      logger.error('WebSocket context creation error:', error);
      return { user: null };
    }
  }
}, wsServer);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4004;
httpServer.listen(PORT, () => {
  logger.info(`🚀 Notification Service running at:`);
  logger.info(`   GraphQL: http://localhost:${PORT}/graphql`);
  logger.info(`   WebSocket: ws://localhost:${PORT}/graphql`);
  logger.info(`   Health Check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit the process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}); 