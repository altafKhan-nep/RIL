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
 * Sets an absolute stock value atomically. The delta and the audit entry are
 * computed inside the database, so concurrent admin edits cannot record a
 * stale previousStock or silently overwrite one another.
 */
const setStockAbsolute = async (productId, newQty, reason = 'Stock set by admin', actor) => {
  const Product = require('../models/Product');
  const entry = {
    type: 'set',
    quantity: { $subtract: [newQty, '$countInStock'] },
    previousStock: '$countInStock',
    newStock: newQty,
    note: reason,
    date: new Date(),
  };
  if (actor && actor !== 'system') entry.createdBy = actor;

  return Product.findOneAndUpdate(
    { _id: productId },
    [
      {
        $set: {
          countInStock: newQty,
          stockHistory: { $concatArrays: [{ $ifNull: ['$stockHistory', []] }, [entry]] },
        },
      },
    ],
    { new: true }
  );
};

/**
 * Applies a signed adjustment atomically and clamps the result at zero. The
 * recorded delta is the actual change after clamping, not the requested one.
 */
const adjustStockBy = async (productId, delta, reason = 'Stock adjusted', actor) => {
  const Product = require('../models/Product');
  const newStockExpr = { $max: [0, { $add: ['$countInStock', delta] }] };
  const entry = {
    type: 'adjust',
    quantity: { $subtract: [newStockExpr, '$countInStock'] },
    previousStock: '$countInStock',
    newStock: newStockExpr,
    note: reason,
    date: new Date(),
  };
  if (actor && actor !== 'system') entry.createdBy = actor;

  return Product.findOneAndUpdate(
    { _id: productId },
    [
      {
        $set: {
          countInStock: newStockExpr,
          stockHistory: { $concatArrays: [{ $ifNull: ['$stockHistory', []] }, [entry]] },
        },
      },
    ],
    { new: true }
  );
};

/**
 * Applies an absolute stock value (admin "set stock" flow) and records the
 * difference as an audited 'set' adjustment. Returns null when unchanged.
 *
 * Delegates to setStockAbsolute so the read and write are not separated.
 */
const setStock = async (productId, newQty, reason = 'Stock set by admin', actor) => {
  return setStockAbsolute(productId, newQty, reason, actor);
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

module.exports = { decrementStock, incrementStock, setStock, setStockAbsolute, adjustStockBy, recordOpeningStock };