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

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Processing: '#3b82f6',
  Shipped: '#14b8a6',
  Delivered: '#10b981',
  Cancelled: '#ef4444',
};

const STATUS_BG = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Processing: 'bg-blue-50 text-blue-700 border border-blue-200',
  Shipped: 'bg-teal-50 text-teal-700 border border-teal-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

const CATEGORY_ICONS = {
  Electronics: 'devices',
  Fashion: 'checkroom',
  'Home Decor': 'home',
  Toys: 'sports_esports',
  Books: 'menu_book',
  Sports: 'fitness_center',
  Beauty: 'spa',
  Other: 'category',
};

const DATE_RANGES = [
  { label: 'This Month', value: 'this-month' },
  { label: 'Last 3 Months', value: 'last-3-months' },
  { label: 'Last 6 Months', value: 'last-6-months' },
  { label: 'This Year', value: 'this-year' },
];

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatCurrency = (val) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
};

const formatNumber = (val) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString();
};

const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = typeof value === 'number' ? value : 0;
    const duration = 800;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : formatNumber(display)}{suffix}</span>;
};

const TrendBadge = ({ value, label }) => {
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

const AreaChart = ({ data, valueKey, labelKey, height = 280, color = '#a43c12', secondaryData, secondaryColor, secondaryLabel }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-3">bar_chart</span>
          <p className="text-sm font-semibold text-on-surface-variant">No data available</p>
        </div>
      </div>
    );
  }

  const allValues = [...data.map(d => d[valueKey] || 0), ...(secondaryData ? secondaryData.map(d => d[valueKey] || 0) : [])];
  const maxValue = Math.max(...allValues, 1);
  const padding = 40;
  const chartWidth = 100;

  const buildPath = (dataset, key) => {
    const points = dataset.map((d, i) => {
      const x = (i / (dataset.length - 1)) * chartWidth;
      const y = height - padding - ((d[key] || 0) / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    });
    return { line: `M${points.join(' L')}`, area: `M0,${height - padding} L${points.join(' L')} L${chartWidth},${height - padding} Z` };
  };

  const primary = buildPath(data, valueKey);
  const secondary = secondaryData ? buildPath(secondaryData, valueKey || 'count') : null;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Revenue Trend</h3>
        {secondaryData && (
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: secondaryColor }} />{secondaryLabel}</span>
          </div>
        )}
      </div>
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
            {secondary && (
              <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.15" />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.01" />
              </linearGradient>
            )}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = height - padding - pct * (height - padding * 2);
            const val = maxValue * pct;
            return (
              <g key={pct}>
                <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
                <text x="-1" y={y + 1.2} fill="#9ca3af" fontSize="2.8" textAnchor="end" dominantBaseline="middle">{formatCurrency(val)}</text>
              </g>
            );
          })}
          {secondary && <path d={secondary.area} fill={`url(#areaGrad2)`} />}
          {secondary && <path d={secondary.line} fill="none" stroke={secondaryColor} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />}
          <path d={primary.area} fill="url(#areaGrad)" />
          <path d={primary.line} fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * chartWidth;
            const y = height - padding - ((d[valueKey] || 0) / maxValue) * (height - padding * 2);
            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: 'pointer' }}>
                <rect x={x - 2} y={padding} width="4" height={height - padding * 2} fill="transparent" />
                {hoveredIdx === i && (
                  <>
                    <line x1={x} y1={padding} x2={x} y2={height - padding} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
                    <circle cx={x} cy={y} r="1.5" fill={color} stroke="white" strokeWidth="0.5" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {hoveredIdx !== null && (
          <div className="absolute top-2 right-2 bg-on-surface text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl pointer-events-none animate-fade-up z-10">
            <div className="text-[10px] opacity-70 mb-0.5">{data[hoveredIdx][labelKey]}</div>
            <div>${(data[hoveredIdx][valueKey] || 0).toLocaleString()}</div>
            {secondary && secondaryData && secondaryData[hoveredIdx] && (
              <div className="text-[10px] opacity-70 mt-1">{secondaryLabel}: {secondaryData[hoveredIdx].value || 0}</div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between mt-2 px-2">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] text-on-surface-variant font-medium">{d[labelKey]}</span>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({ statusCounts }) => {
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-5">Order Status</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-3">donut_large</span>
          <p className="text-sm font-semibold text-on-surface-variant">No orders yet</p>
        </div>
      </div>
    );
  }

  const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  let cumulativePercent = 0;
  const segments = statuses.map((status) => {
    const count = statusCounts[status] || 0;
    const percent = total > 0 ? (count / total) * 100 : 0;
    const start = cumulativePercent;
    cumulativePercent += percent;
    return { status, count, percent, start };
  });

  const gradientParts = [];
  let offset = 0;
  segments.forEach((seg) => {
    if (seg.percent > 0) {
      gradientParts.push(`${STATUS_COLORS[seg.status]} ${offset}% ${offset + seg.percent}%`);
      offset += seg.percent;
    }
  });

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
      <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-5">Order Status</h3>
      <div className="flex flex-col items-center gap-6">
        <div className="relative shrink-0">
          <div
            className="w-44 h-44 rounded-full transition-all duration-300"
            style={{
              background: `conic-gradient(${gradientParts.join(', ') || 'transparent'})`,
              transform: hoveredStatus ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-surface-container-lowest flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-bold text-on-surface">{total}</span>
              <span className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-wider">Total</span>
            </div>
          </div>
        </div>
        <div className="w-full space-y-3">
          {statuses.map((status) => {
            const count = statusCounts[status] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isHovered = hoveredStatus === status;
            return (
              <div
                key={status}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${isHovered ? 'bg-surface-container-high' : 'hover:bg-surface-container-low'}`}
                onMouseEnter={() => setHoveredStatus(status)}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[status] }} />
                <span className="text-sm text-on-surface flex-1 font-medium">{status}</span>
                <span className="text-sm font-bold text-on-surface">{count}</span>
                <span className="text-xs text-on-surface-variant w-12 text-right font-semibold">{pct}%</span>
                <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: STATUS_COLORS[status] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [dateRange, setDateRange] = useState('last-6-months');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, statsRes] = await Promise.allSettled([
        api.getAnalytics(),
        api.getAdminStats(),
      ]);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    } catch {
      setToast({ message: 'Failed to load analytics data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthlyRevenue = analytics?.revenueByMonth || stats?.monthlySales || [];
  const orderStatusRaw = analytics?.ordersByStatus || stats?.statusCounts || {};
  const orderStatusCounts = Array.isArray(orderStatusRaw)
    ? orderStatusRaw.reduce((acc, item) => { acc[item._id || item.status] = item.count; return acc; }, {})
    : orderStatusRaw;
  const topCategories = analytics?.topCategories || [];
  const topProducts = analytics?.topProducts || [];
  const monthlyUsers = analytics?.customerGrowth || [];

  const filteredRevenue = monthlyRevenue.filter((m) => {
    const date = m.date || m.month;
    if (!date || dateRange === 'this-year') return true;
    const d = new Date(date);
    const now = new Date();
    if (dateRange === 'this-month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateRange === 'last-3-months') { const t = new Date(now); t.setMonth(t.getMonth() - 3); return d >= t; }
    if (dateRange === 'last-6-months') { const t = new Date(now); t.setMonth(t.getMonth() - 6); return d >= t; }
    return true;
  });

  const chartRevenueData = filteredRevenue.map(m => ({
    ...m,
    total: m.revenue || m.total || m.sales || 0,
    month: m._id?.month ? monthNames[m._id.month - 1] : m.month || m.label || m.name,
  }));

  const chartCustomerData = monthlyUsers.map(u => ({
    ...u,
    count: u.count || 0,
    month: u._id?.month ? monthNames[u._id.month - 1] : u.month || u.label || u.name,
  }));

  const totalRevenue = filteredRevenue.reduce((sum, m) => sum + (m.revenue || m.total || m.sales || 0), 0);
  const filteredOrderCount = filteredRevenue.reduce((sum, m) => sum + (m.orders || 0), 0);
  const avgOrderValue = filteredOrderCount > 0 ? totalRevenue / filteredOrderCount : 0;
  const repeatRate = stats?.repeatCustomerRate || 0;

  const revenueChange = stats?.revenue?.percentageChange || 0;
  const ordersChange = stats?.orders?.percentageChange || 0;
  const totalCustomers = stats?.totalCustomers || 0;
  const totalOrders = stats?.totalOrders || 0;
  const lowStock = stats?.lowStockProducts || 0;

  const topCategoriesMaxRevenue = topCategories.length > 0
    ? Math.max(...topCategories.map((c) => c.revenue || 0), 1) : 1;

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
                <SkeletonPulse className="h-3 w-16 mt-2" />
              </div>
            ))}
          </div>
          <SkeletonPulse className="h-72 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonPulse className="h-64" />
            <SkeletonPulse className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Analytics Dashboard</h1>
            <p className="text-on-surface-variant text-sm mt-1">Track your store performance and growth metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-surface-container-low rounded-xl p-1 border border-surface-container">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setDateRange(range.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dateRange === range.value
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
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
            <div className="mt-1.5"><TrendBadge value={revenueChange} label="vs last month" /></div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-lg">shopping_cart</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Orders</span>
            </div>
            <p className="text-xl font-bold text-on-surface"><AnimatedNumber value={totalOrders} /></p>
            <div className="mt-1.5"><TrendBadge value={ordersChange} label="vs last month" /></div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-lg">people</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Customers</span>
            </div>
            <p className="text-xl font-bold text-on-surface"><AnimatedNumber value={totalCustomers} /></p>
            <p className="text-[10px] text-on-surface-variant mt-1.5">{(repeatRate || 0).toFixed(1)}% repeat rate</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-lg">receipt_long</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Avg Order</span>
            </div>
            <p className="text-xl font-bold text-on-surface"><AnimatedNumber value={avgOrderValue} prefix="$" decimals={2} /></p>
            <p className="text-[10px] text-on-surface-variant mt-1.5">per order</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-lg">inventory_2</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">Low Stock</span>
            </div>
            <p className="text-xl font-bold text-on-surface">{lowStock}</p>
            <p className="text-[10px] text-on-surface-variant mt-1.5">products below 5 units</p>
          </div>
        </div>

        {/* Revenue Area Chart */}
        <AreaChart
          data={chartRevenueData}
          valueKey="total"
          labelKey="month"
          height={280}
          color="#a43c12"
          secondaryData={chartCustomerData.length > 0 ? chartCustomerData : null}
          secondaryColor="#006a62"
          secondaryLabel="New Customers"
        />

        {/* Donut + Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DonutChart statusCounts={orderStatusCounts} />

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-5">Top Categories</h3>
            {topCategories.length > 0 ? (
              <div className="space-y-4">
                {topCategories.slice(0, 6).map((cat, i) => {
                  const revenue = cat.revenue || 0;
                  const units = cat.unitsSold || 0;
                  const width = Math.max((revenue / topCategoriesMaxRevenue) * 100, 5);
                  const colors = ['#a43c12', '#006a62', '#ffe16d', '#f59e0b', '#10b981', '#8b5cf6'];
                  return (
                    <div key={cat._id || i}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${colors[i % colors.length]}15` }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: colors[i % colors.length] }}>
                            {CATEGORY_ICONS[cat._id] || 'category'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-on-surface truncate">{cat._id || 'Unknown'}</span>
                            <span className="text-sm font-bold ml-2" style={{ color: colors[i % colors.length] }}>{formatCurrency(revenue)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-on-surface-variant">{units} units</span>
                            <span className="text-[10px] text-on-surface-variant">{cat.orderCount || 0} orders</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, background: colors[i % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-3">category</span>
                <p className="text-sm font-semibold text-on-surface-variant">No category data</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Top Products</h3>
            <span className="text-xs text-on-surface-variant">{topProducts.length} products</span>
          </div>
          {topProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topProducts.slice(0, 5).map((product, i) => {
                const revenue = product.revenue || 0;
                const units = product.unitsSold || 0;
                const maxRev = topProducts[0]?.revenue || 1;
                const pct = (revenue / maxRev) * 100;
                return (
                  <div key={product._id || i} className="relative bg-surface-container-low rounded-xl p-4 border border-surface-container hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {i + 1}
                    </div>
                    <div className="w-full aspect-square rounded-lg bg-surface-container overflow-hidden mb-3">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-surface-variant/30 text-3xl">image</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-on-surface truncate mb-1">{product.name}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-on-surface-variant">{units} sold</span>
                      <span className="text-xs font-bold text-primary">{formatCurrency(revenue)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-3">trending_up</span>
              <p className="text-sm font-semibold text-on-surface-variant">No product data yet</p>
            </div>
          )}
        </div>

        {/* Recent Orders + Customer Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Orders */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Recent Orders</h3>
              <a href="/admin/orders" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">View All</a>
            </div>
            <div className="space-y-3">
              {(stats?.recentOrders || []).slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{order.user?.name || 'Guest'}</p>
                    <p className="text-[10px] text-on-surface-variant">#{order._id?.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-on-surface">${(order.totalPrice || 0).toFixed(2)}</p>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BG[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">shopping_bag</span>
                  <p className="text-sm text-on-surface-variant mt-2">No orders yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Growth */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-5">Customer Growth</h3>
            {chartCustomerData.length > 0 ? (
              <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
                {chartCustomerData.map((item, i) => {
                  const val = item.count || 0;
                  const maxVal = Math.max(...chartCustomerData.map(d => d.count || 0), 1);
                  const barH = Math.max((val / maxVal) * 100, 3);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group relative">
                      <div className="absolute -top-9 z-10 bg-on-surface text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {val} customers
                      </div>
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 group-hover:from-teal-700 group-hover:to-teal-500 transition-all duration-300" style={{ height: `${barH}%` }} />
                      <span className="text-[9px] text-on-surface-variant font-medium">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-3">group_add</span>
                <p className="text-sm font-semibold text-on-surface-variant">No data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
