import { loadStripe } from '@stripe/stripe-js';
import { getEnvVar } from './appConfig.js';

// Use Stripe publishable key from environment variables with fallback
const STRIPE_PUBLISHABLE_KEY = getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY');

// Initialize Stripe with fallback for missing key
export const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const STRIPE_MONTHLY_PRICE_ID = getEnvVar('VITE_STRIPE_MONTHLY_PRICE_ID') || 'price_demo_monthly';
const STRIPE_ANNUAL_PRICE_ID = getEnvVar('VITE_STRIPE_ANNUAL_PRICE_ID') || 'price_demo_annual';
const STRIPE_LIFETIME_PRICE_ID = getEnvVar('VITE_STRIPE_LIFETIME_PRICE_ID') || 'price_demo_lifetime';
const STRIPE_FOUNDER_COUPON_ID = getEnvVar('VITE_STRIPE_FOUNDER_COUPON_ID') || '';
const STRIPE_FOUNDER_LIFETIME_PRICE_ID = getEnvVar('VITE_STRIPE_FOUNDER_LIFETIME_PRICE_ID') || '';
const FOUNDER_DISCOUNT_PERCENT = parseInt(getEnvVar('VITE_FOUNDER_DISCOUNT_PERCENT') || '50', 10);

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  // Price IDs from Stripe Dashboard (with fallback demo IDs for development)
  prices: {
    monthly: STRIPE_MONTHLY_PRICE_ID,
    annual: STRIPE_ANNUAL_PRICE_ID,
    lifetime: STRIPE_LIFETIME_PRICE_ID
  },
  founder: {
    coupon: STRIPE_FOUNDER_COUPON_ID,
    lifetimePrice: STRIPE_FOUNDER_LIFETIME_PRICE_ID,
    discountPercent: FOUNDER_DISCOUNT_PERCENT
  }
};

export default stripePromise;
