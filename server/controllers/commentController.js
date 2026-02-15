const Comment = require('../models/Comment');
const User = require('../models/User');

// @desc    Get comments for a specific episode
// @route   GET /api/comments/:movieSlug/:episodeSlug
// @access  Public
const getComments = async (req, res) => {
  try {
    const { movieSlug, episodeSlug } = req.params;
    
    let query = { movieSlug };
    if (episodeSlug !== 'all') {
        query.episodeSlug = episodeSlug;
    }

    const comments = await Comment.find(query)
      .populate('user', 'username') // Only get username
      .sort({ createdAt: -1 }); // Newest first

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

    const comment = await Comment.create({
      user: req.user.id,
      movieSlug,
      episodeSlug,
      content,
    });

    // Populate user info immediately for frontend display
    const populatedComment = await Comment.findById(comment._id).populate('user', 'username');

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    // Check user ownership
    if (comment.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized');
    }

    await comment.deleteOne();

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
