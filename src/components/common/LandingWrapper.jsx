import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { isNative } from '../../utils/platform';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { themes, defaultThemeName } from '../../theme/themes';
import PageLoader from '../ui/PageLoader';

const Landing = lazyWithRetry(() => import('../../pages/Landing.jsx'), 'Landing');

/**
 * Wrapper component for the landing page
 * Redirects mobile/native app users to login page
 * Shows landing page only on web
 */
export default function LandingWrapper() {
  const theme = themes[defaultThemeName];
  
  // Check if user is on mobile/native app
  const isMobile = isNative();
  
  console.log('🎯 LandingWrapper: isNative =', isMobile);

  // If on mobile, redirect to login
  if (isMobile) {
    console.log('📱 LandingWrapper: Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // On web, show the landing page
  console.log('🌐 LandingWrapper: Showing landing page');
  return (
    <Suspense fallback={<PageLoader theme={theme} fullScreen />}>
      <Landing />
    </Suspense>
  );
}

