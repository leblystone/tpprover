import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import BetaEnded from '../../pages/BetaEnded';

const ProtectedRoute = () => {
  // Phase One: September 6th, 12:01 AM to September 13th, Midnight
  // const betaStartDate = new Date('2024-09-06T00:01:00');
  // const betaEndDate = new Date('2024-09-14T00:00:00'); // Midnight on the 13th is the start of the 14th
  // const now = new Date();

  // const isBetaActive = now >= betaStartDate && now < betaEndDate;

  // if (!isBetaActive) {
  //   return <BetaEnded />;
  // }

  const isAuthenticated = localStorage.getItem('tpprover_auth_token');

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
