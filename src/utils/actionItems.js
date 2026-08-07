/**
 * Shared To-Do / action-item builders.
 * Mode-aware: never nudge Simple users for fields hidden in Simple modals.
 */

import { formatMMDDYYYY, parseDateString } from './date';
import { getProtocolHistory } from './protocolHistory';
import { getLocalTrackingMode, isSimpleMode } from './trackingMode';
import { getDismissedActionItems } from './actionItemDismissals';

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === 'number') return Number.isNaN(value);
  return String(value).trim() === '';
}

function hasPaymentMethod(payments) {
  if (!payments || typeof payments !== 'object') return false;
  return Object.entries(payments).some(([key, val]) => {
    if (key === 'notes') return false;
    return Boolean(val);
  });
}

function hasContact(contacts) {
  if (!Array.isArray(contacts)) return false;
  return contacts.some((c) => c?.value && String(c.value).trim());
}

/**
 * Stockpile fields always visible on AddToStockpileBottomSheet.
 * (Purity / cap / batch / date live under the optional Advanced accordion — don't nag.)
 */
const STOCKPILE_CORE_CHECKS = [
  { key: 'mg', label: 'amount', get: (item) => item.mg },
  { key: 'quantity', label: 'quantity', get: (item) => item.quantity },
  { key: 'vendor', label: 'vendor', get: (item) => item.vendor || item.vendorId },
  { key: 'cost', label: 'cost', get: (item) => item.cost ?? item.price },
];

export function isStockpileNeedsReview(item) {
  const notes = item?.notes || '';
  return notes.includes('Added during protocol start') || notes.includes('Added during protocol edit');
}

/**
 * Missing core stockpile fields for protocol-quick-add reviews.
 * Same checklist in both modes — these fields are always editable on the sheet.
 */
export function getMissingStockpileFields(item, _simpleMode) {
  return STOCKPILE_CORE_CHECKS.filter((c) => isBlank(c.get(item))).map((c) => c.label);
}

/**
 * Missing vendor fields visible/editable in the current mode.
 * Simple: name + rating only (contacts/payments/labels are hidden or read-only).
 * Advanced: name, rating, contact, payment method.
 */
export function getMissingVendorFields(vendor, simpleMode) {
  const missing = [];
  if (isBlank(vendor?.name)) missing.push('name');
  if (!vendor?.rating || Number(vendor.rating) <= 0) missing.push('rating');
  if (!simpleMode) {
    if (!hasContact(vendor?.contacts)) missing.push('contact');
    if (!hasPaymentMethod(vendor?.payments)) missing.push('payment method');
  }
  return missing;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function coerceLocalDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return Number.isNaN(dateStr.getTime()) ? null : dateStr;
  }
  const s = String(dateStr);
  const datePart = s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = parseDateString(dateStr);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** Calendar days from today to date (negative = past). */
function daysUntil(dateStr) {
  const parsed = coerceLocalDate(dateStr);
  if (!parsed) return null;
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(parsed);
  return Math.round((target - today) / 86400000);
}

function formatShortMonthDay(dateStr) {
  const parsed = coerceLocalDate(dateStr);
  if (!parsed) return formatMMDDYYYY(dateStr) || '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** e.g. "Ended today", "Ended 3 days ago", "Ended Mar 12" */
export function formatEndedMeta(dateStr) {
  const days = daysUntil(dateStr);
  if (days == null) return null;
  const short = formatShortMonthDay(dateStr);
  if (days === 0) return { line: 'Ended today', date: short };
  if (days === -1) return { line: 'Ended yesterday', date: short };
  if (days > -7 && days < 0) return { line: `Ended ${Math.abs(days)} days ago`, date: short };
  if (days < 0) return { line: `Ended ${short}`, date: short };
  // Future end date shouldn't appear for follow-ups, but handle gracefully
  return { line: `Ends ${short}`, date: short };
}

/** e.g. "Ends today", "Ends in 3 days · Apr 2" */
export function formatEndingMeta(dateStr, daysLeft) {
  const short = formatShortMonthDay(dateStr);
  if (daysLeft === 0) return { line: 'Ends today', date: short };
  if (daysLeft === 1) return { line: 'Ends tomorrow', date: short };
  return { line: `Ends in ${daysLeft} days`, date: short };
}

export const ACTION_ITEM_PRIORITY = {
  'ending-today': 0,
  'ending-soon': 1,
  'follow-up': 2,
  'stockpile-entry': 3,
  'vendor': 4,
};

/**
 * Build the flat To-Do list (no low-stock alerts).
 * Each item: title, action, meta, detail?, badge, colors, data, missing
 * @param {{ vendors?: any[], stockpile?: any[], protocols?: any[], simpleMode?: boolean, dismissedMap?: Record<string, unknown>, includeDismissed?: boolean }} opts
 */
export function buildActionItems({
  vendors = [],
  stockpile = [],
  protocols = [],
  simpleMode = isSimpleMode(getLocalTrackingMode()),
  dismissedMap,
  includeDismissed = false,
} = {}) {
  const items = [];
  const dismissed = dismissedMap ?? getDismissedActionItems();

  const protocolsEndingSoon = (protocols || [])
    .filter((p) => p.active !== false && p.endDate)
    .map((p) => ({ ...p, daysLeft: daysUntil(p.endDate) }))
    .filter((p) => p.daysLeft != null && p.daysLeft >= 0 && p.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  protocolsEndingSoon.forEach((p) => {
    const isToday = p.daysLeft === 0;
    const name = p.protocolName || 'Protocol';
    const ending = formatEndingMeta(p.endDate, p.daysLeft);
    items.push({
      id: `ending-${p.id}`,
      type: isToday ? 'ending-today' : 'ending-soon',
      priority: isToday ? ACTION_ITEM_PRIORITY['ending-today'] : ACTION_ITEM_PRIORITY['ending-soon'],
      title: name,
      action: isToday ? 'Plan next cycle' : 'Protocol wrapping up',
      meta: ending?.line || null,
      metaDate: ending?.date || null,
      detail: null,
      badge: isToday ? 'Today' : `${p.daysLeft}d`,
      badgeColor: isToday ? '#ef4444' : '#d97706',
      iconColor: isToday ? '#ef4444' : '#d97706',
      data: p,
      missing: [],
    });
  });

  let protocolsNeedingFollowUp = [];
  try {
    protocolsNeedingFollowUp = getProtocolHistory()
      .filter((e) => e.endDate && !e.notes?.some((n) => n.type === 'follow_up'))
      .map((e) => ({
        id: e.id,
        protocolId: e.protocolId,
        name: e.protocolName || 'Unnamed Protocol',
        endDate: e.endDate,
        completionStatus: e.completionStatus,
      }));
  } catch {
    protocolsNeedingFollowUp = [];
  }

  protocolsNeedingFollowUp.forEach((protocol) => {
    const ended = formatEndedMeta(protocol.endDate);
    items.push({
      id: `protocol-${protocol.id}`,
      type: 'follow-up',
      priority: ACTION_ITEM_PRIORITY['follow-up'],
      title: protocol.name,
      action: 'This protocol was ended — finish your follow-up assessment',
      meta: ended?.line || null,
      metaDate: ended?.date || null,
      detail: null,
      badge: 'Follow-up',
      badgeColor: '#6366f1',
      iconColor: '#6366f1',
      data: protocol,
      missing: [],
    });
  });

  (stockpile || []).filter(isStockpileNeedsReview).forEach((item) => {
    const missing = getMissingStockpileFields(item, simpleMode);
    const name = item.name || 'Unnamed peptide';
    items.push({
      id: `stockpile-${item.id}`,
      type: 'stockpile-entry',
      priority: ACTION_ITEM_PRIORITY['stockpile-entry'],
      title: name,
      action: missing.length ? 'Finish stockpile entry' : 'Review & confirm details',
      meta: null,
      metaDate: null,
      detail: missing.length ? null : 'Added during protocol — confirm details',
      badge: 'Stockpile',
      badgeColor: '#8ea5a0',
      iconColor: '#8ea5a0',
      data: item,
      missing,
    });
  });

  (vendors || []).filter((v) => v?.isStub === true).forEach((vendor) => {
    const missing = getMissingVendorFields(vendor, simpleMode);
    const name = vendor.name || 'Unnamed vendor';
    items.push({
      id: `vendor-${vendor.id}`,
      type: 'vendor',
      priority: ACTION_ITEM_PRIORITY.vendor,
      title: name,
      action: missing.length ? 'Complete vendor profile' : 'Review & save vendor',
      meta: null,
      metaDate: null,
      detail: null,
      badge: 'Vendor',
      badgeColor: '#b09882',
      iconColor: '#b09882',
      data: vendor,
      missing,
    });
  });

  items.sort((a, b) => a.priority - b.priority);

  if (includeDismissed) return items;
  return items.filter((i) => !dismissed?.[i.id]);
}

export function getActionItemCount(opts) {
  return buildActionItems(opts).length;
}
