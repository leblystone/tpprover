import { getEnvVar } from './appConfig.js';

/**
 * Google Play Billing Configuration
 * 
 * Product IDs must be configured in Google Play Console:
 * - Subscriptions: Monthly, Annual
 * - One-time purchase: Lifetime
 * 
 * Product IDs follow the format: com.thepepplanner.app.{planKey}
 */

// Google Play product IDs (these must match what's configured in Google Play Console)
const GOOGLE_PLAY_MONTHLY_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_MONTHLY_PRODUCT_ID') || 'com.thepepplanner.app.monthly';
const GOOGLE_PLAY_ANNUAL_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_ANNUAL_PRODUCT_ID') || 'com.thepepplanner.app.annual';
const GOOGLE_PLAY_LIFETIME_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_LIFETIME_PRODUCT_ID') || 'com.thepepplanner.app.lifetime';

export const GOOGLE_PLAY_CONFIG = {
  // Map plan keys to Google Play product IDs
  productIds: {
    monthly: GOOGLE_PLAY_MONTHLY_PRODUCT_ID,
    annual: GOOGLE_PLAY_ANNUAL_PRODUCT_ID,
    lifetime: GOOGLE_PLAY_LIFETIME_PRODUCT_ID
  },
  
  // Product types
  productTypes: {
    monthly: 'subs',    // Subscription
    annual: 'subs',     // Subscription
    lifetime: 'inapp'   // One-time purchase
  }
};

/**
 * Get Google Play product ID for a plan key
 * @param {string} planKey - 'monthly', 'annual', or 'lifetime'
 * @returns {string} Google Play product ID
 */
export function getGooglePlayProductId(planKey) {
  return GOOGLE_PLAY_CONFIG.productIds[planKey];
}

/**
 * Get product type for a plan key
 * @param {string} planKey - 'monthly', 'annual', or 'lifetime'
 * @returns {string} 'subs' for subscriptions, 'inapp' for one-time purchases
 */
export function getGooglePlayProductType(planKey) {
  return GOOGLE_PLAY_CONFIG.productTypes[planKey];
}

export default GOOGLE_PLAY_CONFIG;







