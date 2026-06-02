/**
 * Admin panel route config — single source of truth for nav + routes.
 * Drives both React Router paths and AdminLayout primary/secondary nav.
 */

export const ADMIN_BASE = '/admin';

/** Primary tabs (top-level nav). Each can have optional `children` for secondary nav. */
export const adminPrimaryTabs = [
  {
    id: 'overview',
    label: 'Overview',
    path: `${ADMIN_BASE}/overview/dashboard`,
    icon: 'LayoutDashboard',
    children: [
      { id: 'dashboard', label: 'Dashboard', path: `${ADMIN_BASE}/overview/dashboard` },
      { id: 'analytics', label: 'Analytics', path: `${ADMIN_BASE}/overview/analytics` },
      { id: 'revenue', label: 'Revenue', path: `${ADMIN_BASE}/overview/revenue` },
      { id: 'sync-errors', label: '🔴 Sync Errors', path: `${ADMIN_BASE}/overview/sync-errors` },
      { id: 'contact', label: 'Contact', path: `${ADMIN_BASE}/overview/contact` },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    path: `${ADMIN_BASE}/users/subscriptions`,
    icon: 'Users',
    children: [
      { id: 'subscriptions', label: 'All Users', path: `${ADMIN_BASE}/users/subscriptions` },
      { id: 'lifetime', label: 'Lifetime', path: `${ADMIN_BASE}/users/lifetime` },
      { id: 'annual', label: 'Annual', path: `${ADMIN_BASE}/users/annual` },
      { id: 'gifts', label: 'Gifts', path: `${ADMIN_BASE}/users/gifts`, disabled: true },
      { id: 'expired-trials', label: 'Expired Trials', path: `${ADMIN_BASE}/users/expired-trials` },
    ],
  },
  {
    id: 'shop',
    label: 'Shop',
    path: `${ADMIN_BASE}/shop/products`,
    icon: 'ShoppingBag',
    children: [
      { id: 'products', label: 'Products', path: `${ADMIN_BASE}/shop/products` },
      { id: 'reviews', label: 'Reviews', path: `${ADMIN_BASE}/shop/reviews` },
      { id: 'orders', label: 'Orders', path: `${ADMIN_BASE}/shop/orders` },
      { id: 'inquiries', label: 'Inquiries', path: `${ADMIN_BASE}/shop/inquiries` },
      { id: 'marketplaces', label: 'Marketplaces', path: `${ADMIN_BASE}/shop/marketplaces` },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    path: `${ADMIN_BASE}/comms/emails`,
    icon: 'MailOpen',
    children: [
      { id: 'announcements', label: 'Announcements', path: `${ADMIN_BASE}/comms/announcements` },
      { id: 'emails', label: 'Email Templates', path: `${ADMIN_BASE}/comms/emails` },
      { id: 'triggers', label: 'Email Triggers', path: `${ADMIN_BASE}/comms/triggers` },
      { id: 'history', label: 'Send History', path: `${ADMIN_BASE}/comms/history` },
      { id: 'notifications', label: 'Push Notifications', path: `${ADMIN_BASE}/comms/notifications` },
    ],
  },
  {
    id: 'ai',
    label: 'AI / PiP',
    path: `${ADMIN_BASE}/ai/insights`,
    icon: 'Sparkle',
    children: [
      { id: 'insights', label: 'Insights', path: `${ADMIN_BASE}/ai/insights` },
      { id: 'costs', label: 'Costs', path: `${ADMIN_BASE}/ai/costs` },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: `${ADMIN_BASE}/settings/security`,
    icon: 'Sliders',
    children: [
      { id: 'security', label: 'Security', path: `${ADMIN_BASE}/settings/security` },
      { id: 'deletions', label: 'Deletions', path: `${ADMIN_BASE}/settings/deletions` },
      { id: 'version', label: 'Version', path: `${ADMIN_BASE}/settings/version` },
      { id: 'agreements', label: 'Legal', path: `${ADMIN_BASE}/settings/agreements` },
      { id: 'flags', label: '⚡ Kill Switches', path: `${ADMIN_BASE}/settings/flags` },
    ],
  },
];

/** Default redirect when visiting /admin */
export const adminDefaultPath = `${ADMIN_BASE}/overview/dashboard`;

/** All leaf paths (for redirects, etc.) */
export const adminPaths = {
  // Overview paths
  overviewDashboard: `${ADMIN_BASE}/overview/dashboard`,
  overviewSupport: `${ADMIN_BASE}/overview/dashboard`, // redirect: support removed, use dashboard
  overviewContact: `${ADMIN_BASE}/overview/contact`,
  overviewAnalytics: `${ADMIN_BASE}/overview/analytics`,
  overviewRevenue: `${ADMIN_BASE}/overview/revenue`,
  overviewAutomation: `${ADMIN_BASE}/overview/dashboard`, // Ghosty removed — legacy alias
  overviewSyncErrors: `${ADMIN_BASE}/overview/sync-errors`,
  // Legacy paths for backward compatibility
  analytics: `${ADMIN_BASE}/overview/analytics`,
  ghostWorker: `${ADMIN_BASE}/overview/dashboard`,
  workQueue: `${ADMIN_BASE}/overview/dashboard`,
  feedback: `${ADMIN_BASE}/overview/dashboard`,
  contact: `${ADMIN_BASE}/overview/contact`,
  // Users paths
  usersSubscriptions: `${ADMIN_BASE}/users/subscriptions`,
  usersLifetime: `${ADMIN_BASE}/users/lifetime`,
  usersAnnual: `${ADMIN_BASE}/users/annual`,
  usersGifts: `${ADMIN_BASE}/users/gifts`,
  usersExpiredTrials: `${ADMIN_BASE}/users/expired-trials`,
  // Content paths (hidden from nav — legacy redirects)
  content: `${ADMIN_BASE}/overview/dashboard`,
  improvements: `${ADMIN_BASE}/overview/dashboard`,
  // Comms paths
  commsEmails: `${ADMIN_BASE}/comms/emails`,
  commsTriggers: `${ADMIN_BASE}/comms/triggers`,
  commsHistory: `${ADMIN_BASE}/comms/history`,
  commsAnnouncements: `${ADMIN_BASE}/comms/announcements`,
  commsNotifications: `${ADMIN_BASE}/comms/notifications`,
  // Legacy comms paths
  commsPush: `${ADMIN_BASE}/comms/notifications`,
  commsInApp: `${ADMIN_BASE}/comms/announcements`,
  // Settings paths
  settingsSecurity: `${ADMIN_BASE}/settings/security`,
  settingsDeletions: `${ADMIN_BASE}/settings/deletions`,
  settingsVersion: `${ADMIN_BASE}/settings/version`,
  settingsAgreements: `${ADMIN_BASE}/settings/agreements`,
  settingsFlags: `${ADMIN_BASE}/settings/flags`,
  aiInsights: `${ADMIN_BASE}/ai/insights`,
  aiCosts: `${ADMIN_BASE}/ai/costs`,
  settingsAiCosts: `${ADMIN_BASE}/ai/costs`, // legacy alias
};
