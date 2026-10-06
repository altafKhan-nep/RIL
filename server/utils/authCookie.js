/**
 * Auth cookie helpers.
 *
 * The browser previously persisted its JWT in localStorage, which meant any
 * XSS could exfiltrate a long-lived bearer token. The server now also issues
 * the same token as an httpOnly cookie, so the browser app can never read it
 * from script. The token is still returned in the JSON body for non-browser
 * API clients; authMiddleware accepts either credential.
 *
 * Implemented without an extra dependency: only our own cookie is read, and
 * it is parsed defensively (never eval'd, length-capped).
 */

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'lip_token';

const isProduction = () => process.env.NODE_ENV === 'production';

// 'lax' works for the same-origin deployment (Vercel rewrites /api to the
// API host). Cross-origin setups must set AUTH_COOKIE_SAMESITE=none together
// with HTTPS, otherwise the browser drops the cookie.
const sameSite = () => process.env.AUTH_COOKIE_SAMESITE || 'lax';

const maxAgeMs = () => {
  const raw = process.env.JWT_EXPIRE || '30d';
  const match = /^(\d+)([smhd])$/.exec(String(raw).trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
};

const setAuthCookie = (res, token) => {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite()}`,
    `Max-Age=${Math.floor(maxAgeMs() / 1000)}`,
  ];
  // `Secure` is mandatory whenever SameSite=None, and expected in production.
  if (isProduction() || sameSite() === 'none') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const cookie = parts.join('; ');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
};

const clearAuthCookie = (res) => {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite()}`,
    'Max-Age=0',
  ];
  if (isProduction() || sameSite() === 'none') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const cookie = parts.join('; ');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
};

/** Reads the auth cookie from the request, if present and well-formed. */
const readCookie = (req) => {
  const header = req.headers && req.headers.cookie;
  if (!header || header.length > 8192) return null;
  for (const chunk of header.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq === -1) continue;
    if (chunk.slice(0, eq).trim() !== COOKIE_NAME) continue;
    const value = chunk.slice(eq + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
};

/** Cookie first, then an explicit Bearer header for API clients. */
const readToken = (req) => readCookie(req) || null;

const readBearerToken = (req) => {
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim() || null;
  return null;
};

module.exports = {
  COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  readCookie,
  readToken,
  readBearerToken,
};