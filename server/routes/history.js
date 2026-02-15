const express = require('express');
const router = express.Router();
const {
  getHistory,
  updateHistory,
  deleteHistory,
} = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getHistory).post(protect, updateHistory);
router.route('/:slug').delete(protect, deleteHistory);

module.exports = router;
