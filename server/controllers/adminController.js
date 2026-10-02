const { User } = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { validateUser } = require('../middleware/validationMiddleware');
const ObjectId = require('mongoose').Types.ObjectId;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfThisMonth.getTime() - 1);

  const totalSalesResult = await Order.aggregate([
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  const totalSales = totalSalesResult.length ? totalSalesResult[0].total : 0;

  const totalOrders = await Order.countDocuments();
  const totalCustomers = await User.countDocuments({ role: 'customer' });
  const totalProducts = await Product.countDocuments();

  const statusCountsResult = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusCounts = {
    Pending: 0,
    Processing: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };
  statusCountsResult.forEach((s) => {
    if (statusCounts[s._id] !== undefined) {
      statusCounts[s._id] = s.count;
    }
  });

  const recentOrders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  const recentCustomers = await User.find({ role: 'customer' })
    .select('name email avatar createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

  const lowStockProducts = await Product.countDocuments({
    countInStock: { $lt: 5 },
  });

  const monthlySales = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: '$totalPrice' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const topProducts = await Order.aggregate([
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        unitsSold: { $sum: '$orderItems.qty' },
        revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        _id: '$product._id',
        name: '$product.name',
        images: '$product.images',
        price: '$product.price',
        numReviews: '$product.numReviews',
        rating: '$product.rating',
        unitsSold: 1,
        revenue: 1,
      },
    },
  ]);

  // Repeat customer rate: customers with >1 order / total customers
  const repeatCustomerResult = await Order.aggregate([
    { $group: { _id: '$user', orderCount: { $sum: 1 } } },
    { $match: { orderCount: { $gt: 1 } } },
    { $count: 'repeatCount' },
  ]);
  const repeatCount = repeatCustomerResult.length ? repeatCustomerResult[0].repeatCount : 0;
  const repeatCustomerRate = totalCustomers > 0 ? (repeatCount / totalCustomers) * 100 : 0;

  const revenueThisMonthResult = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfThisMonth },
      },
    },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  const revenueThisMonth = revenueThisMonthResult.length
    ? revenueThisMonthResult[0].total
    : 0;

  const revenueLastMonthResult = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      },
    },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  const revenueLastMonth = revenueLastMonthResult.length
    ? revenueLastMonthResult[0].total
    : 0;

  const revenueChange =
    revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : revenueThisMonth > 0
        ? 100
        : 0;

  const ordersThisMonth = await Order.countDocuments({
    createdAt: { $gte: startOfThisMonth },
  });
  const ordersLastMonth = await Order.countDocuments({
    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
  });
  const ordersChange =
    ordersLastMonth > 0
      ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100
      : ordersThisMonth > 0
        ? 100
        : 0;

  res.json({
    totalSales,
    totalOrders,
    totalCustomers,
    totalProducts,
    statusCounts,
    recentOrders,
    recentCustomers,
    lowStockProducts,
    monthlySales,
    topProducts,
    repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100,
    revenue: {
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      percentageChange: Math.round(revenueChange * 100) / 100,
    },
    orders: {
      thisMonth: ordersThisMonth,
      lastMonth: ordersLastMonth,
      percentageChange: Math.round(ordersChange * 100) / 100,
    },
  });
});

// @desc    Get all products (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.json({ products, count: products.length });
});

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 100;
  const page = Number(req.query.page) || 1;

  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.keyword) {
    const safeKeyword = escapeRegex(req.query.keyword);
    filter.$or = [
      { name: { $regex: safeKeyword, $options: 'i' } },
      { email: { $regex: safeKeyword, $options: 'i' } },
    ];
  }

  const count = await User.countDocuments(filter);

  // Get users with order stats aggregated
  const users = await User.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'userOrders',
      },
    },
    {
      $addFields: {
        orderCount: { $size: '$userOrders' },
        totalSpent: {
          $sum: {
            $map: {
              input: '$userOrders',
              as: 'order',
              in: '$$order.totalPrice',
            },
          },
        },
      },
    },
    { $project: { password: 0, userOrders: 0 } },
    { $sort: { createdAt: -1 } },
    { $skip: pageSize * (page - 1) },
    { $limit: pageSize },
  ]);

  res.json({
    users,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const orderCount = await Order.countDocuments({ user: user._id });

  const totalSpentResult = await Order.aggregate([
    { $match: { user: user._id } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  const totalSpent = totalSpentResult.length ? totalSpentResult[0].total : 0;

  res.json({
    ...user.toJSON(),
    orderCount,
    totalSpent,
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.role !== undefined) {
    // Prevent non-super_admin from granting super_admin role
    if (req.body.role === 'super_admin' && req.user.role !== 'super_admin') {
      res.status(403);
      throw new Error('Only super admin can assign super admin role');
    }
    // Prevent changing super_admin's role
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      res.status(403);
      throw new Error('Cannot modify super admin account');
    }
    user.role = req.body.role;
  }
  if (req.body.permissions !== undefined) user.permissions = req.body.permissions;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  if (req.body.email !== undefined) user.email = req.body.email;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.address !== undefined) user.address = req.body.address;
  if (req.body.password) {
    if (req.body.password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }
    user.password = req.body.password;
  }

  const updatedUser = await user.save();
  res.json(updatedUser);
});

// @desc    Delete user (soft delete)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'super_admin') {
    res.status(400);
    throw new Error('Cannot deactivate a super admin');
  }

  user.isActive = false;
  await user.save();

  res.json({ message: 'User deactivated successfully' });
});

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 20;
  const page = Number(req.query.page) || 1;

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.keyword) {
    if (ObjectId.isValid(req.query.keyword)) {
      filter._id = req.query.keyword;
    } else {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }
  }

  const count = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc    Get order by ID
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json(order);
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const { status, note } = req.body;
  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  const statusTransitions = {
    Pending: ['Processing', 'Cancelled'],
    Processing: ['Shipped', 'Cancelled'],
    Shipped: ['Out for Delivery', 'Delivered'],
    'Out for Delivery': ['Delivered'],
    Delivered: [],
    Cancelled: [],
  };

  if (!statusTransitions[order.status]?.includes(status)) {
    res.status(400);
    throw new Error(
      `Cannot transition from ${order.status} to ${status}`
    );
  }

  const trackingEventMap = {
    Processing: {
      status: 'Order Confirmed',
      description: 'Your order is being confirmed and verified',
      icon: 'check_circle',
      location: 'Warehouse',
    },
    Shipped: {
      status: 'Shipped',
      description: `Your order has been shipped${req.body.shippingPartner ? ` via ${req.body.shippingPartner}` : ''}`,
      icon: 'local_shipping',
      location: req.body.location || 'Dispatch Center',
    },
    'Out for Delivery': {
      status: 'Out for Delivery',
      description: `Your order is out for delivery${order.shippingPartner ? ` via ${order.shippingPartner}` : ''} and will arrive soon`,
      icon: 'directions_bike',
      location: req.body.location || order.shippingAddress?.city || 'Your City',
    },
    Delivered: {
      status: 'Delivered',
      description: 'Your order has been delivered successfully',
      icon: 'where_to_vote',
      location: order.shippingAddress?.city || 'Destination',
    },
    Cancelled: {
      status: 'Cancelled',
      description: note || 'Order has been cancelled',
      icon: 'cancel',
      location: '',
    },
  };

  const updateOps = {
    $set: { status },
    $push: {
      statusHistory: { status, date: Date.now(), note: note || `Status updated to ${status}` },
    },
  };

  const trackingEvent = trackingEventMap[status];
  if (trackingEvent) {
    updateOps.$push.trackingEvents = {
      ...trackingEvent,
      timestamp: Date.now(),
    };
  }

  if (status === 'Delivered') {
    updateOps.$set.deliveredAt = Date.now();
    updateOps.$set.isPaid = true;
    updateOps.$set.paidAt = order.paidAt || new Date();
  }

  if (status === 'Cancelled') {
    updateOps.$set.cancelledAt = Date.now();
    updateOps.$set.cancelReason = note || '';
  }

  if (req.body.trackingNumber) updateOps.$set.trackingNumber = req.body.trackingNumber;
  if (req.body.shippingPartner) updateOps.$set.shippingPartner = req.body.shippingPartner;
  if (req.body.trackingUrl) updateOps.$set.trackingUrl = req.body.trackingUrl;
  if (req.body.estimatedDelivery) updateOps.$set.estimatedDelivery = req.body.estimatedDelivery;

  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updateOps, { new: true });

  if (status === 'Cancelled') {
    const Product = require('../models/Product');
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: item.qty } },
        { new: true }
      );
    }
  }

  res.json(updatedOrder);
});

// @desc    Cancel order
// @route   PUT /api/admin/orders/:id/cancel
// @access  Private/Admin
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.status === 'Delivered') {
    res.status(400);
    throw new Error('Cannot cancel a delivered order');
  }

  if (order.status === 'Cancelled') {
    res.status(400);
    throw new Error('Order is already cancelled');
  }

  order.status = 'Cancelled';
  const updatedOrder = await order.save();

  res.json(updatedOrder);
});

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();

  const revenueByMonth = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const ordersByStatus = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const topCategories = await Order.aggregate([
    { $unwind: '$orderItems' },
    {
      $lookup: {
        from: 'products',
        localField: 'orderItems.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
        unitsSold: { $sum: '$orderItems.qty' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  const topProducts = await Order.aggregate([
    {
      $unwind: '$orderItems',
    },
    {
      $group: {
        _id: '$orderItems.product',
        unitsSold: { $sum: '$orderItems.qty' },
        revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        _id: '$product._id',
        name: '$product.name',
        images: '$product.images',
        price: '$product.price',
        unitsSold: 1,
        revenue: 1,
      },
    },
  ]);

  const customerGrowth = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    revenueByMonth,
    ordersByStatus,
    topCategories,
    topProducts,
    customerGrowth,
  });
});

// @desc    Bulk update stock for multiple products
// @route   PUT /api/admin/inventory/bulk
// @access  Private/Admin
const bulkUpdateStock = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400);
    throw new Error('updates array is required');
  }

  const results = [];
  for (const update of updates) {
    const { productId, stock, note } = update;
    if (productId === undefined || stock === undefined) continue;

    const product = await Product.findById(productId);
    if (!product) continue;

    const previousStock = product.countInStock;
    product.countInStock = Math.max(0, Number(stock));
    product.stockHistory.push({
      type: 'set',
      quantity: product.countInStock - previousStock,
      previousStock,
      newStock: product.countInStock,
      note: note || 'Bulk update',
      createdBy: req.user._id,
    });
    await product.save();
    results.push({ productId, success: true, newStock: product.countInStock });
  }

  res.json({ updated: results.length, results });
});

// @desc    Adjust stock (+/-) for a product
// @route   PUT /api/admin/inventory/:id/adjust
// @access  Private/Admin
const adjustStock = asyncHandler(async (req, res) => {
  const { adjustment, type, note } = req.body;

  if (adjustment === undefined || !type) {
    res.status(400);
    throw new Error('adjustment and type are required');
  }

  if (!['set', 'adjust', 'restock'].includes(type)) {
    res.status(400);
    throw new Error('type must be set, adjust, or restock');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const previousStock = product.countInStock;
  let newStock;

  if (type === 'set') {
    newStock = Math.max(0, Number(adjustment));
  } else if (type === 'adjust') {
    newStock = Math.max(0, previousStock + Number(adjustment));
  } else {
    newStock = previousStock + Math.abs(Number(adjustment));
  }

  product.countInStock = newStock;
  product.stockHistory.push({
    type,
    quantity: newStock - previousStock,
    previousStock,
    newStock,
    note: note || `Stock ${type}: ${adjustment}`,
    createdBy: req.user._id,
  });

  // Auto-update status based on stock
  if (newStock === 0) {
    product.status = 'out of stock';
  } else if (product.status === 'out of stock') {
    product.status = 'active';
  }

  await product.save();
  res.json(product);
});

// @desc    Get stock history for a product
// @route   GET /api/admin/inventory/:id/history
// @access  Private/Admin
const getStockHistory = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .select('name sku countInStock stockHistory')
    .populate('stockHistory.createdBy', 'name');

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json(product);
});

module.exports = {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getAnalytics,
  bulkUpdateStock,
  adjustStock,
  getStockHistory,
  getAllProducts,
};
