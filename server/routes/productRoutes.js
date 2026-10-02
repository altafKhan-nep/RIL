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
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getProducts).post(protect, admin, createProduct);
router.route('/categories').get(getCategories);
router.route('/flash-deals').get(getFlashDeals);
router
  .route('/:id')
  .get(getProductById)
  .delete(protect, admin, deleteProduct)
  .put(protect, admin, updateProduct);

module.exports = router;
