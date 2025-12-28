/**
 * Payment Compliance Utilities
 * Ensures Android compliance with Google Play policies
 * 
 * On Android: Use Google Play Billing (now implemented)
 * On Web/iOS: Use external payment (Stripe/App Store)
 */

import { isAndroid } from './platform';

/**
 * Check if payment buttons/links should be shown
 * Returns true on all platforms (Google Play Billing is now implemented for Android)
 * 
 * @returns {boolean}
 */
export function canShowPaymentButtons() {
  // Google Play Billing is now implemented, so payment buttons are allowed on Android
  return true;
}

/**
 * Check if subscription modals should be shown
 * On Android, subscription modals use Google Play Billing (now implemented)
 * 
 * @returns {boolean}
 */
export function canShowSubscriptionModal() {
  // Google Play Billing is now implemented, so subscription modals are allowed on Android
  return true;
}

/**
 * Get Android-compliant message for subscription prompts
 * Shows text-only message directing users to website
 * 
 * @returns {string}
 */
export function getAndroidSubscriptionMessage() {
  return 'Subscribe on our website: thepepplanner.web.app';
}

/**
 * Get Android-compliant upgrade message
 * Text-only, no clickable links
 * 
 * @returns {string}
 */
export function getAndroidUpgradeMessage() {
  return 'To upgrade, visit thepepplanner.web.app in your browser';
}

export default {
  canShowPaymentButtons,
  canShowSubscriptionModal,
  getAndroidSubscriptionMessage,
  getAndroidUpgradeMessage
};

