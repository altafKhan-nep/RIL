const express = require('express');
const router = express.Router();
const {
  getBanners,
  getActiveBannersByPosition,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} = require('../controllers/bannerController');
const { protect, admin, requirePermission } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getBanners);
router.get('/active/:position', getActiveBannersByPosition);
router.get('/:id', getBannerById);
router.post('/', protect, requirePermission('banners:create'), createBanner);
router.put('/:id', protect, requirePermission('banners:edit'), updateBanner);
router.delete('/:id', protect, requirePermission('banners:delete'), deleteBanner);
router.put('/reorder', protect, requirePermission('banners:edit'), reorderBanners);

module.exports = router;
