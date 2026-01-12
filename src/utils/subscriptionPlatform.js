/**
 * Cross-Platform Subscription Management Utilities
 * 
 * Handles subscription status checking and platform-specific billing redirects
 * for PWA (Stripe), Android (Google Play), and iOS (Apple In-App Purchase)
 */

/**
 * Determine the original subscription platform
 * @param {Object} subscription - Subscription object from Firestore
 * @returns {string} 'stripe' | 'googleplay' | 'apple' | 'admin' | 'unknown'
 */
export function getSubscriptionPlatform(subscription) {
  if (!subscription) {
    return 'unknown';
  }

  // Check for explicit paymentProvider field (new field)
  if (subscription.paymentProvider) {
    return subscription.paymentProvider;
  }

  // Legacy detection: Check for platform-specific fields
  if (subscription.stripeSubscriptionId || subscription.stripeCustomerId) {
    return 'stripe';
  }

  if (subscription.googlePlayProductId || subscription.googlePlayPurchaseToken) {
    return 'googleplay';
  }

  if (subscription.appleTransactionId || subscription.appleOriginalTransactionId) {
    return 'apple';
  }

  // Admin-granted lifetime access
  if (subscription.hasLifetimeAccess && subscription.lifetimeReason && 
      (subscription.lifetimeReason.includes('admin') || 
       subscription.lifetimeReason.includes('founder') || 
       subscription.lifetimeReason.includes('beta'))) {
    return 'admin';
  }

  // Google Play lifetime purchase
  if (subscription.hasLifetimeAccess && subscription.lifetimeReason === 'google_play_purchase') {
    return 'googleplay';
  }

  // Stripe lifetime purchase
  if (subscription.hasLifetimeAccess && subscription.stripeCustomerId) {
    return 'stripe';
  }

  return 'unknown';
}

/**
 * Get platform-friendly display name
 * @param {string} platform - Platform identifier
 * @returns {string} User-friendly platform name
 */
export function getPlatformDisplayName(platform) {
  const names = {
    stripe: 'Web (Stripe)',
    googleplay: 'Google Play',
    apple: 'App Store',
    admin: 'Admin Grant',
    unknown: 'Unknown'
  };
  return names[platform] || 'Unknown';
}

/**
 * Check if billing can be managed on current platform
 * @param {Object} subscription - Subscription object
 * @param {string} currentPlatform - Current platform ('web', 'android', 'ios')
 * @returns {Object} { canManage: boolean, reason: string, redirectUrl: string|null }
 */
export function canManageBillingOnPlatform(subscription, currentPlatform) {
  const subPlatform = getSubscriptionPlatform(subscription);

  // Admin-granted subscriptions cannot be managed by users
  if (subPlatform === 'admin') {
    return {
      canManage: false,
      reason: 'This subscription was granted by an administrator and cannot be managed.',
      redirectUrl: null
    };
  }

  // Lifetime purchases (non-admin) cannot be managed
  if (subscription?.hasLifetimeAccess && subPlatform !== 'admin') {
    return {
      canManage: false,
      reason: 'Lifetime access is already activated. No billing management needed.',
      redirectUrl: null
    };
  }

  // Platform-specific management rules
  if (subPlatform === 'stripe') {
    if (currentPlatform === 'web') {
      return {
        canManage: true,
        reason: 'Manage via Stripe Billing Portal',
        redirectUrl: null // Will open Stripe portal
      };
    } else {
      return {
        canManage: false,
        reason: 'This subscription was purchased on the web. Please manage it from the web app or desktop browser.',
        redirectUrl: 'https://app.thepepplanner.com/app/account/subscription'
      };
    }
  }

  if (subPlatform === 'googleplay') {
    if (currentPlatform === 'android') {
      return {
        canManage: true,
        reason: 'Manage via Google Play Store',
        redirectUrl: 'https://play.google.com/store/account/subscriptions'
      };
    } else {
      return {
        canManage: false,
        reason: 'This subscription was purchased through Google Play. Please manage it from your Android device or Google Play Store.',
        redirectUrl: 'https://play.google.com/store/account/subscriptions'
      };
    }
  }

  if (subPlatform === 'apple') {
    if (currentPlatform === 'ios') {
      return {
        canManage: true,
        reason: 'Manage via App Store',
        redirectUrl: 'https://apps.apple.com/account/subscriptions'
      };
    } else {
      return {
        canManage: false,
        reason: 'This subscription was purchased through the App Store. Please manage it from your iOS device.',
        redirectUrl: 'https://apps.apple.com/account/subscriptions'
      };
    }
  }

  return {
    canManage: false,
    reason: 'Unable to determine subscription platform.',
    redirectUrl: null
  };
}

/**
 * Detect current platform
 * @returns {string} 'web' | 'android' | 'ios'
 */
export function detectCurrentPlatform() {
  // Check for Capacitor (mobile)
  if (window.Capacitor) {
    const platform = window.Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }

  // Check user agent as fallback
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }
  
  return 'web';
}

/**
 * Get platform-specific billing management instructions
 * @param {Object} subscription - Subscription object
 * @returns {Object} Instructions for managing billing
 */
export function getBillingManagementInstructions(subscription) {
  const platform = getSubscriptionPlatform(subscription);
  const currentPlatform = detectCurrentPlatform();
  const canManage = canManageBillingOnPlatform(subscription, currentPlatform);

  return {
    platform,
    platformDisplay: getPlatformDisplayName(platform),
    currentPlatform,
    ...canManage,
    instructions: getDetailedInstructions(platform, currentPlatform)
  };
}

/**
 * Get detailed instructions for billing management
 * @param {string} subPlatform - Subscription platform
 * @param {string} currentPlatform - Current platform
 * @returns {string[]} Array of instruction steps
 */
function getDetailedInstructions(subPlatform, currentPlatform) {
  if (subPlatform === 'stripe' && currentPlatform === 'web') {
    return [
      'Click "Manage Billing" to open the Stripe Customer Portal',
      'View your subscription details and payment history',
      'Update your payment method or cancel subscription'
    ];
  }

  if (subPlatform === 'stripe' && currentPlatform !== 'web') {
    return [
      'Open the web app in a desktop browser',
      'Navigate to Account > Research Subscription',
      'Click "Manage Billing" to access Stripe portal'
    ];
  }

  if (subPlatform === 'googleplay' && currentPlatform === 'android') {
    return [
      'Open Google Play Store on your Android device',
      'Tap your profile icon > Payments & subscriptions > Subscriptions',
      'Find "The Pep Planner" and manage your subscription'
    ];
  }

  if (subPlatform === 'googleplay' && currentPlatform !== 'android') {
    return [
      'Visit play.google.com/store/account/subscriptions',
      'Sign in with the Google account used for purchase',
      'Find "The Pep Planner" and manage your subscription'
    ];
  }

  if (subPlatform === 'apple' && currentPlatform === 'ios') {
    return [
      'Open Settings on your iOS device',
      'Tap your name at the top',
      'Tap "Subscriptions" and find "The Pep Planner"'
    ];
  }

  if (subPlatform === 'apple' && currentPlatform !== 'ios') {
    return [
      'Visit appleid.apple.com',
      'Sign in with your Apple ID',
      'Go to Subscriptions and find "The Pep Planner"'
    ];
  }

  if (subPlatform === 'admin') {
    return [
      'Your subscription was granted by an administrator',
      'Contact support if you have questions about your access'
    ];
  }

  return [
    'Unable to determine subscription platform',
    'Please contact support for assistance'
  ];
}

/**
 * Check if subscription status is synced across all platforms
 * This should be called to verify subscription integrity
 * @param {Object} subscription - Subscription object
 * @returns {Object} Sync status information
 */
export function checkSubscriptionSync(subscription) {
  if (!subscription) {
    return {
      isSynced: false,
      issues: ['No subscription found']
    };
  }

  const issues = [];
  const platform = getSubscriptionPlatform(subscription);

  // Check for required fields based on platform
  if (platform === 'stripe') {
    if (!subscription.stripeCustomerId) {
      issues.push('Missing Stripe customer ID');
    }
    if (subscription.status === 'active' && !subscription.currentPeriodEnd) {
      issues.push('Missing subscription period end date');
    }
  }

  if (platform === 'googleplay') {
    if (!subscription.googlePlayPurchaseToken) {
      issues.push('Missing Google Play purchase token');
    }
  }

  if (platform === 'apple') {
    if (!subscription.appleTransactionId) {
      issues.push('Missing Apple transaction ID');
    }
  }

  // Check for status consistency
  if (subscription.status === 'active') {
    if (subscription.currentPeriodEnd) {
      const endDate = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      if (endDate < now && subscription.interval !== 'lifetime') {
        issues.push('Subscription period has ended but status is still active');
      }
    }
  }

  return {
    isSynced: issues.length === 0,
    platform,
    platformDisplay: getPlatformDisplayName(platform),
    issues,
    lastUpdated: subscription.lastUpdated || subscription.statusUpdatedAt
  };
}

export default {
  getSubscriptionPlatform,
  getPlatformDisplayName,
  canManageBillingOnPlatform,
  detectCurrentPlatform,
  getBillingManagementInstructions,
  checkSubscriptionSync
};






