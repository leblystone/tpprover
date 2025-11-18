const RESIZE_EVENTS = ['resize', 'orientationchange'];

const round = (value) => `${Math.max(0, Math.round(value || 0))}px`;

const updateVisualViewportInsets = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const viewport = window.visualViewport;

  if (!viewport) {
    root.style.setProperty('--android-safe-area-top', '0px');
    root.style.setProperty('--android-safe-area-right', '0px');
    root.style.setProperty('--android-safe-area-bottom', '0px');
    root.style.setProperty('--android-safe-area-left', '0px');
    return;
  }

  const top = viewport.offsetTop;
  const left = viewport.offsetLeft;
  const widthGap = window.innerWidth - viewport.width;
  const heightGap = window.innerHeight - viewport.height;

  root.style.setProperty('--android-safe-area-top', round(top));
  root.style.setProperty('--android-safe-area-left', round(left));
  root.style.setProperty('--android-safe-area-right', round(widthGap - left));
  root.style.setProperty('--android-safe-area-bottom', round(heightGap - top));
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






