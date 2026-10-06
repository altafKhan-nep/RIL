// Issues a Stripe refund for a paid order when a payment provider is available.
// Returns 'refunded' | 'pending' | 'failed'. When no provider is configured we
// must NOT claim a refund happened, so we report 'pending' rather than 'refunded'.
const processRefund = async (order, reason) => {
  if (!order.isPaid) return 'none';
  const stripe = require('../config/stripe');

  if (!stripe) {
    // No payment provider configured — flag for manual reconciliation.
    order.refundStatus = 'pending';
    return 'pending';
  }

  if (!order.paymentIntentId) {
    order.refundStatus = 'failed';
    order.refundReason = `Refund failed: order has no payment intent (${reason})`;
    return 'failed';
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: Math.round(order.totalPrice * 100),
      reason: 'requested_by_customer',
    });
    order.refundId = refund.id;
    order.refundedAt = Date.now();
    return 'refunded';
  } catch (err) {
    order.refundStatus = 'failed';
    order.refundReason = `Refund failed: ${err.message}`;
    return 'failed';
  }
};

module.exports = { processRefund };
