import { useEffect, useState } from 'react';
import { getLocalTrackingMode, isSimpleMode, normalizeTrackingMode } from '../utils/trackingMode';

/**
 * Reactive Simple-mode flag for display-only UI.
 * Listens for mode switches so cards can hide advanced fields without deleting data.
 */
export function useIsSimpleMode() {
  const [mode, setMode] = useState(() => getLocalTrackingMode());

  useEffect(() => {
    const onModeChange = (e) => {
      if (e?.detail?.trackingMode) setMode(normalizeTrackingMode(e.detail.trackingMode));
      else setMode(getLocalTrackingMode());
    };
    window.addEventListener('tpp:tracking-mode-changed', onModeChange);
    return () => window.removeEventListener('tpp:tracking-mode-changed', onModeChange);
  }, []);

  return isSimpleMode(mode);
}
