import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_PAGE_SEO, isNoindexPath } from '../seo/publicPageSEO';

export const PAGE_SEO = PUBLIC_PAGE_SEO;

/**
 * Updates document.title, meta description, canonical URL, robots, and OG tags when the route changes.
 * @param {Object} [overrides] — { title, description, canonical, ogImage, noindex }
 */
export function usePageSEO(overrides) {
  const { pathname } = useLocation();
  const staticSeo = PUBLIC_PAGE_SEO[pathname];
  const seo = overrides?.title ? overrides : staticSeo;
  const noindex = overrides?.noindex || isNoindexPath(pathname);

  useEffect(() => {
    if (!seo && !noindex) return;

    if (seo?.title) document.title = seo.title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && seo?.description) metaDesc.setAttribute('content', seo.description);

    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) {
      metaRobots.setAttribute(
        'content',
        noindex
          ? 'noindex, nofollow'
          : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      );
    }

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    if (noindex) {
      canonicalLink.remove();
    } else if (seo?.canonical) {
      canonicalLink.setAttribute('href', seo.canonical);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && seo?.canonical && !noindex) ogUrl.setAttribute('content', seo.canonical);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && seo?.title) ogTitle.setAttribute('content', seo.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && seo?.description) ogDesc.setAttribute('content', seo.description);

    if (seo?.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', seo.ogImage);
    }

    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl && seo?.canonical && !noindex) twitterUrl.setAttribute('content', seo.canonical);
  }, [pathname, seo, overrides, noindex]);
}
