/**
 * Subscription state switcher — visible only to the test account.
 * Safe to ship in production; the UID gate makes it invisible to all other users.
 */
import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { getDevOverride, setDevOverride, DEV_STATES, DEV_STATE_META, DEV_TEST_UID } from '../../utils/devSubscriptionOverride';
import { FlaskConical } from 'lucide-react';

export default function DevToolbar() {
  const { firebaseUser } = useFirebase();
  const [current, setCurrent] = useState(() => getDevOverride(firebaseUser?.uid));

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (uid !== DEV_TEST_UID) return;
    const h = () => setCurrent(getDevOverride(uid));
    window.addEventListener('tpp:dev-override-changed', h);
    return () => window.removeEventListener('tpp:dev-override-changed', h);
  }, [firebaseUser?.uid]);

  // Only render for the test account
  if (firebaseUser?.uid !== DEV_TEST_UID) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '74px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 8px',
        borderRadius: '20px',
        backgroundColor: 'rgba(15,15,15,0.92)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        fontFamily: 'system-ui, sans-serif',
        pointerEvents: 'auto',
      }}
    >
      <FlaskConical size={12} color="rgba(255,255,255,0.3)" style={{ marginRight: 2, flexShrink: 0 }} />

      {DEV_STATES.map((state) => {
        const m = DEV_STATE_META[state];
        const active = state === current;
        return (
          <button
            key={state}
            onClick={() => setDevOverride(state)}
            title={m.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: active ? 700 : 400,
              color: active ? '#fff' : 'rgba(255,255,255,0.45)',
              backgroundColor: active ? `${m.dot}30` : 'transparent',
              outline: active ? `1.5px solid ${m.dot}70` : 'none',
              outlineOffset: '-1px',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: active ? m.dot : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
