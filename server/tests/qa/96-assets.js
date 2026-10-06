const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const ASSET_DIRS = [
  path.join(ROOT, 'client', 'public', 'uploads'),
  path.join(ROOT, 'server', 'uploads'),
];

// Stored paths look like "/uploads/foo.avif" while ASSET_DIRS already point at
// an uploads directory, so the leading segment must be stripped.
const assetRelative = (p) => String(p || '').replace(/^\/+/, '').replace(/^uploads[\\/]/, '');

const resolveAsset = (storedPath) => {
  const rel = assetRelative(storedPath);
  if (!rel || rel.includes('..')) return null;
  for (const dir of ASSET_DIRS) {
    const full = path.join(dir, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
};

// Remote URLs are fetched directly and cannot be checked on disk.
const isRemote = (p) => /^https?:\/\//i.test(String(p || ''));

/**
 * Reads the catalog straight from the exported file rather than the QA
 * fixtures, because the fixtures use their own unrelated images. This mirrors
 * what production actually serves.
 */
const readCatalog = () => {
  const file = path.join(ROOT, 'server', 'catalog-export.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

module.exports = {
  name: 'Storefront Asset Integrity',
  tests: [
    {
      name: 'Every local image path in the catalog resolves to a real file',
      fn: async () => {
        const catalog = readCatalog();
        assert.ok(catalog, 'catalog-export.json must exist');

        const referenced = [
          ...catalog.products.flatMap((p) => p.images || []),
          ...catalog.categories.map((c) => c.image).filter(Boolean),
        ].filter((p) => !isRemote(p));

        assert.ok(referenced.length, 'catalog should reference local images');

        const missing = referenced.filter((p) => !resolveAsset(p));
        // This is the regression that shipped 7 broken product images: the
        // database pointed at "-product.avif" files that were never created.
        assert.deepStrictEqual(
          missing,
          [],
          `image path(s) referenced by the catalog but absent from the uploads directories:\n${missing.map((m) => `    - ${m}`).join('\n')}`
        );
      },
    },
    {
      name: 'Product images use a path distinct from their category image',
      fn: async () => {
        const catalog = readCatalog();
        const catImages = new Set(catalog.categories.map((c) => assetRelative(c.image)).filter(Boolean));
        const collisions = catalog.products
          .flatMap((p) => (p.images || []).map((img) => ({ product: p.name, img })))
          .filter((x) => catImages.has(assetRelative(x.img)));
        assert.deepStrictEqual(
          collisions,
          [],
          `product image(s) share a path with a category, so editing one changes the other:\n${collisions.map((c) => `    - ${c.product}: ${c.img}`).join('\n')}`
        );
      },
    },
    {
      name: 'No orphan product image files (a file no product references)',
      fn: async () => {
        const catalog = readCatalog();
        const referenced = new Set(
          [
            ...catalog.products.flatMap((p) => p.images || []),
            ...catalog.categories.map((c) => c.image),
          ].map(assetRelative).filter(Boolean)
        );
        const clientDir = ASSET_DIRS[0];
        const onDisk = fs.readdirSync(clientDir).filter((f) => /\.(avif|jpe?g|png|webp|gif)$/i.test(f));
        const orphans = onDisk.filter((f) => !referenced.has(f));
        // Informational: orphans are not fatal, but they bloat the deploy.
        assert.strictEqual(orphans.length, 0, `unreferenced image file(s): ${orphans.join(', ')}`);
      },
    },
    {
      name: 'The logo asset is present and referenced by the storefront',
      fn: async () => {
        const logo = path.join(ROOT, 'client', 'public', 'logo_lip.png');
        assert.ok(fs.existsSync(logo), 'client/public/logo_lip.png must exist');
        const navbar = path.join(ROOT, 'client', 'src', 'components', 'Navbar.jsx');
        assert.ok(fs.readFileSync(navbar, 'utf8').includes('/logo_lip.png'), 'Navbar should reference the logo');
      },
    },
    {
      name: 'Catalog banners reference real products and resolvable images',
      fn: async () => {
        const catalog = readCatalog();
        const banners = catalog.banners || [];
        assert.ok(banners.length, 'catalog should define banners');

        const productSlugs = new Set(catalog.products.map((p) => p.slug));
        for (const b of banners) {
          // A hardcoded ObjectId link is the bug this guards against: ids are
          // per-database, so a link copied from another environment 404s.
          assert.ok(b.productSlug, `banner "${b.title}" must use productSlug`);
          assert.ok(productSlugs.has(b.productSlug),
            `banner "${b.title}" references unknown product "${b.productSlug}"`);
          assert.ok(!/\/[a-f0-9]{24}/.test(String(b.link || '')),
            `banner "${b.title}" must not carry a hardcoded id in link`);
          assert.ok(b.title && b.ctaText, `banner "${b.title}" needs a title and ctaText`);
          assert.ok(['hero', 'promo', 'footer', 'sidebar'].includes(b.position),
            `banner "${b.title}" has invalid position "${b.position}"`);
          if (!isRemote(b.image)) {
            assert.ok(resolveAsset(b.image), `banner "${b.title}" image missing on disk: ${b.image}`);
          }
        }
      },
    },
    {
      name: 'Every catalog product has the fields the storefront needs',
      fn: async () => {
        const catalog = readCatalog();
        const catNames = new Set(catalog.categories.map((c) => c.name));
        const catSlugs = new Set(catalog.categories.map((c) => c.slug));
        const problems = [];
        for (const p of catalog.products) {
          if (!(Number(p.price) > 0)) problems.push(`${p.name}: price ${p.price}`);
          if (!p.description) problems.push(`${p.name}: no description`);
          if (!catNames.has(p.category) && !catSlugs.has(p.category)) problems.push(`${p.name}: unknown category "${p.category}"`);
          if (!p.slug) problems.push(`${p.name}: no slug`);
          if (!(Number(p.countInStock) >= 0)) problems.push(`${p.name}: bad countInStock`);
        }
        assert.deepStrictEqual(problems, [], `catalog problems:\n    ${problems.join('\n    ')}`);
      },
    },
  ],
};