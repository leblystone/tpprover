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
    console.error('AppRouteError caught:', error);
  }

  const handleReplenish = () => {
    // Navigate to dashboard instead of reloading the broken page
    navigate('/app/dashboard', { replace: true });
  };

  return <AppErrorFallback onReload={handleReplenish} />;
}
