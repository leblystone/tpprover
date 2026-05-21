const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

function escapeXml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

exports.sitemap = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const BASE_URL = 'https://thepepplanner.app';
      const now = new Date().toISOString().split('T')[0];

      const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'weekly' },
        { loc: '/shop', priority: '0.9', changefreq: 'daily' },
        { loc: '/shop/custom', priority: '0.8', changefreq: 'monthly' },
        { loc: '/shop/wholesale', priority: '0.8', changefreq: 'monthly' },
        { loc: '/shop/group-discounts', priority: '0.7', changefreq: 'monthly' },
        { loc: '/shop/vault', priority: '0.8', changefreq: 'weekly' },
        { loc: '/features', priority: '0.9', changefreq: 'monthly' },
        { loc: '/pricing', priority: '0.9', changefreq: 'monthly' },
        { loc: '/about', priority: '0.8', changefreq: 'monthly' },
        { loc: '/faq', priority: '0.9', changefreq: 'monthly' },
        { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
        { loc: '/resources', priority: '0.8', changefreq: 'weekly' },
        { loc: '/privacy', priority: '0.5', changefreq: 'yearly' },
        { loc: '/terms', priority: '0.5', changefreq: 'yearly' },
        { loc: '/cancellation-policy', priority: '0.3', changefreq: 'yearly' },
      ];

      const db = admin.firestore();
      const snap = await db.collection('shopProducts')
        .where('active', '==', true)
        .get();

      const productPages = [];
      snap.forEach((doc) => {
        const p = doc.data();
        const slug = p.slug || doc.id;
        productPages.push({
          loc: `/shop/products/${slug}`,
          priority: '0.8',
          changefreq: 'weekly',
        });
      });

      const allPages = [...staticPages, ...productPages];

      const urls = allPages.map((page) =>
        `  <url>
    <loc>${escapeXml(BASE_URL + page.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
      ).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);
      logger.info(`Sitemap served: ${allPages.length} URLs`);
    } catch (err) {
      logger.error('Sitemap error:', err);
      res.status(500).send('Internal server error');
    }
  }
);
