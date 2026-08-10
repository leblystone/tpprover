import { useState, useEffect, useRef } from 'react';

/** Keep in sync with `.tpp-spotlight-*-exit` duration in micro-animations.css */
export const SPOTLIGHT_EXIT_MS = 180;

/**
 * Keeps a spotlight portal mounted through its exit animation.
 * @param {boolean} open - desired visibility
 * @returns {{ mounted: boolean, tipClass: string, ovalClass: string }}
 */
export default function useSpotlightTransition(open) {
  const [mounted, setMounted] = useState(() => !!open);
  const [exiting, setExiting] = useState(false);
  const openRef = useRef(!!open);
  openRef.current = !!open;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return undefined;
    }
    if (!mounted) return undefined;
    setExiting(true);
    const t = setTimeout(() => {
      // Only unmount if still closed (re-open during exit cancels via cleanup)
      if (!openRef.current) {
        setMounted(false);
        setExiting(false);
      }
    }, SPOTLIGHT_EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  const tipClass = exiting ? 'tpp-spotlight-tip-exit' : 'tpp-spotlight-tip-enter';
  const ovalClass = exiting ? 'tpp-spotlight-oval-exit' : 'tpp-spotlight-oval-enter';

  return { mounted, tipClass, ovalClass, exiting };
}
