const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// @desc    Create Stripe payment intent for an order
// @route   POST /api/payments/create-intent
// @access  Private
// The amount is ALWAYS the server-authoritative order total. Client-supplied
// amounts are ignored.
router.post('/create-intent', protect, asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const { orderId, currency = 'usd' } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error('orderId is required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdminRole()) {
    res.status(403);
    throw new Error('Not authorized to pay for this order');
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }
  if (!order.totalPrice || order.totalPrice <= 0) {
    res.status(400);
    throw new Error('Order total is invalid');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
    },
  });

  // Bind the payment intent to the order so confirmation is authoritative.
  order.paymentIntentId = paymentIntent.id;
  await order.save();

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}));

// @desc    Confirm Stripe payment and mark order paid
// @route   POST /api/payments/confirm
// @access  Private
router.post('/confirm', protect, asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    res.status(400);
    throw new Error('Payment intent ID required');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // The payment intent must belong to the requesting user.
  if (paymentIntent.metadata && paymentIntent.metadata.userId
      && paymentIntent.metadata.userId !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Payment intent does not belong to you');
  }
  if (paymentIntent.status !== 'succeeded') {
    res.status(400);
    throw new Error(`Payment not completed (status: ${paymentIntent.status})`);
  }

  const orderId = paymentIntent.metadata && paymentIntent.metadata.orderId;
  const order = orderId ? await Order.findById(orderId) : null;
  if (!order) {
    res.status(404);
    throw new Error('Order not found for this payment');
  }
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdminRole()) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }
  // The amount charged must equal the authoritative server order total.
  if (Math.round(paymentIntent.amount / 100 * 100) / 100 !== Math.round(order.totalPrice * 100) / 100) {
    res.status(400);
    throw new Error('Payment amount does not match order total');
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentIntentId = paymentIntentId;
  const updatedOrder = await order.save();
  res.json(updatedOrder);
}));

// @desc    Stripe webhook — authoritative payment confirmation
// @route   POST /api/payments/webhook
// @access  Public (verified by Stripe signature)
router.post('/webhook', asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503);
    throw new Error('Stripe webhook secret is not configured');
  }

  // Signature verification MUST use the exact raw bytes Stripe signed. The
  // global express.json() in server.js stashes them on req.rawBody.
  const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}));
  if (!Buffer.isBuffer(req.rawBody)) {
    res.status(400);
    throw new Error('Webhook requires the raw request body for signature verification');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    res.status(400);
    throw new Error('Invalid webhook signature');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const orderId = intent.metadata && intent.metadata.orderId;
    if (orderId) {
      await Order.findOneAndUpdate(
        { _id: orderId, paymentIntentId: intent.id, isPaid: false },
        { isPaid: true, paidAt: Date.now() },
        { new: true }
      );
    }
  }

  res.json({ received: true });
}));

module.exports = router;