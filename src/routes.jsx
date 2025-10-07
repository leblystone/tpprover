import React, { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App.jsx'
import NotFound from './pages/NotFound.jsx'
import Rover from './pages/Rover.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Dashboard = lazy(() => import('./pages/CustomizableDashboard.jsx'))
const Orders = lazy(() => import('./pages/Orders.jsx'))
const Protocols = lazy(() => import('./pages/Protocols.jsx'))
const Vendors = lazy(() => import('./pages/Vendors.jsx'))
const Calendar = lazy(() => import('./pages/Calendar.jsx'))
const Day = lazy(() => import('./pages/Day.jsx'))
const Stockpile = lazy(() => import('./pages/Stockpile.jsx'))
const Recon = lazy(() => import('./pages/Recon.jsx'))
const Announcements = lazy(() => import('./pages/Announcements.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Imports = lazy(() => import('./pages/Imports.jsx'))
const Goals = lazy(() => import('./pages/Goals.jsx'))
const Badges = lazy(() => import('./pages/Badges.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const BetaEndedSurvey = lazy(() => import('./pages/BetaEndedSurvey.jsx'))
const LaunchComingSoon = lazy(() => import('./pages/LaunchComingSoon.jsx'))
const CoverLanding = lazy(() => import('./pages/CoverLanding.jsx'))

// Launch Configuration
const IS_APP_BLOCKED = false; // Set to false when ready to launch

// Component to redirect blocked routes
const LaunchRedirect = () => <Navigate to="/countdown" replace />;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CoverLanding />,
    errorElement: <NotFound />,
  },
  {
    path: '/login',
    element: IS_APP_BLOCKED ? <LaunchRedirect /> : <Login />,
    errorElement: <NotFound />,
  },
  {
    path: '/admin',
    element: IS_APP_BLOCKED ? <LaunchRedirect /> : <Admin />,
    errorElement: <NotFound />,
  },
  {
    path: '/launch-coming-soon',
    element: <LaunchComingSoon />,
    errorElement: <NotFound />,
  },
  {
    path: '/countdown',
    element: <CoverLanding />,
    errorElement: <NotFound />,
  },
  {
    path: '/test-countdown',
    element: <CoverLanding />,
    errorElement: <NotFound />,
  },
  {
    path: '/original-landing',
    element: <Landing />,
    errorElement: <NotFound />,
  },
  {
    path: '/rover/:type/share/:encodedData',
    element: <Rover />,
    errorElement: <NotFound />,
  },
  {
    path: '/account',
    element: <Navigate to="/app/account" replace />,
    errorElement: <NotFound />,
  },
  {
    path: '/app',
    element: IS_APP_BLOCKED ? <LaunchRedirect /> : <ProtectedRoute />,
    errorElement: <NotFound />,
    children: [
      {
        path: '/app',
        element: <App />,
        errorElement: <NotFound />,
        children: [
          { index: true, element: <Home /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'orders', element: <Orders /> },
          { path: 'protocols', element: <Protocols /> },
          { path: 'vendors', element: <Vendors /> },
          { path: 'calendar', element: <Calendar /> },
          { path: 'calendar/day', element: <Day /> },
          { path: 'recon', element: <Recon /> },
          { path: 'stockpile', element: <Stockpile /> },
          { path: 'announcements', element: <Announcements /> },
          { path: 'goals', element: <Goals /> },
          { path: 'settings', element: <Settings /> },
          { path: 'account', element: <Account /> },
          { path: 'imports', element: <Imports /> },
          { path: 'badges', element: <Badges /> },
          { path: 'beta-survey', element: <BetaEndedSurvey /> },
          { path: 'launch-coming-soon', element: <LaunchComingSoon /> },
        ]
      }
    ]
  }
])