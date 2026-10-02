import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, discountPercent } from '../utils/helpers';
import { createSparkles } from '../utils/sparkles';

const ProductListRow = ({ product }) => {
  const { addToCart } = useCart();
  const { user, toggleWishlist } = useAuth();
  const isWishlisted = user?.wishlist?.some((item) => item._id === product._id);
  const discount = discountPercent(product.price, product.originalPrice);
  const features = product.features || [];

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

  return (
    <Link
      to={`/product/${product._id}`}
      className="flex gap-4 p-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl hover:shadow-ambient-surface hover:border-primary/15 transition-all duration-200 group"
    >
      {/* Image */}
      <div className="relative w-[140px] h-[140px] shrink-0 bg-surface-container rounded-lg overflow-hidden flex items-center justify-center">
        <img
          src={product.images?.[0]}
          alt={product.name}
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {discount}% off
          </span>
        )}
        <button
          onClick={handleWishlist}
          className="absolute top-1 right-1 w-9 h-9 md:w-7 md:h-7 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-surface-container-lowest hover:shadow transition-all"
          aria-label="Add to wishlist"
        >
          <span className={`material-symbols-outlined text-[16px] ${isWishlisted ? 'text-error' : 'text-on-surface-variant/40'}`}>
            {isWishlisted ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col min-w-0">
        <h3 className="text-sm font-semibold text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1">
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-0.5 bg-secondary-container/20 text-secondary text-[11px] font-semibold px-1.5 py-0.5 rounded">
            {product.rating?.toFixed(1) || '4.0'}
            <span className="material-symbols-outlined text-[12px]">star</span>
          </span>
          {product.numReviews != null && (
            <span className="text-[11px] text-on-surface-variant/50">
              {product.numReviews.toLocaleString()} Ratings &amp; Reviews
            </span>
          )}
        </div>

        {features.length > 0 && (
          <ul className="text-[11px] text-on-surface-variant/60 space-y-0.5 mb-2">
            {features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/40 mt-[5px] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-on-surface">${formatPrice(product.price)}</span>
            {discount > 0 && (
              <span className="text-xs text-on-surface-variant/40 line-through">${formatPrice(product.originalPrice)}</span>
            )}
            {discount > 0 && (
              <span className="text-xs font-bold text-secondary">{discount}% off</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="text-[10px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-md">
            Bank Offer
          </span>
          {discount > 20 && (
            <span className="text-[10px] font-semibold text-secondary bg-secondary/8 px-2 py-0.5 rounded-md">
              Deal of the Day
            </span>
          )}
        </div>

        <p className="text-[11px] text-on-surface-variant/40 mt-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">local_shipping</span>
          Free delivery
        </p>
      </div>

      <div className="hidden md:flex items-center shrink-0">
        <button
          onClick={handleAdd}
          className="bg-primary/8 hover:bg-primary hover:text-on-primary text-primary text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">add_shopping_cart</span>
          Add to Cart
        </button>
      </div>
    </Link>
  );
};

export default memo(ProductListRow);
