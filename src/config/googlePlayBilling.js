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

// Founder (grandfathered) product IDs
const GOOGLE_PLAY_MONTHLY_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_MONTHLY_PRODUCT_ID') || 'com.thepepplanner.app.monthly';
const GOOGLE_PLAY_ANNUAL_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_ANNUAL_PRODUCT_ID') || 'com.thepepplanner.app.annual';
const GOOGLE_PLAY_LIFETIME_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_LIFETIME_PRODUCT_ID') || 'com.thepepplanner.app.lifetime';

// Research+ product IDs (new signups)
const GOOGLE_PLAY_RP_MONTHLY_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_RP_MONTHLY_PRODUCT_ID') || 'com.thepepplanner.app.researchmonthly';
const GOOGLE_PLAY_RP_ANNUAL_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_RP_ANNUAL_PRODUCT_ID') || 'm.thepepplanner.app.researchannual';
const GOOGLE_PLAY_RP_LIFETIME_PRODUCT_ID = getEnvVar('VITE_GOOGLE_PLAY_RP_LIFETIME_PRODUCT_ID') || 'com.thepepplanner.app.researchlifetime';

export const GOOGLE_PLAY_CONFIG = {
  productIds: {
    // Founder grandfathered plans
    monthly: GOOGLE_PLAY_MONTHLY_PRODUCT_ID,
    annual: GOOGLE_PLAY_ANNUAL_PRODUCT_ID,
    lifetime: GOOGLE_PLAY_LIFETIME_PRODUCT_ID,
    // Research+ plans (new signups)
    researchPlusMonthly: GOOGLE_PLAY_RP_MONTHLY_PRODUCT_ID,
    researchPlusAnnual: GOOGLE_PLAY_RP_ANNUAL_PRODUCT_ID,
    researchPlusLifetime: GOOGLE_PLAY_RP_LIFETIME_PRODUCT_ID,
  },
  productTypes: {
    monthly: 'subs',
    annual: 'subs',
    lifetime: 'inapp',
    researchPlusMonthly: 'subs',
    researchPlusAnnual: 'subs',
    researchPlusLifetime: 'inapp',
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








