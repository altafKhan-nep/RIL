import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';

const TrustBadge = ({ icon, title, desc }) => (
  <div className="flex items-center gap-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 px-4 py-3 group hover:shadow-ambient-surface hover:border-primary/20 transition-all duration-200">
    <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
    <div>
      <p className="text-[13px] font-semibold text-on-surface leading-tight">{title}</p>
      <p className="text-[11px] text-on-surface-variant/60 leading-tight">{desc}</p>
    </div>
  </div>
);

const CategoryTile = ({ name, icon, image, count, onClick }) => (
  <div
    onClick={onClick}
    className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden cursor-pointer group hover:shadow-ambient-surface hover:border-primary/20 transition-all duration-200"
  >
    <div className="relative aspect-[4/3] bg-surface-container overflow-hidden flex items-center justify-center">
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-primary-container/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl text-primary">{icon}</span>
        </div>
      )}
      {count > 0 && (
        <span className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm text-[10px] font-medium text-on-surface-variant px-1.5 py-0.5 rounded-md">
          {count} items
        </span>
      )}
    </div>
    <div className="px-3 py-2.5 text-center">
      <p className="text-[13px] font-medium text-on-surface group-hover:text-primary transition-colors">{name}</p>
    </div>
  </div>
);

const HomePage = () => {
  const [dbCategories, setDbCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashDeals, setFlashDeals] = useState([]);
  const [promoBanners, setPromoBanners] = useState([]);
  const [loading, setLoading] = useState({ categories: true, products: true, deals: true, promos: true });
  const navigate = useNavigate();

  useEffect(() => {
    api.getPublicCategories().then(setDbCategories).catch(() => {}).finally(() => setLoading(l => ({ ...l, categories: false })));
    api.getProducts({ pageSize: 9 }).then((data) => setProducts(data.products)).catch(() => {}).finally(() => setLoading(l => ({ ...l, products: false })));
    api.getFlashDeals().then(setFlashDeals).catch(() => {}).finally(() => setLoading(l => ({ ...l, deals: false })));
    api.getActiveBanners('promo').then(setPromoBanners).catch(() => {}).finally(() => setLoading(l => ({ ...l, promos: false })));
  }, []);

  const goCategory = (name) => navigate(`/shop/${encodeURIComponent(name)}`);

  return (
    <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-4 space-y-8">
      {/* Hero */}
      <HeroSection />

      {/* Trust Badges */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: 'local_shipping', title: 'Free Shipping', desc: 'On orders over $50' },
          { icon: 'lock', title: 'Secure Payment', desc: '100% protected' },
          { icon: 'replay', title: 'Easy Returns', desc: '30-day policy' },
          { icon: 'headset_mic', title: '24/7 Support', desc: 'Always here to help' },
        ].map((badge) => (
          <TrustBadge key={badge.title} {...badge} />
        ))}
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-on-surface">Shop by Category</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary hover:text-primary-container transition-colors">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {loading.categories
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-surface-container" />
                  <div className="px-3 py-2.5">
                    <div className="h-3 w-20 mx-auto rounded bg-surface-container-high" />
                  </div>
                </div>
              ))
            : dbCategories.map((cat) => (
                <CategoryTile
                  key={cat._id}
                  name={cat.name}
                  icon={cat.icon || 'category'}
                  image={cat.image}
                  count={cat.productCount}
                  onClick={() => goCategory(cat.slug || cat.name)}
                />
              ))}
        </div>
      </section>

      {/* Flash Deals */}
      {(loading.deals || flashDeals.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-error text-xl">flash_on</span>
              <h2 className="text-lg font-bold text-on-surface">Flash Deals</h2>
            </div>
            <Link to="/shop?flash=true" className="text-sm font-semibold text-primary hover:text-primary-container transition-colors">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {loading.deals
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-surface-container" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-16 rounded bg-surface-container-high" />
                      <div className="h-4 w-full rounded bg-surface-container-high" />
                      <div className="h-3 w-20 rounded bg-surface-container-high" />
                    </div>
                  </div>
                ))
              : flashDeals.slice(0, 4).map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-on-surface">Featured Products</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary hover:text-primary-container transition-colors">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {loading.products
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-surface-container" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-16 rounded bg-surface-container-high" />
                    <div className="h-4 w-full rounded bg-surface-container-high" />
                    <div className="h-3 w-20 rounded bg-surface-container-high" />
                  </div>
                </div>
              ))
            : products.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-inverse-surface rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-inverse-on-surface mb-1">Join the NovaCart Community</h2>
          <p className="text-inverse-on-surface/60 text-sm">Get exclusive deals, early access to new arrivals, and 10% off your first order.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 md:w-56 bg-inverse-on-surface/10 text-inverse-on-surface placeholder-inverse-on-surface/40 rounded-xl px-4 py-2.5 text-sm border border-inverse-on-surface/10 outline-none focus:border-primary transition-colors"
          />
          <button className="btn-primary font-semibold px-5 py-2.5 rounded-xl text-sm shrink-0">
            Subscribe
          </button>
        </div>
      </section>

      {/* Promo Banners */}
      {(loading.promos || promoBanners.length > 0) && (
        <section>
          <h2 className="text-lg font-bold text-on-surface mb-5">Special Offers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading.promos
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden animate-pulse">
                    <div className="aspect-[16/7] bg-surface-container" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-3 w-24 rounded bg-surface-container-high" />
                      <div className="h-2 w-32 rounded bg-surface-container-high" />
                    </div>
                  </div>
                ))
              : promoBanners.slice(0, 3).map((banner) => (
              <a
                key={banner._id}
                href={banner.link || '/shop'}
                className="group bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden hover:shadow-ambient-surface hover:border-primary/20 transition-all duration-200"
              >
                {banner.image && (
                  <div className="aspect-[16/7] overflow-hidden bg-surface-container">
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-3.5">
                  <h3 className="text-[13px] font-semibold text-on-surface mb-0.5">{banner.title}</h3>
                  {banner.subtitle && <p className="text-[11px] text-on-surface-variant/60 mb-1.5">{banner.subtitle}</p>}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    {banner.ctaText || 'Shop Now'}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: 'inventory_2', title: 'Curated Selection', desc: 'Hand-selected products for quality and design.' },
          { icon: 'local_shipping', title: 'Fast & Free Shipping', desc: 'Free shipping on orders over $50.' },
          { icon: 'handshake', title: 'Trusted by Thousands', desc: '10,000+ happy customers and counting.' },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 px-4 py-3 group hover:shadow-ambient-surface hover:border-primary/20 transition-all duration-200">
            <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
            <div>
              <p className="text-[13px] font-semibold text-on-surface">{item.title}</p>
              <p className="text-[11px] text-on-surface-variant/60">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default HomePage;
