const assert = require('assert');

module.exports = {
  name: 'Security & Injection',
  tests: [
    {
      name: 'NoSQL injection via keyword is rejected or sanitized',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          request.get(BASE, '/api/products', { query: { keyword: '{"$where":"function(){return true}"}' } }),
          (e) => e.status === 400 || e.status === 200
        );
      },
    },
    {
      name: 'XSS payload in search does not return raw script',
      fn: async ({ BASE, request }) => {
        const res = await request.get(BASE, '/api/products', { query: { keyword: '<script>alert(1)</script>' } });
        assert.ok(res.status === 200 || res.status === 400);
        assert.ok(!res.raw.includes('<script>'), 'raw script must not be reflected');
      },
    },
    {
      name: 'Protected admin route without token returns 401',
      fn: async ({ BASE, request }) => {
        await assert.rejects(request.get(BASE, '/api/admin/stats'), (e) => e.status === 401);
      },
    },
    {
      name: 'Order tracking without token returns 401 (IDOR protection)',
      fn: async ({ BASE, request }) => {
        await assert.rejects(request.get(BASE, '/api/orders/track/000000000000000000000000'), (e) => e.status === 401);
      },
    },
    {
      name: 'Invalid ObjectId in tracking returns 400 not 500',
      fn: async ({ BASE, request, fixtures }) => {
        const t = (await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.customer.email, password: fixtures.USERS.customer.password } })).body.token;
        const res = await request.get(BASE, '/api/orders/track/not-an-object-id', { token: t }).catch((e) => e);
        assert.ok(res.status === 400 || res.status === 404, `expected 400/404, got ${res.status}`);
      },
    },
    {
      name: 'Security headers are present',
      fn: async ({ BASE, request }) => {
        const res = await request.get(BASE, '/api/products');
        assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
        assert.ok(res.headers['x-frame-options']);
      },
    },
  ],
};