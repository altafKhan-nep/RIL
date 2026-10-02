import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import CategoryIcons, { getIcon } from './CategoryIcons';

const SectionLabel = ({ children, count }) => (
  <div className="flex items-center justify-between px-5 pt-4 pb-2">
    <span className="text-[10px] font-bold text-on-surface-variant/35 uppercase tracking-[0.15em]">{children}</span>
    {count != null && (
      <span className="text-[10px] font-medium text-on-surface-variant/25 tabular-nums">{count}</span>
    )}
  </div>
);

const CategoryDrawer = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { itemsCount } = useCart();
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const quickLinks = [
    { label: t('sidebar.todaysDeals'), desc: t('sidebar.limitedOffers'), icon: 'local_offer', path: '/shop?flash=true', gradient: 'from-red-500/10 to-orange-500/5', iconColor: 'text-red-500', hoverBorder: 'hover:border-red-200' },
    { label: t('sidebar.newArrivals'), desc: t('sidebar.justLanded'), icon: 'new_releases', path: '/shop?sort=newest', gradient: 'from-blue-500/10 to-cyan-500/5', iconColor: 'text-blue-500', hoverBorder: 'hover:border-blue-200' },
    { label: t('sidebar.bestSellers'), desc: t('sidebar.customerFavourites'), icon: 'trending_up', path: '/shop?sort=popular', gradient: 'from-emerald-500/10 to-teal-500/5', iconColor: 'text-emerald-500', hoverBorder: 'hover:border-emerald-200' },
    { label: t('sidebar.allProducts'), desc: t('sidebar.browseEverything'), icon: 'inventory_2', path: '/shop', gradient: 'from-purple-500/10 to-violet-500/5', iconColor: 'text-purple-500', hoverBorder: 'hover:border-purple-200' },
  ];

  useEffect(() => {
    if (open) {
      api.getPublicCategories().then(setCategories).catch(() => {});
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleCategoryClick = (slug) => {
    onClose();
    navigate(slug ? `/shop/${encodeURIComponent(slug)}` : '/shop');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onClose();
      navigate(`/shop?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-all duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 left-0 z-[70] h-full w-[320px] max-w-[85vw] bg-white shadow-[2px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ─── Header ─── */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/90 px-5 pt-5 pb-5 shrink-0">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/[0.06] pointer-events-none" />
          <div className="absolute -bottom-12 -left-6 w-20 h-20 rounded-full bg-white/[0.04] pointer-events-none" />

          {/* Top row: Brand + Close */}
          <div className="flex items-start justify-between relative z-10 mb-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/[0.15] backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/10">
                <svg className="w-5.5 h-5.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
                </svg>
              </div>
              <div>
                <span className="text-[15px] font-bold text-white block leading-tight tracking-tight">NovaCart</span>
                <span className="text-[10px] text-white/50 font-medium tracking-wide">Joyful Shopping</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all duration-200 shrink-0"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative z-10">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 text-[18px]">search</span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('nav.search')}
              className="w-full bg-white/[0.12] backdrop-blur-sm rounded-2xl py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-white/35 outline-none focus:bg-white/[0.2] focus:ring-2 focus:ring-white/15 transition-all duration-200"
            />
          </form>
        </div>

        {/* ─── User Section ─── */}
        {user && (
          <div className="px-5 py-3.5 border-b border-outline-variant/8 bg-gradient-to-r from-surface-container-low/60 to-transparent shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary text-[13px] font-bold shadow-sm">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-on-surface truncate leading-tight">{user.name}</p>
                <p className="text-[11px] text-on-surface-variant/45 truncate mt-0.5">{user.email}</p>
              </div>
              {itemsCount > 0 && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  {itemsCount} {t('cart.items')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Scrollable Content ─── */}
        <nav className="flex-1 overflow-y-auto overscroll-contain">
          {/* Categories */}
          <div>
            <SectionLabel count={`${filteredCategories.length + 1} total`}>{t('sidebar.browseCategories')}</SectionLabel>

            {/* All Products */}
            <button
              onClick={() => handleCategoryClick('')}
              className="w-full flex items-center gap-3.5 px-5 py-3 text-left hover:bg-primary/[0.04] active:bg-primary/[0.08] transition-all duration-150 group"
            >
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/10 transition-all duration-200 shrink-0 shadow-sm shadow-primary/[0.03]">
                <CategoryIcons.All className="w-[18px] h-[18px] text-primary/50 group-hover:text-primary transition-colors duration-200" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors duration-200 block">{t('sidebar.allProducts')}</span>
                <span className="text-[11px] text-on-surface-variant/35 block mt-0.5">{t('sidebar.browseEverything')}</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/15 group-hover:text-primary/30 group-hover:translate-x-0.5 transition-all duration-200">chevron_right</span>
            </button>

            <div className="mx-5 h-px bg-outline-variant/8" />

            {/* Category items */}
            {filteredCategories.map((cat, index) => {
              const IconComp = getIcon(cat.name);
              return (
                <button
                  key={cat._id}
                  onClick={() => handleCategoryClick(cat.slug || cat.name)}
                  className="w-full flex items-center gap-3.5 px-5 py-3 text-left hover:bg-primary/[0.04] active:bg-primary/[0.08] transition-all duration-150 group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <span className="w-10 h-10 rounded-2xl bg-surface-container-high/80 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-200 shrink-0">
                    <IconComp className="w-[18px] h-[18px] text-on-surface-variant/40 group-hover:text-primary transition-colors duration-200" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors duration-200 block truncate">{cat.name}</span>
                    {cat.productCount > 0 && (
                      <span className="text-[11px] text-on-surface-variant/35 block mt-0.5">{cat.productCount} {t('categories.products')}</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant/15 group-hover:text-primary/30 group-hover:translate-x-0.5 transition-all duration-200">chevron_right</span>
                </button>
              );
            })}

            {filteredCategories.length === 0 && searchQuery && (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-high/60 flex items-center justify-center mx-auto mb-2">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant/20">search_off</span>
                </div>
                <p className="text-[12px] text-on-surface-variant/35">{t('common.noResults')}</p>
              </div>
            )}
          </div>

          <div className="mx-5 h-px bg-outline-variant/8" />

          {/* Quick Links */}
          <div>
            <SectionLabel>{t('sidebar.quickLinks')}</SectionLabel>
            <div className="px-5 pb-2 grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => { onClose(); navigate(link.path); }}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-outline-variant/8 ${link.hoverBorder} bg-gradient-to-br ${link.gradient} hover:shadow-sm transition-all duration-200 group`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 shadow-sm ${link.iconColor} group-hover:scale-105 transition-transform duration-200`}>
                    <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                  </span>
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-on-surface block leading-tight group-hover:text-primary transition-colors duration-200">{link.label}</span>
                    <span className="text-[10px] text-on-surface-variant/35 block mt-0.5">{link.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Flash Deals Promo */}
          <div className="px-5 py-3">
            <div className="relative bg-gradient-to-br from-tertiary/15 via-tertiary/8 to-transparent rounded-2xl p-4 border border-tertiary/10 overflow-hidden">
              {/* Decorative dot */}
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-tertiary/30 animate-pulse" />
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-tertiary/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-tertiary">local_fire_department</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-on-surface leading-tight">{t('sidebar.flashDeals')}</p>
                  <p className="text-[11px] text-on-surface-variant/45 mt-1 leading-relaxed">{t('sidebar.flashDesc')}</p>
                  <button
                    onClick={() => { onClose(); navigate('/shop?flash=true'); }}
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:gap-1.5 transition-all duration-200"
                  >
                    {t('sidebar.viewDeals')}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ─── Footer ─── */}
        <div className="border-t border-outline-variant/8 p-4 space-y-2.5 shrink-0 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/50">
          {isAdmin && (
            <button
              onClick={() => { onClose(); navigate('/admin'); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold text-on-surface-variant bg-surface-container-high/80 hover:bg-surface-container-high active:bg-surface-container-highest transition-all duration-150"
            >
              <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
              {t('sidebar.adminPanel')}
            </button>
          )}

          {user ? (
            <div className="flex gap-2">
              <button
                onClick={() => { onClose(); navigate('/account'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold text-on-surface-variant bg-surface-container-high/80 hover:bg-surface-container-high active:bg-surface-container-highest transition-all duration-150"
              >
                <span className="material-symbols-outlined text-[15px]">person</span>
                {t('nav.account')}
              </button>
              <button
                onClick={() => { onClose(); navigate('/cart'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold text-on-surface-variant bg-surface-container-high/80 hover:bg-surface-container-high active:bg-surface-container-highest transition-all duration-150 relative"
              >
                <span className="material-symbols-outlined text-[15px]">shopping_cart</span>
                {t('nav.cart')}
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                    {itemsCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onClose(); navigate('/login'); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[17px]">login</span>
              {t('sidebar.signin')}
            </button>
          )}

          {/* Help links */}
          <div className="flex items-center justify-center gap-5 pt-1.5 pb-1">
            <button onClick={() => { onClose(); navigate('/help'); }} className="text-[11px] text-on-surface-variant/30 hover:text-primary transition-colors duration-200 py-2 px-1">{t('nav.help')}</button>
            <span className="w-1 h-1 rounded-full bg-on-surface-variant/15" />
            <button onClick={() => { onClose(); navigate('/privacy'); }} className="text-[11px] text-on-surface-variant/30 hover:text-primary transition-colors duration-200 py-2 px-1">Privacy</button>
            <span className="w-1 h-1 rounded-full bg-on-surface-variant/15" />
            <button onClick={() => { onClose(); navigate('/terms'); }} className="text-[11px] text-on-surface-variant/30 hover:text-primary transition-colors duration-200 py-2 px-1">Terms</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryDrawer;
