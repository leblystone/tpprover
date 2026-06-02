/**
 * Shop funnel analytics — page views, cart, checkout, purchases.
 *
 * Mirrors events to Firebase Analytics and Firestore `shopEvents` for the
 * admin Shop → Analytics dashboard. Best-effort; never blocks UI.
 */
import { logAnalyticsEvent } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const EVENTS = {
  PAGE_VIEW: 'shop_page_view',
  PRODUCT_VIEW: 'shop_product_view',
  ADD_TO_CART: 'shop_add_to_cart',
  REMOVE_FROM_CART: 'shop_remove_from_cart',
  CHECKOUT_STARTED: 'shop_checkout_started',
  PURCHASE_SUCCESS: 'shop_purchase_success',
  CHECKOUT_SESSION_CREATED: 'shop_checkout_session_created',
};

const SHOP_EVENTS_COLLECTION = 'shopEvents';
const SESSION_KEY = 'tpp_shop_sid';

function sanitizeParams(params = {}) {
  const out = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'object') {
      try {
        out[key] = JSON.stringify(value).slice(0, 100);
      } catch {
        // skip
      }
      return;
    }
    out[key] = String(value).slice(0, 100);
  });
  return out;
}

/** Stable anonymous session id for funnel grouping. */
export function getShopSessionId() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

/**
 * @param {string} eventName
 * @param {object} params
 */
export async function trackShopEvent(eventName, params = {}) {
  if (!eventName) return;
  const payload = sanitizeParams(params);
  const path = typeof window !== 'undefined' ? window.location.pathname : null;
  const referrer = typeof document !== 'undefined' ? document.referrer?.slice(0, 200) || null : null;

  try {
    logAnalyticsEvent(eventName, payload);
  } catch (err) {
    if (import.meta?.env?.DEV) {
      console.warn('[shopAnalytics] logAnalyticsEvent failed', err);
    }
  }

  try {
    const user = auth?.currentUser;
    await addDoc(collection(db, SHOP_EVENTS_COLLECTION), {
      eventName,
      params: payload,
      uid: user?.uid || null,
      email: user?.email || null,
      sessionId: getShopSessionId(),
      path,
      referrer,
      createdAt: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
    });
  } catch (err) {
    if (import.meta?.env?.DEV) {
      console.warn('[shopAnalytics] Firestore mirror failed', err);
    }
  }
}

export function trackShopPageView(page, extra = {}) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  return trackShopEvent(EVENTS.PAGE_VIEW, { page, path, ...extra });
}

export function trackShopProductView(product) {
  if (!product) return;
  return trackShopEvent(EVENTS.PRODUCT_VIEW, {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
  });
}

export function trackShopCheckoutStarted(items, cartTotal) {
  const lineItemIds = (items || []).map((i) => i.id).join(',');
  return trackShopEvent(EVENTS.CHECKOUT_STARTED, {
    itemCount: String((items || []).length),
    cartValue: String(cartTotal ?? 0),
    lineItemIds: lineItemIds.slice(0, 100),
  });
}

export default {
  EVENTS,
  getShopSessionId,
  trackShopEvent,
  trackShopPageView,
  trackShopProductView,
  trackShopCheckoutStarted,
};
