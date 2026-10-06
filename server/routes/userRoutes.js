const express = require('express');
const router = express.Router();
const {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  addToWishlist,
  logoutUser,
  refreshSession,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.route('/').post(registerUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/wishlist/:id').post(protect, addToWishlist);
// Logout works with or without a valid session so a stale cookie can always
// be cleared.
router.post('/logout', logoutUser);
router.post('/refresh', protect, refreshSession);

module.exports = router;
