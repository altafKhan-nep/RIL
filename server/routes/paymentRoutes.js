const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// @desc    Create Stripe payment intent
// @route   POST /api/payments/create-intent
// @access  Private
router.post('/create-intent', protect, asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const { amount, currency = 'usd', orderId } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Invalid amount');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: {
      orderId: orderId || '',
      userId: req.user._id.toString(),
    },
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}));

// @desc    Confirm Stripe payment
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

  res.json({
    status: paymentIntent.status,
    id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
  });
}));

module.exports = router;
