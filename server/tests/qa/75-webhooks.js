const assert = require('assert');
const crypto = require('crypto');
const { ObjectId } = require('mongoose').Types;

// Builds a Stripe-style signature header (t=<ts>,v1=<hmac sha256 of "ts.payload">)
// so webhook signature verification can be exercised without real Stripe calls.
function stripeSignature(payload, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const signed = `${timestamp}.${payload}`;
  const v1 = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

const SECRET = 'whsec_qa_dummy_secret';

async function setupOrder({ BASE, request, fixtures, db }, label) {
  const login = await request.post(BASE, '/api/users/login', {
    body: { email: fixtures.USERS.customer.email, password: fixtures.USERS.customer.password },
  });
  const tok = login.body.token;
  const prods = await request.get(BASE, '/api/products', { query: { keyword: 'QA Widget', pageSize: 5 } });
  const p = prods.body.products.find((x) => x.name === 'QA Widget');

  const created = await request.post(BASE, '/api/orders', {
    token: tok,
    body: {
      orderItems: [{ name: p.name, qty: 1, image: 'x', price: 1, product: p._id }],
      shippingAddress: { fullName: 'QA', street: '1 St', city: 'City', zip: '12345' },
      paymentMethod: 'Stripe',
    },
  });
  assert.strictEqual(created.status, 201, created.body.message);
  const orderId = created.body._id;
  const intentId = `pi_qa_${label}_${orderId.slice(-6)}`;
  // Bind the intent directly. Calling /create-intent would require real Stripe
  // credentials; the binding it performs is plain persisted state.
  await db.col('orders').updateOne({ _id: new ObjectId(orderId) }, { $set: { paymentIntentId: intentId } });
  return { tok, orderId, intentId };
}

module.exports = {
  name: 'Stripe Webhook Signature Verification',
  tests: [
    {
      name: 'Webhook rejects a request with no signature',
      fn: async ({ BASE, request }) => {
        const payload = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } });
        await assert.rejects(
          request.post(BASE, '/api/payments/webhook', { body: payload, headers: { 'Content-Type': 'application/json' } }),
          (e) => e.status === 400 && /signature/i.test(e.body.message)
        );
      },
    },
    {
      name: 'Webhook rejects a forged signature',
      fn: async ({ BASE, request }) => {
        const payload = JSON.stringify({ id: 'evt_2', type: 'payment_intent.succeeded', data: { object: { id: 'pi_2' } } });
        const forged = stripeSignature(payload, 'whsec_attacker_secret');
        await assert.rejects(
          request.post(BASE, '/api/payments/webhook', {
            body: payload,
            headers: { 'Content-Type': 'application/json', 'stripe-signature': forged },
          }),
          (e) => e.status === 400 && /signature/i.test(e.body.message)
        );
      },
    },
    {
      name: 'Webhook rejects a signature over different bytes (tampered body)',
      fn: async ({ BASE, request }) => {
        const original = JSON.stringify({ id: 'evt_3', type: 'payment_intent.succeeded', data: { object: { id: 'pi_3' } } });
        const sig = stripeSignature(original, SECRET);
        const tampered = JSON.stringify({ id: 'evt_3', type: 'payment_intent.succeeded', data: { object: { id: 'pi_ATTACKER' } } });
        await assert.rejects(
          request.post(BASE, '/api/payments/webhook', {
            body: tampered,
            headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
          }),
          (e) => e.status === 400 && /signature/i.test(e.body.message)
        );
      },
    },
    {
      name: 'Webhook accepts a correctly signed event and confirms the order',
      fn: async (ctx) => {
        const { BASE, request } = ctx;
        const { tok, orderId, intentId } = await setupOrder(ctx, 'ok');
        const payload = JSON.stringify({
          id: `evt_${orderId.slice(-6)}`,
          type: 'payment_intent.succeeded',
          data: { object: { id: intentId, metadata: { orderId } } },
        });
        const res = await request.post(BASE, '/api/payments/webhook', {
          body: payload,
          headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload, SECRET) },
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.received, true);

        const check = await request.get(BASE, `/api/orders/${orderId}`, { token: tok });
        assert.strictEqual(check.body.isPaid, true, 'webhook must mark the order paid');
        assert.ok(check.body.paidAt, 'paidAt must be set');
      },
    },
    {
      name: 'Webhook does not confirm an order with a mismatched intent id',
      fn: async (ctx) => {
        const { BASE, request } = ctx;
        const { tok, orderId } = await setupOrder(ctx, 'mismatch');
        const payload = JSON.stringify({
          id: `evt_bad_${orderId.slice(-6)}`,
          type: 'payment_intent.succeeded',
          data: { object: { id: `pi_someone_elses`, metadata: { orderId } } },
        });
        const res = await request.post(BASE, '/api/payments/webhook', {
          body: payload,
          headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload, SECRET) },
        });
        assert.strictEqual(res.status, 200);
        const check = await request.get(BASE, `/api/orders/${orderId}`, { token: tok });
        assert.strictEqual(check.body.isPaid, false, 'a mismatched intent must not mark the order paid');
      },
    },
    {
      name: 'Webhook replay for an already-paid order is idempotent',
      fn: async (ctx) => {
        const { BASE, request } = ctx;
        const { tok, orderId, intentId } = await setupOrder(ctx, 'replay');
        const payload = JSON.stringify({
          id: `evt_replay_${orderId.slice(-6)}`,
          type: 'payment_intent.succeeded',
          data: { object: { id: intentId, metadata: { orderId } } },
        });
        const headers = { 'Content-Type': 'application/json', 'stripe-signature': stripeSignature(payload, SECRET) };
        const first = await request.post(BASE, '/api/payments/webhook', { body: payload, headers });
        assert.strictEqual(first.status, 200);
        const second = await request.post(BASE, '/api/payments/webhook', { body: payload, headers });
        assert.strictEqual(second.status, 200, 'replay must not error');

        const check = await request.get(BASE, `/api/orders/${orderId}`, { token: tok });
        assert.strictEqual(check.body.isPaid, true);
        // paidAt must not be pushed forward by a duplicate delivery.
        const raw = await ctx.db.col('orders').findOne({ _id: new ObjectId(orderId) });
        assert.ok(raw.paidAt, 'paidAt present');
      },
    },
  ],
};