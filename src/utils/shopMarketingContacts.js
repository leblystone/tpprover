/** Normalize and validate a customer email from an order. */
export function normalizeMarketingEmail(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes('@') || email.length < 5) return null;
  return email;
}

/** Map physicalOrders doc → marketing source bucket. */
export function marketingSourceKey(order) {
  const source = (order.source || '').toLowerCase();
  if (source === 'own-site') return 'site';
  if (order.isImported || order.importSource || order.squarespaceOrderId || source === 'squarespace') {
    return 'squarespace';
  }
  if (order.isManual || ['in-person', 'phone', 'wholesale', 'etsy', 'tiktok', 'other', 'manual'].includes(source)) {
    return 'manual';
  }
  return 'other';
}

export const MARKETING_SOURCE_LABELS = {
  site: 'Site checkout',
  squarespace: 'Squarespace',
  manual: 'Manual / in-person',
  other: 'Other',
};

export const PROMO_STATUS_LABELS = {
  subscribed: 'Subscribed',
  opted_out: 'Opted out',
  declined: 'Declined at checkout',
  unknown: 'No consent recorded',
};

export function resolvePromoStatus(contact, pref) {
  if (pref?.marketingOptIn === false && pref?.marketingOptOutAt) return 'opted_out';
  if (pref?.marketingOptIn === true) return 'subscribed';
  if (contact.latestMarketingConsent === true) return 'subscribed';
  if (contact.latestMarketingConsent === false) return 'declined';
  return 'unknown';
}

/** Merge Firestore shopMarketingContacts prefs onto order-derived contacts. */
export function mergeMarketingPrefs(contacts, prefsDocs = []) {
  const prefsByEmail = new Map();
  prefsDocs.forEach((p) => {
    if (p.email) prefsByEmail.set(p.email.toLowerCase(), p);
  });

    return contacts.map((contact) => {
    const pref = prefsByEmail.get(contact.email);
    const promoStatus = resolvePromoStatus(contact, pref);
    return {
      ...contact,
      promoStatus,
      marketingOptIn: promoStatus === 'subscribed',
      pref,
      optOutReason: pref?.optOutReason || null,
      marketingOptOutAt: pref?.marketingOptOutAt || null,
      unsubscribeSource: pref?.unsubscribeSource || null,
    };
  });
}

function orderTimestamp(order) {
  const ts = order.createdAt || order.paidAt;
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  return new Date(ts).getTime();
}

function isOrderCancelled(status) {
  const s = (status || '').toLowerCase();
  return s === 'cancelled' || s === 'canceled';
}

/**
 * Build deduplicated marketing contacts from physicalOrders rows.
 * @param {Array<object>} orders
 * @returns {Array<object>}
 */
export function buildShopMarketingContacts(orders = []) {
  const byEmail = new Map();

  for (const order of orders) {
    const email = normalizeMarketingEmail(order.customerEmail);
    if (!email) continue;

    const ts = orderTimestamp(order);
    const sourceKey = marketingSourceKey(order);
    const name = (order.customerName || order.shippingName || '').trim();
    const spent = Number(order.amountTotal) || 0;
    const cancelled = isOrderCancelled(order.status);

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        email,
        displayEmail: order.customerEmail.trim(),
        name,
        orderCount: 1,
        totalSpentCents: spent,
        lastOrderAt: ts,
        firstOrderAt: ts,
        sources: new Set([sourceKey]),
        cancelledOrders: cancelled ? 1 : 0,
        latestOrderId: order.id,
        shopOrderNumber: order.shopOrderNumber || null,
        latestMarketingConsent: typeof order.marketingConsent === 'boolean' ? order.marketingConsent : null,
        latestConsentAt: typeof order.marketingConsent === 'boolean' ? ts : 0,
      });
      continue;
    }

    existing.orderCount += 1;
    existing.totalSpentCents += spent;
    if (cancelled) existing.cancelledOrders += 1;
    existing.sources.add(sourceKey);
    if (ts > existing.lastOrderAt) {
      existing.lastOrderAt = ts;
      existing.displayEmail = order.customerEmail.trim();
      if (name) existing.name = name;
      existing.latestOrderId = order.id;
      existing.shopOrderNumber = order.shopOrderNumber || existing.shopOrderNumber;
    }
    if (typeof order.marketingConsent === 'boolean' && ts >= (existing.latestConsentAt || 0)) {
      existing.latestMarketingConsent = order.marketingConsent;
      existing.latestConsentAt = ts;
    }
    if (ts < existing.firstOrderAt) existing.firstOrderAt = ts;
    if (!existing.name && name) existing.name = name;
  }

  return [...byEmail.values()]
    .map((c) => ({
      ...c,
      sources: [...c.sources].sort(),
      allOrdersCancelled: c.cancelledOrders === c.orderCount,
    }))
    .sort((a, b) => b.lastOrderAt - a.lastOrderAt);
}

export function filterMarketingContacts(contacts, { source = 'all', promo = 'all', search = '' } = {}) {
  const q = search.trim().toLowerCase();
  return contacts.filter((c) => {
    if (source !== 'all' && !c.sources.includes(source)) return false;
    if (promo === 'subscribed' && c.promoStatus !== 'subscribed') return false;
    if (promo === 'opted_out' && c.promoStatus !== 'opted_out') return false;
    if (promo === 'no_consent' && c.promoStatus !== 'unknown' && c.promoStatus !== 'declined') return false;
    if (!q) return true;
    return (
      c.email.includes(q)
      || (c.name || '').toLowerCase().includes(q)
      || (c.displayEmail || '').toLowerCase().includes(q)
    );
  });
}

export function marketingContactsToCsv(contacts) {
  const header = 'email,name,orders,total_spent_usd,last_order,sources,promo_status,all_cancelled';
  const rows = contacts.map((c) => {
    const last = c.lastOrderAt
      ? new Date(c.lastOrderAt).toISOString().slice(0, 10)
      : '';
    const total = (c.totalSpentCents / 100).toFixed(2);
    const sources = c.sources.map((s) => MARKETING_SOURCE_LABELS[s] || s).join('; ');
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [
      escape(c.displayEmail || c.email),
      escape(c.name || ''),
      c.orderCount,
      total,
      last,
      escape(sources),
      escape(PROMO_STATUS_LABELS[c.promoStatus] || c.promoStatus || ''),
      c.allOrdersCancelled ? 'yes' : 'no',
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function downloadMarketingCsv(contacts, filename = 'shop-marketing-contacts.csv') {
  const blob = new Blob([marketingContactsToCsv(contacts)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
