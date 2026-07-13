import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Medal, Clock, CircleNotch, ArrowsClockwise } from '@phosphor-icons/react';
import { useAdmin } from '../../context/AdminContext';
import { formatMMDDYYYY } from '../../utils/date';

export default function AdminUsersLifetime() {
  const { theme, selectedUid, onUserSelect } = useOutletContext();
  const { lifetimeUsers, loading, loadLifetimeUsers, selectUserByUid, selectUserByEmail } = useAdmin();

  const statusBadge = (user) => {
    const v = (user.status || '').toLowerCase();
    if (v === 'applied') return { label: 'Activated', color: theme.success };
    if (user.isPreGrant || v === 'pending') return { label: 'Pending', color: theme.warning };
    if (v === 'active') return { label: 'Active', color: theme.success };
    if (v === 'revoked') return { label: 'Revoked', color: theme.error };
    return { label: user.status || 'Unknown', color: theme.textLight };
  };

  const handleRowClick = (entry) => {
    const uid = entry.appliedToUserId || entry.userId || entry.id;
    if (uid && !entry.isPreGrant) {
      selectUserByUid(uid, { seed: { email: entry.email } });
      onUserSelect?.();
    } else if (entry.email) {
      selectUserByEmail(entry.email);
      onUserSelect?.();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex-shrink-0 p-3 border-b flex items-center justify-between"
        style={{ borderColor: theme.border, backgroundColor: theme.background }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: theme.primaryDark }}>
            Lifetime ({lifetimeUsers.length})
          </h2>
          <p className="text-[10px]" style={{ color: theme.textLight }}>
            Select a row to open account panel. Grant tools are on the right when none selected.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLifetimeUsers}
          disabled={loading.lifetimeUsers}
          className="p-2 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: theme.primary + '15', color: theme.primary }}
          title="Refresh"
        >
          <ArrowsClockwise size={16} className={loading.lifetimeUsers ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading.lifetimeUsers ? (
          <div className="text-center py-10" style={{ color: theme.textLight }}>
            <CircleNotch size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : lifetimeUsers.length === 0 ? (
          <p className="p-4 text-sm text-center" style={{ color: theme.textLight }}>
            No lifetime entries. Use right panel to grant.
          </p>
        ) : (
          lifetimeUsers.map((user, idx) => {
            const Icon = user.isPreGrant ? Clock : Medal;
            const badge = statusBadge(user);
            const uid = user.appliedToUserId || user.userId;
            const isSelected = selectedUid && uid && selectedUid === uid;
            const grantedDate = user.grantedAt?.toDate
              ? formatMMDDYYYY(user.grantedAt.toDate())
              : user.grantedAt
                ? new Date(user.grantedAt).toLocaleDateString()
                : '—';
            return (
              <button
                key={user.id || user.email || idx}
                type="button"
                onClick={() => handleRowClick(user)}
                className="w-full text-left px-3 py-3 border-b"
                style={{
                  borderColor: theme.border,
                  backgroundColor: isSelected ? theme.primary + '12' : 'transparent',
                  borderLeft: isSelected ? `3px solid ${theme.primary}` : '3px solid transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} style={{ color: badge.color }} />
                  <span className="text-sm font-medium truncate flex-1" style={{ color: theme.text }}>
                    {user.email}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: badge.color + '20', color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-[10px] mt-1 truncate" style={{ color: theme.textLight }}>
                  {user.reason || '—'} · {grantedDate}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
