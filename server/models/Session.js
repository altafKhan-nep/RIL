const mongoose = require('mongoose');

/**
 * A server-side login session, keyed by the SHA-256 hash of a long-lived
 * refresh token. The raw token only ever exists in the httpOnly cookie, so a
 * stolen database cannot be replayed, and deleting the row (logout, password
 * change, or rotation) genuinely revokes the session.
 */
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Mongo removes expired documents automatically when the index exists.
// Index creation is best-effort because autoIndex is often disabled in prod.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);