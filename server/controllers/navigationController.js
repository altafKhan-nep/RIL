const Navigation = require('../models/Navigation');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a navigation item
// @route   POST /api/navigation
// @access  Private/Admin
const createNavigation = asyncHandler(async (req, res) => {
  const { label, url, parent, isActive, isExternal, openInNewTab, icon, position } = req.body;

  if (!label || !url) {
    res.status(400);
    throw new Error('Label and URL are required');
  }

  if (parent) {
    const parentItem = await Navigation.findById(parent);
    if (!parentItem) {
      res.status(400);
      throw new Error('Parent navigation item not found');
    }
  }

  const maxOrder = await Navigation.findOne({ parent: parent || null, position: position || 'header' }).sort({ order: -1 });

  const navigation = await Navigation.create({
    label,
    url,
    parent: parent || null,
    order: maxOrder ? maxOrder.order + 1 : 0,
    isActive: isActive !== undefined ? isActive : true,
    isExternal: isExternal || false,
    openInNewTab: openInNewTab || false,
    icon: icon || '',
    position: position || 'header',
  });

  res.status(201).json(navigation);
});

// @desc    Get navigation (tree by position)
// @route   GET /api/navigation
// @access  Public
const getNavigation = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.position) {
    filter.position = req.query.position;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const items = await Navigation.find(filter).sort({ order: 1, label: 1 });

  const itemMap = {};
  items.forEach((item) => {
    itemMap[item._id.toString()] = { ...item.toJSON(), children: [] };
  });

  const tree = [];
  items.forEach((item) => {
    const itemObj = itemMap[item._id.toString()];
    if (item.parent && itemMap[item.parent.toString()]) {
      itemMap[item.parent.toString()].children.push(itemObj);
    } else {
      tree.push(itemObj);
    }
  });

  res.json(tree);
});

// @desc    Get navigation by ID
// @route   GET /api/navigation/:id
// @access  Public
const getNavigationById = asyncHandler(async (req, res) => {
  const item = await Navigation.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Navigation item not found');
  }

  const children = await Navigation.find({ parent: item._id }).sort({
    order: 1,
    label: 1,
  });

  res.json({ ...item.toJSON(), children });
});

// @desc    Update a navigation item
// @route   PUT /api/navigation/:id
// @access  Private/Admin
const updateNavigation = asyncHandler(async (req, res) => {
  const item = await Navigation.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Navigation item not found');
  }

  if (req.body.parent) {
    if (req.body.parent === item._id.toString()) {
      res.status(400);
      throw new Error('A navigation item cannot be its own parent');
    }
    const parentItem = await Navigation.findById(req.body.parent);
    if (!parentItem) {
      res.status(400);
      throw new Error('Parent navigation item not found');
    }
  }

  const fields = ['label', 'url', 'parent', 'order', 'isActive', 'isExternal', 'openInNewTab', 'icon', 'position'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

  const updatedItem = await item.save();
  res.json(updatedItem);
});

// @desc    Delete a navigation item
// @route   DELETE /api/navigation/:id
// @access  Private/Admin
const deleteNavigation = asyncHandler(async (req, res) => {
  const item = await Navigation.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Navigation item not found');
  }

  const childItems = await Navigation.countDocuments({ parent: item._id });
  if (childItems > 0) {
    res.status(400);
    throw new Error('Cannot delete navigation item with children. Remove children first.');
  }

  await Navigation.findByIdAndDelete(req.params.id);
  res.json({ message: 'Navigation item deleted successfully' });
});

// @desc    Reorder navigation items
// @route   PUT /api/navigation/reorder
// @access  Private/Admin
const reorderNavigation = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400);
    throw new Error('orderedIds array is required');
  }

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order: index } },
    },
  }));

  await Navigation.bulkWrite(bulkOps);

  const items = await Navigation.find({}).sort({ order: 1, label: 1 });
  res.json(items);
});

module.exports = {
  createNavigation,
  getNavigation,
  getNavigationById,
  updateNavigation,
  deleteNavigation,
  reorderNavigation,
};
