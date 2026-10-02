const express = require('express');
const router = express.Router();
const {
  getCategories,
  getPublicCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryController');
const { protect, requirePermission } = require('../middleware/authMiddleware');

router.get('/public', getPublicCategories);
router.get('/', getCategories);
router.put('/reorder', protect, requirePermission('categories:edit'), reorderCategories);
router.get('/:id', getCategoryById);
router.post('/', protect, requirePermission('categories:create'), createCategory);
router.put('/:id', protect, requirePermission('categories:edit'), updateCategory);
router.delete('/:id', protect, requirePermission('categories:delete'), deleteCategory);

module.exports = router;
