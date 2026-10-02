import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg animate-fade-up ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      <span className="material-symbols-outlined text-lg">
        {type === 'success' ? 'check_circle' : 'error'}
      </span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70 transition-opacity">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
};

const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />
);

const getStockColor = (stock) => {
  if (stock === 0) return 'text-red-600 bg-red-50';
  if (stock < 5) return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
};

const getStockDot = (stock) => {
  if (stock === 0) return 'bg-red-500';
  if (stock < 5) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const StockHistoryModal = ({ product, onClose }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStockHistory(product._id || product.id)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [product._id, product.id]);

  const typeColors = {
    set: 'bg-blue-100 text-blue-800',
    adjust: 'bg-amber-100 text-amber-800',
    order: 'bg-red-100 text-red-800',
    cancel: 'bg-emerald-100 text-emerald-800',
    restock: 'bg-green-100 text-green-800',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Stock History</h3>
            <p className="text-sm text-gray-500">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !history?.stockHistory?.length ? (
            <div className="text-center py-8 text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">history</span>
              <p className="text-sm">No stock history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.stockHistory.slice().reverse().map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${typeColors[entry.type] || 'bg-gray-100 text-gray-700'}`}>
                    {entry.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{entry.note || entry.type}</p>
                    <p className="text-xs text-gray-400">{formatDate(entry.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {entry.previousStock} → {entry.newStock}
                    </p>
                    <p className={`text-xs font-semibold ${entry.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [outOfStockFilter, setOutOfStockFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStock, setBulkStock] = useState('');
  const [editingStock, setEditingStock] = useState(null);
  const [stockValue, setStockValue] = useState('');
  const [adjustMode, setAdjustMode] = useState('set');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [historyProduct, setHistoryProduct] = useState(null);
  const perPage = 20;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts({ pageSize: 500 });
      const data = Array.isArray(res) ? res : res.products || res.data || [];
      setProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.getCategoriesTree();
      const data = Array.isArray(res) ? res : res.categories || res.data || [];
      setCategories(data);
    } catch (err) {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const name = p.name?.toLowerCase() || '';
      const sku = p.sku?.toLowerCase() || '';
      if (!name.includes(q) && !sku.includes(q)) return false;
    }
    const pCat = p.category?._id || p.category;
    if (filterCategory && pCat !== filterCategory) return false;
    const stock = p.countInStock ?? 0;
    if (lowStockFilter && (stock === 0 || stock >= 5)) return false;
    if (outOfStockFilter && stock !== 0) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;
    if (sortField === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
    } else if (sortField === 'stock') {
      valA = a.countInStock || 0;
      valB = b.countInStock || 0;
    } else if (sortField === 'sku') {
      valA = (a.sku || '').toLowerCase();
      valB = (b.sku || '').toLowerCase();
    } else if (sortField === 'category') {
      valA = (a.category || '').toLowerCase();
      valB = (b.category || '').toLowerCase();
    } else {
      valA = new Date(a.updatedAt || 0).getTime();
      valB = new Date(b.updatedAt || 0).getTime();
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, lowStockFilter, outOfStockFilter]);

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

  const handleBulkStockUpdate = async () => {
    if (selectedIds.size === 0 || bulkStock === '') return;
    const val = Number(bulkStock);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid stock value', 'error');
      return;
    }
    setSaving(true);
    try {
      const updates = Array.from(selectedIds).map((id) => ({
        productId: id,
        stock: val,
        note: 'Bulk update',
      }));
      await api.bulkUpdateStock(updates);
      showToast(`Updated stock for ${selectedIds.size} products`);
      setSelectedIds(new Set());
      setBulkStock('');
      fetchProducts();
    } catch (err) {
      showToast('Failed to update stock', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineSave = async (productId) => {
    const val = Number(stockValue);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid stock value', 'error');
      return;
    }
    try {
      await api.adjustStock(productId, val, adjustMode, `Quick ${adjustMode}`);
      setProducts((prev) =>
        prev.map((p) => {
          if ((p._id || p.id) === productId) {
            let newStock;
            if (adjustMode === 'set') newStock = val;
            else if (adjustMode === 'adjust') newStock = Math.max(0, (p.countInStock || 0) + val);
            else newStock = (p.countInStock || 0) + Math.abs(val);
            return { ...p, countInStock: newStock };
          }
          return p;
        })
      );
      setEditingStock(null);
      showToast('Stock updated');
    } catch (err) {
      showToast('Failed to update stock', 'error');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const stats = {
    total: products.length,
    outOfStock: products.filter((p) => (p.countInStock ?? 0) === 0).length,
    lowStock: products.filter((p) => {
      const s = p.countInStock ?? 0;
      return s > 0 && s < 5;
    }).length,
    inStock: products.filter((p) => (p.countInStock ?? 0) >= 5).length,
  };

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Inventory
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Monitor and manage product stock levels.
            </p>
          </div>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-bold text-on-surface mt-1">{stats.total}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">In Stock</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.inStock}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Low Stock</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.lowStock}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm">
          {/* Search + Filters */}
          <div className="p-4 border-b border-surface-container flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or SKU..."
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
                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setLowStockFilter(!lowStockFilter);
                setOutOfStockFilter(false);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                lowStockFilter
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-lg align-middle mr-1">warning</span>
              Low Stock
            </button>
            <button
              onClick={() => {
                setOutOfStockFilter(!outOfStockFilter);
                setLowStockFilter(false);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                outOfStockFilter
                  ? 'bg-red-100 text-red-800'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-lg align-middle mr-1">remove_circle</span>
              Out of Stock
            </button>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-3 bg-primary-container/10 border-b border-surface-container flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-semibold text-on-primary-container">
                {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min="0"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  className="w-28 bg-surface-container-low rounded-lg px-3 py-1.5 text-sm text-on-surface border border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="New stock"
                />
                <button
                  onClick={handleBulkStockUpdate}
                  disabled={saving || bulkStock === ''}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Updating...' : 'Apply Stock'}
                </button>
                <button
                  onClick={() => {
                    setSelectedIds(new Set());
                    setBulkStock('');
                  }}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-5 h-5 rounded bg-surface-container-high" />
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high" />
                  <div className="h-4 w-36 bg-surface-container-high rounded" />
                  <div className="h-4 w-20 bg-surface-container-high rounded" />
                  <div className="h-4 w-24 bg-surface-container-high rounded" />
                  <div className="h-4 w-16 bg-surface-container-high rounded" />
                  <div className="h-6 w-20 bg-surface-container-high rounded-full" />
                  <div className="h-4 w-24 bg-surface-container-high rounded" />
                  <div className="h-8 w-8 bg-surface-container-high rounded-lg" />
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
                warehouse
              </span>
              <p className="text-base font-semibold text-on-surface-variant">No products found</p>
              <p className="text-sm text-on-surface-variant/70 mt-1">
                {products.length === 0
                  ? 'No products in your inventory yet.'
                  : 'No products match your current filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-surface-container">
                      <th className="pb-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === paginated.length && paginated.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20 cursor-pointer"
                        />
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Image
                      </th>
                      <th
                        onClick={() => handleSort('name')}
                        className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-on-surface transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === 'name' && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('sku')}
                        className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-on-surface transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          SKU
                          {sortField === 'sku' && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('category')}
                        className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-on-surface transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Category
                          {sortField === 'category' && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('stock')}
                        className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-on-surface transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Stock
                          {sortField === 'stock' && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Status
                      </th>
                      <th
                        onClick={() => handleSort('updatedAt')}
                        className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-on-surface transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Last Updated
                          {sortField === 'updatedAt' && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="pb-3 px-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((product) => {
                      const id = product._id || product.id;
                      const stock = product.countInStock ?? 0;
                      const isEditing = editingStock === id;
                      return (
                        <tr
                          key={id}
                          className={`border-b border-surface-container last:border-0 hover:bg-surface-container-low/50 transition-colors ${
                            selectedIds.has(id) ? 'bg-primary-container/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(id)}
                              onChange={() => toggleSelect(id)}
                              className="w-4 h-4 rounded border-surface-container text-primary focus:ring-primary/20 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
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
                          <td className="py-3 px-4">
                            <p className="text-sm font-semibold text-on-surface truncate max-w-[200px]">
                              {product.name}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-sm text-on-surface-variant font-mono">
                            {product.sku || '—'}
                          </td>
                          <td className="py-3 px-4 text-sm text-on-surface-variant">
                            {product.category?.name || product.category || '—'}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={adjustMode}
                                  onChange={(e) => setAdjustMode(e.target.value)}
                                  className="w-16 bg-surface-container-low rounded px-1 py-1 text-[10px] font-bold text-on-surface border border-surface-container outline-none"
                                >
                                  <option value="set">Set</option>
                                  <option value="adjust">+/-</option>
                                  <option value="restock">Add</option>
                                </select>
                                <input
                                  type="number"
                                  value={stockValue}
                                  onChange={(e) => setStockValue(e.target.value)}
                                  className="w-20 bg-surface-container-low rounded px-2 py-1 text-sm text-on-surface border border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(id);
                                    if (e.key === 'Escape') {
                                      setEditingStock(null);
                                      setStockValue('');
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleInlineSave(id)}
                                  className="p-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                                  title="Save"
                                >
                                  <span className="material-symbols-outlined text-sm">check</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingStock(null);
                                    setStockValue('');
                                  }}
                                  className="p-1 rounded bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors"
                                  title="Cancel"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingStock(id);
                                    setStockValue(String(stock));
                                    setAdjustMode('set');
                                  }}
                                  className="flex items-center gap-2 group cursor-pointer"
                                  title="Click to edit stock"
                                >
                                  <span className={`w-2 h-2 rounded-full ${getStockDot(stock)}`} />
                                  <span className={`text-sm font-bold ${getStockColor(stock).split(' ')[0]} group-hover:underline`}>
                                    {stock}
                                  </span>
                                </button>
                                {product.minStockLevel !== undefined && stock > 0 && stock <= product.minStockLevel && (
                                  <span className="text-[10px] text-amber-600 font-semibold">Min: {product.minStockLevel}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                stock === 0
                                  ? 'bg-red-100 text-red-800'
                                  : stock < 5
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {stock === 0 ? 'Out of Stock' : stock < 5 ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-on-surface-variant">
                            {formatDate(product.updatedAt || product.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingStock(id);
                                  setStockValue(String(stock));
                                  setAdjustMode('set');
                                }}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-primary-container/30 hover:text-primary transition-colors"
                                title="Quick edit stock"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => setHistoryProduct(product)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                title="Stock History"
                              >
                                <span className="material-symbols-outlined text-lg">history</span>
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
                    Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of{' '}
                    {filtered.length} products
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

      {/* Stock History Modal */}
      {historyProduct && (
        <StockHistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminInventory;
