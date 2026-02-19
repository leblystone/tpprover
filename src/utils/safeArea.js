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
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isCapacitorNative = typeof window.Capacitor !== 'undefined' &&
    window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  if (!viewport) {
    root.style.setProperty('--android-safe-area-top', isCapacitorNative && isAndroid ? '36px' : '0px');
    root.style.setProperty('--android-safe-area-right', '0px');
    root.style.setProperty('--android-safe-area-bottom', '0px');
    root.style.setProperty('--android-safe-area-left', '0px');
    return;
  }

  const left = viewport.offsetLeft;
  const widthGap = window.innerWidth - viewport.width;
  const heightGap = window.innerHeight - viewport.height;

  // visualViewport.offsetTop measures scroll offset, NOT status bar height.
  // For top safe area on Android Capacitor, we rely on StatusBar plugin
  // initialization in App.jsx which sets --android-safe-area-top directly
  // when overlay is detected. Don't overwrite it to 0 here.
  if (!isCapacitorNative || !isAndroid) {
    const top = viewport.offsetTop;
    root.style.setProperty('--android-safe-area-top', round(top));
  }

  const bottomGap = heightGap - viewport.offsetTop;

  let finalBottom = bottomGap;
  if (isAndroid && bottomGap === 0) {
    const isMobileViewport = window.innerHeight < 1200;
    if (isMobileViewport) {
      finalBottom = 20;
    }
  }

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









