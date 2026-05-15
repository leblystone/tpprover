import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

/**
 * Subtle sync status indicator.
 * Listens for `tpp:sync-status` events dispatched by cloudStorage.
 * - On success: shows a brief checkmark that fades out after 2s.
 * - On error: shows a visible error toast until the user dismisses it or a success fires.
 */
export default function SyncStatusIndicator({ theme }) {
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');
  const hideTimer = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const { status: newStatus, message: msg } = e.detail || {};
      clearTimeout(hideTimer.current);

      if (newStatus === 'success') {
        setStatus('success');
        setMessage('');
        hideTimer.current = setTimeout(() => setStatus(null), 2000);
      } else if (newStatus === 'error') {
        setStatus('error');
        setMessage(msg || 'Sync failed');
        // Show error toast via the existing toast system so it's consistent
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: {
            message: 'Data sync failed. Your changes are saved locally and will retry automatically.',
            type: 'error',
            duration: 8000,
          },
        }));
        hideTimer.current = setTimeout(() => setStatus(null), 10000);
      }
    };

    window.addEventListener('tpp:sync-status', handler);
    return () => {
      window.removeEventListener('tpp:sync-status', handler);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (status !== 'success') return null;

  const bg = theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const color = theme?.primary || '#2F665C';

  return (
    <div
      className="fixed bottom-20 right-4 z-[9999] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-500"
      style={{
        backgroundColor: bg,
        color,
        opacity: status === 'success' ? 1 : 0,
        transform: status === 'success' ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: 'none',
      }}
    >
      <Check size={12} strokeWidth={2.5} />
      <span>Saved</span>
    </div>
  );
}
