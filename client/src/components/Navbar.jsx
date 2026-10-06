import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { formatPrice } from '../utils/helpers';
import CategoryDrawer from './CategoryDrawer';

const TopBar = () => {
  const [visible, setVisible] = useState(() => !localStorage.getItem('novacart_banner_dismissed'));
  const { language, toggleLanguage, t } = useLanguage();

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('novacart_banner_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="bg-[#111111] text-[#aaa] text-xs hidden md:block border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between h-9">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-[#aaa]">
            <span className="material-symbols-outlined text-[15px]">local_shipping</span>
            {t('nav.freeShipping')}
          </span>
          <span className="w-px h-3.5 bg-outline-variant/50" />
          <span className="flex items-center gap-1.5 text-[#aaa]">
            <span className="material-symbols-outlined text-[15px]">support_agent</span>
            24/7 {t('nav.support')}
          </span>
          <span className="w-px h-3.5 bg-outline-variant/50" />
          <a href="tel:18006682278" className="flex items-center gap-1.5 text-[#aaa] hover:text-[#C89B58] transition-colors">
            <span className="material-symbols-outlined text-[15px]">call</span>
            1-800-LIP-CART
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/account" className="flex items-center gap-1.5 text-[#aaa] hover:text-[#C89B58] transition-colors">
            <span className="material-symbols-outlined text-[15px]">location_on</span>
            {t('nav.trackOrder')}
          </Link>
          <Link to="/help" className="flex items-center gap-1.5 text-[#aaa] hover:text-[#C89B58] transition-colors">
            <span className="material-symbols-outlined text-[15px]">help</span>
            {t('nav.help')}
          </Link>
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[#aaa] hover:text-[#C89B58] transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[14px]">translate</span>
            {language === 'en' ? 'नेपाली' : 'English'}
          </button>
          <button
            onClick={dismiss}
            className="ml-1 p-2 rounded-lg hover:bg-white/10 transition-colors text-[#aaa]"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MiniCart = ({ open }) => {
  const { cartItems, itemsPrice, shippingPrice } = useCart();
  const { t } = useLanguage();
  const total = itemsPrice + shippingPrice;

  if (!open || cartItems.length === 0) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-white/10 overflow-hidden z-50 animate-fade-up">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{t('nav.cart')} ({cartItems.length})</h3>
          <Link to="/cart" className="text-xs font-semibold text-[#C89B58] hover:underline">{t('common.view')}</Link>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-surface-container/40">
        {cartItems.slice(0, 4).map((item, i) => (
          <div key={i} className="flex gap-3 p-4">
            <div className="w-14 h-14 rounded-lg bg-white/10 overflow-hidden shrink-0">
              <img src={item.images?.[0] || item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{item.name}</p>
              <p className="text-xs text-[#aaa] mt-0.5">{t('products.quantity')}: {item.qty}</p>
              <p className="text-xs font-bold text-[#C89B58] mt-1">{formatPrice(item.price * item.qty)}</p>
            </div>
          </div>
        ))}
        {cartItems.length > 4 && (
          <div className="px-4 py-2 text-center">
            <p className="text-xs text-[#aaa]">+ {cartItems.length - 4} {t('cart.items')}</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/10 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">{t('cart.subtotal')}</span>
          <span className="text-sm font-bold text-white">{formatPrice(total)}</span>
        </div>
        <Link to="/cart" className="block w-full text-center bg-[#C89B58] text-black text-sm font-semibold py-2.5 rounded-lg hover:bg-[#C89B58]/90 transition-colors">
          {t('cart.checkout')}
        </Link>
      </div>
    </div>
  );
};

const AccountDropdown = ({ open }) => {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();

  if (!open || !user) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-white/10 overflow-hidden z-50 animate-fade-up">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-black flex items-center justify-center text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-[#aaa] truncate">{user.email}</p>
          </div>
        </div>
      </div>
      <div className="p-2">
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] transition-colors">
            <span className="material-symbols-outlined text-lg">dashboard</span>
            {t('nav.admin')}
          </Link>
        )}
        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] transition-colors">
          <span className="material-symbols-outlined text-lg">person</span>
          {t('nav.account')}
        </Link>
        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] transition-colors">
          <span className="material-symbols-outlined text-lg">shopping_bag</span>
          {t('nav.orders')}
        </Link>
        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] transition-colors">
          <span className="material-symbols-outlined text-lg">favorite</span>
          {t('nav.wishlist')}
        </Link>
        <Link to="/help" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] transition-colors">
          <span className="material-symbols-outlined text-lg">help</span>
          {t('nav.help')}
        </Link>
      </div>
      <div className="p-2 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#aaa] hover:bg-error-container/30 hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { itemsCount } = useCart();
  const { user, logout, isAdmin } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [navItems, setNavItems] = useState([]);
  const [cartHover, setCartHover] = useState(false);
  const [accountHover, setAccountHover] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const cartTimeoutRef = useRef(null);
  const accountTimeoutRef = useRef(null);

  useEffect(() => {
    api.getActiveBanners('promo').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data);
        setActiveBanner(data[0]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.getNavigationByPosition('header').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setNavItems(data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?keyword=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setSearchFocused(false);
      setMobileOpen(false);
    }
  };

  const handleCartEnter = () => {
    clearTimeout(cartTimeoutRef.current);
    setCartHover(true);
  };

  const handleCartLeave = () => {
    cartTimeoutRef.current = setTimeout(() => setCartHover(false), 300);
  };

  const handleAccountEnter = () => {
    clearTimeout(accountTimeoutRef.current);
    setAccountHover(true);
  };

  const handleAccountLeave = () => {
    accountTimeoutRef.current = setTimeout(() => setAccountHover(false), 300);
  };

  const links = navItems.length > 0
    ? navItems.map((item) => ({ to: item.url, label: item.label }))
    : [
        { to: '/', label: t('nav.home') },
        { to: '/shop', label: t('nav.shop') },
        { to: '/shop?flash=true', label: t('nav.deals') },
        { to: '/shop?sort=newest', label: t('nav.newArrivals') },
      ];

  return (
    <>
      <TopBar />

      {activeBanner && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#C89B58] via-[#C89B58]/95 to-[#C89B58]/80">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-10 py-2.5 flex items-center justify-center gap-4">
            {activeBanner.image && (
              <img src={activeBanner.image} alt={activeBanner.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            )}
            <p className="text-[#111] text-sm font-semibold">
              {activeBanner.title}
              {activeBanner.subtitle && (
                <span className="font-normal text-[#111]/80 ml-2">{activeBanner.subtitle}</span>
              )}
            </p>
            <Link to={activeBanner.link || '/shop'} className="bg-[#111] text-white font-bold px-4 py-1.5 rounded-full text-xs hover:bg-[#222] transition-colors shrink-0">
              {activeBanner.ctaText || 'Shop Now'}
            </Link>
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[#3A2114]/98 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.4)]'
            : 'bg-[#3A2114]/95 backdrop-blur-md'
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-center h-16 lg:h-[72px]">
          {/* Hamburger — attached to left edge */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="hidden lg:flex p-3 text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] transition-colors -ml-1"
            aria-label="Browse Categories"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          <div className="flex items-center justify-between flex-1 gap-4 lg:gap-6 px-2 md:px-4 lg:px-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <span className="bg-[#F9F4ED] rounded-xl p-0.5 shrink-0 transition-opacity group-hover:opacity-85">
                <img
                  src="/logo_lip.png"
                  alt="Life In Pieces"
                  width={500}
                  height={500}
                  className="h-14 w-auto object-contain block"
                />
              </span>
              <div className="hidden sm:block">
                <span className="font-serif text-lg font-semibold text-white tracking-tight block leading-tight">
                  Life In Pieces
                </span>
                <span className="text-[10px] text-[#C89B58] font-medium tracking-[0.2em] uppercase leading-none">
                  {t('nav.curated')}
                </span>
              </div>
            </Link>

            {/* Desktop Search — Center */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-4">
              <form onSubmit={handleSearch} className="w-full relative">
                <div className={`flex items-center rounded-full border transition-all duration-300 ${
                  searchFocused
                    ? 'border-[#C89B58] bg-white/10 shadow-[0_2px_12px_rgba(212, 175, 55, 0.15)]'
                    : 'border-white/10 bg-white/10 hover:border-white/30'
                }`}>
                  <span className="material-symbols-outlined text-[#aaa] ml-4 text-[20px]">search</span>
                  <input
                    className="flex-1 bg-transparent py-2.5 px-3 text-sm text-white outline-none placeholder:text-white/40"
                    placeholder={t('nav.search')}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-2 mr-1 rounded-full hover:bg-white/10 text-[#aaa] transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#C89B58] text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#C89B58]/90 transition-colors m-0.5"
                  >
                    {t('common.search')}
                  </button>
                </div>
                {searchFocused && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-white/10 p-4 z-50">
                    <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-2">{t('sidebar.quickLinks')}</p>
                    <div className="flex flex-wrap gap-2">
                      {['Electronics', 'Fashion', 'Home Decor', 'Toys'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onMouseDown={() => { navigate(`/shop/${cat.toLowerCase().replace(' ', '-')}`); setSearchFocused(false); }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F3EEE8] text-[#7C6C60] hover:bg-[#C89B58]/20 hover:text-[#8C6A2F] transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-1 md:gap-1.5">
              {/* Wishlist */}
              <Link
                to="/account"
                className="hidden md:flex p-2.5 rounded-full text-[#aaa] hover:text-[#C89B58] hover:bg-white/10 transition-colors"
                aria-label="Wishlist"
              >
                <span className="material-symbols-outlined text-[22px]">favorite</span>
              </Link>

              {/* Cart — Hover Dropdown */}
              <div
                className="relative hidden md:block"
                onMouseEnter={handleCartEnter}
                onMouseLeave={handleCartLeave}
              >
                <Link
                  to="/cart"
                  aria-label="Shopping Cart"
                  className="relative p-2.5 rounded-full text-[#aaa] hover:text-[#C89B58] hover:bg-white/10 transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
                  {itemsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#C89B58] text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-[#3A2114] leading-none animate-fade-up">
                      {itemsCount}
                    </span>
                  )}
                </Link>
                <MiniCart open={cartHover} />
              </div>

              {/* Mobile Cart */}
              <Link
                to="/cart"
                aria-label="Shopping Cart"
                className="md:hidden relative p-2.5 rounded-full text-[#aaa] hover:text-[#C89B58] transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
                {itemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#C89B58] text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-[#3A2114] leading-none">
                    {itemsCount}
                  </span>
                )}
              </Link>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="hidden md:flex p-2.5 rounded-full text-[#aaa] hover:text-[#C89B58] hover:bg-white/10 transition-colors"
                title={language === 'en' ? 'नेपालीमा स्विच गर्नुहोस्' : 'Switch to English'}
              >
                <span className="material-symbols-outlined text-[22px]">translate</span>
              </button>

              {/* Divider */}
              <div className="hidden md:block w-px h-7 bg-outline-variant/40 mx-1" />

              {/* Account — Hover Dropdown */}
              {user ? (
                <div
                  className="hidden md:block relative"
                  onMouseEnter={handleAccountEnter}
                  onMouseLeave={handleAccountLeave}
                >
                  <button
                    onClick={() => navigate(isAdmin ? '/admin' : '/account')}
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full hover:bg-white/10 transition-colors group"
                  >
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 text-black flex items-center justify-center text-xs font-bold shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-white group-hover:text-[#C89B58] transition-colors max-w-[100px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <span className="material-symbols-outlined text-sm text-[#aaa]">expand_more</span>
                  </button>
                  <AccountDropdown open={accountHover} />
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:inline-flex items-center gap-1.5 bg-[#C89B58] text-black text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#C89B58]/90 hover:shadow-md transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  {t('nav.login')}
                </Link>
              )}

              {/* Mobile Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="lg:hidden p-2.5 rounded-full text-[#aaa] hover:text-[#C89B58] transition-colors"
                title={language === 'en' ? 'नेपालीमा स्विच गर्नुहोस्' : 'Switch to English'}
              >
                <span className="material-symbols-outlined text-[22px]">translate</span>
              </button>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2.5 rounded-full text-[#aaa] hover:bg-white/10 transition-colors"
                aria-label="Menu"
              >
                <span className="material-symbols-outlined text-[22px]">{mobileOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#3A2114] border-t border-white/10 animate-fade-up">
            <div className="px-4 py-4 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex items-center relative">
                <span className="material-symbols-outlined absolute left-3.5 text-[#aaa] text-lg pointer-events-none">search</span>
                <input
                  className="w-full bg-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white outline-none border border-transparent focus:border-[#C89B58]/30 transition-colors"
                  placeholder={t('nav.search')}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>

              {/* User Section */}
              {user && (
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-black flex items-center justify-center text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-[#aaa]">{isAdmin ? t('nav.admin') : t('checkout.shippingAddress')}</p>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-xs font-semibold text-[#C89B58]">
                      {t('nav.admin')}
                    </Link>
                  )}
                </div>
              )}

              {/* Nav Links */}
              <nav className="flex flex-col gap-0.5">
                {links.map((link) => (
                  <NavLink
                    key={link.label}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? 'bg-[#C89B58]/8 text-[#C89B58]' : 'text-[#aaa] hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Divider */}
              <div className="h-px bg-white/10" />

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-2">
                <Link to="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined text-lg text-[#aaa]">shopping_bag</span>
                  <span className="text-xs font-medium text-white">{t('nav.orders')}</span>
                </Link>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined text-lg text-[#aaa]">favorite</span>
                  <span className="text-xs font-medium text-white">{t('nav.wishlist')}</span>
                </Link>
                <Link to="/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined text-lg text-[#aaa]">help</span>
                  <span className="text-xs font-medium text-white">{t('nav.help')}</span>
                </Link>
                <Link to="/support" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined text-lg text-[#aaa]">support_agent</span>
                  <span className="text-xs font-medium text-white">{t('nav.support')}</span>
                </Link>
              </div>

              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 text-sm font-semibold text-[#aaa] hover:bg-white/10 hover:text-[#C89B58] hover:border-[#C89B58]/30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">translate</span>
                {language === 'en' ? 'नेपालीमा स्विच गर्नुहोस्' : 'Switch to English'}
              </button>

              {/* Auth Button */}
              {user ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 text-sm font-semibold text-[#aaa] hover:bg-error-container/30 hover:text-error hover:border-error/30 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  {t('nav.logout')}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-[#C89B58] text-black font-semibold py-3 rounded-full w-full text-sm"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <CategoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Navbar;
