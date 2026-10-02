const mongoose = require('mongoose');

const bannerSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    link: { type: String, default: '/' },
    ctaText: { type: String, default: 'Shop Now' },
    position: { type: String, enum: ['hero', 'promo', 'footer', 'sidebar'], default: 'hero' },
    targetPages: [{ type: String, enum: ['home', 'shop', 'product'] }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    bgColor: { type: String, default: '#ffffff' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
