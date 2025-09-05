import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const ProtectedRoute = () => {
  const { user } = useAppContext();

  // const isAuthenticated = localStorage.getItem('tpprover_auth_token');

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
