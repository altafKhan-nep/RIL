const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protect, requirePermission } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../models/User');
const ObjectId = require('mongoose').Types.ObjectId;

// Order tracking — requires authentication and order ownership.
router.get('/track/:orderId', protect, asyncHandler(async (req, res) => {
  if (!ObjectId.isValid(req.params.orderId)) {
    return res.status(400).json({ message: 'Invalid order ID format' });
  }

  const order = await Order.findById(req.params.orderId)
    .select('orderItems shippingAddress status trackingNumber shippingPartner trackingUrl estimatedDelivery trackingEvents statusHistory createdAt shippingOrigin shippingDestination totalPrice itemsPrice shippingPrice taxPrice')
    .populate('orderItems.product', 'name images');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ownership check: only the order owner or an admin may track it.
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdminRole()) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  const orderObj = order.toObject();
  orderObj.orderId = order._id;

  res.json(orderObj);
}));

router.route('/').post(protect, addOrderItems).get(protect, requirePermission(PERMISSIONS.ORDERS_VIEW), getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/status').put(protect, requirePermission(PERMISSIONS.ORDERS_EDIT), updateOrderStatus);
router.route('/:id/cancel').put(protect, cancelOrder);

module.exports = router;
