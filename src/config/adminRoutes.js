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
      { id: 'support', label: 'Support', path: `${ADMIN_BASE}/overview/support` },
      { id: 'analytics', label: 'Analytics', path: `${ADMIN_BASE}/overview/analytics` },
      { id: 'automation', label: 'Automation', path: `${ADMIN_BASE}/overview/automation` },
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
      { id: 'gifts', label: 'Gifts', path: `${ADMIN_BASE}/users/gifts` },
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
    label: 'Comms',
    path: `${ADMIN_BASE}/comms/emails`,
    icon: 'MailOpen',
    children: [
      { id: 'emails', label: 'Emails', path: `${ADMIN_BASE}/comms/emails` },
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
  overviewSupport: `${ADMIN_BASE}/overview/support`,
  overviewAnalytics: `${ADMIN_BASE}/overview/analytics`,
  overviewAutomation: `${ADMIN_BASE}/overview/automation`,
  // Legacy paths for backward compatibility
  analytics: `${ADMIN_BASE}/overview/analytics`,
  ghostWorker: `${ADMIN_BASE}/overview/automation`,
  workQueue: `${ADMIN_BASE}/overview/support`,
  feedback: `${ADMIN_BASE}/overview/support`,
  contact: `${ADMIN_BASE}/overview/support`,
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
  commsNotifications: `${ADMIN_BASE}/comms/notifications`,
  commsTriggers: `${ADMIN_BASE}/overview/automation`,
  // Legacy comms paths
  commsPush: `${ADMIN_BASE}/comms/notifications`,
  commsInApp: `${ADMIN_BASE}/comms/notifications`,
  // Settings paths
  settingsSecurity: `${ADMIN_BASE}/settings/security`,
  settingsDeletions: `${ADMIN_BASE}/settings/deletions`,
  settingsVersion: `${ADMIN_BASE}/settings/version`,
  settingsAgreements: `${ADMIN_BASE}/settings/agreements`,
};
