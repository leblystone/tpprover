/**
 * Payment Configuration
 * Platform-specific payment provider configuration
 */

import { isAndroid, isIOS } from '../utils/platform';

/**
 * Get the active payment provider for the current platform
 * @returns {string} - 'stripe', 'googleplay', or 'appstore'
 */
export function getPaymentProvider() {
  if (isAndroid()) return 'googleplay';
  if (isIOS()) return 'appstore';
  return 'stripe';
}

/**
 * Payment provider configuration
 */
export const PAYMENT_CONFIG = {
  stripe: {
    provider: 'stripe',
    name: 'Stripe',
    platform: 'web',
    enabled: true
  },
  googleplay: {
    provider: 'googleplay',
    name: 'Google Play Billing',
    platform: 'android',
    enabled: isAndroid() // Only enabled on Android
  },
  appstore: {
    provider: 'appstore',
    name: 'App Store IAP',
    platform: 'ios',
    enabled: isIOS() // Only enabled on iOS
  }
};

/**
 * Get configuration for the active payment provider
 * @returns {Object}
 */
export function getActivePaymentConfig() {
  const provider = getPaymentProvider();
  return PAYMENT_CONFIG[provider] || PAYMENT_CONFIG.stripe;
}

export default {
  getPaymentProvider,
  getActivePaymentConfig,
  PAYMENT_CONFIG
};

