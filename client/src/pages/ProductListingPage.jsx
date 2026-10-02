import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import CategorySidebar from '../components/CategorySidebar';
import ProductCard from '../components/ProductCard';
import ProductListRow from '../components/ProductListRow';

const SidebarBanners = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    api.getActiveBanners('sidebar').then(setBanners).catch(() => {});
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="hidden xl:flex flex-col gap-4 w-64 shrink-0">
      {banners.slice(0, 2).map((banner) => (
        <a
          key={banner._id}
          href={banner.link || '/shop'}
          className="group rounded-2xl overflow-hidden border border-surface-container/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
          style={{ background: banner.bgColor || '#fbf9f5' }}
        >
          {banner.image && (
            <div className="aspect-[4/3] overflow-hidden">
              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          <div className="p-3">
            <h3 className="text-xs font-bold text-on-surface mb-0.5">{banner.title}</h3>
            {banner.subtitle && <p className="text-[11px] text-on-surface-variant">{banner.subtitle}</p>}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary mt-1.5 group-hover:gap-1.5 transition-all">
              {banner.ctaText || 'Shop Now'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        </a>
      ))}
    </div>
  );
};

const ProductListingPage = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const keyword = searchParams.get('keyword') || '';
  const flash = searchParams.get('flash') === 'true';
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    const params = { pageNumber: page, pageSize: 9 };
    if (keyword) params.keyword = keyword;
    if (category) params.category = category;
    if (flash) params.flash = true;
    if (sort) {
      params[sort] = true;
    } else if (keyword) {
      params.relevance = true;
    }

    api.getProducts(params).then((data) => {
      setProducts(data.products);
      setPages(data.pages);
      setTotalResults(data.count || data.products?.length || 0);
    }).catch(() => {});
  }, [category, keyword, flash, sort, page]);

  const setSort = (value) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set('sort', value);
    else params.delete('sort');
    params.delete('page');
    navigate(`${window.location.pathname}?${params.toString()}`);
    setPage(1);
  };

  const title = flash ? 'Flash Deals' : keyword ? `Search: "${keyword}"` : category ? category : 'All Products';
  const isSearch = !!keyword;

  return (
    <main className="flex flex-1 w-full px-3 md:px-6 lg:px-8 pr-4 md:pr-margin-desktop py-6 gap-6">
      <CategorySidebar activeCategory={category} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumb */}
        <nav className="flex text-sm text-on-surface-variant mb-4 items-center gap-1.5 flex-wrap">
          <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>Home</span>
          <span className="material-symbols-outlined text-sm text-on-surface-variant/50">chevron_right</span>
          <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/shop')}>Shop</span>
          {category && (
            <>
              <span className="material-symbols-outlined text-sm text-on-surface-variant/50">chevron_right</span>
              <span className="text-primary font-semibold">{category}</span>
            </>
          )}
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface leading-tight">{title}</h1>
            {isSearch && totalResults > 0 && (
              <p className="text-sm text-on-surface-variant mt-1">
                Showing {((page - 1) * 9) + 1}–{Math.min(page * 9, totalResults)} of {totalResults.toLocaleString()} results for &ldquo;{keyword}&rdquo;
              </p>
            )}
            {!isSearch && products.length > 0 && (
              <p className="text-sm text-on-surface-variant mt-1">
                {products.length} products
              </p>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface-container-low text-on-surface text-sm rounded-lg px-4 py-2.5 border border-surface-container font-medium outline-none focus:border-primary-container transition-colors cursor-pointer"
          >
            <option value="">Sort by: Relevance</option>
            <option value="popular">Popularity</option>
            <option value="lowest">Price: Low to High</option>
            <option value="highest">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="bestseller">Bestseller</option>
          </select>
        </div>

        {/* Products */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-xl border border-surface-container/60">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">search_off</span>
            <h2 className="text-lg font-bold text-on-surface mt-4">No products found</h2>
            <p className="text-sm text-on-surface-variant mt-1">Try a different search or category.</p>
          </div>
        ) : isSearch ? (
          /* Flipkart-style list view for search results */
          <div className="flex flex-col gap-3">
            {products.map((product) => (
              <ProductListRow key={product._id} product={product} />
            ))}
          </div>
        ) : (
          /* Grid view for category / browse */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="w-10 h-10 md:w-9 md:h-9 rounded-lg flex items-center justify-center border border-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                  p === page
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'border border-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              className="w-10 h-10 md:w-9 md:h-9 rounded-lg flex items-center justify-center border border-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      <SidebarBanners />
    </main>
  );
};

export default ProductListingPage;
