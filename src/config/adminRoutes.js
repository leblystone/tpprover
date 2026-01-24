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
    path: `${ADMIN_BASE}/analytics`,
    icon: 'LayoutDashboard',
    children: [
      { id: 'analytics', label: 'Analytics', path: `${ADMIN_BASE}/analytics` },
      { id: 'ghost-worker', label: 'Ghost Worker', path: `${ADMIN_BASE}/ghost-worker` },
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
    ],
  },
  {
    id: 'content',
    label: 'Content',
    path: `${ADMIN_BASE}/content`,
    icon: 'Layers',
    children: [
      { id: 'content', label: 'Manage', path: `${ADMIN_BASE}/content` },
      { id: 'feedback', label: 'Feedback', path: `${ADMIN_BASE}/feedback` },
      { id: 'improvements', label: 'Ideas', path: `${ADMIN_BASE}/improvements` },
    ],
  },
  {
    id: 'comms',
    label: 'Comms',
    path: `${ADMIN_BASE}/comms/push`,
    icon: 'MailOpen',
    children: [
      { id: 'push', label: 'Push', path: `${ADMIN_BASE}/comms/push` },
      { id: 'in-app', label: 'In‑App', path: `${ADMIN_BASE}/comms/in-app` },
      { id: 'emails', label: 'Templates', path: `${ADMIN_BASE}/comms/emails` },
      { id: 'triggers', label: 'Triggers', path: `${ADMIN_BASE}/comms/triggers` },
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
export const adminDefaultPath = `${ADMIN_BASE}/analytics`;

/** All leaf paths (for redirects, etc.) */
export const adminPaths = {
  analytics: `${ADMIN_BASE}/analytics`,
  ghostWorker: `${ADMIN_BASE}/ghost-worker`,
  usersSubscriptions: `${ADMIN_BASE}/users/subscriptions`,
  usersLifetime: `${ADMIN_BASE}/users/lifetime`,
  usersAnnual: `${ADMIN_BASE}/users/annual`,
  usersGifts: `${ADMIN_BASE}/users/gifts`,
  content: `${ADMIN_BASE}/content`,
  feedback: `${ADMIN_BASE}/feedback`,
  improvements: `${ADMIN_BASE}/improvements`,
  commsPush: `${ADMIN_BASE}/comms/push`,
  commsInApp: `${ADMIN_BASE}/comms/in-app`,
  commsEmails: `${ADMIN_BASE}/comms/emails`,
  commsTriggers: `${ADMIN_BASE}/comms/triggers`,
  settingsSecurity: `${ADMIN_BASE}/settings/security`,
  settingsDeletions: `${ADMIN_BASE}/settings/deletions`,
  settingsVersion: `${ADMIN_BASE}/settings/version`,
  settingsAgreements: `${ADMIN_BASE}/settings/agreements`,
};
