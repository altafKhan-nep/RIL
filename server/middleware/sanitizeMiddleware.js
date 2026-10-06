// NOTE: We intentionally do NOT HTML-encode stored data here. Encoding at
// persistence time corrupts values (e.g. "5 > 3" becomes "5 &gt; 3" in the
// database). XSS protection is handled at render time by React's escaping
// and by the xss() middleware on the response.
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj.trim();
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

const NOSQL_PATTERNS = [
  /\$where/i,
  /\$expr/i,
  /\$jsonSchema/i,
  /\$function/i,
  /\$accumulator/i,
  /\$mapReduce/i,
];

const containsNoSqlInjection = (value) => {
  if (typeof value !== 'string') return false;
  return NOSQL_PATTERNS.some((pattern) => pattern.test(value));
};

const checkNoSqlPatterns = (obj) => {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') return containsNoSqlInjection(obj);
  if (Array.isArray(obj)) return obj.some(checkNoSqlPatterns);
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (NOSQL_PATTERNS.some((p) => p.test(key))) return true;
      if (checkNoSqlPatterns(value)) return true;
    }
  }
  return false;
};

const preventInjection = (req, res, next) => {
  if (req.body && checkNoSqlPatterns(req.body)) {
    return res.status(400).json({ message: 'Invalid input detected' });
  }
  if (req.query && checkNoSqlPatterns(req.query)) {
    return res.status(400).json({ message: 'Invalid query parameters detected' });
  }
  if (req.params && checkNoSqlPatterns(req.params)) {
    return res.status(400).json({ message: 'Invalid parameters detected' });
  }
  next();
};

const ObjectId = require('mongoose').Types.ObjectId;

const validateObjectId = (req, res, next) => {
  const idParams = ['id', 'orderId', 'userId'];
  for (const param of idParams) {
    if (req.params[param]) {
      if (!ObjectId.isValid(req.params[param]) || String(new ObjectId(req.params[param])) !== req.params[param]) {
        return res.status(400).json({ message: `Invalid ${param} format` });
      }
    }
  }
  next();
};

module.exports = { sanitizeInput, preventInjection, validateObjectId };
