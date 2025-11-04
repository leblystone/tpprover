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
const SettingsNotifications = lazy(() => import('./pages/SettingsNotifications.jsx'))
const SettingsAppearance = lazy(() => import('./pages/SettingsAppearance.jsx'))
const SettingsPreferences = lazy(() => import('./pages/SettingsPreferences.jsx'))
const SettingsPrivacy = lazy(() => import('./pages/SettingsPrivacy.jsx'))
const SettingsLegal = lazy(() => import('./pages/SettingsLegal.jsx'))
const SettingsData = lazy(() => import('./pages/SettingsData.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const AccountProfile = lazy(() => import('./pages/AccountProfile.jsx'))
const AccountSubscription = lazy(() => import('./pages/AccountSubscription.jsx'))
const AccountSecurity = lazy(() => import('./pages/AccountSecurity.jsx'))
const AccountLegal = lazy(() => import('./pages/AccountLegal.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Imports = lazy(() => import('./pages/Imports.jsx'))
const Goals = lazy(() => import('./pages/Goals.jsx'))
const Badges = lazy(() => import('./pages/Badges.jsx'))
// Admin panel - now properly refactored with extracted components
const Admin = lazy(() => import('./pages/Admin.jsx'))
const BetaEndedSurvey = lazy(() => import('./pages/BetaEndedSurvey.jsx'))
const LaunchComingSoon = lazy(() => import('./pages/LaunchComingSoon.jsx'))
const CoverLanding = lazy(() => import('./pages/CoverLanding.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Features = lazy(() => import('./pages/Features.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const Blog = lazy(() => import('./pages/Blog.jsx'))
const DeleteAccount = lazy(() => import('./pages/DeleteAccount.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'))
const RedeemGift = lazy(() => import('./pages/RedeemGift.jsx'))
const GiftSuccess = lazy(() => import('./pages/GiftSuccess.jsx'))

// Launch Configuration
const IS_APP_BLOCKED = false; // Set to false when ready to launch

// Component to redirect blocked routes
const LaunchRedirect = () => <Navigate to="/countdown" replace />;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
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
    element: <Navigate to="/" replace />,
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
    path: '/about',
    element: <About />,
    errorElement: <NotFound />,
  },
  {
    path: '/features',
    element: <Features />,
    errorElement: <NotFound />,
  },
  {
    path: '/pricing',
    element: <Pricing />,
    errorElement: <NotFound />,
  },
  {
    path: '/contact',
    element: <Contact />,
    errorElement: <NotFound />,
  },
  {
    path: '/privacy',
    element: <Privacy />,
    errorElement: <NotFound />,
  },
  {
    path: '/terms',
    element: <Terms />,
    errorElement: <NotFound />,
  },
  {
    path: '/delete-account',
    element: <DeleteAccount />,
    errorElement: <NotFound />,
  },
  {
    path: '/blog',
    element: <Blog />,
    errorElement: <NotFound />,
  },
  {
    path: '/resources',
    element: <Blog />,
    errorElement: <NotFound />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
    errorElement: <NotFound />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />,
    errorElement: <NotFound />,
  },
  {
    path: '/redeem-gift/:giftId',
    element: <RedeemGift />,
    errorElement: <NotFound />,
  },
  {
    path: '/gift-success',
    element: <GiftSuccess />,
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
        path: '',
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
          { path: 'settings/notifications', element: <SettingsNotifications /> },
          { path: 'settings/appearance', element: <SettingsAppearance /> },
          { path: 'settings/preferences', element: <SettingsPreferences /> },
          { path: 'settings/privacy', element: <SettingsPrivacy /> },
          { path: 'settings/legal', element: <SettingsLegal /> },
          { path: 'settings/data', element: <SettingsData /> },
          { path: 'account', element: <Account /> },
          { path: 'account/profile', element: <AccountProfile /> },
          { path: 'account/subscription', element: <AccountSubscription /> },
          { path: 'account/security', element: <AccountSecurity /> },
          { path: 'account/legal', element: <AccountLegal /> },
          { path: 'imports', element: <Imports /> },
          { path: 'badges', element: <Badges /> },
          { path: 'beta-survey', element: <BetaEndedSurvey /> },
          { path: 'launch-coming-soon', element: <LaunchComingSoon /> },
        ]
      }
    ]
  }
])