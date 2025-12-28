/**
 * Payment Service Router
 * Routes subscription requests to the appropriate payment provider based on platform
 * 
 * Platform routing:
 * - Web/PWA → Stripe
 * - Android → Google Play Billing
 * - iOS → App Store IAP (future)
 */

import { isAndroid, isIOS, isWeb } from '../../utils/platform';
import { subscribe as stripeSubscribe } from './stripeService';
import { subscribe as googlePlaySubscribe } from './googlePlayBillingService';
import { subscribe as appStoreSubscribe } from './appStoreIAPService';

/**
 * Subscribe to a plan
 * Automatically routes to the correct payment provider based on platform
 * 
 * @param {string} planKey - Plan key ('monthly', 'annual', 'lifetime')
 * @param {Object} options - Additional options
 * @param {string} options.userEmail - User's email
 * @param {string} options.userId - User's ID
 * @param {Object} options.plan - Plan details
 * @returns {Promise<void>}
 */
export async function subscribe(planKey, options = {}) {
  console.log(`💳 PaymentService: Routing subscription for ${planKey} on ${getPlatformName()}`);
  
  if (isAndroid()) {
    return await googlePlaySubscribe(planKey, options);
  } else if (isIOS()) {
    return await appStoreSubscribe(planKey, options);
  } else {
    // Web/PWA - use Stripe
    return await stripeSubscribe(planKey, options);
  }
}

/**
 * Get the current platform name for logging
 */
function getPlatformName() {
  if (isAndroid()) return 'Android';
  if (isIOS()) return 'iOS';
  return 'Web/PWA';
}

/**
 * Check if a payment provider is available on the current platform
 * @param {string} provider - 'stripe', 'googleplay', 'appstore'
 * @returns {boolean}
 */
export function isPaymentProviderAvailable(provider) {
  switch (provider) {
    case 'stripe':
      return isWeb();
    case 'googleplay':
      return isAndroid();
    case 'appstore':
      return isIOS();
    default:
      return false;
  }
}

/**
 * Get the active payment provider for the current platform
 * @returns {string} - 'stripe', 'googleplay', or 'appstore'
 */
export function getActivePaymentProvider() {
  if (isAndroid()) return 'googleplay';
  if (isIOS()) return 'appstore';
  return 'stripe';
}

export default {
  subscribe,
  isPaymentProviderAvailable,
  getActivePaymentProvider
};

