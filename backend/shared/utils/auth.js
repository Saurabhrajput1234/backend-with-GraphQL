import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AuthenticationError } from './errors.js';
import { setupLogger } from './logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const logger = setupLogger('auth');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validate JWT configuration
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not defined in environment variables');
  logger.error('Please ensure JWT_SECRET is set in your .env file');
  process.exit(1);
}

// Generate JWT token
export const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    logger.error('Error generating token:', error);
    throw new AuthenticationError('Error generating token');
  }
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    }
    logger.error('Error verifying token:', error);
    throw new AuthenticationError('Invalid token');
  }
};

// Extract token from request
export const extractToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

// Get authenticated user from request
export const getAuthenticatedUser = async (req, User) => {
  const token = extractToken(req);
  if (!token) {
    return null;
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return user;
  } catch (error) {
    return null;
  }
};

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);

    // Add user to request object
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}; 