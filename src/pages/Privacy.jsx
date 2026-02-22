import React from 'react';
import { themes, defaultThemeName } from '../theme/themes';
import { PrivacyPolicyContent } from '../components/legal/PrivacyPolicyContent';
import { usePageSEO } from '../utils/pageSEO';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';

export default function Privacy() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Privacy Policy
          </h1>
          <p className="text-sm mt-4" style={{ color: theme.textLight }}>
            Last updated: February 2026
          </p>
        </div>
      </div>

      {/* Privacy Policy Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <PrivacyPolicyContent />
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
