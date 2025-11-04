import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { themes, defaultThemeName } from '../../theme/themes';
import { isNative } from '../../utils/platform';

const ProtectedRoute = () => {
  try {
    const { user, isLoading } = useAppContext();
    const theme = themes[defaultThemeName];

    // Native app bypass - completely skip loading state
    if (isNative()) {
      return user ? <Outlet /> : <Navigate to="/login" replace />;
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
  } catch (error) {
    console.error('❌ ProtectedRoute error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
