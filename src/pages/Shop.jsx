import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';

const STORE_URL = 'https://thepepplanner.com';

export default function Shop() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ color: theme.primary, backgroundColor: `${theme.primary}14` }}
          >
            <BookOpen className="w-4 h-4" aria-hidden />
            Paper Pep Planners
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: theme.primaryDark }}>
            Shop physical planners
          </h1>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: theme.textLight }}>
            Covers, sizes, and layouts built for research. Checkout and fulfillment are handled on our secure store.
          </p>
          <a
            href={STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all hover:opacity-95 hover:shadow-xl btn-primary-inset"
            style={{ backgroundColor: theme.primary }}
          >
            Open the shop
            <ArrowRight className="w-5 h-5" aria-hidden />
          </a>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
