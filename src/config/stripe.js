import { loadStripe } from '@stripe/stripe-js';
import { getEnvVar } from './appConfig.js';

// App (subscriptions) publishable key
const STRIPE_PUBLISHABLE_KEY = getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY');

// Shop (physical/digital products) publishable key — separate Stripe account
const STRIPE_SHOP_PUBLISHABLE_KEY =
  getEnvVar('VITE_STRIPE_SHOP_PUBLISHABLE_KEY') || STRIPE_PUBLISHABLE_KEY;

let stripePromiseCache = null;
let shopStripePromiseCache = null;

/**
 * Loads Stripe.js for app subscriptions on first use only.
 */
export function getStripePromise() {
  if (!STRIPE_PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromiseCache) {
    stripePromiseCache = loadStripe(STRIPE_PUBLISHABLE_KEY, { locale: 'en' });
  }
  return stripePromiseCache;
}

/**
 * Loads Stripe.js for shop (physical/digital) checkouts on first use only.
 * Uses VITE_STRIPE_SHOP_PUBLISHABLE_KEY; falls back to the app key if not set.
 */
export function getShopStripePromise() {
  if (!STRIPE_SHOP_PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!shopStripePromiseCache) {
    shopStripePromiseCache = loadStripe(STRIPE_SHOP_PUBLISHABLE_KEY, { locale: 'en' });
  }
  return shopStripePromiseCache;
}

/** Thenable for `await stripePromise` — defers loadStripe until first await */
export const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? {
      then(onFulfilled, onRejected) {
        return getStripePromise().then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        return getStripePromise().catch(onRejected);
      },
    }
  : null;

// Founder (grandfathered) price IDs
const STRIPE_MONTHLY_PRICE_ID = getEnvVar('VITE_STRIPE_MONTHLY_PRICE_ID') || 'price_demo_monthly';
const STRIPE_ANNUAL_PRICE_ID = getEnvVar('VITE_STRIPE_ANNUAL_PRICE_ID') || 'price_demo_annual';
const STRIPE_LIFETIME_PRICE_ID = getEnvVar('VITE_STRIPE_LIFETIME_PRICE_ID') || 'price_demo_lifetime';
const STRIPE_FOUNDER_COUPON_ID = getEnvVar('VITE_STRIPE_FOUNDER_COUPON_ID') || '';
const STRIPE_FOUNDER_LIFETIME_PRICE_ID = getEnvVar('VITE_STRIPE_FOUNDER_LIFETIME_PRICE_ID') || '';
const FOUNDER_DISCOUNT_PERCENT = parseInt(getEnvVar('VITE_FOUNDER_DISCOUNT_PERCENT') || '50', 10);

// Research+ price IDs (new signups)
const STRIPE_RP_MONTHLY_PRICE_ID = getEnvVar('VITE_STRIPE_RP_MONTHLY_PRICE_ID') || 'price_1TS5C550b3cktl9XUg2Uvg5d';
const STRIPE_RP_ANNUAL_PRICE_ID = getEnvVar('VITE_STRIPE_RP_ANNUAL_PRICE_ID') || 'price_1TS5D250b3cktl9XYpr3bhT2';
const STRIPE_RP_LIFETIME_PRICE_ID = getEnvVar('VITE_STRIPE_RP_LIFETIME_PRICE_ID') || 'price_1TS5DS50b3cktl9Xb3gNyL2d';

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  prices: {
    // Founder grandfathered plans
    monthly: STRIPE_MONTHLY_PRICE_ID,
    annual: STRIPE_ANNUAL_PRICE_ID,
    lifetime: STRIPE_LIFETIME_PRICE_ID,
    // Research+ plans (new signups)
    researchPlusMonthly: STRIPE_RP_MONTHLY_PRICE_ID,
    researchPlusAnnual: STRIPE_RP_ANNUAL_PRICE_ID,
    researchPlusLifetime: STRIPE_RP_LIFETIME_PRICE_ID,
  },
  founder: {
    coupon: STRIPE_FOUNDER_COUPON_ID,
    lifetimePrice: STRIPE_FOUNDER_LIFETIME_PRICE_ID,
    discountPercent: FOUNDER_DISCOUNT_PERCENT
  }
};

export default stripePromise;
