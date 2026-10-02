import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const POSITIONS = ['header', 'footer', 'mobile'];

const INITIAL_FORM = {
  label: '',
  url: '',
  parent: '',
  position: 'header',
  isExternal: false,
  openInNewTab: false,
  icon: '',
  isActive: true,
  order: 0,
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-fade-up ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
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

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const NavFormPanel = ({ open, navItem, navItems, onSave, onClose }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (navItem) {
      setForm({
        label: navItem.label || '',
        url: navItem.url || '',
        parent: navItem.parent?._id || navItem.parent || '',
        position: navItem.position || 'header',
        isExternal: navItem.isExternal || false,
        openInNewTab: navItem.openInNewTab || false,
        icon: navItem.icon || '',
        isActive: navItem.isActive !== false,
        order: navItem.order || 0,
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [navItem, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = 'Label is required';
    if (!form.url.trim()) e.url = 'URL is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        parent: form.parent || undefined,
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface border ${
      errors[field] ? 'border-error focus:border-error' : 'border-surface-container focus:border-primary'
    } focus:ring-2 focus:ring-primary/20 outline-none transition-all`;

  const parentOptions = navItems.filter(
    (n) => !navItem || (n._id || n.id) !== (navItem._id || navItem.id)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-surface-container px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-on-surface">
            {navItem ? 'Edit Navigation Item' : 'Add Navigation Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Label *</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => handleChange('label', e.target.value)}
              className={inputClass('label')}
              placeholder="e.g. Shop"
            />
            {errors.label && <p className="text-xs text-error mt-1">{errors.label}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">URL *</label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => handleChange('url', e.target.value)}
              className={inputClass('url')}
              placeholder="/shop or https://..."
            />
            {errors.url && <p className="text-xs text-error mt-1">{errors.url}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Icon</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              className={inputClass('icon')}
              placeholder="Material icon name (e.g. store)"
            />
            {form.icon && (
              <div className="mt-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">{form.icon}</span>
                </span>
                <span className="text-xs text-on-surface-variant">Preview</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Parent Item</label>
              <select
                value={form.parent}
                onChange={(e) => handleChange('parent', e.target.value)}
                className={inputClass('parent')}
              >
                <option value="">None (Top-level)</option>
                {parentOptions.map((item) => (
                  <option key={item._id || item.id} value={item._id || item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Position</label>
              <select
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                className={inputClass('position')}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isExternal}
                onChange={(e) => handleChange('isExternal', e.target.checked)}
                className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20"
              />
              <span className="text-sm font-semibold text-on-surface">External Link</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.openInNewTab}
                onChange={(e) => handleChange('openInNewTab', e.target.checked)}
                className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20"
              />
              <span className="text-sm font-semibold text-on-surface">Open in New Tab</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm font-semibold text-on-surface">
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="border-t border-surface-container pt-5 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : navItem ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="p-6">
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-7 h-7 rounded bg-surface-container-high" />
            <div className="w-7 h-7 rounded bg-surface-container-high" />
          </div>
          {i > 0 && <div className="w-4 h-4 bg-surface-container-high rounded" style={{ marginLeft: `${i * 24}px` }} />}
          <div className="w-6 h-6 rounded bg-surface-container-high" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-4 w-32 bg-surface-container-high rounded" />
            <div className="h-3 w-48 bg-surface-container-high rounded" />
          </div>
          <div className="h-6 w-16 bg-surface-container-high rounded-full" />
          <div className="h-6 w-16 bg-surface-container-high rounded-full" />
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
            <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
      menu
    </span>
    <p className="text-base font-semibold text-on-surface-variant">No navigation items found</p>
    <p className="text-sm text-on-surface-variant/70 mt-1 mb-4">
      Create navigation items to organize your site menus and links.
    </p>
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
    >
      <span className="material-symbols-outlined text-lg">add</span>
      Add your first navigation item
    </button>
  </div>
);

const POSITION_COLORS = {
  header: 'bg-blue-100 text-blue-800',
  footer: 'bg-violet-100 text-violet-800',
  mobile: 'bg-amber-100 text-amber-800',
};

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-gray-100 text-gray-700',
};

const AdminNavigation = () => {
  const [navItems, setNavItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchNavItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getNavigation();
      const data = Array.isArray(res) ? res : res.navigation || res.data || [];
      setNavItems(data);
    } catch (err) {
      setError(err.message || 'Failed to load navigation items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNavItems();
  }, [fetchNavItems]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const buildTree = (items) => {
    const map = {};
    const roots = [];
    items.forEach((item) => {
      const id = item._id || item.id;
      map[id] = { ...item, children: [] };
    });
    items.forEach((item) => {
      const id = item._id || item.id;
      const parentId = item.parent?._id || item.parent;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[id]);
      } else {
        roots.push(map[id]);
      }
    });
    return roots;
  };

  const filtered = navItems.filter((n) => {
    if (search && !n.label?.toLowerCase().includes(search.toLowerCase()) && !n.url?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPosition && n.position !== filterPosition) return false;
    return true;
  });

  const tree = buildTree(filtered);

  const getDepth = (itemId) => {
    const item = navItems.find((n) => (n._id || n.id) === itemId);
    if (!item) return 0;
    const parentId = item.parent?._id || item.parent;
    if (!parentId) return 0;
    return 1 + getDepth(parentId);
  };

  const handleSave = async (payload) => {
    try {
      if (editingItem) {
        await api.updateNavigation(editingItem._id || editingItem.id, payload);
        showToast('Navigation item updated successfully');
      } else {
        await api.createNavigation(payload);
        showToast('Navigation item created successfully');
      }
      setFormOpen(false);
      setEditingItem(null);
      fetchNavItems();
    } catch (err) {
      showToast(err.message || 'Failed to save navigation item', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteNavigation(deleteTarget);
      showToast('Navigation item deleted');
      setDeleteTarget(null);
      fetchNavItems();
    } catch {
      showToast('Failed to delete navigation item', 'error');
    }
  };

  const handleMove = async (itemId, direction) => {
    const item = navItems.find((n) => (n._id || n.id) === itemId);
    if (!item) return;
    const siblings = navItems.filter((n) => {
      const parentA = item.parent?._id || item.parent;
      const parentB = n.parent?._id || n.parent;
      const posA = n.position || 'header';
      const posB = item.position || 'header';
      return parentA === parentB && posA === posB;
    });
    const idx = siblings.findIndex((n) => (n._id || n.id) === itemId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const items = siblings.map((n) => ({ id: n._id || n.id, order: n.order || 0 }));
    const temp = items[idx].order;
    items[idx].order = items[swapIdx].order;
    items[swapIdx].order = temp;
    try {
      await api.reorderNavigation(items);
      fetchNavItems();
    } catch {
      showToast('Failed to reorder', 'error');
    }
  };

  const positionCounts = {
    all: filtered.length,
    header: filtered.filter((n) => n.position === 'header').length,
    footer: filtered.filter((n) => n.position === 'footer').length,
    mobile: filtered.filter((n) => n.position === 'mobile').length,
  };

  const renderTreeItem = (item, depth = 0) => {
    const id = item._id || item.id;
    const isActive = item.isActive !== false;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={id}>
        <div
          className="flex items-center gap-3 py-3 px-4 border-b border-surface-container hover:bg-surface-container-low/50 transition-colors group"
          style={{ paddingLeft: `${16 + depth * 32}px` }}
        >
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleMove(id, 'up')}
              className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors opacity-0 group-hover:opacity-100"
              title="Move up"
            >
              <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
            </button>
            <button
              onClick={() => handleMove(id, 'down')}
              className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors opacity-0 group-hover:opacity-100"
              title="Move down"
            >
              <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
            </button>
          </div>

          {depth > 0 && (
            <div className="flex items-center shrink-0" style={{ width: '16px' }}>
              <div className="w-3 h-px bg-outline-variant" />
              <span className="material-symbols-outlined text-[10px] text-outline-variant -ml-0.5">chevron_right</span>
            </div>
          )}

          {item.icon && (
            <span className="material-symbols-outlined text-primary text-lg shrink-0">{item.icon}</span>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{item.label}</p>
            <p className="text-xs text-on-surface-variant font-mono truncate">{item.url}</p>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
              POSITION_COLORS[item.position] || 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {item.position || 'header'}
          </span>

          <span
            className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
              isActive ? STATUS_COLORS.active : STATUS_COLORS.inactive
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>

          {item.isExternal && (
            <span className="material-symbols-outlined text-on-surface-variant text-sm shrink-0">open_in_new</span>
          )}
          {item.openInNewTab && (
            <span className="material-symbols-outlined text-on-surface-variant text-sm shrink-0">tab</span>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setEditingItem(item);
                setFormOpen(true);
              }}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-primary-container/30 hover:text-primary transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() => setDeleteTarget(id)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>
        {hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Navigation Item"
        message="Are you sure you want to delete this navigation item? Child items will also be affected."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <NavFormPanel
        open={formOpen}
        navItem={editingItem}
        navItems={navItems}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
      />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Navigation
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Manage your site navigation menus and links.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Navigation Item
          </button>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={fetchNavItems} className="text-sm font-semibold hover:underline">
              Retry
            </button>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl shadow-sm">
          <div className="p-4 border-b border-surface-container space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search navigation items..."
                  className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterPosition('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterPosition === ''
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                All ({positionCounts.all})
              </button>
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setFilterPosition(filterPosition === pos ? '' : pos)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    filterPosition === pos
                      ? `${POSITION_COLORS[pos]}`
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)} ({positionCounts[pos] || 0})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : tree.length === 0 && (search || filterPosition) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
                search_off
              </span>
              <p className="text-base font-semibold text-on-surface-variant">No navigation items found</p>
              <p className="text-sm text-on-surface-variant/70 mt-1">
                No items match your current filters. Try adjusting your search or filters.
              </p>
            </div>
          ) : navItems.length === 0 ? (
            <EmptyState
              onAdd={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
            />
          ) : (
            <div>
              {tree.map((item) => renderTreeItem(item, 0))}
            </div>
          )}
        </div>

        <div className="text-xs text-on-surface-variant/60 text-right">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''} total
          {filterPosition && ` · filtered by ${filterPosition}`}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNavigation;
