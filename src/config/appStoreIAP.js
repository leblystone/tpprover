import { getEnvVar } from './appConfig.js';

/**
 * App Store IAP Configuration
 * 
 * Product IDs must be configured in App Store Connect:
 * - Auto-renewable subscriptions: Monthly, Annual
 * - Non-consumable: Lifetime
 * 
 * Product IDs: monthly.apple, annual.apple, lifetime.apple
 */

const APP_STORE_MONTHLY_PRODUCT_ID = getEnvVar('VITE_APP_STORE_MONTHLY_PRODUCT_ID') || 'apple.monthly';
const APP_STORE_ANNUAL_PRODUCT_ID = getEnvVar('VITE_APP_STORE_ANNUAL_PRODUCT_ID') || 'apple.annual';
const APP_STORE_LIFETIME_PRODUCT_ID = getEnvVar('VITE_APP_STORE_LIFETIME_PRODUCT_ID') || 'lifetime.apple';

export const APP_STORE_CONFIG = {
  productIds: {
    monthly: APP_STORE_MONTHLY_PRODUCT_ID,
    annual: APP_STORE_ANNUAL_PRODUCT_ID,
    lifetime: APP_STORE_LIFETIME_PRODUCT_ID,
  },
  productTypes: {
    monthly: 'autoRenewable',
    annual: 'autoRenewable',
    lifetime: 'nonConsumable',
  },
};

export function getAppStoreProductId(planKey) {
  return APP_STORE_CONFIG.productIds[planKey];
}

export function getAppStoreProductType(planKey) {
  return APP_STORE_CONFIG.productTypes[planKey];
}

export default APP_STORE_CONFIG;
