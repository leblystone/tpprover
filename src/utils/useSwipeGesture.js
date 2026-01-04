/**
 * useSwipeGesture Hook - Detect swipe gestures on touch devices
 * 
 * Usage:
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   onSwipeUp: () => console.log('Swiped up'),
 *   onSwipeDown: () => console.log('Swiped down'),
 *   minSwipeDistance: 50,
 *   maxSwipeTime: 300
 * });
 * 
 * <div {...swipeHandlers}>Swipeable content</div>
 */

import { useRef, useCallback } from 'react';
import { hapticsLight } from './haptics';

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 50,
  maxSwipeTime = 300,
  preventDefaultTouchMove = false
} = {}) {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const touchTime = useRef(null);

  const onTouchStart = useCallback((e) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    touchTime.current = Date.now();
  }, []);

  const onTouchMove = useCallback((e) => {
    touchEnd.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    if (preventDefaultTouchMove) {
      e.preventDefault();
    }
  }, [preventDefaultTouchMove]);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;
    const deltaTime = Date.now() - touchTime.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if swipe was fast enough
    if (deltaTime > maxSwipeTime) return;

    // Determine primary direction
    const isHorizontal = absDeltaX > absDeltaY;

    if (isHorizontal && absDeltaX > minSwipeDistance) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swiped left
        if (onSwipeLeft) {
          hapticsLight();
          onSwipeLeft();
        }
      } else {
        // Swiped right
        if (onSwipeRight) {
          hapticsLight();
          onSwipeRight();
        }
      }
    } else if (!isHorizontal && absDeltaY > minSwipeDistance) {
      // Vertical swipe
      if (deltaY > 0) {
        // Swiped up
        if (onSwipeUp) {
          hapticsLight();
          onSwipeUp();
        }
      } else {
        // Swiped down
        if (onSwipeDown) {
          hapticsLight();
          onSwipeDown();
        }
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
    touchTime.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, minSwipeDistance, maxSwipeTime]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}

/**
 * useHorizontalSwipe Hook - Simplified hook for horizontal swipes only
 * Perfect for calendar navigation, image galleries, etc.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  maxSwipeTime = 300
} = {}) {
  return useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance,
    maxSwipeTime,
    preventDefaultTouchMove: false
  });
}

/**
 * useVerticalSwipe Hook - Simplified hook for vertical swipes only
 * Perfect for pull-to-refresh, dismissible cards, etc.
 */
export function useVerticalSwipe({
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 50,
  maxSwipeTime = 300
} = {}) {
  return useSwipeGesture({
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance,
    maxSwipeTime,
    preventDefaultTouchMove: false
  });
}

export default useSwipeGesture;


