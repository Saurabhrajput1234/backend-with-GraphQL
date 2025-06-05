// src/index.js

import express from 'express';
import dotenv from 'dotenv';
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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import jwt from 'jsonwebtoken';
import { existsSync } from 'fs';

import { setupLogger } from 'threads-clone-shared/utils/logger.js';
import { errorHandler } from 'threads-clone-shared/utils/errors.js';

// === Setup === //
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug: Log file paths and existence
const envPath = join(__dirname, '..', '.env');
console.log('\n=== Auth Service Environment Debug ===');
console.log('Current directory:', __dirname);
console.log('Looking for .env at:', envPath);
console.log('.env file exists:', existsSync(envPath));

// Try loading .env file directly
try {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Successfully loaded .env file');
  }
} catch (error) {
  console.error('Exception while loading .env file:', error);
}

// Debug: Log all environment variables
console.log('\nEnvironment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***exists***' : '***missing***');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('LOG_LEVEL:', process.env.LOG_LEVEL);
console.log('=====================================\n');

// Validate required environment variables
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('❌ Required environment variables are missing. Check .env file.');
  console.error('Current .env path:', envPath);
  console.error('File exists:', existsSync(envPath));
  console.error('Current working directory:', process.cwd());
  process.exit(1);
}

// Logger
const logger = setupLogger('auth-service');

// === MongoDB Connection === //
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  logger.info('✅ Connected to MongoDB');
}).catch((err) => {
  logger.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// === Express Setup === //
const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) },
  skip: req => req.path === '/health'
}));

app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// === GraphQL Schema === //
const typeDefs = mergeTypeDefs(loadFilesSync(join(__dirname, './schema/**/*.graphql')));
import authResolvers from './resolvers/auth.resolvers.js';
const resolvers = mergeResolvers([authResolvers]);

const schema = makeExecutableSchema({ typeDefs, resolvers });

// === Apollo Server === //
const server = new ApolloServer({
  schema,
  context: async ({ req }) => {
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = { id: decoded.id };
      } catch (err) {
        logger.warn('Token verification failed:', err.message);
      }
    }
    return { user };
  },
  formatError: (error) => {
    logger.error('GraphQL Error:', {
      message: error.message,
      path: error.path,
      extensions: error.extensions
    });
    return error.extensions?.code === 'INTERNAL_SERVER_ERROR'
      ? { message: 'Internal server error', path: error.path, extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      : error;
  }
});

await server.start();

app.use('/graphql', expressMiddleware(server, {
  cors: corsOptions,
  context: async ({ req }) => {
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = { id: decoded.id };
      } catch (err) {
        logger.warn('Token verification failed:', err.message);
      }
    }
    return { user };
  }
}));

// === HTTP and WebSocket Servers === //
const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql'
});

useServer({
  schema,
  context: async (ctx) => {
    const authHeader = ctx.connectionParams?.authorization || ctx.connectionParams?.Authorization;
    const token = authHeader?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = { id: decoded.id };
      } catch (err) {
        logger.warn('WS token verification failed:', err.message);
      }
    }
    return { user };
  }
}, wsServer);

// === Error Handling === //
app.use(errorHandler);
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// === Start Server === //
const PORT = process.env.PORT || 4001;
httpServer.listen(PORT, () => {
  logger.info(`🚀 Auth service running at http://localhost:${PORT}/graphql`);
  logger.info(`📡 WS Subscriptions at ws://localhost:${PORT}/graphql`);
  logger.info(`💓 Health check at http://localhost:${PORT}/health`);
});
