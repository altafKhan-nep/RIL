import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'person' },
  { id: 'orders', label: 'Orders', icon: 'receipt_long' },
  { id: 'wishlist', label: 'Wishlist', icon: 'favorite' },
  { id: 'addresses', label: 'Addresses', icon: 'location_on' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const STATUS_COLORS = {
  Pending: 'bg-amber-100 text-amber-800',
  Processing: 'bg-blue-100 text-blue-800',
  Shipped: 'bg-teal-100 text-teal-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const UserDashboard = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [addressForm, setAddressForm] = useState({ fullName: '', street: '', city: '', state: '', zip: '', country: 'India', phone: '' });
  const [editingAddress, setEditingAddress] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [toast, setToast] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    refreshProfile().catch(() => {});
    api.getMyOrders().then(setOrders).catch(() => []).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
      setAddressForm(user.address || { fullName: '', street: '', city: '', state: '', zip: '', country: 'India', phone: '' });
    }
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileSave = async () => {
    try {
      await api.updateProfile(profileForm);
      await refreshProfile();
      setEditingProfile(false);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  const handleAddressSave = async () => {
    try {
      await api.updateProfile({ address: addressForm });
      await refreshProfile();
      setEditingAddress(false);
      showToast('Address updated successfully');
    } catch (err) {
      showToast(err.message || 'Failed to update address', 'error');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.new.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      await api.updateProfile({ password: passwordForm.new });
      setPasswordForm({ current: '', new: '', confirm: '' });
      showToast('Password changed successfully');
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    }
  };

  const wishlist = user?.wishlist || [];
  const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A';

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: 'shopping_bag', color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: 'payments', color: 'bg-green-50 text-green-600' },
          { label: 'Joy Points', value: user?.loyaltyPoints || 0, icon: 'emoji_events', color: 'bg-amber-50 text-amber-600' },
          { label: 'Wishlist Items', value: wishlist.length, icon: 'favorite', color: 'bg-pink-50 text-pink-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-low rounded-xl p-4 border border-surface-container/60">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-on-surface">{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Profile Card */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center text-3xl font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-on-surface">{user?.name}</h2>
            <p className="text-sm text-on-surface-variant">{user?.email}</p>
            {user?.phone && <p className="text-sm text-on-surface-variant">{user?.phone}</p>}
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary-container/30 text-primary">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Member since {memberSince}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                <span className="material-symbols-outlined text-sm">verified</span>
                Verified Account
              </span>
            </div>
          </div>
          <button
            onClick={() => { setEditingProfile(true); setActiveTab('settings'); }}
            className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 shrink-0"
          >
            Edit Profile
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-on-surface">Recent Orders</h3>
          <button onClick={() => setActiveTab('orders')} className="text-sm font-semibold text-primary hover:text-primary/80">
            View All
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">receipt_long</span>
            <p className="text-sm text-on-surface-variant mt-2">No orders yet</p>
            <Link to="/shop" className="text-sm font-semibold text-primary mt-2 inline-block">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <div key={order._id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer" onClick={() => { setSelectedOrder(order); setActiveTab('orders'); }}>
                <div className="flex -space-x-2">
                  {order.orderItems?.slice(0, 2).map((item, i) => (
                    <img key={i} src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover border-2 border-surface-container-lowest" />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">Order #{order._id.toString().slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-on-surface-variant">{new Date(order.createdAt).toLocaleDateString()} • {order.orderItems?.length} item(s)</p>
                </div>
                <p className="text-sm font-bold text-on-surface">${order.totalPrice.toFixed(2)}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: 'location_on', label: 'Addresses', tab: 'addresses' },
          { icon: 'lock', label: 'Security', tab: 'settings' },
          { icon: 'favorite', label: 'Wishlist', tab: 'wishlist' },
        ].map((link) => (
          <button key={link.tab} onClick={() => setActiveTab(link.tab)} className="bg-surface-container-low rounded-xl p-4 border border-surface-container/60 flex items-center gap-3 hover:bg-surface-container-high transition-colors text-left">
            <span className="material-symbols-outlined text-primary">{link.icon}</span>
            <span className="text-sm font-semibold text-on-surface">{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-4">
      {selectedOrder ? (
        <div>
          <button onClick={() => setSelectedOrder(null)} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Orders
          </button>
          <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Order #{selectedOrder._id.toString().slice(-6).toUpperCase()}</h3>
                <p className="text-sm text-on-surface-variant mt-1">Placed on {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                {selectedOrder.status}
              </span>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-sm font-bold text-on-surface mb-3">Items</h4>
              <div className="space-y-3">
                {selectedOrder.orderItems?.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-surface-container-lowest rounded-lg">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{item.name}</p>
                      <p className="text-xs text-on-surface-variant">Qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-bold text-on-surface">${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-surface-container pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Subtotal</span><span className="text-on-surface">${selectedOrder.itemsPrice?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Tax</span><span className="text-on-surface">${selectedOrder.taxPrice?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Shipping</span><span className="text-on-surface">{selectedOrder.shippingPrice === 0 ? 'Free' : `$${selectedOrder.shippingPrice?.toFixed(2)}`}</span></div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-surface-container"><span className="text-on-surface">Total</span><span className="text-primary">${selectedOrder.totalPrice?.toFixed(2)}</span></div>
            </div>

            {/* Shipping */}
            {selectedOrder.shippingAddress && (
              <div className="bg-surface-container-lowest rounded-lg p-4">
                <h4 className="text-sm font-bold text-on-surface mb-2">Shipping Address</h4>
                <p className="text-sm text-on-surface-variant">{selectedOrder.shippingAddress.fullName}</p>
                <p className="text-sm text-on-surface-variant">{selectedOrder.shippingAddress.street}</p>
                <p className="text-sm text-on-surface-variant">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.zip}</p>
              </div>
            )}

            {/* Track Order Button */}
            {selectedOrder.status !== 'Cancelled' && (
              <button
                onClick={() => navigate(`/track/${selectedOrder._id}`)}
                className="w-full bg-primary/8 hover:bg-primary/15 text-primary text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                Track Order
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-12 text-center border border-surface-container/60">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">receipt_long</span>
              <p className="text-on-surface-variant mt-3 mb-4">You haven't placed any orders yet.</p>
              <Link to="/shop" className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order._id} className="bg-surface-container-low rounded-xl p-4 border border-surface-container/60 flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <div className="flex -space-x-2">
                    {order.orderItems?.slice(0, 3).map((item, i) => (
                      <img key={i} src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover border-2 border-surface-container-lowest" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface">Order #{order._id.toString().slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-on-surface-variant">{order.orderItems?.length} item(s) • {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-base font-bold text-on-surface">${order.totalPrice.toFixed(2)}</p>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderWishlist = () => (
    <div>
      {wishlist.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-12 text-center border border-surface-container/60">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">favorite</span>
          <p className="text-on-surface-variant mt-3 mb-4">Your wishlist is empty. Tap the heart on products you love.</p>
          <Link to="/shop" className="bg-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-lg">shopping_bag</span>
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );

  const renderAddresses = () => (
    <div className="space-y-4">
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-on-surface">Shipping Address</h3>
          <button onClick={() => setEditingAddress(!editingAddress)} className="text-sm font-semibold text-primary hover:text-primary/80">
            {editingAddress ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingAddress ? (
          <div className="space-y-3">
            <input value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" placeholder="Full Name" />
            <input value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" placeholder="Street Address" />
            <div className="grid grid-cols-2 gap-3">
              <input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" placeholder="City" />
              <input value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" placeholder="ZIP Code" />
            </div>
            <button onClick={handleAddressSave} className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors">
              Save Address
            </button>
          </div>
        ) : user?.address?.street ? (
          <div className="text-sm text-on-surface-variant space-y-1">
            <p className="font-medium text-on-surface">{user.address.fullName || user.name}</p>
            <p>{user.address.street}</p>
            <p>{user.address.city}, {user.address.zip}</p>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No address saved yet.</p>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Edit Profile */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <h3 className="text-base font-bold text-on-surface mb-4">Personal Information</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">Full Name</label>
            <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">Email</label>
            <input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" type="email" />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">Phone</label>
            <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" placeholder="+1 (555) 000-0000" />
          </div>
          <button onClick={handleProfileSave} className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <h3 className="text-base font-bold text-on-surface mb-4">Change Password</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">Current Password</label>
            <input value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" type="password" />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">New Password</label>
            <input value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" type="password" />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant mb-1 block">Confirm New Password</label>
            <input value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm border border-surface-container outline-none focus:border-primary transition-colors" type="password" />
          </div>
          <button onClick={handlePasswordChange} className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors">
            Update Password
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <h3 className="text-base font-bold text-on-surface mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { label: 'Order confirmations', desc: 'Receive email when order is placed', default: true },
            { label: 'Shipping updates', desc: 'Get notified when your order ships', default: true },
            { label: 'Promotional emails', desc: 'Deals, new arrivals, and exclusive offers', default: false },
            { label: 'Price drop alerts', desc: 'When items in your wishlist go on sale', default: true },
          ].map((pref, i) => (
            <label key={i} className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-on-surface">{pref.label}</p>
                <p className="text-xs text-on-surface-variant">{pref.desc}</p>
              </div>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${pref.default ? 'bg-primary' : 'bg-surface-container-high'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pref.default ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-surface-container-low rounded-xl p-6 border border-surface-container/60">
        <h3 className="text-base font-bold text-on-surface mb-4">Account Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-on-surface-variant">Account ID</span><span className="text-on-surface font-mono text-xs">{user?._id}</span></div>
          <div className="flex justify-between"><span className="text-on-surface-variant">Role</span><span className="text-on-surface capitalize">{user?.role || 'Customer'}</span></div>
          <div className="flex justify-between"><span className="text-on-surface-variant">Member Since</span><span className="text-on-surface">{memberSince}</span></div>
          <div className="flex justify-between"><span className="text-on-surface-variant">Loyalty Points</span><span className="text-on-surface font-semibold">{user?.loyaltyPoints || 0} pts</span></div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'orders': return renderOrders();
      case 'wishlist': return renderWishlist();
      case 'addresses': return renderAddresses();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <main className="flex-1 w-full px-3 md:px-6 lg:px-8 pr-4 md:pr-margin-desktop py-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-fade-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          <span className="material-symbols-outlined text-lg">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">My Account</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your profile, orders, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-thin">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedOrder(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </main>
  );
};

export default UserDashboard;
