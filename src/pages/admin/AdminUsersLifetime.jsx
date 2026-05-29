import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Medal, Clock, CircleNotch, ArrowsClockwise } from '@phosphor-icons/react';
import { useAdmin } from '../../context/AdminContext';
import LifetimeCodeManager from '../../components/admin/LifetimeCodeManager';
import ManualLifetimeGrant from '../../components/admin/ManualLifetimeGrant';
import LifetimeAccessAudit from '../../components/admin/LifetimeAccessAudit';
import { formatMMDDYYYY } from '../../utils/date';

export default function AdminUsersLifetime() {
  const { theme } = useOutletContext();
  const {
    lifetimeUsers,
    loading,
    loadLifetimeUsers,
    handleCancelPreGrant,
    handleRevokeLifetime,
  } = useAdmin();

  const statusBadge = (user) => {
    const v = (user.status || '').toLowerCase();
    if (v === 'applied') return { label: '✓ Activated', bg: theme.successBg || theme.success + '20', color: theme.success };
    if (user.isPreGrant || v === 'pending') return { label: 'Pending Activation', bg: theme.warningBg || theme.warning + '20', color: theme.warning };
    if (v === 'active') return { label: 'Active', bg: theme.successBg || theme.success + '20', color: theme.success };
    if (v === 'revoked') return { label: 'Revoked', bg: theme.errorBg || theme.error + '20', color: theme.error };
    return { label: (user.status || 'Unknown').replace(/\b\w/g, (c) => c.toUpperCase()), bg: (theme.textLight || '') + '20', color: theme.textLight };
  };

  return (
    <div className="space-y-3">
      <LifetimeCodeManager theme={theme} />
      <ManualLifetimeGrant theme={theme} onUserAdded={loadLifetimeUsers} />
      <LifetimeAccessAudit theme={theme} />

      <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
            Lifetime Access Entries ({lifetimeUsers.length})
          </h2>
          <button
            type="button"
            onClick={loadLifetimeUsers}
            disabled={loading.lifetimeUsers}
            className="p-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: theme.primary + '15', border: `1px solid ${theme.primary}30`, color: theme.primary }}
            title="Refresh"
          >
            <ArrowsClockwise size={16} className={loading.lifetimeUsers ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: theme.textLight }}>
          Includes activated lifetime accounts and pending pre-grants awaiting user signup.
        </p>
        {loading.lifetimeUsers ? (
          <div className="text-center py-10" style={{ color: theme.textLight }}>
            <CircleNotch size={24} className="animate-spin mx-auto mb-2" />
            <p>Loading lifetime users…</p>
          </div>
        ) : lifetimeUsers.length === 0 ? (
          <div
            className="text-center py-10 rounded-lg border border-dashed"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <Medal size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.textLight }} />
            <p className="text-sm mb-2" style={{ color: theme.textLight }}>No lifetime users found in Firestore</p>
            <p className="text-xs" style={{ color: theme.textLight }}>Use the manual grant tool above to add entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b-2" style={{ borderColor: theme.border }}>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme.textLight }}>Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme.textLight }}>Reason</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme.textLight }}>Granted</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme.textLight }}>Status</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: theme.textLight }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lifetimeUsers.map((user, idx) => {
                  const Icon = user.isPreGrant ? Clock : Medal;
                  const iconColor = user.isPreGrant ? theme.warning : theme.success;
                  const badge = statusBadge(user);
                  const grantedDate = user.grantedAt?.toDate
                    ? formatMMDDYYYY(user.grantedAt.toDate())
                    : user.grantedAt ? new Date(user.grantedAt).toLocaleDateString() : 'N/A';
                  return (
                    <tr key={user.id || idx} className="border-b" style={{ borderColor: theme.border }}>
                      <td className="px-3 py-2 text-sm" style={{ color: theme.text }}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: iconColor }} />
                          <span>{user.email}</span>
                        </div>
                        {user.status === 'applied' && user.appliedToUserId && (
                          <span className="text-xs block mt-0.5" style={{ color: theme.textLight }}>
                            → User ID: {user.appliedToUserId.substring(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm" style={{ color: theme.textLight }}>{user.reason || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm whitespace-nowrap" style={{ color: theme.textLight }}>{grantedDate}</td>
                      <td className="px-3 py-2">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {user.isPreGrant ? (
                          user.status === 'applied' ? (
                            <span className="text-xs italic" style={{ color: theme.textLight }}>Already Applied</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCancelPreGrant(user.email)}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ backgroundColor: theme.warning, color: '#fff' }}
                            >
                              Cancel Pre-Grant
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeLifetime(user.userId || user.id, user.email)}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: theme.error, color: '#fff' }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
