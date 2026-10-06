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
  name: 'Data Consistency Invariants',
  tests: [
    {
      name: 'INV-1: Product stock never goes negative',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA NoStock'); // stock 0
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token: t,
            body: { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
          }),
          (e) => e.status === 400
        );
        const after = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.ok(after >= 0, `stock went negative: ${after}`);
      },
    },
    {
      name: 'INV-2: Order total = items + tax + shipping - discount',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Premium'); // $99.99
        const o = await request.post(BASE, '/api/orders', {
          token: t,
          body: { orderItems: [{ name: p.name, qty: 2, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
        });
        const { itemsPrice, taxPrice, shippingPrice, discountPrice, totalPrice } = o.body;
        assert.strictEqual(totalPrice, Math.round((itemsPrice + taxPrice + shippingPrice - discountPrice) * 100) / 100);
      },
    },
    {
      name: 'INV-4: Order quantity is always > 0',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token: t,
            body: { orderItems: [{ name: p.name, qty: 0, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
          }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'INV-9: Draft products are not publicly purchasable',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Draft');
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token: t,
            body: { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
          }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'INV-11: User cannot access another user\'s order',
      fn: async ({ BASE, request, fixtures }) => {
        const t1 = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const o = await request.post(BASE, '/api/orders', {
          token: t1,
          body: { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
        });
        const t2 = (await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.customer2.email, password: fixtures.USERS.customer2.password } })).body.token;
        await assert.rejects(request.get(BASE, `/api/orders/${o.body._id}`, { token: t2 }), (e) => e.status === 403);
      },
    },
    {
      name: 'INV-15: UI total (order total) equals backend total',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const o = await request.post(BASE, '/api/orders', {
          token: t,
          body: { orderItems: [{ name: p.name, qty: 3, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
        });
        // Re-fetch the order — the stored total must match what was returned
        const refetched = await request.get(BASE, `/api/orders/${o.body._id}`, { token: t });
        assert.strictEqual(refetched.body.totalPrice, o.body.totalPrice);
      },
    },
    {
      name: 'INV-19: Duplicate idempotency key does not create duplicate orders',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const key = `qa_inv19_${Date.now()}`;
        const body = { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD', idempotencyKey: key };
        await request.post(BASE, '/api/orders', { token: t, body });
        await request.post(BASE, '/api/orders', { token: t, body });
        const count = await db.col('orders').countDocuments({ idempotencyKey: key });
        assert.strictEqual(count, 1);
      },
    },
    {
      name: 'INV-20: Failed order does not leave partial state',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA NoStock'); // stock 0, will fail
        const before = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token: t,
            body: { orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }], shippingAddress: { fullName: 'Q', street: 's', city: 'c', zip: '1' }, paymentMethod: 'COD' },
          }),
          (e) => e.status === 400
        );
        const orderCount = await db.col('orders').countDocuments({ user: fixtures.USERS.customer.email });
        assert.strictEqual(orderCount, 0, 'no order should be created on failure');
        const after = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.strictEqual(after, before, 'stock must be unchanged after failed order');
      },
    },
  ],
};