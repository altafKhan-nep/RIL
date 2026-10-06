const jwt = require('jsonwebtoken');

const parseDuration = (raw, fallback) => {
  const match = /^(\d+)([smhd])$/.exec(String(raw || '').trim());
  if (!match) return fallback;
  return Number(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
};

/**
 * Signs a short-lived access JWT that embeds the user's tokenVersion.
 *
 * Deliberately short-lived (15 minutes by default): if one leaks it stops
 * working quickly. Long-lived access is handled by the opaque, server-side
 * revocable refresh token in utils/refreshToken.js.
 *
 * authMiddleware rejects tokens whose version is older than the user's current
 * tokenVersion, so changing a password immediately invalidates every issued
 * access token.
 */
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tv: tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: Math.floor(parseDuration(process.env.ACCESS_TOKEN_EXPIRE, 15 * 60 * 1000) / 1000),
  });
};

module.exports = generateToken;