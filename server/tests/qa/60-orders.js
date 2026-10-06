const assert = require('assert');
const { ObjectId } = require('mongoose').Types;

async function custToken({ BASE, request, fixtures }) {
  const res = await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.customer.email, password: fixtures.USERS.customer.password } });
  return res.body.token;
}
async function adminToken({ BASE, request, fixtures }) {
  const res = await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.admin.email, password: fixtures.USERS.admin.password } });
  return res.body.token;
}
async function getProduct({ BASE, request }, name) {
  const res = await request.get(BASE, '/api/products', { query: { keyword: name, pageSize: 5 } });
  return res.body.products.find((x) => x.name === name);
}
async function makeOrder({ BASE, request, token, product, qty = 1, promoCode, idempotencyKey }) {
  return request.post(BASE, '/api/orders', {
    token,
    body: {
      orderItems: [{ name: product.name, qty, image: 'x', price: 1, product: product._id }],
      shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
      paymentMethod: 'COD', ...(promoCode ? { promoCode } : {}), ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  });
}

module.exports = {
  name: 'Orders, Cancellation & Idempotency',
  tests: [
    {
      name: 'Legal status transition Pending -> Processing -> Shipped -> Delivered',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const at = await adminToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const o = await makeOrder({ BASE, request, token: t, product: p });
        const id = o.body._id;
        for (const s of ['Processing', 'Shipped', 'Out for Delivery', 'Delivered']) {
          const r = await request.put(BASE, `/api/orders/${id}/status`, { token: at, body: { status: s } });
          assert.strictEqual(r.status, 200, `transition to ${s} failed: ${r.body.message}`);
          assert.strictEqual(r.body.status, s);
        }
      },
    },
    {
      name: 'Illegal transition Delivered -> Cancelled is rejected',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const at = await adminToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const o = await makeOrder({ BASE, request, token: t, product: p });
        const id = o.body._id;
        for (const s of ['Processing', 'Shipped', 'Out for Delivery', 'Delivered']) {
          await request.put(BASE, `/api/orders/${id}/status`, { token: at, body: { status: s } });
        }
        await assert.rejects(
          request.put(BASE, `/api/orders/${id}/status`, { token: at, body: { status: 'Cancelled' } }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Illegal transition Pending -> Delivered is rejected',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const at = await adminToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const o = await makeOrder({ BASE, request, token: t, product: p });
        await assert.rejects(
          request.put(BASE, `/api/orders/${o.body._id}/status`, { token: at, body: { status: 'Delivered' } }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Customer cancellation restores stock exactly once',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget'); // stock 50
        const before = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        const o = await makeOrder({ BASE, request, token: t, product: p, qty: 5 });
        const afterOrder = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.strictEqual(afterOrder, before - 5);
        const cancel = await request.put(BASE, `/api/orders/${o.body._id}/cancel`, { token: t, body: { reason: 'QA cancel' } });
        assert.strictEqual(cancel.status, 200);
        const afterCancel = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.strictEqual(afterCancel, before, `stock should be restored to ${before}, got ${afterCancel}`);
      },
    },
    {
      name: 'Double cancellation does not double-restore stock',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const before = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        const o = await makeOrder({ BASE, request, token: t, product: p, qty: 2 });
        await request.put(BASE, `/api/orders/${o.body._id}/cancel`, { token: t, body: { reason: 'QA' } });
        // Second cancel should fail (already Cancelled)
        await assert.rejects(
          request.put(BASE, `/api/orders/${o.body._id}/cancel`, { token: t, body: { reason: 'QA' } }),
          (e) => e.status === 400
        );
        const after = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.strictEqual(after, before, `stock must not double-restore; expected ${before}, got ${after}`);
      },
    },
    {
      name: 'Idempotency key prevents duplicate orders',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const key = `qa_idem_${Date.now()}`;
        const first = await makeOrder({ BASE, request, token: t, product: p, idempotencyKey: key });
        assert.strictEqual(first.status, 201);
        const second = await makeOrder({ BASE, request, token: t, product: p, idempotencyKey: key });
        assert.strictEqual(second.status, 200, 'duplicate should return 200 with existing order');
        assert.strictEqual(second.body._id, first.body._id, 'should return the same order');
        const count = await db.col('orders').countDocuments({ idempotencyKey: key });
        assert.strictEqual(count, 1, `expected 1 order, got ${count}`);
      },
    },
    {
      name: 'Customer cannot view another customer\'s order (IDOR)',
      fn: async ({ BASE, request, fixtures }) => {
        const t1 = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const o = await makeOrder({ BASE, request, token: t1, product: p });
        // Login as a different customer
        const t2res = await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.customer2.email, password: fixtures.USERS.customer2.password } });
        const t2 = t2res.body.token;
        await assert.rejects(request.get(BASE, `/api/orders/${o.body._id}`, { token: t2 }), (e) => e.status === 403);
      },
    },
    {
      name: 'Order tracking requires authentication',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const o = await makeOrder({ BASE, request, token: t, product: p });
        // No token -> 401
        await assert.rejects(request.get(BASE, `/api/orders/track/${o.body._id}`), (e) => e.status === 401);
      },
    },
  ],
};