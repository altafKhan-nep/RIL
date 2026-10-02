import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { formatPrice } from '../utils/helpers';

const STATUS_STEPS = [
  { key: 'Pending', label: 'Order Placed', icon: 'receipt', activeStatuses: ['Pending', 'Processing', 'Shipped', 'Delivered'] },
  { key: 'Processing', label: 'Confirmed', icon: 'check_circle', activeStatuses: ['Processing', 'Shipped', 'Delivered'] },
  { key: 'Shipped', label: 'Shipped', icon: 'local_shipping', activeStatuses: ['Shipped', 'Delivered'] },
  { key: 'Delivered', label: 'Delivered', icon: 'where_to_vote', activeStatuses: ['Delivered'] },
];

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatDateShort = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDaysLeft = (date) => {
  if (!date) return '';
  const diff = new Date(date) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

const OrderTrackingPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      api.trackOrder(id)
        .then(setOrder)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-on-surface-variant mt-4">Loading tracking info...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">search_off</span>
          <h2 className="text-xl font-bold text-on-surface mt-4">Order Not Found</h2>
          <p className="text-sm text-on-surface-variant mt-2">{error || 'We couldn\'t find this order. Please check the order ID.'}</p>
          <Link to="/shop" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const orderNumber = `#NC-${order._id.toString().slice(-5).toUpperCase()}`;
  const latestEvent = order.trackingEvents?.[order.trackingEvents.length - 1];

  return (
    <main className="flex-1 w-full px-3 md:px-6 lg:px-8 pr-4 md:pr-margin-desktop py-6">
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex text-sm text-on-surface-variant mb-6 items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-sm text-on-surface-variant/50">chevron_right</span>
          <Link to="/account" className="hover:text-primary transition-colors">My Orders</Link>
          <span className="material-symbols-outlined text-sm text-on-surface-variant/50">chevron_right</span>
          <span className="text-primary font-semibold">{orderNumber}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Track Order</h1>
            <p className="text-sm text-on-surface-variant mt-1">Order {orderNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            {order.trackingNumber && (
              <span className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface-variant text-xs font-semibold px-3 py-1.5 rounded-lg">
                <span className="material-symbols-outlined text-[14px]">tag</span>
                {order.trackingNumber}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${
              order.status === 'Delivered' ? 'bg-green-50 text-green-700' :
              order.status === 'Shipped' ? 'bg-blue-50 text-blue-700' :
              order.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {order.status === 'Delivered' ? 'check_circle' : order.status === 'Shipped' ? 'local_shipping' : order.status === 'Cancelled' ? 'cancel' : 'schedule'}
              </span>
              {order.status}
            </span>
          </div>
        </div>

        {/* ─── Status Progress Bar (Flipkart style) ─── */}
        {order.status !== 'Cancelled' && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-on-surface">Order Status</h2>
              {order.estimatedDelivery && order.status !== 'Delivered' && (
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px] text-primary">calendar_today</span>
                  Estimated delivery: <span className="font-bold text-on-surface">{formatDateShort(order.estimatedDelivery)}</span>
                  <span className="text-primary font-semibold">({getDaysLeft(order.estimatedDelivery)})</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="relative mt-6 mb-8">
              <div className="absolute top-4 left-0 right-0 h-1 bg-surface-container-high rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%` }}
                />
              </div>

              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const stepEvent = order.trackingEvents?.find(
                    (e) => e.status?.toLowerCase().includes(step.key.toLowerCase()) ||
                           (step.key === 'Processing' && e.status === 'Order Confirmed')
                  );

                  return (
                    <div key={step.key} className="flex flex-col items-center" style={{ width: '25%' }}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCurrent
                          ? 'bg-primary text-on-primary shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                          : isActive
                            ? 'bg-green-500 text-white'
                            : 'bg-surface-container-high text-on-surface-variant/40'
                      }`}>
                        <span className="material-symbols-outlined text-lg" style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          {step.icon}
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold mt-2 text-center ${
                        isCurrent ? 'text-primary' : isActive ? 'text-green-600' : 'text-on-surface-variant/40'
                      }`}>
                        {step.label}
                      </span>
                      {stepEvent && (
                        <span className="text-[10px] text-on-surface-variant/40 mt-0.5">{formatDate(stepEvent.timestamp)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Latest status message */}
            {latestEvent && (
              <div className="bg-primary/5 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">{latestEvent.icon || 'info'}</span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{latestEvent.status}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{latestEvent.description}</p>
                  {latestEvent.location && (
                    <p className="text-[11px] text-on-surface-variant/50 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                      {latestEvent.location}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancelled notice */}
        {order.status === 'Cancelled' && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-500">cancel</span>
              <div>
                <h3 className="text-base font-bold text-red-800">Order Cancelled</h3>
                <p className="text-sm text-red-600 mt-0.5">{order.cancelReason || 'This order has been cancelled.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Shipping Map (Static) ─── */}
        {order.status !== 'Cancelled' && order.shippingOrigin?.city && order.shippingDestination?.city && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 mb-6">
            <h2 className="text-sm font-bold text-on-surface mb-4">Shipping Route</h2>
            <div className="relative bg-surface-container-low rounded-xl overflow-hidden">
              {/* Map visualization */}
              <div className="p-6 flex items-center justify-between">
                {/* Origin */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-primary">warehouse</span>
                  </div>
                  <span className="text-xs font-bold text-on-surface">{order.shippingOrigin.city}</span>
                  <span className="text-[10px] text-on-surface-variant/50">{order.shippingOrigin.state}</span>
                  <span className="text-[10px] text-on-surface-variant/30 mt-0.5">Origin</span>
                </div>

                {/* Route line */}
                <div className="flex-1 mx-4 relative">
                  <div className="h-1 bg-surface-container-high rounded-full relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-700"
                      style={{
                        width: order.status === 'Delivered' ? '100%' :
                               order.status === 'Shipped' ? '65%' :
                               order.status === 'Processing' ? '30%' : '5%'
                      }}
                    />
                  </div>
                  {/* Truck icon on the line */}
                  {order.status === 'Shipped' && (
                    <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-700" style={{ left: '60%' }}>
                      <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                    </div>
                  )}
                  {/* Waypoints */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 rounded-full bg-primary" />
                  <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 rounded-full bg-surface-container-highest border-2 border-outline-variant/30" />
                </div>

                {/* Destination */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-green-600">home</span>
                  </div>
                  <span className="text-xs font-bold text-on-surface">{order.shippingDestination.city}</span>
                  <span className="text-[10px] text-on-surface-variant/50">{order.shippingDestination.state}</span>
                  <span className="text-[10px] text-on-surface-variant/30 mt-0.5">Destination</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tracking Timeline (Flipkart style) ─── */}
        {order.trackingEvents?.length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 mb-6">
            <h2 className="text-sm font-bold text-on-surface mb-4">Tracking Updates</h2>
            <div className="space-y-0">
              {[...order.trackingEvents].reverse().map((event, idx) => {
                const isFirst = idx === 0;
                return (
                  <div key={idx} className="flex gap-4">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${
                        isFirst ? 'bg-primary ring-4 ring-primary/10' : 'bg-surface-container-high'
                      }`} />
                      {idx < order.trackingEvents.length - 1 && (
                        <div className="w-px flex-1 bg-outline-variant/20 my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-6 ${isFirst ? '' : 'opacity-60'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] ${isFirst ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                          {event.icon || 'circle'}
                        </span>
                        <span className={`text-sm font-bold ${isFirst ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5 ml-6">{event.description}</p>
                      <div className="flex items-center gap-3 mt-1 ml-6">
                        {event.location && (
                          <span className="text-[11px] text-on-surface-variant/40 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">location_on</span>
                            {event.location}
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant/40">{formatDate(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Order Details ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Items */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6">
            <h2 className="text-sm font-bold text-on-surface mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-low overflow-hidden shrink-0 border border-outline-variant/10">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface truncate">{item.name}</p>
                    <p className="text-[11px] text-on-surface-variant/50">Qty: {item.qty}</p>
                  </div>
                  <span className="text-sm font-bold text-on-surface">${formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-2">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Subtotal</span>
                <span>${formatPrice(order.itemsPrice)}</span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Shipping</span>
                <span>{order.shippingPrice === 0 ? 'Free' : `$${formatPrice(order.shippingPrice)}`}</span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Tax</span>
                <span>${formatPrice(order.taxPrice)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-on-surface pt-2 border-t border-outline-variant/10">
                <span>Total</span>
                <span className="text-primary">${formatPrice(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Shipping + Payment */}
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6">
              <h2 className="text-sm font-bold text-on-surface mb-3">Shipping Address</h2>
              <div className="text-sm text-on-surface-variant space-y-1">
                <p className="font-semibold text-on-surface">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.street}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}</p>
                <p>{order.shippingAddress?.country}</p>
                {order.shippingAddress?.phone && <p className="mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">phone</span>{order.shippingAddress.phone}</p>}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6">
              <h2 className="text-sm font-bold text-on-surface mb-3">Payment Info</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">credit_card</span>
                  <span className="text-on-surface-variant">{order.paymentMethod}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`material-symbols-outlined text-[16px] ${order.isPaid ? 'text-green-500' : 'text-amber-500'}`}>
                    {order.isPaid ? 'check_circle' : 'schedule'}
                  </span>
                  <span className={order.isPaid ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {order.isPaid ? 'Paid' : 'Pending'}
                  </span>
                  {order.paidAt && <span className="text-xs text-on-surface-variant/50">{formatDate(order.paidAt)}</span>}
                </div>
              </div>
            </div>

            {order.shippingPartner && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6">
                <h2 className="text-sm font-bold text-on-surface mb-3">Shipping Partner</h2>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-primary">local_shipping</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{order.shippingPartner}</p>
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        Track on carrier website →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link to="/shop" className="flex-1 bg-primary/8 hover:bg-primary/15 text-primary text-sm font-semibold py-3 rounded-xl text-center transition-colors">
            Continue Shopping
          </Link>
          <Link to="/account" className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold py-3 rounded-xl text-center transition-colors">
            View All Orders
          </Link>
        </div>
      </div>
    </main>
  );
};

export default OrderTrackingPage;
