const ObjectId = require('mongoose').Types.ObjectId;

const isValidObjectId = (id) => {
  if (!id) return false;
  try {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
  } catch {
    return false;
  }
};

// Only allow app-relative paths and explicit http(s) URLs. This prevents an
// administrator-authored `javascript:` or `data:` link from becoming stored
// XSS when rendered into an anchor/button.
const isSafeLink = (value) => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length === 0 || v.length > 2000) return false;
  if (v.startsWith('#')) return true;
  if (v.startsWith('//')) return false;
  if (v.startsWith('/')) return true;
  return /^https?:\/\//i.test(v);
};

const validateProduct = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  } else if (data.name.trim().length < 3 || data.name.trim().length > 200) {
    errors.push('Name must be between 3 and 200 characters');
  }

  if (!data.slug || typeof data.slug !== 'string') {
    errors.push('Slug is required');
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug.trim())) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  if (data.price === undefined || data.price === null || data.price === '') {
    errors.push('Price is required');
  } else if (typeof data.price !== 'number' || data.price <= 0) {
    errors.push('Price must be a number greater than 0');
  }

  if (data.countInStock !== undefined && data.countInStock !== null) {
    if (!Number.isFinite(data.countInStock) || !Number.isInteger(data.countInStock) || data.countInStock < 0) {
      errors.push('Count in stock must be a whole number greater than or equal to 0');
    }
    if (data.countInStock > 1000000) {
      errors.push('Count in stock is unreasonably large');
    }
  }

  if (data.originalPrice !== undefined && data.originalPrice !== null) {
    if (!Number.isFinite(data.originalPrice) || data.originalPrice < 0) {
      errors.push('Original price must be a non-negative number');
    }
  }

  if (data.status !== undefined && !['active', 'draft', 'out of stock'].includes(data.status)) {
    errors.push('Status must be active, draft, or out of stock');
  }

  if (data.images !== undefined && (!Array.isArray(data.images) || data.images.length > 20 || data.images.some((i) => typeof i !== 'string' || i.length > 500))) {
    errors.push('Images must be an array of up to 20 valid paths');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else if (data.description.trim().length < 10 || data.description.trim().length > 2000) {
    errors.push('Description must be between 10 and 2000 characters');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
    errors.push('Category is required');
  } else if (data.category.trim().length > 100) {
    errors.push('Category is too long');
  }

  if (data.price > 1000000) {
    errors.push('Price is unreasonably large');
  }

  return { isValid: errors.length === 0, errors };
};

const validateUser = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  } else if (data.name.trim().length < 2 || data.name.trim().length > 50) {
    errors.push('Name must be between 2 and 50 characters');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push('Email must be a valid email address');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (data.password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }

  return { isValid: errors.length === 0, errors };
};

const validateOrder = (data) => {
  const errors = [];

  if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
    errors.push('At least one order item is required');
  } else if (data.orderItems.length > 50) {
    errors.push('An order cannot contain more than 50 line items');
  } else {
    const seen = new Set();
    data.orderItems.forEach((item, index) => {
      const prefix = `Order item ${index + 1}`;
      if (!item.product) {
        errors.push(`${prefix}: product ID is required`);
      } else if (!isValidObjectId(item.product)) {
        errors.push(`${prefix}: invalid product ID format`);
      } else if (seen.has(String(item.product))) {
        errors.push(`${prefix}: duplicate product. Combine quantities into one line item.`);
      } else {
        seen.add(String(item.product));
      }
      if (!Number.isFinite(item.qty) || !Number.isInteger(item.qty) || item.qty <= 0 || item.qty > 100) {
        errors.push(`${prefix}: quantity must be a whole number between 1 and 100`);
      }
      if (!Number.isFinite(item.price) || item.price <= 0) {
        errors.push(`${prefix}: price must be greater than 0`);
      }
    });
  }

  if (!data.shippingAddress || typeof data.shippingAddress !== 'object' || Array.isArray(data.shippingAddress)) {
    errors.push('Shipping address is required');
  } else {
    const required = ['fullName', 'street', 'city', 'zip'];
    const missing = required.filter((f) => !data.shippingAddress[f] || typeof data.shippingAddress[f] !== 'string' || data.shippingAddress[f].trim().length === 0);
    if (missing.length > 0) {
      errors.push(`Shipping address missing required fields: ${missing.join(', ')}`);
    }
    for (const field of ['fullName', 'street', 'city', 'state', 'zip', 'country', 'phone']) {
      const value = data.shippingAddress[field];
      if (value !== undefined && (typeof value !== 'string' || value.length > 200)) {
        errors.push(`Shipping address field "${field}" must be a string of at most 200 characters`);
      }
    }
  }

  if (data.paymentMethod !== undefined && !['Card', 'Stripe', 'COD', 'Cash on Delivery'].includes(data.paymentMethod)) {
    errors.push('Payment method must be Card or Cash on Delivery');
  }

  if (data.promoCode !== undefined && data.promoCode !== null) {
    if (typeof data.promoCode !== 'string' || data.promoCode.length > 32) {
      errors.push('Promo code is invalid');
    }
  }

  if (data.notes !== undefined && (typeof data.notes !== 'string' || data.notes.length > 1000)) {
    errors.push('Notes must be at most 1000 characters');
  }

  if (data.idempotencyKey !== undefined && data.idempotencyKey !== null && data.idempotencyKey !== '') {
    if (typeof data.idempotencyKey !== 'string' || data.idempotencyKey.length < 8 || data.idempotencyKey.length > 128 || !/^[A-Za-z0-9_-]+$/.test(data.idempotencyKey)) {
      errors.push('Idempotency key must be 8-128 characters of letters, numbers, hyphens, or underscores');
    }
  }

  // NOTE: totalPrice is intentionally NOT validated here. The server
  // computes the authoritative total from database prices and settings;
  // any client-supplied totalPrice is ignored.

  return { isValid: errors.length === 0, errors };
};

const validateProfile = (data) => {
  const errors = [];

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 50) {
      errors.push('Name must be between 2 and 50 characters');
    }
  }
  if (data.email !== undefined) {
    if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || data.email.length > 254) {
      errors.push('Email must be a valid email address');
    }
  }
  if (data.phone !== undefined && (typeof data.phone !== 'string' || data.phone.length > 40)) {
    errors.push('Phone must be at most 40 characters');
  }
  if (data.password !== undefined && (typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 128)) {
    errors.push('Password must be between 8 and 128 characters');
  }
  if (data.address !== undefined) {
    if (!data.address || typeof data.address !== 'object' || Array.isArray(data.address)) {
      errors.push('Address must be an object');
    } else {
      for (const field of ['fullName', 'street', 'city', 'state', 'zip', 'country', 'phone']) {
        const value = data.address[field];
        if (value !== undefined && (typeof value !== 'string' || value.length > 200)) {
          errors.push(`Address field "${field}" must be a string of at most 200 characters`);
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
};

const validateBanner = (data) => {
  const errors = [];
  const validPositions = ['hero', 'promo', 'footer', 'sidebar'];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!data.image || typeof data.image !== 'string' || data.image.trim().length === 0) {
    errors.push('Image is required');
  }

  if (data.position && !validPositions.includes(data.position)) {
    errors.push(`Position must be one of: ${validPositions.join(', ')}`);
  }

  if (data.link !== undefined && !isSafeLink(data.link)) {
    errors.push('Link must be an app path or an http(s) URL');
  }

  return { isValid: errors.length === 0, errors };
};

const validateCategory = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  } else if (data.name.trim().length < 2 || data.name.trim().length > 50) {
    errors.push('Name must be between 2 and 50 characters');
  }

  return { isValid: errors.length === 0, errors };
};

const validatePromotion = (data) => {
  const errors = [];
  const validTypes = ['percentage', 'fixed', 'free_shipping'];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!data.code || typeof data.code !== 'string') {
    errors.push('Code is required');
  } else if (data.code.trim().length < 3 || data.code.trim().length > 20) {
    errors.push('Code must be between 3 and 20 characters');
  } else if (data.code.trim() !== data.code.trim().toUpperCase()) {
    errors.push('Code must be uppercase');
  }

  if (!data.type || !validTypes.includes(data.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }

  if (data.value === undefined || data.value === null || data.value === '') {
    errors.push('Value is required');
  } else if (typeof data.value !== 'number' || data.value < 0) {
    errors.push('Value must be a positive number');
  } else if (data.type !== 'free_shipping' && data.value <= 0) {
    errors.push('Value must be greater than 0');
  }

  if (!data.startDate || Number.isNaN(new Date(data.startDate).getTime())) {
    errors.push('A valid start date is required');
  }

  if (!data.endDate || Number.isNaN(new Date(data.endDate).getTime())) {
    errors.push('A valid end date is required');
  }

  if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
    errors.push('End date must be after start date');
  }

  for (const field of ['minPurchase', 'maxDiscount', 'usageLimit', 'maxPerUser']) {
    if (data[field] !== undefined && (!Number.isFinite(data[field]) || data[field] < 0)) {
      errors.push(`${field} must be a non-negative number`);
    }
  }

  if (data.value !== undefined && !Number.isFinite(data.value)) {
    errors.push('Value must be a finite number');
  }

  return { isValid: errors.length === 0, errors };
};

module.exports = {
  isValidObjectId,
  isSafeLink,
  validateProduct,
  validateUser,
  validateOrder,
  validateProfile,
  validateBanner,
  validateCategory,
  validatePromotion,
};
