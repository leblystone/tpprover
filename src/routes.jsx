import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App.jsx'
import NotFound from './pages/NotFound.jsx'
import AppRouteError from './components/common/AppRouteError.jsx'
import Rover from './pages/Rover.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import { lazyWithRetry } from './utils/lazyWithRetry.jsx'

// TEST COMPONENT - Remove in production
import ErrorBoundaryTest from './components/test/ErrorBoundaryTest.jsx'

const LandingWrapper = lazyWithRetry(() => import('./components/common/LandingWrapper.jsx'), 'LandingWrapper')
const Landing = lazyWithRetry(() => import('./pages/Landing.jsx'), 'Landing')
const Home = lazyWithRetry(() => import('./pages/Home.jsx'), 'Home')
const Dashboard = lazyWithRetry(() => import('./pages/CustomizableDashboard.jsx'), 'CustomizableDashboard')
const InsightsPage = lazyWithRetry(() => import('./pages/InsightsPage.jsx'), 'InsightsPage')
const Orders = lazyWithRetry(() => import('./pages/Orders.jsx'), 'Orders')
const Protocols = lazyWithRetry(() => import('./pages/Protocols.jsx'), 'Protocols')
const Vendors = lazyWithRetry(() => import('./pages/Vendors.jsx'), 'Vendors')
const Calendar = lazyWithRetry(() => import('./pages/Calendar.jsx'), 'Calendar')
const Day = lazyWithRetry(() => import('./pages/Day.jsx'), 'Day')
const Stockpile = lazyWithRetry(() => import('./pages/Stockpile.jsx'), 'Stockpile')
const Recon = lazyWithRetry(() => import('./pages/Recon.jsx'), 'Recon')
const AnnouncementsRedirect = lazyWithRetry(() => import('./pages/AnnouncementsRedirect.jsx'), 'AnnouncementsRedirect')
const Settings = lazyWithRetry(() => import('./pages/Settings.jsx'), 'Settings')
const SettingsNotifications = lazyWithRetry(() => import('./pages/SettingsNotifications.jsx'), 'SettingsNotifications')
const SettingsAppearance = lazyWithRetry(() => import('./pages/SettingsAppearance.jsx'), 'SettingsAppearance')
const SettingsPreferences = lazyWithRetry(() => import('./pages/SettingsPreferences.jsx'), 'SettingsPreferences')
const SettingsPrivacy = lazyWithRetry(() => import('./pages/SettingsPrivacy.jsx'), 'SettingsPrivacy')
const SettingsLegal = lazyWithRetry(() => import('./pages/SettingsLegal.jsx'), 'SettingsLegal')
const SettingsData = lazyWithRetry(() => import('./pages/SettingsData.jsx'), 'SettingsData')
// Research+ Wave: in-app Help Center
const SettingsHelp = lazyWithRetry(() => import('./pages/settings/SettingsHelp.jsx'), 'SettingsHelp')
// Research+ Wave: AI Research
const AIResearch = lazyWithRetry(() => import('./pages/AIResearch.jsx'), 'AIResearch')
// Community Center — public directory (opt-in, admin-curated)
const CommunityCenter = lazyWithRetry(() => import('./pages/CommunityCenter.jsx'), 'CommunityCenter')
// Research+ Wave: Buddy System
const AccountBuddy = lazyWithRetry(() => import('./pages/AccountBuddy.jsx'), 'AccountBuddy')
const Account = lazyWithRetry(() => import('./pages/Account.jsx'), 'Account')
const AccountProfile = lazyWithRetry(() => import('./pages/AccountProfile.jsx'), 'AccountProfile')
const AccountSubscription = lazyWithRetry(() => import('./pages/AccountSubscription.jsx'), 'AccountSubscription')
const LifetimeBilling = lazyWithRetry(() => import('./pages/LifetimeBilling.jsx'), 'LifetimeBilling')
const AccountLegal = lazyWithRetry(() => import('./pages/AccountLegal.jsx'), 'AccountLegal')
const Login = lazyWithRetry(() => import('./pages/Login.jsx'), 'Login')
const Imports = lazyWithRetry(() => import('./pages/Imports.jsx'), 'Imports')
const Goals = lazyWithRetry(() => import('./pages/Goals.jsx'), 'Goals')
const Supplements = lazyWithRetry(() => import('./pages/Supplements.jsx'), 'Supplements')
const WishlistPage = lazyWithRetry(() => import('./pages/Wishlist.jsx'), 'WishlistPage')
const Badges = lazyWithRetry(() => import('./pages/Badges.jsx'), 'Badges')
// Admin panel - router-based layout (Option B)
const AdminLayout = lazyWithRetry(() => import('./pages/admin/AdminLayout.jsx'), 'AdminLayout')
// Overview components
const AdminOverviewDashboard = lazyWithRetry(() => import('./pages/admin/AdminOverviewDashboard.jsx'), 'AdminOverviewDashboard')
const AdminSupport = lazyWithRetry(() => import('./pages/admin/AdminSupport.jsx'), 'AdminSupport')
const AdminAnalytics = lazyWithRetry(() => import('./pages/admin/AdminAnalytics.jsx'), 'AdminAnalytics')
const AdminRevenue = lazyWithRetry(() => import('./pages/admin/AdminRevenue.jsx'), 'AdminRevenue')
const AdminAutomation = lazyWithRetry(() => import('./pages/admin/AdminAutomation.jsx'), 'AdminAutomation')
// Legacy components (still used within new structure)
const AdminGhostWorker = lazyWithRetry(() => import('./pages/admin/AdminGhostWorker.jsx'), 'AdminGhostWorker')
const AdminWorkQueue = lazyWithRetry(() => import('./pages/admin/AdminWorkQueue.jsx'), 'AdminWorkQueue')
const AdminContact = lazyWithRetry(() => import('./pages/admin/AdminContact.jsx'), 'AdminContact')
const AdminFeedback = lazyWithRetry(() => import('./pages/admin/AdminFeedback.jsx'), 'AdminFeedback')
// Users components
const AdminUsersSubscriptions = lazyWithRetry(() => import('./pages/admin/AdminUsersSubscriptions.jsx'), 'AdminUsersSubscriptions')
const AdminUsersLifetime = lazyWithRetry(() => import('./pages/admin/AdminUsersLifetime.jsx'), 'AdminUsersLifetime')
const AdminUsersAnnual = lazyWithRetry(() => import('./pages/admin/AdminUsersAnnual.jsx'), 'AdminUsersAnnual')
const AdminUsersGifts = lazyWithRetry(() => import('./pages/admin/AdminUsersGifts.jsx'), 'AdminUsersGifts')
const AdminUsersExpiredTrials = lazyWithRetry(() => import('./pages/admin/AdminUsersExpiredTrials.jsx'), 'AdminUsersExpiredTrials')
// Content components
const AdminContent = lazyWithRetry(() => import('./pages/admin/AdminContent.jsx'), 'AdminContent')
const AdminImprovements = lazyWithRetry(() => import('./pages/admin/AdminImprovements.jsx'), 'AdminImprovements')
// Comms components
const AdminCommsPush = lazyWithRetry(() => import('./pages/admin/AdminCommsPush.jsx'), 'AdminCommsPush')
const AdminCommsInApp = lazyWithRetry(() => import('./pages/admin/AdminCommsInApp.jsx'), 'AdminCommsInApp')
const AdminCommsAnnouncements = lazyWithRetry(() => import('./pages/admin/AdminCommsAnnouncements.jsx'), 'AdminCommsAnnouncements')
const AdminCommsEmails = lazyWithRetry(() => import('./pages/admin/AdminCommsEmails.jsx'), 'AdminCommsEmails')
const AdminCommsNotifications = lazyWithRetry(() => import('./pages/admin/AdminCommsNotifications.jsx'), 'AdminCommsNotifications')
const AdminCommsTriggers = lazyWithRetry(() => import('./pages/admin/AdminCommsTriggers.jsx'), 'AdminCommsTriggers')
const AdminCommsHistory = lazyWithRetry(() => import('./pages/admin/AdminCommsHistory.jsx'), 'AdminCommsHistory')
// Settings components
const AdminSettingsSecurity = lazyWithRetry(() => import('./pages/admin/AdminSettingsSecurity.jsx'), 'AdminSettingsSecurity')
const AdminSettingsDeletions = lazyWithRetry(() => import('./pages/admin/AdminSettingsDeletions.jsx'), 'AdminSettingsDeletions')
const AdminSettingsVersion = lazyWithRetry(() => import('./pages/admin/AdminSettingsVersion.jsx'), 'AdminSettingsVersion')
const AdminSettingsAgreements = lazyWithRetry(() => import('./pages/admin/AdminSettingsAgreements.jsx'), 'AdminSettingsAgreements')
const AdminSettingsFlags = lazyWithRetry(() => import('./pages/admin/AdminSettingsFlags.jsx'), 'AdminSettingsFlags')
const AdminAICosts = lazyWithRetry(() => import('./pages/admin/AdminAICosts.jsx'), 'AdminAICosts')
// Beta/launch pages removed for App Store compliance
const CoverLanding = lazyWithRetry(() => import('./pages/CoverLanding.jsx'), 'CoverLanding')
const About = lazyWithRetry(() => import('./pages/About.jsx'), 'About')
const Shop = lazyWithRetry(() => import('./pages/Shop.jsx'), 'Shop')
const Features = lazyWithRetry(() => import('./pages/Features.jsx'), 'Features')
const Pricing = lazyWithRetry(() => import('./pages/Pricing.jsx'), 'Pricing')
const Contact = lazyWithRetry(() => import('./pages/Contact.jsx'), 'Contact')
const Privacy = lazyWithRetry(() => import('./pages/Privacy.jsx'), 'Privacy')
const Terms = lazyWithRetry(() => import('./pages/Terms.jsx'), 'Terms')
const CancellationPolicy = lazyWithRetry(() => import('./pages/CancellationPolicy.jsx'), 'CancellationPolicy')
const ResourcesPage = lazyWithRetry(() => import('./pages/Resources.jsx'), 'Resources')
const FAQ = lazyWithRetry(() => import('./pages/FAQ.jsx'), 'FAQ')
const DeleteAccount = lazyWithRetry(() => import('./pages/DeleteAccount.jsx'), 'DeleteAccount')
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword.jsx'), 'ResetPassword')
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail.jsx'), 'VerifyEmail')
const ActivateAccount = lazyWithRetry(() => import('./pages/ActivateAccount.jsx'), 'ActivateAccount')
const RedeemGift = lazyWithRetry(() => import('./pages/RedeemGift.jsx'), 'RedeemGift')
const GiftSuccess = lazyWithRetry(() => import('./pages/GiftSuccess.jsx'), 'GiftSuccess')
const RedeemLifetime = lazyWithRetry(() => import('./pages/RedeemLifetime.jsx'), 'RedeemLifetime')
const RedeemAnnual = lazyWithRetry(() => import('./pages/RedeemAnnual.jsx'), 'RedeemAnnual')
const TestAnnualCheckout = lazyWithRetry(() => import('./pages/TestAnnualCheckout.jsx'), 'TestAnnualCheckout')
// TrialExpired + SubscriptionExpired removed — no more hard lockouts. Users stay
// in-app on the free tier. Any old links redirect to the subscription page.

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
    // Magic-link email sign-in callback — handled by Login.jsx's isMagicLinkUrl check
    path: '/magic-link',
    element: IS_APP_BLOCKED ? <LaunchRedirect /> : <Login />,
    errorElement: <NotFound />,
  },
  {
    path: '/admin',
    element: IS_APP_BLOCKED ? <LaunchRedirect /> : <AdminLayout />,
    errorElement: <NotFound />,
    children: [
      // Default redirect to new Overview Dashboard
      { index: true, element: <Navigate to="/admin/overview/dashboard" replace /> },
      
      // Overview section (new structure)
      { path: 'overview/dashboard', element: <AdminOverviewDashboard /> },
      { path: 'overview/support', element: <Navigate to="/admin/overview/dashboard" replace /> },
      { path: 'overview/contact', element: <AdminContact /> },
      { path: 'overview/analytics', element: <AdminAnalytics /> },
      { path: 'overview/revenue', element: <AdminRevenue /> },
      { path: 'overview/automation', element: <AdminAutomation /> },
      
      // Legacy routes - redirect to new structure for backward compatibility
      { path: 'analytics', element: <Navigate to="/admin/overview/analytics" replace /> },
      { path: 'ghost-worker', element: <Navigate to="/admin/overview/automation" replace /> },
      { path: 'work-queue', element: <Navigate to="/admin/overview/dashboard" replace /> }, // Work queue is on dashboard
      { path: 'feedback', element: <Navigate to="/admin/overview/dashboard" replace /> },
      { path: 'contact', element: <Navigate to="/admin/overview/contact" replace /> },
      
      // Users section
      { path: 'users/subscriptions', element: <AdminUsersSubscriptions /> },
      { path: 'users/lifetime', element: <AdminUsersLifetime /> },
      { path: 'users/annual', element: <AdminUsersAnnual /> },
      { path: 'users/gifts', element: <AdminUsersGifts /> },
      { path: 'users/expired-trials', element: <AdminUsersExpiredTrials /> },
      { path: 'users', element: <Navigate to="/admin/users/subscriptions" replace /> },
      
      // Content section
      { path: 'content', element: <AdminContent /> },
      { path: 'improvements', element: <AdminImprovements /> },
      
      // Comms section
      { path: 'comms/emails', element: <AdminCommsEmails /> },
      { path: 'comms/triggers', element: <AdminCommsTriggers /> },
      { path: 'comms/history', element: <AdminCommsHistory /> },
      { path: 'comms/announcements', element: <AdminCommsAnnouncements /> },
      { path: 'comms/notifications', element: <AdminCommsNotifications /> },
      { path: 'comms', element: <Navigate to="/admin/comms/emails" replace /> },
      // Legacy comms routes - redirect to new structure
      { path: 'comms/push', element: <Navigate to="/admin/comms/notifications" replace /> },
      { path: 'comms/in-app', element: <Navigate to="/admin/comms/notifications" replace /> },
      
      // Settings section
      { path: 'settings/security', element: <AdminSettingsSecurity /> },
      { path: 'settings/deletions', element: <AdminSettingsDeletions /> },
      { path: 'settings/version', element: <AdminSettingsVersion /> },
      { path: 'settings/agreements', element: <AdminSettingsAgreements /> },
      { path: 'settings/flags', element: <AdminSettingsFlags /> },
      { path: 'settings/ai-costs', element: <AdminAICosts /> },
      { path: 'settings', element: <Navigate to="/admin/settings/security" replace /> },
    ],
  },
  {
    path: '/launch-coming-soon',
    element: <Navigate to="/" replace />,
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
    path: '/shop',
    element: <Shop />,
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
    element: <Navigate to="/resources" replace />,
    errorElement: <NotFound />,
  },
  {
    path: '/resources',
    element: <ResourcesPage />,
    errorElement: <NotFound />,
  },
  {
    path: '/faq',
    element: <FAQ />,
    errorElement: <NotFound />,
  },
  {
    path: '/contact',
    element: <Contact />,
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
    path: '/activate',
    element: <ActivateAccount />,
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
    path: '/share/:type/share/:encodedData',
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
    errorElement: <AppRouteError />,
    children: [
      {
        path: '',
        element: <App />,
        // No errorElement - let ChunkErrorBoundary catch errors
        children: [
          { path: 'account', element: <Account /> },
          { path: 'account/profile', element: <AccountProfile /> },
          { path: 'account/subscription', element: <AccountSubscription /> },
          { path: 'account/subscription/lifetime-billing', element: <LifetimeBilling /> },
          { path: 'account/security', element: <Navigate to="/app/account/profile" replace /> },
          { path: 'account/legal', element: <AccountLegal /> },
          { path: 'trial-expired', element: <Navigate to="/app/account/subscription" replace /> },
          { path: 'subscription-expired', element: <Navigate to="/app/account/subscription" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'wishlist', element: <Navigate to="/app/orders" state={{ activeTab: 'wishlist' }} replace /> },
          { path: 'insights', element: <InsightsPage /> },
          { path: 'dashboard/analytics', element: <Navigate to="/app/insights?tab=research" replace /> },
          { path: 'orders', element: <Orders /> },
          { path: 'protocols', element: <Protocols /> },
          { path: 'vendors', element: <Vendors /> },
          { path: 'calendar', element: <Calendar /> },
          { path: 'calendar/day', element: <Day /> },
          { path: 'recon', element: <Recon /> },
          { path: 'stockpile', element: <Stockpile /> },
          { path: 'announcements', element: <AnnouncementsRedirect /> },
          { path: 'goals', element: <Goals /> },
          { path: 'supplements', element: <Supplements /> },
          { path: 'bio-metrics', element: <Navigate to="/app/insights?tab=metrics" replace /> },
          { path: 'settings', element: <Settings /> },
          { path: 'settings/notifications', element: <SettingsNotifications /> },
          { path: 'settings/appearance', element: <SettingsAppearance /> },
          { path: 'settings/preferences', element: <SettingsPreferences /> },
          { path: 'settings/privacy', element: <SettingsPrivacy /> },
          { path: 'settings/legal', element: <SettingsLegal /> },
          { path: 'settings/data', element: <SettingsData /> },
          { path: 'settings/help', element: <SettingsHelp /> },
          { path: 'community', element: <CommunityCenter /> },
          { path: 'ai', element: <AIResearch /> },
          { path: 'account/buddy', element: <AccountBuddy /> },
          { path: 'imports', element: <Imports /> },
          { path: 'badges', element: <Badges /> },
          { path: 'test-error', element: <ErrorBoundaryTest /> },
          { path: 'beta-survey', element: <Navigate to="/app/dashboard" replace /> },
          { path: 'launch-coming-soon', element: <Navigate to="/app/dashboard" replace /> },
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
        ]
      }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
})