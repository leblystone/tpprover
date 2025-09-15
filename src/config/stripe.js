import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51...'; // Add your test key here

// Initialize Stripe
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  // Add your price IDs from Stripe Dashboard
  prices: {
    monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_test',
    annual: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID || 'price_annual_test',
    lifetime: import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID || 'price_lifetime_test'
  }
};

export default stripePromise;
