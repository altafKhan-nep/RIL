import { useState, useEffect, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { getIcon } from './CategoryIcons';

const CategorySidebar = ({ activeCategory }) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [dbCategories, setDbCategories] = useState([]);
  const [sidebarPromo, setSidebarPromo] = useState(null);

  useEffect(() => {
    api.getPublicCategories().then(setDbCategories).catch(() => {});
    api.getSidebarPromo().then(setSidebarPromo).catch(() => {});
  }, []);

  const items = [
    { label: t('sidebar.allProducts'), name: '', slug: '' },
    ...dbCategories.map((c) => ({
      label: c.name,
      name: c.name,
      slug: c.slug,
      productCount: c.productCount,
    })),
  ];

  return (
    <aside className="flex flex-col w-full lg:w-[232px] lg:h-[calc(100vh-108px)] lg:rounded-2xl lg:sticky lg:top-[108px] lg:shrink-0 overflow-hidden bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-outline-variant/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[15px] text-primary">category</span>
          </div>
          <h2 className="text-[12px] font-bold text-on-surface tracking-wide uppercase">{t('sidebar.browseCategories')}</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto overscroll-contain">
        {items.map((item) => {
          const isActive = item.name ? item.name === activeCategory : !activeCategory;
          const IconComponent = getIcon(item.name);

          return (
            <Link
              key={item.label}
              to={item.slug ? `/shop/${encodeURIComponent(item.slug)}` : '/shop'}
              className={`relative flex items-center gap-3 px-4 py-3 text-[13px] transition-all duration-150 whitespace-nowrap group ${
                isActive
                  ? 'bg-primary/[0.06] text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-primary/[0.03] hover:text-on-surface'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}

              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10'
                  : 'bg-surface-container-high/60 group-hover:bg-primary/[0.06]'
              }`}>
                <IconComponent className={`w-[16px] h-[16px] transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant/35 group-hover:text-primary/60'
                }`} />
              </span>

              <span className="flex-1 truncate">{item.label}</span>

              {item.productCount != null && item.productCount > 0 && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md tabular-nums transition-colors duration-200 ${
                  isActive ? 'bg-primary/12 text-primary' : 'bg-surface-container-high/60 text-on-surface-variant/35'
                }`}>
                  {item.productCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Promo */}
      {sidebarPromo && (
        <div className="p-3 border-t border-outline-variant/8 hidden lg:block">
          <div
            className="relative rounded-2xl p-4 text-center overflow-hidden"
            style={{ backgroundColor: sidebarPromo.sidebarBgColor || '#a43c12' }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white/[0.08] pointer-events-none" />
            <div className="absolute -bottom-6 -left-3 w-10 h-10 rounded-full bg-white/[0.05] pointer-events-none" />

            <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 relative">
              {sidebarPromo.sidebarTitle || 'Special Offer'}
            </p>
            <p className="text-white text-xl font-extrabold leading-tight relative">
              {sidebarPromo.type === 'percentage'
                ? `${sidebarPromo.value}% OFF`
                : sidebarPromo.type === 'fixed'
                  ? `$${sidebarPromo.value} OFF`
                  : sidebarPromo.sidebarSubtitle || `${sidebarPromo.value}% OFF`}
            </p>
            <p className="text-white/50 text-[10px] font-medium mt-1 relative">
              Code: <span className="font-bold text-white/70">{sidebarPromo.code}</span>
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="mt-3 w-full bg-white/[0.92] text-[12px] font-bold py-2 rounded-xl hover:bg-white active:bg-white/90 transition-all duration-200 shadow-sm relative"
              style={{ color: sidebarPromo.sidebarBgColor || '#a43c12' }}
            >
              {sidebarPromo.sidebarButtonText || t('sidebar.shopNow')}
            </button>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-outline-variant/8 space-y-2 hidden lg:block">
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-on-surface-variant bg-surface-container-high/60 hover:bg-surface-container-high active:bg-surface-container-highest transition-all duration-150"
          >
            <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
            {t('sidebar.adminPanel')}
          </button>
        )}
        {!user && (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80 shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[15px]">login</span>
            {t('sidebar.signin')}
          </button>
        )}
      </div>
    </aside>
  );
};

export default memo(CategorySidebar);
