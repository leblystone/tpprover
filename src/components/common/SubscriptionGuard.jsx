import React from 'react';

/**
 * SubscriptionGuard - No longer hard-redirects. All users stay inside the app.
 *
 * Access model: free-tier / expired users are "downgraded" (ENABLE_SOFT_DOWNGRADE).
 * Feature-level gating (Research+ badges, InsightsPremiumWall, caps) handles
 * differentiation at the component level. Full-page lockouts are removed.
 *
 * The /app/trial-expired and /app/account/subscription pages still exist and
 * can be reached via explicit navigation (e.g. upgrade CTAs), but are never
 * forced on users automatically.
 */
export default function SubscriptionGuard({ children }) {
  return children;
}

