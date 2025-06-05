import { UserInputError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import { generateToken } from 'threads-clone-shared/utils/auth.js';
import { setupLogger } from 'threads-clone-shared/utils/logger.js';

const logger = setupLogger('auth-resolvers');
const pubsub = new PubSub();

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');
      return User.findById(user.id);
    },

    user: async (_, { id }) => {
      const user = await User.findById(id);
      if (!user) throw new UserInputError('User not found');
      return user;
    },

    userByUsername: async (_, { username }) => {
      const user = await User.findOne({ username });
      if (!user) throw new UserInputError('User not found');
      return user;
    },

    searchUsers: async (_, { query, limit, offset }) => {
      const searchRegex = new RegExp(query, 'i');
      return User.find({
        $or: [
          { username: searchRegex },
          { fullName: searchRegex }
        ]
      })
        .limit(limit)
        .skip(offset)
        .sort({ followers: -1 });
    }
  },

  Mutation: {
    register: async (_, { input }) => {
      const { email, username, password, fullName, bio, avatar } = input;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        throw new UserInputError('User already exists');
      }

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const user = await User.create({
        email,
        username,
        password,
        fullName,
        bio,
        avatar,
        verificationToken
      });

      // Send verification email
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: 'Verify your email',
          html: `Click <a href="${process.env.FRONTEND_URL}/verify-email/${verificationToken}">here</a> to verify your email.`
        });
      } catch (error) {
        logger.error('Error sending verification email:', error);
      }

      // Generate token
      const token = generateToken({ id: user._id });

      return { token, user };
    },

    login: async (_, { input }) => {
      const { email, password } = input;

      // Find user and include password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Update last active
      user.lastActive = new Date();
      await user.save();

      // Generate token
      const token = generateToken({ id: user._id });

      return { token, user };
    },

    updateProfile: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const currentUser = await User.findById(user.id);
      if (!currentUser) throw new UserInputError('User not found');

      // Check if username is being changed and if it's already taken
      if (input.username && input.username !== currentUser.username) {
        const existingUser = await User.findOne({ username: input.username });
        if (existingUser) {
          throw new UserInputError('Username already taken');
        }
      }

      // Check if email is being changed and if it's already taken
      if (input.email && input.email !== currentUser.email) {
        const existingUser = await User.findOne({ email: input.email });
        if (existingUser) {
          throw new UserInputError('Email already taken');
        }
      }

      // Update user
      Object.assign(currentUser, input);
      await currentUser.save();

      // Publish update
      pubsub.publish(`USER_UPDATED_${currentUser._id}`, {
        userUpdated: currentUser
      });

      return currentUser;
    },

    followUser: async (_, { userId }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const currentUser = await User.findById(user.id);
      const userToFollow = await User.findById(userId);

      if (!currentUser || !userToFollow) {
        throw new UserInputError('User not found');
      }

      if (currentUser._id.equals(userToFollow._id)) {
        throw new UserInputError('Cannot follow yourself');
      }

      if (currentUser.following.includes(userId)) {
        throw new UserInputError('Already following this user');
      }

      currentUser.following.push(userId);
      userToFollow.followers.push(currentUser._id);

      await Promise.all([currentUser.save(), userToFollow.save()]);

      // Publish update
      pubsub.publish(`USER_FOLLOWED_${userId}`, {
        userFollowed: userToFollow
      });

      return userToFollow;
    },

    unfollowUser: async (_, { userId }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const currentUser = await User.findById(user.id);
      const userToUnfollow = await User.findById(userId);

      if (!currentUser || !userToUnfollow) {
        throw new UserInputError('User not found');
      }

      if (!currentUser.following.includes(userId)) {
        throw new UserInputError('Not following this user');
      }

      currentUser.following = currentUser.following.filter(
        id => !id.equals(userId)
      );
      userToUnfollow.followers = userToUnfollow.followers.filter(
        id => !id.equals(currentUser._id)
      );

      await Promise.all([currentUser.save(), userToUnfollow.save()]);

      // Publish update
      pubsub.publish(`USER_UNFOLLOWED_${userId}`, {
        userUnfollowed: userToUnfollow
      });

      return userToUnfollow;
    },

    verifyEmail: async (_, { token }) => {
      const user = await User.findOne({ verificationToken: token });
      if (!user) throw new UserInputError('Invalid verification token');

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      return true;
    },

    forgotPassword: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) throw new UserInputError('User not found');

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Send reset email
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: 'Reset your password',
          html: `Click <a href="${process.env.FRONTEND_URL}/reset-password/${resetToken}">here</a> to reset your password.`
        });
      } catch (error) {
        logger.error('Error sending reset email:', error);
        throw new Error('Error sending reset email');
      }

      return true;
    },

    resetPassword: async (_, { token, password }) => {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) throw new UserInputError('Invalid or expired reset token');

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return true;
    },

    deleteAccount: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      const currentUser = await User.findById(user.id);
      if (!currentUser) throw new UserInputError('User not found');

      // Remove user from followers/following lists
      await User.updateMany(
        { followers: user.id },
        { $pull: { followers: user.id } }
      );
      await User.updateMany(
        { following: user.id },
        { $pull: { following: user.id } }
      );

      // Delete user
      await currentUser.deleteOne();

      return true;
    }
  },

  Subscription: {
    userUpdated: {
      subscribe: async (_, { userId }, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        // Only allow users to subscribe to their own updates or if they follow the user
        if (!user.id.equals(userId)) {
          const currentUser = await User.findById(user.id);
          if (!currentUser.following.includes(userId)) {
            throw new ForbiddenError('Not authorized to subscribe to this user');
          }
        }
        return pubsub.asyncIterator([`USER_UPDATED_${userId}`]);
      }
    },
    userFollowed: {
      subscribe: async (_, { userId }, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        // Only allow users to subscribe to their own updates or if they follow the user
        if (!user.id.equals(userId)) {
          const currentUser = await User.findById(user.id);
          if (!currentUser.following.includes(userId)) {
            throw new ForbiddenError('Not authorized to subscribe to this user');
          }
        }
        return pubsub.asyncIterator([`USER_FOLLOWED_${userId}`]);
      }
    },
    userUnfollowed: {
      subscribe: async (_, { userId }, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        // Only allow users to subscribe to their own updates or if they follow the user
        if (!user.id.equals(userId)) {
          const currentUser = await User.findById(user.id);
          if (!currentUser.following.includes(userId)) {
            throw new ForbiddenError('Not authorized to subscribe to this user');
          }
        }
        return pubsub.asyncIterator([`USER_UNFOLLOWED_${userId}`]);
      }
    }
  }
};

export default resolvers; 