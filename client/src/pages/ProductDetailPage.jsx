import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createSparkles } from '../utils/sparkles';
import { formatPrice, discountPercent, formatCurrency } from '../utils/helpers';
import ProductCard from '../components/ProductCard';

const SIZES_BY_CATEGORY = {
  Fashion: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Toys: ['Small', 'Medium', 'Large'],
  'Home Decor': ['Small', 'Medium', 'Large'],
};

const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />
);

const LoadingSkeleton = () => (
  <main className="flex-1 w-full bg-surface">
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center gap-1.5 mb-6">
        <SkeletonPulse className="h-3 w-10" />
        <SkeletonPulse className="h-3 w-3" />
        <SkeletonPulse className="h-3 w-12" />
        <SkeletonPulse className="h-3 w-3" />
        <SkeletonPulse className="h-3 w-20" />
      </div>
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10">
          <div>
            <SkeletonPulse className="aspect-square rounded-xl" />
            <div className="flex gap-2 mt-3 justify-center">
              {[1, 2, 3, 4].map((i) => <SkeletonPulse key={i} className="w-16 h-16 rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-4">
            <SkeletonPulse className="h-3 w-24" />
            <SkeletonPulse className="h-8 w-3/4" />
            <SkeletonPulse className="h-5 w-40" />
            <SkeletonPulse className="h-px w-full" />
            <SkeletonPulse className="h-10 w-48" />
            <SkeletonPulse className="h-20 w-full rounded-xl" />
            <SkeletonPulse className="h-16 w-full rounded-xl" />
            <SkeletonPulse className="h-12 w-full rounded-xl" />
            <div className="flex gap-3">
              <SkeletonPulse className="h-12 flex-1 rounded-xl" />
              <SkeletonPulse className="h-12 flex-1 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
);

const ImageGallery = ({ images, name, discount }) => {
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const displayImages = images?.length > 0 ? images : ['/placeholder.png'];

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-3">
      <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[500px] shrink-0 justify-center lg:justify-start scrollbar-hide">
        {displayImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-xl border-2 overflow-hidden shrink-0 transition-all duration-200 ${
              i === selected
                ? 'border-primary shadow-ambient-primary'
                : 'border-outline-variant/40 opacity-60 hover:opacity-100 hover:border-outline-variant'
            }`}
          >
            <img src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <div className="flex-1 relative">
        <div
          ref={imgRef}
          className="relative aspect-square bg-surface-container-lowest rounded-2xl border border-outline-variant/40 overflow-hidden cursor-crosshair"
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          <img
            src={displayImages[selected]}
            alt={name}
            className={`w-full h-full object-contain p-8 transition-transform duration-150 ${zoomed ? 'scale-[2.5]' : ''}`}
            style={zoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}}
          />
          {discount > 0 && (
            <span className="absolute top-4 left-4 bg-secondary text-on-secondary text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm z-10">
              {discount}% off
            </span>
          )}
          {zoomed && (
            <span className="absolute bottom-3 right-3 bg-on-surface/70 text-white text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-sm z-10 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">zoom_in</span>
              Zoomed
            </span>
          )}
        </div>
        <p className="text-[11px] text-on-surface-variant/50 text-center mt-2 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[12px]">touch_app</span>
          Hover image to zoom
        </p>
      </div>
    </div>
  );
};

const SectionLabel = ({ children, icon }) => (
  <p className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
    {icon && <span className="material-symbols-outlined text-[14px] text-primary">{icon}</span>}
    {children}
  </p>
);

const SizeSelector = ({ sizes, selectedSize, onSelect }) => {
  if (!sizes || sizes.length === 0) return null;
  return (
    <div className="mb-6">
      <SectionLabel icon="straighten">Size</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => onSelect(size)}
            className={`min-w-[52px] h-11 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
              selectedSize === size
                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                : 'border-outline-variant/60 text-on-surface-variant hover:border-outline hover:bg-surface-container-low'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
};

const ColorSelector = ({ colors, selectedColor, onSelect }) => {
  if (!colors || colors.length === 0) return null;
  const colorLabels = { '#ff7f50': 'Coral', '#006a62': 'Teal', '#1b1c1a': 'Black', '#ffffff': 'White' };
  return (
    <div className="mb-6">
      <SectionLabel>Color{selectedColor ? <span className="font-normal text-on-surface-variant ml-1">- {colorLabels[selectedColor] || selectedColor}</span> : ''}</SectionLabel>
      <div className="flex gap-3">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`w-11 h-11 rounded-full transition-all duration-200 ${
              selectedColor === color
                ? 'ring-2 ring-offset-[3px] ring-primary shadow-sm'
                : 'ring-1 ring-offset-[2px] ring-outline-variant hover:ring-outline'
            }`}
            style={{ backgroundColor: color }}
            title={colorLabels[color] || color}
          />
        ))}
      </div>
    </div>
  );
};

const DeliveryCheck = ({ stock }) => {
  const [pin, setPin] = useState('');
  const [checked, setChecked] = useState(false);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 5);
  const expressDate = new Date();
  expressDate.setDate(expressDate.getDate() + 2);

  return (
    <div className="mb-6">
      <SectionLabel icon="local_shipping">Delivery</SectionLabel>
      <div className="flex gap-2 mb-2.5">
        <input
          type="text"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setChecked(false); }}
          placeholder="Enter pincode"
          className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
          maxLength={6}
        />
        <button
          onClick={() => pin.length >= 6 && setChecked(true)}
          disabled={pin.length < 6}
          className="bg-primary text-on-primary text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check
        </button>
      </div>
      {checked && (
        <div className="space-y-1.5 text-xs animate-fade-up">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span>Standard: <span className="font-semibold">{deliveryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span> <span className="text-secondary font-bold">Free</span></span>
          </div>
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-tertiary">bolt</span>
            <span>Express: <span className="font-semibold">{expressDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span> $9.99</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50">payments</span>
            <span>Cash on delivery available</span>
          </div>
        </div>
      )}
      {!checked && stock > 0 && (
        <p className="text-[11px] text-on-surface-variant/50">Enter pincode to check availability</p>
      )}
    </div>
  );
};

const OfferCard = ({ icon, title, subtitle, discount }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors group">
    <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
      <span className="material-symbols-outlined text-[18px] text-secondary">{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-on-surface">{title}</p>
      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{subtitle}</p>
    </div>
    {discount && (
      <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg shrink-0">{discount}</span>
    )}
  </div>
);

const OffersSection = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left">
        <p className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">local_offer</span>
          Offers
        </p>
        <span className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {expanded && (
        <div className="divide-y divide-outline-variant/30 mt-3 animate-fade-up">
          <OfferCard icon="account_balance" title="Bank Offer" subtitle="10% off on HDFC Bank credit cards" discount="Upto $100" />
          <OfferCard icon="confirmation_number" title="Coupon" subtitle="Apply NOVA20 for extra 20% off" discount="20% off" />
          <OfferCard icon="payments" title="No Cost EMI" subtitle="Starting from $15/month on select cards" />
        </div>
      )}
      {!expanded && (
        <div className="flex items-center gap-2 mt-2 text-[11px] text-on-surface-variant/60">
          <span className="material-symbols-outlined text-[13px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          3 offers available — tap to view all
        </div>
      )}
    </div>
  );
};

const SellerInfo = () => (
  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
    <SectionLabel icon="store">Seller</SectionLabel>
    <Link to="#" className="text-sm text-primary font-semibold hover:underline">NovaCart Official</Link>
    <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        <span className="font-semibold text-on-surface">4.5</span>
      </span>
      <span className="w-px h-3 bg-outline-variant" />
      <span>7-day return policy</span>
    </div>
  </div>
);

const Highlights = ({ features, stock }) => {
  const items = features?.length > 0
    ? features
    : ['Premium quality materials', 'Designed for everyday joy', 'Fast worldwide shipping'];
  return (
    <div>
      <SectionLabel icon="verified">Highlights</SectionLabel>
      <ul className="space-y-2">
        {items.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[15px] text-secondary mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {f}
          </li>
        ))}
        <li className="flex items-start gap-2.5 text-sm text-on-surface-variant">
          <span className={`material-symbols-outlined text-[15px] mt-0.5 shrink-0 ${stock > 0 ? 'text-secondary' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {stock > 0 ? 'check_circle' : 'cancel'}
          </span>
          {stock > 0 ? `${stock} units in stock` : 'Currently unavailable'}
        </li>
      </ul>
    </div>
  );
};

const SpecTable = ({ product }) => {
  const specs = [
    { label: 'Brand', value: 'NovaCart' },
    { label: 'Category', value: product.category },
    { label: 'SKU', value: product.sku || 'N/A' },
    ...(product.colors?.length ? [{ label: 'Colors', value: `${product.colors.length} option${product.colors.length > 1 ? 's' : ''}` }] : []),
    ...(product.features?.length ? [{ label: 'Key Features', value: product.features.join(', ') }] : []),
    { label: 'Warranty', value: '1 year manufacturer warranty' },
    { label: 'In the Box', value: `${product.name}, User Manual, Warranty Card` },
  ];
  return (
    <div className="rounded-xl border border-outline-variant/40 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[320px]">
        <tbody>
          {specs.map((s, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}>
              <td className="py-3 px-5 text-on-surface-variant font-medium w-1/3 text-xs uppercase tracking-wide">{s.label}</td>
              <td className="py-3 px-5 text-on-surface font-medium">{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ReviewsSummary = ({ rating, numReviews }) => {
  const total = numReviews || 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    let pct = 0;
    if (total > 0) {
      if (star === 5) pct = Math.round(total * 0.55);
      else if (star === 4) pct = Math.round(total * 0.25);
      else if (star === 3) pct = Math.round(total * 0.12);
      else if (star === 2) pct = Math.round(total * 0.05);
      else pct = Math.round(total * 0.03);
    }
    return { star, pct, count: pct };
  });

  return (
    <div className="flex flex-col sm:flex-row gap-8 items-start">
      <div className="text-center shrink-0 px-6">
        <p className="text-5xl font-bold text-on-surface">{rating?.toFixed(1) || '0.0'}</p>
        <div className="flex items-center gap-0.5 my-2 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={`material-symbols-outlined text-[20px] ${s <= Math.round(rating) ? 'text-tertiary' : 'text-outline-variant/40'}`} style={s <= Math.round(rating) ? { fontVariationSettings: "'FILL' 1" } : {}}>
              star
            </span>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant">{total} ratings</p>
      </div>
      <div className="flex-1 w-full space-y-2">
        {distribution.map(({ star, pct }) => (
          <div key={star} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-on-surface-variant w-4 text-right">{star}</span>
            <span className="material-symbols-outlined text-[14px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <div className="flex-1 h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-tertiary rounded-full transition-all duration-500" style={{ width: total > 0 ? `${(pct / total) * 100}%` : '0%' }} />
            </div>
            <span className="text-[11px] text-on-surface-variant/60 w-10 text-right">{total > 0 ? Math.round((pct / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StockBadge = ({ stock, inline }) => {
  if (stock === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-error text-xs font-bold ${inline ? '' : 'mb-6'}`}>
        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
        Out of Stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className={`inline-flex items-center gap-1 text-tertiary text-xs font-bold ${inline ? '' : 'mb-6'}`}>
        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
        Only {stock} left!
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-secondary text-xs font-bold ${inline ? '' : 'mb-6'}`}>
      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      In Stock
    </span>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, toggleWishlist } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('description');
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setQty(1);
    setSelectedColor('');
    setSelectedSize('');
    setActiveTab('description');
    api.getProduct(id).then((data) => {
      setProduct(data);
      setLoading(false);
      if (data?.colors?.length) setSelectedColor(data.colors[0]);
      if (data?.category && SIZES_BY_CATEGORY[data.category]) {
        setSelectedSize(SIZES_BY_CATEGORY[data.category][2]);
      }
      if (data?.category) {
        api.getProducts({ category: data.category, limit: 8 }).then((res) => {
          const items = Array.isArray(res) ? res : res.products || [];
          setRelatedProducts(items.filter((p) => p._id !== id).slice(0, 4));
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (user && product) {
      setWishlisted(user.wishlist?.some((item) => (item._id || item) === product._id));
    }
  }, [user, product]);

  const handleAddToCart = (e) => {
    createSparkles(e.clientX, e.clientY);
    addToCart({
      product: product._id,
      name: product.name,
      image: product.images?.[0],
      price: product.price,
      qty,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    });
  };

  const handleBuyNow = (e) => {
    createSparkles(e.clientX, e.clientY);
    addToCart({
      product: product._id,
      name: product.name,
      image: product.images?.[0],
      price: product.price,
      qty,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    });
    navigate('/checkout');
  };

  const handleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    await toggleWishlist(product._id);
    setWishlisted(!wishlisted);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!product) {
    return (
      <div className="flex-1 text-center py-32">
        <div className="w-20 h-20 rounded-2xl bg-surface-container-high flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">search_off</span>
        </div>
        <h1 className="text-xl font-bold text-on-surface mb-2">Product not found</h1>
        <p className="text-sm text-on-surface-variant mb-6">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-ambient-primary hover:shadow-lg transition-all">
          <span className="material-symbols-outlined text-lg">storefront</span>
          Back to Shop
        </Link>
      </div>
    );
  }

  const stock = product.countInStock ?? 10;
  const discount = discountPercent(product.price, product.originalPrice);
  const savings = product.originalPrice > product.price ? product.originalPrice - product.price : 0;
  const sizes = SIZES_BY_CATEGORY[product.category] || [];

  const tabs = [
    { key: 'description', label: 'Description', icon: 'description' },
    { key: 'specifications', label: 'Specifications', icon: 'list_alt' },
    { key: 'reviews', label: 'Ratings & Reviews', icon: 'reviews' },
  ];

  return (
    <main className="flex-1 w-full bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
        {/* Breadcrumb */}
        <nav className="flex text-[11px] text-on-surface-variant/50 mb-5 items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <Link to={`/shop/${encodeURIComponent(product.category)}`} className="hover:text-primary transition-colors">{product.category}</Link>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <span className="text-on-surface font-medium truncate max-w-[220px]">{product.name}</span>
        </nav>

        {/* Main Product Card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 md:p-8 mb-5 shadow-ambient-surface">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-8 lg:gap-12">
            {/* Left: Image Gallery */}
            <div>
              <ImageGallery images={product.images} name={product.name} discount={discount} />
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col">
              {/* Brand */}
              <p className="text-[11px] text-on-surface-variant/40 uppercase tracking-[0.15em] font-semibold mb-1.5">NovaCart</p>

              {/* Title */}
              <h1 className="text-2xl md:text-[26px] font-bold text-on-surface leading-snug mb-3">{product.name}</h1>

              {/* Rating + Stock Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-secondary text-on-secondary text-[11px] font-bold px-2 py-0.5 rounded-lg">
                  {product.rating?.toFixed(1) || '4.0'}
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </span>
                <span className="text-xs text-on-surface-variant">{product.numReviews || 0} ratings</span>
                <span className="w-px h-3 bg-outline-variant/30" />
                <StockBadge stock={stock} inline />
              </div>

              {/* Divider */}
              <div className="h-px bg-outline-variant/20 my-4" />

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-extrabold text-on-surface">${formatPrice(product.price)}</span>
                  {product.originalPrice > product.price && (
                    <>
                      <span className="text-sm text-on-surface-variant/40 line-through">${formatPrice(product.originalPrice)}</span>
                      <span className="text-sm font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md">{discount}% off</span>
                    </>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-xs text-on-surface-variant mt-1.5">
                    You're saving <span className="font-bold text-secondary">{formatCurrency(savings)}</span> on this purchase
                  </p>
                )}
              </div>

              {/* Color + Size + Qty — grouped in one visual block */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 mb-5 space-y-1">
                <ColorSelector colors={product.colors} selectedColor={selectedColor} onSelect={setSelectedColor} />
                <SizeSelector sizes={sizes} selectedSize={selectedSize} onSelect={setSelectedSize} />
                <div>
                  <SectionLabel>Quantity</SectionLabel>
                  <div className="inline-flex items-center border border-outline-variant/40 rounded-xl bg-surface-container-lowest overflow-hidden">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      disabled={qty <= 1}
                      className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-on-surface border-x border-outline-variant/40 h-11 flex items-center justify-center">{qty}</span>
                    <button
                      onClick={() => setQty(Math.min(stock, qty + 1))}
                      disabled={qty >= stock}
                      className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  onClick={handleAddToCart}
                  disabled={stock === 0}
                  className="flex-1 bg-primary-container hover:bg-primary hover:text-on-primary text-on-primary-container font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-ambient-primary"
                >
                  <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                  {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={stock === 0}
                  className="flex-1 bg-primary text-on-primary font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-ambient-primary hover:shadow-lg"
                >
                  <span className="material-symbols-outlined text-lg">flash_on</span>
                  Buy Now
                </button>
              </div>

              {/* Wishlist + Share */}
              <div className="flex items-center gap-2 sm:gap-4 mb-4">
                <button
                  onClick={handleWishlist}
                  className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-error transition-colors group py-2 px-3 -ml-3 rounded-lg hover:bg-error/5"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-all ${wishlisted ? 'text-error' : 'text-on-surface-variant/40 group-hover:text-error/70'}`}
                    style={wishlisted ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {wishlisted ? 'favorite' : 'favorite_border'}
                  </span>
                  {wishlisted ? 'Wishlisted' : 'Wishlist'}
                </button>
                <span className="w-px h-4 bg-outline-variant/30" />
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors group py-2 px-3 rounded-lg hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 group-hover:text-primary/70">share</span>
                  Share
                </button>
              </div>

              {/* Delivery */}
              <DeliveryCheck stock={stock} />

              {/* Offers */}
              <OffersSection />

              {/* Seller */}
              <SellerInfo />
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 md:p-8 mb-5 shadow-ambient-surface">
          <Highlights features={product.features} stock={stock} />
        </div>

        {/* Tabs: Description / Specs / Reviews */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 mb-5 shadow-ambient-surface overflow-hidden">
          <div className="flex border-b border-outline-variant/30">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === key
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-on-surface-variant/50 border-transparent hover:text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <div className="p-5 md:p-8">
            {activeTab === 'description' && (
              <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line max-w-none">{product.description}</div>
            )}
            {activeTab === 'specifications' && <SpecTable product={product} />}
            {activeTab === 'reviews' && (
              <div>
                <ReviewsSummary rating={product.rating} numReviews={product.numReviews} />
                <div className="mt-8 text-center py-10 border border-dashed border-outline-variant/40 rounded-xl bg-surface-container-low">
                  <span className="material-symbols-outlined text-4xl text-outline-variant/40 block mb-3">rate_review</span>
                  <p className="text-sm font-semibold text-on-surface-variant mb-1">No reviews yet</p>
                  <p className="text-xs text-on-surface-variant/50">Be the first to review this product</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-on-surface">Similar Products</h2>
              <Link to={`/shop/${encodeURIComponent(product.category)}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View All
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProductDetailPage;
