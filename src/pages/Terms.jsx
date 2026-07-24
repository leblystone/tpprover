import React from 'react';
import { themes, defaultThemeName } from '../theme/themes';
import { TermsOfServiceContent } from '../components/legal/TermsOfServiceContent';
import { usePageSEO } from '../utils/pageSEO';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';

export default function Terms() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Terms of Service
          </h1>
        </div>
      </div>

      {/* Terms Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <TermsOfServiceContent />
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
