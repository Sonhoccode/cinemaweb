const Rating = require('../models/Rating');

// @desc    Get rating for a movie
// @route   GET /api/ratings/:movieSlug
// @access  Public
const getMovieRating = async (req, res) => {
  try {
    const { movieSlug } = req.params;
    
    const ratings = await Rating.find({ movieSlug });
    
    if (ratings.length === 0) {
        return res.json({ average: 0, count: 0, userRating: 0 });
    }

    const sum = ratings.reduce((acc, r) => acc + r.score, 0);
    const average = (sum / ratings.length).toFixed(1);

    // Check if current user has rated (if logged in handled by separate call or middleware? 
    // Usually easier to separate specific user rating fetch, but for simplicity let's return generic data here)
    // We will fetch user-specific rating in a separate endpoint or conditionally if req.user exists (optional auth)

    res.json({ average: parseFloat(average), count: ratings.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user specific rating
// @route   GET /api/ratings/:movieSlug/user
// @access  Private
const getUserRating = async (req, res) => {
    try {
        const { movieSlug } = req.params;
        const rating = await Rating.findOne({ movieSlug, user: req.user.id });
        res.json({ score: rating ? rating.score : 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Rate a movie
// @route   POST /api/ratings
// @access  Private
const rateMovie = async (req, res) => {
  try {
    const { movieSlug, score } = req.body;

    if (!score || score < 1 || score > 10) {
      res.status(400);
      throw new Error('Invalid score (1-10)');
    }

    const rating = await Rating.findOneAndUpdate(
      { user: req.user.id, movieSlug },
      { score },
      { new: true, upsert: true } // Create if not exists, update if exists
    );

    res.json(rating);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getMovieRating,
  getUserRating,
  rateMovie,
};
