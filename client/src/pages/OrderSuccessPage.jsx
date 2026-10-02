import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { formatPrice } from '../utils/helpers';

const formatDateShort = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const OrderSuccessPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (id) api.getOrderById(id).then(setOrder).catch(() => {});
  }, [id]);

  const orderNumber = order ? `#NC-${order._id.toString().slice(-5).toUpperCase()}` : '';

  const steps = [
    { label: 'Order Placed', icon: 'receipt', done: true },
    { label: 'Confirmed', icon: 'check_circle', done: ['Processing', 'Shipped', 'Delivered'].includes(order?.status) },
    { label: 'Shipped', icon: 'local_shipping', done: ['Shipped', 'Delivered'].includes(order?.status) },
    { label: 'Delivered', icon: 'where_to_vote', done: order?.status === 'Delivered' },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <main className="flex-1 flex flex-col items-center min-h-[70vh] w-full px-3 md:px-6 lg:px-8 pr-4 md:pr-margin-desktop py-12">
      {/* Success Icon */}
      <div className="bounce-in bg-secondary-container text-on-secondary-container rounded-2xl w-20 h-20 flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(94,246,230,0.4)]">
        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-on-surface text-center mb-2">Thank You!</h1>
      <p className="text-sm text-on-surface-variant text-center mb-8 max-w-md leading-relaxed">
        Your order has been placed successfully. Get ready for some joy to arrive at your door.
      </p>

      {order && (
        <>
          {/* Order Number Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 w-full max-w-lg border border-outline-variant/15 mb-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/10">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Order Number</span>
              <span className="text-sm font-bold text-primary">{orderNumber}</span>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4">
              {order.orderItems.map((item) => (
                <div className="flex items-center gap-3" key={item._id}>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low overflow-hidden shrink-0 border border-outline-variant/10">
                    <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-on-surface truncate">{item.name}</h3>
                    <p className="text-[11px] text-on-surface-variant/50">Qty: {item.qty}</p>
                  </div>
                  <div className="text-sm font-bold text-on-surface">${formatPrice(item.price * item.qty)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pt-3 border-t border-outline-variant/10">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Subtotal</span>
                <span>${formatPrice(order.itemsPrice)}</span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Shipping</span>
                <span>{order.shippingPrice === 0 ? 'Free' : `$${formatPrice(order.shippingPrice)}`}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-on-surface pt-2 border-t border-outline-variant/10">
                <span>Total</span>
                <span className="text-primary">${formatPrice(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Tracking Preview */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 w-full max-w-lg border border-outline-variant/15 mb-6">
            <h3 className="text-sm font-bold text-on-surface mb-4">Order Status</h3>

            {/* Mini progress bar */}
            <div className="relative mb-6">
              <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-surface-container-high rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentIdx / (steps.length - 1)) * 100)}%` }}
                />
              </div>

              <div className="relative flex justify-between">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center" style={{ width: '25%' }}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ${
                      step.done
                        ? idx === currentIdx
                          ? 'bg-primary text-on-primary shadow-lg shadow-primary/30 ring-3 ring-primary/10'
                          : 'bg-green-500 text-white'
                        : 'bg-surface-container-high text-on-surface-variant/40'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]" style={step.done && idx === currentIdx ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {step.icon}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold mt-1.5 text-center ${
                      idx === currentIdx ? 'text-primary' : step.done ? 'text-green-600' : 'text-on-surface-variant/40'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery estimate */}
            {order.estimatedDelivery && order.status !== 'Delivered' && (
              <div className="flex items-center gap-2 bg-primary/5 rounded-xl p-3">
                <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                <div>
                  <p className="text-xs text-on-surface-variant">Estimated Delivery</p>
                  <p className="text-sm font-bold text-on-surface">{formatDateShort(order.estimatedDelivery)}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
        {order && (
          <Link
            to={`/track/${order._id}`}
            className="flex-1 bg-primary text-on-primary rounded-xl py-3 px-5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-lg">local_shipping</span>
            Track Order
          </Link>
        )}
        <Link
          to="/shop"
          className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl py-3 px-5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          Continue Shopping
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </main>
  );
};

export default OrderSuccessPage;
