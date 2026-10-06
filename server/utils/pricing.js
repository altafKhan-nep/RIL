const Settings = require('../models/Settings');
const Promotion = require('../models/Promotion');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function normalizeTaxRate(rate) {
  const n = Number(rate);
  if (Number.isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

async function getSettings() {
  const s = await Settings.findOne({});
  if (!s) {
    return {
      shipping: { freeShippingThreshold: 50, standardRate: 5.99 },
      tax: { enabled: true, rate: 0.08 },
    };
  }
  return s;
}

async function computeDiscount(promoCode, serverItemsPrice, userId) {
  if (!promoCode) return { discount: 0, freeShipping: false, promotion: null };
  const code = String(promoCode).trim().toUpperCase();
  if (!code) return { discount: 0, promotion: null };

  const promotion = await Promotion.findOne({ code });
  if (!promotion) {
    const e = new Error('Invalid promotion code');
    e.status = 400;
    throw e;
  }
  if (!promotion.isActive) {
    const e = new Error('This promotion is not active');
    e.status = 400;
    throw e;
  }
  const now = new Date();
  if (promotion.startDate && now < new Date(promotion.startDate)) {
    const e = new Error('This promotion has not started yet');
    e.status = 400;
    throw e;
  }
  if (promotion.endDate && now > new Date(promotion.endDate)) {
    const e = new Error('This promotion has expired');
    e.status = 400;
    throw e;
  }
  if (promotion.usageLimit > 0 && promotion.usedCount >= promotion.usageLimit) {
    const e = new Error('This promotion has reached its usage limit');
    e.status = 400;
    throw e;
  }
  if (userId && promotion.maxPerUser > 0) {
    const used = (promotion.usedByUsers || []).filter((id) => id && id.toString() === userId.toString()).length;
    if (used >= promotion.maxPerUser) {
      const e = new Error(`You have already used this code ${promotion.maxPerUser} time(s)`);
      e.status = 400;
      throw e;
    }
  }
  if (promotion.minPurchase > 0 && serverItemsPrice < promotion.minPurchase) {
    const e = new Error(`Minimum purchase of $${promotion.minPurchase} required`);
    e.status = 400;
    throw e;
  }

  let discount = 0;
  let freeShipping = false;
  if (promotion.type === 'percentage') {
    discount = round2(serverItemsPrice * (promotion.value / 100));
    if (promotion.maxDiscount > 0 && discount > promotion.maxDiscount) discount = promotion.maxDiscount;
  } else if (promotion.type === 'fixed') {
    discount = round2(Math.min(promotion.value, serverItemsPrice));
  } else if (promotion.type === 'free_shipping') {
    // Free-shipping promotions zero the shipping charge (they do not reduce
    // the merchandise subtotal).
    freeShipping = true;
    discount = 0;
  }
  return { discount: round2(discount), freeShipping, promotion };
}

async function computePricing(items, promoCode, userId) {
  const settings = await getSettings();

  const itemsPrice = round2(items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0));

  const freeThreshold = Number(settings.shipping?.freeShippingThreshold ?? 50);
  const standardRate = Number(settings.shipping?.standardRate ?? 5.99);

  const { discount, freeShipping, promotion } = await computeDiscount(promoCode, itemsPrice, userId);

  // Shipping is free if the order meets the threshold OR holds a free-shipping promo.
  const shippingPrice = (itemsPrice >= freeThreshold || freeShipping) ? 0 : round2(standardRate);

  const taxEnabled = settings.tax?.enabled !== false;
  const taxRate = normalizeTaxRate(settings.tax?.rate ?? 0.08);
  const taxPrice = taxEnabled ? round2(itemsPrice * taxRate) : 0;

  const discountPrice = discount;

  const totalPrice = round2(itemsPrice + shippingPrice + taxPrice - discountPrice);

  return { itemsPrice, shippingPrice, taxPrice, discountPrice, totalPrice, freeShipping, promotion };
}

module.exports = { computePricing, computeDiscount, getSettings, round2, normalizeTaxRate };