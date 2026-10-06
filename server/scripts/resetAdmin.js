#!/usr/bin/env node
/**
 * Create or reset an administrator account.
 *
 * Use this when you cannot sign in: it does not read or print any existing
 * password (they are hashed and unrecoverable by design), it sets a password you
 * choose. Also useful for promoting a teammate or rotating a compromised
 * credential.
 *
 * Refuses to guess a database: MONGO_URI must be supplied.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://…" node scripts/resetAdmin.js \
 *     --email you@example.com --password 'YourNewPassword123' --name "Your Name"
 *
 * Options:
 *   --email      required. Existing account is promoted/reset; otherwise created.
 *   --password   required, minimum 8 characters.
 *   --name       display name when creating (defaults to the local part of the email).
 *   --role       super_admin (default) | admin | content_manager | order_manager
 *   --list       list admin accounts (emails and roles only, no secrets) and exit.
 */

const mongoose = require('mongoose');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const VALID_ROLES = ['super_admin', 'admin', 'content_manager', 'order_manager'];

const fail = (msg) => {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) fail('MONGO_URI is required. Refusing to guess a database.');
if (!/^mongodb(\+srv)?:\/\//.test(MONGO_URI)) fail('MONGO_URI does not look like a MongoDB connection string.');

const role = (flag('role') || 'super_admin').trim();
if (!VALID_ROLES.includes(role)) fail(`--role must be one of: ${VALID_ROLES.join(', ')}`);

(async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`Connected: ${db.databaseName}\n`);

  if (has('list')) {
    const admins = await db
      .collection('users')
      .find(
        { role: { $in: VALID_ROLES } },
        { projection: { email: 1, name: 1, role: 1, isActive: 1 } }
      )
      .sort({ email: 1 })
      .toArray();

    if (!admins.length) {
      console.log('No admin accounts found. Create one with --email and --password.');
    } else {
      console.log(`Admin accounts (${admins.length}):`);
      for (const a of admins) {
        console.log(`  ${a.email}  [${a.role}]${a.isActive === false ? '  (DISABLED)' : ''}`);
      }
      console.log('\nPasswords are hashed and cannot be displayed. Reset one with --password.');
    }
    await mongoose.disconnect();
    process.exit(0);
  }

  const email = (flag('email') || '').trim().toLowerCase();
  const password = flag('password') || '';

  if (!email) fail('--email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('--email does not look like a valid address.');
  if (!password) fail('--password is required.');
  if (password.length < 8) fail(`--password must be at least 8 characters (got ${password.length}).`);

  const { User } = require('../models/User');

  const existing = await db.collection('users').findOne({ email });
  const name = (flag('name') || (email.split('@')[0] || 'Administrator')).trim();

  if (existing) {
    // Re-hash through the model so the password hash matches the app exactly.
    const user = await User.findById(existing._id);
    if (!user) fail(`Found a user row for ${email} but it could not be loaded.`);
    user.password = password;
    user.role = role;
    user.isAdmin = true;
    user.isActive = true;
    // Bump the token version so any existing sessions are invalidated.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    // Drop refresh sessions so a stolen session cannot outlive the reset.
    const sessions = mongoose.connection.db.collection('sessions');
    const res = await sessions.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

    console.log(`Reset existing account: ${email}`);
    console.log(`  role:      ${role}`);
    console.log(`  active:    true`);
    console.log(`  sessions revoked: ${res.modifiedCount || 0}`);
  } else {
    const created = await User.create({
      name,
      email,
      password,
      role,
      isAdmin: true,
      isActive: true,
      tokenVersion: 0,
    });
    console.log(`Created admin account: ${email}`);
    console.log(`  name:      ${created.name}`);
    console.log(`  role:      ${role}`);
  }

  console.log('\nNow sign in at /admin/login with that email and password.');
  console.log('If login still fails with "secretOrPrivateKey must have a value",');
  console.log('JWT_SECRET is not set on the API host - that is a separate problem.');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});