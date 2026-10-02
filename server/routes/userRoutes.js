const express = require('express');
const router = express.Router();
const {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  addToWishlist,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.route('/').post(registerUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/wishlist/:id').post(protect, addToWishlist);

module.exports = router;
