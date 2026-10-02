# NovaCart — Interserver VPS Deployment Guide

Step-by-step guide to deploy NovaCart on an Interserver VPS.

---

## Architecture

```
┌──────────────────────────────────────────┐
│           Interserver VPS                │
│                                          │
│   Nginx (port 80)                        │
│       │                                  │
│       ├── /          → React SPA         │
│       ├── /api/*     → Express (5001)    │
│       └── /uploads/* → Static files      │
│                                          │
│   Node.js + PM2                          │
│   Express API (port 5001)                │
│                                          │
└──────────────┬───────────────────────────┘
               │ MongoDB Driver
┌──────────────▼───────────────────────────┐
│         MongoDB Atlas (cloud DB)          │
│            novacart database              │
└──────────────────────────────────────────┘
```

---

## What You Need

- [ ] Interserver VPS (Ubuntu 22.04+)
- [ ] Root SSH access to your VPS
- [ ] MongoDB Atlas account (free tier works)
- [ ] A domain name pointing to your VPS IP (optional)

---

## Step 1 — Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with your actual Interserver IP address.

---

## Step 2 — Install Required Packages

Run these commands one by one:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x

# Install Nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git
```

---

## Step 3 — Clone the Repository

```bash
# Create app directory
mkdir -p /var/www/novacart
cd /var/www/novacart

# Clone your code
git clone https://github.com/altafKhan-nep/NovaCart.git .

# Verify
ls
# Should show: client/  server/  deploy.sh  ecosystem.config.js  ...
```

---

## Step 4 — Set Up Environment Variables

```bash
# Copy the template
cp server/.env.production.example server/.env

# Edit the file
nano server/.env
```

Fill in these values:

```env
PORT=5001
NODE_ENV=production

# Your MongoDB Atlas connection string
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.xxxxx.mongodb.net/novacart?appName=Cluster0

# Generate a strong secret (run: openssl rand -hex 32)
JWT_SECRET=your_random_64_character_string_here

JWT_EXPIRE=7d

# Your VPS IP or domain (for CORS)
FRONTEND_URL=http://YOUR_VPS_IP
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`.

---

## Step 5 — Install Dependencies and Build

```bash
cd /var/www/novacart

# Install server dependencies
npm --prefix server install --omit=dev

# Install client dependencies
npm --prefix client install

# Build the React app
npm run build:prod
```

You should see `✓ built in X.XXs` at the end.

---

## Step 6 — Seed the Database (First Time Only)

This creates admin users, sample products, categories, and banners:

```bash
cd /var/www/novacart
npm run seed
```

Wait for it to finish. You'll see confirmation messages.

---

## Step 7 — Start the Server with PM2

```bash
cd /var/www/novacart

# Start the app
pm2 start ecosystem.config.js

# Save PM2 config (auto-restart on reboot)
pm2 save
pm2 startup
```

Run the command that `pm2 startup` prints (it looks like `sudo env PATH=...`).

### Verify it's running:

```bash
pm2 status
```

You should see `novacart-api` with status `online`.

---

## Step 8 — Configure Nginx

```bash
# Copy the config
cp /var/www/novacart/nginx.conf /etc/nginx/sites-available/novacart

# Replace YOUR_DOMAIN_OR_IP with your actual IP or domain
sed -i 's/YOUR_DOMAIN_OR_IP/YOUR_VPS_IP/g' /etc/nginx/sites-available/novacart

# Enable the site
ln -sf /etc/nginx/sites-available/novacart /etc/nginx/sites-enabled/novacart

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## Step 9 — Open Firewall Ports

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

---

## Step 10 — Test Your Deployment

Open your browser and go to:

```
http://YOUR_VPS_IP
```

You should see the NovaCart homepage.

### Verify these work:

- [ ] Homepage loads with products and banners
- [ ] Click a category — product listing works
- [ ] Click a product — product detail page loads
- [ ] Click the translate button — language switches
- [ ] Go to `/login` — login page appears
- [ ] Go to `/register` — register page appears
- [ ] Go to `/admin` — admin dashboard loads (if logged in as admin)
- [ ] Go to `/shop` — shop page loads
- [ ] Refresh the page on `/shop` — still works (SPA routing)

### Test API directly:

```bash
# Health check
curl http://YOUR_VPS_IP/api/health

# Products
curl http://YOUR_VPS_IP/api/products?pageSize=1

# Categories
curl http://YOUR_VPS_IP/api/categories/public
```

---

## Common Commands

```bash
# View server logs
pm2 logs

# Restart server
pm2 restart novacart-api

# Stop server
pm2 stop novacart-api

# Check status
pm2 status

# Update code after git pull
cd /var/www/novacart
git pull
npm run build:prod
pm2 restart novacart-api
```

---

## Enable HTTPS (Optional but Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically
certbot renew --dry-run
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page shows "Welcome to Nginx" | Nginx config not linked — check `ls -la /etc/nginx/sites-enabled/` |
| 502 Bad Gateway | Server not running — run `pm2 status` and `pm2 restart novacart-api` |
| Blank page on refresh | Nginx not configured for SPA — check the `try_files` line in nginx.conf |
| API returns errors | Check `.env` — make sure `MONGO_URI` and `JWT_SECRET` are correct |
| "CORS error" in browser | Update `FRONTEND_URL` in `.env` to match your VPS IP/domain |
| Images not uploading | Check `server/uploads` folder exists and has write permissions |
| Server crashes on start | Run `pm2 logs` to see the error, fix it, then `pm2 restart` |

---

## File Locations

| File | Path |
|------|------|
| App code | `/var/www/novacart/` |
| Environment | `/var/www/novacart/server/.env` |
| React build | `/var/www/novacart/client/dist/` |
| Uploaded images | `/var/www/novacart/server/uploads/` |
| PM2 config | `/var/www/novacart/ecosystem.config.js` |
| Nginx config | `/etc/nginx/sites-available/novacart` |
| PM2 logs | `~/.pm2/logs/` |
| Nginx logs | `/var/log/nginx/` |
