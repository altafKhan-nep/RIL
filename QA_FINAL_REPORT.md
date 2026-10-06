# Life In Pieces — QA & Security Audit Report

**Status:** 128/128 automated checks passing (100%) across 15 suites.

- **Generated:** 2026-10-06T16:36:20.479Z
- **Scope:** uncommitted working tree (Stripe card flow + tooling fixes, on top of b7b9729)
- **Environment:** mongodb://localhost:27017/novacart_qa (isolated; production never written to)
- **Determinism:** 128/128 on three consecutive runs; client production build clean.
- **Manual steps:** see `DEPLOY_RUNBOOK.md`. Readiness is gated by `node server/scripts/preflight.js` (read-only, exits non-zero on any blocker).

> Automated coverage is strong but is **not** equivalent to production readiness. Read *Not executed* and *Known blockers* before shipping.

## Suite breakdown

| Suite | Checks |
|---|---:|
| Smoke & Baseline | 6 |
| Authentication & Registration | 15 |
| Cookie Session Auth (httpOnly) | 12 |
| Refresh Token Rotation & Revocation | 10 |
| Roles & Permission Matrix | 9 |
| Pricing & Authoritative Totals | 6 |
| Promotions & Discounts | 6 |
| Orders, Cancellation & Idempotency | 8 |
| Admin ↔ Storefront Synchronization | 5 |
| Stripe Webhook Signature Verification | 6 |
| Stripe Configuration & Card Flow Contract | 14 |
| Refunds, Free Shipping, Stock Audit & Analytics | 15 |
| Concurrency & Inventory Races | 2 |
| Security & Injection | 6 |
| Data Consistency Invariants | 8 |
| **Total** | **128** |

## Resolved

- Card payments were completely non-functional: the client called create-intent with a client-supplied amount and no orderId, but the server requires an existing order to bind the intent to, so the request always failed with 400. The flow is now create order -> create intent bound to that order -> Stripe.js confirms -> /confirm reconciles.
- The publishable key was a build-time Vite variable, so setting it on the API host would never have reached the browser. It is now served at runtime from GET /api/payments/config, meaning enabling Stripe requires only pasting keys into Render with no frontend rebuild.
- When Stripe is unconfigured the card option is hidden and checkout explains why, instead of rendering a broken payment form; COD remains available.
- Payment intents are idempotent: an existing usable intent is reused and creation is keyed per order, so a double click or refresh cannot double-charge.
- Charge currency is validated server-side, so a correct-amount charge in the wrong currency cannot satisfy an order.
- Webhooks now also handle payment_intent.payment_failed, charge.refunded and charge.dispute.created, and acknowledge unknown event types so Stripe stops retrying.
- Added paymentStatus and paymentError to the Order schema; Mongoose was silently stripping them, losing every failure and refund state.
- Refunds use an idempotency key and never report success unless Stripe confirmed it.
- Removed the dead StripeProvider component, which hardcoded a build-time key and would have broken silently if reused.
- Fixed a bug in my own tooling: both maintenance scripts tested /srv=/ which never matches mongodb+srv://, so every real Atlas URI was rejected. A regression test now covers it.

## Earlier defect fixes (still covered)

- **Stripe webhooks were non-functional**: the global `express.json()` consumed the body before the route-level `express.raw()`, so signature verification could never succeed. Fixed via the parser `verify` hook.
- **Card payments could never work**: the client omitted the required `orderId` and sent a client-side amount.
- **Logout did not revoke anything**; sessions are now short-lived access JWTs plus opaque, server-side revocable refresh tokens that rotate on use.
- **Stock restoration bypassed the audit trail**, and `stockHistory` used read-then-write so concurrent entries recorded inconsistent `previousStock`. Now a single atomic pipeline update.
- **Revenue counted cancelled orders as sales.**
- **Order tracking had an IDOR**; registration crashed; the cart double-discounted; the seed script could wipe production; order lists were unbounded; shipping origin was hardcoded to Mumbai.
- The server **refuses to boot** without `JWT_SECRET`/`MONGO_URI` in production, and warns when `UPLOAD_DIR` is unset.

## Not executed

- Real Stripe API calls (PaymentIntent create/retrieve, refunds) - no live credentials in this environment
- Live Stripe webhook delivery - requires a public endpoint and Stripe CLI forwarding
- Full browser-driven UI E2E (no headless browser tooling configured)
- Live mutation of Atlas (branding update and image migration verified only against local fixtures)
- Mobile/responsive visual regression and Lighthouse performance budgets

## Known blockers before production

| Severity | Issue | Action |
|---|---|---|
| BLOCKER | Render has no JWT_SECRET; admin login fails with "secretOrPrivateKey must have a value". CONFIRMED against production. | Runbook Step 1. The app now refuses to boot without it. |
| BLOCKER | Production API still returns "name":"NovaCart". CONFIRMED live via /api/settings. | Runbook Step 2. |
| BLOCKER | Production runs commit 36778a9; the fixes in c7d6f76, c29abff, b7b9729 and the current work are not pushed. | git push, then redeploy on Render. |
| HIGH | Product and category image paths collide, so editing a product photo changes the category tile. | Runbook Step 3. |
| HIGH | Uploads go to Render local disk and are lost on redeploy. | Runbook Step 4. |
| MEDIUM | MongoDB is standalone, so checkout is not ACID. | Convert to a replica set. |
| LOW | An Atlas password has been exposed in chat and must be treated as compromised. | Rotate it (Runbook Step 6) before using the URI again. |

## Re-running

```bash
cd server && node tests/runner.js

JWT_SECRET="$(openssl rand -hex 32)" \
MONGO_URI="mongodb+srv://…" BASE_URL="https://ril-q344.onrender.com" \
node scripts/preflight.js
```
