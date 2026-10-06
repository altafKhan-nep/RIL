const assert = require('assert');
const { ObjectId } = require('mongoose').Types;

async function token({ BASE, request, fixtures }, roleKey) {
  const u = fixtures.USERS[roleKey];
  const res = await request.post(BASE, '/api/users/login', { body: { email: u.email, password: u.password } });
  return res.body.token;
}
async function getProduct({ BASE, request }, name) {
  const res = await request.get(BASE, '/api/products', { query: { keyword: name, pageSize: 5 } });
  return res.body.products.find((x) => x.name === name);
}
async function order({ BASE, request, tok, product, qty = 1, promoCode }) {
  return request.post(BASE, '/api/orders', {
    token: tok,
    body: {
      orderItems: [{ name: product.name, qty, image: 'x', price: 1, product: product._id }],
      shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
      paymentMethod: 'COD', ...(promoCode ? { promoCode } : {}),
    },
  });
}

module.exports = {
  name: 'Refunds, Free Shipping, Stock Audit & Analytics',
  tests: [
    {
      name: 'free_shipping promotion zeroes shipping on a small order',
      fn: async ({ BASE, request, fixtures }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const at = await token({ BASE, request, fixtures }, 'admin');
        const code = `QAFREE${Date.now()}`;
        await request.post(BASE, '/api/promotions', {
          token: at,
          body: { name: 'QA Free Ship', code, description: 'free ship', type: 'free_shipping', value: 0, minPurchase: 0, usageLimit: 0, isActive: true, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() },
        });
        const p = await getProduct({ BASE, request }, 'QA Widget'); // $10, below $50
        const res = await order({ BASE, request, tok, product: p, qty: 1, promoCode: code });
        assert.strictEqual(res.status, 201, res.body.message);
        assert.strictEqual(res.body.itemsPrice, 10);
        assert.strictEqual(res.body.shippingPrice, 0, 'free_shipping promo must zero shipping');
        assert.strictEqual(res.body.taxPrice, 0.8);
        assert.strictEqual(res.body.totalPrice, 10.8);
      },
    },
    {
      name: 'free_shipping promo still pays tax on merchandise',
      fn: async ({ BASE, request, fixtures }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const at = await token({ BASE, request, fixtures }, 'admin');
        const code = `QAFREE2${Date.now()}`;
        await request.post(BASE, '/api/promotions', {
          token: at,
          body: { name: 'QA Free Ship 2', code, description: 'free ship', type: 'free_shipping', value: 0, minPurchase: 0, usageLimit: 0, isActive: true, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() },
        });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const res = await order({ BASE, request, tok, product: p, qty: 1, promoCode: code });
        assert.strictEqual(res.body.taxPrice, 0.8, 'tax applies to items even with free shipping');
      },
    },
    {
      name: 'Unpaid cancelled order has refundStatus none',
      fn: async ({ BASE, request, fixtures, db }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const o = await order({ BASE, request, tok, product: p });
        const cancel = await request.put(BASE, `/api/orders/${o.body._id}/cancel`, { token: tok, body: { reason: 'QA' } });
        assert.strictEqual(cancel.status, 200);
        assert.strictEqual(cancel.body.status, 'Cancelled');
        assert.strictEqual(cancel.body.isPaid, false);
        assert.strictEqual(cancel.body.refundStatus, 'none', 'unpaid order must not claim a refund');
        const stored = await db.col('orders').findOne({ _id: new ObjectId(o.body._id) });
        assert.strictEqual(stored.refundStatus, 'none');
        assert.strictEqual(stored.refundedAmount, 0);
      },
    },
    {
      name: 'stockHistory records every order decrement',
      fn: async ({ BASE, request, fixtures, db }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-hist-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Hist Item', slug, price: 5, category: 'QA Cat', description: 'history test item', countInStock: 20 } });
        const p = { _id: created.body._id, name: 'QA Hist Item' };
        await order({ BASE, request, tok, product: p, qty: 3 });
        const doc = await db.col('products').findOne({ _id: new ObjectId(p._id) });
        assert.strictEqual(doc.countInStock, 17);
        assert.ok(Array.isArray(doc.stockHistory) && doc.stockHistory.length >= 1, 'expected a stockHistory entry');
        const last = doc.stockHistory[doc.stockHistory.length - 1];
        assert.strictEqual(last.previousStock, 20);
        assert.strictEqual(last.quantity, -3);
        assert.strictEqual(last.newStock, 17);
        assert.ok(last.note, 'history entry must record a reason');
        assert.ok(last.date, 'history entry must record a timestamp');
        assert.strictEqual(last.type, 'order');
      },
    },
    {
      name: 'stockHistory records cancellation restoration exactly once',
      fn: async ({ BASE, request, fixtures, db }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-hist2-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Hist Two', slug, price: 5, category: 'QA Cat', description: 'history restore test', countInStock: 10 } });
        const p = { _id: created.body._id, name: 'QA Hist Two' };
        const o = await order({ BASE, request, tok, product: p, qty: 4 });
        await request.put(BASE, `/api/orders/${o.body._id}/cancel`, { token: tok, body: { reason: 'QA restore' } });
        const doc = await db.col('products').findOne({ _id: new ObjectId(p._id) });
        assert.strictEqual(doc.countInStock, 10, 'stock fully restored');
        const restoreEntries = doc.stockHistory.filter((h) => h.quantity === 4);
        assert.strictEqual(restoreEntries.length, 1, `expected exactly 1 restore entry, got ${restoreEntries.length}`);
      },
    },
    {
      name: 'Opening stock is recorded without changing the balance',
      fn: async ({ BASE, request, fixtures, db }) => {
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-open-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Open Item', slug, price: 3, category: 'QA Cat', description: 'opening balance test', countInStock: 12 } });
        const doc = await db.col('products').findOne({ _id: new ObjectId(created.body._id) });
        assert.strictEqual(doc.countInStock, 12, 'opening stock must not alter the balance');
        const first = (doc.stockHistory || [])[0];
        assert.ok(first, 'expected an opening stock history entry');
        assert.strictEqual(first.previousStock, 0);
        assert.strictEqual(first.newStock, 12);
        assert.strictEqual(first.quantity, 12);
      },
    },
    {
      name: 'Editing stock through the product API is audited',
      fn: async ({ BASE, request, fixtures, db }) => {
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-edit-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Edit Item', slug, price: 3, category: 'QA Cat', description: 'edit audit test', countInStock: 20 } });
        const upd = await request.put(BASE, `/api/products/${created.body._id}`, { token: at, body: { name: 'QA Edit Item', slug, price: 3, category: 'QA Cat', description: 'edit audit test', countInStock: 7 } });
        assert.strictEqual(upd.status, 200, upd.body.message);
        const doc = await db.col('products').findOne({ _id: new ObjectId(created.body._id) });
        assert.strictEqual(doc.countInStock, 7);
        const last = (doc.stockHistory || []).slice(-1)[0];
        assert.strictEqual(last.previousStock, 20);
        assert.strictEqual(last.newStock, 7);
        assert.strictEqual(last.quantity, -13);
      },
    },
    {
      name: 'Deleting a product keeps Category.productCount accurate',
      fn: async ({ BASE, request, fixtures, db }) => {
        const at = await token({ BASE, request, fixtures }, 'admin');
        const catName = `QA DelCount ${Date.now()}`;
        const slug = `qa-delcount-${Date.now()}`;
        await request.post(BASE, '/api/categories', { token: at, body: { name: catName, slug, description: 'delete count test' } });
        const mk = (n) => request.post(BASE, '/api/products', { token: at, body: { name: `QA Del ${n}`, slug: `qa-del-${n}-${Date.now()}`, price: 1, category: catName, description: 'delete count product', countInStock: 3 } });
        const p1 = await mk(1);
        await mk(2);
        let cat = await db.col('categories').findOne({ name: catName });
        assert.strictEqual(cat.productCount, 2);
        const del = await request.delete(BASE, `/api/products/${p1.body._id}`, { token: at });
        assert.strictEqual(del.status, 200);
        cat = await db.col('categories').findOne({ name: catName });
        assert.strictEqual(cat.productCount, 1, 'count must drop after deletion');
      },
    },
    {
      name: 'Moving a product between categories updates both counts',
      fn: async ({ BASE, request, fixtures, db }) => {
        const at = await token({ BASE, request, fixtures }, 'admin');
        const stamp = Date.now();
        const catA = `QA Move A ${stamp}`;
        const catB = `QA Move B ${stamp}`;
        await request.post(BASE, '/api/categories', { token: at, body: { name: catA, slug: `qa-move-a-${stamp}`, description: 'move test' } });
        await request.post(BASE, '/api/categories', { token: at, body: { name: catB, slug: `qa-move-b-${stamp}`, description: 'move test' } });
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Move Item', slug: `qa-move-item-${stamp}`, price: 1, category: catA, description: 'move product', countInStock: 3 } });
        await request.put(BASE, `/api/products/${created.body._id}`, { token: at, body: { name: 'QA Move Item', slug: `qa-move-item-${stamp}`, price: 1, category: catB, description: 'move product', countInStock: 3 } });
        const a = await db.col('categories').findOne({ name: catA });
        const b = await db.col('categories').findOne({ name: catB });
        assert.strictEqual(a.productCount, 0, 'old category must drop to 0');
        assert.strictEqual(b.productCount, 1, 'new category must gain the product');
      },
    },
    {
      name: 'Concurrent decrements produce an exact audit chain',
      fn: async ({ BASE, request, fixtures, db }) => {
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-chain-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Chain Item', slug, price: 1, category: 'QA Cat', description: 'audit chain test', countInStock: 40 } });
        const id = created.body._id;
        const n = 6;
        // Fire simultaneously; stock must drop exactly n and the audit trail
        // must form an unbroken previousStock -> newStock chain.
        await Promise.all(
          Array.from({ length: n }, async () => {
            const res = await request.put(BASE, `/api/products/${id}`, {
              token: at,
              body: { name: 'QA Chain Item', slug, price: 1, category: 'QA Cat', description: 'audit chain test', countInStock: 40 },
            });
            assert.strictEqual(res.status, 200, res.body.message);
            return request.post(BASE, '/api/orders', {
              token: await token({ BASE, request, fixtures }, 'customer'),
              body: {
                orderItems: [{ name: 'QA Chain Item', qty: 1, image: 'x', price: 1, product: id }],
                shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
                paymentMethod: 'COD',
              },
            });
          })
        );
        const doc = await db.col('products').findOne({ _id: new ObjectId(id) });
        assert.strictEqual(doc.countInStock, 40 - n, `expected ${40 - n}, got ${doc.countInStock}`);
        const entries = (doc.stockHistory || []).filter((h) => h.note === 'Order placed');
        assert.strictEqual(entries.length, n, `expected ${n} order entries, got ${entries.length}`);
        for (let i = 1; i < entries.length; i++) {
          assert.strictEqual(entries[i].previousStock, entries[i - 1].newStock,
            `audit chain broken at ${i}: ${entries[i - 1].newStock} -> ${entries[i].previousStock}`);
        }
      },
    },
    {
      name: 'Public category counts exclude draft products',
      fn: async ({ BASE, request, fixtures, db }) => {
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-count-${Date.now()}`;
        const catName = `QA Count ${Date.now()}`;
        await request.post(BASE, '/api/categories', { token: at, body: { name: catName, slug, description: 'count test' } });
        const mk = (n, status) => request.post(BASE, '/api/products', { token: at, body: { name: `QA Count ${n}`, slug: `qa-count-${n}-${Date.now()}`, price: 1, category: catName, description: 'count test product', countInStock: 5, status } });
        await mk(1, 'active');
        await mk(2, 'active');
        await mk(3, 'draft');
        const pub = await request.get(BASE, '/api/categories/public');
        const cat = pub.body.find((c) => c.slug === slug);
        assert.ok(cat, 'category should be public');
        assert.strictEqual(cat.productCount, 2, 'should count 2 active products, not the draft');
      },
    },
    {
      name: 'Stored Category.productCount stays accurate after a sale',
      fn: async ({ BASE, request, fixtures, db }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const at = await token({ BASE, request, fixtures }, 'admin');
        const catName = `QA Recount ${Date.now()}`;
        const slug = `qa-recount-${Date.now()}`;
        await request.post(BASE, '/api/categories', { token: at, body: { name: catName, slug, description: 'recount test' } });
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Recount Item', slug: `qa-recount-item-${Date.now()}`, price: 2, category: catName, description: 'recount test product', countInStock: 5 } });
        await order({ BASE, request, tok, product: { _id: created.body._id, name: 'QA Recount Item' }, qty: 1 });
        const cat = await db.col('categories').findOne({ name: catName });
        assert.strictEqual(cat.productCount, 1, 'stored productCount should equal real active product count');
      },
    },
    {
      name: 'Dashboard revenue excludes cancelled orders',
      fn: async ({ BASE, request, fixtures, db }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const at = await token({ BASE, request, fixtures }, 'admin');
        const slug = `qa-rev-${Date.now()}`;
        const created = await request.post(BASE, '/api/products', { token: at, body: { name: 'QA Rev Item', slug, price: 10, category: 'QA Cat', description: 'revenue test item', countInStock: 50 } });
        const p = { _id: created.body._id, name: 'QA Rev Item' };

        const live = await order({ BASE, request, tok, product: p, qty: 1 });
        const cancelled = await order({ BASE, request, tok, product: p, qty: 1 });
        await request.put(BASE, `/api/orders/${cancelled.body._id}/cancel`, { token: tok, body: { reason: 'QA revenue' } });

        const stats = await request.get(BASE, '/api/admin/stats', { token: at });
        // Revenue must equal the sum of non-cancelled order totals.
        // NOTE: native driver aggregate() returns a cursor — must call .toArray().
        const realRevenue = await db.col('orders').aggregate([
          { $match: { status: { $in: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'] }, refundStatus: { $nin: ['refunded'] } } },
          { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]).toArray();
        const expectedTotal = realRevenue[0]?.total || 0;
        assert.ok(Math.abs(stats.body.totalSales - expectedTotal) < 0.01,
          `totalSales ${stats.body.totalSales} should match non-cancelled revenue ${expectedTotal}`);
        assert.ok(expectedTotal > 0, 'revenue fixture must be non-zero for this test to be meaningful');
        // The cancelled order must not be counted at all.
        assert.ok(stats.body.totalSales <= expectedTotal, 'cancelled revenue must be excluded');
      },
    },
    {
      name: 'Admin order list is paginated',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await token({ BASE, request, fixtures }, 'orderManager');
        const res = await request.get(BASE, '/api/orders', { token: t, query: { page: 1, pageSize: 2 } });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.orders), 'expected orders array');
        assert.ok(typeof res.body.total === 'number', 'expected total count');
        assert.ok(res.body.orders.length <= 2, 'pageSize must be respected');
      },
    },
    {
      name: 'Order tracking origin matches configured region (not hardcoded Mumbai)',
      fn: async ({ BASE, request, fixtures }) => {
        const tok = await token({ BASE, request, fixtures }, 'customer');
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const o = await order({ BASE, request, tok, product: p, qty: 1 });
        assert.notStrictEqual(o.body.shippingOrigin.city, 'Mumbai', 'origin must not be hardcoded to Mumbai');
      },
    },
  ],
};