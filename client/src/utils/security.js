export const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;' };
  return str.replace(/[&<>"'/]/g, (c) => map[c]);
};

export const validateEmail = (email) => {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  return { valid: errors.length === 0, errors };
};

export const validatePhone = (phone) => {
  const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;
  return re.test(String(phone).replace(/\s/g, ''));
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return sanitizeHTML(input.trim());
};

export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const secureStore = (key, value) => {
  if (!isLocalStorageAvailable()) return false;
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(value))));
    localStorage.setItem(key, encoded);
    return true;
  } catch {
    return false;
  }
};

export const secureRetrieve = (key) => {
  if (!isLocalStorageAvailable()) return null;
  try {
    const encoded = localStorage.getItem(key);
    if (!encoded) return null;
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
};

export const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
