import { useState, useCallback } from 'react';

/**
 * Returns [removingIds, startRemove(id, onDone)] — applies tpp-slide-out class
 * then calls onDone after animation duration.
 */
export function useSlideOutRemove(durationMs = 320) {
  const [removingIds, setRemovingIds] = useState(new Set());

  const startRemove = useCallback((id, onDone) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      onDone?.();
    }, durationMs);
  }, [durationMs]);

  const isRemoving = useCallback((id) => removingIds.has(id), [removingIds]);

  return { isRemoving, startRemove };
}
