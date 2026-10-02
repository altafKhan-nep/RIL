const mongoose = require('mongoose');

const promotionSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
    value: { type: Number, required: true, default: 0 },
    minPurchase: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    maxPerUser: { type: Number, default: 0 },
    usedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    applicableCategories: [String],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    showInSidebar: { type: Boolean, default: false },
    sidebarTitle: { type: String, default: 'Special Offer' },
    sidebarSubtitle: { type: String, default: '' },
    sidebarButtonText: { type: String, default: 'Shop Now' },
    sidebarBgColor: { type: String, default: '#a43c12' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
