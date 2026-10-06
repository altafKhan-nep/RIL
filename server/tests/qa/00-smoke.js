const assert = require('assert');

module.exports = {
  name: 'Smoke & Baseline',
  tests: [
    {
      name: 'GET /api/health returns ok',
      fn: async ({ BASE, request }) => {
        const res = await request.get(BASE, '/api/health');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, 'ok');
      },
    },
    {
      name: 'GET /api/settings returns all sections',
      fn: async ({ BASE, request }) => {
        const res = await request.get(BASE, '/api/settings');
        assert.strictEqual(res.status, 200);
        ['store', 'payment', 'shipping', 'tax', 'notifications', 'security', 'seo'].forEach((k) => assert.ok(res.body[k], `missing ${k}`));
      },
    },
    {
      name: 'GET /api/products returns paginated list',
      fn: async ({ BASE, request }) => {
        const res = await request.get(BASE, '/api/products');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.products));
        assert.ok(res.body.products.length > 0);
      },
    },
    {
      name: 'POST /api/users/login valid credentials returns token',
      fn: async ({ BASE, request, fixtures }) => {
        const res = await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.admin.email, password: fixtures.USERS.admin.password } });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.token, 'expected token');
      },
    },
    {
      name: 'POST /api/users/login wrong password returns 401',
      fn: async ({ BASE, request, fixtures }) => {
        await assert.rejects(
          request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.admin.email, password: 'wrong' } }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'GET /api/users/profile without token returns 401',
      fn: async ({ BASE, request }) => {
        await assert.rejects(request.get(BASE, '/api/users/profile'), (e) => e.status === 401);
      },
    },
  ],
};