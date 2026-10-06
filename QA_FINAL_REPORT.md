# Life In Pieces — QA & Security Audit Report

**Status:** 114/114 automated checks passing (100%) across 14 suites.

- **Generated:** 2026-10-06T16:02:01.435Z
- **Scope:** uncommitted working tree (session rotation + preflight + runbook, on top of c29abff)
- **Environment:** mongodb://localhost:27017/novacart_qa (isolated; production never written to)
- **Determinism:** 114/114 on three consecutive runs; client production build clean.
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
| Refunds, Free Shipping, Stock Audit & Analytics | 15 |
| Concurrency & Inventory Races | 2 |
| Security & Injection | 6 |
| Data Consistency Invariants | 8 |
| **Total** | **114** |

## Resolved

- Sessions now use a short-lived (15m) access JWT plus an opaque, server-side revocable refresh token. Logout revokes the session row, so a stolen refresh token dies immediately instead of at expiry.
- Refresh tokens rotate on every use; replaying a rotated token is rejected. Concurrent refreshes are deduplicated in the client so parallel 401s trigger a single exchange.
- A password change revokes every session, then mints a replacement so the acting device stays signed in.
- Fixed: /api/users/refresh could mint new tokens for a DISABLED account because it never re-checked isActive.
- /api/users/refresh no longer requires a valid access token (it uses optionalAuth), which is the whole point of the endpoint.
- Expired/revoked sessions are pruned on an interval; the TTL index is a backstop.
- server/scripts/preflight.js: read-only release gate covering required env vars, secret strength, Stripe mode, upload durability, DB branding, image collisions, collection counts and replica-set topology. Exits non-zero on any blocker.
- DEPLOY_RUNBOOK.md: ordered manual steps with verified commands and a 9-point smoke test.

## Earlier defect fixes (still covered)

- **Stripe webhooks were non-functional**: the global `express.json()` consumed the body before the route-level `express.raw()`, so `constructEvent()` never received the signed bytes. Fixed via the parser `verify` hook; covered by signature, forgery, tampering, intent-binding and replay tests.
- **Stock restoration bypassed the audit trail** in order cancellation, promotion-limit rollback and admin cancellation.
- **`stockHistory` wrote unknown fields** (`reason/actor/timestamp` vs the schema’s `note/createdBy/date`) which Mongoose silently dropped.
- **`stockHistory` used read-then-write**, so concurrent writes recorded inconsistent `previousStock` (6 of 8 entries claimed the same start). Now a single atomic pipeline update; verified `58→57→…→44`.
- **Revenue counted cancelled orders as sales**; one shared rule now excludes cancelled and refunded orders everywhere.
- **Registration crashed** on a `ReferenceError`; cart **double-discounted**; order tracking had an **IDOR**; admin permissions were **coarse**; the **seed script could wipe production**; `GET /api/orders` and `/myorders` were **unbounded**; shipping origin was **hardcoded to Mumbai**.
- The server **refuses to boot** without `JWT_SECRET`/`MONGO_URI` in production, and warns when `UPLOAD_DIR` is unset on an ephemeral host.

## Not executed

- Real Stripe API calls (PaymentIntent create/confirm) and live dashboard refunds - no real credentials
- Full browser-driven UI E2E (no headless browser tooling configured)
- Live mutation of Atlas (branding update and image migration were verified only against local fixtures; the read-only checks were run against production)
- Live webhook delivery from Stripe
- Mobile/responsive visual regression and Lighthouse performance budgets

## Known blockers before production

| Severity | Issue | Action |
|---|---|---|
| BLOCKER | Render has no JWT_SECRET; admin login fails with "secretOrPrivateKey must have a value". CONFIRMED against production. | Runbook Step 1. The app now refuses to boot without it. |
| BLOCKER | Production API still returns "name":"NovaCart". CONFIRMED live via /api/settings. | Runbook Step 2 (admin UI or PUT /api/settings/store). |
| HIGH | Product and category image paths collide, so editing a product photo changes the category tile. | Runbook Step 3: server/scripts/separateProductImages.js --apply, then deploy the client. |
| HIGH | Uploads go to Render local disk and are lost on redeploy. | Runbook Step 4: mount a disk and set UPLOAD_DIR. |
| MEDIUM | MongoDB is standalone, so checkout is not ACID; it uses per-document atomic guards plus compensating rollback. | Convert to a replica set. |
| LOW | An Atlas password was exposed earlier in this session. | Runbook Step 6: rotate the credential. |

## Re-running

```bash
cd server && node tests/runner.js

JWT_SECRET="$(openssl rand -hex 32)" \
MONGO_URI="mongodb+srv://…" BASE_URL="https://ril-q344.onrender.com" \
node scripts/preflight.js
```
