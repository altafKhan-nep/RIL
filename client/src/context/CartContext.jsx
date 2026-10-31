import { createContext, useContext, useEffect, useReducer, useState, useMemo, useCallback } from 'react';
import { api } from '../api';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.cartItems.find(
        (item) => item.product === action.payload.product
      );
      if (existingItem) {
        return {
          ...state,
          cartItems: state.cartItems.map((item) =>
            item.product === action.payload.product
              ? { ...item, qty: item.qty + action.payload.qty }
              : item
          ),
        };
      }
      return { ...state, cartItems: [...state.cartItems, action.payload] };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        cartItems: state.cartItems.filter(
          (item) => item.product !== action.payload
        ),
      };
    case 'UPDATE_QTY':
      return {
        ...state,
        cartItems: state.cartItems.map((item) =>
          item.product === action.payload.product
            ? { ...item, qty: action.payload.qty }
            : item
        ),
      };
    case 'SET_PROMO':
      return {
        ...state,
        promoCode: action.payload.code,
        promoDiscount: action.payload.discount,
        promoFreeShipping: Boolean(action.payload.freeShipping),
      };
    case 'CLEAR_PROMO':
      return { ...state, promoCode: '', promoDiscount: 0, promoFreeShipping: false };
    case 'CLEAR':
      return { cartItems: [], promoCode: '', promoDiscount: 0, promoFreeShipping: false };
    default:
      return state;
  }
};

const DEFAULT_SETTINGS = {
  shipping: { freeShippingThreshold: 50, standardRate: 5.99, expressRate: 12.99, enableLocalDelivery: true, localDeliveryRate: 3.99 },
  tax: { enabled: true, rate: 8, includeInPrice: false },
  store: { storeName: 'Life In Pieces', currency: 'USD', currencySymbol: '$' },
};

export const CartProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [state, dispatch] = useReducer(cartReducer, { cartItems: [], promoCode: '', promoDiscount: 0, promoFreeShipping: false }, () => {
    try {
      const stored = localStorage.getItem('novacart_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          cartItems: Array.isArray(parsed.cartItems) ? parsed.cartItems : [],
          promoCode: parsed.promoCode || '',
          promoDiscount: Number(parsed.promoDiscount) || 0,
          promoFreeShipping: Boolean(parsed.promoFreeShipping),
        };
      }
    } catch {
      // Corrupt or legacy cached cart: start clean rather than crash the app.
      try { localStorage.removeItem('novacart_cart'); } catch {}
    }
    return { cartItems: [], promoCode: '', promoDiscount: 0, promoFreeShipping: false };
  });

  useEffect(() => {
    localStorage.setItem('novacart_cart', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res) setSettings(res);
    }).catch(() => {});
  }, []);

  const addToCart = useCallback((item) => dispatch({ type: 'ADD_ITEM', payload: item }), []);
  const removeFromCart = useCallback((id) => dispatch({ type: 'REMOVE_ITEM', payload: id }), []);
  const updateQty = useCallback((id, qty) => {
    if (qty < 1) return;
    dispatch({ type: 'UPDATE_QTY', payload: { product: id, qty } });
  }, []);
  const applyPromo = useCallback((code, discount, freeShipping = false) => dispatch({ type: 'SET_PROMO', payload: { code, discount, freeShipping } }), []);
  const clearPromo = useCallback(() => dispatch({ type: 'CLEAR_PROMO' }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const cartItems = state.cartItems;
  const itemsCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const itemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  const shipping = settings?.shipping || DEFAULT_SETTINGS.shipping;
  const tax = settings?.tax || DEFAULT_SETTINGS.tax;

  const freeThreshold = Number(shipping.freeShippingThreshold ?? 50);
  const standardRate = Number(shipping.standardRate ?? 5.99);
  // Settings may store the tax rate either as a fraction (0.08) or a percent
  // (8). Normalising here keeps the cart preview identical to the server's
  // authoritative total; previously 0.08 was divided by 100 again and the
  // displayed tax was almost zero.
  const rawTaxRate = Number(tax.rate ?? 0.08);
  const taxRate = Number.isFinite(rawTaxRate) && rawTaxRate > 1 ? rawTaxRate / 100 : (Number.isFinite(rawTaxRate) ? rawTaxRate : 0);
  const taxRatePercent = Number((taxRate * 100).toFixed(2));
  const taxEnabled = tax.enabled !== false;

  const shippingPrice = (itemsPrice >= freeThreshold || state.promoFreeShipping) ? 0 : standardRate;
  const taxPrice = taxEnabled ? Number((itemsPrice * taxRate).toFixed(2)) : 0;
  const discountPrice = state.promoDiscount || 0;
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice - discountPrice).toFixed(2));

  const value = useMemo(() => ({
    cartItems, itemsCount, itemsPrice, shippingPrice, taxPrice,
    discountPrice, totalPrice, settings, taxRatePercent,
    promoCode: state.promoCode,
    promoDiscount: state.promoDiscount,
    promoFreeShipping: state.promoFreeShipping,
    addToCart, removeFromCart, updateQty, applyPromo, clearPromo, clearCart,
  }), [cartItems, itemsCount, itemsPrice, shippingPrice, taxPrice,
    discountPrice, totalPrice, settings, taxRatePercent, state.promoCode, state.promoDiscount,
    state.promoFreeShipping, addToCart, removeFromCart, updateQty, applyPromo, clearPromo, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
