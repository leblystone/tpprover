import React, { useState, useEffect, useRef } from 'react';
import { Check, Cloud, Loader2 } from 'lucide-react';

/**
 * Always-visible sync status for the Topbar (next to account icon).
 * Listens for `tpp:sync-status` events.
 * - saving: circling loader
 * - idle/success: cloud + check (stays visible)
 * - error: toast + brief error state, then back to idle
 */
export default function SyncStatusIndicator({ theme }) {
  const [status, setStatus] = useState('idle'); // 'saving' | 'idle' | 'error'
  const recoverTimer = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const { status: newStatus } = e.detail || {};
      clearTimeout(recoverTimer.current);

      if (newStatus === 'saving' || newStatus === 'syncing') {
        setStatus('saving');
        return;
      }

      if (newStatus === 'success') {
        setStatus('idle');
        return;
      }

      if (newStatus === 'error') {
        setStatus('error');
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: {
            message: 'Data sync failed. Your changes are saved locally and will retry automatically.',
            type: 'error',
            duration: 8000,
          },
        }));
        // Return to cloud-check idle after a beat
        recoverTimer.current = setTimeout(() => setStatus('idle'), 4000);
      }
    };

    window.addEventListener('tpp:sync-status', handler);
    return () => {
      window.removeEventListener('tpp:sync-status', handler);
      clearTimeout(recoverTimer.current);
    };
  }, []);

  const isSaving = status === 'saving';
  const isError = status === 'error';

  // Subtle grey — follow theme secondary text, not brand primary
  const color = isError
    ? (theme?.error || theme?.textLight)
    : (theme?.textLight || (theme?.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'));

  return (
    <div
      className="flex items-center justify-center w-7 h-7 flex-shrink-0"
      style={{ color, opacity: isSaving ? 0.75 : 0.55 }}
      aria-live="polite"
      aria-label={isSaving ? 'Saving' : isError ? 'Sync error' : 'Saved'}
      title={isSaving ? 'Saving…' : isError ? 'Sync issue' : 'Saved'}
    >
      {isSaving ? (
        <Loader2 size={16} strokeWidth={2} className="animate-spin" />
      ) : (
        <span className="relative inline-flex items-center justify-center">
          <Cloud size={16} strokeWidth={2} />
          <Check
            size={9}
            strokeWidth={3}
            className="absolute"
            style={{ bottom: -1, right: -2 }}
          />
        </span>
      )}
    </div>
  );
}
