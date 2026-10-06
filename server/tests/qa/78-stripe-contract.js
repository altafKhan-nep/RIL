const assert = require('assert');
const crypto = require('crypto');
const { ObjectId } = require('mongoose').Types;

const SECRET = process.env.QA_STRIPE_WEBHOOK_SECRET || 'whsec_qa_dummy_secret';
const PUB = process.env.QA_STRIPE_PUBLISHABLE_KEY || 'pk_test_qa_dummy';

const stripeSignature = (payload, secret = SECRET) => {
  const ts = Math.floor(Date.now() / 1000);
  return `t=${ts},v1=${crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')}`;
};

async function auth({ BASE, request, fixtures }, role = 'customer') {
  const u = fixtures.USERS[role];
  const res = await request.post(BASE, '/api/users/login', { body: { email: u.email, password: u.password } });
  return res.body.token;
}

async function makeOrder({ BASE, request, token }, name = 'QA Stripe Item') {
  const prods = await request.get(BASE, '/api/products', { query: { keyword: 'QA Widget', pageSize: 5 } });
  const p = prods.body.products.find((x) => x.name === 'QA Widget');
  const created = await request.post(BASE, '/api/orders', {
    token,
    body: {
      orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
      shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
      paymentMethod: 'Card',
    },
  });
  assert.strictEqual(created.status, 201, created.body.message);
  return created.body;
}

module.exports = {
  name: 'Stripe Configuration & Card Flow Contract',
  tests: [
    {
      name: 'GET /payments/config is public and reports the publishable key',
      fn: async ({ BASE, request }) => {
        const res = await request.get(BASE, '/api/payments/config');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(typeof res.body.enabled, 'boolean');
        assert.strictEqual(res.body.currency, 'usd');
        // Never leak the secret key to the browser.
        assert.ok(!JSON.stringify(res.body).includes('sk_'), 'must not expose the secret key');
      },
    },
    {
      name: 'create-intent requires an orderId (the old client flow omitted it)',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await auth({ BASE, request, fixtures });
        // This is exactly what the previous frontend sent and it must not work.
        await assert.rejects(
          request.post(BASE, '/api/payments/create-intent', { token, body: { amount: 10, currency: 'usd' } }),
          (e) => e.status === 400 && /orderId is required/i.test(e.body.message)
        );
      },
    },
    {
      name: 'create-intent rejects an unknown order',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await auth({ BASE, request, fixtures });
        await assert.rejects(
          request.post(BASE, '/api/payments/create-intent', { token, body: { orderId: new ObjectId().toString() } }),
          (e) => e.status === 404
        );
      },
    },
    {
      name: 'create-intent rejects another customer\'s order',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await auth({ BASE, request, fixtures }, 'customer');
        const other = await auth({ BASE, request, fixtures }, 'customer2');
        const order = await makeOrder({ BASE, request, token: other });
        await assert.rejects(
          request.post(BASE, '/api/payments/create-intent', { token, body: { orderId: order._id } }),
          (e) => e.status === 403
        );
      },
    },
    {
      name: 'create-intent refuses an already-paid order',
      fn: async ({ BASE, request, fixtures, db }) => {
        const token = await auth({ BASE, request, fixtures });
        const order = await makeOrder({ BASE, request, token });
        await db.col('orders').updateOne({ _id: new ObjectId(order._id) }, { $set: { isPaid: true } });
        await assert.rejects(
          request.post(BASE, '/api/payments/create-intent', { token, body: { orderId: order._id } }),
          (e) => e.status === 400 && /already paid/i.test(e.body.message)
        );
      },
    },
    {
      name: 'create-intent refuses a cancelled order',
      fn: async ({ BASE, request, fixtures, db }) => {
        const token = await auth({ BASE, request, fixtures });
        const order = await makeOrder({ BASE, request, token });
        await db.col('orders').updateOne({ _id: new ObjectId(order._id) }, { $set: { status: 'Cancelled' } });
        await assert.rejects(
          request.post(BASE, '/api/payments/create-intent', { token, body: { orderId: order._id } }),
          (e) => e.status === 400 && /cancelled/i.test(e.body.message)
        );
      },
    },
    {
      name: 'create-intent requires authentication',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await auth({ BASE, request, fixtures });
        const order = await makeOrder({ BASE, request, token });
        await assert.rejects(
          request.post(BASE, '/api/payments/create-intent', { body: { orderId: order._id } }),
          (e) => e.status === 401
        );
      },
    },
    {
      name: 'confirm requires an intent id',
      fn: async ({ BASE, request, fixtures }) => {
        const token = await auth({ BASE, request, fixtures });
        await assert.rejects(
          request.post(BASE, '/api/payments/confirm', { token, body: {} }),
          (e) => e.status === 400
        );
      },
    },
    {
      name: 'Webhook: charge.refunded marks the order refunded',
      fn: async ({ BASE, request, fixtures, db }) => {
        const token = await auth({ BASE, request, fixtures });
        const order = await makeOrder({ BASE, request, token });
        const intentId = `pi_refund_${order._id.slice(-6)}`;
        await db.col('orders').updateOne(
          { _id: new ObjectId(order._id) },
          { $set: { isPaid: true, paidAt: new Date(), paymentIntentId: intentId } }
        );

        const payload = JSON.stringify({
          id: 'evt_refund',
          type: 'charge.refunded',
          data: { object: { payment_intent: intentId, amount_refunded: order.totalPrice * 100 } },
        });
        const res = await request.post(BASE, '/api/payments/webhook', {
          body: payload,
          headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload) },
        });
        assert.strictEqual(res.status, 200, res.body.message);

        const stored = await db.col('orders').findOne({ _id: new ObjectId(order._id) });
        assert.strictEqual(stored.refundStatus, 'refunded');
        assert.ok(stored.refundedAt, 'refundedAt must be set');
      },
    },
    {
      name: 'Webhook: payment_intent.payment_failed records the failure',
      fn: async ({ BASE, request, fixtures, db }) => {
        const token = await auth({ BASE, request, fixtures });
        const order = await makeOrder({ BASE, request, token });
        const intentId = `pi_fail_${order._id.slice(-6)}`;
        await db.col('orders').updateOne(
          { _id: new ObjectId(order._id) },
          { $set: { paymentIntentId: intentId } }
        );
        const payload = JSON.stringify({
          id: 'evt_fail',
          type: 'payment_intent.payment_failed',
          data: { object: { id: intentId, metadata: { orderId: order._id }, last_payment_error: { message: 'Card declined' } } },
        });
        const res = await request.post(BASE, '/api/payments/webhook', {
          body: payload,
          headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload) },
        });
        assert.strictEqual(res.status, 200);
        const stored = await db.col('orders').findOne({ _id: new ObjectId(order._id) });
        assert.strictEqual(stored.paymentStatus, 'failed');
        assert.match(String(stored.paymentError), /declined/i);
        assert.strictEqual(stored.isPaid, false, 'a failed payment must not mark the order paid');
      },
    },
    {
      name: 'Webhook: unknown event types are acknowledged, not retried forever',
      fn: async ({ BASE, request }) => {
        const payload = JSON.stringify({ id: 'evt_x', type: 'customer.created', data: { object: {} } });
        const res = await request.post(BASE, '/api/payments/webhook', {
          body: payload,
          headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload) },
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.received, true);
      },
    },
    {
      name: 'Webhook: succeeded event cannot mark an order with a different intent paid',
      fn: async ({ BASE, request, fixtures, db }) => {
        const token = await auth({ BASE, request, fixtures });
        const order = await makeOrder({ BASE, request, token });
        await db.col('orders').updateOne(
          { _id: new ObjectId(order._id) },
          { $set: { paymentIntentId: 'pi_mine' } }
        );
        const payload = JSON.stringify({
          id: 'evt_wrong',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_someone_elsees', metadata: { orderId: order._id } } },
        });
        await request.post(BASE, '/api/payments/webhook', {
          body: payload,
          headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload) },
        });
        const stored = await db.col('orders').findOne({ _id: new ObjectId(order._id) });
        assert.strictEqual(stored.isPaid, false, 'intent mismatch must not confirm payment');
      },
    },
    {
      name: 'Regression: mongodb+srv:// URIs are recognised as Atlas',
      fn: async () => {
        // The guard previously used /srv=/ which never matches "mongodb+srv://",
        // so every real Atlas URI was rejected by both maintenance scripts.
        const pattern = /^mongodb\+srv:\/\//;
        assert.strictEqual(pattern.test('mongodb+srv://u:p@cluster0.abc.mongodb.net/db?appName=X'), true,
          'an Atlas URI must be detected');
        assert.strictEqual(pattern.test('mongodb://127.0.0.1:27017/novacart_qa'), false,
          'a local URI must not be treated as Atlas');

        // And the shipped scripts must contain the fixed pattern.
        const fs = require('fs');
        const path = require('path');
        for (const f of ['separateProductImages.js', 'preflight.js']) {
          const src = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', f), 'utf8');
          assert.ok(!/srv=/.test(src), `${f} must not use the broken /srv=/ pattern`);
          assert.ok(src.includes('mongodb\\+srv'), `${f} must use the corrected Atlas pattern`);
        }
      },
    },
    {
      name: 'Stripe config reports each missing key so setup is diagnosable',
      fn: async () => {
        const cfg = require('../../config/stripe');
        assert.strictEqual(typeof cfg.isPaymentsEnabled(), 'boolean');
        assert.strictEqual(typeof cfg.isLiveMode(), 'boolean');
        assert.strictEqual(cfg.resolveCurrency(), 'usd');
        assert.strictEqual(typeof cfg.publishableKey(), 'string');
        assert.strictEqual(typeof cfg.webhookSecret(), 'string');
      },
    },
  ],
};