const crypto = require('crypto');
const Session = require('../models/Session');

/**
 * Refresh tokens are opaque random strings. Only their SHA-256 hash is
 * persisted, so database access cannot be replayed as a live session, and a
 * row can be deleted to revoke the session immediately.
 */

const REFRESH_BYTES = 48;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const refreshTtlMs = () => {
  const raw = process.env.REFRESH_TOKEN_EXPIRE || '30d';
  const match = /^(\d+)([smhd])$/.exec(String(raw).trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  return Number(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
};

/** Issues a new refresh token and persists its hash. Returns the raw token. */
const createSession = async (userId, { userAgent = '', ip = '' } = {}) => {
  const raw = crypto.randomBytes(REFRESH_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + refreshTtlMs());
  await Session.create({
    user: userId,
    tokenHash: hashToken(raw),
    expiresAt,
    userAgent: String(userAgent).slice(0, 255),
    ip: String(ip).slice(0, 64),
  });
  return { raw, expiresAt };
};

/** Resolves a presented refresh token to its live session, or null. */
const resolveSession = async (raw) => {
  if (!raw) return null;
  const session = await Session.findOne({
    tokenHash: hashToken(raw),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return session || null;
};

/**
 * Atomically rotates a session: the presented token is revoked and a fresh one
 * issued in its place. Replay of an already-rotated token therefore fails,
 * which also detects a stolen-and-reused refresh token.
 */
const rotateSession = async (session, meta = {}) => {
  const raw = crypto.randomBytes(REFRESH_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + refreshTtlMs());
  const result = await Session.findOneAndUpdate(
    { _id: session._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: false }
  );
  if (!result) return null; // already rotated or revoked
  await Session.create({
    user: session.user,
    tokenHash: hashToken(raw),
    expiresAt,
    userAgent: String(meta.userAgent || session.userAgent || '').slice(0, 255),
    ip: String(meta.ip || session.ip || '').slice(0, 64),
  });
  return { raw, expiresAt };
};

/** Revokes a single session (logout). */
const revokeSession = async (raw) => {
  if (!raw) return false;
  const res = await Session.updateOne(
    { tokenHash: hashToken(raw), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return res.modifiedCount > 0;
};

/**
 * Revokes every live session for a user. Used when a password changes so
 * other devices are signed out, and by the admin "sign out everywhere" path.
 */
const revokeAllSessions = async (userId) => {
  const res = await Session.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return res.modifiedCount || 0;
};

/** Housekeeping: drop rows that are expired or revoked. */
const pruneSessions = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await Session.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { revokedAt: { $lte: cutoff } }],
  });
  return res.deletedCount || 0;
};

module.exports = {
  hashToken,
  refreshTtlMs,
  createSession,
  resolveSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  pruneSessions,
};