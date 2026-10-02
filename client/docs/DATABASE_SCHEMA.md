# Database Schema

## Overview

MongoDB with Mongoose ODM. 8 models total.

---

## Product

```javascript
{
  sku:               String,     // Unique, sparse index
  name:              String,     // Required
  slug:              String,     // Required, unique
  category:          String,     // Required (e.g., "Electronics")
  description:       String,     // Required
  price:             Number,     // Required, default: 0
  originalPrice:     Number,     // For sale display
  costPrice:         Number,     // For profit calculation
  countInStock:      Number,     // Required, default: 0
  minStockLevel:     Number,     // Low stock threshold, default: 5
  stockHistory:       Array,      // [{ type, quantity, previousStock, newStock, note, createdBy, date }]
  rating:            Number,     // 0-5
  numReviews:        Number,     // Default: 0
  images:            [String],   // Array of image URLs
  colors:            [String],   // Hex color codes
  features:          [String],   // Product features
  badge:             String,     // e.g., "-30%", "New", "Sale"
  isFlashDeal:       Boolean,    // Default: false
  isNewArrival:      Boolean,    // Default: false
  status:            String,     // Enum: "active", "draft", "out of stock", default: "active"
  createdAt:         Date,
  updatedAt:         Date
}
```

---

## User

```javascript
{
  name:              String,     // Required
  email:             String,     // Required, unique, lowercase
  password:          String,     // Required, bcrypt-hashed via pre-save hook
  isAdmin:           Boolean,    // Auto-true for non-customer roles
  role:              String,     // Enum: "super_admin", "admin", "content_manager", "order_manager", "customer"
  permissions:       [String],   // Additive custom permissions
  isActive:          Boolean,    // Default: true (soft-delete)
  avatar:            String,
  phone:             String,
  wishlist:          [ObjectId], // Ref: Product
  loyaltyPoints:     Number,     // Default: 0
  address: {
    fullName:        String,
    street:          String,
    city:            String,
    state:           String,
    zip:             String,
    country:         String,
    phone:           String
  },
  lastLogin:         Date,
  loginCount:        Number,     // Default: 0
  createdAt:         Date,
  updatedAt:         Date
}
```

**Instance Methods:**
- `matchPassword(enteredPassword)` — bcrypt compare
- `hasPermission(permission)` — role + user permission check
- `hasAnyPermission(...perms)` — any permission match
- `getEffectivePermissions()` — union of role + user permissions
- `isAdminRole()` — true if role !== "customer"

---

## Order

```javascript
{
  user:              ObjectId,   // Required, ref: User
  orderItems:        Array,      // Required
    [{
      name:          String,     // Product name snapshot
      qty:           Number,     // Quantity ordered
      image:         String,     // Product image snapshot
      price:         Number,     // Price at time of order
      product:       ObjectId    // ref: Product
    }],
  shippingAddress:   Object,     // Required
    {
      fullName:      String,
      street:        String,
      city:          String,
      state:         String,
      zip:           String,
      country:       String,
      phone:         String
    },
  paymentMethod:     String,     // Required, default: "Card"
  itemsPrice:        Number,     // Required
  taxPrice:          Number,     // Required
  shippingPrice:     Number,     // Required
  discountPrice:     Number,     // Default: 0
  totalPrice:        Number,     // Required
  status:            String,     // Required, default: "Pending"
                       // Enum: "Pending", "Processing", "Shipped", "Delivered", "Cancelled"
  statusHistory:     Array,      // [{ status, date, note }]
  isPaid:            Boolean,    // Default: false
  paidAt:            Date,
  deliveredAt:       Date,
  cancelledAt:       Date,
  cancelReason:      String,
  trackingNumber:    String,
  notes:             String,
  promoCode:         String,
  createdAt:         Date,
  updatedAt:         Date
}
```

---

## Category

```javascript
{
  name:              String,     // Required, unique
  slug:              String,     // Required, unique
  description:       String,
  image:             String,     // Category image URL
  icon:              String,     // Material icon name, default: "category"
  parent:            ObjectId,   // ref: Category (hierarchical)
  isActive:          Boolean,    // Default: true
  order:             Number,     // Display order, default: 0
  productCount:      Number,     // Default: 0
}
```

**Virtuals:** `children` — subcategories where `parent === this._id`

---

## Banner

```javascript
{
  title:             String,     // Required
  subtitle:          String,
  description:       String,
  image:             String,     // Required, image URL
  link:              String,     // Default: "/"
  ctaText:           String,     // Default: "Shop Now"
  position:          String,     // Enum: "hero", "promo", "footer", "sidebar"
  targetPages:       [String],   // Enum: "home", "shop", "product"
  isActive:          Boolean,    // Default: true
  order:             Number,     // Default: 0
  startDate:         Date,
  endDate:           Date,
  bgColor:           String,     // Default: "#ffffff"
  createdAt:         Date,
  updatedAt:         Date
}
```

---

## Promotion

```javascript
{
  name:              String,     // Required
  code:              String,     // Required, unique, auto-uppercased
  description:       String,
  type:              String,     // Required, enum: "percentage", "fixed", "free_shipping"
  value:             Number,     // Required
  minPurchase:       Number,     // Default: 0
  maxDiscount:       Number,     // For percentage type
  usageLimit:        Number,     // 0 = unlimited
  usedCount:         Number,     // Default: 0
  maxPerUser:        Number,     // 0 = unlimited
  usedByUsers:       [ObjectId], // ref: User
  applicableProducts:[ObjectId], // ref: Product (empty = all)
  applicableCategories:[String], // e.g., ["Electronics"]
  isActive:          Boolean,    // Default: true
  startDate:         Date,       // Required
  endDate:           Date,       // Required
  createdAt:         Date,
  updatedAt:         Date
}
```

---

## Navigation

```javascript
{
  label:             String,     // Required
  url:               String,     // Required
  parent:            ObjectId,   // ref: Navigation (hierarchical)
  order:             Number,     // Default: 0
  isActive:          Boolean,    // Default: true
  isExternal:        Boolean,    // Default: false
  openInNewTab:      Boolean,    // Default: false
  icon:              String,
  position:          String,     // Enum: "header", "footer", "mobile"
}
```

**Virtuals:** `children` — sub-items where `parent === this._id`

---

## Settings

Singleton document with 7 sections:

```javascript
{
  store: {
    name:            String,     // "NovaCart"
    tagline:         String,
    logo:            String,
    favicon:         String,
    contactEmail:    String,
    phone:           String,
    address:         String
  },
  payment: {
    currency:        String,     // "USD"
    currencySymbol:  String,     // "$"
    acceptCreditCards: Boolean,
    acceptPaypal:    Boolean,
    stripePublicKey: String      // Filtered from public GET
  },
  shipping: {
    freeShippingThreshold: Number,  // 50
    standardRate:    Number,        // 5.99
    expressRate:     Number,        // 19.99
    enableLocalDelivery: Boolean
  },
  tax: {
    enabled:         Boolean,       // true
    rate:            Number,        // 8 (percent)
    includeInPrice:  Boolean
  },
  notifications: {
    orderConfirmation: Boolean,
    shippingUpdates:   Boolean,
    lowStockAlert:     Boolean,
    lowStockThreshold: Number,
    newOrderAlert:     Boolean
  },
  security: {
    requireEmailVerification: Boolean,
    enableTwoFactor:  Boolean,
    sessionTimeout:   Number,
    maxLoginAttempts: Number
  },
  seo: {
    metaTitle:        String,
    metaDescription:  String,
    ogImage:          String
  }
}
```

---

## Seed Data

Running `node seed/seed.js` populates:

| Collection | Count |
|------------|-------|
| Products | 26 (14 original + 12 kids' clothing) |
| Users | 8 (4 admin + 4 customer) |
| Orders | 6 (various statuses) |
| Banners | 9 (hero, promo, sidebar, footer) |
| Categories | 4 (Electronics, Fashion, Home Decor, Toys) |
| Navigation | 7 (header + footer) |
| Promotions | 3 (percentage, fixed, free_shipping) |
| Settings | 1 (defaults) |

**Warning:** Seeding is destructive — it deletes all existing data before inserting.
