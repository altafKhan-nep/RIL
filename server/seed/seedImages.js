const fs = require('fs');
const os = require('os');
const path = require('path');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');

const SOURCE_DIR = process.argv[2] || path.join(os.homedir(), 'Downloads');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const IMAGE_MAP = {
  'estate-dining-table': 'Estate-Dining-Table.avif',
  'live-edge-dining-table': 'Live-Edge-Dining-Table.avif',
  'heirloom-kitchen-cabinets': 'Heirloom-Kitchen-Cabinets.avif',
  'signature-kitchen-island': 'Signature Kitchen Island.avif',
  'custom-dining-bench': 'Custom Dinig Bench.avif',
  'commercial-reception-desk': 'Commercial Reception Desk.avif',
  'boutique-walk-in-closet': 'Boutique Walk-In Closet.avif',
  'architectural-fireplace-mantel': 'Architectural Fireplace Mantel.avif',
  'reach-in-closet-system': 'Reach-In Closet System.avif',
};

const NEW_ENTRIES = {
  'reach-in-closet-system': {
    category: {
      name: 'Reach-In Closet System',
      description:
        'A full-height reach-in closet system with adjustable shelving, hanging rods, and pull-out storage. Built to the opening for a flush, built-in appearance.',
    },
    product: {
      name: 'Reach-In Closet System',
      category: 'Reach-In Closet System',
      description:
        'A full-height reach-in closet system with adjustable shelving, hanging rods, and pull-out storage. Built to the opening for a flush, built-in appearance.',
      price: 7400,
      countInStock: 2,
      colors: ['#F5F5F4', '#8B4513'],
      features: [
        'Adjustable 32mm shelving on 32mm holes',
        'Double hanging + top shelf',
        'Soft-close doors, site-tempered',
        '10-14 weeks',
      ],
      isNewArrival: true,
    },
  },
};

const copyImages = () => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const copied = [];
  const missing = [];

  for (const [slug, filename] of Object.entries(IMAGE_MAP)) {
    const src = path.join(SOURCE_DIR, filename);
    if (!fs.existsSync(src)) {
      missing.push(filename);
      continue;
    }
    const dest = path.join(UPLOADS_DIR, `${slug}.avif`);
    fs.copyFileSync(src, dest);
    copied.push(dest);
  }

  return { copied, missing };
};

const seedImages = async () => {
  try {
    if (!fs.existsSync(SOURCE_DIR)) {
      console.error(`Source directory not found: ${SOURCE_DIR}`);
      console.error('Usage: node seed/seedImages.js [source-dir]');
      process.exit(1);
    }

    await connectDB();

    const { copied, missing } = copyImages();
    console.log(`Copied ${copied.length} images into server/uploads`);
    if (missing.length) {
      console.log(`Missing source files (${missing.length}):`);
      missing.forEach((f) => console.log(`  - ${f}`));
    }

    let catsUpdated = 0;
    let prodsUpdated = 0;
    let catsCreated = 0;
    let prodsCreated = 0;
    const skipped = [];

    for (const slug of Object.keys(IMAGE_MAP)) {
      const url = `/uploads/${slug}.avif`;
      const extra = NEW_ENTRIES[slug];

      let category = await Category.findOne({ slug });
      if (category) {
        category.image = url;
        await category.save();
        catsUpdated += 1;
      } else if (extra) {
        category = await Category.create({
          name: extra.category.name,
          slug,
          description: extra.category.description,
          image: url,
          icon: 'category',
          parent: null,
          isActive: true,
          order: 0,
          productCount: 0,
        });
        catsCreated += 1;
      } else {
        skipped.push(`category:${slug}`);
        continue;
      }

      let product = await Product.findOne({ slug });
      if (product) {
        product.images = [url];
        await product.save();
        prodsUpdated += 1;
      } else if (extra) {
        await Product.create({
          ...extra.product,
          slug,
          sku: `${slug}-${Date.now().toString(36)}`,
          originalPrice: 0,
          costPrice: 0,
          minStockLevel: 5,
          images: [url],
          badge: '',
          isFeatured: false,
          isBestseller: false,
          isFlashDeal: false,
          status: 'active',
        });
        prodsCreated += 1;
      } else {
        skipped.push(`product:${slug}`);
      }
    }

    console.log(
      `\nCategories: ${catsUpdated} updated, ${catsCreated} created` +
        `\nProducts:   ${prodsUpdated} updated, ${prodsCreated} created`
    );

    if (skipped.length) {
      console.log(`\nNo match found for (left untouched):`);
      skipped.forEach((s) => console.log(`  - ${s}`));
    }

    console.log('\n--- Image Seed Complete ---');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedImages();