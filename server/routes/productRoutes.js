const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getCategories,
  getFlashDeals,
  deleteProduct,
  createProduct,
  updateProduct,
} = require('../controllers/productController');
const { protect, requirePermission } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../models/User');

router.route('/').get(getProducts).post(protect, requirePermission(PERMISSIONS.PRODUCTS_CREATE), createProduct);
router.route('/categories').get(getCategories);
router.route('/flash-deals').get(getFlashDeals);
router
  .route('/:id')
  .get(getProductById)
  .delete(protect, requirePermission(PERMISSIONS.PRODUCTS_DELETE), deleteProduct)
  .put(protect, requirePermission(PERMISSIONS.PRODUCTS_EDIT), updateProduct);

module.exports = router;
