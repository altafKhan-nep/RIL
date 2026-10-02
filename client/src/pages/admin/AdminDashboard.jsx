import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../api';

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Processing: '#3b82f6',
  Shipped: '#14b8a6',
  Delivered: '#10b981',
  Cancelled: '#ef4444',
};

const ORDER_STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Processing: 'bg-blue-50 text-blue-700 border border-blue-200',
  Shipped: 'bg-teal-50 text-teal-700 border border-teal-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />
);

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (val) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFullDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const AnimatedNumber = ({ value, prefix = '' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = typeof value === 'number' ? value : 0;
    const duration = 800;
    const steps = 25;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{display >= 1000 ? `${(display / 1000).toFixed(1)}K` : Math.round(display).toLocaleString()}</span>;
};

const TrendBadge = ({ value }) => {
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${isZero ? 'bg-gray-100 text-gray-500' : isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isZero ? 'remove' : isPositive ? 'trending_up' : 'trending_down'}
      </span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

const MiniAreaChart = ({ data, height = 100, color = '#a43c12' }) => {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.total || d.value || 0);
  const max = Math.max(...values, 1);
  const w = 100;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - (v / max) * (height - 10)}`);
  const areaPoints = `M0,${height} L${points.join(' L')} L${w},${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height: 60 }}>
      <defs>
        <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPoints} fill="url(#miniGrad)" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DonutMini = ({ statusCounts }) => {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  let offset = 0;
  const parts = statuses.map((s) => {
    const count = statusCounts[s] || 0;
    const pct = (count / total) * 100;
    const start = offset;
    offset += pct;
    return `${STATUS_COLORS[s]} ${start}% ${start + pct}%`;
  }).filter(p => !p.startsWith('NaN'));
  return (
    <div className="relative w-28 h-28">
      <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${parts.join(', ')})` }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-on-surface">{total}</span>
          <span className="text-[8px] text-on-surface-variant font-semibold uppercase">Orders</span>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ icon, label, to, color }) => (
  <Link to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-container hover:shadow-md transition-all group`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`} style={{ background: `${color}15` }}>
      <span className="material-symbols-outlined text-lg" style={{ color }}>{icon}</span>
    </div>
    <span className="text-xs font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors">{label}</span>
  </Link>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [statsRes, ordersRes, usersRes, productsRes] = await Promise.allSettled([
          api.getAdminStats(),
          api.getAllOrders({ limit: 10, sort: '-createdAt' }),
          api.getAllUsers(),
          api.getProducts({ limit: 5, sort: '-sold' }),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (ordersRes.status === 'fulfilled') {
          const d = ordersRes.value;
          setOrders(Array.isArray(d) ? d : d.orders || d.data || []);
        }
        if (usersRes.status === 'fulfilled') {
          const d = usersRes.value;
          setCustomers(Array.isArray(d) ? d : d.users || d.data || []);
        }
        if (productsRes.status === 'fulfilled') {
          const d = productsRes.value;
          setProducts(Array.isArray(d) ? d : d.products || d.data || []);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchDashboard();
  }, []);

  const monthlySales = stats?.monthlySales || [];
  const statusCounts = stats?.statusCounts || {};
  const totalStatusOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const recentOrders = orders.slice(0, 8);
  const recentCustomers = customers.filter((u) => u.role !== 'admin').slice(0, 5);
  const lowStockProducts = products.filter((p) => (p.countInStock ?? 0) <= 5).slice(0, 5);
  const bestSellers = products.slice(0, 5);
  const totalRevenue = stats?.totalSales || 0;
  const totalOrders = stats?.totalOrders || 0;
  const totalCustomers = stats?.totalCustomers || 0;
  const revenueChange = stats?.revenue?.percentageChange || 0;
  const ordersChange = stats?.orders?.percentageChange || 0;
  const lowStock = stats?.lowStockProducts || 0;

  const chartData = monthlySales.slice(-6).map(m => ({
    total: m.total || m.sales || 0,
    month: m._id?.month ? monthNames[m._id.month - 1] : `M${m._id?.month || ''}`,
  }));

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SkeletonPulse className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
                <SkeletonPulse className="h-4 w-24 mb-3" />
                <SkeletonPulse className="h-8 w-20" />
              </div>
            ))}
          </div>
          <SkeletonPulse className="h-48 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonPulse className="h-64 lg:col-span-2" />
            <SkeletonPulse className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>
            <p className="text-on-surface-variant text-sm mt-1">{formatFullDate(new Date())}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/analytics" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-lg">analytics</span>
              Analytics
            </Link>
            <Link to="/admin/orders" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              Orders
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-lg">payments</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Revenue</span>
            </div>
            <p className="text-xl font-bold text-on-surface"><AnimatedNumber value={totalRevenue} prefix="$" /></p>
            <div className="mt-1.5"><TrendBadge value={revenueChange} /></div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-lg">shopping_cart</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Orders</span>
            </div>
            <p className="text-xl font-bold text-on-surface"><AnimatedNumber value={totalOrders} /></p>
            <div className="mt-1.5"><TrendBadge value={ordersChange} /></div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-lg">people</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Customers</span>
            </div>
            <p className="text-xl font-bold text-on-surface"><AnimatedNumber value={totalCustomers} /></p>
            <p className="text-[10px] text-on-surface-variant mt-1.5">{(stats?.repeatCustomerRate || 0).toFixed(1)}% repeat</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-lg">inventory_2</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Low Stock</span>
            </div>
            <p className="text-xl font-bold text-on-surface">{lowStock}</p>
            <p className="text-[10px] text-on-surface-variant mt-1.5">products below 5</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600 text-lg">receipt_long</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Avg Order</span>
            </div>
            <p className="text-xl font-bold text-on-surface">
              ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : '0'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1.5">per order</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          <QuickAction icon="add_box" label="Add Product" to="/admin/products" color="#a43c12" />
          <QuickAction icon="receipt_long" label="Orders" to="/admin/orders" color="#3b82f6" />
          <QuickAction icon="people" label="Customers" to="/admin/customers" color="#10b981" />
          <QuickAction icon="inventory_2" label="Inventory" to="/admin/inventory" color="#f59e0b" />
          <QuickAction icon="campaign" label="Promotions" to="/admin/promotions" color="#8b5cf6" />
          <QuickAction icon="image" label="Banners" to="/admin/banners" color="#ec4899" />
          <QuickAction icon="analytics" label="Analytics" to="/admin/analytics" color="#006a62" />
          <QuickAction icon="settings" label="Settings" to="/admin/settings" color="#6b7280" />
        </div>

        {/* Revenue Mini Chart */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Revenue Trend</h3>
            <span className="text-xs text-on-surface-variant">Last 6 months</span>
          </div>
          <MiniAreaChart data={chartData} color="#a43c12" />
          <div className="flex justify-between mt-2">
            {chartData.map((d, i) => (
              <span key={i} className="text-[9px] text-on-surface-variant font-medium">{d.month}</span>
            ))}
          </div>
        </div>

        {/* Recent Orders + Order Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Recent Orders</h3>
              <Link to="/admin/orders" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-surface-container">
                      <th className="pb-2 pr-3">Order</th>
                      <th className="pb-2 pr-3">Customer</th>
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3 text-right">Total</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const shortId = (order._id || '').toString().slice(-6).toUpperCase();
                      const status = order.status || 'Pending';
                      return (
                        <tr key={order._id} className="border-b border-surface-container last:border-0 hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-2.5 pr-3 text-xs font-bold text-primary">#{shortId}</td>
                          <td className="py-2.5 pr-3 text-xs font-medium text-on-surface">{order.user?.name || 'Guest'}</td>
                          <td className="py-2.5 pr-3 text-xs text-on-surface-variant">{formatDate(order.createdAt)}</td>
                          <td className="py-2.5 pr-3 text-xs font-bold text-on-surface text-right">${(order.totalPrice || 0).toFixed(2)}</td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-2">receipt_long</span>
                <p className="text-sm font-semibold text-on-surface-variant">No orders yet</p>
              </div>
            )}
          </div>

          {/* Order Status */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">Order Status</h3>
            <div className="flex flex-col items-center gap-4">
              <DonutMini statusCounts={statusCounts} />
              <div className="w-full space-y-2">
                {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => {
                  const count = statusCounts[status] || 0;
                  const pct = totalStatusOrders > 0 ? Math.round((count / totalStatusOrders) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[status] }} />
                      <span className="text-xs text-on-surface flex-1">{status}</span>
                      <span className="text-xs font-bold text-on-surface-variant">{count}</span>
                      <span className="text-[10px] text-on-surface-variant w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Products + Recent Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Products */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Top Products</h3>
              <Link to="/admin/products" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            {bestSellers.length > 0 ? (
              <div className="space-y-3">
                {bestSellers.map((product, idx) => {
                  const sold = product.sold || product.unitsSold || 0;
                  const maxSold = bestSellers[0]?.sold || bestSellers[0]?.unitsSold || 1;
                  const pct = (sold / maxSold) * 100;
                  return (
                    <div key={product._id || idx} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-amber-50 text-amber-700' : 'bg-surface-container text-on-surface-variant'}`}>
                        {idx + 1}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-surface-container overflow-hidden shrink-0">
                        {product.images?.[0] || product.image ? (
                          <img src={product.images?.[0] || product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-on-surface-variant">{sold} sold</span>
                          <div className="flex-1 h-1 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-on-surface shrink-0">${(product.price || 0).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-2">trending_up</span>
                <p className="text-sm font-semibold text-on-surface-variant">No sales data</p>
              </div>
            )}
          </div>

          {/* Recent Customers */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Recent Customers</h3>
              <Link to="/admin/customers" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            {recentCustomers.length > 0 ? (
              <div className="space-y-1">
                {recentCustomers.map((customer) => (
                  <div key={customer._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {getInitials(customer.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{customer.name}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{customer.email}</p>
                    </div>
                    <span className="text-[10px] text-on-surface-variant shrink-0">{formatDate(customer.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-2">group</span>
                <p className="text-sm font-semibold text-on-surface-variant">No customers yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockProducts.length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                Low Stock Alerts
              </h3>
              <Link to="/admin/inventory" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {lowStockProducts.map((product) => {
                const stock = product.countInStock ?? 0;
                const isUrgent = stock === 0;
                return (
                  <div key={product._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <span className={`material-symbols-outlined text-lg shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`}>
                      {isUrgent ? 'error' : 'warning'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface truncate">{product.name}</p>
                      <p className={`text-[10px] font-bold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                        {stock === 0 ? 'Out of stock' : `${stock} left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
