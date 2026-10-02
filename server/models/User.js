const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content_manager',
  ORDER_MANAGER: 'order_manager',
  CUSTOMER: 'customer',
};

const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_EDIT: 'products:edit',
  PRODUCTS_DELETE: 'products:delete',
  CATEGORIES_VIEW: 'categories:view',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_EDIT: 'categories:edit',
  CATEGORIES_DELETE: 'categories:delete',
  ORDERS_VIEW: 'orders:view',
  ORDERS_EDIT: 'orders:edit',
  ORDERS_CANCEL: 'orders:cancel',
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_EDIT: 'customers:edit',
  BANNERS_VIEW: 'banners:view',
  BANNERS_CREATE: 'banners:create',
  BANNERS_EDIT: 'banners:edit',
  BANNERS_DELETE: 'banners:delete',
  NAVIGATION_VIEW: 'navigation:view',
  NAVIGATION_CREATE: 'navigation:create',
  NAVIGATION_EDIT: 'navigation:edit',
  NAVIGATION_DELETE: 'navigation:delete',
  PROMOTIONS_VIEW: 'promotions:view',
  PROMOTIONS_CREATE: 'promotions:create',
  PROMOTIONS_EDIT: 'promotions:edit',
  PROMOTIONS_DELETE: 'promotions:delete',
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_EDIT: 'inventory:edit',
  ANALYTICS_VIEW: 'analytics:view',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  ROLES_VIEW: 'roles:view',
  ROLES_EDIT: 'roles:edit',
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_EDIT, PERMISSIONS.CATEGORIES_DELETE,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_EDIT, PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.BANNERS_VIEW, PERMISSIONS.BANNERS_CREATE, PERMISSIONS.BANNERS_EDIT, PERMISSIONS.BANNERS_DELETE,
    PERMISSIONS.NAVIGATION_VIEW, PERMISSIONS.NAVIGATION_CREATE, PERMISSIONS.NAVIGATION_EDIT, PERMISSIONS.NAVIGATION_DELETE,
    PERMISSIONS.PROMOTIONS_VIEW, PERMISSIONS.PROMOTIONS_CREATE, PERMISSIONS.PROMOTIONS_EDIT, PERMISSIONS.PROMOTIONS_DELETE,
    PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT,
  ],
  [ROLES.CONTENT_MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_EDIT,
    PERMISSIONS.BANNERS_VIEW, PERMISSIONS.BANNERS_CREATE, PERMISSIONS.BANNERS_EDIT, PERMISSIONS.BANNERS_DELETE,
    PERMISSIONS.NAVIGATION_VIEW, PERMISSIONS.NAVIGATION_CREATE, PERMISSIONS.NAVIGATION_EDIT, PERMISSIONS.NAVIGATION_DELETE,
    PERMISSIONS.PROMOTIONS_VIEW, PERMISSIONS.PROMOTIONS_CREATE, PERMISSIONS.PROMOTIONS_EDIT,
    PERMISSIONS.INVENTORY_VIEW,
  ],
  [ROLES.ORDER_MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_EDIT, PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
  ],
  [ROLES.CUSTOMER]: [],
};

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    permissions: [{ type: String, enum: Object.values(PERMISSIONS) }],
    isActive: { type: Boolean, default: true },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    loyaltyPoints: { type: Number, default: 0 },
    address: {
      fullName: String,
      street: String,
      city: String,
      state: String,
      zip: String,
      country: { type: String, default: '' },
      phone: String,
    },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.hasPermission = function (permission) {
  if (this.role === ROLES.SUPER_ADMIN) return true;
  const rolePerms = ROLE_PERMISSIONS[this.role] || [];
  return rolePerms.includes(permission) || this.permissions.includes(permission);
};

userSchema.methods.hasAnyPermission = function (...perms) {
  return perms.some((p) => this.hasPermission(p));
};

userSchema.methods.getEffectivePermissions = function () {
  if (this.role === ROLES.SUPER_ADMIN) return Object.values(PERMISSIONS);
  const rolePerms = ROLE_PERMISSIONS[this.role] || [];
  return [...new Set([...rolePerms, ...this.permissions])];
};

userSchema.methods.isAdminRole = function () {
  return this.role !== ROLES.CUSTOMER;
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('save', function (next) {
  if (this.role !== ROLES.CUSTOMER) {
    this.isAdmin = true;
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES, PERMISSIONS, ROLE_PERMISSIONS };
