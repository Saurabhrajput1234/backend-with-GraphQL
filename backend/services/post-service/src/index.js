import express from 'express';
import { ApolloServer } from 'apollo-server-express';
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
import { setupLogger } from 'threads-clone-shared/utils/logger.js';

// Load environment variables
dotenv.config();

const logger = setupLogger('post-service');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Load GraphQL schema and resolvers
const typesArray = loadFilesSync('./src/schema/**/*.graphql');
const resolversArray = loadFilesSync('./src/resolvers/**/*.js');

const typeDefs = mergeTypeDefs(typesArray);
const resolvers = mergeResolvers(resolversArray);

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create Apollo Server
const server = new ApolloServer({
  schema,
  context: async ({ req, connection }) => {
    if (connection) {
      return connection.context;
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return { user: null };

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      return { user };
    } catch (error) {
      logger.error('JWT verification error:', error);
      return { user: null };
    }
  },
  formatError: (error) => {
    logger.error('GraphQL Error:', error);
    return {
      message: error.message,
      path: error.path,
      extensions: {
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
      }
    };
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: process.env.WS_PATH || '/graphql'
});

// Use WebSocket server for GraphQL subscriptions
useServer(
  {
    schema,
    context: async (ctx) => {
      const token = ctx.connectionParams?.authorization?.split(' ')[1];
      if (!token) return { user: null };

      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        return { user };
      } catch (error) {
        logger.error('WebSocket JWT verification error:', error);
        return { user: null };
      }
    }
  },
  wsServer
);

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 4005;

async function startServer() {
  await server.start();
  server.applyMiddleware({ app, cors: false });

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Post Service running at:`);
    logger.info(`   GraphQL: http://localhost:${PORT}${server.graphqlPath}`);
    logger.info(`   WebSocket: ws://localhost:${PORT}${process.env.WS_PATH || '/graphql'}`);
    logger.info(`   Health Check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(err => {
  logger.error('Error starting server:', err);
  process.exit(1);
}); 