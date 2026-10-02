const connectDB = require('../config/db');
const Banner = require('../models/Banner');
const Product = require('../models/Product');

const BANNERS = [
  {
    key: 'hero-heirloom-kitchen-cabinets',
    title: 'Heirloom Kitchen Cabinetry',
    subtitle:
      'Hand-dovelled solid hardwood carcasses with soft-close hardware and factory-finished faces that age beautifully.',
    ctaText: 'Shop Cabinetry',
    position: 'hero',
    order: 0,
    productSlug: 'heirloom-kitchen-cabinets',
    bgColor: '#3f2d20',
  },
  {
    key: 'hero-signature-kitchen-island',
    title: 'The Signature Kitchen Island',
    subtitle:
      'A full-width centerpiece in book-matched stone with integrated seating and hidden prep storage.',
    ctaText: 'Explore Islands',
    position: 'hero',
    order: 1,
    productSlug: 'signature-kitchen-island',
    bgColor: '#2f3a33',
  },
  {
    key: 'hero-live-edge-dining-table',
    title: 'Live-Edge Dining Tables',
    subtitle:
      'One-of-a-kind slabs, each selected for grain and edge character, paired with engineered steel or hardwood bases.',
    ctaText: 'View Tables',
    position: 'hero',
    order: 2,
    productSlug: 'live-edge-dining-table',
    bgColor: '#4a3728',
  },
  {
    key: 'promo-reach-in-closet-system',
    title: 'Reach-In Closet Systems',
    subtitle: 'Built to the opening. Flush, built-in storage with adjustable shelving.',
    ctaText: 'Shop Closets',
    position: 'promo',
    order: 0,
    productSlug: 'reach-in-closet-system',
    bgColor: '#ffffff',
  },
  {
    key: 'promo-architectural-fireplace-mantel',
    title: 'Architectural Fireplace Mantels',
    subtitle: 'Cast and carved surrounds engineered for high-output inserts.',
    ctaText: 'Shop Mantels',
    position: 'promo',
    order: 1,
    productSlug: 'architectural-fireplace-mantel',
    bgColor: '#ffffff',
  },
];

const seedBanners = async () => {
  try {
    await connectDB();

    let created = 0;
    let updated = 0;

    for (const def of BANNERS) {
      const image = `/uploads/${def.productSlug}.avif`;

      let link = '/shop';
      const product = await Product.findOne({ slug: def.productSlug }).select('_id');
      if (product) {
        link = `/product/${product._id}`;
      } else {
        console.log(`Warning: no product found for slug "${def.productSlug}"`);
      }

      const payload = {
        title: def.title,
        subtitle: def.subtitle,
        description: '',
        image,
        link,
        ctaText: def.ctaText,
        position: def.position,
        targetPages: ['home'],
        isActive: true,
        order: def.order,
        startDate: null,
        endDate: null,
        bgColor: def.bgColor,
      };

      const existing = await Banner.findOne({ title: def.title, position: def.position });

      if (existing) {
        Object.assign(existing, payload);
        await existing.save();
        updated += 1;
      } else {
        await Banner.create(payload);
        created += 1;
      }
    }

    const hero = await Banner.countDocuments({ position: 'hero', isActive: true });
    const promo = await Banner.countDocuments({ position: 'promo', isActive: true });

    console.log(`Banners: ${created} created, ${updated} updated`);
    console.log(`Active hero: ${hero}, active promo: ${promo}`);

    console.log('\n--- Banner Seed Complete ---');
    console.log('Manage these at http://localhost:5173/admin/banners');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedBanners();