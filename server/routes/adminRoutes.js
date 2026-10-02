const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getAnalytics,
  bulkUpdateStock,
  adjustStock,
  getStockHistory,
  getAllProducts,
} = require('../controllers/adminController');
const { protect, requirePermission } = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const { User } = require('../models/User');
const Order = require('../models/Order');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Navigation = require('../models/Navigation');
const Promotion = require('../models/Promotion');
const Settings = require('../models/Settings');

router.get('/stats', protect, requirePermission('dashboard:view'), getAdminStats);

router.get('/products', protect, requirePermission('products:view'), getAllProducts);

router.get('/users', protect, requirePermission('customers:view'), getAllUsers);
router.get('/users/:id', protect, requirePermission('customers:view'), getUserById);
router.put('/users/:id', protect, requirePermission('customers:edit'), updateUser);
router.delete('/users/:id', protect, requirePermission('customers:edit'), deleteUser);

router.get('/orders', protect, requirePermission('orders:view'), getAllOrders);
router.get('/orders/:id', protect, requirePermission('orders:view'), getOrderById);
router.put('/orders/:id/status', protect, requirePermission('orders:edit'), updateOrderStatus);
router.put('/orders/:id/cancel', protect, requirePermission('orders:cancel'), cancelOrder);

router.get('/analytics', protect, requirePermission('analytics:view'), getAnalytics);

router.put('/inventory/bulk', protect, requirePermission('products:edit'), bulkUpdateStock);
router.put('/inventory/:id/adjust', protect, requirePermission('products:edit'), adjustStock);
router.get('/inventory/:id/history', protect, requirePermission('products:view'), getStockHistory);

// @desc    Seed database (production)
// @route   POST /api/admin/seed
// @access  Private/Super Admin only
router.post('/seed', protect, requirePermission('products:edit'), async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can seed' });
    }

    const products = require('../seed/seedData');

    await Product.deleteMany({});
    await Banner.deleteMany({});
    await Category.deleteMany({});
    await Navigation.deleteMany({});
    await Promotion.deleteMany({});
    await Settings.deleteMany({});

    const createdProducts = await Product.insertMany(products);

    await Banner.insertMany([
      { title: 'Summer Sale!', subtitle: 'Up to 50% off', description: 'Shop the biggest sale', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200', link: '/shop', ctaText: 'Shop Now', position: 'hero', isActive: true, order: 0, bgColor: '#fff5f0' },
      { title: 'New Arrivals', subtitle: 'Fresh drops weekly', description: 'Check out the latest', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', link: '/shop', ctaText: 'Explore', position: 'hero', isActive: true, order: 1, bgColor: '#f0fffe' },
    ]);

    await Category.insertMany([
      { name: 'Electronics', slug: 'electronics', description: 'Gadgets and tech', icon: 'devices', image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600', isActive: true, order: 0, productCount: 15 },
      { name: 'Fashion', slug: 'fashion', description: 'Trendy clothing', icon: 'apparel', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600', isActive: true, order: 1, productCount: 18 },
      { name: 'Home Decor', slug: 'home-decor', description: 'Living space items', icon: 'deck', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600', isActive: true, order: 2, productCount: 12 },
      { name: 'Toys', slug: 'toys', description: 'Fun toys for all ages', icon: 'toys', image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600', isActive: true, order: 3, productCount: 10 },
      { name: 'Beauty', slug: 'beauty', description: 'Skincare and makeup', icon: 'spa', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600', isActive: true, order: 4, productCount: 10 },
      { name: 'Sports', slug: 'sports', description: 'Fitness gear', icon: 'fitness_center', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600', isActive: true, order: 5, productCount: 10 },
      { name: 'Books', slug: 'books', description: 'Notebooks and stationery', icon: 'menu_book', image: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=600', isActive: true, order: 6, productCount: 8 },
      { name: 'Pet Supplies', slug: 'pet-supplies', description: 'For your pets', icon: 'pets', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', isActive: true, order: 7, productCount: 8 },
      { name: 'Grocery', slug: 'grocery', description: 'Coffee and snacks', icon: 'coffee', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', isActive: true, order: 8, productCount: 6 },
      { name: 'Automotive', slug: 'automotive', description: 'Car accessories', icon: 'directions_car', image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600', isActive: true, order: 9, productCount: 6 },
    ]);

    await Navigation.insertMany([
      { label: 'Home', url: '/', order: 0, isActive: true, position: 'header' },
      { label: 'Shop', url: '/shop', order: 1, isActive: true, position: 'header' },
      { label: 'Deals', url: '/shop?flash=true', order: 2, isActive: true, position: 'header' },
    ]);

    await Promotion.insertMany([
      { name: 'Welcome', code: 'WELCOME20', description: '20% off', type: 'percentage', value: 20, minPurchase: 25, maxDiscount: 50, usageLimit: 1000, usedCount: 234, isActive: true, showInSidebar: true, sidebarTitle: 'New Customer?', sidebarSubtitle: 'Get 20% off', sidebarButtonText: 'Shop Now', sidebarBgColor: '#a43c12', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    ]);

    await Settings.create({});

    res.json({ message: `Seeded ${createdProducts.length} products, categories, banners, and promotions` });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Seed failed: ' + error.message });
  }
});

module.exports = router;
