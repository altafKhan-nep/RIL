# NovaCart Operations Manual

> Complete guide for marketing teams to manage the NovaCart e-commerce website and CRM admin panel.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Admin Panel Overview](#2-admin-panel-overview)
3. [Managing Products](#3-managing-products)
4. [Managing Categories](#4-managing-categories)
5. [Managing Orders](#5-managing-orders)
6. [Managing Customers](#6-managing-customers)
7. [Managing Banners](#7-managing-banners)
8. [Managing Navigation Menus](#8-managing-navigation-menus)
9. [Managing Promotions & Coupons](#9-managing-promotions--coupons)
10. [Managing Inventory](#10-managing-inventory)
11. [Viewing Analytics & Reports](#11-viewing-analytics--reports)
12. [Site Settings](#12-site-settings)
13. [Customer-Facing Website](#13-customer-facing-website)
14. [Quick Reference Tables](#14-quick-reference-tables)
15. [Common Tasks & Workflows](#15-common-tasks--workflows)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Getting Started

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@novacart.com` | `password123` |
| Manager | `alex@novacart.com` | `password123` |

### Access URLs

| Environment | URL |
|-------------|-----|
| Customer Website | https://nova-cart-dun.vercel.app |
| Admin Panel | https://nova-cart-dun.vercel.app/admin |
| Backend API | https://novacart-api-j9um.onrender.com |

### How to Login

1. Go to `https://nova-cart-dun.vercel.app/login`
2. Enter email and password
3. Click **Login**
4. You will be redirected to the homepage
5. To access admin panel, go to `/admin` (you must have admin role)

### How to Logout

1. Click your profile icon in the top-right corner of the navbar
2. Click **Logout**

---

## 2. Admin Panel Overview

The admin panel has **11 modules** accessible from the left sidebar:

| Module | Icon | What It Controls |
|--------|------|------------------|
| Dashboard | `dashboard` | Overview of sales, orders, revenue |
| Products | `inventory_2` | Add, edit, delete products |
| Orders | `shopping_cart` | View and manage customer orders |
| Customers | `people` | View customer accounts |
| Inventory | `warehouse` | Track stock levels and history |
| Analytics | `bar_chart` | Detailed sales and performance reports |
| Banners | `campaign` | Homepage and promotional banners |
| Categories | `category` | Product categories |
| Navigation | `menu` | Website menu links |
| Promotions | `local_offer` | Coupons and discount codes |
| Settings | `settings` | Store info, shipping, payment |

---

## 3. Managing Products

### View All Products

1. Click **Products** in the sidebar
2. You'll see a table with all products
3. Use the search bar to find products by name or SKU
4. Use the dropdown filters to narrow by **Category**, **Status**, or **Stock level**

### Add a New Product

1. Click the **Add Product** button (top-right)
2. A slide-in form panel opens with collapsible sections
3. Fill in the fields:

#### Basic Information (Required)
| Field | Required | Description |
|-------|----------|-------------|
| Product Name | Yes | Name shown to customers |
| Slug | No | Auto-generated from name (e.g., "wireless-headphones") |
| SKU | No | Stock Keeping Unit code (auto-generated if empty) |
| Category | Yes | Select from existing categories |
| Status | No | Active, Draft, or Out of Stock |
| Description | Yes | Product description (10-2000 characters) |

#### Pricing & Stock
| Field | Required | Description |
|-------|----------|-------------|
| Price | Yes | Selling price in USD |
| Original Price | No | Original/MRP price for showing discounts |
| Stock Quantity | Yes | Number of items in stock |
| Badge | No | Label like "New", "Sale", "Hot" |

#### Product Images
- Enter image URLs (one per field)
- Click **Add another image** to add more images
- Images show as previews with thumbnails
- Click the **X** on a thumbnail to remove it

#### Colors
- Click preset color circles to select colors
- Or type a hex code (e.g., `#FF5733`) and click **Add**
- Selected colors appear as chips below — click **X** to remove

#### Features
- List product features/specs (e.g., "Wireless", "Noise cancelling", "30hr battery")
- Click **Add feature** to add more
- Click **X** to remove a feature

#### Flags
- **Flash Deal**: Toggle ON to show product in Flash Deals section on homepage
- **New Arrival**: Toggle ON to show product in New Arrivals

4. Click **Create Product** to save (or **Save as Draft**)

### Edit a Product

1. Find the product in the products table
2. Click the **pencil icon** (edit) in the Actions column
3. The same form opens with pre-filled data
4. Make your changes
5. Click **Update Product**

### Delete a Product

1. Find the product in the table
2. Click the **trash icon** (delete) in the Actions column
3. Confirm the deletion in the popup dialog
4. **Note**: This cannot be undone

### Bulk Actions

1. Check the checkboxes next to multiple products
2. A "Bulk Actions" dropdown appears
3. Choose **Toggle Visibility** (activate/deactivate) or **Delete Selected**

### Product Status Explained

| Status | Meaning | Where It Shows |
|--------|---------|----------------|
| Active | Product is live | Website, search, category pages |
| Draft | Hidden from customers | Only visible in admin |
| Out of Stock | Sold out | Can be set automatically when stock = 0 |

### Tips

- **Always add at least one image** — products without images look broken
- **Use Original Price** to show discounts (e.g., Original: $50, Price: $30 shows "40% off")
- **Flash Deal toggle** puts the product in the Flash Deals carousel on the homepage
- **Stock auto-calculates** — when stock reaches 0, status automatically shows "Out of Stock"

---

## 4. Managing Categories

### View Categories

1. Click **Categories** in the sidebar
2. See all categories with product counts

### Add a Category

1. Click **Add Category**
2. Fill in:
   - **Name** (required): Category name (e.g., "Electronics")
   - **Slug**: Auto-generated from name
   - **Description**: Brief description
   - **Icon**: Material icon name (e.g., "devices", "checkroom", "home")
   - **Image**: URL for category image
3. Click **Save**

### Edit a Category

1. Click the **edit icon** on a category
2. Modify fields
3. Click **Update**

### Delete a Category

1. Click the **delete icon**
2. Confirm deletion
3. **Warning**: Products in this category will become uncategorized

### Current Categories

| Category | Description |
|----------|-------------|
| Electronics | Gadgets, devices, accessories |
| Fashion | Clothing, shoes, accessories |
| Home Decor | Furniture, decor, kitchen |
| Toys | Kids toys and games |

---

## 5. Managing Orders

### View Orders

1. Click **Orders** in the sidebar
2. See all orders with status, total, customer info

### Order Statuses

| Status | Meaning | Color |
|--------|---------|-------|
| Pending | Order placed, not yet processed | Yellow |
| Processing | Being prepared | Blue |
| Shipped | Handed to courier | Purple |
| Delivered | Successfully delivered | Green |
| Cancelled | Order cancelled | Red |

### Update Order Status

1. Click on an order to view details
2. Change the status from the dropdown
3. Add tracking number if shipped
4. Click **Update**

### Order Details Include

- Customer name and email
- Shipping address
- Order items with quantities and prices
- Payment method and status
- Subtotal, shipping, tax, and total
- Order date

---

## 6. Managing Customers

### View Customers

1. Click **Customers** in the sidebar
2. See all registered users

### Customer Information Shows

- Name and email
- Role (customer/admin)
- Registration date
- Total orders
- Wishlist items

### Search Customers

- Use the search bar to find by name or email

---

## 7. Managing Banners

Banners appear on the homepage, shop page, and other locations.

### Banner Positions

| Position | Where It Shows |
|----------|----------------|
| Hero | Main carousel on homepage (full-width) |
| Promo | Promotional section on homepage |
| Sidebar | Side banners on shop/product pages |
| Footer Strip | Bottom strip above footer |

### Add a Banner

1. Click **Banners** in the sidebar
2. Click **Add Banner**
3. Fill in:
   - **Title** (required): Banner headline
   - **Subtitle**: Supporting text
   - **Image**: Banner image URL
   - **Link**: Where clicking the banner takes the user
   - **Position**: Where the banner appears (hero/promo/sidebar/footer)
   - **Target Page**: Which page shows this banner
   - **Background Color**: Banner background color
   - **CTA Text**: Button text (e.g., "Shop Now")
   - **Sort Order**: Display order (lower = first)
   - **Active**: Toggle to show/hide
4. Click **Save**

### Edit/Delete Banners

- Click **edit** or **delete** icons on any banner row

### Tips

- **Hero banners** should be 1920x600px for best display
- Use **high-quality images** with good contrast for text readability
- Keep **CTA text short** (2-3 words like "Shop Now", "View Deals")

---

## 8. Managing Navigation Menus

Navigation items control the website's menu links.

### Menu Positions

| Position | Where It Shows |
|----------|----------------|
| Header | Top navigation bar in navbar |
| Footer | Help section links in footer |
| Mobile | Mobile menu (coming soon) |

### Current Header Links

| Label | URL | Active |
|-------|-----|--------|
| Home | `/` | Yes |
| Shop | `/shop` | Yes |
| Deals | `/shop?flash=true` | Yes |
| New Arrivals | `/shop?category=Electronics` | Yes |

### Current Footer Links

| Label | URL | Active |
|-------|-----|--------|
| Support | `/account` | Yes |
| Privacy Policy | `/privacy` | Yes |
| Terms of Service | `/terms` | Yes |

### Add a Navigation Item

1. Click **Navigation** in the sidebar
2. Click **Add Navigation Item**
3. Fill in:
   - **Label** (required): Link text (e.g., "Sale")
   - **URL** (required): Where the link goes (e.g., `/shop?sale=true`)
   - **Position**: header, footer, or mobile
   - **Active**: Toggle to show/hide
   - **Open in New Tab**: Whether link opens in new browser tab
   - **Icon**: Optional Material icon name
   - **Sort Order**: Display order
4. Click **Save**

### Edit/Delete Navigation Items

- Click **edit** or **delete** icons on any row

### Important

- Navigation items with `position: header` **replace** the default navbar links
- Navigation items with `position: footer` **replace** the default footer help links
- If you delete all header items, the site falls back to default links

---

## 9. Managing Promotions & Coupons

### View Promotions

1. Click **Promotions** in the sidebar
2. See all active and scheduled promotions

### Add a Promotion

1. Click **Add Promotion**
2. Fill in:
   - **Code** (required): Coupon code customers enter at checkout (e.g., "SUMMER20")
   - **Description**: What the promotion offers
   - **Discount Type**: Percentage or Fixed Amount
   - **Discount Value**: Amount (e.g., 20 for 20% off)
   - **Minimum Order**: Minimum cart value to qualify
   - **Maximum Discount**: Cap on discount amount
   - **Start Date**: When promotion begins
   - **End Date**: When promotion expires
   - **Usage Limit**: Max number of times it can be used
   - **Active**: Toggle to enable/disable
3. Click **Save**

### Edit/Delete Promotions

- Click **edit** or **delete** icons on any row

---

## 10. Managing Inventory

### View Inventory

1. Click **Inventory** in the sidebar
2. See stock levels for all products

### What You Can See

- Product name and current stock level
- Stock status (In Stock, Low Stock, Out of Stock)
- Stock history (when stock changed and by how much)

### Low Stock Alerts

- Products with stock below 5 units are flagged as "Low Stock"
- Products with 0 stock are "Out of Stock"

### Update Stock

1. Go to **Products**
2. Edit the product
3. Update the **Stock Quantity** field
4. Click **Update Product**

---

## 11. Viewing Analytics & Reports

### Access Analytics

1. Click **Analytics** in the sidebar

### Available Reports

| Report | What It Shows |
|--------|---------------|
| Revenue by Month | Monthly sales trend (bar chart) |
| Orders by Status | Breakdown of order statuses (pie chart) |
| Top Products | Best-selling products |
| Revenue by Category | Sales per category |
| Recent Orders | Latest orders placed |

### Dashboard Overview

Click **Dashboard** in the sidebar for:
- Total revenue
- Total orders
- Total products
- Total customers
- Recent orders list
- Quick stats

---

## 12. Site Settings

### Access Settings

1. Click **Settings** in the sidebar

### Settings Sections

| Section | What It Controls |
|---------|------------------|
| Store Info | Store name, description, contact email, logo |
| Shipping | Shipping rates, free shipping threshold |
| Payment | Accepted payment methods |
| Tax | Tax rates and rules |
| SEO | Meta titles, descriptions, social sharing |
| Notifications | Email notification preferences |

### Update Settings

1. Navigate to the settings section
2. Modify the values
3. Click **Save**

---

## 13. Customer-Facing Website

### Homepage Sections

| Section | Description | Controlled By |
|---------|-------------|---------------|
| Top Bar | Announcement strip | Banners (footer strip position) |
| Navbar | Logo, search, cart, account | Navigation items (header position) |
| Hero Carousel | Full-width banner slider | Banners (hero position) |
| Trust Badges | Free shipping, secure, etc. | Hardcoded |
| Categories | Category tiles grid | Categories (from CRM) |
| Flash Deals | Deal products with countdown | Products with `isFlashDeal: true` |
| Featured Products | Grid of products | All active products |
| Promo Banners | Mid-page promotions | Banners (promo position) |
| Why Choose Us | Benefits section | Hardcoded |
| Footer | Links, newsletter | Navigation items (footer position) |

### Customer Shopping Flow

1. **Browse**: Customer visits homepage, uses search or category navigation
2. **View Product**: Clicks a product to see details (images, price, description, reviews)
3. **Add to Cart**: Selects quantity and clicks "Add to Cart"
4. **View Cart**: Reviews items, quantities, and total in the cart
5. **Checkout**: Enters shipping info, selects payment method
6. **Payment**: Pays via PayPal or other configured methods
7. **Confirmation**: Receives order confirmation with order number
8. **Account**: Can track orders, manage profile, view wishlist

### How Search Works

- Customer types in the search bar in the navbar
- Results show in a **list view** (Flipkart-style) with product details, features, ratings
- Can sort by: Relevance, Popularity, Price Low→High, Price High→Low, Newest, Bestseller

### How Categories Work

- Categories from the CRM appear as tiles on the homepage
- Clicking a category shows all products in that category
- Category sidebar on the shop page for quick filtering

---

## 14. Quick Reference Tables

### Admin Permission Levels

| Permission | What It Allows |
|------------|----------------|
| `products:view` | View products list |
| `products:create` | Create new products |
| `products:edit` | Edit existing products |
| `products:delete` | Delete products |
| `orders:view` | View orders |
| `orders:edit` | Update order status |
| `customers:view` | View customer list |
| `banners:view` | View banners |
| `banners:create` | Create banners |
| `banners:edit` | Edit banners |
| `banners:delete` | Delete banners |
| `categories:view` | View categories |
| `categories:create` | Create categories |
| `categories:edit` | Edit categories |
| `categories:delete` | Delete categories |
| `navigation:view` | View navigation items |
| `navigation:create` | Create navigation items |
| `navigation:edit` | Edit navigation items |
| `navigation:delete` | Delete navigation items |
| `promotions:view` | View promotions |
| `promotions:create` | Create promotions |
| `promotions:edit` | Edit promotions |
| `promotions:delete` | Delete promotions |
| `inventory:view` | View inventory |
| `analytics:view` | View analytics reports |
| `settings:view` | View settings |
| `settings:edit` | Edit settings |

### API Endpoints Reference

#### Public APIs (No login required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/products` | List products (supports search, sort, pagination) |
| GET | `/api/products/:id` | Get single product |
| GET | `/api/products/flash-deals` | Get flash deal products |
| GET | `/api/products/categories` | Get distinct categories |
| GET | `/api/categories/public` | Get categories with counts |
| GET | `/api/banners/active/hero` | Get active hero banners |
| GET | `/api/banners/active/promo` | Get active promo banners |
| GET | `/api/navigation?position=header` | Get navigation items |
| GET | `/api/settings` | Get site settings |
| POST | `/api/users/login` | Login |
| POST | `/api/users/register` | Register |
| POST | `/api/orders` | Create order |

#### Admin APIs (Require admin login + Bearer token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/orders` | List all orders |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/analytics` | Analytics data |
| GET | `/api/admin/inventory` | Inventory data |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/banners` | Create banner |
| PUT | `/api/banners/:id` | Update banner |
| DELETE | `/api/banners/:id` | Delete banner |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |
| POST | `/api/navigation` | Create navigation item |
| PUT | `/api/navigation/:id` | Update navigation item |
| DELETE | `/api/navigation/:id` | Delete navigation item |
| POST | `/api/promotions` | Create promotion |
| PUT | `/api/promotions/:id` | Update promotion |
| DELETE | `/api/promotions/:id` | Delete promotion |
| PUT | `/api/settings` | Update settings |

### Product Sort Options

| Sort Value | Effect |
|------------|--------|
| (empty) | Default order |
| `relevance` | By rating + review count (for keyword search) |
| `popular` | By number of reviews (highest first) |
| `lowest` | Price low to high |
| `highest` | Price high to low |
| `newest` | Newest products first |
| `bestseller` | Most reviewed products first |

---

## 15. Common Tasks & Workflows

### Workflow: Add a New Product

1. Login to admin → `/admin`
2. Click **Products** → **Add Product**
3. Fill Basic Info (name, category, description)
4. Set Pricing (price, original price if on sale)
5. Set Stock quantity
6. Add image URLs (at least 1)
7. Optionally add colors, features
8. Toggle Flash Deal or New Arrival if applicable
9. Click **Create Product**
10. Verify it appears on the website

### Workflow: Create a Flash Sale

1. Go to **Products**
2. Edit products you want on sale
3. Set **Original Price** higher than **Price** (shows discount %)
4. Toggle **Flash Deal** ON
5. Click **Update Product**
6. Repeat for all sale products
7. Products now appear in the Flash Deals section on homepage

### Workflow: Launch a New Promotion

1. Go to **Promotions**
2. Click **Add Promotion**
3. Set code (e.g., "WELCOME10"), discount (10%), dates
4. Click **Save**
5. Share the code with customers

### Workflow: Update Homepage Banners

1. Go to **Banners**
2. Add or edit hero banners
3. Set images, titles, links
4. Ensure **Active** is toggled ON
5. Click **Save**
6. Refresh homepage to see changes

### Workflow: Process an Order

1. Go to **Orders**
2. Click on the order
3. Review items and shipping details
4. Update status: Pending → Processing → Shipped → Delivered
5. Add tracking number when shipped
6. Click **Update**

### Workflow: Add a New Category

1. Go to **Categories**
2. Click **Add Category**
3. Enter name, icon, image
4. Click **Save**
5. Add products to this category

### Workflow: Manage Navigation Links

1. Go to **Navigation**
2. Add items with label, URL, position
3. Toggle active/inactive
4. Changes reflect immediately on the website

---

## 16. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't login | Check email/password. Rate limit: 5 attempts per 15 minutes. Restart server to reset. |
| Product not showing on website | Check status is "Active", not "Draft" |
| Banner not showing | Check it's "Active" and assigned to correct position |
| Navigation link not showing | Check it's "Active" and has correct position (header/footer) |
| Search returns no results | Check product name matches search term |
| Blank page after login | Hard refresh (Ctrl+Shift+R) to clear cache |
| Admin panel not accessible | Ensure you're logged in as admin role |
| Order status not updating | Check you have order edit permissions |
| Image not loading | Verify the image URL is valid and publicly accessible |
| Stock showing wrong number | Refresh the page, check inventory tab |

### Rate Limiting

- Login attempts: 5 per 15 minutes
- API calls: General rate limiting active
- If you get 429 errors, wait 15 minutes or restart the server

### Clearing Cache

- **Browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Server**: Restart the Node.js server process

### Getting Help

- Check the API health: `GET /api/health`
- Check server logs for errors
- Verify MongoDB connection in server startup logs

---

## Appendix: Site Architecture

```
Frontend (Vite + React)     →  Backend (Express + MongoDB)  →  Database (MongoDB Atlas)
https://nova-cart-dun.vercel.app    https://novacart-api-j9um.onrender.com    Atlas Cloud
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, Tailwind CSS 3, React Router v7 |
| Backend | Express 4, Node.js, Mongoose ODM |
| Database | MongoDB Atlas |
| Auth | JWT (JSON Web Tokens), bcryptjs |
| Hosting | Vercel (frontend), Render (backend) |
| Design System | Material Symbols, Inter font, custom tokens |

### Design Tokens

| Token | Color | Use |
|-------|-------|-----|
| primary | `#a43c12` / `#ff7f50` | Buttons, links, accents |
| secondary | `#006a62` / `#5ef6e6` | Secondary accents |
| tertiary | `#e9c400` / `#ffe16d` | Warnings, highlights |
| background | `#fbf9f5` | Page background |
| surface | `#f5f0e8` | Card backgrounds |
| error | Red tones | Errors, destructive actions |
| success | Green tones | Success messages |

---

*Last updated: September 2026*
*NovaCart E-Commerce Platform*
