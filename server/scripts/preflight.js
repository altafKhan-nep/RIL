#!/usr/bin/env node
/**
 * Production preflight.
 *
 * Checks everything that can be verified without a browser, so deployment
 * problems surface as a clear pass/fail report instead of a broken storefront.
 * Read-only: it never writes to the database.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://…" node scripts/preflight.js
 *   BASE_URL="https://ril-q344.onrender.com" node scripts/preflight.js
 *
 * Exit code 0 = all checks passed, 1 = at least one blocker failed.
 */

const mongoose = require('mongoose');

const BASE_URL = process.env.BASE_URL || '';
// Render's free tier spins down after inactivity, so a cold start can take a
// while to answer. Default generously; override with PREFLIGHT_TIMEOUT_MS.
const TIMEOUT_MS = Number(process.env.PREFLIGHT_TIMEOUT_MS) || 45000;
const MONGO_URI = process.env.MONGO_URI || '';

const results = [];
const record = (status, check, detail) => results.push({ status, check, detail });
const pass = (c, d = '') => record('PASS', c, d);
const warn = (c, d = '') => record('WARN', c, d);
const fail = (c, d = '') => record('FAIL', c, d);
const skip = (c, d = '') => record('SKIP', c, d);

// --------------------------------------------------------------------------
// 1. Configuration
// --------------------------------------------------------------------------
const checkConfig = () => {
  const jwt = process.env.JWT_SECRET;
  if (!jwt) {
    fail('JWT_SECRET is set', 'missing — admin login will fail with "secretOrPrivateKey must have a value"');
  } else if (jwt.length < 32) {
    fail('JWT_SECRET is set', `only ${jwt.length} chars; use at least 32 (e.g. openssl rand -hex 32)`);
  } else if (/^(change|secret|password|test|dev)/i.test(jwt)) {
    fail('JWT_SECRET is set', 'looks like a placeholder value');
  } else {
    pass('JWT_SECRET is set', `${jwt.length} chars`);
  }

  if (!MONGO_URI) {
    fail('MONGO_URI is provided', 'not set in this shell');
  } else if (/srv=/.test(MONGO_URI)) {
    pass('MONGO_URI is provided', 'Atlas cluster');
  } else {
    warn('MONGO_URI is provided', 'not an Atlas (srv) URI — confirm this is intended');
  }

  const stripe = process.env.STRIPE_SECRET_KEY;
  if (!stripe) skip('Stripe secret key', 'not set — card payments and refunds are disabled');
  else if (/^sk_live_/.test(stripe)) pass('Stripe secret key', 'live key present');
  else if (/^sk_test_/.test(stripe)) warn('Stripe secret key', 'TEST key present — not real payments');
  else warn('Stripe secret key', 'unrecognised key format');

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warn('Stripe webhook secret', 'not set — payment confirmations will fail (webhook returns 503)');
  } else {
    pass('Stripe webhook secret', 'set');
  }

  if (!process.env.UPLOAD_DIR) {
    warn('UPLOAD_DIR is set', 'not set — uploads go to local disk and are lost on redeploy (ephemeral hosts)');
  } else {
    pass('UPLOAD_DIR is set', process.env.UPLOAD_DIR);
  }
};

// --------------------------------------------------------------------------
// 2. Live API (optional, only when BASE_URL is provided)
// --------------------------------------------------------------------------
const checkApi = async () => {
  if (!BASE_URL) {
    skip('Live API health', 'BASE_URL not provided');
    return;
  }
  const base = BASE_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      fail('Live API health', `${base}/api/health returned ${res.status}`);
      return;
    }
    const body = await res.json().catch(() => ({}));
    pass('Live API health', body.message || 'ok');
  } catch (err) {
    fail('Live API health', `could not reach ${base}: ${err.message}`);
    return;
  }

  try {
    const res = await fetch(`${base}/api/settings`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = await res.json().catch(() => ({}));
    const raw = JSON.stringify(body);
    if (/novacart/i.test(raw)) {
      fail('Live branding', 'API still returns "NovaCart" — the Atlas settings document has not been updated');
    } else if (/life in pieces/i.test(raw)) {
      pass('Live branding', 'API returns Life In Pieces');
    } else {
      warn('Live branding', 'could not confirm brand name from /api/settings');
    }
  } catch (err) {
    warn('Live branding check', err.message);
  }
};

// --------------------------------------------------------------------------
// 3. Database state
// --------------------------------------------------------------------------
const checkDatabase = async () => {
  if (!MONGO_URI) {
    skip('Database checks', 'no MONGO_URI');
    return;
  }
  let info;
  try {
    info = await mongoose.connection.db.admin().serverInfo();
  } catch (err) {
    fail('Database reachable', err.message);
    return;
  }
  pass('Database reachable', `MongoDB ${info.version}`);

  const db = mongoose.connection.db;

  // Branding stored in the database.
  try {
    const settings = await db.collection('settings').findOne({});
    const raw = JSON.stringify(settings || {});
    if (/novacart/i.test(raw)) {
      fail('Database branding', 'settings document still contains "NovaCart"');
    } else if (/life in pieces/i.test(raw)) {
      pass('Database branding', 'settings document contains Life In Pieces');
    } else {
      warn('Database branding', 'no settings document found to verify');
    }
  } catch (err) {
    warn('Database branding', err.message);
  }

  // Product / category image collisions.
  try {
    const cats = await db.collection('categories').find({}, { projection: { name: 1, image: 1 } }).toArray();
    const catImages = new Map();
    for (const c of cats) if (c.image) catImages.set(String(c.image).replace(/^\/+/, ''), c);
    const prods = await db.collection('products').find({}, { projection: { name: 1, slug: 1, images: 1 } }).toArray();
    const clashes = [];
    for (const p of prods) {
      for (const img of Array.isArray(p.images) ? p.images : []) {
        const rel = String(img || '').replace(/^\/+/, '');
        if (catImages.has(rel)) clashes.push(`${p.name} -> ${img} (shared with "${catImages.get(rel).name}")`);
      }
    }
    if (clashes.length) {
      fail('Product/category image paths', `${clashes.length} collision(s). Run scripts/separateProductImages.js --apply.`);
      clashes.slice(0, 8).forEach((c) => console.log(`         - ${c}`));
    } else {
      pass('Product/category image paths', 'no collisions');
    }
  } catch (err) {
    warn('Product/category image paths', err.message);
  }

  // Data sanity that would break the storefront.
  try {
    const [products, categories, orders, users] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('categories').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('users').countDocuments(),
    ]);
    pass('Collection counts', `${products} products, ${categories} categories, ${orders} orders, ${users} users`);
    if (categories === 0) fail('Storefront has data', 'no categories — the shop grid will be empty');
    else if (products === 0) warn('Storefront has data', 'no products');
    else pass('Storefront has data', 'categories and products present');
  } catch (err) {
    warn('Collection counts', err.message);
  }

  // Sessions collection exists (created lazily by mongoose).
  try {
    const names = (await db.listCollections().toArray()).map((c) => c.name);
    if (names.includes('sessions')) {
      const live = await db.collection('sessions').countDocuments({ revokedAt: null });
      pass('Sessions collection', `present, ${live} live session(s)`);
    } else {
      skip('Sessions collection', 'not created yet (created on first login)');
    }
  } catch (err) {
    warn('Sessions collection', err.message);
  }

  // Standalone vs replica set: affects whether transactions are usable.
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (hello.setName) {
      pass('Deployment topology', `replica set "${hello.setName}" — multi-document transactions available`);
    } else {
      warn(
        'Deployment topology',
        'standalone MongoDB — checkout uses per-document atomic guards + compensating rollback, not ACID transactions'
      );
    }
  } catch (err) {
    warn('Deployment topology', err.message);
  }
};

(async () => {
  console.log('Production preflight (read-only)\n' + '='.repeat(60));

  checkConfig();
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
      await checkDatabase();
    } catch (err) {
      fail('Database connection', err.message);
    } finally {
      await mongoose.disconnect().catch(() => {});
    }
  } else {
    skip('Database checks', 'no MONGO_URI');
  }
  await checkApi();

  console.log('');
  for (const r of results) {
    const icon = { PASS: '  ok  ', WARN: ' warn ', FAIL: ' FAIL ', SKIP: ' skip ' }[r.status];
    console.log(`[${icon}] ${r.check}${r.detail ? `\n         ${r.detail}` : ''}`);
  }

  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  console.log('\n' + '='.repeat(60));
  console.log(`${results.length} checks: ${results.filter((r) => r.status === 'PASS').length} passed, ${warned} warnings, ${failed} failed`);
  if (failed) console.log('\nNot ready to ship. Fix every FAIL above and re-run.');
  else if (warned) console.log('\nNo blockers. Review the warnings — some are informational.');
  else console.log('\nAll checks passed.');

  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('Preflight crashed:', err);
  process.exit(1);
});