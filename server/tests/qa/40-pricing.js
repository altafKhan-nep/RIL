const assert = require('assert');

async function login({ BASE, request, fixtures }, email, password) {
  const res = await request.post(BASE, '/api/users/login', { body: { email, password } });
  assert.strictEqual(res.status, 200, 'login failed');
  return res.body.token;
}

async function getProduct({ BASE, request }, name) {
  const res = await request.get(BASE, '/api/products', { query: { keyword: name, pageSize: 5 } });
  const p = res.body.products.find((x) => x.name === name);
  assert.ok(p, `product ${name} not found`);
  return p;
}

module.exports = {
  name: 'Pricing & Authoritative Totals',
  tests: [
    {
      name: 'Order total is server-computed from DB prices (not client)',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await login({ BASE, request, fixtures }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        const p = await getProduct({ BASE, request }, 'QA Widget'); // $10, stock 100
        const res = await request.post(BASE, '/api/orders', {
          token,
          body: {
            orderItems: [{ name: p.name, qty: 2, image: p.images?.[0] || '', price: 999, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD',
            itemsPrice: 0, taxPrice: 0, shippingPrice: 0, discountPrice: 0, totalPrice: 0.01,
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        // 2 x $10 = $20 items; below $50 threshold -> +$5.99 shipping; 8% tax = $1.60
        assert.strictEqual(res.body.itemsPrice, 20);
        assert.strictEqual(res.body.shippingPrice, 5.99);
        assert.strictEqual(res.body.taxPrice, 1.6);
        assert.strictEqual(res.body.totalPrice, 27.59);
      },
    },
    {
      name: 'Free shipping applies at/above threshold',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await login({ BASE, request, fixtures }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        const p = await getProduct({ BASE, request }, 'QA Premium'); // $99.99
        const res = await request.post(BASE, '/api/orders', {
          token,
          body: {
            orderItems: [{ name: p.name, qty: 1, image: '', price: 1, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD',
            itemsPrice: 0, taxPrice: 0, shippingPrice: 999, discountPrice: 0, totalPrice: 0.01,
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        assert.strictEqual(res.body.itemsPrice, 99.99);
        assert.strictEqual(res.body.shippingPrice, 0); // free over $50
        assert.strictEqual(res.body.taxPrice, 8); // 8% of 99.99 = 7.9992 -> 8.00
        assert.strictEqual(res.body.totalPrice, 107.99);
      },
    },
    {
      name: 'New order is NOT auto-marked paid',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await login({ BASE, request, fixtures }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        const p = await getProduct({ BASE, request }, 'QA Gadget');
        const res = await request.post(BASE, '/api/orders', {
          token,
          body: {
            orderItems: [{ name: p.name, qty: 1, image: '', price: 20, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'Card',
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        assert.strictEqual(res.body.isPaid, false, 'order must not be auto-paid');
        assert.strictEqual(res.body.paidAt, undefined);
      },
    },
    {
      name: 'Draft product cannot be ordered',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await login({ BASE, request, fixtures }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        const p = await getProduct({ BASE, request }, 'QA Draft');
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token,
            body: {
              orderItems: [{ name: p.name, qty: 1, image: 'x', price: 5, product: p._id }],
              shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
              paymentMethod: 'COD',
            },
          }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Insufficient stock is rejected',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await login({ BASE, request, fixtures }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        const p = await getProduct({ BASE, request }, 'QA NoStock'); // stock 0
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token,
            body: {
              orderItems: [{ name: p.name, qty: 1, image: 'x', price: 8, product: p._id }],
              shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
              paymentMethod: 'COD',
            },
          }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Stock is decremented exactly by ordered qty',
      fn: async ({ BASE, request, fixtures, db }) => {
        const token = await login({ BASE, request, fixtures }, fixtures.USERS.customer.email, fixtures.USERS.customer.password);
        const p = await getProduct({ BASE, request }, 'QA Gadget'); // stock 50
        const { ObjectId } = require('mongoose').Types;
        const before = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        const res = await request.post(BASE, '/api/orders', {
          token,
          body: {
            orderItems: [{ name: p.name, qty: 3, image: 'x', price: 20, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD',
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        const after = (await db.col('products').findOne({ _id: new ObjectId(p._id) })).countInStock;
        assert.strictEqual(after, before - 3, `expected ${before - 3}, got ${after}`);
      },
    },
  ],
};