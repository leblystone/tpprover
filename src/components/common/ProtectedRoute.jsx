import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';
import { themes, defaultThemeName } from '../../theme/themes';
import { isNative } from '../../utils/platform';
import PageLoader from '../ui/PageLoader';

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
      return <PageLoader theme={theme} fullScreen />;
    }
    
    const { user, isLoading } = appContext;

    // Prefer React user; fall back to persisted login markers so post-auth redirects
    // (e.g. skip biometric) don't bounce to /login before AppContext hydrates.
    let persistedUser = null;
    try {
      if (localStorage.getItem('tpprover_auth_token') === 'firebase_token') {
        persistedUser = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      }
    } catch {
      persistedUser = null;
    }
    const effectiveUser =
      user ||
      (persistedUser && (persistedUser.uid || persistedUser.email) ? persistedUser : null);

    // Native: don't gate on isFirebaseLoading — the web SDK's onAuthStateChanged may be
    // slow or never fire when WKWebView networking is broken (e.g. Simulator). The user
    // object in AppContext is set by doLogin immediately after sign-in, so trust that.
    // Email verification gate is skipped on native (email link clicks open in a browser).
    if (isNative()) {
      return effectiveUser ? <Outlet /> : <Navigate to="/login" replace />;
    }

    // Web: wait for Firebase auth state to resolve before deciding
    if (isFirebaseLoading) {
      return <PageLoader theme={theme} fullScreen />;
    }

    // Wait for initial load to complete before checking user
    // isLoading can be undefined initially, so check for truthy values
    if (isLoading === true || isLoading === undefined) {
      return <PageLoader theme={theme} fullScreen />;
    }

    // Gate unverified email+password users — Google/magic-link users are always verified by Firebase
    if (effectiveUser && firebaseUser && !firebaseUser.emailVerified && isEmailPasswordUser(firebaseUser)) {
      return <Navigate to="/verify-email" replace />;
    }

    return effectiveUser ? <Outlet /> : <Navigate to="/login" replace />;
  } catch (error) {
    console.error('❌ ProtectedRoute error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
