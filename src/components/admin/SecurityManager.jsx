import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, Trash2, Ban, UserX, 
  RefreshCw, Search, Clock, Mail, UserCheck, UserX as UserXIcon,
  Settings, Play, Pause, Filter, Info
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { formatMMDDYYYY } from '../../utils/date';
import { isDisposableEmail } from '../../utils/disposableEmailDomains';

export default function SecurityManager({ theme }) {
  const [unverifiedAccounts, setUnverifiedAccounts] = useState([]);
  const [suspiciousAccounts, setSuspiciousAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(false);
  const [autoCleanupDays, setAutoCleanupDays] = useState(30);
  const [stats, setStats] = useState({
    totalUnverified: 0,
    totalSuspicious: 0,
    totalBlocked: 0
  });

  useEffect(() => {
    loadSecurityData();
    loadAutoCleanupSettings();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const functions = getFunctions();
      const getSecurityData = httpsCallable(functions, 'getSecurityData');
      const result = await getSecurityData();
      
      if (result.data.success) {
        setUnverifiedAccounts(result.data.unverifiedAccounts || []);
        setSuspiciousAccounts(result.data.suspiciousAccounts || []);
        setStats({
          totalUnverified: result.data.unverifiedAccounts?.length || 0,
          totalSuspicious: result.data.suspiciousAccounts?.length || 0,
          totalBlocked: result.data.blockedAccounts?.length || 0
        });
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutoCleanupSettings = async () => {
    try {
      const functions = getFunctions();
      const getAutoCleanupSettings = httpsCallable(functions, 'getAutoCleanupSettings');
      const result = await getAutoCleanupSettings();
      
      if (result.data.success) {
        setAutoCleanupEnabled(result.data.enabled || false);
        setAutoCleanupDays(result.data.days || 30);
      }
    } catch (error) {
      console.error('Error loading auto-cleanup settings:', error);
    }
  };

  const handleBlockUser = async (userId, email) => {
    if (!confirm(`Are you sure you want to BLOCK this user?\n\nEmail: ${email}\n\nThis will prevent them from logging in.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const functions = getFunctions();
      const blockUser = httpsCallable(functions, 'blockUser');
      const result = await blockUser({ userId, email });
      
      if (result.data.success) {
        alert('✅ User blocked successfully');
        loadSecurityData();
      } else {
        alert('❌ Failed to block user: ' + (result.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('❌ Error blocking user: ' + (error.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerminateUser = async (userId, email) => {
    if (!confirm(`⚠️ WARNING: This will PERMANENTLY DELETE this user account!\n\nEmail: ${email}\n\nThis action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    if (!confirm('This is your final warning. This will delete the account from Firebase Auth AND Firestore. Continue?')) {
      return;
    }

    setActionLoading(userId);
    try {
      const functions = getFunctions();
      const terminateUser = httpsCallable(functions, 'terminateUser');
      const result = await terminateUser({ userId, email });
      
      if (result.data.success) {
        alert('✅ User account terminated successfully');
        loadSecurityData();
      } else {
        alert('❌ Failed to terminate user: ' + (result.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error terminating user:', error);
      alert('❌ Error terminating user: ' + (error.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAutoCleanup = async () => {
    try {
      const functions = getFunctions();
      const updateAutoCleanupSettings = httpsCallable(functions, 'updateAutoCleanupSettings');
      const result = await updateAutoCleanupSettings({
        enabled: !autoCleanupEnabled,
        days: autoCleanupDays
      });
      
      if (result.data.success) {
        setAutoCleanupEnabled(!autoCleanupEnabled);
        alert(`✅ Auto-cleanup ${!autoCleanupEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Error updating auto-cleanup settings:', error);
      alert('❌ Error updating settings');
    }
  };

  const handleRunCleanup = async () => {
    if (!confirm(`Run cleanup now? This will delete accounts that are:\n- Unverified\n- Inactive for ${autoCleanupDays} days\n- Not lifetime users\n\nContinue?`)) {
      return;
    }

    setActionLoading('cleanup');
    try {
      const functions = getFunctions();
      const runAutoCleanup = httpsCallable(functions, 'runAutoCleanup');
      const result = await runAutoCleanup({ days: autoCleanupDays });
      
      if (result.data.success) {
        alert(`✅ Cleanup complete! Deleted ${result.data.deletedCount || 0} accounts`);
        loadSecurityData();
      } else {
        alert('❌ Cleanup failed: ' + (result.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      alert('❌ Error running cleanup: ' + (error.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const getSuspiciousReason = (account) => {
    const reasons = [];
    if (isDisposableEmail(account.email)) {
      reasons.push('Disposable Email');
    }
    if (!account.emailVerified) {
      reasons.push('Unverified');
    }
    if (!account.lastActive || new Date(account.lastActive?.toDate?.() || account.lastActive) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      reasons.push('Inactive');
    }
    if (account.createdAt) {
      const created = account.createdAt.toDate?.() || new Date(account.createdAt);
      const now = new Date();
      const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 30 && !account.emailVerified) {
        reasons.push('Old & Unverified');
      }
    }
    return reasons.join(', ') || 'Suspicious Pattern';
  };

  const filteredUnverified = unverifiedAccounts.filter(acc => 
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuspicious = suspiciousAccounts.filter(acc => 
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin" size={24} style={{ color: theme.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Unverified Accounts</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.totalUnverified}</p>
            </div>
            <Mail size={24} style={{ color: '#ef4444' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Suspicious Accounts</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.totalSuspicious}</p>
            </div>
            <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Blocked Accounts</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.totalBlocked}</p>
            </div>
            <Ban size={24} style={{ color: '#dc2626' }} />
          </div>
        </div>
      </div>

      {/* Auto-Cleanup Settings */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={20} style={{ color: theme.primary }} />
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Auto-Cleanup Settings</h3>
          </div>
          <button
            onClick={handleToggleAutoCleanup}
            disabled={actionLoading === 'cleanup'}
            className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: autoCleanupEnabled ? theme.primary : theme.border,
              color: autoCleanupEnabled ? theme.textOnPrimary : theme.text
            }}
          >
            {autoCleanupEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm" style={{ color: theme.textLight }}>
              Delete accounts after <strong>{autoCleanupDays}</strong> days of inactivity (if unverified)
            </label>
            <input
              type="number"
              min="7"
              max="365"
              value={autoCleanupDays}
              onChange={(e) => setAutoCleanupDays(parseInt(e.target.value) || 30)}
              className="w-20 px-2 py-1 rounded border text-sm"
              style={{ borderColor: theme.border, backgroundColor: theme.background }}
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs" style={{ color: theme.textLight }}>
            <Info size={14} />
            <span>Auto-cleanup will delete accounts that are unverified, inactive, and not lifetime users</span>
          </div>
          
          <button
            onClick={handleRunCleanup}
            disabled={actionLoading === 'cleanup'}
            className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            {actionLoading === 'cleanup' ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Running...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Cleanup Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search size={20} style={{ color: theme.textLight }} />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
        />
      </div>

      {/* Unverified Accounts */}
      <div className="rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <Mail size={20} style={{ color: '#ef4444' }} />
            Unverified Accounts ({filteredUnverified.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: theme.background }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Last Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnverified.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-sm" style={{ color: theme.textLight }}>
                    No unverified accounts found
                  </td>
                </tr>
              ) : (
                filteredUnverified.map(account => (
                  <tr key={account.uid} className="border-b" style={{ borderColor: theme.border }}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: theme.text }}>{account.email}</div>
                      {isDisposableEmail(account.email) && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 mt-1 inline-block">
                          Disposable Email
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                      {account.createdAt?.toDate ? formatMMDDYYYY(account.createdAt.toDate()) : 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                      {account.lastActive?.toDate ? formatMMDDYYYY(account.lastActive.toDate()) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBlockUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                        >
                          {actionLoading === account.uid ? '...' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleTerminateUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#dc2626', color: '#fff' }}
                        >
                          {actionLoading === account.uid ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspicious Accounts */}
      <div className="rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            Suspicious Accounts ({filteredSuspicious.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: theme.background }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuspicious.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-sm" style={{ color: theme.textLight }}>
                    No suspicious accounts found
                  </td>
                </tr>
              ) : (
                filteredSuspicious.map(account => (
                  <tr key={account.uid} className="border-b" style={{ borderColor: theme.border }}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: theme.text }}>{account.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        {getSuspiciousReason(account)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                      {account.createdAt?.toDate ? formatMMDDYYYY(account.createdAt.toDate()) : 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBlockUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                        >
                          {actionLoading === account.uid ? '...' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleTerminateUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#dc2626', color: '#fff' }}
                        >
                          {actionLoading === account.uid ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

