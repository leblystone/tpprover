import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { loadCloudSnapshotList } from '../../services/cloudStorage';
import { reconcileAfterUpdate, needsReconciliation, markReconciliationDone } from '../../utils/postUpdateReconciliation';
import { APP_VERSION } from '../../utils/appVersion';
import { WarningCircle } from '@phosphor-icons/react';

export default function DataRecoveryBanner({ theme }) {
  const [visible, setVisible] = useState(false);
  const [drops, setDrops] = useState([]);
  const navigate = useNavigate();
  const { firebaseUser } = useFirebase();

  useEffect(() => {
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
  }, [firebaseUser?.uid]);

  if (!visible) return null;

  const entityLabels = {
    protocols: 'Protocols', orders: 'Orders', stockpile: 'Stockpile',
    vendors: 'Vendors', supplements: 'Supplements', reconItems: 'Recon Items',
    reconHistory: 'Recon History', metrics: 'Metrics', scheduledBuys: 'Scheduled Buys',
    injectionHistory: 'Injection History', protocolHistory: 'Protocol History',
    wishlist: 'Wishlist', userNotes: 'Notes', userGoals: 'Goals',
  };

  return (
    <div
      className="fixed top-14 left-0 right-0 z-[9999] px-4 py-3 flex items-center gap-3 shadow-lg"
      style={{
        backgroundColor: theme?.isDark ? '#3b2020' : '#fef2f2',
        borderBottom: `2px solid ${theme?.isDark ? '#7f1d1d' : '#fca5a5'}`,
        color: theme?.isDark ? '#fca5a5' : '#991b1b',
      }}
    >
      <WarningCircle size={22} weight="fill" />
      <div className="flex-1 text-sm">
        <span className="font-semibold">Data may have changed after the update.</span>{' '}
        {drops.map(d => `${entityLabels[d.entity] || d.entity}: ${d.before} → ${d.after}`).join(', ')}.
      </div>
      <button
        className="text-xs font-bold px-3 py-1.5 rounded-md whitespace-nowrap"
        style={{
          backgroundColor: theme?.isDark ? '#7f1d1d' : '#fca5a5',
          color: theme?.isDark ? '#fef2f2' : '#7f1d1d',
        }}
        onClick={() => {
          markReconciliationDone();
          setVisible(false);
          navigate('/app/settings/data');
        }}
      >
        Restore Backup
      </button>
      <button
        className="text-xs px-2 py-1 opacity-70 hover:opacity-100"
        onClick={() => {
          markReconciliationDone();
          setVisible(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
