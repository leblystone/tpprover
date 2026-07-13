import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

/** Live count of shop orders awaiting fulfillment (status `pending`). */
export function usePendingOrderCount(enabled = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const unsub = onSnapshot(
      collection(db, 'physicalOrders'),
      (snap) => {
        let next = 0;
        snap.forEach((docSnap) => {
          const status = (docSnap.data().status || 'pending').toLowerCase();
          if (status === 'pending') next += 1;
        });
        setCount(next);
      },
      (err) => {
        console.warn('[usePendingOrderCount] listener failed:', err);
        setCount(0);
      }
    );

    return unsub;
  }, [enabled]);

  return count;
}
