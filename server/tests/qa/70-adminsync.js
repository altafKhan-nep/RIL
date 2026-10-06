const assert = require('assert');

async function token({ BASE, request, fixtures }, roleKey) {
  const u = fixtures.USERS[roleKey];
  const res = await request.post(BASE, '/api/users/login', { body: { email: u.email, password: u.password } });
  return res.body.token;
}

module.exports = {
  name: 'Admin ↔ Storefront Synchronization',
  tests: [
    {
      name: 'Admin-created product appears in public listing',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-sync-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: t, body: { name: 'QA Sync Product', slug, price: 42, category: 'QA Cat', description: 'A sync test product.', countInStock: 5 } });
        assert.strictEqual(created.status, 201, created.body.message);
        const pub = await request.get(BASE, '/api/products', { query: { keyword: 'QA Sync Product' } });
        assert.ok(pub.body.products.some((p) => p._id === created.body._id), 'new product should be publicly listed');
      },
    },
    {
      name: 'Admin price update propagates to storefront',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-price-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: t, body: { name: 'QA Price Product', slug, price: 10, category: 'QA Cat', description: 'A price test product.', countInStock: 5 } });
        const upd = await request.put(BASE, `/api/products/${created.body._id}`, { token: t, body: { name: 'QA Price Product', slug, price: 77, category: 'QA Cat', description: 'A price test product.', countInStock: 5 } });
        assert.strictEqual(upd.status, 200, upd.body.message);
        const pub = await request.get(BASE, `/api/products/${created.body._id}`);
        assert.strictEqual(pub.body.price, 77, 'storefront should show updated price');
      },
    },
    {
      name: 'Admin-created category appears publicly',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-cat-${Date.now()}`;
        const created = await request.post(BASE, '/api/categories', { token: t, body: { name: 'QA Sync Cat', slug, description: 'A sync category.' } });
        assert.strictEqual(created.status, 201, created.body.message);
        const pub = await request.get(BASE, '/api/categories/public');
        assert.ok(pub.body.some((c) => c.slug === slug), 'new category should be public');
      },
    },
    {
      name: 'Admin deactivated category is hidden publicly',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-deact-${Date.now()}`;
        const created = await request.post(BASE, '/api/categories', { token: t, body: { name: 'QA Deact Cat', slug, description: 'A deact category.' } });
        await request.put(BASE, `/api/categories/${created.body._id}`, { token: t, body: { isActive: false } });
        const pub = await request.get(BASE, '/api/categories/public');
        assert.ok(!pub.body.some((c) => c.slug === slug), 'deactivated category should be hidden');
      },
    },
    {
      name: 'Admin stock update changes storefront availability',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-stock-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: t, body: { name: 'QA Stock Product', slug, price: 10, category: 'QA Cat', description: 'A stock test product.', countInStock: 5 } });
        await request.put(BASE, `/api/products/${created.body._id}`, { token: t, body: { name: 'QA Stock Product', slug, price: 10, category: 'QA Cat', description: 'A stock test product.', countInStock: 0 } });
        const pub = await request.get(BASE, `/api/products/${created.body._id}`);
        assert.strictEqual(pub.body.countInStock, 0, 'storefront should show zero stock');
      },
    },
  ],
};