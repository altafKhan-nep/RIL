import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const POSITIONS = ['hero', 'promo', 'footer', 'sidebar'];

const POSITION_INFO = {
  hero: { label: 'Hero', desc: 'Homepage main carousel — full-width rotating slides with big images', icon: 'star' },
  promo: { label: 'Promo', desc: 'Promotional strip below navbar + promo cards on pages', icon: 'local_offer' },
  sidebar: { label: 'Sidebar', desc: 'Sidebar banner on shop listing & product detail pages', icon: 'view_sidebar' },
  footer: { label: 'Footer', desc: 'Trust/brand banner strip above the footer on all pages', icon: 'web_asset' },
};

const TARGET_PAGES = ['home', 'shop', 'product'];

const INITIAL_FORM = {
  title: '',
  subtitle: '',
  description: '',
  image: '',
  link: '',
  ctaText: '',
  position: 'hero',
  targetPages: [],
  bgColor: '',
  startDate: '',
  endDate: '',
  isActive: true,
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

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-error">
              warning
            </span>
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

const BannerFormModal = ({ open, banner, onSave, onClose }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageTab, setImageTab] = useState('url');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        description: banner.description || '',
        image: banner.image || '',
        link: banner.link || '',
        ctaText: banner.ctaText || '',
        position: banner.position || 'hero',
        targetPages: banner.targetPages || [],
        bgColor: banner.bgColor || '',
        startDate: banner.startDate
          ? new Date(banner.startDate).toISOString().slice(0, 10)
          : '',
        endDate: banner.endDate
          ? new Date(banner.endDate).toISOString().slice(0, 10)
          : '',
        isActive: banner.isActive !== false,
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [banner, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.image.trim()) e.image = 'Image URL is required';
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      e.endDate = 'End date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
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

  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      handleChange('image', e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  };

  const PPOSITION_PRESETS = {
    hero: { bg: 'from-blue-500/20 to-purple-500/20', label: 'Hero Carousel' },
    promo: { bg: 'from-orange-500/20 to-red-500/20', label: 'Promo Strip' },
    sidebar: { bg: 'from-teal-500/20 to-green-500/20', label: 'Sidebar' },
    footer: { bg: 'from-gray-500/20 to-gray-600/20', label: 'Footer Strip' },
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container/60 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              {banner ? 'Edit Banner' : 'Create Banner'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {banner ? 'Update banner settings and content' : 'Add a new promotional banner'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Preview */}
          {form.image && (
            <div className="rounded-xl overflow-hidden border border-surface-container/60">
              <div
                className={`relative aspect-[16/7] bg-gradient-to-br ${PPOSITION_PRESETS[form.position]?.bg || 'from-gray-100 to-gray-200'}`}
                style={form.bgColor ? { backgroundColor: form.bgColor } : {}}
              >
                <img
                  key={form.image}
                  src={form.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center bg-surface-container">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block">broken_image</span>
                    <p className="text-xs text-on-surface-variant mt-1">Image failed to load</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm uppercase">
                      {form.position}
                    </span>
                    {form.startDate && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                        {form.startDate} → {form.endDate || 'Ongoing'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white drop-shadow-lg">
                    {form.title || 'Banner Title'}
                  </h3>
                  {form.subtitle && (
                    <p className="text-sm text-white/90 drop-shadow-md mt-1">
                      {form.subtitle}
                    </p>
                  )}
                  {form.ctaText && (
                    <span className="inline-block mt-3 px-4 py-1.5 bg-white text-gray-900 text-xs font-bold rounded-lg">
                      {form.ctaText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">text_fields</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Content</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Title <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={inputClass('title')}
                placeholder="e.g. Summer Sale — Up to 50% Off"
              />
              {errors.title && (
                <p className="text-xs text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Subtitle
              </label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className={inputClass('subtitle')}
                placeholder="e.g. Limited time offer"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className={inputClass('description')}
                placeholder="Brief description for internal reference..."
              />
            </div>
          </div>

          {/* Image Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">image</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Image</h3>
            </div>

            <div className="flex gap-1 p-1 bg-surface-container-low rounded-lg">
              {['url', 'upload'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setImageTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                    imageTab === tab
                      ? 'bg-white text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {tab === 'url' ? 'link' : 'upload'}
                  </span>
                  {tab === 'url' ? 'URL' : 'Upload'}
                </button>
              ))}
            </div>

            {imageTab === 'url' ? (
              <div>
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => handleChange('image', e.target.value)}
                  className={inputClass('image')}
                  placeholder="https://example.com/banner.jpg"
                />
                {errors.image && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {errors.image}
                  </p>
                )}
              </div>
            ) : (
              <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-surface-container hover:border-outline-variant'
                }`}
                onClick={() => document.getElementById('banner-file-input').click()}
              >
                <input
                  id="banner-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                />
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2 block">
                  cloud_upload
                </span>
                <p className="text-sm font-medium text-on-surface-variant">
                  Drag & drop or <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
              {form.image && form.image.startsWith('data:') && (
                <div className="mt-3 relative rounded-lg overflow-hidden border border-surface-container/60">
                  <img
                    key={form.image}
                    src={form.image}
                    alt="Uploaded preview"
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleChange('image', ''); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
              </>
            )}
          </div>

          {/* Link & CTA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">ads_click</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Call to Action</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">
                  Link URL
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => handleChange('link', e.target.value)}
                  className={inputClass('link')}
                  placeholder="/shop or https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">
                  Button Text
                </label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={(e) => handleChange('ctaText', e.target.value)}
                  className={inputClass('ctaText')}
                  placeholder="Shop Now"
                />
              </div>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">dashboard</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Position</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {POSITIONS.map((pos) => {
                const info = POSITION_INFO[pos];
                const isSelected = form.position === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => handleChange('position', pos)}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-surface-container hover:border-outline-variant bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary/10' : 'bg-surface-container-high'
                    }`}>
                      <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {info.icon}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                        {info.label}
                      </p>
                      <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                        {info.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Pages */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">pages</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Show On Pages</h3>
            </div>
            <p className="text-xs text-on-surface-variant">Leave empty to show on all pages</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_PAGES.map((page) => {
                const selected = form.targetPages.includes(page);
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? form.targetPages.filter((p) => p !== page)
                        : [...form.targetPages, page];
                      handleChange('targetPages', next);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                      selected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:border-outline-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {page === 'home' ? 'home' : page === 'shop' ? 'store' : 'inventory_2'}
                    </span>
                    {page.charAt(0).toUpperCase() + page.slice(1)}
                    {selected && <span className="material-symbols-outlined text-sm">check</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">palette</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Appearance</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={form.bgColor || '#ffffff'}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border-2 border-surface-container cursor-pointer shrink-0"
                  />
                </div>
                <input
                  type="text"
                  value={form.bgColor}
                  onChange={(e) => handleChange('bgColor', e.target.value)}
                  className={inputClass('bgColor')}
                  placeholder="#ffffff"
                />
                <div className="flex gap-1.5">
                  {['#ffffff', '#fbf9f5', '#f0fffe', '#fff5f0', '#1b1c1a'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange('bgColor', color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        form.bgColor === color ? 'border-primary scale-110' : 'border-surface-container hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg text-primary">calendar_month</span>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Schedule</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className={inputClass('startDate')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className={inputClass('endDate')}
                />
                {errors.endDate && (
                  <p className="text-xs text-error mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">
              Leave dates empty for an always-active banner
            </p>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-xl ${form.isActive ? 'text-green-500' : 'text-on-surface-variant'}`}>
                {form.isActive ? 'visibility' : 'visibility_off'}
              </span>
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {form.isActive ? 'Banner Visible' : 'Banner Hidden'}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {form.isActive ? 'This banner is live on the site' : 'This banner is hidden from users'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-surface-container-high rounded-full peer peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[22px] after:w-[22px] after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {/* Actions */}
          <div className="border-t border-surface-container/60 pt-5 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    {banner ? 'save' : 'add'}
                  </span>
                  {banner ? 'Update Banner' : 'Create Banner'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container/60">
            <div className="aspect-video bg-surface-container-high" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-surface-container-high rounded w-3/4" />
              <div className="h-3 bg-surface-container-high rounded w-1/2" />
              <div className="flex items-center justify-between pt-3 border-t border-surface-container/60">
                <div className="h-3 bg-surface-container-high rounded w-1/3" />
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
      view_carousel
    </span>
    <p className="text-base font-semibold text-on-surface-variant">
      No banners found
    </p>
    <p className="text-sm text-on-surface-variant/70 mt-1 mb-4">
      You haven't added any banners yet. Create your first banner to showcase
      promotions.
    </p>
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
    >
      <span className="material-symbols-outlined text-lg">add</span>
      Add your first banner
    </button>
  </div>
);

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getBanners();
      const data = Array.isArray(res) ? res : res.banners || res.data || [];
      setBanners(data);
    } catch (err) {
      setError(err.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const showToast = (message, type = 'success') =>
    setToast({ message, type });

  const filtered = banners.filter((b) => {
    if (search && !b.title?.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterPosition && b.position !== filterPosition) return false;
    return true;
  });

  const handleSave = async (payload) => {
    try {
      if (editingBanner) {
        await api.updateBanner(
          editingBanner._id || editingBanner.id,
          payload
        );
        showToast('Banner updated successfully');
      } else {
        await api.createBanner(payload);
        showToast('Banner created successfully');
      }
      setFormOpen(false);
      setEditingBanner(null);
      fetchBanners();
    } catch (err) {
      showToast(err.message || 'Failed to save banner', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteBanner(deleteTarget);
      showToast('Banner deleted');
      setDeleteTarget(null);
      fetchBanners();
    } catch {
      showToast('Failed to delete banner', 'error');
    }
  };

  const handleToggle = async (banner) => {
    try {
      await api.updateBanner(banner._id || banner.id, {
        isActive: !banner.isActive,
      });
      setBanners((prev) =>
        prev.map((b) =>
          (b._id || b.id) === (banner._id || banner.id)
            ? { ...b, isActive: !b.isActive }
            : b
        )
      );
      showToast(banner.isActive ? 'Banner disabled' : 'Banner enabled');
    } catch {
      showToast('Failed to toggle banner', 'error');
    }
  };

  const handleMove = async (bannerId, direction) => {
    const samePosition = filtered.filter(
      (b) =>
        (b.position || 'hero') ===
        (banners.find((x) => (x._id || x.id) === bannerId)?.position ||
          'hero')
    );
    const idx = samePosition.findIndex(
      (b) => (b._id || b.id) === bannerId
    );
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= samePosition.length) return;
    const items = samePosition.map((b) => ({
      id: b._id || b.id,
      order: b.order || 0,
    }));
    const temp = items[idx].order;
    items[idx].order = items[swapIdx].order;
    items[swapIdx].order = temp;
    try {
      await api.reorderBanners(items);
      fetchBanners();
    } catch {
      showToast('Failed to reorder', 'error');
    }
  };

  const getBannerStatus = (banner) => {
    if (!banner.isActive) return 'disabled';
    const now = new Date();
    if (banner.startDate && new Date(banner.startDate) > now)
      return 'scheduled';
    if (banner.endDate && new Date(banner.endDate) < now) return 'expired';
    return 'active';
  };

  const STATUS_STYLES = {
    active: 'bg-emerald-100 text-emerald-800',
    disabled: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-800',
    expired: 'bg-amber-100 text-amber-800',
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const positionTabs = [
    { key: '', label: 'All', icon: 'view_carousel' },
    ...POSITIONS.map((pos) => ({
      key: pos,
      label: pos.charAt(0).toUpperCase() + pos.slice(1),
      icon:
        pos === 'hero'
          ? 'star'
          : pos === 'promo'
          ? 'local_offer'
          : pos === 'footer'
          ? 'web_asset'
          : 'view_sidebar',
    })),
  ];

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
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <BannerFormModal
        open={formOpen}
        banner={editingBanner}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingBanner(null);
        }}
      />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Banners
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Manage promotional banners and hero images.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBanner(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Banner
          </button>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button
              onClick={fetchBanners}
              className="text-sm font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl shadow-sm">
          <div className="p-4 border-b border-surface-container/60">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search banners..."
                  className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <div className="px-4 pt-3">
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto">
              {positionTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterPosition(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    filterPosition === tab.key
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{
                      fontVariationSettings:
                        filterPosition === tab.key
                          ? "'FILL' 1"
                          : "'FILL' 0",
                    }}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              onAdd={() => {
                setEditingBanner(null);
                setFormOpen(true);
              }}
            />
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((banner) => {
                  const id = banner._id || banner.id;
                  const status = getBannerStatus(banner);
                  return (
                    <div
                      key={id}
                      className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container/60 hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video bg-surface-container overflow-hidden relative">
                        {banner.image ? (
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant/30 text-4xl">
                              image
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLES[status]}`}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface/80 text-on-surface capitalize backdrop-blur-sm">
                            {banner.position || 'hero'}
                          </span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-sm font-bold text-white truncate drop-shadow-md">
                            {banner.title}
                          </h3>
                          {banner.subtitle && (
                            <p className="text-xs text-white/80 truncate drop-shadow-md mt-0.5">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-on-surface-variant space-y-0.5">
                            {banner.startDate && (
                              <p>
                                Start: {formatDate(banner.startDate)}
                              </p>
                            )}
                            {banner.endDate && (
                              <p>
                                End: {formatDate(banner.endDate)}
                              </p>
                            )}
                            {!banner.startDate && !banner.endDate && (
                              <p>No date range set</p>
                            )}
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={banner.isActive !== false}
                              onChange={() => handleToggle(banner)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-surface-container-high rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>

                        {banner.link && (
                          <p className="text-[11px] text-primary truncate">
                            {banner.link}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-surface-container/60">
                          <button
                            onClick={() => handleMove(id, 'up')}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                            title="Move up"
                          >
                            <span className="material-symbols-outlined text-lg">
                              keyboard_arrow_up
                            </span>
                          </button>
                          <button
                            onClick={() => handleMove(id, 'down')}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                            title="Move down"
                          >
                            <span className="material-symbols-outlined text-lg">
                              keyboard_arrow_down
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingBanner(banner);
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-primary-container/30 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-lg">
                              edit
                            </span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(id)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBanners;
