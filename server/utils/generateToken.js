const jwt = require('jsonwebtoken');

/**
 * Signs a JWT that embeds the user's tokenVersion. The auth middleware
 * rejects tokens whose version is older than the user's current tokenVersion,
 * so changing a password (or forcing a logout) immediately invalidates every
 * previously issued token.
 */
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tv: tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = generateToken;