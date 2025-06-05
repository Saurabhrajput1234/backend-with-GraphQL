import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { setupLogger } from 'threads-clone-shared/utils/logger.js';
import { authenticate } from 'threads-clone-shared/utils/auth.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const logger = setupLogger('chat-service');

// Debug logging for environment variables
logger.debug('=== Chat Service Environment Debug ===');
logger.debug(`Current directory: ${__dirname}`);
logger.debug(`Looking for .env at: ${join(__dirname, '..', '.env')}`);
logger.debug(`.env file exists: ${require('fs').existsSync(join(__dirname, '..', '.env'))}`);
logger.debug('\nEnvironment variables loaded:');
logger.debug(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.debug(`PORT: ${process.env.PORT}`);
logger.debug(`MONGODB_URI: ${process.env.MONGODB_URI}`);
logger.debug(`JWT_SECRET: ${process.env.JWT_SECRET ? '***exists***' : 'undefined'}`);
logger.debug(`CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
logger.debug(`LOG_LEVEL: ${process.env.LOG_LEVEL}`);
logger.debug('=====================================\n');

// Load GraphQL schema and resolvers
const typesArray = loadFilesSync(join(__dirname, './schema/**/*.graphql'));
const resolversArray = loadFilesSync(join(__dirname, './resolvers/**/*.js'));

const typeDefs = mergeTypeDefs(typesArray);
const resolvers = mergeResolvers(resolversArray);

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'chat-service' });
});

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await server.stop();
          },
        };
      },
    },
  ],
  context: async ({ req }) => {
    // Add authentication context
    const user = await authenticate(req);
    return { user };
  },
});

// Start server
const PORT = process.env.PORT || 4002;

async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');

    // Start Apollo Server
    await server.start();

    // Apply middleware
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => {
        const user = await authenticate(req);
        return { user };
      },
    }));

    // Set up WebSocket server
    useServer({ schema: server.schema }, wsServer);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Chat Service running at:`);
      logger.info(`   GraphQL: http://localhost:${PORT}/graphql`);
      logger.info(`   WebSocket: ws://localhost:${PORT}/graphql`);
      logger.info(`   Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 