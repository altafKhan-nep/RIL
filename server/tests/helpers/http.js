const http = require('http');

class HttpError extends Error {
  constructor(status, body, raw) {
    super((body && body.message) || `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.raw = raw;
  }
}

function request(base, method, path, { token, body, query, headers = {} } = {}) {
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
          const out = { status: res.statusCode, headers: res.headers, body: json, raw: data };
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