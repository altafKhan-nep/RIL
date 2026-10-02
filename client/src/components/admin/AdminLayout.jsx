import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard:view' },
  { to: '/admin/banners', label: 'Banners', icon: 'view_carousel', permission: 'banners:view' },
  { to: '/admin/categories', label: 'Categories', icon: 'category', permission: 'categories:view' },
  { to: '/admin/items', label: 'Items', icon: 'inventory_2', permission: 'products:view' },
  { to: '/admin/navigation', label: 'Navigation', icon: 'menu', permission: 'navigation:view' },
  { to: '/admin/orders', label: 'Orders', icon: 'shopping_cart', permission: 'orders:view' },
  { to: '/admin/customers', label: 'Customers', icon: 'people', permission: 'customers:view' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'warehouse', permission: 'inventory:view' },
  { to: '/admin/promotions', label: 'Promotions', icon: 'local_offer', permission: 'promotions:view' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'analytics', permission: 'analytics:view' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'settings:view' },
];

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  content_manager: 'Content Manager',
  order_manager: 'Order Manager',
  customer: 'Customer',
};

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  content_manager: 'bg-teal-100 text-teal-800',
  order_manager: 'bg-amber-100 text-amber-800',
  customer: 'bg-gray-100 text-gray-800',
};

const AdminLayout = ({ children }) => {
  const { user, logout, hasPermission, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount] = useState(3);

  const profileRef = useRef(null);
  const searchInputRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/items?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    closeMobileSidebar();
    setProfileOpen(false);
  }, [location.pathname, closeMobileSidebar]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setProfileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  const renderNavItem = (item) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
          active
            ? 'bg-primary-container text-on-primary-container shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        } ${collapsed ? 'justify-center px-0 mx-2' : ''}`}
      >
        <span
          className={`material-symbols-outlined text-[22px] shrink-0 ${
            active ? 'text-on-primary-container' : 'text-on-surface-variant group-hover:text-on-surface'
          }`}
          style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
        >
          {item.icon}
        </span>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const roleBadge = user?.role
    ? ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'
    : null;
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Admin';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-surface-container-low border-r border-surface-container/60 transition-all duration-300 ease-in-out ${sidebarWidth} shrink-0 z-30`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-surface-container/60 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Link to="/admin" className="flex items-center gap-2 group">
            <span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center group-hover:animate-wiggle transition-transform shrink-0">
              <span
                className="material-symbols-outlined text-on-primary-container text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_mall
              </span>
            </span>
            {!collapsed && (
              <span className="font-headline-md text-headline-md font-bold text-primary whitespace-nowrap">
                NovaCart
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin">
          {NAV_ITEMS.filter((item) => hasPermission(item.permission)).map((item) => renderNavItem(item))}
        </nav>

        {/* Role badge + collapse toggle */}
        <div className="border-t border-surface-container/60 p-3 space-y-3">
          {!collapsed && (
            <div className={`text-center text-xs font-semibold py-1.5 rounded-lg ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}>
              {ROLE_LABELS[role] || role}
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span
              className="material-symbols-outlined text-[22px] transition-transform duration-300"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              menu_open
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-surface-container-low border-r border-surface-container/60 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-surface-container/60">
          <Link to="/admin" className="flex items-center gap-2 group" onClick={closeMobileSidebar}>
            <span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center group-hover:animate-wiggle transition-transform shrink-0">
              <span
                className="material-symbols-outlined text-on-primary-container text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_mall
              </span>
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              NovaCart
            </span>
          </Link>
          <button
            onClick={closeMobileSidebar}
            className="p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Close sidebar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mobile nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.filter((item) => hasPermission(item.permission)).map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMobileSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] shrink-0 ${
                    active ? 'text-on-primary-container' : ''
                  }`}
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile role badge */}
        {roleBadge && (
          <div className="border-t border-surface-container/60 p-3">
            <div className={`text-center text-xs font-semibold py-1.5 rounded-lg ${roleBadge}`}>
              {roleLabel}
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-surface/95 backdrop-blur-md border-b border-surface-container/60 flex items-center justify-between px-4 md:px-6 gap-4 shrink-0 z-20">
          {/* Left: hamburger + search */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger (mobile) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full bg-surface-container-low rounded-lg py-2 pl-10 pr-16 text-sm text-on-surface border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all duration-300 outline-none"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 text-[10px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded border border-surface-container/60">
                ⌘K
              </kbd>
            </form>
          </div>

          {/* Right: quick actions + notifications + profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick actions */}
            <Link
              to="/admin/items/new"
              className="hidden md:inline-flex items-center gap-1.5 btn-primary text-on-primary-container text-sm font-semibold px-3 py-2 rounded-lg transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span className="hidden xl:inline">Add Product</span>
            </Link>
            <Link
              to="/admin/categories/new"
              className="hidden md:inline-flex items-center gap-1.5 btn-ghost text-sm font-semibold px-3 py-2 rounded-lg transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span className="hidden xl:inline">Add Category</span>
            </Link>

            {/* Divider */}
            <div className="hidden md:block w-px h-6 bg-outline-variant/50" />

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-on-primary text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-surface leading-none">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-outline-variant/50" />

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(user?.name)}
                </span>
                <div className="hidden md:flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium text-on-surface truncate max-w-[120px]">
                    {user?.name || 'Admin'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant capitalize">
                    {user?.role || 'admin'}
                  </span>
                </div>
                <span
                  className={`material-symbols-outlined text-lg text-on-surface-variant transition-transform duration-200 hidden md:block ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-level-2 border border-surface-container/60 py-2 z-50 animate-fade-up">
                  {/* Profile header */}
                  <div className="px-4 py-3 border-b border-surface-container/60">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-base font-bold">
                        {getInitials(user?.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{user?.name || 'Admin User'}</p>
                        <p className="text-xs text-on-surface-variant truncate">{user?.email || 'admin@novacart.com'}</p>
                        {roleBadge && (
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge}`}>
                            {roleLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      to="/admin/settings/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">person</span>
                      My Profile
                    </Link>
                    <Link
                      to="/admin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">settings</span>
                      Account Settings
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-surface-container/60 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
