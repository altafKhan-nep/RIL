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

const ACCESS_COOKIE = process.env.AUTH_COOKIE_NAME || 'lip_token';
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || 'lip_refresh';

const isProduction = () => process.env.NODE_ENV === 'production';

// 'lax' works for the same-origin deployment (Vercel rewrites /api to the
// API host). Cross-origin setups must set AUTH_COOKIE_SAMESITE=none together
// with HTTPS, otherwise the browser drops the cookie.
const sameSite = () => process.env.AUTH_COOKIE_SAMESITE || 'lax';

const parseDuration = (raw, fallbackMs) => {
  const match = /^(\d+)([smhd])$/.exec(String(raw || '').trim());
  if (!match) return fallbackMs;
  return Number(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
};

// Access tokens are deliberately short-lived; a leaked one is useless quickly.
// The long-lived credential is the opaque refresh token, which is revocable.
const accessTtlMs = () => parseDuration(process.env.ACCESS_TOKEN_EXPIRE, 15 * 60 * 1000);
const refreshTtlMs = () => parseDuration(process.env.REFRESH_TOKEN_EXPIRE, 30 * 24 * 60 * 60 * 1000);

const writeCookie = (res, name, value, maxAgeMs, path = '/') => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'HttpOnly',
    `SameSite=${sameSite()}`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  // `Secure` is mandatory whenever SameSite=None, and expected in production.
  if (isProduction() || sameSite() === 'none') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const cookie = parts.join('; ');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
};

const expireCookie = (res, name, path = '/') => {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    'HttpOnly',
    `SameSite=${sameSite()}`,
    'Max-Age=0',
  ];
  if (isProduction() || sameSite() === 'none') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const cookie = parts.join('; ');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
};

/** Sets the short-lived access cookie. */
const setAccessCookie = (res, token) => writeCookie(res, ACCESS_COOKIE, token, accessTtlMs());

/** Sets the opaque, revocable refresh cookie. */
const setRefreshCookie = (res, token) => writeCookie(res, REFRESH_COOKIE, token, refreshTtlMs());

/** Issues both cookies in one response. */
const setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) setAccessCookie(res, accessToken);
  if (refreshToken) setRefreshCookie(res, refreshToken);
};

const clearAuthCookies = (res) => {
  expireCookie(res, ACCESS_COOKIE);
  expireCookie(res, REFRESH_COOKIE);
};

/** Reads one cookie by name, if present and well-formed. */
const readNamedCookie = (req, name) => {
  const header = req.headers && req.headers.cookie;
  if (!header || header.length > 8192) return null;
  for (const chunk of header.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq === -1) continue;
    if (chunk.slice(0, eq).trim() !== name) continue;
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

const readAccessCookie = (req) => readNamedCookie(req, ACCESS_COOKIE);
const readRefreshCookie = (req) => readNamedCookie(req, REFRESH_COOKIE);

const readCookie = (req) => readAccessCookie(req);

const readBearerToken = (req) => {
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim() || null;
  return null;
};

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessTtlMs,
  refreshTtlMs,
  setAccessCookie,
  setRefreshCookie,
  setAuthCookies,
  clearAuthCookies,
  readAccessCookie,
  readRefreshCookie,
  readCookie,
  readBearerToken,
};