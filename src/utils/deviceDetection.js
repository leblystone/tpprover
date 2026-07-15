/**
 * Device Detection Utility
 * Detects device type (mobile/tablet/desktop) and mobile OS from user-agent string
 */

import { Capacitor } from '@capacitor/core';

/**
 * Parse user-agent string to detect device information
 * @param {string} userAgent - Navigator user agent string
 * @returns {Object} - Device information
 */
export function detectDevice(userAgent = navigator.userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  let deviceType = 'desktop';
  if (isTablet) {
    deviceType = 'tablet';
  } else if (isMobile) {
    deviceType = 'mobile';
  }
  
  // Detect mobile OS (only relevant for mobile/tablet)
  let mobileOS = null;
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    if (/iphone|ipad|ipod/i.test(ua)) {
      mobileOS = 'iOS';
    } else if (/android/i.test(ua)) {
      mobileOS = 'Android';
    } else {
      mobileOS = 'Other';
    }
  }
  
  // Detect browser
  let browser = 'Other';
  if (/firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/chrome|chromium|crios/i.test(ua) && !/edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua)) {
    browser = 'Safari';
  } else if (/edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
    browser = 'Opera';
  }
  
  return {
    deviceType,      // 'mobile' | 'tablet' | 'desktop'
    mobileOS,        // 'iOS' | 'Android' | 'Other' | null
    browser,         // 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera' | 'Other'
    userAgent        // Full user agent string
  };
}

/**
 * Get device info for current user (includes native vs web for admin billing channel).
 * @returns {Object} - Current device information
 */
export function getCurrentDeviceInfo() {
  const base = detectDevice(typeof navigator !== 'undefined' ? navigator.userAgent : '');

  let isNativePlatform = false;
  let platform = 'web';
  try {
    isNativePlatform = Capacitor.isNativePlatform();
    platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  } catch (_) {
    isNativePlatform = false;
    platform = 'web';
  }

  // Capacitor native iOS/Android UA can look like Safari/Chrome — pin OS from platform
  let { deviceType, mobileOS } = base;
  if (isNativePlatform && platform === 'ios') {
    mobileOS = 'iOS';
    if (deviceType === 'desktop') deviceType = 'mobile';
  } else if (isNativePlatform && platform === 'android') {
    mobileOS = 'Android';
    if (deviceType === 'desktop') deviceType = 'mobile';
  }

  return {
    ...base,
    deviceType,
    mobileOS,
    isNative: isNativePlatform,
    platform,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate device breakdown statistics from user array
 * @param {Array} users - Array of user objects with deviceInfo field
 * @returns {Object} - Device breakdown statistics
 */
export function calculateDeviceBreakdown(users) {
  const breakdown = {
    total: users.length,
    mobile: {
      count: 0,
      percentage: 0,
      byOS: {
        iOS: 0,
        Android: 0,
        Other: 0
      }
    },
    tablet: {
      count: 0,
      percentage: 0
    },
    desktop: {
      count: 0,
      percentage: 0
    },
    browsers: {}
  };
  
  if (users.length === 0) {
    return breakdown;
  }
  
  users.forEach(user => {
    const deviceInfo = user.deviceInfo || {};
    const deviceType = deviceInfo.deviceType || 'desktop';
    const mobileOS = deviceInfo.mobileOS;
    const browser = deviceInfo.browser || 'Other';
    
    // Count by device type
    if (deviceType === 'mobile') {
      breakdown.mobile.count++;
      if (mobileOS) {
        breakdown.mobile.byOS[mobileOS] = (breakdown.mobile.byOS[mobileOS] || 0) + 1;
      }
    } else if (deviceType === 'tablet') {
      breakdown.tablet.count++;
    } else {
      breakdown.desktop.count++;
    }
    
    // Count browsers
    breakdown.browsers[browser] = (breakdown.browsers[browser] || 0) + 1;
  });
  
  // Calculate percentages
  breakdown.mobile.percentage = Math.round((breakdown.mobile.count / users.length) * 100);
  breakdown.tablet.percentage = Math.round((breakdown.tablet.count / users.length) * 100);
  breakdown.desktop.percentage = Math.round((breakdown.desktop.count / users.length) * 100);
  
  return breakdown;
}

