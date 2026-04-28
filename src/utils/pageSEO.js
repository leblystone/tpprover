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
    title: 'FAQ - The Pep Planner',
    description: 'FAQ: GLP1 tracking, semaglutide and tirzepatide, weight loss tracking, protocols, stockpile, pricing, and support.',
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
 * Updates document.title, meta description, and canonical URL when the route changes.
 * Call this from a component that renders on every public page (e.g. each public page, or a shared layout).
 */
export function usePageSEO() {
  const { pathname } = useLocation();
  const seo = PAGE_SEO[pathname];

  useEffect(() => {
    if (!seo) return;
    
    // Update document title
    document.title = seo.title;
    
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', seo.description);
    
    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', seo.canonical);
    
    // Update Open Graph URL
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', seo.canonical);
    
    // Update Twitter URL
    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl) twitterUrl.setAttribute('content', seo.canonical);
    
  }, [pathname, seo]);
}
