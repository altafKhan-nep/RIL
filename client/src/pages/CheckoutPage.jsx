import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { formatPrice } from '../utils/helpers';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setMsg('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMsg(submitError.message);
      setProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/order-success' },
      redirect: 'if_required',
    });

    if (error) {
      setMsg(error.message);
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {msg && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-error/10 border border-error/20 rounded-lg">
          <span className="material-symbols-outlined text-error text-sm">error</span>
          <span className="text-xs font-medium text-error">{msg}</span>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full mt-5 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #ff7f50, #e85d30)' }}
      >
        {processing ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Pay ${formatPrice(amount)}
          </>
        )}
      </button>
    </form>
  );
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, itemsPrice, shippingPrice, taxPrice, discountPrice, totalPrice, promoCode, clearCart } = useCart();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({
    fullName: user?.address?.fullName || user?.name || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    zip: user?.address?.zip || '',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);

  const handleChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!address.fullName || !address.street || !address.city || !address.zip) {
      setError('Please fill in all shipping fields');
      return;
    }
    setStep(2);
  };

  const createPaymentIntent = async () => {
    if (clientSecret) return;
    setLoadingIntent(true);
    setError('');
    try {
      const result = await api.createPaymentIntent(totalPrice);
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
      } else {
        setError('Failed to initialize payment');
      }
    } catch (err) {
      setError('Payment initialization failed: ' + err.message);
    }
    setLoadingIntent(false);
  };

  const handlePaymentSubmit = async () => {
    setError('');
    if (paymentMethod === 'cod') {
      await placeOrder('Cash on Delivery');
    }
  };

  const placeOrder = async (method) => {
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    const orderItems = cartItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      image: item.image,
      price: item.price,
      product: item.product,
    }));

    setPlacing(true);
    try {
      const order = await api.createOrder({
        orderItems,
        shippingAddress: address,
        paymentMethod: method,
        itemsPrice,
        taxPrice,
        shippingPrice,
        discountPrice,
        totalPrice,
        promoCode,
      });
      clearCart();
      if (user) await refreshProfile();
      navigate(`/order-success/${order._id}`);
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  const handleStripeSuccess = async () => {
    await placeOrder('Stripe');
  };

  if (cartItems.length === 0) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">shopping_cart</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Your cart is empty</h1>
        <p className="text-on-surface-variant mb-6">Add some items to your cart to checkout</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all duration-300 hover:shadow-lg hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #ff7f50, #e85d30)' }}
        >
          Continue Shopping
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-on-surface mb-2">Checkout</h1>
          <p className="text-on-surface-variant">Complete your order securely</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step > 1 ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg' : 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg ring-4 ring-primary/20'}`}>
                {step > 1 ? <span className="material-symbols-outlined text-xl">check</span> : <span>1</span>}
              </div>
              <span className={`mt-2 text-xs font-bold ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>Address</span>
            </div>

            <div className="w-16 sm:w-24 h-1 mx-2 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500" style={{ width: step > 1 ? '100%' : '0%' }} />
            </div>

            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step === 2 ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg ring-4 ring-primary/20' : 'bg-surface-container-high text-on-surface-variant'}`}>
                <span>2</span>
              </div>
              <span className={`mt-2 text-xs font-bold ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>Payment</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="flex-1 min-w-0">
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-surface-container-high/50 bg-gradient-to-r from-surface to-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">local_shipping</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-on-surface">Shipping Address</h2>
                      <p className="text-sm text-on-surface-variant">Where should we deliver?</p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleAddressSubmit} className="p-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-2">Full Name *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-xl">person</span>
                        </span>
                        <input name="fullName" value={address.fullName} onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-2 border-transparent rounded-xl text-on-surface text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-white placeholder:text-on-surface-variant/50"
                          placeholder="Enter your full name" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-2">Street Address *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-xl">home</span>
                        </span>
                        <input name="street" value={address.street} onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-2 border-transparent rounded-xl text-on-surface text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-white placeholder:text-on-surface-variant/50"
                          placeholder="123 Main Street" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-on-surface mb-2">City *</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-xl">location_city</span>
                          </span>
                          <input name="city" value={address.city} onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-2 border-transparent rounded-xl text-on-surface text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-white placeholder:text-on-surface-variant/50"
                            placeholder="Mumbai" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-on-surface mb-2">ZIP Code *</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-xl">markunread_mailbox</span>
                          </span>
                          <input name="zip" value={address.zip} onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-2 border-transparent rounded-xl text-on-surface text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:bg-white placeholder:text-on-surface-variant/50"
                            placeholder="400001" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div className="mt-5 flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl">
                      <span className="material-symbols-outlined text-error text-xl">error</span>
                      <span className="text-sm font-medium text-error">{error}</span>
                    </div>
                  )}
                  <button type="submit"
                    className="w-full mt-6 py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #ff7f50, #e85d30)' }}>
                    Continue to Payment
                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                  </button>
                </form>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-surface-container-high/50 bg-gradient-to-r from-surface to-surface-container-low">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">payment</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-on-surface">Payment Method</h2>
                      <p className="text-sm text-on-surface-variant">Choose how you'd like to pay</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {/* Payment Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <button type="button"
                      onClick={() => { setPaymentMethod('card'); setError(''); setClientSecret(''); }}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-300 ${paymentMethod === 'card' ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md' : 'border-surface-container-high hover:border-outline-variant bg-surface-container-low/50'}`}>
                      {paymentMethod === 'card' && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-sm">check</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${paymentMethod === 'card' ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined text-2xl">credit_card</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-on-surface">Credit / Debit Card</h3>
                          <p className="text-sm text-on-surface-variant mt-0.5">Visa, Mastercard, AMEX</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        {[{ name: 'Visa', color: 'bg-blue-600', text: 'text-white' }, { name: 'MC', color: 'bg-red-500', text: 'text-white' }, { name: 'AMEX', color: 'bg-blue-400', text: 'text-white' }].map((c) => (
                          <span key={c.name} className={`px-2.5 py-1 ${c.color} ${c.text} rounded text-[10px] font-bold`}>{c.name}</span>
                        ))}
                      </div>
                    </button>

                    <button type="button"
                      onClick={() => { setPaymentMethod('cod'); setError(''); setClientSecret(''); }}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-300 ${paymentMethod === 'cod' ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-md' : 'border-surface-container-high hover:border-outline-variant bg-surface-container-low/50'}`}>
                      {paymentMethod === 'cod' && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-sm">check</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${paymentMethod === 'cod' ? 'bg-gradient-to-br from-secondary to-secondary-container text-white shadow-lg' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined text-2xl">local_atm</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-on-surface">Cash on Delivery</h3>
                          <p className="text-sm text-on-surface-variant mt-0.5">Pay when you receive</p>
                        </div>
                      </div>
                      <div className="mt-4 px-3 py-2.5 bg-secondary/10 rounded-lg border border-secondary/20">
                        <p className="text-xs text-secondary font-medium flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">info</span>
                          Pay with cash at your doorstep
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Stripe: Show card form directly */}
                  {paymentMethod === 'card' && !clientSecret && (
                    <button
                      onClick={createPaymentIntent}
                      disabled={loadingIntent}
                      className="w-full py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
                      style={{ background: 'linear-gradient(135deg, #ff7f50, #e85d30)' }}>
                      {loadingIntent ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Initializing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xl">lock</span>
                          Proceed to Card Payment
                        </>
                      )}
                    </button>
                  )}

                  {paymentMethod === 'card' && clientSecret && (
                    <div className="border border-surface-container-high rounded-xl p-5 bg-surface-container-low/30">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
                        <span className="text-sm font-bold text-on-surface">Secure Card Payment</span>
                      </div>
                      <Elements
                        key={clientSecret}
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              colorPrimary: '#a43c12',
                              colorBackground: '#ffffff',
                              colorText: '#1b1c1a',
                              colorDanger: '#dc2626',
                              fontFamily: 'Inter, system-ui, sans-serif',
                              borderRadius: '12px',
                            },
                          },
                        }}
                      >
                        <CheckoutForm amount={totalPrice} onSuccess={handleStripeSuccess} />
                      </Elements>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl mb-5 mt-4">
                      <span className="material-symbols-outlined text-error text-xl">error</span>
                      <span className="text-sm font-medium text-error">{error}</span>
                    </div>
                  )}

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => { setStep(1); setError(''); setClientSecret(''); }}
                      className="flex-1 py-4 rounded-xl font-bold text-sm border-2 border-surface-container-high text-on-surface hover:bg-surface-container-low transition-all duration-300 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-xl">arrow_back</span>
                      Back
                    </button>
                    {paymentMethod === 'cod' && (
                      <button
                        onClick={handlePaymentSubmit}
                        disabled={placing}
                        className="flex-1 py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #006a62, #00897b)' }}>
                        {placing ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Placing Order...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-xl">shopping_bag</span>
                            Place Order
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high/50 overflow-hidden sticky top-24">
              <div className="px-6 py-5 border-b border-surface-container-high/50 bg-gradient-to-r from-surface to-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">Order Summary</h2>
                    <p className="text-sm text-on-surface-variant">{cartItems.length} item{cartItems.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 max-h-[280px] overflow-y-auto">
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div className="flex gap-3" key={item.product}>
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-low shrink-0 border border-surface-container-high/50">
                        <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-on-surface truncate">{item.name}</h3>
                        <p className="text-xs text-on-surface-variant mt-1">Qty: {item.qty}</p>
                      </div>
                      <span className="font-bold text-sm text-on-surface shrink-0">${formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface-container-high/50 bg-surface-container-low/30">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="font-medium text-on-surface">${formatPrice(itemsPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Shipping</span>
                    <span className={`font-medium ${shippingPrice === 0 ? 'text-secondary' : 'text-on-surface'}`}>{shippingPrice === 0 ? 'Free' : `$${formatPrice(shippingPrice)}`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Tax</span>
                    <span className="font-medium text-on-surface">${formatPrice(taxPrice)}</span>
                  </div>
                  {discountPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">local_offer</span>
                        Promo ({promoCode})
                      </span>
                      <span className="font-bold text-secondary">-${formatPrice(discountPrice)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-surface-container-high">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-on-surface">Total</span>
                    <span className="text-2xl font-bold text-primary">${formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface-container-high/50 bg-surface-container-low/20">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm text-secondary">lock</span>
                    <span className="text-[11px] font-medium">Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
                    <span className="text-[11px] font-medium">Encrypted</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm text-secondary">support_agent</span>
                    <span className="text-[11px] font-medium">24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
