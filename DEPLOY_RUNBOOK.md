# Production Release Runbook

Everything in this document is a **manual step for a human with account access**.
All code changes are already committed. Follow the steps in order — each one
unblocks the next.

Readiness is verified by a single command:

```bash
cd server
JWT_SECRET="$(openssl rand -hex 32)" \
MONGO_URI="<your Atlas URI>" \
BASE_URL="https://ril-q344.onrender.com" \
node scripts/preflight.js
```

It is read-only. It exits `0` when nothing is blocking and `1` when something is.
**Do not deploy until it exits 0.**

---

## Step 1 — Set `JWT_SECRET` on Render (blocks everything)

**Why:** Render has no `JWT_SECRET`, so every login fails with
`secretOrPrivateKey must have a value`. Nothing else can be validated until this
is fixed.

1. Generate a secret:
   ```bash
   openssl rand -hex 32
   ```
2. Render Dashboard → your service → **Environment** → add:
   - `JWT_SECRET` = the generated value
3. Save. Render redeploys automatically.

**Verify:**
```bash
curl -s https://ril-q344.onrender.com/api/health
```

The app now refuses to boot without this variable, so a missing value shows up
immediately in the Render logs rather than as a confusing login error.

---

## Step 2 — Update the Atlas settings document (blocks the rebrand)

**Why:** The database still holds the old brand. The frontend says
"Life In Pieces" while the API returns `"name":"NovaCart"`, so header/footer text
comes from the database and will be wrong.

Pick **one**:

**Option A — via the admin UI** (no code)
1. Sign in at `/admin/login`.
2. **Settings** → set store name, tagline, logo, favicon, contact email.
3. Save. The public `/api/settings` updates immediately.

**Option B — via the API**

The endpoint is `PUT /api/settings/:section`. Valid sections are
`store`, `payment`, `shipping`, `tax`, `notifications`, `security`, `seo`, and it
requires the `settings:edit` permission.

```bash
# Get an admin token (Step 1 must already be done)
TOKEN=$(curl -s -X POST https://ril-q344.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin email>","password":"<admin password>"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

curl -X PUT https://ril-q344.onrender.com/api/settings/store \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Life In Pieces","tagline":"Discover Joy in Every Box"}'
```

**Verify:**
```bash
curl -s https://ril-q344.onrender.com/api/settings | head -c 200
```
`"name"` must read `Life In Pieces`, not `NovaCart`.

---

## Step 3 — Repair product/category image paths

**Why:** Some product images share a path with a category image, so editing a
product photo also changes the category tile.

```bash
cd server
# 1. Preview (writes nothing)
MONGO_URI="mongodb+srv://…" node scripts/separateProductImages.js
# 2. Apply
MONGO_URI="mongodb+srv://…" node scripts/separateProductImages.js --apply
```

The script only rewrites **product** image paths, never category images. It
copies each asset to a product-specific path in both `client/public/uploads/` and
`server/uploads/`.

**Then deploy the frontend** so the new paths are served, and visually confirm one
category tile is unchanged.

---

## Step 4 — Durable uploads

**Why:** Uploads land on Render's local disk and are lost on every redeploy.

1. Render Dashboard → your service → **Disks** → add a disk, e.g. mount path
   `/var/data`.
2. Add environment variable `UPLOAD_DIR=/var/data/uploads`.

**Verify:** upload an image from `/admin`, redeploy, and confirm the image still
loads. The app logs a warning on boot when `UPLOAD_DIR` is unset in production.

---

## Step 5 — Stripe (only if you want real card payments)

Without this, checkout is COD-only.

1. Stripe Dashboard → **Developers → API keys**.
2. Render environment:
   - `STRIPE_SECRET_KEY` = `sk_live_…` (or `sk_test_…`)
   - `STRIPE_WEBHOOK_SECRET` = from the webhook endpoint you create
3. Create a webhook endpoint pointing at
   `https://ril-q344.onrender.com/api/payments/webhook` for these events:
   - `payment_intent.succeeded`
   - `charge.refunded`

> The webhook endpoint is only reachable over the public URL. Localhost will not
> receive events; use `stripe listen --forward-to` for local testing.

---

## Step 6 — Rotate the exposed Atlas password

**Why:** The Atlas credential was shared in plain text during development.

1. Atlas Dashboard → **Database Access** → reset the password.
2. Update `MONGO_URI` in Render's environment.
3. Redeploy and re-run preflight.

---

## Step 7 — Deploy and verify

```bash
git checkout main && git pull
cd client && npm ci && npm run build     # optional: Vercel builds on push
```

Then re-run the preflight — it should now exit `0`.

### Manual smoke test

| # | Check | Expected |
|---|---|---|
| 1 | Load the homepage | Life In Pieces branding, no "NovaCart" text |
| 2 | Log in as admin | Redirects to `/admin` |
| 3 | Open a category tile | Correct category image (not a product photo) |
| 4 | Open a product | Correct product image |
| 5 | Add to cart and check out with COD | Order appears in `/admin/orders`; stock decrements |
| 6 | Cancel the order as the customer | Stock is restored; the order shows `Cancelled` |
| 7 | Sign out, then sign in again | Works; the session cookie is set |
| 8 | Leave a tab open 20+ min, then click around | Still signed in (token refreshes silently) |
| 9 | Change your password | Other devices are signed out; this one stays signed in |

---

## Known, accepted limitations

| Area | Impact | Why |
|---|---|---|
| MongoDB is standalone | Checkout is not ACID; it uses per-document atomic guards plus compensating rollback | Requires converting to a replica set |
| Unused legacy keys | `novacart_cart`, `novacart_lang` etc. remain in localStorage | Cosmetic; only auth was migrated |
| No automated browser E2E | UI regressions are caught manually via the table above | No headless browser in the dev environment |

---

## If something breaks

**App will not start / `FATAL: missing required environment variable`**
Check `JWT_SECRET` and `MONGO_URI` exist in Render's Environment tab.

**Login succeeds but every request 401s**
The access cookie lasts 15 minutes and refreshes automatically. If you disabled
the refresh endpoint or block third-party cookies, sign in again.

**Images 404 after the image migration**
The new paths only resolve once the frontend is redeployed.

**`error: secretOrPrivateKey must have a value`**
`JWT_SECRET` is missing. Redo Step 1.