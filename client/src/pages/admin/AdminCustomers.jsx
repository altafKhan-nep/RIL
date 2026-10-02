import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const ROLE_STYLES = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  content_manager: 'bg-teal-100 text-teal-800',
  order_manager: 'bg-amber-100 text-amber-800',
  customer: 'bg-gray-100 text-gray-700',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  content_manager: 'Content Manager',
  order_manager: 'Order Manager',
  customer: 'Customer',
};

const ALL_ROLES = ['super_admin', 'admin', 'content_manager', 'order_manager', 'customer'];

const PERMISSIONS = [
  'manage_products',
  'manage_orders',
  'manage_users',
  'manage_promotions',
  'manage_content',
  'view_analytics',
  'manage_settings',
];

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;

const hashName = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
];

const getAvatarColor = (name) => AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white';

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-fade-up ${colors}`}
    >
      <span className="material-symbols-outlined text-lg">
        {type === 'success' ? 'check_circle' : 'error'}
      </span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
};

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-error">warning</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-error text-white hover:bg-error/90 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerProfilePanel = ({ customer, onClose, recentOrders, totalSpent }) => {
  if (!customer) return null;

  const address = customer.address || {};
  const role = customer.role || 'customer';
  const permissions = customer.permissions || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-surface-container px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-on-surface">Customer Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <span
              className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getAvatarColor(
                customer.name
              )}`}
            >
              {getInitials(customer.name)}
            </span>
            <div>
              <h3 className="text-lg font-bold text-on-surface">{customer.name}</h3>
              <p className="text-sm text-on-surface-variant">{customer.email}</p>
              {customer.phone && (
                <p className="text-sm text-on-surface-variant">{customer.phone}</p>
              )}
              <span
                className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                  ROLE_STYLES[role] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {ROLE_LABELS[role] || role}
              </span>
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
              Role & Permissions
            </h4>
            <div>
              <p className="text-sm font-semibold text-on-surface mb-2">
                {ROLE_LABELS[role] || role}
              </p>
              {permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-container/40 text-on-primary-container"
                    >
                      {perm.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">Default permissions for this role</p>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
              Account Info
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-on-surface-variant">Joined</p>
                <p className="text-sm font-semibold text-on-surface">
                  {formatDate(customer.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Last Login</p>
                <p className="text-sm font-semibold text-on-surface">
                  {customer.lastLogin ? formatDateTime(customer.lastLogin) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Login Count</p>
                <p className="text-sm font-semibold text-on-surface">
                  {customer.loginCount || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Status</p>
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                    customer.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
              Address
            </h4>
            {address.street || address.city || address.country ? (
              <div className="space-y-1">
                {address.fullName && (
                  <p className="text-sm text-on-surface">{address.fullName}</p>
                )}
                {address.street && (
                  <p className="text-sm text-on-surface">{address.street}</p>
                )}
                {(address.city || address.postalCode) && (
                  <p className="text-sm text-on-surface">
                    {[address.city, address.postalCode].filter(Boolean).join(', ')}
                  </p>
                )}
                {address.country && (
                  <p className="text-sm text-on-surface">{address.country}</p>
                )}
                {address.phone && (
                  <p className="text-sm text-on-surface-variant mt-1">
                    Phone: {address.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No address on file</p>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
              Recent Orders
            </h4>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order._id || order.id}
                    className="flex items-center gap-3 bg-surface-container-lowest rounded-lg p-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-primary-container text-lg">
                        receipt_long
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        #{(order._id || order.id || '').slice(0, 8)}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(order.totalPrice)}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No orders yet</p>
            )}
          </div>

          {/* Spending Summary */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
              Spending Summary
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-lowest rounded-lg p-3 text-center">
                <p className="text-xs text-on-surface-variant">Total Spent</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-surface-container-lowest rounded-lg p-3 text-center">
                <p className="text-xs text-on-surface-variant">Orders</p>
                <p className="text-lg font-bold text-on-surface">{recentOrders.length}</p>
              </div>
            </div>
            {customer.loyaltyPoints !== undefined && (
              <div className="bg-surface-container-lowest rounded-lg p-3 text-center">
                <p className="text-xs text-on-surface-variant">Loyalty Points</p>
                <p className="text-lg font-bold text-on-surface">
                  {customer.loyaltyPoints || 0}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditRoleModal = ({ open, customer, onSave, onClose }) => {
  const [role, setRole] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setRole(customer.role || 'customer');
      setPermissions(customer.permissions || []);
    }
  }, [customer, open]);

  const togglePermission = (perm) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(customer._id || customer.id, { role, permissions });
    } finally {
      setSaving(false);
    }
  };

  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-on-surface">Edit Role</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-on-surface mb-1">{customer.name}</p>
            <p className="text-xs text-on-surface-variant">{customer.email}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface border border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] || r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">
              Custom Permissions
            </label>
            <div className="space-y-2">
              {PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-on-surface">
                    {perm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-surface-container">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAllUsers();
      const data = Array.isArray(res) ? res : res.users || res.data || [];
      setCustomers(data);
    } catch (err) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const totalActive = customers.filter((c) => c.isActive !== false).length;
  const totalAdmins = customers.filter((c) =>
    ['super_admin', 'admin', 'content_manager', 'order_manager'].includes(c.role)
  ).length;
  const now = new Date();
  const newThisMonth = customers.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filtered = customers.filter((c) => {
    if (roleFilter && c.role !== roleFilter) return false;
    if (statusFilter === 'active' && c.isActive === false) return false;
    if (statusFilter === 'disabled' && c.isActive !== false) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;
    if (sortField === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
    } else if (sortField === 'totalSpent') {
      valA = a.totalSpent || 0;
      valB = b.totalSpent || 0;
    } else {
      valA = new Date(a.createdAt || 0).getTime();
      valB = new Date(b.createdAt || 0).getTime();
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <span className="material-symbols-outlined text-sm opacity-30">unfold_more</span>;
    return (
      <span className="material-symbols-outlined text-sm text-primary">
        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    );
  };

  const SortableHeader = ({ field, label, className = '' }) => (
    <th
      className={`pb-3 px-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-on-surface transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  const openProfile = (customer) => {
    setSelectedCustomer(customer);
    setPanelOpen(true);
  };

  const openEditRole = (customer) => {
    setEditTarget(customer);
    setEditRoleOpen(true);
  };

  const handleSaveRole = async (id, data) => {
    try {
      await api.updateUser(id, data);
      setCustomers((prev) =>
        prev.map((c) => {
          if ((c._id || c.id) === id) {
            return { ...c, role: data.role, permissions: data.permissions };
          }
          return c;
        })
      );
      setSelectedCustomer((prev) => {
        if (prev && (prev._id || prev.id) === id) {
          return { ...prev, role: data.role, permissions: data.permissions };
        }
        return prev;
      });
      setEditRoleOpen(false);
      setEditTarget(null);
      showToast('Role updated successfully');
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  const handleToggleDisable = async () => {
    if (!disableTarget) return;
    const id = disableTarget._id || disableTarget.id;
    const newActive = disableTarget.isActive === false;
    try {
      await api.updateUser(id, { isActive: newActive });
      setCustomers((prev) =>
        prev.map((c) => {
          if ((c._id || c.id) === id) {
            return { ...c, isActive: newActive };
          }
          return c;
        })
      );
      setSelectedCustomer((prev) => {
        if (prev && (prev._id || prev.id) === id) {
          return { ...prev, isActive: newActive };
        }
        return prev;
      });
      showToast(newActive ? 'Customer enabled' : 'Customer disabled');
      setDisableTarget(null);
    } catch {
      showToast('Failed to update customer status', 'error');
    }
  };

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={!!disableTarget}
        title={disableTarget?.isActive !== false ? 'Disable Customer' : 'Enable Customer'}
        message={
          disableTarget?.isActive !== false
            ? `Are you sure you want to disable "${disableTarget?.name}"? This will prevent them from logging in and placing orders.`
            : `Are you sure you want to enable "${disableTarget?.name}"? They will regain full access to their account.`
        }
        confirmLabel={disableTarget?.isActive !== false ? 'Disable' : 'Enable'}
        onConfirm={handleToggleDisable}
        onCancel={() => setDisableTarget(null)}
      />

      <EditRoleModal
        open={editRoleOpen}
        customer={editTarget}
        onSave={handleSaveRole}
        onClose={() => {
          setEditRoleOpen(false);
          setEditTarget(null);
        }}
      />

      <CustomerProfilePanel
        customer={panelOpen ? selectedCustomer : null}
        onClose={() => {
          setPanelOpen(false);
          setSelectedCustomer(null);
        }}
        recentOrders={selectedCustomer?.recentOrders || []}
        totalSpent={selectedCustomer?.totalSpent || 0}
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Customers
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Manage customer accounts, roles, and access.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={fetchCustomers} className="text-sm font-semibold hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Customers', value: customers.length, icon: 'people', color: 'bg-primary-container/30 text-on-primary-container' },
            { label: 'Active', value: totalActive, icon: 'check_circle', color: 'bg-emerald-100 text-emerald-800' },
            { label: 'Admins', value: totalAdmins, icon: 'admin_panel_settings', color: 'bg-blue-100 text-blue-800' },
            { label: 'New This Month', value: newThisMonth, icon: 'person_add', color: 'bg-amber-100 text-amber-800' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface-variant">{stat.label}</span>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                </span>
              </div>
              <p className="text-2xl font-bold text-on-surface mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm">
          <div className="p-4 border-b border-surface-container flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            >
              <option value="">All Roles</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] || r}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high" />
                    <div className="h-4 w-32 bg-surface-container-high rounded" />
                    <div className="h-4 w-24 bg-surface-container-high rounded" />
                    <div className="h-4 w-20 bg-surface-container-high rounded" />
                    <div className="h-4 w-16 bg-surface-container-high rounded" />
                    <div className="h-4 w-20 bg-surface-container-high rounded" />
                    <div className="h-6 w-20 bg-surface-container-high rounded-full" />
                    <div className="h-4 w-24 bg-surface-container-high rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
                people
              </span>
              <p className="text-base font-semibold text-on-surface-variant">No customers found</p>
              <p className="text-sm text-on-surface-variant/70 mt-1">
                {customers.length === 0
                  ? 'No customers have registered yet.'
                  : 'No customers match your current filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-surface-container">
                      <SortableHeader field="name" label="Customer" />
                      <th className="pb-3 px-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Role
                      </th>
                      <SortableHeader field="createdAt" label="Joined" />
                      <th className="pb-3 px-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Orders
                      </th>
                      <SortableHeader field="totalSpent" label="Total Spent" />
                      <th className="pb-3 px-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Status
                      </th>
                      <th className="pb-3 px-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider w-36">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((customer) => {
                      const id = customer._id || customer.id || '';
                      const role = customer.role || 'customer';
                      return (
                        <tr
                          key={id}
                          className="border-b border-surface-container last:border-0 hover:bg-surface-container-low/50 transition-colors"
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(
                                  customer.name
                                )}`}
                              >
                                {getInitials(customer.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface truncate max-w-[180px]">
                                  {customer.name}
                                </p>
                                <p className="text-xs text-on-surface-variant truncate max-w-[180px]">
                                  {customer.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                ROLE_STYLES[role] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {ROLE_LABELS[role] || role}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-sm text-on-surface-variant">
                            {formatDate(customer.createdAt)}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-sm font-bold text-on-surface">
                              {customer.ordersCount ?? customer.orderCount ?? 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-sm font-bold text-primary">
                              {formatCurrency(customer.totalSpent)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                                customer.isActive === false
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {customer.isActive === false ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openProfile(customer)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-primary-container/30 hover:text-primary transition-colors"
                                title="View Profile"
                              >
                                <span className="material-symbols-outlined text-lg">person</span>
                              </button>
                              <button
                                onClick={() => openEditRole(customer)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                title="Edit Role"
                              >
                                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                              </button>
                              <button
                                onClick={() => setDisableTarget(customer)}
                                className={`p-1.5 rounded-lg text-on-surface-variant transition-colors ${
                                  customer.isActive === false
                                    ? 'hover:bg-emerald-100 hover:text-emerald-800'
                                    : 'hover:bg-error-container/30 hover:text-error'
                                }`}
                                title={customer.isActive === false ? 'Enable' : 'Disable'}
                              >
                                <span className="material-symbols-outlined text-lg">
                                  {customer.isActive === false ? 'enable' : 'disable'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-surface-container">
                  <span className="text-xs text-on-surface-variant">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of{' '}
                    {sorted.length} customers
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === '...' ? (
                          <span key={`dots-${idx}`} className="px-1 text-on-surface-variant">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                              page === p
                                ? 'bg-primary text-on-primary'
                                : 'text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
