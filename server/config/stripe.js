const Stripe = require('stripe');

/**
 * Stripe is entirely configuration-driven: once the keys are present in the
 * environment the feature turns on, with no code change.
 *
 *   STRIPE_SECRET_KEY       sk_live_… / sk_test_…   (required, server only)
 *   STRIPE_PUBLISHABLE_KEY  pk_live_… / pk_test_…   (required for the browser)
 *   STRIPE_WEBHOOK_SECRET   whsec_…                (required for confirmations)
 *
 * The publishable key is deliberately NOT treated as a secret. It is returned
 * to the browser by GET /api/payments/config so the frontend can be configured
 * at runtime instead of at build time, meaning adding keys never requires a
 * frontend rebuild.
 */

const secretKey = () => (process.env.STRIPE_SECRET_KEY || '').trim();
const publishableKey = () => (process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
const webhookSecret = () => (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

const isSecretConfigured = () => secretKey().length > 0;
const isPublishableConfigured = () => publishableKey().length > 0;
const isWebhookConfigured = () => webhookSecret().length > 0;

/** Card payments need both halves: the secret to charge, the publishable to render. */
const isPaymentsEnabled = () => isSecretConfigured() && isPublishableConfigured();

const isLiveMode = () => /^sk_live_/.test(secretKey());

let client = null;
let clientKey = null;

/**
 * Lazily constructs the Stripe client so the key can be rotated by a redeploy
 * without this module being cached across processes.
 */
const getStripe = () => {
  const key = secretKey();
  if (!key) return null;
  if (client && clientKey === key) return client;
  clientKey = key;
  client = new Stripe(key, {
    // Pinned explicitly so behaviour does not shift under us on an SDK bump.
    // Override with STRIPE_API_VERSION if the account requires a different one.
    apiVersion: (process.env.STRIPE_API_VERSION || '2024-06-20').trim(),
    typescript: false,
    maxNetworkRetries: 2,
    timeout: 20000,
  });
  return client;
};

/**
 * Currency for charges. Taken from the store settings so the amount and the
 * currency always agree; never trusted from the client.
 */
const resolveCurrency = () => {
  const raw = (process.env.STRIPE_CURRENCY || '').trim().toLowerCase();
  if (/^[a-z]{3}$/.test(raw)) return raw;
  return 'usd';
};

module.exports = {
  getStripe,
  secretKey,
  publishableKey,
  webhookSecret,
  isSecretConfigured,
  isPublishableConfigured,
  isWebhookConfigured,
  isPaymentsEnabled,
  isLiveMode,
  resolveCurrency,
};