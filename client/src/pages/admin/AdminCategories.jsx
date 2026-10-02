import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const INITIAL_FORM = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  image: '',
  parent: '',
  isActive: true,
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ICON_COLORS = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-error-container text-on-error-container',
];

const getIconColor = (name) => {
  if (!name) return ICON_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-fade-up ${
        type === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
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

const ConfirmDialog = ({ open, title, message, extraWarning, onConfirm, onCancel }) => {
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
        <p className="text-sm text-on-surface-variant mb-2">{message}</p>
        {extraWarning && (
          <div className="bg-error-container/20 border border-error/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-lg">info</span>
              <p className="text-xs font-semibold text-error">{extraWarning}</p>
            </div>
          </div>
        )}
        <p className="text-xs text-on-surface-variant/60 font-medium mb-6">
          This action cannot be undone.
        </p>
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

const CategoryFormModal = ({ open, category, categories, onSave, onClose }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        icon: category.icon || '',
        image: category.image || '',
        parent: category.parent?._id || category.parent || '',
        isActive: category.isActive !== false,
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [category, open]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && (!prev.slug || prev.slug === slugify(prev.name))) {
        next.slug = slugify(value);
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    if (!form.slug.trim()) e.slug = 'Slug is required';
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
      errors[field]
        ? 'border-error focus:border-error'
        : 'border-surface-container focus:border-primary'
    } focus:ring-2 focus:ring-primary/20 outline-none transition-all`;

  const parentOptions = categories.filter(
    (c) => !category || (c._id || c.id) !== (category._id || category.id)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-surface-container/60 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-on-surface">
            {category ? 'Edit Category' : 'Add Category'}
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
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass('name')}
              placeholder="e.g. Electronics"
            />
            {errors.name && (
              <p className="text-xs text-error mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Slug *
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              className={inputClass('slug')}
              placeholder="auto-generated-from-name"
            />
            {errors.slug && (
              <p className="text-xs text-error mt-1">{errors.slug}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className={inputClass('description')}
              placeholder="Category description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Icon
              </label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => handleChange('icon', e.target.value)}
                className={inputClass('icon')}
                placeholder="e.g. laptop, phone"
              />
              {form.icon && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(
                      form.icon
                    )}`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {form.icon}
                    </span>
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Preview
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => handleChange('image', e.target.value)}
                className={inputClass('image')}
                placeholder="https://..."
              />
              {form.image && (
                <div className="mt-2 w-full h-20 rounded-lg bg-surface-container overflow-hidden">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Parent Category
            </label>
            <select
              value={form.parent}
              onChange={(e) => handleChange('parent', e.target.value)}
              className={inputClass('parent')}
            >
              <option value="">None (Top-level)</option>
              {parentOptions.map((cat) => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Status
            </label>
            <button
              type="button"
              onClick={() => handleChange('isActive', !form.isActive)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-surface-container-high'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform shadow-sm ${form.isActive ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-medium text-on-surface">
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </button>
          </div>

          <div className="border-t border-surface-container/60 pt-5 flex items-center justify-end gap-3">
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
              {saving
                ? 'Saving...'
                : category
                ? 'Update Category'
                : 'Create Category'}
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
          <div className="w-10 h-10 rounded-full bg-surface-container-high" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-4 w-36 bg-surface-container-high rounded" />
            <div className="h-3 w-48 bg-surface-container-high rounded" />
          </div>
          <div className="h-6 w-20 bg-surface-container-high rounded-full" />
          <div className="h-6 w-16 bg-surface-container-high rounded-full" />
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
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
      category
    </span>
    <p className="text-base font-semibold text-on-surface-variant">
      No categories found
    </p>
    <p className="text-sm text-on-surface-variant/70 mt-1 mb-4">
      You haven't added any categories yet. Create your first category to start
      organizing products.
    </p>
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
    >
      <span className="material-symbols-outlined text-lg">add</span>
      Add your first category
    </button>
  </div>
);

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCategoriesTree();
      const data = Array.isArray(res) ? res : res.categories || res.data || [];
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const showToast = (message, type = 'success') =>
    setToast({ message, type });

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

  const countProducts = (cat) => {
    if (cat.products != null) return cat.products;
    if (cat.productCount != null) return cat.productCount;
    if (cat.children && cat.children.length > 0) {
      return cat.children.reduce(
        (sum, child) => sum + countProducts(child),
        0
      );
    }
    return 0;
  };

  const flatList = categories.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q)
    );
  });

  const tree = buildTree(flatList);

  const getDepth = (catId) => {
    const cat = categories.find((c) => (c._id || c.id) === catId);
    if (!cat) return 0;
    const parentId = cat.parent?._id || cat.parent;
    if (!parentId) return 0;
    return 1 + getDepth(parentId);
  };

  const handleSave = async (payload) => {
    try {
      if (editingCategory) {
        await api.updateCategory(
          editingCategory._id || editingCategory.id,
          payload
        );
        showToast('Category updated successfully');
      } else {
        await api.createCategory(payload);
        showToast('Category created successfully');
      }
      setFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Failed to save category', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCategory(deleteTarget);
      showToast('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  const handleMove = async (catId, direction) => {
    const siblings = categories.filter((c) => {
      const cat = categories.find((x) => (x._id || x.id) === catId);
      const parentA = cat?.parent?._id || cat?.parent;
      const parentB = c.parent?._id || c.parent;
      return parentA === parentB;
    });
    const idx = siblings.findIndex((c) => (c._id || c.id) === catId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const items = siblings.map((c) => ({
      id: c._id || c.id,
      order: c.order || 0,
    }));
    const temp = items[idx].order;
    items[idx].order = items[swapIdx].order;
    items[swapIdx].order = temp;
    try {
      await api.reorderCategories(items);
      fetchCategories();
    } catch {
      showToast('Failed to reorder', 'error');
    }
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setFormOpen(true);
  };

  const openAdd = (parentId = '') => {
    setEditingCategory(null);
    if (parentId) {
      setFormOpen(true);
      setTimeout(() => {
        setEditingCategory({ parent: parentId });
      }, 0);
    } else {
      setFormOpen(true);
    }
  };

  const getDeletedInfo = () => {
    const cat = categories.find((c) => (c._id || c.id) === deleteTarget);
    if (!cat) return { name: 'this category', productCount: 0 };
    const productCount = countProducts(cat);
    return { name: cat.name, productCount };
  };

  const renderTreeNode = (cat, depth = 0) => {
    const id = cat._id || cat.id;
    const productCount = countProducts(cat);
    return (
      <div key={id}>
        <div
          className="flex items-center gap-3 py-3 px-4 border-b border-surface-container/60 hover:bg-surface-container-low/50 transition-colors"
          style={{ paddingLeft: `${16 + depth * 32}px` }}
        >
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleMove(id, 'up')}
              className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
              title="Move up"
            >
              <span className="material-symbols-outlined text-sm">
                keyboard_arrow_up
              </span>
            </button>
            <button
              onClick={() => handleMove(id, 'down')}
              className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
              title="Move down"
            >
              <span className="material-symbols-outlined text-sm">
                keyboard_arrow_down
              </span>
            </button>
          </div>

          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(
              cat.icon || cat.name
            )}`}
          >
            {cat.image ? (
              <div className="w-full h-full rounded-full overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <span className="material-symbols-outlined text-lg">
                {cat.icon || 'category'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">
              {cat.name}
            </p>
            {cat.description && (
              <p className="text-xs text-on-surface-variant truncate">
                {cat.description}
              </p>
            )}
          </div>

          <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full shrink-0">
            {productCount} products
          </span>

          <span
            className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
              cat.isActive !== false
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {cat.isActive !== false ? 'active' : 'inactive'}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => openAdd(id)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
              title="Add subcategory"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
            <button
              onClick={() => openEdit(cat)}
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
        {cat.children &&
          cat.children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <AdminLayout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Are you sure you want to delete "${getDeletedInfo().name}"? Subcategories will also be affected.`}
        extraWarning={
          getDeletedInfo().productCount > 0
            ? `This category has ${getDeletedInfo().productCount} product(s) linked to it. Deleting may orphan these products.`
            : null
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <CategoryFormModal
        open={formOpen}
        category={editingCategory}
        categories={categories}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
      />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Categories
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Organize your products into categories and subcategories.
            </p>
          </div>
          <button
            onClick={() => openAdd()}
            className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Category
          </button>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button
              onClick={fetchCategories}
              className="text-sm font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl shadow-sm">
          <div className="p-4 border-b border-surface-container/60">
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
              />
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : tree.length === 0 ? (
            <EmptyState onAdd={() => openAdd()} />
          ) : (
            <div>
              {tree.map((cat) => renderTreeNode(cat, 0))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
