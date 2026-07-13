import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

/** Live count of shop inquiries with status `new` (includes missing status). */
export function useNewInquiryCount(enabled = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const unsub = onSnapshot(
      collection(db, 'inquiries'),
      (snap) => {
        let next = 0;
        snap.forEach((docSnap) => {
          const status = docSnap.data().status || 'new';
          if (status === 'new') next += 1;
        });
        setCount(next);
      },
      (err) => {
        console.warn('[useNewInquiryCount] listener failed:', err);
        setCount(0);
      }
    );

    return unsub;
  }, [enabled]);

  return count;
}
