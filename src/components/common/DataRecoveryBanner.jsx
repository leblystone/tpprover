import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { useAppContext } from '../../context/AppContext';
import { loadCloudSnapshotList } from '../../services/cloudStorage';
import { reconcileAfterUpdate, needsReconciliation, markReconciliationDone } from '../../utils/postUpdateReconciliation';
import { APP_VERSION } from '../../utils/appVersion';
import { CloudArrowDown, X } from '@phosphor-icons/react';

const TERRACOTTA       = '#c87a5c';
const TERRACOTTA_DARK  = '#b5684a';
const TERRACOTTA_DEEP  = '#a35a3f';

export default function DataRecoveryBanner({ theme }) {
  const [visible, setVisible] = useState(false);
  const [drops, setDrops] = useState([]);
  const navigate = useNavigate();
  const { firebaseUser } = useFirebase();
  // Wait until AppContext has finished loading cloud data into localStorage
  // before comparing counts — prevents a false-positive on fresh install.
  const { isLoading } = useAppContext();

  useEffect(() => {
    if (isLoading) return;
    if (!firebaseUser?.uid) return;
    if (!APP_VERSION || !APP_VERSION.startsWith('2.')) return;
    if (!needsReconciliation()) return;

    let cancelled = false;

    (async () => {
      try {
        const snapshots = await loadCloudSnapshotList(firebaseUser.uid);
        const preV2 = snapshots.find(s => s.reason === 'pre-v2-upgrade');
        if (!preV2 || !preV2.itemCounts) {
          markReconciliationDone();
          return;
        }

        const result = reconcileAfterUpdate(preV2.itemCounts);
        if (!cancelled && result.hasDrops) {
          setDrops(result.drops);
          setVisible(true);
        } else {
          markReconciliationDone();
        }
      } catch {
        markReconciliationDone();
      }
    })();

    return () => { cancelled = true; };
  }, [firebaseUser?.uid, isLoading]);

  if (!visible) return null;

  const entityLabels = {
    protocols: 'Protocols', orders: 'Orders', stockpile: 'Stockpile',
    vendors: 'Vendors', supplements: 'Supplements', reconItems: 'Recon Items',
    reconHistory: 'Recon History', metrics: 'Metrics', scheduledBuys: 'Scheduled Buys',
    injectionHistory: 'Injection History', protocolHistory: 'Protocol History',
    wishlist: 'Wishlist', userNotes: 'Notes', userGoals: 'Goals',
  };

  const isDark = theme?.isDark;
  const bgColor        = isDark ? 'rgba(200,122,92,0.12)' : 'rgba(200,122,92,0.09)';
  const borderColor    = isDark ? 'rgba(200,122,92,0.45)' : 'rgba(200,122,92,0.35)';
  const iconColor      = isDark ? TERRACOTTA : TERRACOTTA_DARK;
  const textColor      = isDark ? '#e8c4b5' : TERRACOTTA_DEEP;
  const subTextColor   = isDark ? 'rgba(232,196,181,0.7)' : 'rgba(163,90,63,0.75)';
  const btnBg          = isDark ? 'rgba(200,122,92,0.2)'  : 'rgba(200,122,92,0.15)';
  const btnBgHover     = isDark ? 'rgba(200,122,92,0.32)' : 'rgba(200,122,92,0.28)';
  const btnColor       = isDark ? '#e8c4b5' : TERRACOTTA_DEEP;

  const dropSummary = drops
    .map(d => `${entityLabels[d.entity] || d.entity}: ${d.before} → ${d.after}`)
    .join(' · ');

  return (
    <div
      className="fixed bottom-20 left-1/2 z-[9999] flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-md"
      style={{
        transform: 'translateX(-50%)',
        maxWidth: '92vw',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <CloudArrowDown size={18} weight="duotone" style={{ color: iconColor, flexShrink: 0 }} />

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-semibold leading-tight whitespace-nowrap" style={{ color: textColor }}>
          Pre-update backup available
        </span>
        {dropSummary && (
          <span className="text-[10px] leading-tight truncate" style={{ color: subTextColor }} title={dropSummary}>
            {dropSummary}
          </span>
        )}
      </div>

      <button
        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
        style={{ backgroundColor: btnBg, color: btnColor }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = btnBgHover; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = btnBg; }}
        onClick={() => {
          markReconciliationDone();
          setVisible(false);
          navigate('/app/settings/data');
        }}
      >
        Restore
      </button>

      <button
        className="p-1 rounded-md opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: textColor }}
        onClick={() => {
          markReconciliationDone();
          setVisible(false);
        }}
        aria-label="Dismiss"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
