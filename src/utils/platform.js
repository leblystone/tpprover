import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Platform detection utilities for The Pep Planner
 * Provides cross-platform support for PWA, Android, and iOS
 */

// ============================================================================
// Platform Detection
// ============================================================================

// Cache the native detection result to avoid repeated checks
let _isNativeCache = null;

export const isNative = () => {
  // Return cached result if available
  if (_isNativeCache !== null) {
    return _isNativeCache;
  }

  try {
    const result = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    // Cache the result
    _isNativeCache = result;
    
    console.log('🔍 isNative() first call (cached for session):', {
      result,
      capacitorPlatform: platform,
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href
    });
    
    return result;
  } catch (error) {
    console.log('🔍 isNative() error:', error);
    _isNativeCache = false;
    return false;
  }
};
export const isWeb = () => !Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';

export const getPlatform = () => {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
};

export const getPlatformDisplayName = () => {
  const platform = getPlatform();
  switch (platform) {
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    default: return 'Web';
  }
};

// ============================================================================
// App Store URLs
// ============================================================================

export const getAppStoreUrl = () => {
  if (isIOS()) {
    // TODO: Update with actual App Store ID after iOS app approval
    return 'https://apps.apple.com/app/the-pep-planner/YOUR_APP_ID';
  }
  if (isAndroid()) {
    return 'https://play.google.com/store/apps/details?id=com.thepepplanner.app';
  }
  return window.location.origin; // PWA URL
};

// ============================================================================
// PWA URLs (for payments from mobile apps)
// ============================================================================

export const getPWAUrl = () => {
  return 'https://thepepplanner.web.app'; // Firebase hosting URL
};

export const getPaymentUrl = (plan = 'monthly') => {
  const baseUrl = getPWAUrl();
  return `${baseUrl}/account?upgrade=${plan}&source=${getPlatform()}`;
};

export const getBillingUrl = () => {
  const baseUrl = getPWAUrl();
  return `${baseUrl}/account?tab=billing&source=${getPlatform()}`;
};

// ============================================================================
// Browser Navigation (Mobile → PWA for payments)
// ============================================================================

/**
 * Navigate to PWA for payments
 * Mobile apps: Opens in system browser (avoids 30% app store fees)
 * PWA: Navigates internally
 */
export const navigateToPayment = async (plan = 'monthly') => {
  if (isNative()) {
    const paymentUrl = getPaymentUrl(plan);
    try {
      await Browser.open({ 
        url: paymentUrl,
        presentationStyle: 'popover' // iOS: presents as modal, Android: new activity
      });
    } catch (error) {
      console.error('Failed to open payment browser:', error);
      // Fallback to window.open if Browser plugin fails
      window.open(paymentUrl, '_system');
    }
  } else {
    // Already on PWA, navigate internally
    window.location.href = `/account?upgrade=${plan}`;
  }
};

/**
 * Navigate to PWA for billing management
 * Mobile apps: Opens in system browser
 * PWA: Navigates internally
 */
export const navigateToBilling = async () => {
  if (isNative()) {
    const billingUrl = getBillingUrl();
    try {
      await Browser.open({ 
        url: billingUrl,
        presentationStyle: 'popover'
      });
    } catch (error) {
      console.error('Failed to open billing browser:', error);
      // Fallback to window.open if Browser plugin fails
      window.open(billingUrl, '_system');
    }
  } else {
    // Already on PWA, navigate internally
    window.location.href = '/account?tab=billing';
  }
};

// ============================================================================
// Sharing & Social Features
// ============================================================================

/**
 * Check if native share is available
 */
export const canNativeShare = () => {
  return isNative() && 'share' in navigator;
};

/**
 * Open external URL in system browser
 * Useful for links to vendor websites, support pages, etc.
 */
export const openExternalUrl = async (url) => {
  if (isNative()) {
    try {
      await Browser.open({ url });
    } catch (error) {
      console.error('Failed to open external URL:', error);
      window.open(url, '_system');
    }
  } else {
    window.open(url, '_blank');
  }
};



