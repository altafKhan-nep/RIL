const Order = require('../models/Order');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const asyncHandler = require('../utils/asyncHandler');
const { validateOrder } = require('../middleware/validationMiddleware');
const { computePricing } = require('../utils/pricing');
const { decrementStock, incrementStock } = require('../utils/stockAudit');
const { recomputeCategoryCount } = require('../utils/categoryCounts');
const { processRefund } = require('../utils/refunds');


// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
  const validation = validateOrder(req.body);
  if (!validation.isValid) {
    res.status(400);
    throw new Error(validation.errors.join(', '));
  }

  const { orderItems, shippingAddress, paymentMethod, promoCode, notes, idempotencyKey } = req.body;

  // Idempotency: reject duplicate order submissions with the same key.
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) {
      res.status(200);
      return res.json(existing);
    }
  }

  // Validate products exist and stock is available. Price is ALWAYS read
  // from the database — client-supplied prices are never trusted.
  const validatedItems = [];
  const orderCategories = [];
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(400);
      throw new Error(`Product not found: ${item.name}`);
    }
    if (product.status === 'draft') {
      res.status(400);
      throw new Error(`"${product.name}" is not available for purchase`);
    }
    if (product.countInStock < item.qty) {
      res.status(400);
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.countInStock}, requested: ${item.qty}`);
    }
    validatedItems.push({
      name: product.name,
      qty: item.qty,
      image: product.images?.[0] || item.image || 'https://via.placeholder.com/400x400',
      price: product.price,
      product: product._id,
    });
    orderCategories.push(product.category);
  }

  // Server-authoritative pricing. Client financial fields are ignored.
  const pricing = await computePricing(validatedItems, promoCode, req.user._id);

  // Decrement stock atomically with negative-stock guard, recording an
  // auditable stockHistory entry for every mutation.
  const decremented = [];
  for (const item of validatedItems) {
    const result = await decrementStock(item.product, item.qty, 'Order placed', req.user._id);
    if (!result) {
      for (const prev of decremented) {
        await incrementStock(prev.product, prev.qty, 'Rollback: order creation failed', 'system');
      }
      res.status(400);
      throw new Error(`Stock changed for "${item.name}". Please try again.`);
    }
    decremented.push(item);
  }

  const method = paymentMethod || 'COD';

  const order = new Order({
    orderItems: validatedItems,
    user: req.user._id,
    shippingAddress,
    paymentMethod: method,
    itemsPrice: pricing.itemsPrice,
    taxPrice: pricing.taxPrice,
    shippingPrice: pricing.shippingPrice,
    discountPrice: pricing.discountPrice,
    totalPrice: pricing.totalPrice,
    promoCode: (promoCode || '').toUpperCase(),
    notes: notes || '',
    idempotencyKey: idempotencyKey || '',
    status: 'Pending',
    statusHistory: [{ status: 'Pending', date: Date.now(), note: 'Order placed' }],
    trackingEvents: [{
      status: 'Order Placed',
      timestamp: Date.now(),
      location: shippingAddress.city || '',
      description: 'Your order has been placed successfully',
      icon: 'receipt',
    }],
    shippingOrigin: {
      // Configured warehouse origin. Previously hardcoded to Mumbai, India,
      // which contradicted the store's configured currency/region (USD).
      city: process.env.WAREHOUSE_CITY || 'Newark',
      state: process.env.WAREHOUSE_STATE || 'NJ',
      country: process.env.WAREHOUSE_COUNTRY || 'US',
    },
    shippingDestination: {
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      country: shippingAddress.country || process.env.WAREHOUSE_COUNTRY || 'US',
    },
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    // Payment is NEVER auto-marked as paid. It becomes paid only through
    // authoritative payment verification (webhook / verified confirmation).
    isPaid: false,
    paidAt: undefined,
  });

  let createdOrder;
  try {
    createdOrder = await order.save();
  } catch (err) {
    for (const item of decremented) {
      await incrementStock(item.product, item.qty, 'Rollback: order save failed', 'system');
    }
    throw err;
  }

  // Keep stored category counts accurate after a sale.
  for (const cat of new Set(orderCategories.filter(Boolean))) {
    await recomputeCategoryCount(cat);
  }

  // Atomically increment promo usage only after the order is committed.
  if (pricing.promotion) {
    const incResult = await Promotion.findOneAndUpdate(
      { _id: pricing.promotion._id, $or: [{ usageLimit: 0 }, { usedCount: { $lt: pricing.promotion.usageLimit } }] },
      { $inc: { usedCount: 1 }, $addToSet: { usedByUsers: req.user._id } },
      { new: true }
    );
    if (!incResult) {
      // Rollback: restore stock and mark order as failed.
      for (const item of decremented) {
        await incrementStock(item.product, item.qty, 'Rollback: promotion limit reached', 'system');
      }
      await Order.findByIdAndDelete(createdOrder._id);
      res.status(400);
      throw new Error('This promotion has reached its usage limit');
    }
  }

  res.status(201).json(createdOrder);
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (order) {
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdminRole()) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdminRole()) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  // Require authoritative payment evidence: a Stripe payment intent that
  // actually succeeded AND is bound to this exact order.
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    res.status(400);
    throw new Error('paymentIntentId is required to mark an order as paid');
  }
  if (order.paymentIntentId && order.paymentIntentId !== paymentIntentId) {
    res.status(400);
    throw new Error('Payment intent does not match this order');
  }

  const stripe = require('../config/stripe');
  if (!stripe) {
    res.status(503);
    throw new Error('Payment provider is not configured');
  }

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    res.status(400);
    throw new Error('Invalid payment intent');
  }

  if (intent.metadata && intent.metadata.orderId && intent.metadata.orderId !== order._id.toString()) {
    res.status(400);
    throw new Error('Payment intent belongs to a different order');
  }
  if (intent.status !== 'succeeded') {
    res.status(400);
    throw new Error(`Payment not completed (status: ${intent.status})`);
  }
  // The amount charged must equal the authoritative server order total.
  if (Math.round(intent.amount / 100 * 100) / 100 !== Math.round(order.totalPrice * 100) / 100) {
    res.status(400);
    throw new Error('Payment amount does not match order total');
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentIntentId = paymentIntentId;
  const updatedOrder = await order.save();
  res.json(updatedOrder);
};

// @desc    Get logged in user orders — paginated
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
  const filter = { user: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page, pages: Math.ceil(total / pageSize) || 1, pageSize });
};

// @desc    Get all orders (admin) — paginated
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'id name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Order.countDocuments(filter),
  ]);

  res.json({
    orders,
    total,
    page,
    pages: Math.ceil(total / pageSize) || 1,
    pageSize,
  });
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
  const { status, note } = req.body;

  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const statusTransitions = {
    Pending: ['Processing', 'Cancelled'],
    Processing: ['Shipped', 'Cancelled'],
    Shipped: ['Out for Delivery', 'Delivered'],
    'Out for Delivery': ['Delivered'],
    Delivered: [],
    Cancelled: [],
  };

  const allowed = statusTransitions[order.status] || [];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(`Cannot transition from "${order.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`);
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
    // Refund a paid order. Cancelled / Paid / Refunded stay independent facts.
    if (order.isPaid) {
      const refundStatus = await processRefund(order, note || 'Cancelled by admin');
      updatedOrder.refundStatus = refundStatus;
      updatedOrder.refundedAmount = refundStatus === 'refunded' ? order.totalPrice : 0;
      updatedOrder.refundReason = note || 'Cancelled by admin';
      await updatedOrder.save();
    }
    // Restore stock exactly once. The transition guard above already prevents a
    // second cancellation of the same order, so this cannot double-restore.
    for (const item of order.orderItems) {
      await incrementStock(item.product, item.qty, 'Stock restored: order cancelled', req.user._id);
    }
  }

  res.json(updatedOrder);
};

// @desc    Cancel order (user)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  const cancelableStatuses = ['Pending', 'Processing'];
  if (!cancelableStatuses.includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel order with status "${order.status}". Only Pending or Processing orders can be cancelled.`);
  }

  // Refund a paid order before marking it cancelled, so we never represent an
  // order as cancelled while money is still held. Cancelled / Paid / Refunded
  // are tracked as independent facts.
  let refundStatus = 'none';
  let refundedAmount = 0;
  let refundReason = '';
  if (order.isPaid) {
    refundStatus = await processRefund(order, req.body.reason || 'Cancelled by customer');
    refundedAmount = refundStatus === 'refunded' ? order.totalPrice : 0;
    refundReason = req.body.reason || 'Cancelled by customer';
  }

  order.status = 'Cancelled';
  order.cancelledAt = Date.now();
  order.cancelReason = req.body.reason || 'Cancelled by customer';
  order.refundStatus = refundStatus;
  order.refundedAmount = refundedAmount;
  order.refundReason = refundReason;
  order.statusHistory.push({
    status: 'Cancelled',
    date: Date.now(),
    note: req.body.reason || 'Cancelled by customer',
  });

  // Restore stock through the audited helper so every movement is recorded.
  for (const item of order.orderItems) {
    await incrementStock(item.product, item.qty, 'Stock restored: order cancelled', req.user._id);
  }

  const updatedOrder = await order.save();
  res.json(updatedOrder);
};

module.exports = {
  addOrderItems: asyncHandler(addOrderItems),
  getOrderById: asyncHandler(getOrderById),
  updateOrderToPaid: asyncHandler(updateOrderToPaid),
  getMyOrders: asyncHandler(getMyOrders),
  getOrders: asyncHandler(getOrders),
  updateOrderStatus: asyncHandler(updateOrderStatus),
  cancelOrder: asyncHandler(cancelOrder),
};
