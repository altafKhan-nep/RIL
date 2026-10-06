#!/usr/bin/env node
/**
 * Import a storefront catalog without touching anything else.
 *
 * This exists because the bundled seed script is destructive: it deleteMany()s
 * users, orders and settings. Running it against production would delete your
 * admin accounts and branding and then insert 112 unrelated demo products.
 *
 * This importer only ever writes to categories and products. It upserts by
 * slug, so re-running it is safe and will not create duplicates.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://…" node scripts/importCatalog.js --file catalog.json
 *   MONGO_URI="mongodb+srv://…" node scripts/importCatalog.js --file catalog.json --dry-run
 *
 * Options:
 *   --file      required. JSON: { categories: [...], products: [...] }
 *   --dry-run   validate and report, write nothing
 *   --replace   overwrite existing documents matched by slug (default: skip)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? null : args[i + 1];
};
const DRY_RUN = args.includes('--dry-run');
const REPLACE = args.includes('--replace');

const fail = (msg) => {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) fail('MONGO_URI is required. Refusing to guess a database.');
if (!/^mongodb(\+srv)?:\/\//.test(MONGO_URI)) fail('MONGO_URI does not look like a MongoDB connection string.');

const file = flag('file');
if (!file) fail('--file is required.');
if (!fs.existsSync(file)) fail(`File not found: ${file}`);

let payload;
try {
  payload = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
} catch (err) {
  fail(`Could not parse ${file}: ${err.message}`);
}

const categories = Array.isArray(payload.categories) ? payload.categories : [];
const products = Array.isArray(payload.products) ? payload.products : [];
if (!categories.length && !products.length) fail('File contains no categories or products.');

// --- Validate before touching the database -------------------------------
const problems = [];
const norm = (v) => String(v || '').trim();

const cleanCategories = categories.map((c, i) => {
  const name = norm(c.name);
  if (!name) problems.push(`categories[${i}] missing name`);
  if (!norm(c.slug)) problems.push(`categories[${i}] ("${name}") missing slug`);
  return { ...c, name, slug: norm(c.slug) };
});

const cleanProducts = products.map((p, i) => {
  const name = norm(p.name);
  if (!name) problems.push(`products[${i}] missing name`);
  if (!norm(p.slug)) problems.push(`products[${i}] ("${name}") missing slug`);
  if (!(Number(p.price) > 0)) problems.push(`products[${i}] ("${name}") price must be a positive number`);
  if (!norm(p.category)) problems.push(`products[${i}] ("${name}") missing category`);
  if (!Array.isArray(p.images) || !p.images.length) problems.push(`products[${i}] ("${name}") has no images`);
  return { ...p, name, slug: norm(p.slug), category: norm(p.category) };
});

// Every product must point at a category that exists in the import or already
// exists in the database, otherwise it will never appear on the storefront.
const catSlugs = new Set(cleanCategories.map((c) => c.slug));
const catNames = new Set(cleanCategories.map((c) => c.name));
for (const p of cleanProducts) {
  if (!catSlugs.has(p.category) && !catNames.has(p.category)) {
    problems.push(`products ("${p.name}") references unknown category "${p.category}"`);
  }
}

// Detect duplicate slugs inside the file itself.
for (const [label, list] of [['categories', cleanCategories], ['products', cleanProducts]]) {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.slug)) problems.push(`duplicate ${label} slug "${item.slug}" inside the file`);
    seen.add(item.slug);
  }
}

if (problems.length) {
  console.error(`\nVALIDATION FAILED (${problems.length} problem(s)). Nothing was written:\n`);
  problems.slice(0, 30).forEach((p) => console.error(`  - ${p}`));
  if (problems.length > 30) console.error(`  ...and ${problems.length - 30} more`);
  process.exit(1);
}

(async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`Connected: ${db.databaseName}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : REPLACE ? 'UPSERT (replace matched)' : 'UPSERT (skip existing)'}\n`);

  const existingCats = new Set(
    (await db.collection('categories').find({}, { projection: { slug: 1, name: 1 } }).toArray())
      .flatMap((c) => [c.slug, c.name].filter(Boolean))
  );
  const existingProds = new Set(
    (await db.collection('products').find({}, { projection: { slug: 1 } }).toArray()).map((p) => p.slug)
  );

  let catInserted = 0, catSkipped = 0;
  for (const c of cleanCategories) {
    if (existingCats.has(c.slug)) {
      catSkipped += 1;
      if (DRY_RUN || !REPLACE) continue;
      await db.collection('categories').updateOne({ slug: c.slug }, { $set: c });
      catInserted += 1;
      continue;
    }
    if (!DRY_RUN) {
      await db.collection('categories').insertOne({ ...c, productCount: 0, createdAt: new Date(), updatedAt: new Date() });
    }
    catInserted += 1;
  }

  let prodInserted = 0, prodSkipped = 0;
  for (const p of cleanProducts) {
    if (existingProds.has(p.slug)) {
      prodSkipped += 1;
      if (DRY_RUN || !REPLACE) continue;
      await db.collection('products').updateOne({ slug: p.slug }, { $set: p });
      prodInserted += 1;
      continue;
    }
    if (!DRY_RUN) {
      await db.collection('products').insertOne({
        status: 'active',
        rating: 0,
        numReviews: 0,
        isFeatured: false,
        isBestseller: false,
        isFlashDeal: false,
        isNewArrival: false,
        ...p,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    prodInserted += 1;
  }

  console.log(`Categories: ${catInserted} ${DRY_RUN ? 'would be written' : 'written'}, ${catSkipped} already present`);
  console.log(`Products:   ${prodInserted} ${DRY_RUN ? 'would be written' : 'written'}, ${prodSkipped} already present`);

  if (!DRY_RUN) {
    // Keep the stored category counts honest; the storefront relies on them.
    const Product = require('../models/Product');
    const { recomputeCategoryCount } = require('../utils/categoryCounts');
    for (const c of cleanCategories) {
      await recomputeCategoryCount(c.name);
      await recomputeCategoryCount(c.slug);
    }
    const counted = await db.collection('products').countDocuments({ status: 'active' });
    console.log(`Active products now in the database: ${counted}`);

    // Report any image path that has no matching file in the served directory.
    const assetDirs = [
      path.resolve(__dirname, '..', '..', 'client', 'public', 'uploads'),
      path.resolve(__dirname, '..', 'uploads'),
    ];
    const missing = new Set();
    const allImages = [
      ...cleanProducts.flatMap((p) => p.images || []),
      ...cleanCategories.map((c) => c.image).filter(Boolean),
    ];
    for (const img of allImages) {
      const rel = String(img).replace(/^\/+/, '').replace(/^uploads[\\/]/, '');
      const found = assetDirs.some((d) => fs.existsSync(path.join(d, rel)));
      if (!found) missing.add(img);
    }
    if (missing.size) {
      console.log(`\nWARNING: ${missing.size} image path(s) have no matching local file:`);
      [...missing].slice(0, 15).forEach((m) => console.log(`  - ${m}`));
      console.log('Upload them to /uploads on the API host or client/public/uploads, or the images will 404.');
    } else {
      console.log('All referenced image files were found locally.');
    }
  } else {
    console.log('\nDry run complete. Re-run without --dry-run to write.');
  }

  console.log('\nVerify:');
  console.log('  curl -s "https://<api-host>/api/products?pageSize=100"   # -> products[] and count');
  console.log('  curl -s "https://<api-host>/api/categories/public"        # -> categories[]');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('\nImport failed:', err.message);
  process.exit(1);
});