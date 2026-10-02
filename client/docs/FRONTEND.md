# Frontend

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI library |
| React DOM | 18.3.1 | DOM renderer |
| React Router | 7.18.3 | Client-side routing |
| Vite | 6.4.3 | Build tool + dev server |
| Tailwind CSS | 3.4.10 | Utility-first CSS |

## Entry Point

`client/src/main.jsx` → renders `<App />` into `#root`.

## Routing

Defined in `client/src/App.jsx`:

```
/login              → LoginPage (AuthLayout)
/register           → RegisterPage (AuthLayout)
/admin/*            → AdminShell (ProtectedRoute + requireAdmin)
  /admin            → AdminDashboard
  /admin/items      → AdminProducts
  /admin/orders     → AdminOrders
  /admin/customers  → AdminCustomers
  /admin/categories → AdminCategories
  /admin/banners    → AdminBanners
  /admin/navigation → AdminNavigation
  /admin/promotions → AdminPromotions
  /admin/inventory  → AdminInventory
  /admin/analytics  → AdminAnalytics
  /admin/settings   → AdminSettings
/*                  → MainShell (Navbar + Footer)
  /                 → HomePage
  /shop             → ProductListingPage
  /shop/:category   → ProductListingPage
  /product/:id      → ProductDetailPage
  /cart             → CartPage
  /checkout         → CheckoutPage (ProtectedRoute)
  /order-success/:id → OrderSuccessPage
  /account          → UserDashboard (ProtectedRoute)
  /help             → HelpPage
  /support          → SupportPage
  /privacy          → PrivacyPage
  /terms            → TermsPage
```

## Layouts

### MainShell

```
┌─────────────────────────┐
│         Navbar          │
├─────────────────────────┤
│                         │
│        <Routes>         │
│                         │
├─────────────────────────┤
│         Footer          │
└─────────────────────────┘
```

### AuthLayout

Full-screen centered layout for login/register.

### AdminShell

```
┌──────────┬──────────────┐
│  Admin   │              │
│ Sidebar  │   <Routes>   │
│          │              │
└──────────┴──────────────┘
```

## Context Providers

### AuthContext

Provides: `user`, `token`, `login()`, `register()`, `logout()`, `updateProfile()`

- Persists token in `localStorage`
- Decodes JWT to get user info
- `ProtectedRoute` checks `user` existence

### CartContext

Provides: `cart`, `addToCart()`, `removeFromCart()`, `updateQuantity()`, `clearCart()`, `getCartTotal()`, `promoCode`, `applyPromo()`, `removePromo()`

- Persists cart in `localStorage`
- Fetches settings from API for shipping/tax calculation
- Validates promo codes against database (`api.validatePromo()`)

## API Client

`client/src/api/index.js` — wraps `fetch()` with:

- Auto-attaches `Authorization: Bearer <token>` header
- Handles JSON parsing and error responses
- Routes to `/api` (localhost) or production URL

```javascript
const API_URL = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://novacart-api-j9um.onrender.com/api';
```

## Components

| Component | Description |
|-----------|-------------|
| `Navbar` | Top nav with search, cart, auth links, category drawer trigger |
| `Footer` | 4-column footer with links, newsletter, social icons |
| `ProductCard` | Product display with image, price, rating, add-to-cart |
| `CategorySidebar` | Desktop left sidebar for category filtering |
| `CategoryDrawer` | Mobile slide-out category navigation |
| `ProtectedRoute` | Redirects to login if not authenticated |
| `AdminLayout` | Admin sidebar with nav links and role-based visibility |
| `Toast` | Toast notification system |
| `ConfirmDialog` | Confirmation modal |
| `LoadingSpinner` | Loading indicator |
| `ErrorBoundary` | Catches React errors, displays fallback UI |
| `ScrollToTop` | Scrolls to top on route change |

## Pages

### Customer Pages

| Page | Description |
|------|-------------|
| `HomePage` | Hero carousel, category tiles, flash deals, featured products, trust badges |
| `ProductListingPage` | Category sidebar + product grid + pagination + sort |
| `ProductDetailPage` | Image gallery, details, reviews, add-to-cart |
| `CartPage` | Cart items, quantity controls, promo code, order summary |
| `CheckoutPage` | Address form, payment method, order summary, place order |
| `OrderSuccessPage` | Order confirmation with details |
| `LoginPage` | Email/password login form |
| `RegisterPage` | Registration form with terms checkbox |
| `UserDashboard` | Profile, orders, addresses, loyalty points |
| `HelpPage` | FAQ accordions organized by topic |
| `SupportPage` | Contact form, FAQ, business hours |
| `PrivacyPage` | Full privacy policy with table of contents |
| `TermsPage` | Full terms of service with table of contents |

### Admin Pages

| Page | Description |
|------|-------------|
| `AdminDashboard` | KPI cards, charts, recent orders, top products |
| `AdminProducts` | Product list, create/edit form |
| `AdminOrders` | Order list with status filters, detail view |
| `AdminCustomers` | Customer list, profile view, deactivate |
| `AdminCategories` | Category tree, create/edit, reorder |
| `AdminBanners` | Banner list, create/edit, position management |
| `AdminNavigation` | Nav item tree, create/edit, reorder |
| `AdminPromotions` | Promotion list, create/edit with validation |
| `AdminInventory` | Stock list, adjust stock, stock history |
| `AdminAnalytics` | Revenue charts, order analytics, category breakdown |
| `AdminSettings` | Store, payment, shipping, tax, security, SEO settings |

## Design System

### Colors (Tailwind tokens)

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#a43c12` | Buttons, links, accents |
| `on-primary` | `#ffffff` | Text on primary |
| `primary-container` | `#ff7f50` | Hover states |
| `secondary` | `#006a62` | Secondary actions |
| `tertiary` | `#ffe16d` | Highlights |
| `background` | `#fbf9f5` | Page background |
| `surface` | `#ffffff` | Card backgrounds |
| `on-surface` | `#1b1c1a` | Body text |
| `on-surface-variant` | `#556270` | Secondary text |
| `error` | `#ba1a1a` | Errors, destructive |

### Typography

- **Font:** Inter (weights 400-900)
- **Icons:** Material Symbols Outlined

### Responsive Breakpoints

| Breakpoint | Width | Columns |
|------------|-------|---------|
| Mobile | < 640px | 1-2 |
| Tablet | 640-1024px | 2-3 |
| Desktop | > 1024px | 3-4 |

## Build

```bash
# Development
cd client && npx vite          # Port 5173

# Production build
cd client && npx vite build    # Output: dist/
```
