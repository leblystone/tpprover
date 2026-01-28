import React from 'react';
import { useRouteError } from 'react-router-dom';
import AppErrorFallback from './AppErrorFallback';

/**
 * Route-level error page for /app routes.
 * Renders AppErrorFallback with error-opps.png instead of React Router's default stack-trace UI.
 */
export default function AppRouteError() {
  const error = useRouteError();

  if (import.meta.env?.DEV) {
    console.error('AppRouteError caught:', error);
  }

  return <AppErrorFallback />;
}
