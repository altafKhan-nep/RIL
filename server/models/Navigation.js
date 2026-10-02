const mongoose = require('mongoose');

const navigationSchema = mongoose.Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Navigation', default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isExternal: { type: Boolean, default: false },
    openInNewTab: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    position: { type: String, enum: ['header', 'footer', 'mobile'], default: 'header' },
  },
  { timestamps: true }
);

navigationSchema.virtual('children', {
  ref: 'Navigation',
  localField: '_id',
  foreignField: 'parent',
});

navigationSchema.set('toJSON', { virtuals: true });
navigationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Navigation', navigationSchema);
