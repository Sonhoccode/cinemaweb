const express = require('express');
const router = express.Router();
const {
  getMovieRating,
  getUserRating,
  rateMovie,
} = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:movieSlug', getMovieRating);
router.get('/:movieSlug/user', protect, getUserRating);
router.post('/', protect, rateMovie);

module.exports = router;
