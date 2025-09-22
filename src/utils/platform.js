import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for The Pep Planner
 */

export const isNative = () => Capacitor.isNativePlatform();
export const isWeb = () => !Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';

export const getPlatform = () => {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
};

/**
 * Get platform-specific app store URL for sharing
 */
export const getAppStoreUrl = () => {
  if (isIOS()) {
    return 'https://apps.apple.com/app/the-pep-planner/YOUR_APP_ID'; // Update after app store submission
  }
  if (isAndroid()) {
    return 'https://play.google.com/store/apps/details?id=com.thepepplanner.app';
  }
  return window.location.origin; // PWA URL
};

/**
 * Platform-specific sharing behavior
 */
export const canNativeShare = () => {
  return isNative() && 'share' in navigator;
};

/**
 * Get platform display name
 */
export const getPlatformDisplayName = () => {
  const platform = getPlatform();
  switch (platform) {
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    default: return 'Web';
  }
};


