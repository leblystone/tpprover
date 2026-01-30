import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Path -> { title, description } for public pages.
 * These are used as the browser tab title and the meta description for search/AI.
 * Edit the strings below to sound more human or on-brand.
 */
export const PAGE_SEO = {
  '/': {
    title: 'The Pep Planner - Peptide Research Protocol Tracking and Management',
    description: 'Peptide and GLP-1 tracking app: semaglutide, tirzepatide, and weight loss tracking. Track protocols, stockpile, dosing, and reconstitution. Free trial.'
  },
  '/about': {
    title: 'About - The Pep Planner',
    description: 'Learn about The Pep Planner: peptide and GLP1 tracking app for semaglutide, tirzepatide, weight loss tracking, protocols, stockpile, and orders.'
  },
  '/features': {
    title: 'Features - The Pep Planner',
    description: 'GLP tracking, semaglutide and tirzepatide tracking, weight loss tracking, reconstitution calculator, protocol and stockpile management. See what The Pep Planner can do.'
  },
  '/pricing': {
    title: 'Pricing - The Pep Planner',
    description: 'Pricing and plans for The Pep Planner. Free trial, monthly, annual, and lifetime options.'
  },
  '/blog': {
    title: 'Blog & Resources - The Pep Planner',
    description: 'Guides and tips for peptide research, GLP-1 tracking, semaglutide, tirzepatide, weight loss tracking, and protocol management.'
  },
  '/resources': {
    title: 'Resources - The Pep Planner',
    description: 'Guides and tips for peptide research, GLP-1 tracking, semaglutide, tirzepatide, weight loss tracking, and protocol management.'
  },
  '/faq': {
    title: 'FAQ - The Pep Planner',
    description: 'FAQ: GLP1 tracking, semaglutide and tirzepatide, weight loss tracking, protocols, stockpile, pricing, and support.'
  },
  '/privacy': {
    title: 'Privacy Policy - The Pep Planner',
    description: 'Privacy policy for The Pep Planner. How we collect, use, and protect your data.'
  },
  '/terms': {
    title: 'Terms of Service - The Pep Planner',
    description: 'Terms of service for The Pep Planner.'
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy - The Pep Planner',
    description: 'Cancellation and refund policy for The Pep Planner subscriptions.'
  }
};

/**
 * Updates document.title and the meta description tag when the route changes.
 * Call this from a component that renders on every public page (e.g. each public page, or a shared layout).
 */
export function usePageSEO() {
  const { pathname } = useLocation();
  const seo = PAGE_SEO[pathname];

  useEffect(() => {
    if (!seo) return;
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', seo.description);
  }, [pathname, seo]);
}
