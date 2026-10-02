import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const INITIAL_FORM = {
  name: '',
  slug: '',
  sku: '',
  category: '',
  description: '',
  price: '',
  originalPrice: '',
  countInStock: '',
  images: [''],
  colors: [],
  features: [''],
  badge: '',
  featured: false,
  bestseller: false,
  flashDeal: false,
  newArrival: false,
  status: 'active',
};

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-gray-100 text-gray-700',
  'out of stock': 'bg-red-100 text-red-800',
};

const getStatus = (product) => {
  if (product.countInStock === 0) return 'out of stock';
  return product.status || 'active';
};

const getStockColor = (stock) => {
  if (stock === 0) return 'text-red-600';
  if (stock < 5) return 'text-amber-600';
  return 'text-emerald-600';
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = type === 'success'
    ? 'bg-emerald-600 text-white'
    : 'bg-red-600 text-white';

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-fade-up ${colors}`}>
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
        <p className="text-sm text-on-surface-variant mb-2">{message}</p>
        <p className="text-xs text-error font-medium mb-6">This action cannot be undone.</p>
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

const SectionHeader = ({ icon, title, subtitle, open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center gap-3 py-3 group"
  >
    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
    </div>
    <div className="flex-1 text-left">
      <h3 className="text-sm font-bold text-on-surface">{title}</h3>
      {subtitle && <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{subtitle}</p>}
    </div>
    <span className={`material-symbols-outlined text-on-surface-variant/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      expand_more
    </span>
  </button>
);

const ImagePreview = ({ url, onRemove, index }) => {
  const [error, setError] = useState(false);
  if (!url || error) return null;
  return (
    <div className="relative group rounded-xl overflow-hidden border border-outline-variant/20">
      <img
        src={url}
        alt={`Preview ${index + 1}`}
        className="w-full h-28 object-cover"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 bg-white/90 text-error p-1.5 rounded-full transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
        {index + 1}
      </span>
    </div>
  );
};

const ProductFormModal = ({ open, product, categories, onSave, onClose }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [openSections, setOpenSections] = useState({ basic: true, pricing: true, images: true, colors: false, features: false, flags: false });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        slug: product.slug || '',
        sku: product.sku || '',
        category: product.category?.name || product.category || '',
        description: product.description || '',
        price: product.price || '',
        originalPrice: product.originalPrice || '',
        countInStock: product.countInStock ?? '',
        images: product.images?.length > 0 ? [...product.images] : [''],
        colors: product.colors || [],
        features: product.features?.length > 0 ? [...product.features] : [''],
        badge: product.badge || '',
        featured: product.isFeatured || false,
        bestseller: product.isBestseller || false,
        flashDeal: product.isFlashDeal || false,
        newArrival: product.isNewArrival || false,
        status: product.status || 'active',
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [product, open]);

  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const handleImageChange = (index, value) => {
    const updated = [...form.images];
    updated[index] = value;
    setForm((prev) => ({ ...prev, images: updated }));
  };

  const addImageField = () => setForm((prev) => ({ ...prev, images: [...prev.images, ''] }));

  const removeImageField = (index) => {
    if (form.images.length <= 1) return;
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const data = await api.uploadImage(file);
        setForm((prev) => {
          const imgs = prev.images.filter(Boolean);
          return { ...prev, images: [...imgs, data.url, ''] };
        });
      }
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFeatureChange = (index, value) => {
    const updated = [...form.features];
    updated[index] = value;
    setForm((prev) => ({ ...prev, features: updated }));
  };

  const addFeatureField = () => setForm((prev) => ({ ...prev, features: [...prev.features, ''] }));

  const removeFeatureField = (index) => {
    if (form.features.length <= 1) return;
    setForm((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  const handleColorToggle = (color) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter((c) => c !== color) : [...prev.colors, color],
    }));
  };

  const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF6600', '#9933FF', '#FF69B4', '#8B4513',
    '#C0C0C0', '#808080',
  ];

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.price || Number(form.price) <= 0) e.price = 'Valid price is required';
    if (form.countInStock === '' || Number(form.countInStock) < 0) e.countInStock = 'Stock quantity is required';
    if (!form.category) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (asDraft = false) => {
    if (!validate()) return;
    const payload = {
      ...form,
      sku: form.sku || undefined,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      countInStock: Number(form.countInStock),
      images: form.images.filter(Boolean),
      features: form.features.filter(Boolean),
      status: asDraft ? 'draft' : form.status,
      isFeatured: form.featured || false,
      isBestseller: form.bestseller || false,
      isFlashDeal: form.flashDeal || false,
      isNewArrival: form.newArrival || false,
    };
    delete payload.featured;
    delete payload.bestseller;
    delete payload.flashDeal;
    delete payload.newArrival;
    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full bg-surface-container-low rounded-xl px-3.5 py-2.5 text-sm text-on-surface border ${
      errors[field] ? 'border-error focus:border-error' : 'border-outline-variant/30 focus:border-primary'
    } focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant/30`;

  const validImages = form.images.filter(Boolean);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/10 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">
                {product ? 'edit_square' : 'add_box'}
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-[11px] text-on-surface-variant/50">
                {product ? 'Update product details' : 'Fill in the product information'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-1">
          {/* ─── Basic Info ─── */}
          <div className="border-b border-outline-variant/10">
            <SectionHeader icon="info" title="Basic Information" subtitle="Name, slug, SKU, status, category" open={openSections.basic} onToggle={() => toggleSection('basic')} />
            {openSections.basic && (
              <div className="pb-5 space-y-4 pl-12">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Product Name *</label>
                  <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass('name')} placeholder="e.g. Wireless Headphones" />
                  {errors.name && <p className="text-[11px] text-error mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Slug</label>
                    <input type="text" value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} className={inputClass('slug')} placeholder="auto-generated" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">SKU</label>
                    <input type="text" value={form.sku} onChange={(e) => handleChange('sku', e.target.value)} className={inputClass('sku')} placeholder="Auto-generated if empty" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Category *</label>
                    <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className={inputClass('category')}>
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id || cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.category && <p className="text-[11px] text-error mt-1">{errors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Status</label>
                    <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass('status')}>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="out of stock">Out of Stock</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} className={inputClass('description')} placeholder="Product description..." />
                </div>
              </div>
            )}
          </div>

          {/* ─── Pricing & Stock ─── */}
          <div className="border-b border-outline-variant/10">
            <SectionHeader icon="paid" title="Pricing & Stock" subtitle="Price, original price, stock quantity, badge" open={openSections.pricing} onToggle={() => toggleSection('pricing')} />
            {openSections.pricing && (
              <div className="pb-5 space-y-4 pl-12">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm font-bold">$</span>
                      <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => handleChange('price', e.target.value)} className={`${inputClass('price')} pl-7`} placeholder="0.00" />
                    </div>
                    {errors.price && <p className="text-[11px] text-error mt-1">{errors.price}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Original Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm font-bold">$</span>
                      <input type="number" step="0.01" min="0" value={form.originalPrice} onChange={(e) => handleChange('originalPrice', e.target.value)} className={`${inputClass('originalPrice')} pl-7`} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Stock *</label>
                    <input type="number" min="0" value={form.countInStock} onChange={(e) => handleChange('countInStock', e.target.value)} className={inputClass('countInStock')} placeholder="0" />
                    {errors.countInStock && <p className="text-[11px] text-error mt-1">{errors.countInStock}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Badge</label>
                  <input type="text" value={form.badge} onChange={(e) => handleChange('badge', e.target.value)} className={inputClass('badge')} placeholder="e.g. New, Sale, Hot" />
                </div>
                {form.price > 0 && form.originalPrice > form.price && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-sm">local_offer</span>
                    {Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100)}% discount — customers save ${(form.originalPrice - form.price).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Images ─── */}
          <div className="border-b border-outline-variant/10">
            <SectionHeader
              icon="image"
              title="Product Images"
              subtitle={`${validImages.length} image(s) added`}
              open={openSections.images}
              onToggle={() => toggleSection('images')}
            />
            {openSections.images && (
              <div className="pb-5 space-y-4 pl-12">
                {validImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {validImages.map((img, i) => (
                      <ImagePreview key={i} url={img} index={i} onRemove={() => removeImageField(i)} />
                    ))}
                  </div>
                )}
                <div
                  className="border-2 border-dashed border-outline-variant/30 rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e.dataTransfer.files); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">cloud_upload</span>
                  <p className="text-sm font-semibold text-on-surface-variant/60">Click to upload or drag and drop</p>
                  <p className="text-xs text-on-surface-variant/40 mt-1">PNG, JPG, GIF, WEBP up to 5MB each</p>
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Uploading...
                  </div>
                )}
                <p className="text-xs text-on-surface-variant/40 font-medium">Or enter image URLs:</p>
                {form.images.map((img, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={img}
                      onChange={(e) => handleImageChange(i, e.target.value)}
                      className="flex-1 bg-surface-container-low rounded-xl px-3.5 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant/30"
                      placeholder="https://example.com/image.jpg"
                    />
                    {form.images.length > 1 && (
                      <button type="button" onClick={() => removeImageField(i)} className="p-2.5 rounded-xl hover:bg-error-container/30 text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addImageField} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Add another image URL
                </button>
              </div>
            )}
          </div>

          {/* ─── Colors ─── */}
          <div className="border-b border-outline-variant/10">
            <SectionHeader
              icon="palette"
              title="Colors"
              subtitle={form.colors.length > 0 ? `${form.colors.length} color(s) selected` : 'No colors selected'}
              open={openSections.colors}
              onToggle={() => toggleSection('colors')}
            />
            {openSections.colors && (
              <div className="pb-5 space-y-3 pl-12">
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorToggle(color)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${
                        form.colors.includes(color)
                          ? 'border-primary scale-110 shadow-md ring-2 ring-primary/20'
                          : 'border-outline-variant/30 hover:border-on-surface-variant/40 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="customColor"
                    className="flex-1 bg-surface-container-low rounded-xl px-3.5 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant/30"
                    placeholder="#hex or color name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('customColor');
                      if (input.value.trim()) { handleColorToggle(input.value.trim()); input.value = ''; }
                    }}
                    className="px-4 py-2.5 text-xs font-bold bg-surface-container-high rounded-xl hover:bg-surface-container-highest transition-colors"
                  >
                    Add
                  </button>
                </div>
                {form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.colors.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface-variant text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        <span className="w-3.5 h-3.5 rounded-full border border-outline-variant/30 shrink-0" style={{ backgroundColor: c }} />
                        {c}
                        <button onClick={() => handleColorToggle(c)} className="hover:text-error ml-0.5">
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Features ─── */}
          <div className="border-b border-outline-variant/10">
            <SectionHeader
              icon="checklist"
              title="Features"
              subtitle={form.features.filter(Boolean).length > 0 ? `${form.features.filter(Boolean).length} feature(s) added` : 'No features added'}
              open={openSections.features}
              onToggle={() => toggleSection('features')}
            />
            {openSections.features && (
              <div className="pb-5 space-y-2 pl-12">
                {form.features.map((feat, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/8 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-1.5">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => handleFeatureChange(i, e.target.value)}
                      className="flex-1 bg-surface-container-low rounded-xl px-3.5 py-2.5 text-sm text-on-surface border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant/30"
                      placeholder={`Feature ${i + 1}`}
                    />
                    {form.features.length > 1 && (
                      <button type="button" onClick={() => removeFeatureField(i)} className="p-2.5 rounded-xl hover:bg-error-container/30 text-on-surface-variant hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addFeatureField} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors ml-8">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Add feature
                </button>
              </div>
            )}
          </div>

          {/* ─── Flags ─── */}
          <div>
            <SectionHeader icon="flag" title="Flags" subtitle="Featured, bestseller, flash deal, new arrival" open={openSections.flags} onToggle={() => toggleSection('flags')} />
            {openSections.flags && (
              <div className="pb-5 space-y-3 pl-12">
                <label onClick={() => handleChange('featured', !form.featured)} className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-outline-variant/15 hover:border-primary/20 hover:bg-primary/5 transition-all">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${form.featured ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.featured ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Featured</span>
                    <p className="text-[11px] text-on-surface-variant/50">Show this product in featured sections</p>
                  </div>
                </label>
                <label onClick={() => handleChange('bestseller', !form.bestseller)} className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-outline-variant/15 hover:border-primary/20 hover:bg-primary/5 transition-all">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${form.bestseller ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.bestseller ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Bestseller</span>
                    <p className="text-[11px] text-on-surface-variant/50">Mark this product as a bestseller</p>
                  </div>
                </label>
                <label onClick={() => handleChange('flashDeal', !form.flashDeal)} className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-outline-variant/15 hover:border-primary/20 hover:bg-primary/5 transition-all">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${form.flashDeal ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.flashDeal ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Flash Deal</span>
                    <p className="text-[11px] text-on-surface-variant/50">Show this product in flash deals section</p>
                  </div>
                </label>
                <label onClick={() => handleChange('newArrival', !form.newArrival)} className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-outline-variant/15 hover:border-primary/20 hover:bg-primary/5 transition-all">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${form.newArrival ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.newArrival ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">New Arrival</span>
                    <p className="text-[11px] text-on-surface-variant/50">Mark this product as a new arrival</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/10 px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-on-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">{product ? 'save' : 'add'}</span>
              {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const perPage = 10;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminProducts();
      const data = Array.isArray(res) ? res : res.products || res.data || [];
      setProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to load products');
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
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const filtered = products.filter((p) => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    const pCat = p.category?.name || p.category;
    if (filterCategory && pCat !== filterCategory) return false;
    const status = getStatus(p);
    if (filterStatus && status !== filterStatus) return false;
    if (filterStock === 'out' && p.countInStock !== 0) return false;
    if (filterStock === 'low' && (p.countInStock === 0 || p.countInStock >= 5)) return false;
    if (filterStock === 'in' && p.countInStock < 5) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'category') {
      valA = a.category?.name || '';
      valB = b.category?.name || '';
    }
    if (sortField === 'price') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterStatus, filterStock]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="material-symbols-outlined text-sm opacity-30">unfold_more</span>;
    return (
      <span className="material-symbols-outlined text-sm text-primary">
        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((p) => p._id || p.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    if (action === 'delete') {
      setDeleteTarget({ ids: Array.from(selectedIds), bulk: true });
    } else if (action === 'toggle') {
      try {
        await Promise.all(
          Array.from(selectedIds).map((id) => {
            const p = products.find((x) => (x._id || x.id) === id);
            const newStatus = getStatus(p) === 'active' ? 'draft' : 'active';
            return api.updateProduct(id, { status: newStatus });
          })
        );
        showToast(`Updated ${selectedIds.size} products`);
        setSelectedIds(new Set());
        fetchProducts();
      } catch {
        showToast('Failed to update products', 'error');
      }
    }
    setBulkAction('');
  };

  const handleSave = async (payload) => {
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct._id || editingProduct.id, payload);
        showToast('Product updated successfully');
      } else {
        await api.createProduct(payload);
        showToast('Product created successfully');
      }
      setFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.bulk) {
        await Promise.all(deleteTarget.ids.map((id) => api.deleteProduct(id)));
        showToast(`Deleted ${deleteTarget.ids.length} products`);
        setSelectedIds(new Set());
      } else {
        await api.deleteProduct(deleteTarget.id);
        showToast('Product deleted');
      }
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      showToast('Failed to delete product', 'error');
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setFormOpen(true);
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

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.bulk ? `Delete ${deleteTarget.ids.length} products` : 'Delete product'}
        message={
          deleteTarget?.bulk
            ? `Are you sure you want to delete ${deleteTarget.ids.length} selected products?`
            : `Are you sure you want to delete "${products.find((p) => (p._id || p.id) === deleteTarget?.id)?.name || 'this product'}"?`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ProductFormModal
        open={formOpen}
        product={editingProduct}
        categories={categories}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditingProduct(null); }}
      />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Products
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Manage your product inventory and listings.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Product
          </button>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={fetchProducts} className="text-sm font-semibold hover:underline">
              Retry
            </button>
          </div>
        )}

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
                placeholder="Search products..."
                className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id || cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="out of stock">Out of Stock</option>
            </select>

            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
            >
              <option value="">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock (&lt;5)</option>
              <option value="out">Out of Stock</option>
            </select>

            {selectedIds.size > 0 && (
              <div className="relative">
                <select
                  value={bulkAction}
                  onChange={(e) => {
                    setBulkAction(e.target.value);
                    if (e.target.value) handleBulkAction(e.target.value);
                  }}
                  className="bg-primary-container/30 text-on-primary-container rounded-lg px-3 py-2 text-sm font-semibold border border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all"
                >
                  <option value="">Bulk Actions ({selectedIds.size})</option>
                  <option value="toggle">Toggle Visibility</option>
                  <option value="delete">Delete Selected</option>
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-5 h-5 rounded bg-surface-container-high" />
                    <div className="w-12 h-12 rounded-lg bg-surface-container-high" />
                    <div className="h-4 w-32 bg-surface-container-high rounded" />
                    <div className="h-4 w-20 bg-surface-container-high rounded" />
                    <div className="h-4 w-16 bg-surface-container-high rounded" />
                    <div className="h-4 w-16 bg-surface-container-high rounded" />
                    <div className="h-4 w-12 bg-surface-container-high rounded" />
                    <div className="h-4 w-20 bg-surface-container-high rounded" />
                    <div className="h-4 w-20 bg-surface-container-high rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
                inventory_2
              </span>
              <p className="text-base font-semibold text-on-surface-variant">No products found</p>
              <p className="text-sm text-on-surface-variant/70 mt-1 mb-4">
                {products.length === 0
                  ? "You haven't added any products yet."
                  : 'No products match your current filters.'}
              </p>
              {products.length === 0 && (
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-surface-container">
                      <th className="pb-3 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === paginated.length && paginated.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20 cursor-pointer"
                        />
                      </th>
                      <SortableHeader field="image" label="Image" className="w-16" />
                      <SortableHeader field="name" label="Name" />
                      <SortableHeader field="sku" label="SKU" />
<SortableHeader field="category" label="Category" />
                       <SortableHeader field="colors" label="Colors" className="w-24" />
                       <SortableHeader field="price" label="Price" />
                      <SortableHeader field="countInStock" label="Stock" />
                      <SortableHeader field="status" label="Status" />
                      <SortableHeader field="createdAt" label="Date" />
                      <th className="pb-3 px-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((product) => {
                      const id = product._id || product.id;
                      const status = getStatus(product);
                      return (
                        <tr
                          key={id}
                          className={`border-b border-surface-container last:border-0 hover:bg-surface-container-low/50 transition-colors ${
                            selectedIds.has(id) ? 'bg-primary-container/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(id)}
                              onChange={() => toggleSelect(id)}
                              className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                              {product.images?.[0] || product.image ? (
                                <img
                                  src={product.images?.[0] || product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-on-surface-variant/40 text-xl">
                                    image
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-on-surface truncate max-w-[200px]">
                                {product.name}
                              </p>
                              {product.badge && (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-container/40 text-on-primary-container mt-0.5">
                                  {product.badge}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-on-surface-variant font-mono">
                            {product.sku || '—'}
                          </td>
<td className="py-3 px-3 text-sm text-on-surface-variant">
                              {product.category?.name || product.category || '—'}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {(product.colors || []).length > 0 ? (
                                  (product.colors || []).map((c, i) => (
                                    <span key={i} className="w-5 h-5 rounded-full border border-surface-container" style={{ backgroundColor: c }} title={c} />
                                  ))
                                ) : (
                                  <span className="text-on-surface-variant/40 text-xs">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                            <span className="text-sm font-bold text-primary">
                              ${(product.price || 0).toFixed(2)}
                            </span>
                            {product.originalPrice > product.price && (
                              <span className="text-xs text-on-surface-variant line-through ml-1.5">
                                ${product.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-sm font-bold ${getStockColor(product.countInStock ?? 0)}`}>
                              {product.countInStock ?? 0}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-on-surface-variant">
                            {formatDate(product.createdAt)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/product/${product.slug || id}`}
                                className="p-2 md:p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                                title="View"
                              >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                              </Link>
                              <button
                                onClick={() => openEdit(product)}
                                className="p-2 md:p-1.5 rounded-lg text-on-surface-variant hover:bg-primary-container/30 hover:text-primary transition-colors"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id, bulk: false })}
                                className="p-2 md:p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-surface-container">
                  <span className="text-xs text-on-surface-variant">
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of{' '}
                    {sorted.length} products
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

export default AdminProducts;
