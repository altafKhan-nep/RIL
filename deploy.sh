#!/bin/bash
# =============================================
# NovaCart VPS Deployment Script (Interserver)
# =============================================
# Run this on your VPS after cloning the repo
# Usage: bash deploy.sh

set -e

APP_DIR="/var/www/novacart"
NODE_VERSION="20"

echo "🚀 NovaCart Deployment Starting..."
echo "=================================="

# --- System update ---
echo "📦 Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# --- Install Node.js 20 ---
echo "📦 Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt $NODE_VERSION ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "  Node: $(node -v) | npm: $(npm -v)"

# --- Install Nginx ---
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# --- Install PM2 globally ---
echo "📦 Installing PM2..."
sudo npm install -g pm2

# --- Install build tools (for native modules) ---
echo "📦 Installing build essentials..."
sudo apt-get install -y build-essential

# --- Create app directory ---
echo "📁 Setting up app directory..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $APP_DIR/server/uploads
sudo chown -R $USER:$USER $APP_DIR

# --- Clone or pull repo ---
if [ -d "$APP_DIR/.git" ]; then
  echo "📥 Pulling latest changes..."
  cd $APP_DIR
  git pull origin main
else
  echo "📥 Cloning repository..."
  git clone https://github.com/altafKhan-nep/NovaCart.git $APP_DIR
  cd $APP_DIR
fi

# --- Install dependencies ---
echo "📦 Installing dependencies..."
npm --prefix server install --omit=dev
npm --prefix client install

# --- Create .env if it doesn't exist ---
if [ ! -f "$APP_DIR/server/.env" ]; then
  echo "⚠️  No .env file found!"
  echo "   Copy the template and fill in your values:"
  echo "   cp server/.env.production.example server/.env"
  echo "   nano server/.env"
  exit 1
fi

# --- Build client ---
echo "🔨 Building client..."
cd $APP_DIR
npm run build:prod

# --- Seed database (optional, first time only) ---
read -p "Do you want to seed the database? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🌱 Seeding database..."
  cd $APP_DIR
  npm run seed
fi

# --- Setup PM2 ---
echo "🔄 Starting with PM2..."
cd $APP_DIR
pm2 stop novacart-api 2>/dev/null || true
pm2 delete novacart-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# --- Setup PM2 startup on boot ---
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

# --- Setup Nginx ---
echo "🌐 Configuring Nginx..."
sudo cp $APP_DIR/nginx.conf /etc/nginx/sites-available/novacart
sudo sed -i 's/YOUR_DOMAIN_OR_IP/'$(hostname -I | awk '{print $1}')'/g' /etc/nginx/sites-available/novacart
sudo ln -sf /etc/nginx/sites-available/novacart /etc/nginx/sites-enabled/novacart
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# --- Open firewall ports ---
echo "🔥 Configuring firewall..."
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw allow 22/tcp 2>/dev/null || true

# --- Done ---
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "🌐 Your site is live at: http://$IP"
echo "🔧 API health check:    http://$IP/api/health"
echo ""
echo "📋 Useful commands:"
echo "   pm2 logs              - View server logs"
echo "   pm2 restart novacart-api - Restart server"
echo "   pm2 status            - Check PM2 status"
echo "   cd $APP_DIR && git pull && npm run build:prod && pm2 restart novacart-api"
echo ""
echo "🔒 To enable HTTPS with Let's Encrypt:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d YOUR_DOMAIN"
echo ""
