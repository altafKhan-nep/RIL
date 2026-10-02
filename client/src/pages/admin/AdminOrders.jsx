import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const ORDER_STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-800',
  Processing: 'bg-blue-100 text-blue-800',
  Shipped: 'bg-teal-100 text-teal-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const STATUS_FLOW = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

const STATUS_TABS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

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

const OrderDetailsPanel = ({ order, onClose, onUpdateStatus }) => {
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingPartner, setShippingPartner] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setNewStatus('');
    setNote('');
    setTrackingNumber(order?.trackingNumber || '');
    setShippingPartner(order?.shippingPartner || '');
    setTrackingUrl(order?.trackingUrl || '');
  }, [order]);

  if (!order) return null;

  const availableStatuses = STATUS_FLOW[order.status] || [];
  const shipping = order.shippingAddress || {};
  const items = order.orderItems || [];

  const handleUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const payload = { status: newStatus };
      if (note) payload.note = note;
      if (trackingNumber) payload.trackingNumber = trackingNumber;
      if (shippingPartner) payload.shippingPartner = shippingPartner;
      if (trackingUrl) payload.trackingUrl = trackingUrl;
      await onUpdateStatus(order._id || order.id, payload);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface-container-lowest shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-surface-container px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-on-surface">Order Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Order Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-on-surface-variant">Order ID</p>
                <p className="text-sm font-semibold text-on-surface font-mono">
                  {(order._id || order.id || '').slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Date</p>
                <p className="text-sm font-semibold text-on-surface">{formatDateTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Payment Method</p>
                <p className="text-sm font-semibold text-on-surface capitalize">{order.paymentMethod || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Status</p>
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                    ORDER_STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {order.status || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Customer</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-on-surface-variant">Name</p>
                <p className="text-sm font-semibold text-on-surface">
                  {order.user?.name || order.customerName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Email</p>
                <p className="text-sm font-semibold text-on-surface">
                  {order.user?.email || order.customerEmail || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Shipping Address</h3>
            <div className="space-y-1">
              {shipping.fullName && <p className="text-sm text-on-surface">{shipping.fullName}</p>}
              {(shipping.street || shipping.address) && <p className="text-sm text-on-surface">{shipping.street || shipping.address}</p>}
              {(shipping.city || shipping.zip || shipping.postalCode) && (
                <p className="text-sm text-on-surface-variant">
                  {[shipping.city, shipping.zip || shipping.postalCode].filter(Boolean).join(', ')}
                </p>
              )}
              {shipping.country && <p className="text-sm text-on-surface">{shipping.country}</p>}
              {!shipping.fullName && !shipping.street && !shipping.address && !shipping.city && !shipping.country && (
                <p className="text-sm text-on-surface-variant">No shipping address provided</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Items</h3>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-surface-container-lowest rounded-lg p-3">
                  <div className="w-14 h-14 rounded-lg bg-surface-container overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant/40">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{item.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      Qty: {item.qty} &times; ${(item.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary shrink-0">
                    ${((item.qty || 1) * (item.price || 0)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Price Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Items</span>
                <span className="text-on-surface font-medium">
                  ${items.reduce((sum, item) => sum + (item.qty || 1) * (item.price || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tax</span>
                <span className="text-on-surface font-medium">
                  ${(order.taxPrice || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Shipping</span>
                <span className="text-on-surface font-medium">
                  ${(order.shippingPrice || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-surface-container pt-2 flex justify-between">
                <span className="text-sm font-bold text-on-surface">Total</span>
                <span className="text-sm font-bold text-primary">
                  ${(order.totalPrice || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Update */}
          {availableStatuses.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Update Status</h3>
              <div className="flex items-center gap-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 bg-surface-container-lowest rounded-lg px-3 py-2.5 text-sm text-on-surface border border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Select status</option>
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Tracking fields when shipping */}
              {newStatus === 'Shipped' && (
                <div className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Shipping Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-sm text-on-surface border border-surface-container focus:border-primary outline-none"
                        placeholder="e.g., TRK123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Shipping Partner</label>
                      <select
                        value={shippingPartner}
                        onChange={(e) => setShippingPartner(e.target.value)}
                        className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-sm text-on-surface border border-surface-container focus:border-primary outline-none"
                      >
                        <option value="">Select carrier</option>
                        <option value="FedEx">FedEx</option>
                        <option value="UPS">UPS</option>
                        <option value="DHL">DHL</option>
                        <option value="USPS">USPS</option>
                        <option value="Blue Dart">Blue Dart</option>
                        <option value="DTDC">DTDC</option>
                        <option value="Delhivery">Delhivery</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tracking URL (optional)</label>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-sm text-on-surface border border-surface-container focus:border-primary outline-none"
                      placeholder="https://carrier.com/track/..."
                    />
                  </div>
                </div>
              )}

              {/* Note field */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-sm text-on-surface border border-surface-container focus:border-primary outline-none"
                  placeholder="Internal note..."
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={!newStatus || updating}
                className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : `Update to ${newStatus || '...'}`}
              </button>
            </div>
          )}

          {/* Status Timeline */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Timeline</h3>
            <div className="space-y-0">
              {(order.statusHistory || []).map((entry, idx) => (
                <div key={idx} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1" />
                    {idx < (order.statusHistory?.length || 0) - 1 && (
                      <div className="w-0.5 flex-1 bg-surface-container mt-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">{entry.status}</p>
                    <p className="text-xs text-on-surface-variant">
                      {entry.date ? formatDateTime(entry.date) : 'N/A'}
                    </p>
                    {entry.note && <p className="text-xs text-on-surface-variant mt-0.5">{entry.note}</p>}
                  </div>
                </div>
              ))}
              {(!order.statusHistory || order.statusHistory.length === 0) && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{order.status || 'Pending'}</p>
                    <p className="text-xs text-on-surface-variant">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAllOrders({ limit: 200 });
      const data = Array.isArray(res) ? res : res.orders || res.data || [];
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const statusCounts = orders.reduce(
    (acc, o) => {
      const s = o.status || 'Pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { Pending: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 }
  );

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const id = (o._id || o.id || '').toLowerCase();
      const name = (o.user?.name || o.customerName || '').toLowerCase();
      const email = (o.user?.email || o.customerEmail || '').toLowerCase();
      if (!id.includes(q) && !name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleUpdateStatus = async (orderId, payload) => {
    try {
      await api.updateOrderStatus(orderId, payload);
      setOrders((prev) =>
        prev.map((o) => {
          if ((o._id || o.id) === orderId) {
            const history = o.statusHistory ? [...o.statusHistory] : [];
            history.push({ status: payload.status, date: new Date().toISOString() });
            return {
              ...o,
              status: payload.status,
              statusHistory: history,
              trackingNumber: payload.trackingNumber || o.trackingNumber,
              shippingPartner: payload.shippingPartner || o.shippingPartner,
              trackingUrl: payload.trackingUrl || o.trackingUrl,
            };
          }
          return o;
        })
      );
      setSelectedOrder((prev) => {
        if (!prev) return null;
        if ((prev._id || prev.id) === orderId) {
          const history = prev.statusHistory ? [...prev.statusHistory] : [];
          history.push({ status: payload.status, date: new Date().toISOString() });
          return {
            ...prev,
            status: payload.status,
            statusHistory: history,
            trackingNumber: payload.trackingNumber || prev.trackingNumber,
            shippingPartner: payload.shippingPartner || prev.shippingPartner,
            trackingUrl: payload.trackingUrl || prev.trackingUrl,
          };
        }
        return prev;
      });
      showToast(`Order updated to ${payload.status}`);
    } catch {
      showToast('Failed to update order status', 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    try {
      await api.cancelOrderAsAdmin(cancelTarget);
      setOrders((prev) =>
        prev.map((o) => {
          if ((o._id || o.id) === cancelTarget) {
            return { ...o, status: 'Cancelled' };
          }
          return o;
        })
      );
      setSelectedOrder((prev) => {
        if (prev && (prev._id || prev.id) === cancelTarget) {
          return { ...prev, status: 'Cancelled' };
        }
        return prev;
      });
      showToast('Order cancelled');
      setCancelTarget(null);
    } catch {
      showToast('Failed to cancel order', 'error');
    }
  };

  const handleExport = () => {
    const headers = ['Order ID', 'Customer', 'Date', 'Total', 'Status', 'Payment'];
    const rows = filtered.map((o) => [
      (o._id || o.id || '').slice(0, 8),
      o.user?.name || o.customerName || '',
      formatDate(o.createdAt),
      (o.totalPrice || 0).toFixed(2),
      o.status || 'Pending',
      o.isPaid ? 'Paid' : 'Unpaid',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Orders exported successfully');
  };

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        onConfirm={handleCancelOrder}
        onCancel={() => setCancelTarget(null)}
      />

      <OrderDetailsPanel
        order={selectedOrder}
        onClose={() => { setPanelOpen(false); setSelectedOrder(null); }}
        onUpdateStatus={handleUpdateStatus}
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary m-0">
              Orders
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Manage and track all customer orders.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 btn-ghost text-on-surface-variant text-sm font-semibold px-4 py-2.5 rounded-lg border border-surface-container hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export CSV
          </button>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/30 text-on-error-container rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={fetchOrders} className="text-sm font-semibold hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Status Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm text-left transition-all hover:shadow-md ${
                statusFilter === status ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-on-surface-variant">{status}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[status]}`}>
                  {statusCounts[status] || 0}
                </span>
              </div>
              <p className="text-2xl font-bold text-on-surface mt-2">{statusCounts[status] || 0}</p>
            </button>
          ))}
        </div>

        {/* Search + Status Tabs */}
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
                placeholder="Search by order ID, customer name, or email..."
                className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="px-4 border-b border-surface-container overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-surface-container'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-4 w-20 bg-surface-container-high rounded" />
                    <div className="h-4 w-28 bg-surface-container-high rounded" />
                    <div className="h-4 w-24 bg-surface-container-high rounded" />
                    <div className="h-4 w-16 bg-surface-container-high rounded" />
                    <div className="h-6 w-20 bg-surface-container-high rounded-full" />
                    <div className="h-6 w-16 bg-surface-container-high rounded-full" />
                    <div className="h-4 w-24 bg-surface-container-high rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">
                receipt_long
              </span>
              <p className="text-base font-semibold text-on-surface-variant">No orders found</p>
              <p className="text-sm text-on-surface-variant/70 mt-1">
                {orders.length === 0
                  ? "No orders have been placed yet."
                  : 'No orders match your current filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-surface-container">
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Date
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Total
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Status
                      </th>
                      <th className="pb-3 px-4 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="pb-3 px-4 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider w-36">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((order) => {
                      const id = order._id || order.id || '';
                      const status = order.status || 'Pending';
                      const canCancel = status === 'Pending' || status === 'Processing';
                      return (
                        <tr
                          key={id}
                          className="border-b border-surface-container last:border-0 hover:bg-surface-container-low/50 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="text-sm font-mono font-bold text-primary">
                              #{id.slice(0, 8)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-sm font-medium text-on-surface">
                              {order.user?.name || order.customerName || 'N/A'}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate max-w-[180px]">
                              {order.user?.email || order.customerEmail || ''}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-sm text-on-surface-variant">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm font-bold text-primary">
                              ${(order.totalPrice || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                ORDER_STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                                order.isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {order.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedOrder(order); setPanelOpen(true); }}
                                className="p-2 md:p-1.5 rounded-lg text-on-surface-variant hover:bg-primary-container/30 hover:text-primary transition-colors"
                                title="View Details"
                              >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                              </button>
                              {(STATUS_FLOW[status] || []).length > 0 && (
                                <button
                                  onClick={() => { setSelectedOrder(order); setPanelOpen(true); }}
                                  className="p-2 md:p-1.5 rounded-lg text-on-surface-variant hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                  title="Update Status"
                                >
                                  <span className="material-symbols-outlined text-lg">edit_note</span>
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  onClick={() => setCancelTarget(id)}
                                  className="p-2 md:p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
                                  title="Cancel Order"
                                >
                                  <span className="material-symbols-outlined text-lg">cancel</span>
                                </button>
                              )}
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
                    {filtered.length} orders
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

export default AdminOrders;
