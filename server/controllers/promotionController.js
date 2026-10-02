const Promotion = require('../models/Promotion');
const asyncHandler = require('../utils/asyncHandler');
const { validatePromotion: validatePromotionInput } = require('../middleware/validationMiddleware');

// @desc    Create a promotion
// @route   POST /api/promotions
// @access  Private/Admin
const createPromotion = asyncHandler(async (req, res) => {
  const validation = validatePromotionInput(req.body);
  if (!validation.isValid) {
    res.status(400);
    throw new Error(validation.errors.join(', '));
  }

  const {
    name, code, description, type, value, minPurchase, maxDiscount,
    usageLimit, maxPerUser, applicableProducts, applicableCategories, isActive,
    startDate, endDate,
    showInSidebar, sidebarTitle, sidebarSubtitle, sidebarButtonText, sidebarBgColor,
  } = req.body;

  const existingPromo = await Promotion.findOne({ code: code.toUpperCase() });
  if (existingPromo) {
    res.status(400);
    throw new Error('Promotion code already exists');
  }

  if (new Date(endDate) <= new Date(startDate)) {
    res.status(400);
    throw new Error('End date must be after start date');
  }

  const promotion = await Promotion.create({
    name,
    code: code.toUpperCase(),
    description: description || '',
    type,
    value: value || 0,
    minPurchase: minPurchase || 0,
    maxDiscount: maxDiscount || 0,
    usageLimit: usageLimit || 0,
    maxPerUser: maxPerUser || 0,
    usedCount: 0,
    usedByUsers: [],
    applicableProducts: applicableProducts || [],
    applicableCategories: applicableCategories || [],
    isActive: isActive !== undefined ? isActive : true,
    startDate,
    endDate,
    showInSidebar: showInSidebar || false,
    sidebarTitle: sidebarTitle || 'Special Offer',
    sidebarSubtitle: sidebarSubtitle || '',
    sidebarButtonText: sidebarButtonText || 'Shop Now',
    sidebarBgColor: sidebarBgColor || '#a43c12',
  });

  res.status(201).json(promotion);
});

// @desc    Get all promotions
// @route   GET /api/promotions
// @access  Private/Admin
const getPromotions = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 20;
  const page = Number(req.query.page) || 1;

  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.type) {
    filter.type = req.query.type;
  }
  if (req.query.keyword) {
    const escaped = req.query.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { code: { $regex: escaped, $options: 'i' } },
    ];
  }

  const count = await Promotion.countDocuments(filter);
  const promotions = await Promotion.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    promotions,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc    Get promotion by ID
// @route   GET /api/promotions/:id
// @access  Private/Admin
const getPromotionById = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);

  if (!promotion) {
    res.status(404);
    throw new Error('Promotion not found');
  }

  res.json(promotion);
});

// @desc    Update a promotion
// @route   PUT /api/promotions/:id
// @access  Private/Admin
const updatePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);

  if (!promotion) {
    res.status(404);
    throw new Error('Promotion not found');
  }

  if (req.body.code && req.body.code.toUpperCase() !== promotion.code) {
    const existing = await Promotion.findOne({
      code: req.body.code.toUpperCase(),
      _id: { $ne: promotion._id },
    });
    if (existing) {
      res.status(400);
      throw new Error('Promotion code already exists');
    }
    req.body.code = req.body.code.toUpperCase();
  }

  if (req.body.startDate && req.body.endDate) {
    if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
      res.status(400);
      throw new Error('End date must be after start date');
    }
  }

  if (req.body.value !== undefined && req.body.type !== 'free_shipping' && (typeof req.body.value !== 'number' || req.body.value <= 0)) {
    res.status(400);
    throw new Error('Value must be greater than 0');
  }

  if (req.body.code && (req.body.code.length < 3 || req.body.code.length > 20)) {
    res.status(400);
    throw new Error('Code must be between 3 and 20 characters');
  }

  const fields = [
    'name', 'code', 'description', 'type', 'value', 'minPurchase',
    'maxDiscount', 'usageLimit', 'maxPerUser', 'applicableProducts', 'applicableCategories',
    'isActive', 'startDate', 'endDate',
    'showInSidebar', 'sidebarTitle', 'sidebarSubtitle', 'sidebarButtonText', 'sidebarBgColor',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      promotion[field] = field === 'code' ? req.body[field].toUpperCase() : req.body[field];
    }
  });

  const updatedPromotion = await promotion.save();
  res.json(updatedPromotion);
});

// @desc    Delete a promotion
// @route   DELETE /api/promotions/:id
// @access  Private/Admin
const deletePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);

  if (!promotion) {
    res.status(404);
    throw new Error('Promotion not found');
  }

  await Promotion.findByIdAndDelete(req.params.id);
  res.json({ message: 'Promotion deleted successfully' });
});

// @desc    Get active promotions
// @route   GET /api/promotions/active
// @access  Public
const getActivePromotions = asyncHandler(async (req, res) => {
  const now = new Date();
  const promotions = await Promotion.find({
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
  }).sort({ createdAt: -1 });

  res.json(promotions);
});

// @desc    Validate a promotion code
// @route   POST /api/promotions/validate
// @access  Public
const validatePromotion = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400);
    throw new Error('Promotion code is required');
  }

  const promotion = await Promotion.findOne({ code: code.trim().toUpperCase() });

  if (!promotion) {
    res.status(404);
    throw new Error('Invalid promotion code');
  }

  if (!promotion.isActive) {
    res.status(400);
    throw new Error('This promotion is no longer active');
  }

  const now = new Date();
  if (now < new Date(promotion.startDate)) {
    res.status(400);
    throw new Error('This promotion has not started yet');
  }
  if (now > new Date(promotion.endDate)) {
    res.status(400);
    throw new Error('This promotion has expired');
  }

  if (promotion.usageLimit > 0 && promotion.usedCount >= promotion.usageLimit) {
    res.status(400);
    throw new Error('This promotion has reached its usage limit');
  }

  // Per-user usage check
  if (req.user && promotion.maxPerUser > 0) {
    const userUsageCount = promotion.usedByUsers.filter(
      (uid) => uid.toString() === req.user._id.toString()
    ).length;
    if (userUsageCount >= promotion.maxPerUser) {
      res.status(400);
      throw new Error(`You have already used this code ${promotion.maxPerUser} time(s)`);
    }
  }

  if (promotion.minPurchase > 0 && cartTotal && cartTotal < promotion.minPurchase) {
    res.status(400);
    throw new Error(`Minimum purchase of $${promotion.minPurchase} required`);
  }

  let discount = 0;
  if (promotion.type === 'percentage') {
    discount = (cartTotal || 0) * (promotion.value / 100);
    if (promotion.maxDiscount > 0 && discount > promotion.maxDiscount) {
      discount = promotion.maxDiscount;
    }
  } else if (promotion.type === 'fixed') {
    discount = promotion.value;
  } else if (promotion.type === 'free_shipping') {
    discount = 0;
  }

  res.json({
    valid: true,
    promotion: {
      _id: promotion._id,
      name: promotion.name,
      code: promotion.code,
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount,
    },
    discount: Math.round(discount * 100) / 100,
  });
});

module.exports = {
  createPromotion,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  getActivePromotions,
};
