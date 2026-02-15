const mongoose = require('mongoose');

const ratingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    movieSlug: {
      type: String,
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple ratings per user per movie
ratingSchema.index({ user: 1, movieSlug: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
