import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';
import { themes, defaultThemeName } from '../../theme/themes';
import { isNative } from '../../utils/platform';

// Returns true if the user signed up with email+password (not Google/magic-link)
function isEmailPasswordUser(firebaseUser) {
  if (!firebaseUser?.providerData) return false;
  return firebaseUser.providerData.some((p) => p.providerId === 'password');
}

const ProtectedRoute = () => {
  try {
    const appContext = useAppContext();
    const { isFirebaseLoading, firebaseUser } = useFirebase();
    const theme = themes[defaultThemeName];
    
    // Safety check: if context is not available yet, show loading
    if (!appContext) {
      return (
        <div className="flex items-center justify-center h-screen w-full" style={{ backgroundColor: theme.background, color: theme.text }}>
          <div className="text-center px-4">
            <div className="text-lg font-medium">Loading...</div>
          </div>
        </div>
      );
    }
    
    const { user, isLoading } = appContext;

    // Native: don't gate on isFirebaseLoading — the web SDK's onAuthStateChanged may be
    // slow or never fire when WKWebView networking is broken (e.g. Simulator). The user
    // object in AppContext is set by doLogin immediately after sign-in, so trust that.
    // Email verification gate is skipped on native (email link clicks open in a browser).
    if (isNative()) {
      return user ? <Outlet /> : <Navigate to="/login" replace />;
    }

    // Web: wait for Firebase auth state to resolve before deciding
    if (isFirebaseLoading) {
      return (
        <div className="flex items-center justify-center h-screen w-full" style={{ backgroundColor: theme.background, color: theme.text }}>
          <div className="text-center px-4">
            <div className="text-lg font-medium">Loading...</div>
          </div>
        </div>
      );
    }

    // Wait for initial load to complete before checking user
    // isLoading can be undefined initially, so check for truthy values
    if (isLoading === true || isLoading === undefined) {
      // Show loading screen instead of returning null
      return (
        <div className="flex items-center justify-center h-screen w-full" style={{ backgroundColor: theme.background, color: theme.text }}>
          <div className="text-center px-4">
            <div className="text-lg font-medium">Loading...</div>
          </div>
        </div>
      );
    }

    // Gate unverified email+password users — Google/magic-link users are always verified by Firebase
    if (user && firebaseUser && !firebaseUser.emailVerified && isEmailPasswordUser(firebaseUser)) {
      return <Navigate to="/verify-email" replace />;
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
  } catch (error) {
    console.error('❌ ProtectedRoute error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
