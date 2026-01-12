import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App.jsx'
import NotFound from './pages/NotFound.jsx'
import Rover from './pages/Rover.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import { lazyWithRetry } from './utils/lazyWithRetry.jsx'

const LandingWrapper = lazyWithRetry(() => import('./components/common/LandingWrapper.jsx'), 'LandingWrapper')
const Landing = lazyWithRetry(() => import('./pages/Landing.jsx'), 'Landing')
const Home = lazyWithRetry(() => import('./pages/Home.jsx'), 'Home')
const Dashboard = lazyWithRetry(() => import('./pages/CustomizableDashboard.jsx'), 'CustomizableDashboard')
const Orders = lazyWithRetry(() => import('./pages/Orders.jsx'), 'Orders')
const Protocols = lazyWithRetry(() => import('./pages/Protocols.jsx'), 'Protocols')
const Vendors = lazyWithRetry(() => import('./pages/Vendors.jsx'), 'Vendors')
const Calendar = lazyWithRetry(() => import('./pages/Calendar.jsx'), 'Calendar')
const Day = lazyWithRetry(() => import('./pages/Day.jsx'), 'Day')
const Stockpile = lazyWithRetry(() => import('./pages/Stockpile.jsx'), 'Stockpile')
const Recon = lazyWithRetry(() => import('./pages/Recon.jsx'), 'Recon')
const Announcements = lazyWithRetry(() => import('./pages/Announcements.jsx'), 'Announcements')
const Settings = lazyWithRetry(() => import('./pages/Settings.jsx'), 'Settings')
const SettingsNotifications = lazyWithRetry(() => import('./pages/SettingsNotifications.jsx'), 'SettingsNotifications')
const SettingsAppearance = lazyWithRetry(() => import('./pages/SettingsAppearance.jsx'), 'SettingsAppearance')
const SettingsPreferences = lazyWithRetry(() => import('./pages/SettingsPreferences.jsx'), 'SettingsPreferences')
const SettingsPrivacy = lazyWithRetry(() => import('./pages/SettingsPrivacy.jsx'), 'SettingsPrivacy')
const SettingsLegal = lazyWithRetry(() => import('./pages/SettingsLegal.jsx'), 'SettingsLegal')
const SettingsData = lazyWithRetry(() => import('./pages/SettingsData.jsx'), 'SettingsData')
const Account = lazyWithRetry(() => import('./pages/Account.jsx'), 'Account')
const AccountProfile = lazyWithRetry(() => import('./pages/AccountProfile.jsx'), 'AccountProfile')
const AccountSubscription = lazyWithRetry(() => import('./pages/AccountSubscription.jsx'), 'AccountSubscription')
const AccountLegal = lazyWithRetry(() => import('./pages/AccountLegal.jsx'), 'AccountLegal')
const Login = lazyWithRetry(() => import('./pages/Login.jsx'), 'Login')
const Imports = lazyWithRetry(() => import('./pages/Imports.jsx'), 'Imports')
const Goals = lazyWithRetry(() => import('./pages/Goals.jsx'), 'Goals')
const Badges = lazyWithRetry(() => import('./pages/Badges.jsx'), 'Badges')
// Admin panel - now properly refactored with extracted components
const Admin = lazyWithRetry(() => import('./pages/Admin.jsx'), 'Admin')
const BetaEndedSurvey = lazyWithRetry(() => import('./pages/BetaEndedSurvey.jsx'), 'BetaEndedSurvey')
const LaunchComingSoon = lazyWithRetry(() => import('./pages/LaunchComingSoon.jsx'), 'LaunchComingSoon')
const CoverLanding = lazyWithRetry(() => import('./pages/CoverLanding.jsx'), 'CoverLanding')
const About = lazyWithRetry(() => import('./pages/About.jsx'), 'About')
const Features = lazyWithRetry(() => import('./pages/Features.jsx'), 'Features')
const Pricing = lazyWithRetry(() => import('./pages/Pricing.jsx'), 'Pricing')
// Contact page removed - using LandingContactModal popup instead
const Privacy = lazyWithRetry(() => import('./pages/Privacy.jsx'), 'Privacy')
const Terms = lazyWithRetry(() => import('./pages/Terms.jsx'), 'Terms')
const CancellationPolicy = lazyWithRetry(() => import('./pages/CancellationPolicy.jsx'), 'CancellationPolicy')
const Blog = lazyWithRetry(() => import('./pages/Blog.jsx'), 'Blog')
const DeleteAccount = lazyWithRetry(() => import('./pages/DeleteAccount.jsx'), 'DeleteAccount')
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword.jsx'), 'ResetPassword')
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail.jsx'), 'VerifyEmail')
const RedeemGift = lazyWithRetry(() => import('./pages/RedeemGift.jsx'), 'RedeemGift')
const GiftSuccess = lazyWithRetry(() => import('./pages/GiftSuccess.jsx'), 'GiftSuccess')
const RedeemLifetime = lazyWithRetry(() => import('./pages/RedeemLifetime.jsx'), 'RedeemLifetime')
const RedeemAnnual = lazyWithRetry(() => import('./pages/RedeemAnnual.jsx'), 'RedeemAnnual')
const TestAnnualCheckout = lazyWithRetry(() => import('./pages/TestAnnualCheckout.jsx'), 'TestAnnualCheckout')
const TrialExpired = lazyWithRetry(() => import('./pages/TrialExpired.jsx'), 'TrialExpired')
const SubscriptionExpired = lazyWithRetry(() => import('./pages/SubscriptionExpired.jsx'), 'SubscriptionExpired')

// Launch Configuration
const IS_APP_BLOCKED = false; // Set to false when ready to launch

// Component to redirect blocked routes
const LaunchRedirect = () => <Navigate to="/countdown" replace />;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingWrapper />,
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
    path: '/cancellation-policy',
    element: <CancellationPolicy />,
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
    path: '/research-lifetime',
    element: <RedeemLifetime />,
    errorElement: <NotFound />,
  },
  {
    path: '/research-annual',
    element: <RedeemAnnual />,
    errorElement: <NotFound />,
  },
  {
    path: '/test-annual-checkout',
    element: <TestAnnualCheckout />,
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
          { path: 'account', element: <Account /> },
          { path: 'account/profile', element: <AccountProfile /> },
          { path: 'account/subscription', element: <AccountSubscription /> },
          { path: 'account/security', element: <Navigate to="/app/account/profile" replace /> },
          { path: 'account/legal', element: <AccountLegal /> },
          { path: 'trial-expired', element: <TrialExpired /> },
          { path: 'subscription-expired', element: <SubscriptionExpired /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'orders', element: <Orders /> },
          { path: 'protocols', element: <Protocols /> },
          { path: 'vendors', element: <Vendors /> },
          { path: 'calendar', element: <Calendar /> },
          { path: 'calendar/day', element: <Day /> },
          { path: 'recon', element: <Recon /> },
          { path: 'calculator', element: <Navigate to="/app/recon" replace /> },
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
          { path: 'imports', element: <Imports /> },
          { path: 'badges', element: <Badges /> },
          { path: 'beta-survey', element: <BetaEndedSurvey /> },
          { path: 'launch-coming-soon', element: <LaunchComingSoon /> },
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
        ]
      }
    ]
  }
], {
  future: {
    v7_startTransition: true
  }
})