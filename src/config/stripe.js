import { loadStripe } from '@stripe/stripe-js';
import { getEnvVar } from './appConfig.js';

// Use Stripe publishable key from environment variables with fallback
const STRIPE_PUBLISHABLE_KEY = getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY');

// Initialize Stripe with explicit locale to prevent module loading errors
export const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY, {
  locale: 'en'
}) : null;

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
