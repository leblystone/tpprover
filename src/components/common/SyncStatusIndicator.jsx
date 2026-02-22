/**
 * Minimal sync status for the Topbar: Synced / Syncing / Offline / Error (retry).
 * Uses existing sync queue and dirty flag; no jargon in labels.
 */
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { subscribeSyncQueue, getSyncQueueStatus } from '../../utils/syncQueue';
import ModernTooltip from '../ui/ModernTooltip';

const SYNC_PENDING_KEY = 'tpprover_sync_pending';

function useSyncStatus() {
  const [queueStatus, setQueueStatus] = useState(getSyncQueueStatus());
  const [syncPending, setSyncPending] = useState(() => !!localStorage.getItem(SYNC_PENDING_KEY));
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const unsub = subscribeSyncQueue(setQueueStatus);
    return unsub;
  }, []);

  useEffect(() => {
    const checkPending = () => setSyncPending(!!localStorage.getItem(SYNC_PENDING_KEY));
    checkPending();
    window.addEventListener('storage', checkPending);
    window.addEventListener('tpp:sync-complete', checkPending);
    const interval = setInterval(checkPending, 2000);
    return () => {
      window.removeEventListener('storage', checkPending);
      window.removeEventListener('tpp:sync-complete', checkPending);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const processing = queueStatus.processing || (queueStatus.queueLength || 0) > 0;
  const hasError = syncPending && !processing;

  let status;
  let label;
  let icon;
  let showRetry = false;

  if (!online) {
    status = 'offline';
    label = 'Offline – will sync when back';
    icon = <CloudOff className="h-3.5 w-3.5" />;
  } else if (hasError) {
    status = 'error';
    label = 'Something went wrong – tap to retry';
    icon = <AlertCircle className="h-3.5 w-3.5" />;
    showRetry = true;
  } else if (processing) {
    status = 'syncing';
    label = 'Syncing…';
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  } else {
    status = 'synced';
    label = 'Saved';
    icon = <Cloud className="h-3.5 w-3.5" />;
  }

  return { status, label, icon, showRetry };
}

function handleRetry() {
  window.dispatchEvent(new CustomEvent('tpp:retry-sync'));
}

export default function SyncStatusIndicator({ theme }) {
  const { status, label, icon, showRetry } = useSyncStatus();

  const button = (
    <button
      type="button"
      onClick={showRetry ? handleRetry : undefined}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
        transition-colors touch-manipulation
        ${showRetry ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}
      `}
      style={{
        backgroundColor:
          status === 'error'
            ? (theme?.error || '#ef4444') + '20'
            : status === 'offline'
              ? (theme?.text || '#374151') + '15'
              : status === 'syncing'
                ? (theme?.primary || '#6366F1') + '20'
                : (theme?.primary || '#6366F1') + '15',
        color:
          status === 'error'
            ? theme?.error || '#ef4444'
            : status === 'offline'
              ? theme?.text || '#374151'
              : theme?.primary || '#6366F1',
      }}
      aria-label={label}
    >
      {icon}
      <span className="whitespace-nowrap hidden sm:inline">{showRetry ? 'Tap to retry' : status === 'syncing' ? 'Syncing…' : status === 'offline' ? 'Offline' : 'Saved'}</span>
      {showRetry && <RefreshCw className="h-3 w-3 hidden sm:inline" />}
    </button>
  );

  return (
    <ModernTooltip content={label} side="bottom">
      <div className="mr-2 flex items-center">{button}</div>
    </ModernTooltip>
  );
}
