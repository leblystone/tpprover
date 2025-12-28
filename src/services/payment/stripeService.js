/**
 * Stripe Payment Service
 * Handles subscription payments for Web/PWA platform
 * Wraps the existing Stripe service with platform-aware interface
 */

import { createCheckoutSession } from '../stripe';

/**
 * Subscribe to a plan using Stripe
 * 
 * @param {string} planKey - Plan key ('monthly', 'annual', 'lifetime')
 * @param {Object} options - Additional options
 * @param {string} options.userEmail - User's email
 * @param {string} options.userId - User's ID
 * @param {Object} options.plan - Plan details
 * @param {string} options.returnPath - Path to return to after checkout
 * @param {boolean} options.isGift - Whether this is a gift purchase
 * @param {Object} options.giftData - Gift data if applicable
 * @returns {Promise<void>}
 */
export async function subscribe(planKey, options = {}) {
  console.log('💳 StripeService: Processing subscription for', planKey);
  
  const { userEmail, userId, plan, returnPath = null, isGift = false, giftData = null } = options;
  
  // Import Stripe config to get price IDs
  const { STRIPE_CONFIG } = await import('../../config/stripe');
  
  // Get price ID for the plan
  let priceId = STRIPE_CONFIG.prices[planKey];
  
  // Handle founder pricing for lifetime
  if (planKey === 'lifetime' && options.founderOffer?.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
    priceId = STRIPE_CONFIG.founder.lifetimePrice;
  }
  
  if (!priceId) {
    throw new Error(`Stripe price ID missing for plan ${planKey}`);
  }
  
  // Create checkout session using existing Stripe service
  return await createCheckoutSession(
    priceId,
    userEmail,
    userId,
    returnPath,
    isGift,
    {
      planName: plan?.label || plan?.name || planKey,
      plan: plan,
      giftData: giftData
    }
  );
}

export default {
  subscribe
};

