import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListingPage = lazy(() => import('./pages/ProductListingPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminNavigation = lazy(() => import('./pages/admin/AdminNavigation'));
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-medium text-on-surface-variant/50">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
              <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
              <Route path="/admin/*" element={<ProtectedRoute requireAdmin><AdminShell /></ProtectedRoute>} />
              <Route path="/*" element={<MainShell />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const AdminShell = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="items" element={<AdminProducts />} />
      <Route path="items/new" element={<AdminProducts />} />
      <Route path="items/:id/edit" element={<AdminProducts />} />
      <Route path="orders" element={<AdminOrders />} />
      <Route path="customers" element={<AdminCustomers />} />
      <Route path="categories" element={<AdminCategories />} />
      <Route path="categories/new" element={<AdminCategories />} />
      <Route path="banners" element={<AdminBanners />} />
      <Route path="banners/new" element={<AdminBanners />} />
      <Route path="navigation" element={<AdminNavigation />} />
      <Route path="promotions" element={<AdminPromotions />} />
      <Route path="inventory" element={<AdminInventory />} />
      <Route path="analytics" element={<AdminAnalytics />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="settings/:section" element={<AdminSettings />} />
    </Routes>
  </Suspense>
);

const MainShell = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    <div className="flex-grow flex flex-col">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ProductListingPage />} />
          <Route path="/shop/:category" element={<ProductListingPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          <Route path="/track/:id" element={<OrderTrackingPage />} />
          <Route path="/account" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </Suspense>
    </div>
    <Footer />
  </div>
);

const AuthLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-background">
    {children}
  </div>
);

export default App;
