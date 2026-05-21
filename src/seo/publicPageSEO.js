/**
 * Static SEO metadata for public marketing routes.
 * Used by usePageSEO (client) and scripts/generate-route-html.js (build).
 */
export const PUBLIC_PAGE_SEO = {
  '/': {
    title: 'The Pep Planner - Track Peptide Research & Injection Schedules | Planner App',
    description:
      'Planner to track peptide research and injection schedules: injection logging, smart scheduling, dose calculations, vial tracking, protocol management. Free trial on web and mobile.',
    canonical: 'https://thepepplanner.app/',
  },
  '/about': {
    title: 'About - The Pep Planner',
    description:
      'From paper planners and group-buy communities to the Pep Planner app: organized peptide research tools, built with support for independent research circles.',
    canonical: 'https://thepepplanner.app/about',
  },
  '/shop': {
    title: 'Shop — Paper Pep Planners | The Pep Planner',
    description:
      'Physical research planners and covers from The Pep Planner. Open our secure store for sizes, designs, and checkout.',
    canonical: 'https://thepepplanner.app/shop',
  },
  '/shop/reviews': {
    title: 'Customer Reviews | The Pep Planner Shop',
    description:
      'Customer reviews for The Pep Planner physical shop — website, Etsy, TikTok Shop, and peptide research community feedback.',
    canonical: 'https://thepepplanner.app/shop/reviews',
  },
  '/shop/custom': {
    title: 'Custom Pep Planners | The Pep Planner',
    description:
      'Order fully customized peptide research planners with your brand, layout, and sections. Digital proofs included.',
    canonical: 'https://thepepplanner.app/shop/custom',
  },
  '/shop/wholesale': {
    title: 'Bulk & Wholesale Pep Planners | The Pep Planner',
    description:
      'Bulk and wholesale peptide research planners for clinics, coaches, gyms, and group buys. Volume pricing available.',
    canonical: 'https://thepepplanner.app/shop/wholesale',
  },
  '/shop/group-discounts': {
    title: 'Group Discounts — Pep Planners | The Pep Planner',
    description:
      'Group-buy pricing on physical Pep Planners for communities, cohorts, and research circles.',
    canonical: 'https://thepepplanner.app/shop/group-discounts',
  },
  '/shop/vault': {
    title: 'The Vault — Limited Pep Planners | The Pep Planner',
    description:
      'Limited and special-edition Pep Planner covers and bundles from The Vault.',
    canonical: 'https://thepepplanner.app/shop/vault',
  },
  '/features': {
    title: 'Features - The Pep Planner',
    description:
      'GLP tracking, semaglutide and tirzepatide tracking, weight loss tracking, reconstitution calculator, protocol and stockpile management. See what The Pep Planner can do.',
    canonical: 'https://thepepplanner.app/features',
  },
  '/pricing': {
    title: 'Pricing - The Pep Planner',
    description: 'Pricing and plans for The Pep Planner. Free trial, monthly, annual, and lifetime options.',
    canonical: 'https://thepepplanner.app/pricing',
  },
  '/resources': {
    title: 'Resources - The Pep Planner',
    description:
      'Links to FAQ, pricing, features, shop, about, and contact—quick paths for Pep Planner users and researchers.',
    canonical: 'https://thepepplanner.app/resources',
  },
  '/faq': {
    title: 'FAQ — Peptide Research Tracker, GLP-1 Dosing & Protocol Management | The Pep Planner',
    description:
      'Common questions about tracking peptide protocols, GLP-1 dosing (semaglutide, tirzepatide), reconstitution math, stockpile management, Research+ features, AI Research, Buddy System, and pricing.',
    canonical: 'https://thepepplanner.app/faq',
  },
  '/contact': {
    title: 'Contact - The Pep Planner',
    description: 'Contact The Pep Planner. Send a message or email for support and questions.',
    canonical: 'https://thepepplanner.app/contact',
  },
  '/privacy': {
    title: 'Privacy Policy - The Pep Planner',
    description: 'Privacy policy for The Pep Planner. How we collect, use, and protect your data.',
    canonical: 'https://thepepplanner.app/privacy',
  },
  '/terms': {
    title: 'Terms of Service - The Pep Planner',
    description: 'Terms of service for The Pep Planner.',
    canonical: 'https://thepepplanner.app/terms',
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy - The Pep Planner',
    description: 'Cancellation and refund policy for The Pep Planner subscriptions.',
    canonical: 'https://thepepplanner.app/cancellation-policy',
  },
};

/** Paths that should never be indexed (also blocked in robots.txt where noted). */
export const NOINDEX_PATH_PREFIXES = [
  '/app',
  '/login',
  '/admin',
  '/api',
  '/downloads/',
  '/order/',
  '/shop/success',
  '/magic-link',
  '/launch-coming-soon',
  '/countdown',
  '/test-countdown',
  '/original-landing',
  '/delete-account',
];

export function isNoindexPath(pathname) {
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}
