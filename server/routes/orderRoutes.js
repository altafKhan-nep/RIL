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
const { protect, admin } = require('../middleware/authMiddleware');
const ObjectId = require('mongoose').Types.ObjectId;

// Public tracking endpoint (no auth required)
router.get('/track/:orderId', asyncHandler(async (req, res) => {
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

  // Return with orderId field for frontend
  const orderObj = order.toObject();
  orderObj.orderId = order._id;

  res.json(orderObj);
}));

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/status').put(protect, admin, updateOrderStatus);
router.route('/:id/cancel').put(protect, cancelOrder);

module.exports = router;
