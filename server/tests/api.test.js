const http = require('http');
const assert = require('assert');

const BASE = 'http://localhost:5001';
const ADMIN_EMAIL = 'admin@novacart.com';
const ADMIN_PASS = 'password123';
const CUSTOMER_EMAIL = 'alex@novacart.com';
const CUSTOMER_PASS = 'password123';

let adminToken = '';
let customerToken = '';
let createdProductId = '';
let createdOrderId = '';
let createdBannerId = '';
let createdCategoryId = '';
let createdPromotionId = '';
let createdUserId = '';
let firstProductId = '';
let secondProductId = '';

let passed = 0;
let failed = 0;
const results = [];

// ─── HTTP helper ────────────────────────────────────────────────────────────

function request(method, path, { token, body, query } = {}) {
  return new Promise((resolve, reject) => {
    let url = BASE + path;
    if (query) {
      const qs = Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      url += '?' + qs;
    }

    const parsed = new URL(url);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Test runner ────────────────────────────────────────────────────────────

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, ok: true });
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, ok: false, error: err.message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31m${err.message}\x1b[0m`);
  }
}

// ─── Setup: get tokens ─────────────────────────────────────────────────────

async function setup() {
  console.log('\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[36m║      NovaCart API Test Suite                     ║\x1b[0m');
  console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m\n');

  console.log('\x1b[1m\x1b[33m── Setting up authentication ──\x1b[0m');

  const adminRes = await request('POST', '/api/users/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  if (adminRes.status === 200 && adminRes.body && adminRes.body.token) {
    adminToken = adminRes.body.token;
    console.log('  Admin token acquired');
  } else {
    console.log('  \x1b[31mFATAL: Could not get admin token. Is the server running?\x1b[0m');
    console.log('  Status:', adminRes.status, 'Body:', JSON.stringify(adminRes.body));
    process.exit(1);
  }

  const custRes = await request('POST', '/api/users/login', {
    body: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASS },
  });
  if (custRes.status === 200 && custRes.body && custRes.body.token) {
    customerToken = custRes.body.token;
    console.log('  Customer token acquired\n');
  } else {
    console.log('  \x1b[31mFATAL: Could not get customer token.\x1b[0m');
    process.exit(1);
  }

  // Grab existing product IDs for later use
  const prodRes = await request('GET', '/api/products');
  if (prodRes.status === 200 && prodRes.body.products && prodRes.body.products.length > 0) {
    firstProductId = prodRes.body.products[0]._id;
    if (prodRes.body.products.length > 1) secondProductId = prodRes.body.products[1]._id;
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function runTests() {
  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\x1b[1m\x1b[33m── Authentication Tests ──\x1b[0m');

  await test('POST /api/users/login — valid credentials returns token', async () => {
    const res = await request('POST', '/api/users/login', {
      body: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASS },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token, 'Expected token in response');
    assert.ok(res.body._id, 'Expected _id in response');
    assert.strictEqual(res.body.email, CUSTOMER_EMAIL);
  });

  await test('POST /api/users/login — invalid credentials returns 401', async () => {
    const res = await request('POST', '/api/users/login', {
      body: { email: CUSTOMER_EMAIL, password: 'wrongpassword' },
    });
    assert.strictEqual(res.status, 401);
  });

  await test('POST /api/users/login — empty body returns error', async () => {
    const res = await request('POST', '/api/users/login', {
      body: {},
    });
    assert.ok(res.status >= 400, `Expected 4xx, got ${res.status}`);
  });

  await test('POST /api/users — register new user returns token', async () => {
    const timestamp = Date.now();
    const res = await request('POST', '/api/users', {
      body: {
        name: 'Test User',
        email: `testuser_${timestamp}@example.com`,
        password: 'testpass123',
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.token, 'Expected token in response');
    assert.ok(res.body._id, 'Expected _id in response');
    createdUserId = res.body._id;
  });

  await test('POST /api/users — duplicate email returns 400', async () => {
    const res = await request('POST', '/api/users', {
      body: { name: 'Dup User', email: CUSTOMER_EMAIL, password: 'testpass123' },
    });
    assert.strictEqual(res.status, 400);
  });

  await test('GET /api/users/profile — valid token returns profile', async () => {
    const res = await request('GET', '/api/users/profile', { token: customerToken });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body._id, 'Expected _id');
    assert.ok(res.body.email, 'Expected email');
    assert.strictEqual(res.body.email, CUSTOMER_EMAIL);
  });

  await test('GET /api/users/profile — no token returns 401', async () => {
    const res = await request('GET', '/api/users/profile');
    assert.strictEqual(res.status, 401);
  });

  await test('GET /api/users/profile — invalid token returns 401', async () => {
    const res = await request('GET', '/api/users/profile', { token: 'invalid.jwt.token' });
    assert.strictEqual(res.status, 401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PRODUCT TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Product Tests ──\x1b[0m');

  await test('GET /api/products — returns paginated products', async () => {
    const res = await request('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.products), 'Expected products array');
    assert.ok(typeof res.body.page === 'number', 'Expected page number');
    assert.ok(typeof res.body.pages === 'number', 'Expected pages number');
    assert.ok(typeof res.body.count === 'number', 'Expected count number');
    assert.ok(res.body.products.length > 0, 'Expected at least one product');
  });

  await test('GET /api/products — filters by category', async () => {
    const res = await request('GET', '/api/products', {
      query: { category: 'Electronics' },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.products));
    res.body.products.forEach((p) => {
      assert.strictEqual(p.category, 'Electronics');
    });
  });

  await test('GET /api/products — filters by keyword', async () => {
    const res = await request('GET', '/api/products', {
      query: { keyword: 'headphones' },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.length > 0, 'Expected matching products');
  });

  await test('GET /api/products/:id — returns single product', async () => {
    const res = await request('GET', `/api/products/${firstProductId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body._id, firstProductId);
    assert.ok(res.body.name, 'Expected product name');
    assert.ok(typeof res.body.price === 'number', 'Expected price');
  });

  await test('GET /api/products/:id — invalid ID returns 404', async () => {
    const fakeId = '000000000000000000000000';
    const res = await request('GET', `/api/products/${fakeId}`);
    assert.strictEqual(res.status, 404);
  });

  await test('GET /api/products/categories — returns category list', async () => {
    const res = await request('GET', '/api/products/categories');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected categories array');
  });

  await test('GET /api/products/flash-deals — returns flash deal products', async () => {
    const res = await request('GET', '/api/products/flash-deals');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected flash deals array');
  });

  await test('POST /api/products — admin can create product', async () => {
    const res = await request('POST', '/api/products', {
      token: adminToken,
      body: {
        name: 'Test Product E2E',
        slug: `test-product-e2e-${Date.now()}`,
        price: 29.99,
        originalPrice: 39.99,
        category: 'Test Category',
        description: 'This is a test product created by the API test suite for validation purposes.',
        countInStock: 10,
        images: ['https://example.com/test.jpg'],
        colors: ['#ff0000'],
        features: ['Test feature'],
        badge: 'Test',
        isFlashDeal: false,
        isNewArrival: true,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body._id, 'Expected _id');
    assert.strictEqual(res.body.name, 'Test Product E2E');
    createdProductId = res.body._id;
  });

  await test('POST /api/products — non-admin gets 403', async () => {
    const res = await request('POST', '/api/products', {
      token: customerToken,
      body: {
        name: 'Should Fail Product',
        slug: 'should-fail-product',
        price: 10,
        category: 'Test',
        description: 'This product creation should fail because customer is not admin.',
      },
    });
    assert.ok(res.status === 401 || res.status === 403, `Expected 401 or 403, got ${res.status}`);
  });

  await test('PUT /api/products/:id — admin can update product', async () => {
    const res = await request('PUT', `/api/products/${createdProductId}`, {
      token: adminToken,
      body: {
        name: 'Test Product E2E Updated',
        slug: `test-product-e2e-${Date.now()}`,
        price: 24.99,
        originalPrice: 34.99,
        category: 'Test Category',
        description: 'This is an updated test product description with enough characters for validation.',
        countInStock: 15,
        images: ['https://example.com/test.jpg'],
        colors: ['#ff0000'],
        features: ['Updated feature'],
        badge: 'Updated',
        isFlashDeal: false,
        isNewArrival: false,
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Test Product E2E Updated');
    assert.strictEqual(res.body.price, 24.99);
  });

  await test('DELETE /api/products/:id — admin can delete product', async () => {
    const res = await request('DELETE', `/api/products/${createdProductId}`, {
      token: adminToken,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);

    // Confirm it's gone
    const check = await request('GET', `/api/products/${createdProductId}`);
    assert.strictEqual(check.status, 404);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ORDER TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Order Tests ──\x1b[0m');

  await test('POST /api/orders — authenticated user can create order', async () => {
    const res = await request('POST', '/api/orders', {
      token: customerToken,
      body: {
        orderItems: [
          {
            name: 'Vibe Wireless Headphones',
            qty: 1,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
            price: 89.99,
            product: firstProductId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Shipper',
          street: '123 Test Street',
          city: 'Testville',
          zip: '12345',
        },
        paymentMethod: 'Card',
        itemsPrice: 89.99,
        taxPrice: 7.2,
        shippingPrice: 0,
        totalPrice: 97.19,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body._id, 'Expected order _id');
    assert.strictEqual(res.body.status, 'Pending');
    createdOrderId = res.body._id;
  });

  await test('POST /api/orders — unauthenticated returns 401', async () => {
    const res = await request('POST', '/api/orders', {
      body: {
        orderItems: [
          {
            name: 'Test',
            qty: 1,
            image: 'https://example.com/img.jpg',
            price: 10,
            product: firstProductId,
          },
        ],
        shippingAddress: { fullName: 'X', street: 'X', city: 'X', zip: '12345' },
        paymentMethod: 'Card',
        itemsPrice: 10,
        taxPrice: 0.8,
        shippingPrice: 5.99,
        totalPrice: 16.79,
      },
    });
    assert.strictEqual(res.status, 401);
  });

  await test('GET /api/orders/myorders — returns user orders', async () => {
    const res = await request('GET', '/api/orders/myorders', { token: customerToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected orders array');
  });

  await test('GET /api/orders/:id — returns order by ID', async () => {
    const res = await request('GET', `/api/orders/${createdOrderId}`, { token: customerToken });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body._id, createdOrderId);
  });

  await test('GET /api/admin/orders — admin can get all orders', async () => {
    const res = await request('GET', '/api/admin/orders', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.orders), 'Expected orders array');
    assert.ok(typeof res.body.total === 'number', 'Expected total count');
  });

  await test('PUT /api/admin/orders/:id/status — admin can update status', async () => {
    const res = await request('PUT', `/api/admin/orders/${createdOrderId}/status`, {
      token: adminToken,
      body: { status: 'Processing' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'Processing');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Admin Tests ──\x1b[0m');

  await test('GET /api/admin/stats — admin gets dashboard stats', async () => {
    const res = await request('GET', '/api/admin/stats', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.totalSales === 'number', 'Expected totalSales');
    assert.ok(typeof res.body.totalOrders === 'number', 'Expected totalOrders');
    assert.ok(typeof res.body.totalCustomers === 'number', 'Expected totalCustomers');
    assert.ok(typeof res.body.totalProducts === 'number', 'Expected totalProducts');
    assert.ok(res.body.statusCounts, 'Expected statusCounts');
    assert.ok(res.body.revenue, 'Expected revenue object');
  });

  await test('GET /api/admin/users — admin gets all users', async () => {
    const res = await request('GET', '/api/admin/users', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.users), 'Expected users array');
    assert.ok(typeof res.body.total === 'number', 'Expected total');
  });

  await test('PUT /api/admin/users/:id — admin can update user', async () => {
    const res = await request('PUT', `/api/admin/users/${createdUserId}`, {
      token: adminToken,
      body: { name: 'Test User Updated' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Test User Updated');
  });

  await test('GET /api/admin/analytics — admin gets analytics', async () => {
    const res = await request('GET', '/api/admin/analytics', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.revenueByMonth), 'Expected revenueByMonth array');
    assert.ok(Array.isArray(res.body.ordersByStatus), 'Expected ordersByStatus array');
    assert.ok(Array.isArray(res.body.topCategories), 'Expected topCategories array');
    assert.ok(Array.isArray(res.body.customerGrowth), 'Expected customerGrowth array');
  });

  await test('GET /api/admin/stats — non-admin gets 403', async () => {
    const res = await request('GET', '/api/admin/stats', { token: customerToken });
    assert.ok(res.status === 401 || res.status === 403, `Expected 401 or 403, got ${res.status}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BANNER TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Banner Tests ──\x1b[0m');

  await test('GET /api/banners/active/hero — returns active hero banners', async () => {
    const res = await request('GET', '/api/banners/active/hero');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected banners array');
  });

  await test('POST /api/banners — admin can create banner', async () => {
    const res = await request('POST', '/api/banners', {
      token: adminToken,
      body: {
        title: 'Test Banner',
        subtitle: 'Created by tests',
        description: 'A test banner created by the API test suite.',
        image: 'https://example.com/banner.jpg',
        link: '/test',
        ctaText: 'Test Now',
        position: 'hero',
        isActive: true,
        bgColor: '#ffffff',
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body._id, 'Expected banner _id');
    assert.strictEqual(res.body.title, 'Test Banner');
    createdBannerId = res.body._id;
  });

  await test('PUT /api/banners/:id — admin can update banner', async () => {
    const res = await request('PUT', `/api/banners/${createdBannerId}`, {
      token: adminToken,
      body: { title: 'Test Banner Updated', subtitle: 'Updated subtitle for testing', image: 'https://example.com/updated.jpg', position: 'hero' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.title, 'Test Banner Updated');
  });

  await test('DELETE /api/banners/:id — admin can delete banner', async () => {
    const res = await request('DELETE', `/api/banners/${createdBannerId}`, {
      token: adminToken,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);

    const check = await request('GET', `/api/banners/${createdBannerId}`);
    assert.strictEqual(check.status, 404);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORY TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Category Tests ──\x1b[0m');

  await test('GET /api/categories — returns categories (public)', async () => {
    const res = await request('GET', '/api/categories');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected categories tree array');
  });

  await test('POST /api/categories — admin can create category', async () => {
    const res = await request('POST', '/api/categories', {
      token: adminToken,
      body: {
        name: 'Test Category',
        slug: `test-category-${Date.now()}`,
        description: 'A test category created by the API test suite.',
        icon: 'category',
        isActive: true,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body._id, 'Expected category _id');
    assert.strictEqual(res.body.name, 'Test Category');
    createdCategoryId = res.body._id;
  });

  await test('PUT /api/categories/:id — admin can update category', async () => {
    const res = await request('PUT', `/api/categories/${createdCategoryId}`, {
      token: adminToken,
      body: { name: 'Test Category Updated', description: 'Updated description for testing.' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Test Category Updated');
  });

  await test('DELETE /api/categories/:id — admin can delete category', async () => {
    const res = await request('DELETE', `/api/categories/${createdCategoryId}`, {
      token: adminToken,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROMOTION TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Promotion Tests ──\x1b[0m');

  await test('POST /api/promotions — admin can create promotion', async () => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const res = await request('POST', '/api/promotions', {
      token: adminToken,
      body: {
        name: 'Test Promo',
        code: `TP${Date.now()}`,
        description: 'A test promotion.',
        type: 'percentage',
        value: 15,
        minPurchase: 50,
        maxDiscount: 30,
        usageLimit: 100,
        isActive: true,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body._id, 'Expected promotion _id');
    createdPromotionId = res.body._id;
  });

  await test('POST /api/promotions/validate — validates promo code', async () => {
    // Fetch the code we just created
    const promoRes = await request('GET', `/api/promotions/${createdPromotionId}`, {
      token: adminToken,
    });
    const code = promoRes.body.code;

    const res = await request('POST', '/api/promotions/validate', {
      token: customerToken,
      body: { code, cartTotal: 100 },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.valid, true);
    assert.ok(res.body.promotion, 'Expected promotion details');
    assert.ok(typeof res.body.discount === 'number', 'Expected discount');
  });

  await test('DELETE /api/promotions/:id — admin can delete promotion', async () => {
    const res = await request('DELETE', `/api/promotions/${createdPromotionId}`, {
      token: adminToken,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
  });

  await test('POST /api/promotions/validate — invalid promo code returns error', async () => {
    const res = await request('POST', '/api/promotions/validate', {
      token: customerToken,
      body: { code: 'INVALIDCODE999', cartTotal: 100 },
    });
    assert.ok(res.status === 400 || res.status === 404, `Expected 400 or 404, got ${res.status}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Settings Tests ──\x1b[0m');

  await test('GET /api/settings — returns settings', async () => {
    const res = await request('GET', '/api/settings');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.store, 'Expected store settings');
    assert.ok(res.body.payment, 'Expected payment settings');
    assert.ok(res.body.shipping, 'Expected shipping settings');
    assert.ok(res.body.tax, 'Expected tax settings');
  });

  await test('PUT /api/settings/store — admin can update store settings', async () => {
    const res = await request('PUT', '/api/settings/store', {
      token: adminToken,
      body: { name: 'NovaCart Updated', tagline: 'Updated tagline for testing' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.store.name, 'NovaCart Updated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Security Tests ──\x1b[0m');

  await test('GET /api/products — response has security headers', async () => {
    const res = await request('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.strictEqual(res.headers['x-xss-protection'], '0');
    assert.ok(res.headers['referrer-policy'], 'Expected Referrer-Policy header');
    assert.ok(res.headers['permissions-policy'], 'Expected Permissions-Policy header');
  });

  await test('POST /api/users/login — rate limiting works', async () => {
    const statuses = [];
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(
        request('POST', '/api/users/login', {
          body: { email: 'nonexistent@test.com', password: 'wrong' },
        }).then((res) => {
          statuses.push(res.status);
          return res;
        })
      );
    }
    await Promise.all(promises);
    const rateLimited = statuses.some((s) => s === 429);
    assert.ok(rateLimited, `Expected at least one 429 response, got statuses: [${statuses.join(', ')}]`);
  });

  await test('GET /api/products — NoSQL injection attempt ($where) is blocked', async () => {
    const res = await request('GET', '/api/products', {
      query: { keyword: '{"$where":"function() { return true; }"}' },
    });
    assert.ok(res.status === 400 || res.status === 200, `Expected 400 or 200, got ${res.status}`);
    if (res.status === 400) {
      assert.ok(
        res.body.message && res.body.message.toLowerCase().includes('invalid'),
        'Expected invalid input message'
      );
    }
  });

  await test('GET /api/products — XSS in query is sanitized', async () => {
    const res = await request('GET', '/api/products', {
      query: { keyword: '<script>alert("xss")</script>' },
    });
    assert.ok(res.status === 200 || res.status === 400);
    const raw = JSON.stringify(res.body);
    assert.ok(!raw.includes('<script>'), 'Response should not contain raw <script> tags');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\x1b[1m\x1b[33m── Error Handling Tests ──\x1b[0m');

  await test('GET /api/nonexistent — returns 404', async () => {
    const res = await request('GET', '/api/nonexistent');
    assert.strictEqual(res.status, 404);
  });

  await test('POST /api/orders — missing fields returns 400', async () => {
    const res = await request('POST', '/api/orders', {
      token: customerToken,
      body: {},
    });
    assert.strictEqual(res.status, 400);
  });
}

// ─── Summary ────────────────────────────────────────────────────────────────

function printSummary() {
  console.log('\n\x1b[1m\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[36m║                   SUMMARY                        ║\x1b[0m');
  console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m\n');

  const total = passed + failed;
  console.log(`  Total:  ${total}`);
  console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`  Rate:   ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);

  if (failed > 0) {
    console.log('\n  \x1b[31mFailed tests:\x1b[0m');
    results
      .filter((r) => !r.ok)
      .forEach((r) => {
        console.log(`    \x1b[31m✗ ${r.name}\x1b[0m`);
        console.log(`      ${r.error}`);
      });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('\n\x1b[31mFATAL ERROR:\x1b[0m', err.message);
    console.error('Ensure the server is running on port 5001 before running tests.');
    process.exit(1);
  } finally {
    printSummary();
  }
})();
