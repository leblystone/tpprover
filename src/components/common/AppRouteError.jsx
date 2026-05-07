import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import AppErrorFallback from './AppErrorFallback';

/**
 * Route-level error page for /app routes.
 * Renders AppErrorFallback with error-opps.png instead of React Router's default stack-trace UI.
 */
export default function AppRouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  if (import.meta.env?.DEV) {
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'status' in error
          ? `HTTP ${error.status} ${error.statusText || ''}`
          : String(error);
    console.error('AppRouteError caught:', msg, error);
  }

  const handleReplenish = () => {
    // Navigate to dashboard instead of reloading the broken page
    navigate('/app/dashboard', { replace: true });
  };

  return <AppErrorFallback onReload={handleReplenish} />;
}
