const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema(
  {
    store: {
      name: { type: String, default: 'NovaCart' },
      tagline: { type: String, default: 'Discover Joy in Every Box' },
      logo: { type: String, default: '' },
      favicon: { type: String, default: '' },
      contactEmail: { type: String, default: 'support@novacart.com' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    payment: {
      currency: { type: String, default: 'USD' },
      currencySymbol: { type: String, default: '$' },
      acceptCreditCards: { type: Boolean, default: true },
      acceptPaypal: { type: Boolean, default: false },
      stripePublicKey: { type: String, default: '' },
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 50 },
      standardRate: { type: Number, default: 5.99 },
      expressRate: { type: Number, default: 12.99 },
      enableLocalDelivery: { type: Boolean, default: false },
    },
    tax: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0.08 },
      includeInPrice: { type: Boolean, default: false },
    },
    notifications: {
      orderConfirmation: { type: Boolean, default: true },
      shippingUpdates: { type: Boolean, default: true },
      lowStockAlert: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 5 },
      newOrderAlert: { type: Boolean, default: true },
    },
    security: {
      requireEmailVerification: { type: Boolean, default: false },
      enableTwoFactor: { type: Boolean, default: false },
      sessionTimeout: { type: Number, default: 30 },
      maxLoginAttempts: { type: Number, default: 5 },
    },
    seo: {
      metaTitle: { type: String, default: 'NovaCart - Discover Joy in Every Box' },
      metaDescription: { type: String, default: 'Shop vibrant fashion, quirky electronics, and home delights.' },
      ogImage: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
