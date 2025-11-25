import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { themes, defaultThemeName } from '../../theme/themes';
import { isNative } from '../../utils/platform';

const ProtectedRoute = () => {
  try {
    const appContext = useAppContext();
    
    // Safety check: if context is not available yet, redirect to login
    if (!appContext) {
      console.warn('⚠️ AppContext not available yet, redirecting to login');
      return <Navigate to="/login" replace />;
    }
    
    const { user, isLoading } = appContext;
    const theme = themes[defaultThemeName];

    // Native app bypass - completely skip loading state
    if (isNative()) {
      return user ? <Outlet /> : <Navigate to="/login" replace />;
    }

    // Wait for initial load to complete before checking user
    // isLoading can be undefined initially, so check for truthy values
    if (isLoading === true || isLoading === undefined) {
      // Return null to prevent render during loading
      return null;
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
  } catch (error) {
    console.error('❌ ProtectedRoute error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
