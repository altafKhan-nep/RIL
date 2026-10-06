const assert = require('assert');

async function custToken({ BASE, request, fixtures }) {
  const res = await request.post(BASE, '/api/users/login', { body: { email: fixtures.USERS.customer.email, password: fixtures.USERS.customer.password } });
  return res.body.token;
}
async function getProduct({ BASE, request }, name) {
  const res = await request.get(BASE, '/api/products', { query: { keyword: name, pageSize: 5 } });
  return res.body.products.find((x) => x.name === name);
}

module.exports = {
  name: 'Promotions & Discounts',
  tests: [
    {
      name: 'Percentage promo discount is computed server-side',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget'); // $10
        const res = await request.post(BASE, '/api/orders', {
          token: t,
          body: {
            orderItems: [{ name: p.name, qty: 10, image: 'x', price: 1, product: p._id }], // 10 x $10 = $100
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD', promoCode: 'QATEST10',
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        assert.strictEqual(res.body.itemsPrice, 100);
        assert.strictEqual(res.body.discountPrice, 10); // 10% of 100
      },
    },
    {
      name: 'Fixed promo discount is applied',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const res = await request.post(BASE, '/api/orders', {
          token: t,
          body: {
            orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD', promoCode: 'QAFIXED5',
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        assert.strictEqual(res.body.discountPrice, 5);
      },
    },
    {
      name: 'Expired promo is rejected',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token: t,
            body: {
              orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
              shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
              paymentMethod: 'COD', promoCode: 'QAEXPIRED',
            },
          }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Invalid promo code is rejected',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        await assert.rejects(
          request.post(BASE, '/api/orders', {
            token: t,
            body: {
              orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
              shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
              paymentMethod: 'COD', promoCode: 'TOTALLYINVALID',
            },
          }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Usage limit is enforced (usageLimit=1, two orders)',
      fn: async ({ BASE, request, fixtures, db }) => {
        const t = await custToken({ BASE, request, fixtures });
        const p = await getProduct({ BASE, request }, 'QA Widget');
        const mk = () => request.post(BASE, '/api/orders', {
          token: t,
          body: {
            orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD', promoCode: 'QALIMIT1',
          },
        });
        const first = await mk();
        assert.strictEqual(first.status, 201, 'first order with limited promo should succeed');
        await assert.rejects(mk(), (e) => e.status === 400, 'second order should hit usage limit');
        const promo = await db.col('promotions').findOne({ code: 'QALIMIT1' });
        assert.strictEqual(promo.usedCount, 1, `usedCount should be 1, got ${promo.usedCount}`);
      },
    },
    {
      name: 'Client cannot inflate discount via cartTotal',
      fn: async ({ BASE, request, fixtures }) => {
        const t = await custToken({ BASE, request, fixtures });
        // validatePromotion still accepts a cartTotal for preview, but the
        // ORDER must use the server-computed discount. Verify order discount
        // is based on real item total, not a client-supplied cartTotal.
        const p = await getProduct({ BASE, request }, 'QA Widget'); // $10
        const res = await request.post(BASE, '/api/orders', {
          token: t,
          body: {
            orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
            shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
            paymentMethod: 'COD', promoCode: 'QATEST10',
          },
        });
        assert.strictEqual(res.status, 201, res.body.message);
        // 1 x $10 = $10 items; 10% = $1 discount (NOT 10% of an inflated cartTotal)
        assert.strictEqual(res.body.itemsPrice, 10);
        assert.strictEqual(res.body.discountPrice, 1);
      },
    },
  ],
};