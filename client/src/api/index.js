const API_URL = import.meta.env.VITE_API_URL || '/api';

// Auth is carried by httpOnly cookies set by the API, so no token is ever held
// in JS storage. Centralising fetch here guarantees cookies are sent on every
// call (including cross-origin dev setups).
//
// The access cookie is deliberately short-lived, so a 401 on a normal request
// means "your access token expired", not "you are signed out". We silently
// exchange the refresh cookie for a new access token and replay the request
// once. Concurrent 401s share a single refresh to avoid a refresh stampede.
let refreshInFlight = null;

const performRefresh = () => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/users/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// Endpoints that must never trigger a refresh, or that establish/clear session.
const noRetryPaths = ['/users/refresh', '/users/login'];

const apiFetch = async (url, options = {}) => {
  const { credentials, _skipRefreshRetry, ...rest } = options;
  const creds = credentials || 'include';
  const res = await fetch(url, { ...rest, credentials: creds });

  const isAuthEndpoint = noRetryPaths.some((p) => String(url).includes(p));
  if (res.status === 401 && !_skipRefreshRetry && !isAuthEndpoint) {
    const refreshed = await performRefresh();
    if (refreshed) {
      // The response body was already consumed by neither call, so replay is safe.
      return fetch(url, { ...rest, credentials: creds });
    }
  }
  return res;
};

// Retained for API clients that still send a bearer token explicitly.
const getHeaders = (withAuth = false, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (withAuth && token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res) => {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Something went wrong' };
  }
  if (!res.ok) {
    const err = new Error(data.message || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
};

export const api = {
  // Products
  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiFetch(`${API_URL}/products?${query}`);
    return handleResponse(res);
  },
  getProduct: async (id) => {
    const res = await apiFetch(`${API_URL}/products/${id}`);
    return handleResponse(res);
  },
  getCategories: async () => {
    const res = await apiFetch(`${API_URL}/products/categories`);
    return handleResponse(res);
  },
  getFlashDeals: async () => {
    const res = await apiFetch(`${API_URL}/products/flash-deals`);
    return handleResponse(res);
  },
  createProduct: async (data) => {
    const res = await apiFetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateProduct: async (id, data) => {
    const res = await apiFetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteProduct: async (id) => {
    const res = await apiFetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Auth
  login: async (email, password) => {
    const res = await apiFetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },
  register: async (name, email, password) => {
    const res = await apiFetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  // User
  getProfile: async () => {
    const res = await apiFetch(`${API_URL}/users/profile`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  // Clears the httpOnly session cookie on the server.
  logout: async () => {
    const res = await apiFetch(`${API_URL}/users/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  // Rolls the cookie forward; the browser cannot read or refresh it itself.
  refreshSession: async () => {
    const res = await apiFetch(`${API_URL}/users/refresh`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  addToWishlist: async (id) => {
    const res = await apiFetch(`${API_URL}/users/wishlist/${id}`, {
      method: 'POST',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updateProfile: async (data) => {
    const res = await apiFetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Orders
  createOrder: async (order) => {
    const res = await apiFetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(order),
    });
    return handleResponse(res);
  },
  getMyOrders: async () => {
    const res = await apiFetch(`${API_URL}/orders/myorders`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  getOrderById: async (id) => {
    const res = await apiFetch(`${API_URL}/orders/${id}`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  cancelOrder: async (id, reason) => {
    const res = await apiFetch(`${API_URL}/orders/${id}/cancel`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },
  trackOrder: async (orderId) => {
    const res = await apiFetch(`${API_URL}/orders/track/${orderId}`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Admin - Stats & Users
  getAdminStats: async () => {
    const res = await apiFetch(`${API_URL}/admin/stats`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  getAllUsers: async () => {
    const res = await apiFetch(`${API_URL}/admin/users`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  getUserById: async (id) => {
    const res = await apiFetch(`${API_URL}/admin/users/${id}`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updateUser: async (id, data) => {
    const res = await apiFetch(`${API_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteUser: async (id) => {
    const res = await apiFetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Admin - Orders
  getAllOrders: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiFetch(`${API_URL}/admin/orders?${query}`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  getOrderByIdAdmin: async (id) => {
    const res = await apiFetch(`${API_URL}/admin/orders/${id}`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updateOrderStatus: async (id, data) => {
    const res = await apiFetch(`${API_URL}/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  cancelOrderAsAdmin: async (id) => {
    const res = await apiFetch(`${API_URL}/admin/orders/${id}/cancel`, {
      method: 'PUT',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Analytics
  getAnalytics: async () => {
    const res = await apiFetch(`${API_URL}/admin/analytics`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Banners
  getBanners: async () => {
    const res = await apiFetch(`${API_URL}/banners`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  getActiveBanners: async (position) => {
    const res = await apiFetch(`${API_URL}/banners/active/${position}`);
    return handleResponse(res);
  },
  createBanner: async (data) => {
    const res = await apiFetch(`${API_URL}/banners`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateBanner: async (id, data) => {
    const res = await apiFetch(`${API_URL}/banners/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteBanner: async (id) => {
    const res = await apiFetch(`${API_URL}/banners/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  reorderBanners: async (items) => {
    const res = await apiFetch(`${API_URL}/banners/reorder`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ items }),
    });
    return handleResponse(res);
  },

  // Categories (admin)
  getCategoriesTree: async () => {
    const res = await apiFetch(`${API_URL}/categories`);
    return handleResponse(res);
  },
  getPublicCategories: async () => {
    const res = await apiFetch(`${API_URL}/categories/public`);
    return handleResponse(res);
  },
  createCategory: async (data) => {
    const res = await apiFetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateCategory: async (id, data) => {
    const res = await apiFetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteCategory: async (id) => {
    const res = await apiFetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  reorderCategories: async (items) => {
    const res = await apiFetch(`${API_URL}/categories/reorder`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ items }),
    });
    return handleResponse(res);
  },

  // Navigation
  getNavigation: async () => {
    const res = await apiFetch(`${API_URL}/navigation`);
    return handleResponse(res);
  },
  getNavigationByPosition: async (position) => {
    const res = await apiFetch(`${API_URL}/navigation?position=${position}&isActive=true`);
    return handleResponse(res);
  },
  createNavigation: async (data) => {
    const res = await apiFetch(`${API_URL}/navigation`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateNavigation: async (id, data) => {
    const res = await apiFetch(`${API_URL}/navigation/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteNavigation: async (id) => {
    const res = await apiFetch(`${API_URL}/navigation/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  reorderNavigation: async (items) => {
    const res = await apiFetch(`${API_URL}/navigation/reorder`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ items }),
    });
    return handleResponse(res);
  },

  // Promotions
  getPromotions: async () => {
    const res = await apiFetch(`${API_URL}/promotions`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  getActivePromotions: async () => {
    const res = await apiFetch(`${API_URL}/promotions/active`);
    return handleResponse(res);
  },
  getSidebarPromo: async () => {
    const res = await apiFetch(`${API_URL}/promotions/sidebar`);
    return handleResponse(res);
  },
  createPromotion: async (data) => {
    const res = await apiFetch(`${API_URL}/promotions`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updatePromotion: async (id, data) => {
    const res = await apiFetch(`${API_URL}/promotions/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deletePromotion: async (id) => {
    const res = await apiFetch(`${API_URL}/promotions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  validatePromotion: async (code, cartTotal) => {
    const res = await apiFetch(`${API_URL}/promotions/validate`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ code, cartTotal }),
    });
    return handleResponse(res);
  },

  // Settings
  getSettings: async () => {
    const res = await apiFetch(`${API_URL}/settings`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  updateSettings: async (section, data) => {
    const res = await apiFetch(`${API_URL}/settings/${section}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Inventory
  bulkUpdateStock: async (updates) => {
    const res = await apiFetch(`${API_URL}/admin/inventory/bulk`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ updates }),
    });
    return handleResponse(res);
  },
  adjustStock: async (id, adjustment, type, note) => {
    const res = await apiFetch(`${API_URL}/admin/inventory/${id}/adjust`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ adjustment, type, note }),
    });
    return handleResponse(res);
  },
  getStockHistory: async (id) => {
    const res = await apiFetch(`${API_URL}/admin/inventory/${id}/history`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Payments
  createPaymentIntent: async (amount, currency = 'usd', orderId) => {
    const res = await apiFetch(`${API_URL}/payments/create-intent`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ amount, currency, orderId }),
    });
    return handleResponse(res);
  },
  confirmPayment: async (paymentIntentId) => {
    const res = await apiFetch(`${API_URL}/payments/confirm`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ paymentIntentId }),
    });
    return handleResponse(res);
  },
  getAdminProducts: async () => {
    const res = await apiFetch(`${API_URL}/admin/products`, {
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
  // Auth rides on the httpOnly cookie; FormData must set its own content type.
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiFetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },
  uploadMultiple: async (files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    const res = await apiFetch(`${API_URL}/upload/multiple`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },
};
