import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess';

/**
 * SubscriptionGuard - Redirects expired trials to trial-expired page
 * Users can view their data, export it, or delete their account from there
 * This maintains trust while creating conversion urgency
 */
export default function SubscriptionGuard({ children }) {
  const location = useLocation();
  const { hasAccess, isTrialExpired, isLoading } = useSubscriptionAccess();

  // Allow access to these routes even when trial is expired
  // Users can still manage their account, view settings, and get support
  const allowedRoutes = [
    '/app/trial-expired',
    '/app/account',
    '/app/account/subscription',
    '/app/account/profile',
    '/app/account/profile',
    '/app/account/legal',
    '/app/settings',
    '/app/settings/notifications',
    '/app/settings/appearance',
    '/app/settings/preferences',
    '/app/settings/privacy',
    '/app/settings/legal',
    '/app/settings/data',
  ];

  // Check if current route is in allowed list
  const isAllowedRoute = allowedRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  // Show loading briefly, but don't block access indefinitely
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    // Always render after 500ms max
    const timeout = setTimeout(() => {
      setShouldRender(true);
    }, 500);

    // Or render immediately once loading is complete
    if (!isLoading) {
      setShouldRender(true);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!shouldRender) {
    return null; // Brief loading state
  }

  // If trial is expired and trying to access protected routes, redirect
  if (isTrialExpired && !hasAccess && !isAllowedRoute) {
    return <Navigate to="/app/trial-expired" replace />;
  }

  return children;
}

