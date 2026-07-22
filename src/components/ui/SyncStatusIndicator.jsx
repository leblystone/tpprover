import React, { useState, useEffect, useRef } from 'react';
import { ArrowsClockwise, CloudCheck } from '@phosphor-icons/react';

/**
 * Always-visible sync status for the Topbar (next to account icon).
 * Listens for `tpp:sync-status` events.
 * - saving: spinning ArrowsClockwise (duotone)
 * - idle/success: CloudCheck (duotone, stays visible)
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

  const color = isError
    ? (theme?.error || theme?.textLight)
    : (theme?.textLight || (theme?.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'));

  return (
    <div
      className="flex items-center justify-center w-7 h-7 flex-shrink-0"
      style={{ color, opacity: isSaving ? 0.85 : 0.7 }}
      aria-live="polite"
      aria-label={isSaving ? 'Saving' : isError ? 'Sync error' : 'Saved'}
      title={isSaving ? 'Saving…' : isError ? 'Sync issue' : 'Saved'}
    >
      {isSaving ? (
        <ArrowsClockwise size={22} weight="duotone" className="animate-spin" aria-hidden />
      ) : (
        <CloudCheck size={22} weight="duotone" aria-hidden />
      )}
    </div>
  );
}
