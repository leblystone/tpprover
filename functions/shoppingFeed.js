const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

exports.shoppingFeed = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const db = admin.firestore();
      const snap = await db.collection('shopProducts')
        .where('active', '==', true)
        .orderBy('sortOrder', 'asc')
        .get();

      const BASE_URL = 'https://thepepplanner.app';
      const items = [];

      snap.forEach((doc) => {
        const p = doc.data();
        const imageUrl = p.image?.url || p.image || '';
        const slug = p.slug || doc.id;
        const stock = p.stock ?? 0;
        const availability = stock > 0 ? 'in_stock' : 'out_of_stock';

        const categoryMap = {
          planner: 'Office Supplies > General Office Supplies > Planners',
          accessory: 'Office Supplies > General Office Supplies > Planners',
          digital: 'Media > Books > Print Books',
        };

        items.push(`    <item>
      <g:id>${escapeXml(p.sku || doc.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description || p.name)}</g:description>
      <g:link>${BASE_URL}/shop/products/${escapeXml(slug)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:price>${Number(p.price || 0).toFixed(2)} USD</g:price>
      <g:availability>${availability}</g:availability>
      <g:brand>The PEP Planner</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${escapeXml(categoryMap[p.category] || categoryMap.planner)}</g:google_product_category>
      ${p.requiresShipping ? '<g:shipping_weight>1 lb</g:shipping_weight>' : ''}
    </item>`);
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>The PEP Planner Shop</title>
    <link>${BASE_URL}/shop</link>
    <description>Research planners, accessories, and digital downloads from The PEP Planner</description>
${items.join('\n')}
  </channel>
</rss>`;

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);
      logger.info(`Shopping feed served: ${items.length} products`);
    } catch (err) {
      logger.error('Shopping feed error:', err);
      res.status(500).send('Internal server error');
    }
  }
);
