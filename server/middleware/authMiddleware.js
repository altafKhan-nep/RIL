const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { readAccessCookie, readBearerToken } = require('../utils/authCookie');

const protect = async (req, res, next) => {
  // httpOnly cookie (browser) takes precedence; Bearer is still accepted for
  // API clients and the QA harness.
  const token = readAccessCookie(req) || readBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been disabled' });
    }
    // Reject tokens issued before the user's last password change.
    const tokenVersion = decoded.tv || 0;
    if (tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Session invalidated, please sign in again' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Populates req.user when a valid access token is present but never rejects.
 * Used by /api/users/refresh, whose entire purpose is to run after the access
 * token has already expired.
 */
const optionalAuth = async (req, res, next) => {
  const token = readAccessCookie(req) || readBearerToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive && (decoded.tv || 0) === (user.tokenVersion || 0)) {
      req.user = user;
    }
  } catch {
    // An expired or invalid access token is expected here.
  }
  return next();
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdminRole()) {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized as an admin' });
};

const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized as a super admin' });
};

const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'super_admin') return next();
    const hasAny = permissions.some((p) => req.user.hasPermission(p));
    if (hasAny) return next();
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

module.exports = { protect, optionalAuth, admin, superAdmin, requirePermission };
