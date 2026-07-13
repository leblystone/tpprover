import { EVENTS } from '../services/shopAnalytics';

function eventTime(entry) {
  if (!entry?.createdAt) return 0;
  if (entry.createdAt?.toDate) return entry.createdAt.toDate().getTime();
  if (typeof entry.createdAt?.seconds === 'number') return entry.createdAt.seconds * 1000;
  return new Date(entry.createdAt).getTime();
}

function formatMoney(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format((cents || 0) / 100);
}

const SHOP_EVENT_MAP = {
  [EVENTS.ADD_TO_CART]: (p) => ({
    type: 'add_to_cart',
    title: 'Added to cart',
    detail: [p.name, p.qty && p.qty !== '1' ? `×${p.qty}` : null].filter(Boolean).join(' '),
    actor: 'customer',
  }),
  [EVENTS.REMOVE_FROM_CART]: (p) => ({
    type: 'remove_from_cart',
    title: 'Removed from cart',
    detail: p.name || null,
    actor: 'customer',
  }),
  [EVENTS.CHECKOUT_STARTED]: (p) => ({
    type: 'checkout_started',
    title: 'Checkout started',
    detail: p.itemCount ? `${p.itemCount} item${p.itemCount === '1' ? '' : 's'}` : null,
    actor: 'customer',
  }),
  [EVENTS.CHECKOUT_SESSION_CREATED]: (p) => ({
    type: 'checkout_session',
    title: 'Stripe checkout opened',
    detail: p.itemCount ? `${p.itemCount} item${p.itemCount === '1' ? '' : 's'}` : null,
    actor: 'customer',
  }),
  [EVENTS.PURCHASE_SUCCESS]: () => ({
    type: 'checkout_completed',
    title: 'Checkout completed',
    detail: 'Payment confirmed on success page',
    actor: 'customer',
  }),
};

function shopEventToActivity(ev) {
  const mapper = SHOP_EVENT_MAP[ev.eventName];
  if (!mapper) return null;
  const mapped = mapper(ev.params || {});
  return {
    id: ev.id ? `shop-${ev.id}` : `shop-${ev.eventName}-${eventTime(ev)}`,
    ...mapped,
    createdAt: ev.createdAt,
    actorEmail: ev.email || null,
  };
}

function legacyActivitiesFromOrder(order) {
  const items = [];
  const currency = order.currency || 'usd';

  if (order.createdAt) {
    const source = order.source || 'own-site';
    const sourceLabel = source === 'squarespace' ? 'Squarespace'
      : source === 'own-site' ? 'Website checkout'
      : source === 'in-person' ? 'In-person'
      : source === 'etsy' ? 'Etsy'
      : source;
    items.push({
      id: 'legacy-created',
      type: 'order_created',
      title: 'Order created',
      detail: sourceLabel,
      actor: source === 'in-person' || source === 'squarespace' ? 'admin' : 'customer',
      createdAt: order.createdAt,
    });
  }

  if (order.paidAt || (order.paymentIntentId && order.createdAt)) {
    items.push({
      id: 'legacy-paid',
      type: 'checkout_completed',
      title: 'Payment received',
      detail: order.amountTotal != null ? formatMoney(order.amountTotal, currency) : null,
      actor: 'customer',
      createdAt: order.paidAt || order.createdAt,
    });
  }

  if (order.trackingNumber && (order.shippedAt || order.labelUrl)) {
    items.push({
      id: 'legacy-label',
      type: 'label_created',
      title: 'Shipping label created',
      detail: [
        order.labelCarrier,
        order.trackingNumber,
      ].filter(Boolean).join(' · '),
      actor: 'admin',
      createdAt: order.shippedAt || order.fulfilledAt || order.createdAt,
    });
  }

  if (order.shippedAt) {
    items.push({
      id: 'legacy-shipped',
      type: 'shipped',
      title: 'Order shipped',
      detail: order.trackingNumber ? `Tracking ${order.trackingNumber}` : null,
      actor: 'admin',
      createdAt: order.shippedAt,
    });
  }

  if (order.fulfilledAt && !order.shippedAt) {
    items.push({
      id: 'legacy-fulfilled',
      type: 'status_changed',
      title: 'Marked as fulfilled',
      detail: null,
      actor: 'admin',
      createdAt: order.fulfilledAt,
    });
  }

  if (order.deliveredAt) {
    items.push({
      id: 'legacy-delivered',
      type: 'delivered',
      title: 'Delivered',
      detail: order.trackingNumber ? `Tracking ${order.trackingNumber}` : null,
      actor: 'system',
      createdAt: order.deliveredAt,
    });
  }

  if (order.cancelledAt) {
    items.push({
      id: 'legacy-cancelled',
      type: 'cancelled',
      title: 'Order cancelled',
      detail: null,
      actor: 'admin',
      createdAt: order.cancelledAt,
    });
  }

  if (order.refundedAt || (order.financialStatus || '').toUpperCase() === 'REFUNDED') {
    items.push({
      id: 'legacy-refunded',
      type: 'refunded',
      title: 'Refunded via Stripe',
      detail: null,
      actor: 'admin',
      createdAt: order.refundedAt || order.updatedAt,
    });
  }

  return items;
}

function trackingDetailsToActivities(trackingDetails = []) {
  return trackingDetails
    .map((scan, i) => {
      const msg = scan.message || scan.status_detail || scan.status || 'Tracking update';
      const loc = scan.tracking_location;
      const location = loc
        ? [loc.city, loc.state, loc.country].filter(Boolean).join(', ')
        : null;
      return {
        id: `tracking-${scan.datetime || i}-${msg.slice(0, 24)}`,
        type: 'tracking_update',
        title: 'Carrier scan',
        detail: [msg, location].filter(Boolean).join(' · '),
        actor: 'system',
        createdAt: scan.datetime ? new Date(scan.datetime) : null,
        meta: { rawStatus: scan.status },
      };
    })
    .filter((e) => e.createdAt);
}

function dedupeActivities(list) {
  const seen = new Set();
  return list.filter((entry) => {
    const key = entry.id || `${entry.type}-${eventTime(entry)}-${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(eventTime(entry) || entry.createdAt);
  });
}

/**
 * Build a unified activity timeline (newest first).
 * @param {object} order - physicalOrders document
 * @param {{ shopEvents?: object[], trackingDetails?: object[] }} extras
 */
export function buildOrderActivityTimeline(order, extras = {}) {
  const { shopEvents = [], trackingDetails = [] } = extras;
  const logged = Array.isArray(order.activityLog) ? [...order.activityLog] : [];
  const legacy = logged.length === 0 ? legacyActivitiesFromOrder(order) : [];
  const hasLoggedFunnel = logged.some((e) => (
    ['add_to_cart', 'checkout_started', 'checkout_session', 'checkout_completed'].includes(e.type)
  ));
  const fromShop = hasLoggedFunnel ? [] : shopEvents.map(shopEventToActivity).filter(Boolean);
  const fromTracking = trackingDetailsToActivities(trackingDetails);

  const merged = dedupeActivities([
    ...logged,
    ...legacy,
    ...fromShop,
    ...fromTracking,
  ]);

  return merged.sort((a, b) => eventTime(b) - eventTime(a));
}

export function actorLabel(actor) {
  if (actor === 'customer') return 'Customer';
  if (actor === 'admin') return 'Admin';
  if (actor === 'system') return 'System';
  return 'System';
}

export { eventTime as activityEventTime };
