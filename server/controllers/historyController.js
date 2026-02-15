const asyncHandler = require('express-async-handler');
const WatchHistory = require('../models/WatchHistory');

// @desc    Get user watch history
// @route   GET /api/history
// @access  Private
const getHistory = asyncHandler(async (req, res) => {
  const history = await WatchHistory.find({ user: req.user.id }).sort({
    lastWatched: -1,
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

  // Check if history exists for this episode
  let history = await WatchHistory.findOne({
    user: req.user.id,
    movieSlug,
    episodeSlug,
  });

  if (history) {
    // Update existing history
    history.episodeSlug = episodeSlug;
    history.episodeName = episodeName;
    history.progress = progress;
    history.duration = duration;
    if (posterUrl) {
      history.posterUrl = posterUrl;
    }
    history.lastWatched = Date.now();
    await history.save();
  } else {
    // Create new history
    history = await WatchHistory.create({
      user: req.user.id,
      movieSlug,
      movieName,
      posterUrl: posterUrl || null,
      episodeSlug,
      episodeName,
      progress,
      duration,
    });
  }

  res.status(200).json(history);
});

// @desc    Delete history item
// @route   DELETE /api/history/:slug
// @access  Private
const deleteHistory = asyncHandler(async (req, res) => {
  const history = await WatchHistory.findOne({
    user: req.user.id,
    movieSlug: req.params.slug,
  });

  if (!history) {
    res.status(404);
    throw new Error('History not found');
  }

  await history.remove();

  res.status(200).json({ id: req.params.slug });
});

module.exports = {
  getHistory,
  updateHistory,
  deleteHistory,
};
