# Backend

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| Express | 4.19.2 | HTTP framework |
| Mongoose | 8.6.0 | MongoDB ODM |
| bcryptjs | 2.4.3 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT authentication |
| helmet | 8.3.0 | Security headers |
| cors | 2.8.5 | CORS configuration |
| express-rate-limit | 8.7.0 | Rate limiting |
| express-mongo-sanitize | 2.2.0 | NoSQL injection prevention |
| xss-clean | 0.1.4 | XSS prevention |
| hpp | 0.2.3 | HTTP parameter pollution prevention |
| compression | 1.8.1 | Gzip compression |
| morgan | 1.12.0 | HTTP request logging |
| uuid | 14.0.2 | Request ID generation |

## Entry Point

`server/server.js` — Express app initialization:

1. Load environment variables (`dotenv`)
2. Connect to MongoDB (`config/db.js`)
3. Apply middleware (helmet, CORS, compression, morgan, sanitize, xss, hpp)
4. Parse JSON and URL-encoded bodies
5. Rate limiting (100 requests per 15 minutes)
6. Static file serving (`/uploads`)
7. Mount routes
8. Error handling middleware
9. Listen on `PORT` (default: 5001)

## Request Lifecycle

```
Client Request
    │
    ▼
Express Server
    │
    ├─► Rate Limiter (100 req/15min)
    │
    ├─► Helmet (security headers)
    │
    ├─► CORS (origin check)
    │
    ├─► Body Parser (JSON)
    │
    ├─► Sanitize (mongo + xss)
    │
    ├─► HPP (parameter pollution)
    │
    ├─► Morgan (logging)
    │
    ├─► Route Handler
    │   │
    │   ├─► Validation Middleware
    │   │
    │   ├─► Auth Middleware (if protected)
    │   │
    │   ├─► RBAC Middleware (if admin)
    │   │
    │   └─► Controller Function
    │       │
    │       └─► Mongoose Model → MongoDB
    │
    └─► Response (JSON)
```

## Folder Structure

```
server/
├── config/
│   └── db.js              # MongoDB connection
├── controllers/            # Business logic
├── middleware/             # Auth, validation, error handling
├── models/                # Mongoose schemas
├── routes/                # Express routers
├── utils/                 # Helpers
├── uploads/               # Product images
├── seed/                  # Database seeder
├── server.js              # Entry point
└── package.json
```

## Controllers

| Controller | Responsibility |
|------------|---------------|
| `productController` | CRUD products, list with filters, flash deals |
| `userController` | Register, login, profile, wishlist |
| `orderController` | Create order, list orders, status updates, cancel |
| `adminController` | Dashboard stats, analytics, user/order management, inventory |
| `categoryController` | CRUD categories, tree structure, reorder |
| `bannerController` | CRUD banners, position-based listing, reorder |
| `navigationController` | CRUD nav items, tree structure, reorder |
| `promotionController` | CRUD promotions, validate promo codes, usage tracking |
| `settingsController` | Get/update settings sections |

## Middleware

### Auth Middleware (`authMiddleware.js`)

```javascript
// Verify JWT token
protect(req, res, next)

// Check admin role
admin(req, res, next)

// Check specific permission
requirePermission('products:edit')(req, res, next)
```

### Validation Middleware (`validationMiddleware.js`)

- `validateProduct` — name, price, category required
- `validateOrder` — orderItems, shippingAddress required
- `validatePromotion` — code, type, value, dates required
- `validateBanner` — title, image required

### Error Middleware (`errorMiddleware.js`)

```javascript
// Custom error class
class ErrorResponse extends Error {
  constructor(message, statusCode) { ... }
}

// Global error handler
errMiddleware(err, req, res, next) {
  // Mongoose validation error
  // Mongoose duplicate key
  // Mongoose cast error (bad ObjectId)
  // JWT errors
  // Custom ErrorResponse
}
```

## Routes

### Public Routes

| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | `/api/products` | `getProducts` |
| GET | `/api/products/:id` | `getProductById` |
| GET | `/api/products/categories` | `getCategories` |
| GET | `/api/products/flash-deals` | `getFlashDeals` |
| POST | `/api/users` | `registerUser` |
| POST | `/api/users/login` | `authUser` |
| GET | `/api/categories/public` | `getPublicCategories` |
| GET | `/api/banners/active/:position` | `getActiveBanners` |
| GET | `/api/navigation` | `getNavigation` |
| GET | `/api/promotions/active` | `getActivePromotions` |
| POST | `/api/promotions/validate` | `validatePromoCode` |
| GET | `/api/settings` | `getSettings` |
| GET | `/api/health` | Health check |

### Protected Routes (JWT Required)

| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | `/api/users/profile` | `getUserProfile` |
| PUT | `/api/users/profile` | `updateUserProfile` |
| POST | `/api/users/wishlist/:id` | `toggleWishlist` |
| POST | `/api/orders` | `createOrder` |
| GET | `/api/orders/myorders` | `getMyOrders` |
| GET | `/api/orders/:id` | `getOrderById` |
| PUT | `/api/orders/:id/pay` | `payOrder` |
| PUT | `/api/orders/:id/cancel` | `cancelOrder` |

### Admin Routes (JWT + Permission Required)

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/products` | `products:create` |
| PUT | `/api/products/:id` | `products:edit` |
| DELETE | `/api/products/:id` | `products:delete` |
| GET | `/api/admin/stats` | `dashboard:view` |
| GET | `/api/admin/users` | `customers:view` |
| PUT | `/api/admin/users/:id` | `customers:edit` |
| DELETE | `/api/admin/users/:id` | `customers:edit` |
| GET | `/api/admin/orders` | `orders:view` |
| PUT | `/api/admin/orders/:id/status` | `orders:edit` |
| PUT | `/api/admin/inventory/bulk` | `products:edit` |
| PUT | `/api/admin/inventory/:id/adjust` | `products:edit` |
| GET | `/api/admin/analytics` | `analytics:view` |
| PUT | `/api/settings/:section` | `settings:edit` |

## RBAC System

### Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full access, cannot be deactivated |
| `admin` | Full access |
| `content_manager` | Products, categories, banners, navigation |
| `order_manager` | Orders, customers |
| `customer` | Shopping, profile, orders |

### Permissions (34 total)

```
dashboard:view
products:view, products:create, products:edit, products:delete
categories:view, categories:create, categories:edit, categories:delete
orders:view, orders:edit, orders:cancel
customers:view, customers:edit, customers:delete
banners:view, banners:create, banners:edit, banners:delete
navigation:view, navigation:create, navigation:edit, navigation:delete
promotions:view, promotions:create, promotions:edit, promotions:delete
inventory:view, inventory:edit
analytics:view
settings:view, settings:edit
roles:view, roles:edit
```

## Error Handling

```javascript
// Custom error
throw new ErrorResponse('Product not found', 404);

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

## Development

```bash
cd server
node server.js          # Standard
npx nodemon server.js   # Auto-restart on changes
```

Port: 5001 (configurable via `PORT` env var)
