/**
 * Auditable inventory helpers.
 *
 * Every stock mutation appends a Product.stockHistory entry recording the
 * previous value, the signed delta, the new value, a reason and the actor.
 *
 * The mutation and the audit entry are performed in a SINGLE atomic
 * aggregation-pipeline update. A read-then-write approach is NOT used: under
 * concurrency the reads interleave, so the recorded previousStock values were
 * inconsistent with the real sequence (verified: several entries all reported
 * the same starting stock). Inside one pipeline `$set`, `$countInStock` is
 * evaluated against the pre-update document, so previousStock/newStock are
 * always exact and the audit trail can be reconstructed.
 *
 * Field names must match Product.stockHistory in models/Product.js:
 *   type / quantity / previousStock / newStock / note / createdBy / date
 * Mongoose silently drops unknown keys, so this contract is enforced here.
 */

const TYPE_BY_REASON = {
  'Order placed': 'order',
  'Stock restored: order cancelled': 'cancel',
  'Stock restored: order cancelled by admin': 'cancel',
  'Rollback: promotion limit reached': 'cancel',
  'Rollback: order creation failed': 'cancel',
  'Rollback: order save failed': 'cancel',
};

/**
 * Builds the pipeline that applies `delta` to countInStock and appends the
 * matching audit entry in the same atomic operation.
 */
const buildStockPipeline = (delta, reason, actor) => {
  const entry = {
    type: TYPE_BY_REASON[reason] || 'adjust',
    quantity: delta,
    // Evaluated against the pre-update document.
    previousStock: '$countInStock',
    newStock: { $add: ['$countInStock', delta] },
    note: reason,
    date: new Date(),
  };
  if (actor && actor !== 'system') entry.createdBy = actor;

  return [
    {
      $set: {
        countInStock: { $add: ['$countInStock', delta] },
        stockHistory: { $concatArrays: [{ $ifNull: ['$stockHistory', []] }, [entry]] },
      },
    },
  ];
};

/**
 * Atomically decrements stock with a negative-stock guard and records history.
 * Returns the updated product, or null when stock was insufficient.
 */
const decrementStock = async (productId, qty, reason, actor) => {
  const Product = require('../models/Product');
  const updated = await Product.findOneAndUpdate(
    { _id: productId, countInStock: { $gte: qty } },
    buildStockPipeline(-qty, reason, actor),
    { new: true }
  );
  return updated || null;
};

/**
 * Atomically increments stock and records history.
 */
const incrementStock = async (productId, qty, reason, actor) => {
  const Product = require('../models/Product');
  const updated = await Product.findOneAndUpdate(
    { _id: productId },
    buildStockPipeline(qty, reason, actor),
    { new: true }
  );
  return updated || null;
};

/**
 * Applies an absolute stock value (admin "set stock" flow) and records the
 * difference as an audited 'set' adjustment. Returns null when unchanged.
 */
const setStock = async (productId, newQty, reason = 'Stock set by admin', actor) => {
  const Product = require('../models/Product');
  const before = await Product.findById(productId).select('countInStock').lean();
  if (!before) return null;
  const delta = newQty - before.countInStock;
  if (delta === 0) return null;
  return incrementStock(productId, delta, reason, actor);
};

/**
 * Records the opening balance of a newly created product WITHOUT changing
 * stock. Append-only, so the audit trail starts from the real baseline.
 */
const recordOpeningStock = async (productId, qty, actor) => {
  const Product = require('../models/Product');
  if (!qty) return;
  const entry = {
    type: 'set',
    quantity: qty,
    previousStock: 0,
    newStock: qty,
    note: 'Opening stock',
    date: new Date(),
  };
  if (actor && actor !== 'system') entry.createdBy = actor;
  await Product.updateOne(
    { _id: productId },
    [{ $set: { stockHistory: { $concatArrays: [{ $ifNull: ['$stockHistory', []] }, [entry]] } } }]
  );
};

module.exports = { decrementStock, incrementStock, setStock, recordOpeningStock };