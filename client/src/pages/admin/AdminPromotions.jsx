import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const PROMO_TYPES = ['percentage', 'fixed', 'free_shipping'];

const INITIAL_FORM = {
  name: '',
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  maxPerUser: 0,
  applicableCategories: [],
  startDate: '',
  endDate: '',
  isActive: true,
  showInSidebar: false,
  sidebarTitle: 'Special Offer',
  sidebarSubtitle: '',
  sidebarButtonText: 'Shop Now',
  sidebarBgColor: '#a43c12',
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

const PromoFormPanel = ({ open, promotion, categories, onSave, onClose }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (promotion) {
      setForm({
        name: promotion.name || '',
        code: promotion.code || '',
        description: promotion.description || '',
        type: promotion.type || 'percentage',
        value: promotion.value ?? '',
        minPurchase: promotion.minPurchase ?? '',
        maxDiscount: promotion.maxDiscount ?? '',
        usageLimit: promotion.usageLimit ?? '',
        maxPerUser: promotion.maxPerUser ?? 0,
        applicableCategories: promotion.applicableCategories?.map((c) => c._id || c) || [],
        startDate: promotion.startDate ? promotion.startDate.slice(0, 10) : '',
        endDate: promotion.endDate ? promotion.endDate.slice(0, 10) : '',
        isActive: promotion.isActive !== false,
        showInSidebar: promotion.showInSidebar ?? false,
        sidebarTitle: promotion.sidebarTitle || 'Special Offer',
        sidebarSubtitle: promotion.sidebarSubtitle || '',
        sidebarButtonText: promotion.sidebarButtonText || 'Shop Now',
        sidebarBgColor: promotion.sidebarBgColor || '#a43c12',
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [promotion, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCategoryToggle = (catId) => {
    setForm((prev) => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(catId)
        ? prev.applicableCategories.filter((c) => c !== catId)
        : [...prev.applicableCategories, catId],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.code.trim()) e.code = 'Code is required';
    if (!form.type) e.type = 'Type is required';
    if (form.type !== 'free_shipping' && (!form.value || Number(form.value) <= 0)) e.value = 'Valid value is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: form.type === 'free_shipping' ? 0 : Number(form.value),
        minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        maxPerUser: form.maxPerUser ? Number(form.maxPerUser) : 0,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-surface-container px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-on-surface">
            {promotion ? 'Edit Promotion' : 'Add Promotion'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass('name')}
                placeholder="e.g. Summer Sale"
              />
              {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                className={`${inputClass('code')} font-mono`}
                placeholder="SUMMER20"
              />
              {errors.code && <p className="text-xs text-error mt-1">{errors.code}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className={inputClass('description')}
              placeholder="Promotion description..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Type *</label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className={inputClass('type')}
              >
                {PROMO_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'percentage'
                      ? 'Percentage Discount'
                      : t === 'fixed'
                      ? 'Fixed Amount'
                      : 'Free Shipping'}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-error mt-1">{errors.type}</p>}
            </div>
            {form.type !== 'free_shipping' && (
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">
                  Value * {form.type === 'percentage' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => handleChange('value', e.target.value)}
                  className={inputClass('value')}
                  placeholder={form.type === 'percentage' ? '20' : '10.00'}
                />
                {errors.value && <p className="text-xs text-error mt-1">{errors.value}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Min Purchase ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minPurchase}
                onChange={(e) => handleChange('minPurchase', e.target.value)}
                className={inputClass('minPurchase')}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Max Discount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.maxDiscount}
                onChange={(e) => handleChange('maxDiscount', e.target.value)}
                className={inputClass('maxDiscount')}
                placeholder="No limit"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Usage Limit</label>
              <input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(e) => handleChange('usageLimit', e.target.value)}
                className={inputClass('usageLimit')}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Per-User Limit</label>
              <input
                type="number"
                min="0"
                value={form.maxPerUser || 0}
                onChange={(e) => handleChange('maxPerUser', e.target.value)}
                className={inputClass('maxPerUser')}
                placeholder="0 = Unlimited per user"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={inputClass('startDate')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className={inputClass('endDate')}
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Applicable Categories
              </label>
              <p className="text-xs text-on-surface-variant mb-2">Leave empty to apply to all categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const catId = cat._id || cat.id;
                  const isSelected = form.applicableCategories.includes(catId);
                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => handleCategoryToggle(catId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:border-primary'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Sidebar Promo Settings */}
          <div className="border-t border-surface-container pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInSidebar}
                  onChange={(e) => handleChange('showInSidebar', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <div>
                <span className="text-sm font-semibold text-on-surface block">Show in Sidebar</span>
                <span className="text-[11px] text-on-surface-variant/50">Display this promotion in the category sidebar on shop pages</span>
              </div>
            </div>

            {form.showInSidebar && (
              <div className="bg-surface-container-low rounded-xl p-4 space-y-3 ml-2 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Title</label>
                    <input
                      type="text"
                      value={form.sidebarTitle}
                      onChange={(e) => handleChange('sidebarTitle', e.target.value)}
                      className={inputClass('sidebarTitle')}
                      placeholder="Special Offer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Button Text</label>
                    <input
                      type="text"
                      value={form.sidebarButtonText}
                      onChange={(e) => handleChange('sidebarButtonText', e.target.value)}
                      className={inputClass('sidebarButtonText')}
                      placeholder="Shop Now"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.sidebarSubtitle}
                    onChange={(e) => handleChange('sidebarSubtitle', e.target.value)}
                    className={inputClass('sidebarSubtitle')}
                    placeholder="Auto-generated from discount value if empty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.sidebarBgColor}
                      onChange={(e) => handleChange('sidebarBgColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-surface-container cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.sidebarBgColor}
                      onChange={(e) => handleChange('sidebarBgColor', e.target.value)}
                      className={inputClass('sidebarBgColor')}
                      placeholder="#a43c12"
                    />
                  </div>
                </div>
                {/* Preview */}
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider mb-2">Preview</p>
                  <div
                    className="rounded-lg p-3 text-center max-w-[200px]"
                    style={{ backgroundColor: form.sidebarBgColor || '#a43c12' }}
                  >
                    <p className="text-white text-[11px] font-bold uppercase tracking-wide mb-0.5">
                      {form.sidebarTitle || 'Special Offer'}
                    </p>
                    <p className="text-white/90 text-lg font-bold">
                      {form.type === 'percentage' ? `${form.value || 0}% OFF` : form.type === 'fixed' ? `$${form.value || 0} OFF` : form.sidebarSubtitle || 'OFFER'}
                    </p>
                    <p className="text-white/70 text-[11px] mb-2">
                      Code: {form.code || 'CODE'}
                    </p>
                    <div className="w-full bg-white text-[12px] font-bold py-1.5 rounded text-center" style={{ color: form.sidebarBgColor || '#a43c12' }}>
                      {form.sidebarButtonText || 'Shop Now'}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              {saving ? 'Saving...' : promotion ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="p-6">
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-7 w-24 bg-surface-container-high rounded font-mono" />
          <div className="h-4 w-32 bg-surface-container-high rounded" />
          <div className="h-6 w-20 bg-surface-container-high rounded-full" />
          <div className="h-4 w-16 bg-surface-container-high rounded" />
          <div className="flex-1">
            <div className="h-2 w-full bg-surface-container-high rounded-full" />
          </div>
          <div className="h-4 w-28 bg-surface-container-high rounded" />
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
      local_offer
    </span>
    <p className="text-base font-semibold text-on-surface-variant">No promotions found</p>
    <p className="text-sm text-on-surface-variant/70 mt-1 mb-4">
      Create discount codes and promotional offers to attract customers.
    </p>
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
    >
      <span className="material-symbols-outlined text-lg">add</span>
      Create your first promotion
    </button>
  </div>
);

const TYPE_CONFIG = {
  percentage: {
    label: '% Off',
    badgeClass: 'bg-blue-100 text-blue-800',
    color: 'blue',
  },
  fixed: {
    label: '$ Off',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    color: 'green',
  },
  free_shipping: {
    label: 'Free Ship',
    badgeClass: 'bg-teal-100 text-teal-800',
    color: 'teal',
  },
};

const STATUS_CONFIG = {
  active: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-100 text-gray-700',
  upcoming: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-100 text-gray-600',
};

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPromotions();
      const data = Array.isArray(res) ? res : res.promotions || res.data || [];
      setPromotions(data);
    } catch (err) {
      setError(err.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.getCategoriesTree();
      const data = Array.isArray(res) ? res : res.categories || res.data || [];
      setCategories(data);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchCategories();
  }, [fetchPromotions, fetchCategories]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPromoStatus = (promo) => {
    if (promo.isActive === false) return 'inactive';
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) return 'upcoming';
    if (promo.endDate && new Date(promo.endDate) < now) return 'expired';
    return 'active';
  };

  const filtered = promotions.filter((p) => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.code?.toLowerCase().includes(search.toLowerCase())) return false;
    const status = getPromoStatus(p);
    if (filterStatus && status !== filterStatus) return false;
    return true;
  });

  const statusCounts = {
    all: promotions.length,
    active: promotions.filter((p) => getPromoStatus(p) === 'active').length,
    upcoming: promotions.filter((p) => getPromoStatus(p) === 'upcoming').length,
    expired: promotions.filter((p) => getPromoStatus(p) === 'expired').length,
    inactive: promotions.filter((p) => getPromoStatus(p) === 'inactive').length,
  };

  const handleSave = async (payload) => {
    try {
      if (editingPromo) {
        await api.updatePromotion(editingPromo._id || editingPromo.id, payload);
        showToast('Promotion updated successfully');
      } else {
        await api.createPromotion(payload);
        showToast('Promotion created successfully');
      }
      setFormOpen(false);
      setEditingPromo(null);
      fetchPromotions();
    } catch (err) {
      showToast(err.message || 'Failed to save promotion', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePromotion(deleteTarget);
      showToast('Promotion deleted');
      setDeleteTarget(null);
      fetchPromotions();
    } catch {
      showToast('Failed to delete promotion', 'error');
    }
  };

  const renderUsageBar = (promo) => {
    const used = promo.usedCount || promo.used || 0;
    const limit = promo.usageLimit || promo.usage_limit || 0;
    const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

    return (
      <div className="min-w-[100px]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-bold text-on-surface">{used}</span>
          <span className="text-sm text-on-surface-variant">/</span>
          <span className="text-sm text-on-surface-variant">{limit > 0 ? limit : '∞'}</span>
        </div>
        {limit > 0 && (
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 90 ? 'bg-error' : percentage >= 70 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <PromoFormPanel
        open={formOpen}
        promotion={editingPromo}
        categories={categories}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingPromo(null);
        }}
      />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Promotions
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Create and manage discount codes and promotional offers.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPromo(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Promotion
          </button>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={fetchPromotions} className="text-sm font-semibold hover:underline">
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
                  placeholder="Search promotions by name or code..."
                  className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterStatus('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterStatus === ''
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                All ({statusCounts.all})
              </button>
              {['active', 'upcoming', 'expired', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap capitalize ${
                    filterStatus === status
                      ? STATUS_CONFIG[status]
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {status} ({statusCounts[status] || 0})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 && (search || filterStatus) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
                search_off
              </span>
              <p className="text-base font-semibold text-on-surface-variant">No promotions found</p>
              <p className="text-sm text-on-surface-variant/70 mt-1">
                No promotions match your current filters. Try adjusting your search or filters.
              </p>
            </div>
          ) : promotions.length === 0 ? (
            <EmptyState
              onAdd={() => {
                setEditingPromo(null);
                setFormOpen(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead>
                  <tr className="border-b border-surface-container">
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Code
                    </th>
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Name
                    </th>
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Type
                    </th>
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Value
                    </th>
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="pb-3 px-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((promo) => {
                    const id = promo._id || promo.id;
                    const status = getPromoStatus(promo);
                    const typeConfig = TYPE_CONFIG[promo.type] || TYPE_CONFIG.percentage;
                    return (
                      <tr
                        key={id}
                        className="border-b border-surface-container last:border-0 hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="text-sm font-mono font-bold text-primary bg-primary-container/20 px-2.5 py-1 rounded-md uppercase tracking-wide">
                            {promo.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-sm font-semibold text-on-surface">{promo.name}</p>
                          {promo.description && (
                            <p className="text-xs text-on-surface-variant truncate max-w-[180px] mt-0.5">
                              {promo.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeConfig.badgeClass}`}>
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm font-bold text-on-surface">
                            {promo.type === 'percentage'
                              ? `${promo.value}%`
                              : promo.type === 'fixed'
                              ? `$${(promo.value || 0).toFixed(2)}`
                              : promo.type === 'free_shipping'
                              ? 'Free'
                              : promo.value}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {renderUsageBar(promo)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-on-surface-variant">
                          {promo.startDate || promo.endDate ? (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <span>
                                {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">all_inclusive</span>
                              No limit
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                              STATUS_CONFIG[status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingPromo(promo);
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && promotions.length > 0 && (
          <div className="text-xs text-on-surface-variant/60 text-right">
            {filtered.length} promotion{filtered.length !== 1 ? 's' : ''} total
            {filterStatus && ` · filtered by ${filterStatus}`}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPromotions;
