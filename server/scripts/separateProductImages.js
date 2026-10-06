#!/usr/bin/env node
/**
 * Separate product images from category images.
 *
 * Production stored some product images under the same path as a category
 * image. Because the storefront resolves both from the same asset path,
 * updating a product image also changed the category's imagery (and vice
 * versa). This script gives every product its own asset path and leaves the
 * category pointing at the original file.
 *
 * Safe by default: it reports what it would do and writes nothing.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." node scripts/separateProductImages.js
 *   MONGO_URI="mongodb+srv://..." node scripts/separateProductImages.js --apply
 *
 * Options:
 *   --dry-run          force a report-only pass (default)
 *   --apply            perform the migration
 *   --allow-local      permit a non-srv/localhost URI (blocked by default)
 *   --no-copy-assets   rewrite DB paths without copying files on disk
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_LOCAL = args.includes('--allow-local');
const COPY_ASSETS = !args.includes('--no-copy-assets');

const ROOT = path.resolve(__dirname, '..', '..');
const ASSET_DIRS = [
  path.join(ROOT, 'client', 'public', 'uploads'),
  path.join(ROOT, 'server', 'uploads'),
];

const fail = (msg) => {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) fail('MONGO_URI is required. Refusing to guess a database.');
if (!/^mongodb\+srv:\/\//.test(MONGO_URI) && !ALLOW_LOCAL) {
  fail(
    'MONGO_URI is not an Atlas (srv) connection string. This script rewrites ' +
      'production data; pass --allow-local if this really is a local database.'
  );
}
if (!process.argv.includes('--apply') === !APPLY) {
  // no-op; kept for clarity of the default-dry-run contract
}

const normalise = (p) => (p || '').replace(/^\/+/, '');
const extOf = (p) => path.extname(p || '') || '.avif';

// Stored image paths keep a leading slash (e.g. /uploads/x.avif); the new
// product-specific path must match that convention so <img src> resolves.
const withLeadingSlash = (rel) => `/${normalise(rel)}`;

/**
 * Stored paths look like "/uploads/foo.avif" while ASSET_DIRS already point at
 * an uploads directory, so the leading "uploads/" segment must be stripped or
 * the lookup resolves to ".../uploads/uploads/foo.avif".
 */
const assetRelative = (p) => normalise(p).replace(/^uploads[\\/]/, '');

/**
 * Finds the on-disk asset for a stored path, if present in either uploads dir.
 */
const findAsset = (relPath) => {
  const rel = assetRelative(relPath);
  if (!rel || rel.includes('..')) return null;
  for (const dir of ASSET_DIRS) {
    const full = path.join(dir, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
};

const copyAsset = (from, dir, relPath) => {
  const dest = path.join(dir, assetRelative(relPath));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
  return dest;
};

(async () => {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN (no changes will be written)'}`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  console.log(`Connected: ${db.databaseName}\n`);

  const categories = await db.collection('categories').find({}, { projection: { name: 1, slug: 1, image: 1 } }).toArray();
  const categoryImages = new Map();
  for (const c of categories) {
    if (c.image) categoryImages.set(normalise(c.image), c);
  }
  console.log(`Categories with an image: ${categoryImages.size}`);

  const products = await db.collection('products').find({}, { projection: { name: 1, slug: 1, images: 1 } }).toArray();

  const plan = [];
  for (const p of products) {
    const images = Array.isArray(p.images) ? p.images : [];
    let changed = false;
    const next = images.map((img) => {
      const rel = normalise(img);
      const clash = categoryImages.get(rel);
      if (!clash) return img;
      const newRel = withLeadingSlash(`uploads/products/${p.slug || p._id.toString()}${extOf(img)}`);
      if (normalise(newRel) !== rel) changed = true;
      plan.push({
        product: p.name,
        slug: p.slug,
        oldPath: img,
        newPath: newRel,
        category: clash.name,
        assetFound: !!findAsset(rel),
      });
      return newRel;
    });
    if (changed) plan[plan.length - 1].__next = next;
  }

  // Group by product for clean output.
  const byProduct = new Map();
  for (const item of plan) {
    if (!byProduct.has(item.product)) byProduct.set(item.product, []);
    byProduct.get(item.product).push(item);
  }

  if (byProduct.size === 0) {
    console.log('\nNo collisions found. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`\nColliding product images: ${plan.length} across ${byProduct.size} product(s)\n`);
  for (const [name, items] of byProduct) {
    console.log(`  ${name}`);
    for (const it of items) {
      console.log(`    ${it.oldPath}`);
      console.log(`      -> ${it.newPath}   (shares a path with category "${it.category}"${it.assetFound ? '' : ' — asset not found on disk'})`);
    }
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to perform these changes.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let copied = 0;
  let missing = 0;
  if (COPY_ASSETS) {
    for (const it of plan) {
      const src = findAsset(it.oldPath);
      if (!src) {
        console.warn(`  WARNING: no local asset for ${it.oldPath} (${it.product}).`);
        console.warn('    The DB path was still updated; copy the file into client/public/uploads/ before deploying.');
        missing += 1;
        continue;
      }
      for (const dir of ASSET_DIRS) {
        const dest = path.join(dir, assetRelative(it.newPath));
        if (fs.existsSync(dest)) continue;
        copyAsset(src, dir, it.newPath);
        copied += 1;
      }
    }
    console.log(`\nCopied ${copied} asset file(s); ${missing} could not be resolved locally.`);
  }

  let updated = 0;
  for (const [name, items] of byProduct) {
    const slug = items[0].slug;
    const next = items[items.length - 1].__next;
    if (!next) continue;
    const res = await db.collection('products').updateOne({ slug }, { $set: { images: next } });
    if (res.modifiedCount) updated += 1;
    console.log(`  updated ${name} (${res.modifiedCount ? 'ok' : 'unchanged'})`);
  }

  console.log(`\nMigration complete. Products updated: ${updated}.`);
  console.log('Reminder: deploy the client so the new asset paths are served, and verify a category tile visually.');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});