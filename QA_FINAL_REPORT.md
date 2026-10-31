# Life In Pieces — QA, Security & Production-Readiness Report

**Status:** 142/142 automated checks passing (100%) across 16 suites.

- **Generated:** 2026-10-31
- **Scope:** uncommitted working tree (production-readiness hardening on top of `b7b9729`)
- **Environment:** `mongodb://localhost:27017/novacart_qa` (isolated; production data was never touched)
- **Build:** `npm run build:prod` completes cleanly (Vite 6).
- **Production smoke:** `NODE_ENV=production node server/server.js` served the SPA, returned JSON 404 for an unknown `/api` route, emitted the configured CSP, and exited `0` on `SIGTERM`.

> Automated coverage is strong, but it is **not** a substitute for live payment, infrastructure and browser verification. Read *Not executed* and *Known blockers* before shipping.

## Suite breakdown

| Suite | Checks |
|---|---:|
| Smoke & Baseline | 6 |
| Authentication & Registration | 15 |
| Cookie Session Auth (httpOnly) | 12 |
| Refresh Token Rotation & Revocation | 10 |
| Roles & Permission Matrix | 11 |
| Pricing & Authoritative Totals | 6 |
| Promotions & Discounts | 7 |
| Orders, Cancellation & Idempotency | 12 |
| Admin ↔ Storefront Synchronization | 6 |
| Stripe Webhook Signature Verification | 6 |
| Stripe Configuration & Card Flow Contract | 14 |
| Refunds, Free Shipping, Stock Audit & Analytics | 15 |
| Concurrency & Inventory Races | 2 |
| Security & Injection | 6 |
| Storefront Asset Integrity | 6 |
| Data Consistency Invariants | 8 |
| **Total** | **142** |

## Fixed in this pass

### Orders, payments and idempotency

- **Idempotency-key IDOR:** lookup is now scoped to `{ idempotencyKey, user }`. Customer B can no longer submit Customer A's key and receive A's order.
- **Concurrent idempotency race:** a unique partial index on `{ user, idempotencyKey }` (non-empty keys only) ensures exactly one insert wins; the loser rolls its stock decrement back and returns the winner's order. The partial filter uses `$gt: ''`, which MongoDB actually accepts (`$ne` silently prevented index creation).
- **Order tracking 500:** `/api/orders/track/:id` selected `user` and now works for the owner; anonymous requests still get 401 and non-owners 403.
- **Cancellation races:** customer and admin cancellation share an atomic claim. Inventory restoration and provider refunds happen once, after the claim succeeds. Concurrent cancels return 409/400 instead of double-restocking.
- **Delivered ≠ paid:** marking an order Delivered only auto-pays COD/Cash on Delivery. Card orders remain unpaid until the provider confirms.
- **Payment proof:** marking paid requires a succeeded intent bound to that exact order, with matching amount and currency.
- **Webhook hardening:** succeeded webhooks verify amount and currency before marking paid; mismatches record a failure instead of silently accepting the charge.
- **Promo rollback:** category counts are recomputed only after the order and promo usage are committed, so a promo-limit rollback cannot inflate counts.
- **Legacy method alias:** `paymentMethod: "Stripe"` is accepted as an alias for the card flow for API compatibility.

### Storefront and catalogue

- **Draft products** are excluded from public listings, search, categories, flash deals and direct product-by-id requests, and cannot be ordered.
- **Pagination:** public product `pageSize`/`page` are clamped and deterministic; admin order lists accept `pageSize`/`limit` with sane bounds.
- **Partial product updates:** the admin bulk draft/status action (previously rejected because full product fields were required) now validates the merged product. Stock edits are applied atomically *after* save, so the response and audit trail reflect the new value.
- **Promotion leakage:** public promotion endpoints project only storefront-safe fields; customer ObjectIds and internal targeting are no longer exposed.
- **Banner/navigation links:** only app-relative paths, anchors and `http(s)` URLs are accepted, blocking stored `javascript:`/`data:` XSS.
- **Settings whitelist:** admin settings updates accept only known fields per section and reject unknown keys.

### Cart, checkout and admin UX

- **Tax normalisation:** both `0.08` and `8` are treated as 8%, so the cart preview matches the server total.
- **Promo math:** previews are computed on merchandise only, matching checkout; free-shipping promos zero shipping in the cart too.
- **Corrupt cart storage:** `localStorage` parse failures no longer crash the app.
- **Checkout idempotency:** one key per checkout attempt, reused across retries; a failed intent can be retried without creating a second order.
- **Stripe return URL:** uses `/order-success/:id` (the actual route) instead of the non-existent `/order-success`.
- **Redirect reconciliation:** OrderSuccess calls `/payments/confirm` and briefly polls, so a successful payment does not appear unpaid while the webhook catches up.
- **Admin inventory/orders:** inventory uses the unbounded admin endpoint; orders use supported `pageSize`; `Out for Delivery` is available in status tabs, transitions and cancellation.
- **Customer tracking UI:** `Out for Delivery` is reflected in status styling, progress and tracking copy.

### Security and platform

- **Admin user updates** return a sanitised user object; password hashes are never serialised.
- **Profile changes** require the current password, normalise and uniqueness-check email, bump `tokenVersion` on password/session changes, and re-mint cookies only when needed.
- **Input validation:** centralised validation now covers registration/profile, products, orders (items, quantities, prices, addresses, promo, notes, idempotency key), promotions, banners, navigation, settings and ObjectIds.
- **Error handling:** CastError, Mongoose ValidationError, duplicate-key, Multer and oversized-body errors map to 4xx; unexpected 500s hide internal details in production.
- **CSP:** Helmet now sends a policy that permits only the storefront's actual dependencies (self, Google Fonts, Stripe.js/API) instead of a blanket `helmet()` default that would have blocked Stripe.
- **Catch-all:** unknown `/api` and `/uploads` paths return JSON 404s rather than the SPA shell.
- **Graceful shutdown:** `SIGTERM`/`SIGINT` close the HTTP server and MongoDB cleanly, with a 10s forced-exit fallback; the previous callback-style `mongoose.connection.close()` threw on current Mongoose.

## Earlier defect fixes still covered

- Stripe webhook raw-body handling; runtime publishable-key delivery via `/api/payments/config`.
- Revocable, rotating refresh sessions; short access-token lifetime.
- Atomic stock audit pipeline; cancellation restoration recorded exactly once.
- Revenue analytics exclude cancelled/refunded orders.
- Shipping origin configurable instead of hardcoded Mumbai.
- Production refuses to boot without `JWT_SECRET`/`MONGO_URI`; warns when `UPLOAD_DIR` is unset.
- Product image/category image collisions and orphan-asset checks.

## Not executed

- Real Stripe API calls (PaymentIntent create/retrieve, refunds) — no live credentials here.
- Live Stripe webhook delivery — needs a public endpoint and Stripe CLI forwarding.
- Full browser-driven E2E / mobile visual regression / Lighthouse — no headless browser configured.
- Live Atlas mutation or production deployment verification.
- True multi-document transactions — local MongoDB is standalone. The code avoids relying on them, but checkout is not fully ACID across collections.

## Known blockers / re-verify before production

| Severity | Issue | Action |
|---|---|---|
| BLOCKER | Previously observed: Render missing `JWT_SECRET`, production settings reporting “NovaCart”, and production running an older commit. | Re-run the deployment checklist in `DEPLOY_RUNBOOK.md`; the server now fails fast without required secrets. |
| HIGH | Uploads default to local disk and are lost on redeploy. | Mount a persistent volume and set `UPLOAD_DIR`, or move to object storage. |
| HIGH | Existing production data may need a one-time `syncIndexes`/index review to pick up the compound idempotency index. | Mongoose `autoIndex` creates it on boot; verify with `db.orders.getIndexes()`. |
| MEDIUM | MongoDB is standalone, so checkout spans multiple collections without transactions. | Use a replica set for full ACID guarantees. |
| LOW | A previously exposed Atlas password should be treated as compromised. | Rotate it before reusing the URI. |

## Re-running

```bash
cd server && npm run test:qa          # 142/142
cd .. && npm run build:prod           # Vite production build

JWT_SECRET="$(openssl rand -hex 32)" \
MONGO_URI="mongodb+srv://…" BASE_URL="https://ril-q344.onrender.com" \
node server/scripts/preflight.js
```
