import { UserInputError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { setupLogger } from 'threads-clone-shared/utils/logger.js';

const logger = setupLogger('post-resolvers');
const pubsub = new PubSub();

const resolvers = {
  Query: {
    posts: async (_, { limit, offset, filter }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const query = { isDeleted: false };
        if (filter) {
          if (filter.author) query.author = filter.author;
          if (filter.hashtags) query.hashtags = { $in: filter.hashtags };
          if (filter.mentions) query.mentions = { $in: filter.mentions };
          if (filter.isPrivate !== undefined) query.isPrivate = filter.isPrivate;
          if (filter.parentPost) query.parentPost = filter.parentPost;
          if (filter.location) {
            query['location.coordinates'] = {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: filter.location.coordinates
                }
              }
            };
          }
        }

        const posts = await Post.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('shares.user', 'id username')
          .populate('parentPost');

        return posts;
      } catch (error) {
        logger.error('Error fetching posts:', error);
        throw new Error('Error fetching posts');
      }
    },

    post: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const post = await Post.findOne({
          _id: id,
          isDeleted: false
        })
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('shares.user', 'id username')
          .populate('parentPost');

        if (!post) throw new UserInputError('Post not found');
        return post;
      } catch (error) {
        logger.error('Error fetching post:', error);
        throw new Error('Error fetching post');
      }
    },

    userPosts: async (_, { userId, limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const query = {
          author: userId,
          isDeleted: false,
          $or: [
            { isPrivate: false },
            { author: user.id }
          ]
        };

        const posts = await Post.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('shares.user', 'id username')
          .populate('parentPost');

        return posts;
      } catch (error) {
        logger.error('Error fetching user posts:', error);
        throw new Error('Error fetching user posts');
      }
    },

    feedPosts: async (_, { limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        // Get posts from followed users and user's own posts
        const query = {
          isDeleted: false,
          $or: [
            { author: user.id },
            { author: { $in: user.following } }
          ]
        };

        const posts = await Post.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('shares.user', 'id username')
          .populate('parentPost');

        return posts;
      } catch (error) {
        logger.error('Error fetching feed posts:', error);
        throw new Error('Error fetching feed posts');
      }
    },

    comments: async (_, { postId, limit, offset, filter }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const query = {
          post: postId,
          isDeleted: false,
          parentComment: null // Only get top-level comments
        };

        if (filter) {
          if (filter.author) query.author = filter.author;
          if (filter.hashtags) query.hashtags = { $in: filter.hashtags };
          if (filter.mentions) query.mentions = { $in: filter.mentions };
        }

        const comments = await Comment.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username');

        return comments;
      } catch (error) {
        logger.error('Error fetching comments:', error);
        throw new Error('Error fetching comments');
      }
    },

    comment: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const comment = await Comment.findOne({
          _id: id,
          isDeleted: false
        })
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('parentComment');

        if (!comment) throw new UserInputError('Comment not found');
        return comment;
      } catch (error) {
        logger.error('Error fetching comment:', error);
        throw new Error('Error fetching comment');
      }
    },

    commentReplies: async (_, { commentId, limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const replies = await Comment.find({
          parentComment: commentId,
          isDeleted: false
        })
          .sort({ createdAt: 1 })
          .limit(limit)
          .skip(offset)
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('parentComment');

        return replies;
      } catch (error) {
        logger.error('Error fetching comment replies:', error);
        throw new Error('Error fetching comment replies');
      }
    },

    searchPosts: async (_, { query, limit, offset }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const posts = await Post.find({
          $and: [
            { isDeleted: false },
            {
              $or: [
                { content: { $regex: query, $options: 'i' } },
                { hashtags: { $in: [new RegExp(query, 'i')] } }
              ]
            }
          ]
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .populate('author', 'id username fullName avatar')
          .populate('mentions', 'id username fullName avatar')
          .populate('likes', 'id username')
          .populate('shares.user', 'id username')
          .populate('parentPost');

        return posts;
      } catch (error) {
        logger.error('Error searching posts:', error);
        throw new Error('Error searching posts');
      }
    },

    trendingHashtags: async (_, { limit }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const hashtags = await Post.aggregate([
          { $match: { isDeleted: false } },
          { $unwind: '$hashtags' },
          { $group: { _id: '$hashtags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $project: { _id: 0, hashtag: '$_id', count: 1 } }
        ]);

        return hashtags.map(h => h.hashtag);
      } catch (error) {
        logger.error('Error fetching trending hashtags:', error);
        throw new Error('Error fetching trending hashtags');
      }
    }
  },

  Mutation: {
    createPost: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const {
          content,
          media,
          mentions,
          hashtags,
          location,
          isPrivate,
          parentPostId
        } = input;

        const post = await Post.create({
          author: user.id,
          content,
          media,
          mentions,
          hashtags,
          location: location ? {
            type: 'Point',
            coordinates: location.coordinates,
            name: location.name
          } : undefined,
          isPrivate: isPrivate || false,
          parentPost: parentPostId
        });

        await post.populate('author', 'id username fullName avatar');
        if (mentions?.length) {
          await post.populate('mentions', 'id username fullName avatar');
        }
        if (parentPostId) {
          await post.populate('parentPost');
        }

        pubsub.publish('POST_ADDED', {
          postAdded: post
        });

        return post;
      } catch (error) {
        logger.error('Error creating post:', error);
        throw new Error('Error creating post');
      }
    },

    updatePost: async (_, { id, input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const post = await Post.findOne({
          _id: id,
          author: user.id,
          isDeleted: false
        });

        if (!post) throw new UserInputError('Post not found');

        const {
          content,
          media,
          mentions,
          hashtags,
          location,
          isPrivate
        } = input;

        Object.assign(post, {
          content: content || post.content,
          media: media || post.media,
          mentions: mentions || post.mentions,
          hashtags: hashtags || post.hashtags,
          location: location ? {
            type: 'Point',
            coordinates: location.coordinates,
            name: location.name
          } : post.location,
          isPrivate: isPrivate !== undefined ? isPrivate : post.isPrivate
        });

        await post.markAsEdited();
        await post.save();

        await post.populate('author', 'id username fullName avatar');
        if (post.mentions?.length) {
          await post.populate('mentions', 'id username fullName avatar');
        }
        if (post.parentPost) {
          await post.populate('parentPost');
        }

        pubsub.publish('POST_UPDATED', {
          postUpdated: post
        });

        return post;
      } catch (error) {
        logger.error('Error updating post:', error);
        throw new Error('Error updating post');
      }
    },

    deletePost: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const post = await Post.findOne({
          _id: id,
          author: user.id,
          isDeleted: false
        });

        if (!post) throw new UserInputError('Post not found');

        await post.markAsDeleted();

        pubsub.publish('POST_DELETED', {
          postDeleted: post._id
        });

        return true;
      } catch (error) {
        logger.error('Error deleting post:', error);
        throw new Error('Error deleting post');
      }
    },

    togglePostLike: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const post = await Post.findOne({
          _id: id,
          isDeleted: false
        });

        if (!post) throw new UserInputError('Post not found');

        const hasLiked = post.likes.some(like => like.toString() === user.id);
        if (hasLiked) {
          await post.removeLike(user.id);
        } else {
          await post.addLike(user.id);
        }

        await post.populate('author', 'id username fullName avatar');
        await post.populate('likes', 'id username');
        if (post.mentions?.length) {
          await post.populate('mentions', 'id username fullName avatar');
        }
        if (post.parentPost) {
          await post.populate('parentPost');
        }

        pubsub.publish('POST_UPDATED', {
          postUpdated: post
        });

        return post;
      } catch (error) {
        logger.error('Error toggling post like:', error);
        throw new Error('Error toggling post like');
      }
    },

    sharePost: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const post = await Post.findOne({
          _id: id,
          isDeleted: false
        });

        if (!post) throw new UserInputError('Post not found');

        await post.addShare(user.id);

        await post.populate('author', 'id username fullName avatar');
        await post.populate('shares.user', 'id username');
        if (post.mentions?.length) {
          await post.populate('mentions', 'id username fullName avatar');
        }
        if (post.parentPost) {
          await post.populate('parentPost');
        }

        pubsub.publish('POST_UPDATED', {
          postUpdated: post
        });

        return post;
      } catch (error) {
        logger.error('Error sharing post:', error);
        throw new Error('Error sharing post');
      }
    },

    createComment: async (_, { input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const {
          postId,
          content,
          mentions,
          hashtags,
          parentCommentId
        } = input;

        const post = await Post.findOne({
          _id: postId,
          isDeleted: false
        });

        if (!post) throw new UserInputError('Post not found');

        const comment = await Comment.create({
          post: postId,
          author: user.id,
          content,
          mentions,
          hashtags,
          parentComment: parentCommentId
        });

        await post.addComment(comment._id);

        await comment.populate('author', 'id username fullName avatar');
        if (mentions?.length) {
          await comment.populate('mentions', 'id username fullName avatar');
        }
        if (parentCommentId) {
          await comment.populate('parentComment');
        }

        pubsub.publish('COMMENT_ADDED', {
          commentAdded: comment
        });

        return comment;
      } catch (error) {
        logger.error('Error creating comment:', error);
        throw new Error('Error creating comment');
      }
    },

    updateComment: async (_, { id, input }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const comment = await Comment.findOne({
          _id: id,
          author: user.id,
          isDeleted: false
        });

        if (!comment) throw new UserInputError('Comment not found');

        const { content, mentions, hashtags } = input;

        Object.assign(comment, {
          content,
          mentions: mentions || comment.mentions,
          hashtags: hashtags || comment.hashtags
        });

        await comment.markAsEdited();
        await comment.save();

        await comment.populate('author', 'id username fullName avatar');
        if (comment.mentions?.length) {
          await comment.populate('mentions', 'id username fullName avatar');
        }
        if (comment.parentComment) {
          await comment.populate('parentComment');
        }

        pubsub.publish('COMMENT_UPDATED', {
          commentUpdated: comment
        });

        return comment;
      } catch (error) {
        logger.error('Error updating comment:', error);
        throw new Error('Error updating comment');
      }
    },

    deleteComment: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const comment = await Comment.findOne({
          _id: id,
          author: user.id,
          isDeleted: false
        });

        if (!comment) throw new UserInputError('Comment not found');

        await comment.markAsDeleted();

        // Remove comment from post's comments array
        await Post.findByIdAndUpdate(comment.post, {
          $pull: { comments: comment._id }
        });

        pubsub.publish('COMMENT_DELETED', {
          commentDeleted: comment._id
        });

        return true;
      } catch (error) {
        logger.error('Error deleting comment:', error);
        throw new Error('Error deleting comment');
      }
    },

    toggleCommentLike: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError('Not authenticated');

      try {
        const comment = await Comment.findOne({
          _id: id,
          isDeleted: false
        });

        if (!comment) throw new UserInputError('Comment not found');

        const hasLiked = comment.likes.some(like => like.toString() === user.id);
        if (hasLiked) {
          await comment.removeLike(user.id);
        } else {
          await comment.addLike(user.id);
        }

        await comment.populate('author', 'id username fullName avatar');
        await comment.populate('likes', 'id username');
        if (comment.mentions?.length) {
          await comment.populate('mentions', 'id username fullName avatar');
        }
        if (comment.parentComment) {
          await comment.populate('parentComment');
        }

        pubsub.publish('COMMENT_UPDATED', {
          commentUpdated: comment
        });

        return comment;
      } catch (error) {
        logger.error('Error toggling comment like:', error);
        throw new Error('Error toggling comment like');
      }
    }
  },

  Subscription: {
    postAdded: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['POST_ADDED']);
      }
    },
    postUpdated: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['POST_UPDATED']);
      }
    },
    postDeleted: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['POST_DELETED']);
      }
    },
    commentAdded: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['COMMENT_ADDED']);
      }
    },
    commentUpdated: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['COMMENT_UPDATED']);
      }
    },
    commentDeleted: {
      subscribe: (_, __, { user }) => {
        if (!user) throw new AuthenticationError('Not authenticated');
        return pubsub.asyncIterator(['COMMENT_DELETED']);
      }
    }
  }
};

export default resolvers; 