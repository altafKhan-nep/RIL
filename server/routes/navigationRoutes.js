const express = require('express');
const router = express.Router();
const {
  getNavigation,
  getNavigationById,
  createNavigation,
  updateNavigation,
  deleteNavigation,
  reorderNavigation,
} = require('../controllers/navigationController');
const { protect, requirePermission } = require('../middleware/authMiddleware');

router.get('/', getNavigation);
router.get('/:id', getNavigationById);
router.post('/', protect, requirePermission('navigation:create'), createNavigation);
router.put('/:id', protect, requirePermission('navigation:edit'), updateNavigation);
router.delete('/:id', protect, requirePermission('navigation:delete'), deleteNavigation);
router.put('/reorder', protect, requirePermission('navigation:edit'), reorderNavigation);

module.exports = router;
