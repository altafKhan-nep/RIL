const assert = require('assert');

async function token({ BASE, request, fixtures }, roleKey) {
  const u = fixtures.USERS[roleKey];
  const res = await request.post(BASE, '/api/users/login', { body: { email: u.email, password: u.password } });
  assert.strictEqual(res.status, 200, `login failed for ${roleKey}`);
  return res.body.token;
}

module.exports = {
  name: 'Roles & Permission Matrix',
  tests: [
    {
      name: 'content_manager CANNOT delete products (privilege escalation)',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'contentManager');
        const p = (await request.get(BASE, '/api/products', { query: { keyword: 'QA Widget', pageSize: 5 } })).body.products[0];
        await assert.rejects(request.del(BASE, `/api/products/${p._id}`, { token: t }), (e) => e.status === 403);
      },
    },
    {
      name: 'content_manager CANNOT edit inventory',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'contentManager');
        const p = (await request.get(BASE, '/api/products', { query: { keyword: 'QA Widget', pageSize: 5 } })).body.products[0];
        await assert.rejects(
          request.put(BASE, `/api/admin/inventory/${p._id}/adjust`, { token: t, body: { quantity: 5, reason: 'test' } }),
          (e) => e.status === 403
        );
      },
    },
    {
      name: 'content_manager CANNOT delete promotions',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'contentManager');
        const promo = (await request.get(BASE, '/api/promotions/active', { query: {} })).body[0];
        if (promo) await assert.rejects(request.del(BASE, `/api/promotions/${promo._id}`, { token: t }), (e) => e.status === 403);
      },
    },
    {
      name: 'order_manager CANNOT create products',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'orderManager');
        await assert.rejects(
          request.post(BASE, '/api/products', { token: t, body: { name: 'X', slug: `x${Date.now()}`, price: 1, category: 'C', description: 'X', countInStock: 1 } }),
          (e) => e.status === 403
        );
      },
    },
    {
      name: 'order_manager CANNOT edit promotions',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'orderManager');
        const promo = (await request.get(BASE, '/api/promotions/active', { query: {} })).body[0];
        if (promo) await assert.rejects(request.put(BASE, `/api/promotions/${promo._id}`, { token: t, body: { name: 'X' } }), (e) => e.status === 403);
      },
    },
    {
      name: 'customer CANNOT access admin dashboard stats',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'customer');
        await assert.rejects(request.get(BASE, '/api/admin/stats', { token: t }), (e) => e.status === 403);
      },
    },
    {
      name: 'customer CANNOT access admin orders list',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'customer');
        await assert.rejects(request.get(BASE, '/api/orders', { token: t }), (e) => e.status === 403);
      },
    },
    {
      name: 'admin CAN create and delete products',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-perm-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: t, body: { name: 'QA Perm', slug, price: 10, category: 'QA Cat', description: 'A valid product description.', countInStock: 1 } });
        assert.strictEqual(created.status, 201, created.body.message);
        const del = await request.del(BASE, `/api/products/${created.body._id}`, { token: t });
        assert.strictEqual(del.status, 200);
      },
    },
    {
      name: 'unauthenticated CANNOT create products',
      fn: async ({ BASE, request }) => {
        await assert.rejects(
          request.post(BASE, '/api/products', { body: { name: 'X', slug: `x${Date.now()}`, price: 1, category: 'C', description: 'X', countInStock: 1 } }),
          (e) => e.status === 401
        );
      },
    },
  ],
};