import { loadStripe } from '@stripe/stripe-js';

// Use Stripe publishable key from environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Initialize Stripe with fallback for missing key
export const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  // Price IDs from Stripe Dashboard
  prices: {
    monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
    annual: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID,
    lifetime: import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID
  }
};

export default stripePromise;
