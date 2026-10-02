const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { validateCategory } = require('../middleware/validationMiddleware');

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const validation = validateCategory(req.body);
  if (!validation.isValid) {
    res.status(400);
    throw new Error(validation.errors.join(', '));
  }

  const { name, slug, description, image, icon, parent, isActive } = req.body;

  if (!slug) {
    res.status(400);
    throw new Error('Slug is required');
  }

  const existingCategory = await Category.findOne({
    $or: [{ name }, { slug }],
  });
  if (existingCategory) {
    res.status(400);
    throw new Error('Category with this name or slug already exists');
  }

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      res.status(400);
      throw new Error('Parent category not found');
    }
  }

  const maxOrder = await Category.findOne({ parent: parent || null }).sort({ order: -1 });

  const category = await Category.create({
    name,
    slug,
    description: description || '',
    image: image || '',
    icon: icon || 'category',
    parent: parent || null,
    isActive: isActive !== undefined ? isActive : true,
    order: maxOrder ? maxOrder.order + 1 : 0,
    productCount: 0,
  });

  res.status(201).json(category);
});

// @desc    Get all categories (tree structure)
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ order: 1, name: 1 });

  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[cat._id.toString()] = { ...cat.toJSON(), children: [] };
  });

  const tree = [];
  categories.forEach((cat) => {
    const catObj = categoryMap[cat._id.toString()];
    if (cat.parent && categoryMap[cat.parent.toString()]) {
      categoryMap[cat.parent.toString()].children.push(catObj);
    } else {
      tree.push(catObj);
    }
  });

  res.json(tree);
});

// @desc    Get public categories (flat, active only, with real productCount)
// @route   GET /api/categories/public
// @access  Public
const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });

  const productCounts = await Product.aggregate([
    { $match: { $or: [{ isActive: true }, { isActive: { $exists: false } }] } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const countMap = {};
  productCounts.forEach((p) => {
    if (p._id) countMap[p._id] = p.count;
  });

  const result = categories.map((cat) => ({
    _id: cat._id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    image: cat.image,
    icon: cat.icon,
    parent: cat.parent,
    order: cat.order,
    productCount: countMap[cat.name] || 0,
  }));

  res.json(result);
});

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const children = await Category.find({ parent: category._id }).sort({
    order: 1,
    name: 1,
  });

  res.json({ ...category.toJSON(), children });
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  if (req.body.name) {
    const validation = validateCategory(req.body);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(validation.errors.join(', '));
    }
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (req.body.name && req.body.name !== category.name) {
    const existing = await Category.findOne({
      name: req.body.name,
      _id: { $ne: category._id },
    });
    if (existing) {
      res.status(400);
      throw new Error('Category name already exists');
    }
  }

  if (req.body.slug && req.body.slug !== category.slug) {
    const existing = await Category.findOne({
      slug: req.body.slug,
      _id: { $ne: category._id },
    });
    if (existing) {
      res.status(400);
      throw new Error('Category slug already exists');
    }
  }

  if (req.body.parent) {
    if (req.body.parent === category._id.toString()) {
      res.status(400);
      throw new Error('A category cannot be its own parent');
    }
    const parentCategory = await Category.findById(req.body.parent);
    if (!parentCategory) {
      res.status(400);
      throw new Error('Parent category not found');
    }
  }

  const fields = ['name', 'slug', 'description', 'image', 'icon', 'parent', 'isActive', 'order'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      category[field] = req.body[field];
    }
  });

  const updatedCategory = await category.save();
  res.json(updatedCategory);
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const childCategories = await Category.countDocuments({ parent: category._id });
  if (childCategories > 0) {
    res.status(400);
    throw new Error('Cannot delete category with subcategories. Remove subcategories first.');
  }

  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted successfully' });
});

// @desc    Reorder categories
// @route   PUT /api/categories/reorder
// @access  Private/Admin
const reorderCategories = asyncHandler(async (req, res) => {
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

  await Category.bulkWrite(bulkOps);

  const categories = await Category.find({}).sort({ order: 1, name: 1 });
  res.json(categories);
});

module.exports = {
  createCategory,
  getCategories,
  getPublicCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
