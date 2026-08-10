import { useState, useEffect } from 'react';
import {
  isBlockingOverlayActive,
  subscribeBlockingOverlay,
} from '../utils/blockingOverlay';

/**
 * True when no blocking auto-popup / modal is covering the app.
 * Spotlights should only schedule/show while this is true.
 */
export default function useBlockingOverlayClear() {
  const [clear, setClear] = useState(() => !isBlockingOverlayActive());

  useEffect(() => {
    setClear(!isBlockingOverlayActive());
    return subscribeBlockingOverlay((active) => {
      setClear(!active);
    });
  }, []);

  return clear;
}
