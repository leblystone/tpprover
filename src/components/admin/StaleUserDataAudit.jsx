import React, { useState } from 'react';
import { CircleNotch, MagnifyingGlass, Warning, HardDrives } from '@phosphor-icons/react';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Admin card: run the Meagan-class stale/empty userData fleet audit.
 * Requires the auditStaleUserData Cloud Function to be deployed.
 */
export default function StaleUserDataAudit({ theme }) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [findings, setFindings] = useState(null);

  const runAudit = async () => {
    setIsAuditing(true);
    setFindings(null);
    try {
      const fn = getFunctions();
      const audit = httpsCallable(fn, 'auditStaleUserData');
      const res = await audit();
      const data = res.data?.findings || res.data;
      setFindings(data);
      const critical = data.counts?.critical ?? 0;
      const high = data.counts?.highPriority ?? 0;
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: `Cloud sync audit: ${critical} critical, ${high} high, ${data.atRisk?.length || 0} flagged total.`,
          type: critical > 0 ? 'warning' : 'success',
        },
      }));
    } catch (err) {
      console.error('Stale userData audit failed:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: err.message || 'Audit failed — is auditStaleUserData deployed?',
          type: 'error',
        },
      }));
    } finally {
      setIsAuditing(false);
    }
  };

  const criticalList = (findings?.atRisk || []).filter((u) => u.priority === 'critical');

  return (
    <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrives size={20} style={{ color: theme.warning }} />
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
            Stale Cloud Sync Audit
          </h2>
        </div>
        <button
          type="button"
          onClick={runAudit}
          disabled={isAuditing}
          className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: theme.warning, color: '#FFF' }}
        >
          {isAuditing ? (
            <>
              <CircleNotch className="animate-spin" size={14} />
              Auditing…
            </>
          ) : (
            <>
              <MagnifyingGlass size={14} />
              Run Audit
            </>
          )}
        </button>
      </div>
      <p className="text-sm mb-2" style={{ color: theme.textLight }}>
        Find users whose Firestore <code>userData</code> is empty/stale while they&apos;re still active —
        the pattern that trapped Meagan on PWA vs native. Read-only.
      </p>

      {findings && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat theme={theme} label="Critical (Meagan-like)" value={findings.counts?.critical ?? 0} warn />
            <Stat theme={theme} label="High" value={findings.counts?.highPriority ?? 0} />
            <Stat theme={theme} label="Empty modern cloud" value={findings.counts?.emptyModernUserData ?? 0} />
            <Stat theme={theme} label="Users scanned" value={findings.totals?.scanned ?? 0} />
          </div>

          {criticalList.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: theme.warning }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: theme.warning }}>
                <Warning size={16} />
                <span className="font-semibold text-sm">Critical — active much more recently than cloud</span>
              </div>
              <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
                {criticalList.map((u) => (
                  <li key={u.userId} style={{ color: theme.text }}>
                    <strong>{u.email}</strong>
                    <span style={{ color: theme.textLight }}>
                      {' '}· active {u.lastActiveDaysAgo ?? '?'}d ago · cloud {u.cloudAgeDays ?? '?'}d old
                    </span>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {u.reasons?.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ theme, label, value, warn }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
      <div className="text-lg font-bold" style={{ color: warn && value > 0 ? theme.warning : theme.primaryDark }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: theme.textLight }}>{label}</div>
    </div>
  );
}
