# Life In Pieces — QA & Security Audit Report

**Status:** 104/104 automated checks passing (100%) across 13 suites.

- **Generated:** 2026-10-06T15:47:24.519Z
- **Scope:** uncommitted working tree (session cookie auth + production readiness, on top of c7d6f76)
- **Environment:** mongodb://localhost:27017/novacart_qa (isolated; production Atlas never touched)
- **Determinism:** 104/104 on three consecutive runs; client production build clean.

> Automated coverage is strong but is **not** equivalent to production readiness. Read *Not executed* and *Known blockers* before shipping.

## Suite breakdown

| Suite | Checks |
|---|---:|
| Smoke & Baseline | 6 |
| Authentication & Registration | 15 |
| Cookie Session Auth (httpOnly) | 12 |
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
| **Total** | **104** |

## Resolved this session

- JWT no longer stored in localStorage; sessions use an httpOnly, SameSite cookie (12 dedicated tests). Bearer tokens still supported for API clients.
- Startup now fails fast with an actionable message when JWT_SECRET or MONGO_URI is missing in production.
- Added /api/users/logout and /api/users/refresh for cookie lifecycle.
- Password change re-issues the session cookie so the current session survives revocation of older tokens.
- Product image / category image collision addressed with a tested migration script.
- UPLOAD_DIR made configurable so a persistent volume can be mounted.

## Defects fixed and covered by regression tests

### Payment integrity (Stripe)
- Webhook signature verification was **broken in production code**: the global `express.json()` consumed the request body before the route-level `express.raw()`, so `constructEvent()` could never receive the signed bytes. Fixed by stashing the raw buffer in the parser `verify` hook. Covered by missing-signature, forgery, tampered-body, valid-signature, mismatched-intent and replay tests.

### Inventory auditability
- Order cancellation, promotion-limit rollback and admin cancellation restored stock through **raw updates that bypassed the audit helper**, making those movements invisible.
- The helper wrote `reason/actor/timestamp` while the Product schema defines `note/createdBy/date`, so Mongoose **silently dropped** those fields.
- `stockHistory` used read-then-write; under concurrency 6 of 8 entries recorded the same `previousStock`. Replaced with a single atomic aggregation-pipeline update so the trail is exact and continuous (verified `58→57→…→44`).

### Analytics
- Revenue counted **cancelled orders as sales**. One shared rule now excludes cancelled and fully refunded orders from total sales, month-over-month revenue and the revenue-by-month chart.

### Authentication and sessions
- The browser persisted a long-lived JWT in `localStorage`, so any XSS could exfiltrate it. Sessions now use an httpOnly, SameSite cookie; the app stores only non-sensitive display data. Legacy keys are cleared on first load and bearer tokens still work for API clients.
- Added `tokenVersion`: a password change invalidates previously issued tokens, and the current session is re-issued rather than dropped.
- Password changes require the current password and the UI enforces the same 8-character minimum the API always required.
- Inactive accounts are rejected at login and on every authenticated request.

### Catalog and API
- Public category counts excluded drafts incorrectly; stored `Category.productCount` is maintained across create, update, category moves and deletion.
- `GET /api/orders` and `GET /api/orders/myorders` are paginated; client updated.
- Shipping origin is configurable rather than hardcoded to Mumbai.

## Operational hardening
- The server now **refuses to boot** in production when `JWT_SECRET` or `MONGO_URI` is missing, with an actionable message. This is the exact failure that left Render’s admin login broken.
- `UPLOAD_DIR` is configurable so a persistent volume can be mounted, and the app warns on boot when uploads would land on an ephemeral disk.
- `server/scripts/separateProductImages.js` repairs the product/category image collision. It is dry-run by default, refuses non-Atlas URIs without an explicit flag, copies assets to product-specific paths, and never modifies category images. Verified against a fixture, including the asset-path resolution and the no-collision path.

## Not executed

- Real Stripe API calls (PaymentIntent create/confirm) and live dashboard refunds - no real credentials
- Full browser-driven UI E2E (no headless browser tooling configured)
- Production Atlas / Render / Vercel verification (no production credentials available in this environment)
- Live migration of colliding product/category image paths (script delivered and dry-run tested against a fixture, but not run against Atlas)
- Durable upload persistence on Render (no production host available)
- Mobile/responsive visual regression and Lighthouse performance budgets

## Known blockers before production

| Severity | Issue | Action |
|---|---|---|
| BLOCKER | Render has no JWT_SECRET; admin login fails with "secretOrPrivateKey must have a value". | Set JWT_SECRET in Render Dashboard > Environment and redeploy. The app now refuses to boot without it instead of failing opaquely. |
| BLOCKER | Vercel /api/settings still returns NovaCart because Atlas holds the old settings document. | Update Atlas settings. Requires a Render admin token (once JWT_SECRET exists) or the real Atlas URI. |
| HIGH | Product and category image paths collide in production, so updating a product image also changes the category tile. | Run server/scripts/separateProductImages.js with MONGO_URI set (dry run first, then --apply), then deploy the client. |
| HIGH | Uploads are stored on Render local disk and are lost on redeploy. | Mount a persistent volume and set UPLOAD_DIR, or move uploads to object storage. The app now warns on boot when UPLOAD_DIR is unset in production. |
| MEDIUM | MongoDB is standalone, so checkout cannot use multi-document transactions; it relies on atomic per-document guards plus compensating rollback. | Convert to a replica set for true ACID checkout. |
| LOW | An Atlas password was exposed earlier in this session. | Rotate the Atlas credential. |

## How to re-run

```bash
cd server && node tests/runner.js
```

## Repairing production image paths

```bash
MONGO_URI="mongodb+srv://…" node server/scripts/separateProductImages.js           # dry run
MONGO_URI="mongodb+srv://…" node server/scripts/separateProductImages.js --apply   # then deploy the client
```
