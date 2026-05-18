import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Path -> { title, description, canonical } for public pages.
 * These are used as the browser tab title and the meta description for search/AI.
 * Edit the strings below to sound more human or on-brand.
 */
export const PAGE_SEO = {
  '/': {
    title: 'The Pep Planner - Track Peptide Research & Injection Schedules | Planner App',
    description: 'Planner to track peptide research and injection schedules: injection logging, smart scheduling, dose calculations, vial tracking, protocol management. Free trial on web and mobile.',
    canonical: 'https://thepepplanner.app/'
  },
  '/about': {
    title: 'About - The Pep Planner',
    description:
      'From paper planners and group-buy communities to the Pep Planner app: organized peptide research tools, built with support for independent research circles.',
    canonical: 'https://thepepplanner.app/about'
  },
  '/shop': {
    title: 'Shop — Paper Pep Planners | The Pep Planner',
    description: 'Physical research planners and covers from The Pep Planner. Open our secure store for sizes, designs, and checkout.',
    canonical: 'https://thepepplanner.app/shop'
  },
  '/features': {
    title: 'Features - The Pep Planner',
    description: 'GLP tracking, semaglutide and tirzepatide tracking, weight loss tracking, reconstitution calculator, protocol and stockpile management. See what The Pep Planner can do.',
    canonical: 'https://thepepplanner.app/features'
  },
  '/pricing': {
    title: 'Pricing - The Pep Planner',
    description: 'Pricing and plans for The Pep Planner. Free trial, monthly, annual, and lifetime options.',
    canonical: 'https://thepepplanner.app/pricing'
  },
  '/resources': {
    title: 'Resources - The Pep Planner',
    description:
      'Links to FAQ, pricing, features, shop, about, and contact—quick paths for Pep Planner users and researchers.',
    canonical: 'https://thepepplanner.app/resources'
  },
  '/faq': {
    title: 'FAQ — Peptide Research Tracker, GLP-1 Dosing & Protocol Management | The Pep Planner',
    description: 'Common questions about tracking peptide protocols, GLP-1 dosing (semaglutide, tirzepatide), reconstitution math, stockpile management, Research+ features, AI Research, Buddy System, and pricing.',
    canonical: 'https://thepepplanner.app/faq'
  },
  '/contact': {
    title: 'Contact - The Pep Planner',
    description: 'Contact The Pep Planner. Send a message or email for support and questions.',
    canonical: 'https://thepepplanner.app/contact'
  },
  '/privacy': {
    title: 'Privacy Policy - The Pep Planner',
    description: 'Privacy policy for The Pep Planner. How we collect, use, and protect your data.',
    canonical: 'https://thepepplanner.app/privacy'
  },
  '/terms': {
    title: 'Terms of Service - The Pep Planner',
    description: 'Terms of service for The Pep Planner.',
    canonical: 'https://thepepplanner.app/terms'
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy - The Pep Planner',
    description: 'Cancellation and refund policy for The Pep Planner subscriptions.',
    canonical: 'https://thepepplanner.app/cancellation-policy'
  }
};

/**
 * Updates document.title, meta description, canonical URL, and OG tags when the route changes.
 * Pass an override object to use dynamic values (e.g. product pages).
 * @param {Object} [overrides] — { title, description, canonical, ogImage }
 */
export function usePageSEO(overrides) {
  const { pathname } = useLocation();
  const staticSeo = PAGE_SEO[pathname];
  const seo = overrides?.title ? overrides : staticSeo;

  useEffect(() => {
    if (!seo) return;
    
    document.title = seo.title;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', seo.description || '');
    
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    if (seo.canonical) canonicalLink.setAttribute('href', seo.canonical);
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && seo.canonical) ogUrl.setAttribute('content', seo.canonical);
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', seo.title);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', seo.description || '');

    if (seo.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', seo.ogImage);
    }
    
    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl && seo.canonical) twitterUrl.setAttribute('content', seo.canonical);
    
  }, [pathname, seo, overrides]);
}
