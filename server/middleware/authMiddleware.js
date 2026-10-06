const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { readToken, readBearerToken } = require('../utils/authCookie');

const protect = async (req, res, next) => {
  // httpOnly cookie (browser) takes precedence; Bearer is still accepted for
  // API clients and the QA harness.
  const token = readToken(req) || readBearerToken(req);

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

module.exports = { protect, admin, superAdmin, requirePermission };
