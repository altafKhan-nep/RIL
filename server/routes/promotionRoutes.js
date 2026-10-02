const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const asyncHandler = require('../utils/asyncHandler');
const {
  getPromotions,
  createPromotion,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  getActivePromotions,
} = require('../controllers/promotionController');
const { protect, admin, requirePermission } = require('../middleware/authMiddleware');

// Public: Get active sidebar promotion
router.get('/sidebar', asyncHandler(async (req, res) => {
  const now = new Date();
  const promo = await Promotion.findOne({
    isActive: true,
    showInSidebar: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ createdAt: -1 });

  res.json(promo || null);
}));

router.get('/', protect, admin, getPromotions);
router.post('/', protect, requirePermission('promotions:create'), createPromotion);
router.get('/active', getActivePromotions);
router.post('/validate', protect, validatePromotion);
router.get('/:id', protect, admin, getPromotionById);
router.put('/:id', protect, requirePermission('promotions:edit'), updatePromotion);
router.delete('/:id', protect, requirePermission('promotions:delete'), deletePromotion);

module.exports = router;
