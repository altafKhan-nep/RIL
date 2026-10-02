const ObjectId = require('mongoose').Types.ObjectId;

const isValidObjectId = (id) => {
  if (!id) return false;
  try {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
  } catch {
    return false;
  }
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
    if (typeof data.countInStock !== 'number' || data.countInStock < 0) {
      errors.push('Count in stock must be a number greater than or equal to 0');
    }
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else if (data.description.trim().length < 10 || data.description.trim().length > 2000) {
    errors.push('Description must be between 10 and 2000 characters');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
    errors.push('Category is required');
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
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  return { isValid: errors.length === 0, errors };
};

const validateOrder = (data) => {
  const errors = [];

  if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
    errors.push('At least one order item is required');
  } else {
    data.orderItems.forEach((item, index) => {
      if (!item.name) errors.push(`Order item ${index + 1}: name is required`);
      if (!item.qty || typeof item.qty !== 'number' || item.qty <= 0) errors.push(`Order item ${index + 1}: quantity must be greater than 0`);
      if (!item.price || typeof item.price !== 'number' || item.price <= 0) errors.push(`Order item ${index + 1}: price must be greater than 0`);
      if (!item.product) errors.push(`Order item ${index + 1}: product ID is required`);
      else if (!isValidObjectId(item.product)) errors.push(`Order item ${index + 1}: invalid product ID format`);
    });
  }

  if (!data.shippingAddress || typeof data.shippingAddress !== 'object') {
    errors.push('Shipping address is required');
  } else {
    const required = ['fullName', 'street', 'city', 'zip'];
    const missing = required.filter((f) => !data.shippingAddress[f] || typeof data.shippingAddress[f] !== 'string' || data.shippingAddress[f].trim().length === 0);
    if (missing.length > 0) {
      errors.push(`Shipping address missing required fields: ${missing.join(', ')}`);
    }
  }

  if (data.totalPrice === undefined || data.totalPrice === null || data.totalPrice === '') {
    errors.push('Total price is required');
  } else if (typeof data.totalPrice !== 'number' || data.totalPrice <= 0) {
    errors.push('Total price must be greater than 0');
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

  if (!data.startDate) {
    errors.push('Start date is required');
  }

  if (!data.endDate) {
    errors.push('End date is required');
  }

  return { isValid: errors.length === 0, errors };
};

module.exports = {
  validateProduct,
  validateUser,
  validateOrder,
  validateBanner,
  validateCategory,
  validatePromotion,
};
