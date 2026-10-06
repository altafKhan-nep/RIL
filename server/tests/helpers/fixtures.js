const bcrypt = require('bcryptjs');

const hash = (pw) => bcrypt.hashSync(pw, 10);

const USERS = {
  superAdmin: { name: 'QA Super Admin', email: 'qa_super@example.com', password: 'qa_password_123', role: 'super_admin' },
  admin: { name: 'QA Admin', email: 'qa_admin@example.com', password: 'qa_password_123', role: 'admin' },
  contentManager: { name: 'QA Content Mgr', email: 'qa_content@example.com', password: 'qa_password_123', role: 'content_manager' },
  orderManager: { name: 'QA Order Mgr', email: 'qa_orders@example.com', password: 'qa_password_123', role: 'order_manager' },
  customer: { name: 'QA Customer', email: 'qa_customer@example.com', password: 'qa_password_123', role: 'customer' },
  customer2: { name: 'QA Customer Two', email: 'qa_customer2@example.com', password: 'qa_password_123', role: 'customer' },
};

const PRODUCTS = [
  { name: 'QA Widget', slug: 'qa-widget', price: 10.0, originalPrice: 15.0, category: 'QA Cat', description: 'A QA widget for testing.', countInStock: 100, status: 'active', sku: 'QA-WIDGET-1' },
  { name: 'QA Gadget', slug: 'qa-gadget', price: 20.0, originalPrice: 25.0, category: 'QA Cat', description: 'A QA gadget for testing.', countInStock: 50, status: 'active', sku: 'QA-GADGET-1' },
  { name: 'QA Premium', slug: 'qa-premium', price: 99.99, originalPrice: 120.0, category: 'QA Cat', description: 'A QA premium product.', countInStock: 10, status: 'active', sku: 'QA-PREMIUM-1' },
  { name: 'QA Draft', slug: 'qa-draft', price: 5.0, category: 'QA Cat', description: 'A draft product.', countInStock: 5, status: 'draft', sku: 'QA-DRAFT-1' },
  { name: 'QA NoStock', slug: 'qa-nostock', price: 8.0, category: 'QA Cat', description: 'Out of stock.', countInStock: 0, status: 'active', sku: 'QA-NOSTOCK-1' },
];

const CATEGORIES = [
  { name: 'QA Cat', slug: 'qa-cat', description: 'QA category', isActive: true },
  { name: 'QA Empty', slug: 'qa-empty', description: 'Empty category', isActive: true },
];

const PROMOTIONS = [
  { name: 'QA 10%', code: 'QATEST10', type: 'percentage', value: 10, minPurchase: 0, maxDiscount: 0, usageLimit: 0, maxPerUser: 0, isActive: true },
  { name: 'QA Fixed 5', code: 'QAFIXED5', type: 'fixed', value: 5, minPurchase: 0, maxDiscount: 0, usageLimit: 0, maxPerUser: 0, isActive: true },
  { name: 'QA Expired', code: 'QAEXPIRED', type: 'percentage', value: 50, minPurchase: 0, maxDiscount: 0, usageLimit: 0, maxPerUser: 0, isActive: true },
  { name: 'QA Limited', code: 'QALIMIT1', type: 'percentage', value: 25, minPurchase: 0, maxDiscount: 0, usageLimit: 1, maxPerUser: 0, isActive: true },
];

const SETTINGS = {
  store: { name: 'QA Store', tagline: 'QA tagline', contactEmail: 'qa@example.com' },
  payment: { currency: 'USD', currencySymbol: '$', acceptCreditCards: true, acceptPaypal: false },
  shipping: { freeShippingThreshold: 50, standardRate: 5.99, expressRate: 12.99, enableLocalDelivery: false },
  tax: { enabled: true, rate: 0.08, includeInPrice: false },
  notifications: { orderConfirmation: true, shippingUpdates: true, lowStockAlert: true, lowStockThreshold: 5, newOrderAlert: true },
  security: { requireEmailVerification: false, enableTwoFactor: false, sessionTimeout: 30, maxLoginAttempts: 5 },
  seo: { metaTitle: 'QA Store', metaDescription: 'QA', ogImage: '' },
};

async function seed(db) {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const users = Object.values(USERS).map((u) => ({
    name: u.name, email: u.email, password: hash(u.password), role: u.role, isActive: true, permissions: [],
  }));
  await db.collection('users').insertMany(users);

  const products = PRODUCTS.map((p) => ({
    ...p, images: [], features: [], colors: [], createdAt: now, updatedAt: now,
  }));
  await db.collection('products').insertMany(products);

  const categories = CATEGORIES.map((c) => ({ ...c, parent: null, order: 0, productCount: 0, createdAt: now }));
  await db.collection('categories').insertMany(categories);

  const promotions = PROMOTIONS.map((p) => ({
    ...p, usedCount: 0, usedByProducts: [], usedByCategories: [],
    startDate: p.name === 'QA Expired' ? past : now,
    endDate: p.name === 'QA Expired' ? now : future,
    createdAt: now,
  }));
  await db.collection('promotions').insertMany(promotions);

  await db.collection('settings').insertOne({ ...SETTINGS, createdAt: now, updatedAt: now });

  return {
    users: USERS, products: PRODUCTS, categories: CATEGORIES, promotions: PROMOTIONS,
    dates: { now, future, past },
  };
}

module.exports = { USERS, PRODUCTS, CATEGORIES, PROMOTIONS, SETTINGS, seed };