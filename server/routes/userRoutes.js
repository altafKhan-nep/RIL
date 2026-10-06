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
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.route('/').post(registerUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/wishlist/:id').post(protect, addToWishlist);
// Logout works with or without a valid session so a stale cookie can always
// be cleared.
router.post('/logout', logoutUser);
// optionalAuth, not protect: the access token is usually already expired here.
router.post('/refresh', optionalAuth, refreshSession);

module.exports = router;
