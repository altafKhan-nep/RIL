const http = require('http');

class HttpError extends Error {
  constructor(status, body, raw) {
    super((body && body.message) || `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.raw = raw;
  }
}

function request(base, method, path, { token, body, query, headers = {}, jar, cookie } = {}) {
  return new Promise((resolve, reject) => {
    let url = path;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const parsed = new URL(url, base);
    const h = { 'Content-Type': 'application/json', ...headers };
    if (token) h['Authorization'] = `Bearer ${token}`;
    // Cookie-jar support mirrors browser behaviour so httpOnly session auth
    // can be exercised end to end. A `jar` is a plain object of name->value.
    const cookies = jar || cookie;
    if (cookies && Object.keys(cookies).length) {
      h['Cookie'] = Object.entries(cookies)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('; ');
    }
    // A string/Buffer body is sent verbatim (required for exact-byte webhook
    // signature tests); anything else is JSON encoded.
    const payload =
      body === undefined || body === null
        ? null
        : Buffer.isBuffer(body) || typeof body === 'string'
          ? body
          : JSON.stringify(body);
    if (payload !== null) h['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request(
      { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, method, headers: h },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try { json = data ? JSON.parse(data) : null; } catch { json = null; }
          // Capture Set-Cookie into the jar, honouring Max-Age=0 deletions.
          const setCookies = [].concat(res.headers['set-cookie'] || []);
          if (cookies) {
            for (const sc of setCookies) {
              const [pair, ...attrs] = sc.split(';');
              const eq = pair.indexOf('=');
              if (eq === -1) continue;
              const name = pair.slice(0, eq).trim();
              const value = pair.slice(eq + 1).trim();
              const maxAge = attrs
                .map((a) => a.trim())
                .find((a) => /^max-age=-?\d+$/i.test(a));
              const expired =
                (maxAge && Number(maxAge.split('=')[1]) <= 0) ||
                attrs.map((a) => a.trim()).some((a) => /expires=thu, 01 jan 1970/i.test(a));
              if (!value || expired) delete cookies[name];
              else cookies[name] = decodeURIComponent(value);
            }
          }
          const out = { status: res.statusCode, headers: res.headers, body: json, raw: data, setCookie: setCookies };
          if (res.statusCode >= 400) return reject(new HttpError(res.statusCode, json, data));
          resolve(out);
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (base, path, opts) => request(base, 'GET', path, opts);
const post = (base, path, opts) => request(base, 'POST', path, opts);
const put = (base, path, opts) => request(base, 'PUT', path, opts);
const del = (base, path, opts) => request(base, 'DELETE', path, opts);

module.exports = { request, get, post, put, del, delete: del, HttpError };