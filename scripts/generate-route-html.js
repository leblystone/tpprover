/**
 * After vite build: write dist/<route>/index.html copies with per-route
 * title, description, and canonical so crawlers see correct SEO without JS.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PUBLIC_PAGE_SEO, isNoindexPath } from '../src/seo/publicPageSEO.js';
import { getStaticCrawlerHtml, wrapStaticCrawlerHtml } from '../src/seo/staticCrawlerContent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const indexPath = join(distDir, 'index.html');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectSeo(html, seo, pathname) {
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const canonical = escapeHtml(seo.canonical);
  const robots = isNoindexPath(pathname)
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = out.replace(
    /<meta name="title" content="[^"]*"\s*\/?>/,
    `<meta name="title" content="${title}" />`
  );
  out = out.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`
  );
  out = out.replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${robots}" />`
  );
  out = out.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  out = out.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`
  );
  out = out.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`
  );
  out = out.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`
  );
  out = out.replace(
    /<meta name="twitter:url" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:url" content="${canonical}" />`
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  return out;
}

function injectCrawlerContent(html, pathname) {
  const fragment = wrapStaticCrawlerHtml(getStaticCrawlerHtml(pathname));
  if (!fragment) return html;
  if (html.includes('id="static-business-content"')) return html;
  return html.replace('<div id="root">', `${fragment}\n    <div id="root">`);
}

function main() {
  if (!existsSync(indexPath)) {
    console.error('[seo-routes] dist/index.html not found — run vite build first');
    process.exit(1);
  }

  const baseHtml = readFileSync(indexPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  let count = 0;

  for (const [pathname, seo] of Object.entries(PUBLIC_PAGE_SEO)) {
    if (pathname === '/') continue;

    const segment = pathname.replace(/^\//, '');
    const outDir = join(distDir, segment);
    const outPath = join(outDir, 'index.html');
    mkdirSync(outDir, { recursive: true });
    const html = injectCrawlerContent(injectSeo(baseHtml, seo, pathname), pathname);
    writeFileSync(outPath, html, 'utf8');
    count += 1;
  }

  writeFileSync(indexPath, injectSeo(baseHtml, PUBLIC_PAGE_SEO['/'], '/'), 'utf8');

  const sitemapPath = join(distDir, 'sitemap.xml');
  if (existsSync(join(root, 'public', 'sitemap.xml'))) {
    const sitemapSrc = readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8');
    const updated = sitemapSrc.replace(/<lastmod>[\d-]+<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
    writeFileSync(sitemapPath, updated, 'utf8');
  }

  const shopCrawler = getStaticCrawlerHtml('/shop') ? ' (shop static storefront)' : '';
  console.log(`[seo-routes] Generated ${count} route HTML files + updated root index (${today})${shopCrawler}`);
}

main();
