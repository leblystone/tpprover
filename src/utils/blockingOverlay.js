/**
 * Tracks full-screen auto-popups / modals so one-time spotlights
 * can wait until the UI is clear before appearing.
 *
 * Depth-based so nested modals stay blocked until the last one closes.
 */

let depth = 0;
const listeners = new Set();

function notify() {
  const active = depth > 0;
  listeners.forEach((cb) => {
    try {
      cb(active, depth);
    } catch {
      /* ignore listener errors */
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tpp:blocking-overlay-change', {
        detail: { active, depth },
      })
    );
  }
}

/** Call when a blocking modal/auto-popup becomes visible. */
export function beginBlockingOverlay() {
  depth += 1;
  if (depth === 1 && typeof window !== 'undefined') {
    // Keep existing tooltip listeners working
    window.dispatchEvent(new CustomEvent('tpp:modal-open'));
  }
  notify();
}

/** Call when that modal/auto-popup is dismissed or unmounted. */
export function endBlockingOverlay() {
  if (depth <= 0) return;
  depth -= 1;
  if (depth === 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tpp:modal-close'));
  }
  notify();
}

export function isBlockingOverlayActive() {
  return depth > 0;
}

/** Subscribe to overlay open/close. Returns unsubscribe. */
export function subscribeBlockingOverlay(callback) {
  if (typeof callback !== 'function') return () => {};
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
