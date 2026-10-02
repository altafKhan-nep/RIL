import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { formatPrice, formatDate } from '../utils/helpers';
import ConfirmDialog from '../components/ConfirmDialog';

const CartPage = () => {
  const { cartItems, removeFromCart, updateQty, itemsPrice, shippingPrice, taxPrice, totalPrice, itemsCount, promoCode: appliedPromo, promoDiscount: appliedDiscount, applyPromo, clearPromo } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState(appliedPromo || '');
  const [promoApplied, setPromoApplied] = useState(!!appliedPromo);
  const [promoDiscount, setPromoDiscount] = useState(appliedDiscount || 0);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 5);
  const estimatedDelivery = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoLoading(true);
    try {
      const result = await api.validatePromotion(promoCode.trim(), totalPrice);
      if (result.valid) {
        setPromoApplied(true);
        setPromoDiscount(result.discount);
        applyPromo(promoCode.trim().toUpperCase(), result.discount);
        setPromoError('');
      } else {
        setPromoApplied(false);
        setPromoDiscount(0);
        clearPromo();
        setPromoError(result.message || 'Invalid promo code');
      }
    } catch (err) {
      setPromoApplied(false);
      setPromoDiscount(0);
      clearPromo();
      setPromoError(err.message || 'Invalid promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const finalTotal = Number((totalPrice - promoDiscount).toFixed(2));

  const handleConfirmRemove = () => {
    if (removeTarget) {
      removeFromCart(removeTarget);
      setRemoveTarget(null);
    }
  };

  return (
    <main className="flex-grow w-full px-3 md:px-6 lg:px-8 pr-4 md:pr-margin-desktop py-8">
      {/* Progress */}
      <div className="flex items-center justify-center mb-10 w-full max-w-lg mx-auto">
        {[
          { icon: 'shopping_cart', label: 'Cart', active: true },
          { icon: 'location_on', label: 'Address', active: false },
          { icon: 'credit_card', label: 'Payment', active: false },
          { icon: 'check_circle', label: 'Confirm', active: false },
        ].map((step, i, arr) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  step.active
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{step.icon}</span>
              </div>
              <span className={`mt-1.5 text-xs font-semibold ${step.active ? 'text-primary' : 'text-on-surface-variant'}`}>
                {step.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-grow h-0.5 -mx-1 rounded-full ${step.active ? 'bg-primary/30' : 'bg-surface-container-high'}`}></div>
            )}
          </div>
        ))}
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-6">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-surface-container/60">
          <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">shopping_cart</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-1">Your cart is empty</h2>
          <p className="text-sm text-on-surface-variant mb-6">Looks like you haven't added anything yet. Let's fill it with some joy!</p>
          <Link to="/shop" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold">
            <span className="material-symbols-outlined text-lg">storefront</span>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Cart Items */}
          <div className="flex-1 flex flex-col gap-3">
            {cartItems.map((item) => (
              <div
                key={item.product}
                className="bg-surface-container-lowest rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 border border-surface-container/60 hover:shadow-md transition-shadow"
              >
                <Link to={`/product/${item.product}`} className="shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 rounded-lg object-cover bg-surface-container-low"
                  />
                </Link>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <Link to={`/product/${item.product}`}>
                    <h3 className="text-sm font-semibold text-on-surface mb-1 hover:text-primary truncate transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-on-surface-variant">Unit: ${formatPrice(item.price)}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary bg-secondary-container/20 rounded-md px-2 py-0.5 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    In Stock
                  </span>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-2.5 shrink-0">
                  <span className="text-base font-bold text-on-surface">
                    ${formatPrice(item.price * item.qty)}
                  </span>
                  <div className="flex items-center bg-surface-container-low rounded-xl border border-surface-container">
                    <button
                      onClick={() => updateQty(item.product, item.qty - 1)}
                      disabled={item.qty <= 1}
                      className="w-8 h-8 rounded-l-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="text-sm font-semibold text-on-surface w-10 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.product, item.qty + 1)}
                      className="w-8 h-8 rounded-r-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setRemoveTarget(item.product)}
                    className="text-xs font-medium text-error hover:text-on-error-container flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mt-2"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-surface-container-low rounded-xl p-5 border border-surface-container/60 sticky top-28">
              <h2 className="text-base font-bold text-on-surface mb-5">Order Summary</h2>

              {/* Estimated Delivery */}
              <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-lowest rounded-lg p-3 mb-4 border border-surface-container/60">
                <span className="material-symbols-outlined text-base text-primary">local_shipping</span>
                <span>Estimated delivery: <span className="font-semibold text-on-surface">{estimatedDelivery}</span></span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm text-on-surface-variant">
                  <span>Subtotal ({itemsCount} items)</span>
                  <span className="font-semibold text-on-surface">${formatPrice(itemsPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-on-surface-variant">
                  <span>Shipping</span>
                  <span className="font-semibold text-secondary">
                    {shippingPrice === 0 ? 'Free' : `$${formatPrice(shippingPrice)}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-on-surface-variant">
                  <span>Tax (8.5%)</span>
                  <span className="font-semibold text-on-surface">${formatPrice(taxPrice)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Promo Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 bg-surface-container-lowest border border-surface-container rounded-lg text-sm text-on-surface outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/20 transition-all"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim() || promoLoading}
                    className="px-3 py-2 bg-primary-container/20 text-primary text-xs font-semibold rounded-lg hover:bg-primary-container/30 transition-colors disabled:opacity-40"
                  >
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-xs text-secondary font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {promoCode.toUpperCase()} applied — You save ${formatPrice(promoDiscount)}!
                  </p>
                )}
                {promoError && (
                  <p className="text-xs text-error font-medium mt-1.5">{promoError}</p>
                )}
              </div>

              <div className="border-t border-surface-container pt-4 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-on-surface">Total</span>
                  <span className="text-lg font-bold text-primary">${formatPrice(finalTotal)}</span>
                </div>
                {promoApplied && (
                  <p className="text-xs text-secondary font-medium text-right mt-1">You save ${formatPrice(promoDiscount)}!</p>
                )}
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="w-full btn-primary text-on-primary-container font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                Proceed to Checkout
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-on-surface-variant text-xs font-medium">
                <span className="material-symbols-outlined text-sm">lock</span>
                Secure Checkout
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Item"
        message="Are you sure you want to remove this item from your cart?"
        confirmText="Remove"
        cancelText="Keep Item"
        danger
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </main>
  );
};

export default CartPage;
