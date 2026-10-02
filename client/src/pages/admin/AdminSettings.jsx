import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg animate-fade-up ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <span className="material-symbols-outlined text-lg">{type === 'success' ? 'check_circle' : 'error'}</span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70"><span className="material-symbols-outlined text-lg">close</span></button>
    </div>
  );
};

const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />
);

const Toggle = ({ label, checked, onChange, description }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1 mr-4">
      <p className="text-sm font-semibold text-on-surface">{label}</p>
      {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-surface-container-high'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const Tabs = [
  { id: 'store', label: 'Store', icon: 'store' },
  { id: 'payment', label: 'Payment', icon: 'credit_card' },
  { id: 'shipping', label: 'Shipping', icon: 'local_shipping' },
  { id: 'tax', label: 'Tax', icon: 'receipt' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'seo', label: 'SEO', icon: 'search' },
];

const inputClass = 'w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface border border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all';
const selectClass = 'w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-sm text-on-surface border border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer';

const AdminSettings = () => {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('store');
  const [errors, setErrors] = useState({});

  const set = (section, field, value) => {
    setForm((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [field]: value } }));
    setErrors((prev) => ({ ...prev, [`${section}.${field}`]: '' }));
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setForm({
        store: res?.store || {},
        payment: res?.payment || {},
        shipping: res?.shipping || {},
        tax: res?.tax || {},
        notifications: res?.notifications || {},
        security: res?.security || {},
        seo: res?.seo || {},
      });
    } catch {
      setToast({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const validate = (section) => {
    const e = {};
    const s = form[section] || {};
    if (section === 'store') {
      if (!s.name?.trim()) e['store.name'] = 'Store name is required';
      if (s.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contactEmail)) e['store.contactEmail'] = 'Invalid email format';
    }
    if (section === 'shipping') {
      if (s.freeShippingThreshold && Number(s.freeShippingThreshold) < 0) e['shipping.freeShippingThreshold'] = 'Cannot be negative';
      if (s.standardRate && Number(s.standardRate) < 0) e['shipping.standardRate'] = 'Cannot be negative';
    }
    if (section === 'tax') {
      if (s.enabled && (s.rate === undefined || s.rate === '' || Number(s.rate) < 0)) e['tax.rate'] = 'Tax rate is required when tax is enabled';
      if (s.rate && (Number(s.rate) > 100)) e['tax.rate'] = 'Tax rate cannot exceed 100%';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (section) => {
    if (!validate(section)) {
      setToast({ message: 'Please fix the errors below', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const s = form[section] || {};
      const payload = {};
      Object.keys(s).forEach((k) => { if (s[k] !== undefined) payload[k] = s[k]; });
      await api.updateSettings(section, payload);
      setToast({ message: `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const err = (key) => errors[key] ? <p className="text-xs text-error mt-1">{errors[key]}</p> : null;

  const renderStore = () => {
    const s = form.store || {};
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Store Name *</label>
          <input type="text" value={s.name || ''} onChange={(e) => set('store', 'name', e.target.value)} className={inputClass} placeholder="NovaCart" />
          {err('store.name')}
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Tagline</label>
          <input type="text" value={s.tagline || ''} onChange={(e) => set('store', 'tagline', e.target.value)} className={inputClass} placeholder="Discover Joy in Every Box" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Logo URL</label>
            <input type="url" value={s.logo || ''} onChange={(e) => set('store', 'logo', e.target.value)} className={inputClass} placeholder="https://example.com/logo.png" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Favicon URL</label>
            <input type="url" value={s.favicon || ''} onChange={(e) => set('store', 'favicon', e.target.value)} className={inputClass} placeholder="https://example.com/favicon.ico" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Contact Email</label>
            <input type="email" value={s.contactEmail || ''} onChange={(e) => set('store', 'contactEmail', e.target.value)} className={inputClass} placeholder="support@novacart.com" />
            {err('store.contactEmail')}
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Phone</label>
            <input type="tel" value={s.phone || ''} onChange={(e) => set('store', 'phone', e.target.value)} className={inputClass} placeholder="+1 (555) 123-4567" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Address</label>
          <input type="text" value={s.address || ''} onChange={(e) => set('store', 'address', e.target.value)} className={inputClass} placeholder="123 Store St, City, State" />
        </div>
      </div>
    );
  };

  const renderPayment = () => {
    const s = form.payment || {};
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Currency</label>
            <select value={s.currency || 'USD'} onChange={(e) => set('payment', 'currency', e.target.value)} className={selectClass}>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="INR">INR - Indian Rupee</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Symbol</label>
            <input type="text" value={s.currencySymbol || '$'} onChange={(e) => set('payment', 'currencySymbol', e.target.value)} className={inputClass} placeholder="$" />
          </div>
        </div>
        <div className="border-t border-surface-container pt-4">
          <Toggle label="Accept Credit Cards" checked={s.acceptCreditCards !== false} onChange={(v) => set('payment', 'acceptCreditCards', v)} description="Allow Visa, Mastercard, etc." />
          <Toggle label="Accept PayPal" checked={s.acceptPaypal === true} onChange={(v) => set('payment', 'acceptPaypal', v)} description="Allow PayPal checkout." />
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Stripe Public Key</label>
          <input type="text" value={s.stripePublicKey || ''} onChange={(e) => set('payment', 'stripePublicKey', e.target.value)} className={inputClass} placeholder="pk_live_..." />
          <p className="text-xs text-on-surface-variant mt-1">Found in your Stripe dashboard.</p>
        </div>
      </div>
    );
  };

  const renderShipping = () => {
    const s = form.shipping || {};
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Free Shipping Threshold ($)</label>
          <input type="number" min="0" step="0.01" value={s.freeShippingThreshold ?? ''} onChange={(e) => set('shipping', 'freeShippingThreshold', e.target.value)} className={inputClass} placeholder="50.00" />
          {err('shipping.freeShippingThreshold')}
          <p className="text-xs text-on-surface-variant mt-1">Orders above this amount get free standard shipping.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Standard Rate ($)</label>
            <input type="number" min="0" step="0.01" value={s.standardRate ?? ''} onChange={(e) => set('shipping', 'standardRate', e.target.value)} className={inputClass} placeholder="5.99" />
            {err('shipping.standardRate')}
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Express Rate ($)</label>
            <input type="number" min="0" step="0.01" value={s.expressRate ?? ''} onChange={(e) => set('shipping', 'expressRate', e.target.value)} className={inputClass} placeholder="12.99" />
          </div>
        </div>
        <div className="border-t border-surface-container pt-4">
          <Toggle label="Enable Local Delivery" checked={s.enableLocalDelivery === true} onChange={(v) => set('shipping', 'enableLocalDelivery', v)} description="Allow local delivery for nearby addresses." />
        </div>
      </div>
    );
  };

  const renderTax = () => {
    const s = form.tax || {};
    return (
      <div className="space-y-5">
        <Toggle label="Enable Tax" checked={s.enabled !== false} onChange={(v) => set('tax', 'enabled', v)} description="Automatically calculate tax on orders." />
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Tax Rate (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={s.rate ?? ''} onChange={(e) => set('tax', 'rate', e.target.value)} className={inputClass} placeholder="8" disabled={s.enabled === false} />
          {err('tax.rate')}
          <p className="text-xs text-on-surface-variant mt-1">Applied as a percentage to each order.</p>
        </div>
        <div className="border-t border-surface-container pt-4">
          <Toggle label="Include Tax in Price" checked={s.includeInPrice === true} onChange={(v) => set('tax', 'includeInPrice', v)} description="Display prices with tax included." />
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    const s = form.notifications || {};
    return (
      <div className="space-y-5">
        <Toggle label="Order Confirmation" checked={s.orderConfirmation !== false} onChange={(v) => set('notifications', 'orderConfirmation', v)} description="Email when an order is placed." />
        <Toggle label="Shipping Updates" checked={s.shippingUpdates !== false} onChange={(v) => set('notifications', 'shippingUpdates', v)} description="Notify about shipping status changes." />
        <Toggle label="Low Stock Alert" checked={s.lowStockAlert !== false} onChange={(v) => set('notifications', 'lowStockAlert', v)} description="Get notified when products are low." />
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Low Stock Threshold</label>
          <input type="number" min="1" value={s.lowStockThreshold ?? ''} onChange={(e) => set('notifications', 'lowStockThreshold', e.target.value)} className={inputClass} placeholder="5" disabled={s.lowStockAlert === false} />
          <p className="text-xs text-on-surface-variant mt-1">Alert when stock drops below this.</p>
        </div>
        <Toggle label="New Order Alert" checked={s.newOrderAlert !== false} onChange={(v) => set('notifications', 'newOrderAlert', v)} description="Immediate notification on new orders." />
      </div>
    );
  };

  const renderSecurity = () => {
    const s = form.security || {};
    return (
      <div className="space-y-5">
        <Toggle label="Require Email Verification" checked={s.requireEmailVerification === true} onChange={(v) => set('security', 'requireEmailVerification', v)} description="Users must verify email before access." />
        <Toggle label="Two-Factor Authentication" checked={s.enableTwoFactor === true} onChange={(v) => set('security', 'enableTwoFactor', v)} description="Extra security layer for accounts." />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Session Timeout (min)</label>
            <input type="number" min="5" value={s.sessionTimeout ?? ''} onChange={(e) => set('security', 'sessionTimeout', e.target.value)} className={inputClass} placeholder="30" />
            <p className="text-xs text-on-surface-variant mt-1">Auto logout after inactivity.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">Max Login Attempts</label>
            <input type="number" min="1" value={s.maxLoginAttempts ?? ''} onChange={(e) => set('security', 'maxLoginAttempts', e.target.value)} className={inputClass} placeholder="5" />
            <p className="text-xs text-on-surface-variant mt-1">Lock after failed attempts.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSeo = () => {
    const s = form.seo || {};
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Meta Title</label>
          <input type="text" value={s.metaTitle || ''} onChange={(e) => set('seo', 'metaTitle', e.target.value)} className={inputClass} placeholder="NovaCart - Shop the Best" />
          <p className="text-xs text-on-surface-variant mt-1">Recommended: 50-60 characters.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Meta Description</label>
          <textarea value={s.metaDescription || ''} onChange={(e) => set('seo', 'metaDescription', e.target.value)} rows={3} className={inputClass} placeholder="Shop the best products at NovaCart..." />
          <p className="text-xs text-on-surface-variant mt-1">Recommended: 150-160 characters.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">OG Image URL</label>
          <input type="url" value={s.ogImage || ''} onChange={(e) => set('seo', 'ogImage', e.target.value)} className={inputClass} placeholder="https://example.com/og.png" />
          <p className="text-xs text-on-surface-variant mt-1">Image for social media shares.</p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'store': return renderStore();
      case 'payment': return renderPayment();
      case 'shipping': return renderShipping();
      case 'tax': return renderTax();
      case 'notifications': return renderNotifications();
      case 'security': return renderSecurity();
      case 'seo': return renderSeo();
      default: return null;
    }
  };

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
            <p className="text-on-surface-variant text-sm mt-1">Configure your store preferences and integrations.</p>
          </div>
          <button onClick={fetchSettings} className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-lg">refresh</span>
            Reset
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <SkeletonPulse className="h-12 w-full rounded-xl" />
            <div className="space-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <SkeletonPulse className="h-4 w-32" />
                  <SkeletonPulse className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container overflow-hidden">
            <div className="border-b border-surface-container overflow-x-auto">
              <div className="flex gap-0 min-w-max">
                {Tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-surface-container'}`}
                  >
                    <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 max-w-2xl">
              {renderContent()}
              <div className="border-t border-surface-container mt-6 pt-5 flex items-center justify-between">
                <p className="text-xs text-on-surface-variant">Changes are saved per section.</p>
                <button
                  onClick={() => handleSave(activeTab)}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">save</span>
                      Save {Tabs.find((t) => t.id === activeTab)?.label}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
