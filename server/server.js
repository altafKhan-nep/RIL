const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/db');
const { sanitizeInput, preventInjection } = require('./middleware/sanitizeMiddleware');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

// --- Required secrets guard ---
// A missing JWT_SECRET previously only surfaced later, as a confusing
// "secretOrPrivateKey must have a value" error on the first login. Fail fast
// with an actionable message instead of shipping a broken auth service.
const REQUIRED_SECRETS = [
  { name: 'JWT_SECRET', prod: true },
  { name: 'MONGO_URI', prod: true },
];
const missing = REQUIRED_SECRETS.filter((s) => !process.env[s.name]).map((s) => s.name);
if (missing.length && process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.error(
    `\nFATAL: missing required environment variable(s): ${missing.join(', ')}\n` +
      `Set these on the host (for Render: Dashboard > Environment) and redeploy.\n`
  );
  process.exit(1);
}
if (missing.length) {
  // eslint-disable-next-line no-console
  console.warn(`[config] WARNING: missing ${missing.join(', ')} - auth/database features may fail.`);
}

connectDB();

const app = express();

// Trust proxy (required when behind nginx)
app.set('trust proxy', 1);

// --- Request ID middleware ---
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// --- Request timing middleware ---
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${req.method}] ${req.originalUrl} - ${duration}ms [${req.id}]`);
    }
  });
  next();
});

// --- Security headers middleware ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// --- Helmet ---
app.disable('x-powered-by');
app.use(helmet());

// --- CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// --- Compression ---
app.use(compression());

// --- Request logging ---
app.use(morgan('combined'));

// --- Request size validation ---
app.use((req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 1024 * 100; // 100KB
  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    return res.status(413).json({ message: 'Request body too large' });
  }
  next();
});

// --- Body parser ---
// The raw body must be preserved for Stripe webhook signature verification.
// A route-level express.raw() cannot recover it because this global parser
// already consumed the stream, so we stash the Buffer during verification.
app.use(
  express.json({
    limit: '100kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// --- NoSQL injection prevention ---
app.use(mongoSanitize());

// --- XSS protection ---
app.use(xss());

// --- HTTP parameter pollution prevention ---
app.use(hpp());

// --- Input sanitization & injection check ---
app.use(sanitizeInput);
app.use(preventInjection);

// --- CORS rejection handler ---
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy: this origin is not allowed' });
  }
  next(err);
});

// --- Rate limiters (MUST be before routes) ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
});
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.ORDER_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many order requests, please try again later.' },
});
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);
app.use('/api/users/login', loginLimiter);
app.use('/api/users', authLimiter);
app.use('/api/orders', orderLimiter);

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// --- API Routes ---
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);

// --- Static files ---
// Must resolve to the same directory the upload route writes to, otherwise
// freshly uploaded images are served from somewhere else.
const UPLOADS_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, 'uploads');
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    setHeaders(res) {
      if (res.req.url.endsWith('.avif')) res.setHeader('Content-Type', 'image/avif');
    },
  })
);

// --- Serve client build in production ---
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Refresh session cleanup ---
// Expired/revoked sessions are removed periodically so the collection cannot
// grow without bound. The TTL index is a backstop; this keeps it tidy even
// when autoIndex is disabled on the host.
const SESSION_PRUNE_MS = Number(process.env.SESSION_PRUNE_INTERVAL_MS) || 6 * 60 * 60 * 1000;
const pruneTimer = setInterval(async () => {
  try {
    const { pruneSessions } = require('./utils/refreshToken');
    const removed = await pruneSessions();
    if (removed) console.log(`[sessions] pruned ${removed} expired/revoked session(s)`);
  } catch (err) {
    console.error('[sessions] prune failed:', err.message);
  }
}, SESSION_PRUNE_MS);
pruneTimer.unref();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
