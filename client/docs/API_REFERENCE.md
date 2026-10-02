# API Reference

## Base URL

```
Development:  http://localhost:5001/api
Production:   https://novacart-api-j9um.onrender.com/api
```

## Authentication

Include the JWT token in the `Authorization` header for protected routes:

```
Authorization: Bearer <token>
```

## Response Format

### Success

```json
{
  "products": [...],
  "page": 1,
  "pages": 3,
  "count": 26
}
```

### Error

```json
{
  "message": "Product not found"
}
```

---

## Products

### List Products

```
GET /api/products
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageNumber` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 9) |
| `keyword` | string | Search by product name |
| `category` | string | Filter by category (case-insensitive, slug format) |
| `flash` | boolean | Filter flash deals only |
| `lowest` | boolean | Sort by price ascending |
| `highest` | boolean | Sort by price descending |
| `newest` | boolean | Sort by newest first |
| `popular` | boolean | Sort by most reviewed |

**Response:**

```json
{
  "products": [
    {
      "_id": "...",
      "name": "Vibe Wireless Headphones",
      "slug": "vibe-wireless-headphones",
      "category": "Electronics",
      "price": 89.99,
      "originalPrice": 129.99,
      "countInStock": 25,
      "rating": 4.5,
      "numReviews": 128,
      "images": ["https://..."],
      "colors": ["#ff7f50"],
      "features": ["Wireless", "Noise cancelling"],
      "badge": "-30%",
      "isFlashDeal": true,
      "status": "active"
    }
  ],
  "page": 1,
  "pages": 3,
  "count": 26
}
```

### Get Single Product

```
GET /api/products/:id
```

### Get Categories

```
GET /api/products/categories
```

**Response:** `["Electronics", "Fashion", "Home Decor", "Toys"]`

### Get Flash Deals

```
GET /api/products/flash-deals
```

### Create Product (Admin)

```
POST /api/products
Authorization: Bearer <admin_token>
```

**Body:**

```json
{
  "name": "Product Name",
  "slug": "product-name",
  "category": "Electronics",
  "description": "Product description",
  "price": 29.99,
  "originalPrice": 39.99,
  "countInStock": 50,
  "images": ["https://..."],
  "colors": ["#ff0000"],
  "features": ["Feature 1", "Feature 2"],
  "badge": "New",
  "isFlashDeal": false,
  "status": "active"
}
```

### Update Product (Admin)

```
PUT /api/products/:id
Authorization: Bearer <admin_token>
```

### Delete Product (Admin)

```
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

---

## Users & Authentication

### Register

```
POST /api/users
```

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```
POST /api/users/login
```

**Body:**

```json
{
  "email": "admin@novacart.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "_id": "...",
  "name": "Sarah Chen",
  "email": "admin@novacart.com",
  "isAdmin": true,
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Get Profile

```
GET /api/users/profile
Authorization: Bearer <token>
```

### Update Profile

```
PUT /api/users/profile
Authorization: Bearer <token>
```

**Body:**

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+1 555-0100",
  "address": {
    "fullName": "John Doe",
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62704"
  }
}
```

### Toggle Wishlist

```
POST /api/users/wishlist/:productId
Authorization: Bearer <token>
```

---

## Orders

### Create Order

```
POST /api/orders
Authorization: Bearer <token>
```

**Body:**

```json
{
  "orderItems": [
    {
      "name": "Product Name",
      "qty": 2,
      "image": "https://...",
      "price": 29.99,
      "product": "productId"
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "street": "123 Main St",
    "city": "Springfield",
    "zip": "62704"
  },
  "paymentMethod": "Card",
  "itemsPrice": 59.98,
  "taxPrice": 4.80,
  "shippingPrice": 0,
  "totalPrice": 64.78,
  "promoCode": "WELCOME10"
}
```

### Get My Orders

```
GET /api/orders/myorders
Authorization: Bearer <token>
```

### Get Order

```
GET /api/orders/:id
Authorization: Bearer <token>
```

### Pay Order

```
PUT /api/orders/:id/pay
Authorization: Bearer <token>
```

### Cancel Order

```
PUT /api/orders/:id/cancel
Authorization: Bearer <token>
```

### Update Order Status (Admin)

```
PUT /api/orders/:id/status
Authorization: Bearer <admin_token>
```

**Body:** `{ "status": "Shipped", "trackingNumber": "1Z999AA10123456784" }`

---

## Admin

### Dashboard Stats

```
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "totalRevenue": 12450.00,
  "totalOrders": 156,
  "totalProducts": 26,
  "totalCustomers": 142,
  "recentOrders": [...],
  "topProducts": [...],
  "recentCustomers": [...],
  "lowStockProducts": [...]
}
```

### Analytics

```
GET /api/admin/analytics
Authorization: Bearer <admin_token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | `7d`, `30d`, `90d`, `1y` |

### List Users

```
GET /api/admin/users
Authorization: Bearer <admin_token>
```

### Get User

```
GET /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Update User

```
PUT /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Deactivate User

```
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### List Orders (Admin)

```
GET /api/admin/orders
Authorization: Bearer <admin_token>
```

### Get Order (Admin)

```
GET /api/admin/orders/:id
Authorization: Bearer <admin_token>
```

### Update Order Status (Admin)

```
PUT /api/admin/orders/:id/status
Authorization: Bearer <admin_token>
```

### Cancel Order (Admin)

```
PUT /api/admin/orders/:id/cancel
Authorization: Bearer <admin_token>
```

### Bulk Stock Update

```
PUT /api/admin/inventory/bulk
Authorization: Bearer <admin_token>
```

**Body:**

```json
{
  "updates": [
    { "productId": "...", "countInStock": 100 },
    { "productId": "...", "countInStock": 50 }
  ]
}
```

### Adjust Stock

```
PUT /api/admin/inventory/:id/adjust
Authorization: Bearer <admin_token>
```

**Body:**

```json
{
  "type": "restock",
  "quantity": 25,
  "note": "Supplier delivery"
}
```

**Adjust types:** `set` (absolute), `increase` (+), `decrease` (-), `restock` (+ with note)

### Stock History

```
GET /api/admin/inventory/:id/history
Authorization: Bearer <admin_token>
```

---

## Banners

### Get Active Banners (Public)

```
GET /api/banners/active/:position
```

**Positions:** `hero`, `promo`, `sidebar`, `footer`

### List Banners (Admin)

```
GET /api/banners
Authorization: Bearer <admin_token>
```

### Create Banner

```
POST /api/banners
Authorization: Bearer <admin_token>
```

### Update Banner

```
PUT /api/banners/:id
Authorization: Bearer <admin_token>
```

### Delete Banner

```
DELETE /api/banners/:id
Authorization: Bearer <admin_token>
```

### Reorder Banners

```
PUT /api/banners/reorder
Authorization: Bearer <admin_token>
```

**Body:** `{ "bannerIds": ["id1", "id2", "id3"] }`

---

## Categories

### Get Public Categories

```
GET /api/categories/public
```

**Response:**

```json
[
  {
    "_id": "...",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Gadgets and tech",
    "image": "https://...",
    "icon": "devices",
    "productCount": 6
  }
]
```

### Get Categories (Tree)

```
GET /api/categories
```

### Create Category

```
POST /api/categories
Authorization: Bearer <admin_token>
```

### Update Category

```
PUT /api/categories/:id
Authorization: Bearer <admin_token>
```

### Delete Category

```
DELETE /api/categories/:id
Authorization: Bearer <admin_token>
```

### Reorder Categories

```
PUT /api/categories/reorder
Authorization: Bearer <admin_token>
```

---

## Navigation

### Get Navigation (Tree)

```
GET /api/navigation
```

### Get Navigation by Position

```
GET /api/navigation?position=header
```

**Positions:** `header`, `footer`, `mobile`

### Create Navigation Item

```
POST /api/navigation
Authorization: Bearer <admin_token>
```

### Update Navigation Item

```
PUT /api/navigation/:id
Authorization: Bearer <admin_token>
```

### Delete Navigation Item

```
DELETE /api/navigation/:id
Authorization: Bearer <admin_token>
```

### Reorder Navigation

```
PUT /api/navigation/reorder
Authorization: Bearer <admin_token>
```

---

## Promotions

### List Promotions (Admin)

```
GET /api/promotions
Authorization: Bearer <admin_token>
```

### Get Active Promotions (Public)

```
GET /api/promotions/active
```

### Validate Promo Code

```
POST /api/promotions/validate
```

**Body:**

```json
{
  "code": "WELCOME10",
  "cartTotal": 75.00,
  "userId": "optional-user-id"
}
```

**Response:**

```json
{
  "valid": true,
  "discount": 10.00,
  "type": "fixed",
  "message": "$10 off your order"
}
```

### Create Promotion

```
POST /api/promotions
Authorization: Bearer <admin_token>
```

**Body:**

```json
{
  "name": "Summer Sale",
  "code": "SUMMER50",
  "description": "50% off all orders",
  "type": "percentage",
  "value": 50,
  "minPurchase": 100,
  "maxDiscount": 75,
  "usageLimit": 500,
  "maxPerUser": 2,
  "startDate": "2026-06-01",
  "endDate": "2026-09-01"
}
```

**Types:** `percentage`, `fixed`, `free_shipping`

### Update Promotion

```
PUT /api/promotions/:id
Authorization: Bearer <admin_token>
```

### Delete Promotion

```
DELETE /api/promotions/:id
Authorization: Bearer <admin_token>
```

---

## Settings

### Get Settings (Public)

```
GET /api/settings
```

**Response (stripePublicKey filtered out):**

```json
{
  "store": { "name": "NovaCart", "tagline": "..." },
  "payment": { "currency": "USD", "acceptCreditCards": true },
  "shipping": { "freeShippingThreshold": 50, "standardRate": 5.99 },
  "tax": { "enabled": true, "rate": 8 },
  "notifications": { ... },
  "security": { ... },
  "seo": { ... }
}
```

### Update Settings Section

```
PUT /api/settings/:section
Authorization: Bearer <admin_token>
```

**Sections:** `store`, `payment`, `shipping`, `tax`, `notifications`, `security`, `seo`

---

## Health Check

```
GET /api/health
```

**Response:**

```json
{
  "status": "OK",
  "uptime": 12345.67,
  "timestamp": "2026-09-08T12:00:00.000Z"
}
```
