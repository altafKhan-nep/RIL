const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * Recomputes stored Category.productCount from the authoritative Product
 * collection so the persisted count always matches the real number of
 * publicly-purchasable products in that category.
 *
 * Product uses `status` (active | draft | out of stock) — there is no
 * `isActive` field on Product, so drafts must be excluded explicitly.
 */
const recomputeCategoryCount = async (categoryName) => {
  if (!categoryName) return;
  const count = await Product.countDocuments({ category: categoryName, status: { $ne: 'draft' } });
  await Category.updateMany({ name: categoryName }, { $set: { productCount: count } });
};

/** Recompute counts for many categories in one pass. */
const recomputeCategoryCounts = async (categoryNames) => {
  const names = [...new Set((categoryNames || []).filter(Boolean))];
  if (!names.length) return;
  const rows = await Product.aggregate([
    { $match: { status: { $ne: 'draft' } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => {
    if (r._id) map[r._id] = r.count;
  });
  for (const n of names) {
    await Category.updateMany({ name: n }, { $set: { productCount: map[n] || 0 } });
  }
};

module.exports = { recomputeCategoryCount, recomputeCategoryCounts };