const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
} = require('../controllers/settingsController');
const { protect, requirePermission } = require('../middleware/authMiddleware');

router.get('/', getSettings);
router.put('/:section', protect, requirePermission('settings:edit'), updateSettings);

module.exports = router;
