import React, { useState } from 'react';
import { Loader, Shield, Search, AlertTriangle, Siren } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { elegantPalette } from '../../utils/adminHelpers';

const pal = elegantPalette;

export default function LifetimeAccessAudit({ theme }) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const runAudit = async () => {
    setIsAuditing(true);
    setShowResults(false);
    try {
      const fn = getFunctions();
      const audit = httpsCallable(fn, 'auditLifetimeAccess');
      const res = await audit();
      const findings = res.data?.findings || res.data;
      setAuditResults(findings);
      setShowResults(true);
      const conflicts = findings.conflictingUsers?.length ?? 0;
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: `Audit complete! Found ${conflicts} potential conflicts.`,
          type: conflicts > 0 ? 'warning' : 'success',
        },
      }));
    } catch (err) {
      console.error('Audit failed:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: err.message || 'Audit failed', type: 'error' },
      }));
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={20} style={{ color: theme.warning }} />
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Lifetime Access Audit</h2>
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
              <Loader className="animate-spin" size={14} />
              Auditing…
            </>
          ) : (
            <>
              <Search size={14} />
              Run Audit
            </>
          )}
        </button>
      </div>
      <p className="text-sm mb-2" style={{ color: theme.textLight }}>
        Scan all users to find anyone with lifetime access data who might be showing as &quot;Trialing&quot; in the app. Read-only.
      </p>
      {showResults && auditResults && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
              <div className="text-lg font-bold" style={{ color: pal.gold.metallic }}>{auditResults.totalUsers ?? 0}</div>
              <div className="text-xs" style={{ color: theme.textLight }}>Total Users</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.success + '20' }}>
              <div className="text-lg font-bold" style={{ color: theme.success }}>{auditResults.summary?.totalUsersWithLifetimeAccess ?? 0}</div>
              <div className="text-xs" style={{ color: theme.textLight }}>Have Lifetime Access</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: (auditResults.conflictingUsers?.length > 0 ? theme.warning : theme.success) + '20' }}>
              <div className="text-lg font-bold" style={{ color: auditResults.conflictingUsers?.length > 0 ? theme.warning : theme.success }}>
                {auditResults.conflictingUsers?.length ?? 0}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>Conflicts Found</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
              <div className="text-sm font-bold flex items-center gap-1" style={{ color: theme.text }}>
                {auditResults.summary?.consistencyCheck?.allThreeCollectionsMatch ? (
                  <>✓ Synced</>
                ) : (
                  <>
                    <Siren size={14} />
                    Out of Sync
                  </>
                )}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>Collection Status</div>
            </div>
          </div>
          {auditResults.conflictingUsers?.length > 0 && (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.border }}>
              <div className="p-3 border-b" style={{ backgroundColor: theme.warning + '10', borderColor: theme.border }}>
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: theme.warning }}>
                  <AlertTriangle size={16} />
                  Users with Lifetime Access Conflicts
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                      <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: theme.textLight }}>Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: theme.textLight }}>Conflict Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: theme.textLight }}>Current Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: theme.textLight }}>Granted By</th>
                      <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: theme.textLight }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditResults.conflictingUsers.map((u) => (
                      <tr key={u.userId} className="border-b" style={{ borderColor: theme.border }}>
                        <td className="px-3 py-2 text-sm" style={{ color: theme.text }}>
                          <div className="flex flex-col">
                            <span className="font-medium">{u.email}</span>
                            <span className="text-xs opacity-60">{u.userId?.substring(0, 8)}…</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning, fontWeight: 500 }}>
                            {u.conflictType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm" style={{ color: theme.text }}>{u.currentStatus}</td>
                        <td className="px-3 py-2 text-sm" style={{ color: theme.text }}>{u.grantedBy ?? '—'}</td>
                        <td className="px-3 py-2 text-sm" style={{ color: theme.textLight }}>{u.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
