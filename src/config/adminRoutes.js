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
      { id: 'ghosty', label: 'Ghosty', path: `${ADMIN_BASE}/overview/automation` },
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
    id: 'content',
    label: 'Content',
    path: `${ADMIN_BASE}/content`,
    icon: 'Layers',
    children: [
      { id: 'content', label: 'Manage', path: `${ADMIN_BASE}/content` },
      { id: 'improvements', label: 'Ideas', path: `${ADMIN_BASE}/improvements` },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    path: `${ADMIN_BASE}/comms/emails`,
    icon: 'MailOpen',
    children: [
      { id: 'emails', label: 'Email Templates', path: `${ADMIN_BASE}/comms/emails` },
      { id: 'triggers', label: 'Email Triggers', path: `${ADMIN_BASE}/comms/triggers` },
      { id: 'history', label: 'Send History', path: `${ADMIN_BASE}/comms/history` },
      { id: 'notifications', label: 'Notifications', path: `${ADMIN_BASE}/comms/notifications` },
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
  overviewGhosty: `${ADMIN_BASE}/overview/automation`,
  overviewAutomation: `${ADMIN_BASE}/overview/automation`,
  // Legacy paths for backward compatibility
  analytics: `${ADMIN_BASE}/overview/analytics`,
  ghostWorker: `${ADMIN_BASE}/overview/automation`,
  workQueue: `${ADMIN_BASE}/overview/dashboard`,
  feedback: `${ADMIN_BASE}/overview/dashboard`,
  contact: `${ADMIN_BASE}/overview/contact`,
  // Users paths
  usersSubscriptions: `${ADMIN_BASE}/users/subscriptions`,
  usersLifetime: `${ADMIN_BASE}/users/lifetime`,
  usersAnnual: `${ADMIN_BASE}/users/annual`,
  usersGifts: `${ADMIN_BASE}/users/gifts`,
  usersExpiredTrials: `${ADMIN_BASE}/users/expired-trials`,
  // Content paths
  content: `${ADMIN_BASE}/content`,
  improvements: `${ADMIN_BASE}/improvements`,
  // Comms paths
  commsEmails: `${ADMIN_BASE}/comms/emails`,
  commsTriggers: `${ADMIN_BASE}/comms/triggers`,
  commsHistory: `${ADMIN_BASE}/comms/history`,
  commsNotifications: `${ADMIN_BASE}/comms/notifications`,
  // Legacy comms paths
  commsPush: `${ADMIN_BASE}/comms/notifications`,
  commsInApp: `${ADMIN_BASE}/comms/notifications`,
  // Settings paths
  settingsSecurity: `${ADMIN_BASE}/settings/security`,
  settingsDeletions: `${ADMIN_BASE}/settings/deletions`,
  settingsVersion: `${ADMIN_BASE}/settings/version`,
  settingsAgreements: `${ADMIN_BASE}/settings/agreements`,
};
