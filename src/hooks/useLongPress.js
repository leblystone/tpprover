import { useRef, useCallback } from 'react';

/**
 * Fires callback after a sustained press (touch or mouse).
 * Cancels if the pointer moves beyond `moveThreshold` (avoids accidental triggers while scrolling).
 */
export function useLongPress(callback, { delay = 500, moveThreshold = 10 } = {}) {
  const timerRef = useRef(null);
  const startPosRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const onStart = useCallback((e) => {
    // Ignore right-click / multi-touch
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (e.touches && e.touches.length > 1) return;

    const point = e.touches?.[0] || e;
    startPosRef.current = { x: point.clientX, y: point.clientY };

    clear();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callbackRef.current?.();
    }, delay);
  }, [delay, clear]);

  const onMove = useCallback((e) => {
    if (!startPosRef.current || !timerRef.current) return;
    const point = e.touches?.[0] || e;
    const dx = Math.abs(point.clientX - startPosRef.current.x);
    const dy = Math.abs(point.clientY - startPosRef.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      clear();
    }
  }, [moveThreshold, clear]);

  return {
    onMouseDown: onStart,
    onMouseUp: clear,
    onMouseLeave: clear,
    onMouseMove: onMove,
    onTouchStart: onStart,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onTouchMove: onMove,
  };
}

export default useLongPress;
