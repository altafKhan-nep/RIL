import { memo, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, discountPercent } from '../utils/helpers';
import { createSparkles } from '../utils/sparkles';

const Stars = memo(({ rating, reviews }) => (
  <div className="flex items-center gap-1">
    <span className="inline-flex items-center gap-0.5 bg-secondary-container/20 text-secondary text-[11px] font-semibold px-1.5 py-0.5 rounded">
      {rating?.toFixed(1) || '4.0'}
      <span className="material-symbols-outlined text-[12px]">star</span>
    </span>
    {reviews != null && (
      <span className="text-[11px] text-on-surface-variant/50">({reviews})</span>
    )}
  </div>
));
Stars.displayName = 'Stars';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user, toggleWishlist } = useAuth();

  const isWishlisted = user?.wishlist?.some((item) => item._id === product._id);
  const discount = discountPercent(product.price, product.originalPrice);

  const handleAdd = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    createSparkles(e.clientX, e.clientY);
    addToCart({
      product: product._id,
      name: product.name,
      image: product.images?.[0],
      price: product.price,
      qty: 1,
    });
  }, [addToCart, product]);

  const handleWishlist = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { window.location.href = '/login'; return; }
    toggleWishlist(product._id);
  }, [user, toggleWishlist, product._id]);

  const priceHtml = useMemo(() => (
    <div className="mt-auto pt-2 flex items-baseline gap-1.5 flex-wrap">
      <span className="text-lg font-bold text-on-surface">${formatPrice(product.price)}</span>
      {discount > 0 && (
        <>
          <span className="text-xs text-on-surface-variant/50 line-through">${formatPrice(product.originalPrice)}</span>
          <span className="text-xs font-semibold text-secondary">{discount}% off</span>
        </>
      )}
    </div>
  ), [product.price, product.originalPrice, discount]);

  return (
    <Link to={`/product/${product._id}`} className="block group">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden transition-all duration-200 hover:shadow-ambient-surface hover:border-primary/15 flex flex-col h-full">
        {/* Image area */}
        <div className="relative aspect-square bg-surface-container overflow-hidden">
          <img
            src={product.images?.[0]}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {discount}% off
            </span>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className="absolute top-1.5 right-1.5 w-9 h-9 md:w-7 md:h-7 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-surface-container-lowest hover:shadow transition-all"
            aria-label="Add to wishlist"
          >
            <span className={`material-symbols-outlined text-[16px] ${isWishlisted ? 'text-error' : 'text-on-surface-variant/40'}`}>
              {isWishlisted ? 'favorite' : 'favorite_border'}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="text-[13px] text-on-surface mb-1 line-clamp-2 leading-snug min-h-[34px] group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <Stars rating={product.rating} reviews={product.numReviews} />
          {priceHtml}
          <p className="text-[11px] text-on-surface-variant/50 mt-1">Free delivery</p>
        </div>
      </div>
    </Link>
  );
};

export default memo(ProductCard);
