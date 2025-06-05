import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';

import { setupLogger, errorHandler, verifyToken } from 'threads-clone-shared';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize logger
const logger = setupLogger('gateway');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Load GraphQL schema and resolvers
const typesArray = loadFilesSync(join(__dirname, './schema/**/*.graphql'));
const resolversArray = loadFilesSync(join(__dirname, './resolvers/**/*.js'));

const typeDefs = mergeTypeDefs(typesArray);
const resolvers = mergeResolvers(resolversArray);

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Verify token and get user
    let user = null;
    if (token) {
      try {
        user = await verifyToken(token);
      } catch (error) {
        logger.error('Token verification failed:', error);
      }
    }

    return { user };
  }
});

// Start Apollo Server
await server.start();

// Apply Apollo middleware
app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Verify token and get user
    let user = null;
    if (token) {
      try {
        user = await verifyToken(token);
      } catch (error) {
        logger.error('Token verification failed:', error);
      }
    }

    return { user };
  }
}));

// Proxy middleware for microservices
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  posts: process.env.POSTS_SERVICE_URL || 'http://localhost:4002',
  chat: process.env.CHAT_SERVICE_URL || 'http://localhost:4003',
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4004'
};

// Setup proxies for each service
Object.entries(services).forEach(([service, url]) => {
  app.use(
    `/api/${service}`,
    createProxyMiddleware({
      target: url,
      changeOrigin: true,
      pathRewrite: {
        [`^/api/${service}`]: ''
      },
      onError: (err, req, res) => {
        logger.error(`Proxy error for ${service}:`, err);
        res.status(500).json({ error: `Service ${service} unavailable` });
      }
    })
  );
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Gateway service running on port ${PORT}`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
}); 