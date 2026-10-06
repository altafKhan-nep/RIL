# Life In Pieces — QA & Security Audit Report

**Status:** 92/92 automated checks passing (100%) across 12 suites.

- **Generated:** 2026-10-06T15:29:36.831Z
- **Scope:** uncommitted working tree (QA remediation on top of 36778a9)
- **Environment:** mongodb://localhost:27017/novacart_qa (isolated; production Atlas never touched)
- **Determinism:** 92/92 on 3 consecutive consecutive runs (this report reflects run N of the final sequence).

> Automated coverage is strong but NOT equivalent to production readiness. See *Not executed* and *Known blockers* before shipping.

## Suite breakdown

| Suite | Checks |
|---|---:|
| Smoke & Baseline | 6 |
| Authentication & Registration | 15 |
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
| **Total** | **92** |

## Defects fixed and covered by regression tests

### Payment integrity (Stripe)
- Webhook signature verification was **broken in production code**: the global `express.json()` consumed the request body before the route-level `express.raw()`, so `constructEvent()` could never receive the signed bytes and every real webhook would have failed. Fixed by stashing the raw buffer in the JSON parser `verify` hook. Covered by 6 tests: missing signature, forged signature, tampered body, valid signature, mismatched intent id, and idempotent replay.

### Inventory auditability
- `cancelOrder`, the promotion-limit rollback, and admin cancellation each restored stock with a **raw update that bypassed the audit helper**, so those movements were invisible in `stockHistory`. All routes now go through the audited helper.
- The audit helper wrote `reason/actor/timestamp` while the Product schema defines `note/createdBy/date`, so Mongoose **silently dropped** those fields. Aligned to the existing schema contract.
- `stockHistory` used read-then-write, which under concurrency recorded inconsistent `previousStock` values (verified: 6 of 8 concurrent entries all claimed the same starting stock). Replaced with a single atomic aggregation-pipeline update so stock and its audit entry commit together; the chain is now provably continuous.
- Absolute stock changes through the product API and product creation now record an opening balance and an audited `set` adjustment.

### Analytics correctness
- Dashboard revenue summed **cancelled orders as sales**. A single `REVENUE_STATUSES` rule now excludes cancelled and fully-refunded orders from total sales, month-over-month revenue, and the revenue-by-month chart.

### Authentication and sessions
- Password changes now require the current password and enforce the same 8-character minimum the API always enforced (the UI previously allowed 6 and silently failed).
- Added `tokenVersion`: changing a password invalidates previously issued tokens. Inactive accounts are rejected at login.

### Catalog and categories
- Public category counts excluded drafts incorrectly; stored `Category.productCount` is now maintained across product create, update, category moves, and deletion.

### API shape and data volume
- `GET /api/orders` and `GET /api/orders/myorders` were unbounded. Both are now paginated with `total/page/pages/pageSize`; the client was updated to match.

### Previously completed in this engagement
- Server-authoritative pricing (client totals ignored), client-supplied payment flags ignored, promotion double-discount removed, order IDOR on tracking closed, granular admin permissions, production seed guard, trim-only sanitization, atomic promotion redemption, order idempotency.

## Not executed

- Real Stripe API calls (PaymentIntent create/confirm) and live dashboard refund - no real credentials available
- Full browser-driven UI E2E (no headless browser tooling configured in this environment)
- Production Atlas / Render / Vercel verification (no production credentials, JWT_SECRET missing on Render)
- Durable upload persistence across Render redeploys (object storage not configured)
- Mobile/responsive visual regression and Lighthouse performance budgets

## Known blockers before production

| Severity | Area | Issue | Action |
|---|---|---|---|
| BLOCKER | Production auth | Render service has no JWT_SECRET; admin login fails with "secretOrPrivateKey must have a value". | Set JWT_SECRET on the Render service and redeploy. |
| BLOCKER | Production branding | Vercel /api/settings still returns NovaCart because Atlas holds the old settings document. | Update Atlas settings (requires a Render admin token or the real Atlas URI). |
| HIGH | Product vs category images | Product and category image paths collide in production, so updated product images also changed category imagery. | Repoint category.image to distinct paths in Atlas. |
| HIGH | Upload durability | Uploads are written to Render local disk and are lost on redeploy. | Move uploads to durable object storage. |
| MEDIUM | Session security | JWT is persisted in localStorage; tokenVersion provides revocation-on-password-change but not on explicit logout or theft. | Move to httpOnly cookie refresh tokens. |
| MEDIUM | Transactionality | MongoDB is standalone, so checkout cannot use multi-document transactions; relies on atomic per-doc guards plus compensating rollback. | Convert to a replica set for true ACID checkout. |
| LOW | Secrets hygiene | An Atlas password was exposed earlier in this session. | Rotate the Atlas credential. |

## How to re-run

```bash
cd server && node tests/runner.js
```
