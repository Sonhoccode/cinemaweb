const mongoose = require('mongoose');

const watchHistorySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    movieSlug: {
      type: String,
      required: true,
    },
    movieName: {
      type: String,
      required: true,
    },
    posterUrl: {
      type: String,
      default: null,
    },
    episodeSlug: {
      type: String,
      required: true,
    },
    episodeName: {
      type: String,
      required: true,
    },
    progress: {
      type: Number, // Seconds watched
      default: 0,
    },
    duration: {
      type: Number, // Total duration in seconds
      default: 0,
    },
    lastWatched: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique history per user per movie per episode
watchHistorySchema.index({ user: 1, movieSlug: 1, episodeSlug: 1 }, { unique: true });

module.exports = mongoose.model('WatchHistory', watchHistorySchema);
