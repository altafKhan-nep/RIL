# Deployment

## Architecture

```
┌─────────────────────────────────────────┐
│              Vercel (CDN)               │
│         Frontend: React SPA             │
│   https://nova-cart-dun.vercel.app      │
└─────────────────┬───────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────┐
│            Render (PaaS)                │
│         Backend: Express API            │
│  https://novacart-api-j9um.onrender.com │
└─────────────────┬───────────────────────┘
                  │ MongoDB Driver
┌─────────────────▼───────────────────────┐
│         MongoDB Atlas (DBaaS)           │
│            novacart database            │
└─────────────────────────────────────────┘
```

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Render account (free tier)
- MongoDB Atlas account (free tier)

---

## 1. MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user:
   - Database Access → Add New User
   - Username: `mohammadaltafkhan0710pse_db_user`
   - Password: `ymTvkLqFjpgEvlHB`
3. Whitelist IP addresses:
   - Network Access → Add IP Address → `0.0.0.0/0` (allow all)
4. Get connection string:
   - Database → Connect → Drivers
   - Copy the connection string

---

## 2. Backend (Render)

### Environment Variables

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5001` |
| `MONGO_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | `novacart_super_secret_jwt_key_change_me` |
| `JWT_EXPIRE` | `7d` |

### Steps

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect GitHub repository
4. Configure:
   - **Name:** `novacart-api`
   - **Runtime:** Node
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && node server.js`
   - **Plan:** Free
5. Add environment variables (see table above)
6. Create Web Service
7. Wait for deployment to complete
8. Note the URL: `https://novacart-api-j9um.onrender.com`

### Update CORS

If deploying to a custom domain, update the CORS origin in `server/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://nova-cart-dun.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

---

## 3. Frontend (Vercel)

### Environment Variables

| Variable | Value |
|----------|-------|
| (none needed) | API URL is auto-detected in `api/index.js` |

### Steps

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import GitHub repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Deploy
5. Note the URL: `https://nova-cart-dun.vercel.app`

### SPA Routing

Create `client/public/_redirects` or add `vercel.json` in the client directory:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Production Seeding

### Option A: Seed via Local Script

```bash
cd server
# Update .env with production MONGO_URI
node seed/seed.js
```

### Option B: Seed via API

```bash
# Register admin
curl -X POST https://novacart-api-j9um.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@novacart.com","password":"password123"}'

# Login
curl -X POST https://novacart-api-j9um.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@novacart.com","password":"password123"}'

# Use token to create products, categories, etc.
```

---

## 5. Post-Deployment Verification

```bash
# Health check
curl https://novacart-api-j9um.onrender.com/api/health

# Products
curl https://novacart-api-j9um.onrender.com/api/products

# Categories
curl https://novacart-api-j9um.onrender.com/api/categories/public

# Settings
curl https://novacart-api-j9um.onrender.com/api/settings
```

Visit `https://nova-cart-dun.vercel.app` and verify:
- [ ] Homepage loads with products
- [ ] Category filtering works
- [ ] Login/register works
- [ ] Cart functionality works
- [ ] Checkout flow works
- [ ] Admin dashboard accessible

---

## 6. Custom Domain

### Vercel

1. Project Settings → Domains
2. Add your domain
3. Configure DNS:
   - A Record: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

### Render

1. Service Settings → Custom Domains
2. Add domain
3. Configure DNS as instructed

---

## 7. Monitoring

### Render

- Dashboard → Logs (real-time)
- Metrics tab (CPU, memory)
- Health check endpoint: `/api/health`

### Vercel

- Project → Analytics
- Function invocations and errors

### MongoDB Atlas

- Atlas Dashboard → Monitoring
- Real-time performance metrics

---

## 8. Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | $0/mo |
| Render | Free | $0/mo |
| MongoDB Atlas | M0 Sandbox | $0/mo |
| **Total** | | **$0/mo** |

**Note:** Free tiers have limitations (sleep on inactivity, limited bandwidth). Upgrade for production workloads.

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Update CORS origins in `server.js` |
| 404 on refresh | Add SPA rewrite rule in Vercel |
| Slow first request | Render free tier sleeps after inactivity; first request wakes it |
| Images not loading | Check if images use absolute URLs or `/uploads` path |
| DB connection error | Verify `MONGO_URI` and IP whitelist in Atlas |
