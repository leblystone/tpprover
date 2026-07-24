import React from 'react';
import { themes, defaultThemeName } from '../theme/themes';
import { CancellationPolicyContent } from '../components/legal/CancellationPolicyContent';
import { usePageSEO } from '../utils/pageSEO';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';

export default function CancellationPolicy() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Cancellation Policy
          </h1>
        </div>
      </div>

      {/* Cancellation Policy Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <CancellationPolicyContent />
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}









