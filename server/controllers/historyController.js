const asyncHandler = require('express-async-handler');
const { prisma } = require('../config/db');

// @desc    Get user watch history
// @route   GET /api/history
// @access  Private
const getHistory = asyncHandler(async (req, res) => {
  const history = await prisma.watchHistory.findMany({
    where: { userId: req.user.id },
    orderBy: { lastWatched: 'desc' },
  });
  res.status(200).json(history);
});

// @desc    Add or update watch history
// @route   POST /api/history
// @access  Private
const updateHistory = asyncHandler(async (req, res) => {
  const {
    movieSlug,
    movieName,
    posterUrl,
    episodeSlug,
    episodeName,
    progress,
    duration,
  } = req.body;

  if (!movieSlug || !movieName || !episodeSlug) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  // Upsert history
  // Using compound unique constraint on [userId, movieSlug, episodeSlug]
  const history = await prisma.watchHistory.upsert({
    where: {
      userId_movieSlug_episodeSlug: {
        userId: req.user.id,
        movieSlug,
        episodeSlug,
      },
    },
    update: {
      episodeName,
      progress,
      duration,
      posterUrl: posterUrl || undefined, // Only update if provided
      lastWatched: new Date(),
    },
    create: {
      userId: req.user.id,
      movieSlug,
      movieName,
      posterUrl: posterUrl || null,
      episodeSlug,
      episodeName,
      progress,
      duration,
    },
  });

  res.status(200).json(history);
});

// @desc    Delete history item
// @route   DELETE /api/history/:slug
// @access  Private
const deleteHistory = asyncHandler(async (req, res) => {
  // Delete all history for this movie slug for the user
  // (Assuming frontend deletes by movie slug, meaning all episodes)
  const result = await prisma.watchHistory.deleteMany({
    where: {
      userId: req.user.id,
      movieSlug: req.params.slug,
    },
  });

  if (result.count === 0) {
    res.status(404);
    throw new Error('History not found');
  }

  res.status(200).json({ id: req.params.slug });
});

module.exports = {
  getHistory,
  updateHistory,
  deleteHistory,
};
