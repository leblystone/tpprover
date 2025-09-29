import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * LaunchBlocker - Redirects users to launch coming soon page
 * Blocks access to login and app during launch preparation phase
 */
export default function LaunchBlocker({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Configuration: Set to true to block the app
  const isAppBlocked = true;
  
  // Allow access to the launch page itself
  const allowedPaths = ['/launch-coming-soon'];
  
  // Check if current path is allowed
  const isAllowedPath = allowedPaths.some(path => location.pathname === path);
  
  useEffect(() => {
    // If app is blocked and user is not on an allowed path, redirect to launch page
    if (isAppBlocked && !isAllowedPath) {
      navigate('/launch-coming-soon', { replace: true });
    }
  }, [isAppBlocked, isAllowedPath, navigate]);
  
  // If app is blocked and user is not on allowed path, don't render children
  if (isAppBlocked && !isAllowedPath) {
    return null;
  }
  
  // Otherwise, render children normally
  return children;
}
