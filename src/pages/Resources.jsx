import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, HelpCircle, BookOpen, Store, LayoutGrid, ChevronRight, BadgeDollarSign } from 'lucide-react';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';

const LINKS = [
  {
    to: '/faq',
    label: 'FAQ',
    description: 'Answers about plans, tracking, sync, and common workflows.',
    Icon: HelpCircle,
  },
  {
    to: '/contact',
    label: 'Contact',
    description: 'Reach us for support, partnerships, or account questions.',
    Icon: MessageCircle,
  },
  {
    to: '/features',
    label: 'Features',
    description: 'Calendar, stockpile, protocols, calculators, and what ships in the app.',
    Icon: LayoutGrid,
  },
  {
    to: '/pricing',
    label: 'Pricing',
    description: 'Free tier, Research+, and lifetime options—straight numbers.',
    Icon: BadgeDollarSign,
  },
  {
    to: '/shop',
    label: 'Shop',
    description: 'Paper Pep Planners and physical goods (checkout on our store).',
    Icon: Store,
  },
  {
    to: '/about',
    label: 'About',
    description: 'Paper roots, group buys, and why we built the digital planner.',
    Icon: BookOpen,
  },
];

export default function Resources() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      <div className="py-14 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-center" style={{ color: theme.primaryDark }}>
            Resources
          </h1>
          <p className="text-base md:text-lg text-center mb-10 leading-relaxed" style={{ color: theme.textLight }}>
            Quick links to real pages—no placeholder articles. Start with the FAQ or contact us if you’re stuck.
          </p>

          <ul className="space-y-3">
            {LINKS.map(({ to, label, description, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-start gap-4 p-4 rounded-xl border transition-shadow hover:shadow-md"
                  style={{ backgroundColor: theme.white, borderColor: theme.border }}
                >
                  <div
                    className="flex-shrink-0 p-2.5 rounded-lg"
                    style={{ backgroundColor: `${theme.primary}14` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: theme.primary }} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="flex items-center gap-1 font-semibold" style={{ color: theme.primaryDark }}>
                      {label}
                      <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" aria-hidden />
                    </span>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: theme.textLight }}>
                      {description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
