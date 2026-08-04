/**
 * Shared app navigation config.
 * Bottom nav, sidebar, and mobile drawer all derive from this so Simple/Advanced
 * filtering stays consistent.
 *
 * Progressive disclosure strategy:
 * - All destinations visible in both modes — no hard gates.
 * - Advanced-tier items carry a visual hint ("Advanced") in Simple mode so users
 *   discover features exist without being blocked from them.
 * - The `tier` field is the source of truth for the hint; filtering is opt-in only
 *   for contexts that want to hide items (e.g. a compact widget).
 */

import {
  House,
  CalendarDots,
  TestTube,
  Pill,
  Calculator,
  Pulse,
  ClipboardText,
  Package,
  ShoppingCart,
  Storefront,
  Heart,
} from '@phosphor-icons/react';

export const NAV_TIERS = {
  CORE: 'core',
  ADVANCED: 'advanced',
};

/** Flat list of primary app destinations */
export const NAV_ITEMS = [
  { id: 'home', to: '/app/dashboard', label: 'Home', icon: House, tier: NAV_TIERS.CORE, group: 'main' },
  { id: 'calendar', to: '/app/calendar', label: 'Calendar', icon: CalendarDots, tier: NAV_TIERS.CORE, group: 'main' },
  { id: 'protocols', to: '/app/protocols', label: 'Protocols', icon: TestTube, tier: NAV_TIERS.CORE, group: 'research' },
  { id: 'supplements', to: '/app/supplements', label: 'Supplements', icon: Pill, tier: NAV_TIERS.CORE, group: 'research' },
  { id: 'recon', to: '/app/recon', label: 'Peptide Calc', icon: Calculator, tier: NAV_TIERS.ADVANCED, group: 'research' },
  { id: 'insights', to: '/app/insights', label: 'Insights', icon: Pulse, tier: NAV_TIERS.ADVANCED, group: 'research' },
  { id: 'goals', to: '/app/goals', label: 'Goals', icon: ClipboardText, tier: NAV_TIERS.ADVANCED, group: 'research' },
  { id: 'stockpile', to: '/app/stockpile', label: 'Stockpile', icon: Package, tier: NAV_TIERS.CORE, group: 'inventory' },
  { id: 'orders', to: '/app/orders', label: 'Orders', icon: ShoppingCart, tier: NAV_TIERS.CORE, group: 'inventory' },
  { id: 'vendors', to: '/app/vendors', label: 'Vendors', icon: Storefront, tier: NAV_TIERS.ADVANCED, group: 'inventory' },
  { id: 'wishlist', to: '/app/wishlist', label: 'Wishlist', icon: Heart, tier: NAV_TIERS.ADVANCED, group: 'inventory' },
];

/** Returns all items regardless of mode (no hard filtering). */
export function filterNavByMode(items, trackingMode) {
  return items;
}

/** Sidebar / desktop groups — all items visible, tier metadata preserved. */
export function getSidebarNavGroups(trackingMode) {
  const main = NAV_ITEMS.filter((i) => i.group === 'main');
  const research = NAV_ITEMS.filter((i) => i.group === 'research');
  const inventory = NAV_ITEMS.filter((i) => i.group === 'inventory');
  return [
    { label: null, items: main },
    { label: 'Research', items: research },
    { label: 'Inventory', items: inventory },
  ].filter((g) => g.items.length > 0);
}

/** Bottom-nav Research flyout — all items, tier forwarded for visual hints. */
export function getResearchMenuItems(trackingMode) {
  return NAV_ITEMS.filter((i) => i.group === 'research').map((i) => ({
    path: i.id === 'insights' ? '/app/insights?tab=wellness' : i.id === 'recon' ? '/app/recon?calc=true' : i.to,
    label: i.id === 'supplements' ? 'Supplements & Medication' : i.id === 'recon' ? 'Peptide Calculator' : i.label,
    icon: i.icon,
    iconWeight: 'duotone',
    id: i.id,
    tier: i.tier,
  }));
}

/** Bottom-nav Inventory flyout — all items, tier forwarded for visual hints. */
export function getInventoryMenuItems(trackingMode) {
  return NAV_ITEMS.filter((i) => i.group === 'inventory').map((i) => ({
    path: i.to,
    label: i.id === 'vendors' ? 'Vendors & Communities' : i.label,
    icon: i.icon,
    iconWeight: 'duotone',
    id: i.id,
    tier: i.tier,
  }));
}

/** Paths that count as "advanced feature visits" for the usage nudge */
export const ADVANCED_NAV_PATHS = NAV_ITEMS
  .filter((i) => i.tier === NAV_TIERS.ADVANCED)
  .map((i) => i.to);

export function isAdvancedNavPath(pathname) {
  if (!pathname) return false;
  return ADVANCED_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`));
}
