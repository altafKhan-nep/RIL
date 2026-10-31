const Order = require('../models/Order');
const { incrementStock } = require('./stockAudit');
const { processRefund } = require('./refunds');

/**
 * Status transitions are enforced in one place so the customer-facing order
 * routes and the admin routes can never disagree.
 */
const STATUS_TRANSITIONS = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery', 'Delivered'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

const CUSTOMER_CANCELLABLE = ['Pending', 'Processing'];
const ADMIN_CANCELLABLE = ['Pending', 'Processing', 'Shipped', 'Out for Delivery'];

/**
 * Atomically moves an order from `fromStatus` to `status`.
 *
 * The status is part of the update filter, so two concurrent requests cannot
 * both apply the same transition (previously both could pass the read-time
 * check and then double-restore stock on cancellation).
 */
const transitionOrder = async (orderId, fromStatus, status, updateOps) => {
  return Order.findOneAndUpdate(
    { _id: orderId, status: fromStatus },
    updateOps,
    { new: true }
  );
};

/**
 * Claims a cancellation and then performs the irreversible side effects exactly
 * once: inventory restoration and (for paid orders) a provider refund.
 *
 * `new: false` returns the pre-update document, which is what we need for the
 * item list and payment facts. The final document is re-read after the side
 * effects so the caller always sees the persisted state.
 */
const cancelOrderAtomically = async ({
  orderId,
  userId,
  allowedStatuses,
  reason,
  actorId,
  stockReason,
}) => {
  const now = new Date();
  const filter = { _id: orderId, status: { $in: allowedStatuses } };
  if (userId) filter.user = userId;

  const before = await Order.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'Cancelled',
        cancelledAt: now,
        cancelReason: reason,
      },
      $push: {
        statusHistory: { status: 'Cancelled', date: now, note: reason },
        trackingEvents: {
          status: 'Cancelled',
          timestamp: now,
          location: '',
          description: reason || 'Order has been cancelled',
          icon: 'cancel',
        },
      },
    },
    { new: false }
  );

  // Another request already cancelled it (or it is no longer cancellable).
  if (!before) return null;

  // Restore inventory through the audited helper. Because only the winner of
  // the atomic filter reaches this point, each item is restored exactly once.
  for (const item of before.orderItems || []) {
    await incrementStock(item.product, item.qty, stockReason, actorId);
  }

  const refundFields = {};
  if (before.isPaid) {
    const refundStatus = await processRefund(before, reason);
    refundFields.refundStatus = refundStatus;
    refundFields.refundedAmount = refundStatus === 'refunded' ? before.totalPrice : 0;
    refundFields.refundReason = before.refundReason || reason;
    if (before.refundId) refundFields.refundId = before.refundId;
    if (before.refundedAt) refundFields.refundedAt = before.refundedAt;
    if (refundStatus === 'refunded') refundFields.paymentStatus = 'refunded';
  }

  if (Object.keys(refundFields).length > 0) {
    await Order.updateOne({ _id: orderId }, { $set: refundFields });
  }

  return Order.findById(orderId);
};

module.exports = {
  STATUS_TRANSITIONS,
  CUSTOMER_CANCELLABLE,
  ADMIN_CANCELLABLE,
  transitionOrder,
  cancelOrderAtomically,
};
