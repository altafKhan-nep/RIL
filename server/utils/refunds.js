// Issues a Stripe refund for a paid order when a payment provider is available.
// Returns 'refunded' | 'pending' | 'failed' | 'none'.
//
// A refund is only ever reported as 'refunded' when Stripe confirmed it.
// When no provider is configured we must NOT claim a refund happened, so we
// report 'pending' and leave it for manual reconciliation.
const processRefund = async (order, reason) => {
  if (!order.isPaid) return 'none';

  const stripeConfig = require('../config/stripe');
  const stripe = stripeConfig.getStripe();

  if (!stripe) {
    // No payment provider configured — flag for manual reconciliation.
    order.refundStatus = 'pending';
    order.refundReason = `Refund pending: no payment provider configured (${reason})`;
    return 'pending';
  }

  if (!order.paymentIntentId) {
    // Cash/other method: no provider refund exists to issue.
    order.refundStatus = 'pending';
    order.refundReason = `Manual refund required: no payment intent (${reason})`;
    return 'pending';
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.paymentIntentId,
        amount: Math.round(order.totalPrice * 100),
        reason: 'requested_by_customer',
        metadata: { orderId: order._id ? order._id.toString() : undefined },
      },
      // Prevents a double refund if the request is retried.
      { idempotencyKey: `refund-${order._id}-${order.totalPrice}` }
    );

    order.refundId = refund.id;
    order.refundedAt = Date.now();
    order.refundStatus = 'refunded';
    order.refundedAmount = Math.round(order.totalPrice * 100) / 100;
    order.paymentStatus = 'refunded';
    return 'refunded';
  } catch (err) {
    // Stripe validation failures are permanent; transient ones are worth a retry.
    const permanent = err && err.type === 'StripeInvalidRequestError';
    order.refundStatus = 'failed';
    order.refundReason = `Refund failed${permanent ? '' : ' (retry may succeed)'}: ${err.message}`;
    return 'failed';
  }
};

module.exports = { processRefund };