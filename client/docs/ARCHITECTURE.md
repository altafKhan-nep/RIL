# Architecture

## Overview

NovaCart is a full-stack MERN (MongoDB, Express, React, Node.js) e-commerce application with a CRM/Admin dashboard. The frontend is a single-page application (SPA) served by Vite, and the backend is a RESTful API server built with Express.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Vite)                        │
│  React 18 SPA · Tailwind CSS · React Router v7              │
│  Port: 5173 (dev) · Vercel (production)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (Vite proxy / direct)
┌─────────────────────────▼───────────────────────────────────┐
│                      SERVER (Express)                        │
│  REST API · JWT Auth · RBAC · Rate Limiting                  │
│  Port: 5001 (dev) · Render (production)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ Mongoose ODM
┌─────────────────────────▼───────────────────────────────────┐
│                    DATABASE (MongoDB)                         │
│  Atlas (production) · Local (development)                    │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
NovaCart/
├── client/                          # Frontend React app
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js             # API client (fetch wrapper)
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── AdminLayout.jsx  # Admin sidebar layout
│   │   │   ├── Navbar.jsx           # Main navigation
│   │   │   ├── Footer.jsx           # Site footer
│   │   │   ├── ProductCard.jsx      # Product card component
│   │   │   ├── CategorySidebar.jsx  # Desktop category nav
│   │   │   ├── CategoryDrawer.jsx   # Mobile category drawer
│   │   │   ├── ProtectedRoute.jsx   # Auth route guard
│   │   │   ├── ScrollToTop.jsx      # Scroll restoration
│   │   │   ├── Toast.jsx            # Toast notifications
│   │   │   ├── ConfirmDialog.jsx    # Confirmation modal
│   │   │   ├── LoadingSpinner.jsx   # Loading indicator
│   │   │   └── ErrorBoundary.jsx    # React error boundary
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Authentication state
│   │   │   └── CartContext.jsx       # Shopping cart state
│   │   ├── pages/
│   │   │   ├── HomePage.jsx          # Landing page
│   │   │   ├── ProductListingPage.jsx# Shop / category listing
│   │   │   ├── ProductDetailPage.jsx # Single product view
│   │   │   ├── CartPage.jsx          # Shopping cart
│   │   │   ├── CheckoutPage.jsx      # Checkout flow
│   │   │   ├── OrderSuccessPage.jsx  # Order confirmation
│   │   │   ├── LoginPage.jsx         # User login
│   │   │   ├── RegisterPage.jsx      # User registration
│   │   │   ├── UserDashboard.jsx     # Customer account
│   │   │   ├── HelpPage.jsx          # Help center
│   │   │   ├── SupportPage.jsx       # Contact support
│   │   │   ├── PrivacyPage.jsx       # Privacy policy
│   │   │   ├── TermsPage.jsx         # Terms of service
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminProducts.jsx
│   │   │       ├── AdminOrders.jsx
│   │   │       ├── AdminCustomers.jsx
│   │   │       ├── AdminCategories.jsx
│   │   │       ├── AdminBanners.jsx
│   │   │       ├── AdminNavigation.jsx
│   │   │       ├── AdminPromotions.jsx
│   │   │       ├── AdminInventory.jsx
│   │   │       ├── AdminAnalytics.jsx
│   │   │       └── AdminSettings.jsx
│   │   ├── utils/
│   │   │   ├── helpers.js            # Utility functions
│   │   │   └── security.js          # Input validation
│   │   ├── App.jsx                   # Router + layouts
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Tailwind + global styles
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Backend Express app
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   ├── productController.js
│   │   ├── userController.js
│   │   ├── orderController.js
│   │   ├── adminController.js
│   │   ├── categoryController.js
│   │   ├── bannerController.js
│   │   ├── navigationController.js
│   │   ├── promotionController.js
│   │   └── settingsController.js
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification + RBAC
│   │   ├── errorMiddleware.js        # Global error handler
│   │   ├── validationMiddleware.js   # Input validation
│   │   └── sanitizeMiddleware.js     # XSS/NoSQL sanitization
│   ├── models/
│   │   ├── Product.js
│   │   ├── User.js
│   │   ├── Order.js
│   │   ├── Category.js
│   │   ├── Banner.js
│   │   ├── Promotion.js
│   │   ├── Navigation.js
│   │   └── Settings.js
│   ├── routes/
│   │   ├── productRoutes.js
│   │   ├── userRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── bannerRoutes.js
│   │   ├── promotionRoutes.js
│   │   ├── navigationRoutes.js
│   │   └── settingsRoutes.js
│   ├── uploads/
│   │   └── products/                # Product images
│   ├── seed/
│   │   └── seed.js                  # Database seeder
│   ├── utils/
│   │   ├── generateToken.js         # JWT generation
│   │   └── asyncHandler.js          # Async error wrapper
│   ├── server.js                    # Express entry point
│   ├── package.json
│   └── .env
│
├── docs/                            # Documentation
├── package.json                     # Root package (concurrently)
├── README.md
└── .gitignore
```

## Data Flow

### Product Listing

```
User navigates to /shop/electronics
        │
        ▼
React Router → ProductListingPage
        │
        ▼
useParams() extracts category = "electronics"
        │
        ▼
useEffect calls api.getProducts({ category: "electronics", pageNumber: 1 })
        │
        ▼
api/index.js → GET /api/products?category=electronics&pageNumber=1
        │
        ▼
Vite proxy forwards to Express (port 5001)
        │
        ▼
productController.getProducts() queries MongoDB
        │
        ▼
Returns { products: [...], page: 1, pages: 3, count: 26 }
        │
        ▼
ProductCard components render in grid
```

### Authentication

```
User submits login form
        │
        ▼
api.login({ email, password })
        │
        ▼
POST /api/users/login
        │
        ▼
userController.authUser() validates credentials
        │
        ▼
Returns { _id, name, email, role, token }
        │
        ▼
AuthContext stores user + token in state + localStorage
        │
        ▼
Token sent with subsequent requests via Authorization header
```

### Order Placement

```
User clicks "Place Order" on CheckoutPage
        │
        ▼
api.createOrder(orderData)
        │
        ▼
POST /api/orders (with JWT token)
        │
        ▼
orderController.createOrder():
  1. Validates stock availability
  2. Creates order document
  3. Decrements product stock
  4. Increments promo usedCount
  5. Clears cart
        │
        ▼
Returns order with _id
        │
        ▼
Redirect to /order-success/:id
```

## Key Design Decisions

1. **Monorepo structure** — Client and server in one repository for easier development and shared context
2. **Vite proxy** — Development server proxies `/api` requests to Express, avoiding CORS issues locally
3. **JWT in localStorage** — Simple auth flow; tokens sent via `Authorization: Bearer <token>` header
4. **Category filtering by name** — Products store category as a string (e.g., "Electronics"), backend uses case-insensitive regex matching against URL slugs
5. **Settings from database** — Shipping thresholds, tax rates, and store config are fetched from the `Settings` collection, not hardcoded
6. **Role-based access control** — 5 roles with 34 granular permissions; enforced both backend (middleware) and frontend (route guards)
