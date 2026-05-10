import { getEnvVar } from './appConfig.js';

/**
 * App Store IAP Configuration
 *
 * Product IDs must be created in App Store Connect > Subscriptions / In-App Purchases
 * and match exactly — a mismatch causes queryProducts() to return an empty array.
 *
 * Founder (grandfathered) IDs — existing subscribers, closed to new signups:
 *   apple.monthly  |  apple.annual  |  lifetime.apple
 *
 * Research+ IDs — new signups post-2.0 launch:
 *   apple.researchplus.monthly  |  apple.researchplus.annual  |  apple.researchplus.lifetime
 *   (create these in App Store Connect > In-App Purchases if not yet done)
 */

// --- Founder / legacy product IDs (confirmed in StoreKitConfig.storekit + App Store Connect) ---
const APP_STORE_MONTHLY_PRODUCT_ID    = getEnvVar('VITE_APP_STORE_MONTHLY_PRODUCT_ID')   || 'apple.monthly';
const APP_STORE_ANNUAL_PRODUCT_ID     = getEnvVar('VITE_APP_STORE_ANNUAL_PRODUCT_ID')    || 'apple.annual';
const APP_STORE_LIFETIME_PRODUCT_ID   = getEnvVar('VITE_APP_STORE_LIFETIME_PRODUCT_ID')  || 'lifetime.apple';

// --- Research+ product IDs (2.0 — create these in App Store Connect if not yet done) ---
// Suggested IDs: apple.researchplus.monthly, apple.researchplus.annual, apple.researchplus.lifetime
const APP_STORE_RP_MONTHLY_PRODUCT_ID   = getEnvVar('VITE_APP_STORE_RP_MONTHLY_PRODUCT_ID')   || 'apple.researchplus.monthly';
const APP_STORE_RP_ANNUAL_PRODUCT_ID    = getEnvVar('VITE_APP_STORE_RP_ANNUAL_PRODUCT_ID')    || 'apple.researchplus.annual';
const APP_STORE_RP_LIFETIME_PRODUCT_ID  = getEnvVar('VITE_APP_STORE_RP_LIFETIME_PRODUCT_ID')  || 'apple.researchplus.lifetime';

export const APP_STORE_CONFIG = {
  productIds: {
    // Founder (legacy) keys — grandfathered users
    monthly:  APP_STORE_MONTHLY_PRODUCT_ID,
    annual:   APP_STORE_ANNUAL_PRODUCT_ID,
    lifetime: APP_STORE_LIFETIME_PRODUCT_ID,
    founderMonthly:  APP_STORE_MONTHLY_PRODUCT_ID,
    founderAnnual:   APP_STORE_ANNUAL_PRODUCT_ID,
    founderLifetime: APP_STORE_LIFETIME_PRODUCT_ID,

    // Research+ keys — new signups (2.0)
    researchPlusMonthly:  APP_STORE_RP_MONTHLY_PRODUCT_ID,
    researchPlusAnnual:   APP_STORE_RP_ANNUAL_PRODUCT_ID,
    researchPlusLifetime: APP_STORE_RP_LIFETIME_PRODUCT_ID,
  },
  productTypes: {
    monthly:  'autoRenewable',
    annual:   'autoRenewable',
    lifetime: 'nonConsumable',
    founderMonthly:  'autoRenewable',
    founderAnnual:   'autoRenewable',
    founderLifetime: 'nonConsumable',
    researchPlusMonthly:  'autoRenewable',
    researchPlusAnnual:   'autoRenewable',
    researchPlusLifetime: 'nonConsumable',
  },
};

export function getAppStoreProductId(planKey) {
  return APP_STORE_CONFIG.productIds[planKey];
}

export function getAppStoreProductType(planKey) {
  return APP_STORE_CONFIG.productTypes[planKey];
}

export default APP_STORE_CONFIG;
