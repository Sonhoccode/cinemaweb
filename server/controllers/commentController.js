const asyncHandler = require('express-async-handler'); // Ensure consistent error handling
const { prisma } = require('../config/db');

// @desc    Get comments for a specific episode
// @route   GET /api/comments/:movieSlug/:episodeSlug
// @access  Public
const getComments = async (req, res) => {
  try {
    const { movieSlug, episodeSlug } = req.params;
    
    let whereClause = { movieSlug };
    if (episodeSlug !== 'all') {
        whereClause.episodeSlug = episodeSlug;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        user: { select: { username: true } } // Relation include
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment
// @route   POST /api/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { movieSlug, episodeSlug, content } = req.body;

    if (!content) {
      res.status(400);
      throw new Error('Please add content');
    }

    const comment = await prisma.comment.create({
      data: {
        userId: req.user.id,
        movieSlug,
        episodeSlug,
        content,
      },
      include: {
        user: { select: { username: true } }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id }
    });

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    // Check user ownership
    if (comment.userId !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized');
    }

    await prisma.comment.delete({
      where: { id: req.params.id }
    });

    res.json({ id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getComments,
  addComment,
  deleteComment,
};
