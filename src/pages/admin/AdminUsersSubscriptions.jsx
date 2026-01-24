import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Key, Clock, CheckCircle, Eye, Info } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import UserTable from '../../components/admin/UserTable';

export default function AdminUsersSubscriptions() {
  const { theme } = useOutletContext();
  const { users, subscriptions, handleOpenUserModal } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>All Users</h2>
        <input
          type="text"
          placeholder="Search users by email or name…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded border mb-2"
          style={{ borderColor: theme.border, backgroundColor: theme.background }}
        />
        <UserTable users={users} searchTerm={searchTerm} theme={theme} onViewUser={handleOpenUserModal} />
      </div>

      <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>Recent Registrations</h2>
        <div className="space-y-3">
          {subscriptions.recentRegistrations?.length === 0 ? (
            <p className="text-center py-2 text-sm" style={{ color: theme.textLight }}>No recent registrations</p>
          ) : (
            (subscriptions.recentRegistrations || []).map((reg, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.background }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.success + '20' }}>
                    <Users size={16} style={{ color: theme.success }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.text }}>{reg.email}</div>
                    <div className="text-xs" style={{ color: theme.textLight }}>Registered {reg.date}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>User Activity Details</h2>
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
            Limited Tracking
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-3">
            <h3 className="font-medium text-sm" style={{ color: theme.text }}>Currently Tracked</h3>
            {[
              { label: 'Registration Date', icon: Users, available: true },
              { label: 'Last Login Time', icon: Clock, available: true },
              { label: 'Invite Code Used', icon: Key, available: true },
              { label: 'Account Status', icon: CheckCircle, available: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <item.icon size={14} style={{ color: item.available ? theme.success : theme.textLight }} />
                <span style={{ color: item.available ? theme.text : theme.textLight }}>{item.label}</span>
                <div className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-sm" style={{ color: theme.text }}>Not Currently Tracked</h3>
            {[
              { label: 'Page Views', icon: Eye },
              { label: 'Real-time Status', icon: Info },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <item.icon size={14} style={{ color: theme.textLight }} />
                <span style={{ color: theme.textLight }}>{item.label}</span>
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: theme.info + '10' }}>
          <div className="flex items-start gap-3">
            <Info size={16} style={{ color: theme.info }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium" style={{ color: theme.info }}>Enhanced Tracking Available</p>
              <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                Additional analytics can be implemented when needed. Current tracking covers user growth, active users, device types, and feature usage estimates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
