import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { isNative } from '../../utils/platform';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const Landing = lazyWithRetry(() => import('../../pages/Landing.jsx'), 'Landing');

/**
 * Wrapper component for the landing page
 * Redirects mobile/native app users to login page
 * Shows landing page only on web
 */
export default function LandingWrapper() {
  // Check if user is on mobile/native app
  const isMobile = isNative();

  // If on mobile, redirect to login
  if (isMobile) {
    return <Navigate to="/login" replace />;
  }

  // On web, show the landing page
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Landing />
    </Suspense>
  );
}

