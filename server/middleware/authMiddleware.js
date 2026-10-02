const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (!req.user.isActive) {
        return res.status(403).json({ message: 'Account has been disabled' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
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
