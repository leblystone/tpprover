import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';
import { themes, defaultThemeName } from '../../theme/themes';
import { isNative } from '../../utils/platform';

const ProtectedRoute = () => {
  try {
    const appContext = useAppContext();
    const { isFirebaseLoading } = useFirebase();
    const theme = themes[defaultThemeName];
    
    // Safety check: if context is not available yet, show loading
    if (!appContext) {
      console.warn('⚠️ AppContext not available yet, showing loading...');
      return (
        <div className="flex items-center justify-center h-screen w-full" style={{ backgroundColor: theme.background, color: theme.text }}>
          <div className="text-center px-4">
            <div className="text-lg font-medium">Loading...</div>
          </div>
        </div>
      );
    }
    
    const { user, isLoading } = appContext;

    // Wait for Firebase to finish loading first
    if (isFirebaseLoading) {
      return (
        <div className="flex items-center justify-center h-screen w-full" style={{ backgroundColor: theme.background, color: theme.text }}>
          <div className="text-center px-4">
            <div className="text-lg font-medium">Loading...</div>
          </div>
        </div>
      );
    }

    // Native app bypass - check user after Firebase is ready
    if (isNative()) {
      return user ? <Outlet /> : <Navigate to="/login" replace />;
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

    return user ? <Outlet /> : <Navigate to="/login" replace />;
  } catch (error) {
    console.error('❌ ProtectedRoute error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
