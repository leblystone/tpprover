/**
 * HTML shown in the initial response for crawlers (Stripe, etc.) that do not run JS.
 * Injected into dist/<route>/index.html at build time. Sync product list with src/data/products.js.
 */
const BASE = 'https://thepepplanner.app';

/** Representative catalog (names/prices for static HTML — live shop may add more via admin). */
const SHOP_CATALOG = [
  { slug: 'in-the-clouds-pep-planner', name: 'In The Clouds Pep Planner', price: 36.99, type: 'Physical planner (7×10)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'dune-pep-planner', name: 'Dune Pep Planner', price: 26.99, type: 'Physical planner (5×7)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'skyline-pep-planner', name: 'Skyline Pep Planner', price: 26.99, type: 'Physical planner (5×7)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'alchemist-bloom-pep-planner', name: 'Alchemist Bloom Pep Planner', price: 36.99, type: 'Physical planner (7×10)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'umber-pep-planner', name: 'Umber Pep Planner', price: 26.99, type: 'Physical planner (5×7)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'amino-axis-pep-planner', name: 'Amino Axis Pep Planner', price: 36.99, type: 'Physical planner (7×10)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'serum-pep-planner', name: 'Serum Pep Planner', price: 36.99, type: 'Physical planner (7×10)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'midnight-pep-planner', name: 'Midnight Pep Planner', price: 26.99, type: 'Physical planner (5×7)', desc: 'Paper research planner for peptide protocol tracking.' },
  { slug: 'research-bookmark', name: "Today's Research Bookmark", price: 2.5, type: 'Physical accessory', desc: 'Bookmark punched for Pep Planner binders.' },
  { slug: 'research-planner-dividers', name: 'Research Planner Tabs', price: 4.5, type: 'Physical accessory', desc: 'Sticker tabs to organize planner sections.' },
  { slug: 'digital-planner-sage-taupe-botanical', name: 'Digital Planner; Hyperlinked PDF', price: 19.99, type: 'Digital download', desc: 'Hyperlinked PDF planner; delivered by email after purchase.' },
];

function productRows() {
  return SHOP_CATALOG.map(
    (p) => `<li>
      <strong><a href="${BASE}/shop/products/${p.slug}">${p.name}</a></strong> —
      ${p.type} — <em>$${p.price.toFixed(2)} USD</em><br />
      ${p.desc}
    </li>`
  ).join('\n');
}

const SHOP_HTML = `
<header>
  <h1>The Pep Planner — Official Shop</h1>
  <p><strong>Business:</strong> The Pep Planner (Lebrock Maldonado)</p>
  <p>
    We sell <strong>physical paper PEP Planners</strong>, planner accessories, and select
    <strong>digital planner downloads</strong> for people tracking peptide research protocols,
    injection schedules, GLP-1 research notes, reconstitution dates, and stockpile organization.
  </p>
</header>

<section>
  <h2>How to buy</h2>
  <ol>
    <li>Browse products below or open our full interactive catalog on this page (JavaScript enabled).</li>
    <li>Add items to your cart and proceed to <strong>secure Stripe checkout</strong>.</li>
    <li>Physical planners and accessories ship to addresses in the United States. Digital items are delivered by email.</li>
  </ol>
</section>

<section>
  <h2>Product catalog (USD)</h2>
  <ul>
    ${productRows()}
  </ul>
  <p>Additional covers and limited editions may appear in <a href="${BASE}/shop/vault">The Vault</a>.</p>
</section>

<section>
  <h2>Other shop services</h2>
  <ul>
    <li><a href="${BASE}/shop/custom">Custom Pep Planners</a> — branded covers and layouts with digital proofs</li>
    <li><a href="${BASE}/shop/wholesale">Bulk &amp; Wholesale</a> — volume orders for clinics, coaches, and businesses</li>
    <li><a href="${BASE}/shop/group-discounts">Group discounts</a> — community and group-buy pricing</li>
    <li><a href="${BASE}/shop/vault">The Vault</a> — limited planner editions</li>
  </ul>
</section>

<section>
  <h2>Customer support &amp; policies</h2>
  <p>Email: <a href="mailto:contact@thepepplanner.com">contact@thepepplanner.com</a></p>
  <p>
    <a href="${BASE}/contact">Contact form</a> ·
    <a href="${BASE}/faq">FAQ</a> ·
    <a href="${BASE}/privacy">Privacy Policy</a> ·
    <a href="${BASE}/terms">Terms of Service</a> ·
    <a href="${BASE}/cancellation-policy">Cancellation Policy</a>
  </p>
</section>

<footer>
  <p>© The Pep Planner · Primary storefront: <a href="${BASE}/shop">${BASE}/shop</a></p>
</footer>
`.trim();

/** pathname → static HTML fragment (empty string if none). */
export const STATIC_CRAWLER_BY_PATH = {
  '/shop': SHOP_HTML,
};

export function getStaticCrawlerHtml(pathname) {
  return STATIC_CRAWLER_BY_PATH[pathname] || '';
}

export function wrapStaticCrawlerHtml(innerHtml) {
  if (!innerHtml) return '';
  return `<div id="static-business-content" data-static-storefront="true">
${innerHtml}
</div>
<noscript>${innerHtml}</noscript>`;
}
