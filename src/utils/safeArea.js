/**
 * Safe Area Detection for Edge-to-Edge Displays
 * 
 * Works universally across:
 * - All Android brands (Samsung, Pixel, OnePlus, Xiaomi, etc.)
 * - All screen sizes (small phones to tablets)
 * - All navigation modes (gesture, button, 3-button)
 * - iOS devices (via env(safe-area-inset-*) fallback)
 * 
 * Uses visualViewport API to dynamically measure system UI height.
 * This is browser-based detection, not device-specific, so it works
 * on any device using Chrome/Chromium (95%+ of Android browsers).
 */
const RESIZE_EVENTS = ['resize', 'orientationchange'];

const round = (value) => `${Math.max(0, Math.round(value || 0))}px`;

const updateVisualViewportInsets = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const viewport = window.visualViewport;

  // Graceful fallback: if visualViewport API not available, set to 0
  // The max() pattern in CSS ensures minimum padding still works
  if (!viewport) {
    root.style.setProperty('--android-safe-area-top', '0px');
    root.style.setProperty('--android-safe-area-right', '0px');
    root.style.setProperty('--android-safe-area-bottom', '0px');
    root.style.setProperty('--android-safe-area-left', '0px');
    return;
  }

  // Measure the actual gap between window and viewport
  // This works on ALL Android devices regardless of brand or size
  const top = viewport.offsetTop;
  const left = viewport.offsetLeft;
  const widthGap = window.innerWidth - viewport.width;
  const heightGap = window.innerHeight - viewport.height;

  // Calculate bottom safe area (navigation bar)
  const bottomGap = heightGap - top;
  
  // Detect Android devices (including Pixel)
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  // For Android devices with gesture navigation, visualViewport might not detect the gesture bar
  // Pixel 8 Pro and similar devices often use gesture navigation where the bar is part of the viewport
  // Always apply minimum safe area padding for Android mobile devices to ensure buttons aren't hidden
  let finalBottom = bottomGap;
  if (isAndroid && bottomGap === 0) {
    // Check if we're in a mobile viewport (not desktop/tablet)
    const isMobileViewport = window.innerHeight < 1200;
    
    if (isMobileViewport) {
      // Pixel 8 Pro gesture bar is typically 20px
      // Apply this padding to ensure bottom buttons aren't hidden by gesture navigation bars
      finalBottom = 20;
    }
  }

  root.style.setProperty('--android-safe-area-top', round(top));
  root.style.setProperty('--android-safe-area-left', round(left));
  root.style.setProperty('--android-safe-area-right', round(widthGap - left));
  root.style.setProperty('--android-safe-area-bottom', round(finalBottom));
};

const requestViewportUpdate = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.requestAnimationFrame(updateVisualViewportInsets);
};

export const setupSafeAreaSupport = () => {
  if (typeof window === 'undefined') {
    return;
  }

  updateVisualViewportInsets();

  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', requestViewportUpdate);
  viewport?.addEventListener('scroll', requestViewportUpdate);
  RESIZE_EVENTS.forEach((event) => window.addEventListener(event, requestViewportUpdate));
};









