import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import jwt from 'jsonwebtoken';

import { setupLogger } from 'threads-clone-shared/utils/logger.js';
import { errorHandler } from 'threads-clone-shared/utils/errors.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize logger
const logger = setupLogger('auth-service');

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Create Express app
const app = express();

// CORS options
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req) => req.path === '/health' // Skip logging for health checks
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Load GraphQL schema and resolvers
const typesArray = loadFilesSync(join(__dirname, './schema/**/*.graphql'));
const resolversArray = loadFilesSync(join(__dirname, './resolvers/**/*.js'));

const typeDefs = mergeTypeDefs(typesArray);
const resolvers = mergeResolvers(resolversArray);

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

// Remove duplicate error handler since it's imported from shared utils
// Apply error handling middleware
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 4001;
httpServer.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}/graphql`);
  logger.info(`Health check endpoint: http://localhost:${PORT}/health`);
}); 