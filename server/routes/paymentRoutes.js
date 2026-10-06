const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const stripeConfig = require('../config/stripe');

/**
 * Card payments flow:
 *
 *   1. POST /api/orders                -> create the order (isPaid=false)
 *   2. POST /api/payments/create-intent -> bind an intent to that orderId
 *   3. Stripe.js confirms with the clientSecret
 *   4. POST /api/payments/confirm       -> verify with Stripe, then mark paid
 *   5. POST /api/payments/webhook       -> authoritative confirmation, always on
 *
 * The order must exist before an intent can be bound to it, so the client
 * creates the order first. The amount is always the server-authoritative
 * order total; nothing financial is accepted from the client.
 */

// @desc    Public payment configuration for the browser
// @route   GET /api/payments/config
// @access  Public
// Tells the frontend whether card payments are available and supplies the
// publishable key, so enabling Stripe never requires a frontend rebuild.
router.get('/config', asyncHandler(async (req, res) => {
  const enabled = stripeConfig.isPaymentsEnabled();
  res.json({
    enabled,
    publishableKey: enabled ? stripeConfig.publishableKey() : null,
    currency: stripeConfig.resolveCurrency(),
    liveMode: stripeConfig.isLiveMode(),
    webhookConfigured: stripeConfig.isWebhookConfigured(),
    // A missing webhook secret means payments succeed but the order is only
    // marked paid by /confirm, so the UI can warn an administrator.
    reasons: {
      missingSecretKey: !stripeConfig.isSecretConfigured(),
      missingPublishableKey: !stripeConfig.isPublishableConfigured(),
      missingWebhookSecret: !stripeConfig.isWebhookConfigured(),
    },
  });
}));

// @desc    Create Stripe payment intent for an existing order
// @route   POST /api/payments/create-intent
// @access  Private
router.post('/create-intent', protect, asyncHandler(async (req, res) => {
  const stripe = stripeConfig.getStripe();
  if (!stripe) {
    res.status(503);
    throw new Error('Card payments are not configured on this server');
  }

  const { orderId } = req.body;
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
  if (order.status === 'Cancelled') {
    res.status(400);
    throw new Error('Order was cancelled');
  }
  if (!order.totalPrice || order.totalPrice <= 0) {
    res.status(400);
    throw new Error('Order total is invalid');
  }

  const currency = stripeConfig.resolveCurrency();

  // Reuse a live intent from an earlier attempt so a double click or a refresh
  // cannot create duplicate charges.
  if (order.paymentIntentId) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      const reusable = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing']
        .includes(existing.status);
      if (reusable && existing.amount === Math.round(order.totalPrice * 100)) {
        return res.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          reused: true,
        });
      }
    } catch {
      // The intent no longer exists at Stripe; fall through and create a new one.
    }
  }

  const amount = Math.round(order.totalPrice * 100);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
    },
    // Idempotency key scoped to this order: a retried request cannot double-charge.
    { idempotencyKey: `order-${order._id}-${order.totalPrice}-${currency}` }
  );

  // Bind the intent to the order so confirmation is authoritative.
  order.paymentIntentId = paymentIntent.id;
  await order.save();

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency,
    reused: false,
  });
}));

// @desc    Confirm a Stripe payment and mark the order paid
// @route   POST /api/payments/confirm
// @access  Private
router.post('/confirm', protect, asyncHandler(async (req, res) => {
  const stripe = stripeConfig.getStripe();
  if (!stripe) {
    res.status(503);
    throw new Error('Card payments are not configured on this server');
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
  // Amounts can agree while the currency differs; a wrong-currency charge must
  // never be treated as satisfying a USD order.
  if (paymentIntent.currency && paymentIntent.currency !== stripeConfig.resolveCurrency()) {
    res.status(400);
    throw new Error('Payment currency does not match the store currency');
  }

  // Idempotent: an already-paid order stays paid with its original timestamp.
  if (order.isPaid) {
    return res.json(order);
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentIntentId = paymentIntentId;
  order.paymentStatus = 'paid';
  const updatedOrder = await order.save();
  res.json(updatedOrder);
}));

// @desc    Stripe webhook - authoritative payment state changes
// @route   POST /api/payments/webhook
// @access  Public (verified by Stripe signature)
router.post('/webhook', asyncHandler(async (req, res) => {
  const secret = stripeConfig.webhookSecret();
  if (!secret) {
    res.status(503);
    throw new Error('Stripe webhook secret is not configured');
  }

  // Signature verification MUST use the exact raw bytes Stripe signed. The
  // global express.json() in server.js stashes them on req.rawBody.
  if (!Buffer.isBuffer(req.rawBody)) {
    res.status(400);
    throw new Error('Webhook requires the raw request body for signature verification');
  }

  const stripe = stripeConfig.getStripe();
  if (!stripe) {
    res.status(503);
    throw new Error('Stripe is not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    res.status(400);
    throw new Error('Invalid webhook signature');
  }

  const intent = event.data && event.data.object;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const orderId = intent.metadata && intent.metadata.orderId;
      if (orderId) {
        // isPaid:false keeps this idempotent under Stripe's retries.
        await Order.findOneAndUpdate(
          { _id: orderId, paymentIntentId: intent.id, isPaid: false },
          { $set: { isPaid: true, paidAt: new Date(), paymentStatus: 'paid' } },
          { new: true }
        );
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const orderId = intent.metadata && intent.metadata.orderId;
      if (orderId) {
        await Order.updateOne(
          { _id: orderId, isPaid: false },
          {
            $set: {
              paymentStatus: 'failed',
              paymentError: (intent.last_payment_error && intent.last_payment_error.message) || 'Payment failed',
            },
          }
        );
      }
      break;
    }

    case 'charge.refunded': {
      // Reflect the refund so admin revenue figures exclude returned money.
      const intentId = intent.payment_intent;
      await Order.findOneAndUpdate(
        { paymentIntentId: intentId },
        {
          $set: {
            refundStatus: 'refunded',
            refundedAt: new Date(),
            refundedAmount: Math.round(((intent.amount_refunded || 0)) / 100 * 100) / 100,
            refundReason: 'Refund issued via Stripe',
            paymentStatus: 'refunded',
          },
        },
        { new: true }
      );
      break;
    }

    case 'charge.dispute.created': {
      const intentId = intent.payment_intent;
      await Order.updateOne(
        { paymentIntentId: intentId },
        {
          $set: {
            refundStatus: 'disputed',
            paymentStatus: 'disputed',
            refundReason: intent.reason || 'Charge disputed',
          },
        }
      );
      break;
    }

    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break;
  }

  res.json({ received: true, type: event.type });
}));

module.exports = router;