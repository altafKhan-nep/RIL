# Security

## Overview

NovaCart implements multiple layers of security to protect against common web vulnerabilities.

---

## Authentication

### JWT (JSON Web Tokens)

- Tokens issued on login/register via `jsonwebtoken`
- Secret key stored in `JWT_SECRET` environment variable
- Tokens expire after `JWT_EXPIRE` (default: 7 days)
- Sent via `Authorization: Bearer <token>` header

### Password Hashing

- bcryptjs with salt rounds = 10
- Passwords hashed automatically via Mongoose pre-save hook
- Plain-text passwords never stored or logged

### Auth Flow

```
1. User submits email + password
2. Server validates credentials via bcrypt.compare()
3. Server generates JWT with user ID and role
4. Token sent to client
5. Client stores token in localStorage
6. Token attached to subsequent requests via Authorization header
7. Server verifies token and attaches user to req.user
```

---

## Role-Based Access Control (RBAC)

### 5 Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | All permissions, cannot be deactivated |
| `admin` | All permissions |
| `content_manager` | Products, categories, banners, navigation |
| `order_manager` | Orders, customers |
| `customer` | Own profile, orders, wishlist |

### 34 Granular Permissions

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

### Enforcement

**Backend:**
```javascript
// Route-level
router.get('/admin/stats', protect, requirePermission('dashboard:view'), getStats);

// Controller-level
if (!user.hasPermission('products:edit')) {
  throw new ErrorResponse('Not authorized', 403);
}
```

**Frontend:**
```jsx
<ProtectedRoute requireAdmin>
  <AdminDashboard />
</ProtectedRoute>
```

---

## HTTP Security Headers (Helmet)

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Default policy |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `no-referrer` |

---

## Input Sanitization

### NoSQL Injection Prevention

```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

Replaces prohibited characters (`$`, `.`) in request body, params, and query strings.

### XSS Prevention

```javascript
const xss = require('xss-clean');
app.use(xss());
```

Sanitizes user input against XSS attacks.

### HTTP Parameter Pollution

```javascript
const hpp = require('hpp');
app.use(hpp());
```

Prevents HTTP parameter pollution attacks.

---

## Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // 100 requests per window
});

app.use('/api', limiter);
```

---

## CORS Configuration

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://nova-cart-dun.vercel.app'
  ],
  credentials: true,
}));
```

---

## Data Protection

### Settings API

The `GET /api/settings` endpoint filters sensitive fields:

```javascript
// stripePublicKey removed from public response
const { stripePublicKey, ...publicSettings } = settings.toObject();
```

### Order Snapshots

Orders store product name, price, and image at time of purchase — not references. This ensures order history remains accurate even if products change.

### User Passwords

- Never returned in API responses
- Excluded from queries by default: `.select('-password')`

---

## Error Handling

- Generic error messages in production (no stack traces)
- Structured error responses
- Async error wrapper prevents unhandled promise rejections

```javascript
// Production: no stack trace
if (process.env.NODE_ENV === 'production') {
  res.status(err.statusCode).json({
    message: err.message
  });
} else {
  // Development: full error details
  res.status(err.statusCode).json({
    message: err.message,
    stack: err.stack
  });
}
```

---

## Security Checklist

- [x] JWT authentication with expiration
- [x] Password hashing with bcrypt
- [x] RBAC with granular permissions
- [x] HTTP security headers (Helmet)
- [x] NoSQL injection prevention
- [x] XSS prevention
- [x] HTTP parameter pollution prevention
- [x] Rate limiting
- [x] CORS configuration
- [x] Sensitive data filtering
- [x] Order data snapshots
- [x] Environment variables for secrets
- [x] Error messages sanitized in production
- [x] Request IDs for logging

---

## Environment Variables

**Never commit `.env` files to version control.**

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRE` | Token expiration | `7d` |
| `PORT` | Server port | `5001` |

---

## Best Practices

1. **Keep dependencies updated** — Run `npm audit` regularly
2. **Use HTTPS** — Always in production
3. **Rotate secrets** — Change JWT_SECRET periodically
4. **Monitor logs** — Watch for suspicious activity
5. **Backup database** — Regular MongoDB Atlas backups
6. **Limit admin access** — Use least-privilege roles
7. **Validate inputs** — Both client-side and server-side
