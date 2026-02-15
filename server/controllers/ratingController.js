const { prisma } = require('../config/db');

// @desc    Get rating for a movie
// @route   GET /api/ratings/:movieSlug
// @access  Public
const getMovieRating = async (req, res) => {
  try {
    const { movieSlug } = req.params;
    
    // Aggregation in Prisma
    const aggregations = await prisma.rating.aggregate({
      _avg: { score: true },
      _count: { score: true },
      where: { movieSlug }
    });
    
    const count = aggregations._count.score;
    const average = aggregations._avg.score || 0;

    res.json({ average: parseFloat(average.toFixed(1)), count });
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
        const rating = await prisma.rating.findUnique({
            where: {
                userId_movieSlug: {
                    userId: req.user.id,
                    movieSlug
                }
            }
        });
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

    const rating = await prisma.rating.upsert({
        where: {
            userId_movieSlug: {
                userId: req.user.id,
                movieSlug
            }
        },
        update: { score },
        create: {
            userId: req.user.id,
            movieSlug,
            score
        }
    });

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
