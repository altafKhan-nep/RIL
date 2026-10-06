const assert = require('assert');
const { ObjectId } = require('mongoose').Types;

async function custToken({ BASE, request, fixtures }) {
  const res = await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.customer.email, password: fixtures.USERS.customer.password } });
  return res.body.token;
}
async function getProduct({ BASE, request }, name) {
  const res = await request.get(BASE, '/api/products', { query: { keyword: name, pageSize: 5 } });
  return res.body.products.find((x) => x.name === name);
}

module.exports = {
  name: 'Concurrency & Inventory Races',
  tests: [
    {
      name: 'Concurrent orders never drive stock negative',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        // Dedicated product so this suite cannot starve other suites' fixtures.
        const at = (await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.admin.email, password: fixtures.USERS.admin.password } })).body.token;
        const slug = `qa-race-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Race Item', slug, price: 1, category: 'QA Cat', description: 'A concurrency test item.', countInStock: 10 } });
        const p = { _id: created.body._id, name: 'QA Race Item' };
        const before = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        // Fire 15 concurrent orders of qty 1 against stock of 10
        const attempts = Array.from({ length: 15 }, () =>
          request.post(BASE, '/api/orders', {
            token: t,
            body: { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
          }).then((r) => r.status).catch((e) => e.status)
        );
        const statuses = await Promise.all(attempts);
        const successes = statuses.filter((s) => s === 201).length;
        const after = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.ok(after >= 0, `stock went negative: ${after}`);
        assert.ok(successes <= before, `oversold: ${successes} successes but only ${before} in stock`);
        assert.strictEqual(after, before - successes, `stock ${before} - ${successes} successes should equal ${after}, got ${after}`);
      },
    },
    {
      name: 'Concurrent single-use promo: exactly one wins',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        // QALIMIT1 has usageLimit 1 — but earlier tests may have consumed it.
        // Create a fresh single-use promo via admin.
        const at = (await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.admin.email, password: fixtures.USERS.admin.password } })).body.token;
        const promo = await request.post(BASE, '/api/promotions', {
          token: at,
          body: { name: 'QA Race', code: `QARACE${Date.now()}`, description: 'race', type: 'percentage', value: 10, minPurchase: 0, maxDiscount: 0, usageLimit: 1, isActive: true, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() },
        });
        const code = promo.body.code;
        const attempts = Array.from({ length: 5 }, () =>
          request.post(BASE, '/api/orders', {
            token: t,
            body: { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD', promoCode: code },
          }).then((r) => r.status).catch((e) => e.status)
        );
        const statuses = await Promise.all(attempts);
        const successes = statuses.filter((s) => s === 201).length;
        assert.strictEqual(successes, 1, `exactly one concurrent redemption should win, got ${successes}`);
        const stored = await db.col('promotions').findOne({ code });
        assert.strictEqual(stored.usedCount, 1, `usedCount should be 1, got ${stored.usedCount}`);
      },
    },
  ],
};