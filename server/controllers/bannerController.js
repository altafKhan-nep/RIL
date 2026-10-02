const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');
const { validateBanner } = require('../middleware/validationMiddleware');

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/Admin
const createBanner = asyncHandler(async (req, res) => {
  const validation = validateBanner(req.body);
  if (!validation.isValid) {
    res.status(400);
    throw new Error(validation.errors.join(', '));
  }

  const { title, subtitle, description, image, link, ctaText, position, targetPages, isActive, startDate, endDate, bgColor } = req.body;

  const maxOrder = await Banner.findOne({ position: position || 'hero' }).sort({ order: -1 });

  const banner = await Banner.create({
    title,
    subtitle: subtitle || '',
    description: description || '',
    image,
    link: link || '/',
    ctaText: ctaText || 'Shop Now',
    position: position || 'hero',
    targetPages: targetPages || [],
    isActive: isActive !== undefined ? isActive : true,
    order: maxOrder ? maxOrder.order + 1 : 0,
    startDate: startDate || null,
    endDate: endDate || null,
    bgColor: bgColor || '#ffffff',
  });

  res.status(201).json(banner);
});

// @desc    Get all banners
// @route   GET /api/banners
// @access  Public
const getBanners = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.position) {
    filter.position = req.query.position;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const banners = await Banner.find(filter).sort({ order: 1, createdAt: -1 });
  res.json(banners);
});

// @desc    Get active banners by position
// @route   GET /api/banners/active/:position
// @access  Public
const getActiveBannersByPosition = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    position: req.params.position,
    isActive: true,
    $and: [
      {
        $or: [
          { startDate: { $lte: now } },
          { startDate: null },
        ],
      },
      {
        $or: [
          { endDate: { $gte: now } },
          { endDate: null },
        ],
      },
    ],
  };

  if (req.query.page) {
    filter.targetPages = { $in: [req.query.page] };
  }

  const banners = await Banner.find(filter).sort({ order: 1 });

  res.json(banners);
});

// @desc    Get banner by ID
// @route   GET /api/banners/:id
// @access  Public
const getBannerById = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    res.status(404);
    throw new Error('Banner not found');
  }

  res.json(banner);
});

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = asyncHandler(async (req, res) => {
  if (req.body.title || req.body.image || req.body.position) {
    const validation = validateBanner(req.body);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(validation.errors.join(', '));
    }
  }

  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    res.status(404);
    throw new Error('Banner not found');
  }

  const fields = ['title', 'subtitle', 'description', 'image', 'link', 'ctaText', 'position', 'targetPages', 'isActive', 'startDate', 'endDate', 'bgColor', 'order'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      banner[field] = req.body[field];
    }
  });

  const updatedBanner = await banner.save();
  res.json(updatedBanner);
});

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);

  if (!banner) {
    res.status(404);
    throw new Error('Banner not found');
  }

  await Banner.findByIdAndDelete(req.params.id);
  res.json({ message: 'Banner deleted successfully' });
});

// @desc    Reorder banners
// @route   PUT /api/banners/reorder
// @access  Private/Admin
const reorderBanners = asyncHandler(async (req, res) => {
  const { orderedIds, items } = req.body;
  const ids = orderedIds || (Array.isArray(items) ? items.map(i => i.id || i._id) : []);

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error('orderedIds array or items array is required');
  }

  const bulkOps = ids.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order: index } },
    },
  }));

  await Banner.bulkWrite(bulkOps);

  const banners = await Banner.find({}).sort({ order: 1 });
  res.json(banners);
});

module.exports = {
  createBanner,
  getBanners,
  getActiveBannersByPosition,
  getBannerById,
  updateBanner,
  deleteBanner,
  reorderBanners,
};
