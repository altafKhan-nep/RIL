# Troubleshooting

## Common Issues

### 1. MongoDB Connection Error

**Error:** `MongoNetworkError: connect ECONNREFUSED`

**Cause:** MongoDB not running or wrong connection string.

**Solution:**

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Verify MONGO_URI in .env
cat server/.env | grep MONGO_URI

# Test connection
curl http://localhost:5001/api/health
```

---

### 2. Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5001`

**Solution:**

```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=5002 node server.js
```

---

### 3. Products Not Showing

**Cause:** Category filter mismatch or empty database.

**Solution:**

```bash
# Re-seed database
cd server && node seed/seed.js

# Check products exist
curl http://localhost:5001/api/products | jq '.count'

# Check with category filter
curl "http://localhost:5001/api/products?category=electronics" | jq '.count'
```

---

### 4. Images Not Loading

**Cause:** Relative URLs in product images.

**Solution:**

- Use absolute URLs (`https://images.unsplash.com/...`)
- Or serve images from `/uploads` directory
- Ensure `app.use('/uploads', express.static(...))` is in `server.js`

---

### 5. 404 on Page Refresh (Vercel)

**Cause:** SPA routing not configured.

**Solution:**

Create `client/public/_redirects`:
```
/*    /index.html   200
```

Or add `vercel.json` in project root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### 6. CORS Error in Production

**Error:** `Access-Control-Allow-Origin` missing

**Solution:**

Update CORS origins in `server/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://nova-cart-dun.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true,
}));
```

---

### 7. Render Service Sleeping

**Cause:** Free tier Render services sleep after 15 minutes of inactivity.

**Solution:**

- First request after sleep takes 30-60 seconds
- Upgrade to paid tier for always-on
- Or use a monitoring service (e.g., UptimeRobot) to ping every 10 minutes

---

### 8. JWT Token Expired

**Error:** `Not authorized, token failed`

**Solution:**

- Token expires after 7 days (configurable via `JWT_EXPIRE`)
- User must re-login
- Check if `JWT_SECRET` matches between server restarts

---

### 9. Seed Script Fails

**Error:** `The uri parameter to openUri() must be a string`

**Solution:**

```bash
# Run from server directory
cd server && node seed/seed.js

# Or ensure .env is in server/ directory
ls server/.env
```

---

### 10. Build Fails on Vercel

**Cause:** Missing dependencies or wrong build configuration.

**Solution:**

1. Ensure `client/package.json` exists
2. Set build settings in Vercel:
   - Framework: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output: `dist`

---

### 11. Category Filtering Not Working

**Cause:** Frontend sends slug, backend expects name.

**Solution:**

Backend uses case-insensitive regex matching:

```javascript
const category = req.query.category
  ? { category: { $regex: new RegExp(`^${req.query.category.replace(/-/g, '[ -]')}$`, 'i') } }
  : {};
```

This handles `electronics` → `Electronics` and `home-decor` → `Home Decor`.

---

### 12. Cart Items Not Persisting

**Cause:** localStorage cleared or incognito mode.

**Solution:**

- Cart is stored in localStorage
- Clearing browser data clears cart
- Login to sync cart with user account (future feature)

---

## Debug Mode

### Enable Verbose Logging

```bash
# Server
DEBUG=express:* node server.js

# MongoDB
MONGOOSE_DEBUG=true node server.js
```

### Check Server Logs

```bash
# Render
Dashboard → Logs tab

# Local
Terminal output from `node server.js`
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:5001/api/health

# Products
curl http://localhost:5001/api/products

# Login
curl -X POST http://localhost:5001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@novacart.com","password":"password123"}'
```

---

## Getting Help

1. Check this troubleshooting guide
2. Review server logs
3. Test API endpoints directly
4. Check MongoDB Atlas dashboard
5. Open an issue on GitHub
