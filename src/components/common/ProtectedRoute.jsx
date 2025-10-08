import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { themes, defaultThemeName } from '../../theme/themes';
import { isNative } from '../../utils/platform';

const ProtectedRoute = () => {
  try {
    console.log('🚀 ProtectedRoute: Component rendering');

    const { user, isLoading } = useAppContext();
    const theme = themes[defaultThemeName];

    console.log('🔍 ProtectedRoute: State check', {
      user: !!user,
      isLoading,
      isNative: isNative()
    });

    // Native app bypass - completely skip loading state
    if (isNative()) {
      console.log('🔄 ProtectedRoute: Native bypass activated', { user: !!user, isLoading });
      return user ? <Outlet /> : <Navigate to="/login" replace />;
    }

    console.log('🌐 ProtectedRoute: Web app, checking auth');
    return user ? <Outlet /> : <Navigate to="/login" replace />;
  } catch (error) {
    console.error('❌ ProtectedRoute error:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
