/**
 * Shared app navigation config.
 * Bottom nav, sidebar, and mobile drawer all derive from this so Simple/Advanced
 * filtering stays consistent.
 *
 * Progressive disclosure strategy:
 * - Bottom nav tabs stay the same for everyone (Calendar / Research / Home / Inventory / More).
 * - Inside Research & Inventory flyouts, Advanced-tier items are hidden in Simple mode
 *   (not stuffed under a single "More" dump).
 * - Desktop sidebar similarly omits Advanced-tier items in Simple mode.
 * - Advanced pages remain reachable via Settings → switch to Advanced, or deep links.
 */

import {
  House,
  CalendarDots,
  TestTube,
  Pill,
  Calculator,
  ChartLine,
  ClipboardText,
  Robot,
  Package,
  ShoppingCart,
  Storefront,
  Heart,
} from '@phosphor-icons/react';
import { featureFlags } from './featureFlags';
import { TRACKING_MODES, normalizeTrackingMode } from '../utils/trackingMode';

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
  { id: 'insights', to: '/app/insights', label: 'Analytics', icon: ChartLine, tier: NAV_TIERS.ADVANCED, group: 'research' },
  { id: 'goals', to: '/app/goals', label: 'Goals', icon: ClipboardText, tier: NAV_TIERS.ADVANCED, group: 'research' },
  ...(featureFlags.ENABLE_AI_RESEARCH
    ? [{ id: 'ai', to: '/app/ai', label: 'P.i.P', icon: Robot, tier: NAV_TIERS.ADVANCED, group: 'research' }]
    : []),
  { id: 'stockpile', to: '/app/stockpile', label: 'Stockpile', icon: Package, tier: NAV_TIERS.CORE, group: 'inventory' },
  { id: 'orders', to: '/app/orders', label: 'Orders', icon: ShoppingCart, tier: NAV_TIERS.CORE, group: 'inventory' },
  { id: 'vendors', to: '/app/vendors', label: 'Vendors', icon: Storefront, tier: NAV_TIERS.ADVANCED, group: 'inventory' },
  { id: 'wishlist', to: '/app/wishlist', label: 'Wishlist', icon: Heart, tier: NAV_TIERS.ADVANCED, group: 'inventory' },
];

export function filterNavByMode(items, trackingMode) {
  const mode = normalizeTrackingMode(trackingMode);
  if (mode === TRACKING_MODES.ADVANCED) return items;
  return items.filter((item) => item.tier === NAV_TIERS.CORE);
}

/** Sidebar / desktop groups */
export function getSidebarNavGroups(trackingMode) {
  const items = filterNavByMode(NAV_ITEMS, trackingMode);
  const main = items.filter((i) => i.group === 'main');
  const research = items.filter((i) => i.group === 'research');
  const inventory = items.filter((i) => i.group === 'inventory');
  return [
    { label: null, items: main },
    { label: 'Research', items: research },
    { label: 'Inventory', items: inventory },
  ].filter((g) => g.items.length > 0);
}

/** Bottom-nav Research flyout */
export function getResearchMenuItems(trackingMode) {
  return filterNavByMode(
    NAV_ITEMS.filter((i) => i.group === 'research'),
    trackingMode
  ).map((i) => ({
    path: i.id === 'insights' ? '/app/insights?tab=research' : i.to,
    label: i.id === 'supplements' ? 'Supplements & Medication' : i.id === 'recon' ? 'Peptide Calculator' : i.label,
    icon: i.icon,
    iconWeight: 'duotone',
    id: i.id,
    tier: i.tier,
  }));
}

/** Bottom-nav Inventory flyout */
export function getInventoryMenuItems(trackingMode) {
  return filterNavByMode(
    NAV_ITEMS.filter((i) => i.group === 'inventory'),
    trackingMode
  ).map((i) => ({
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
