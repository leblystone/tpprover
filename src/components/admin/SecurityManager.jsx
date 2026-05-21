import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, Trash2, Ban, UserX, 
  RefreshCw, Search, Clock, Mail, UserCheck, UserX as UserXIcon,
  Settings, Play, Pause, Filter, Info
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { formatMMDDYYYY } from '../../utils/date';

export default function SecurityManager({ theme }) {
  const [unverifiedAccounts, setUnverifiedAccounts] = useState([]);
  const [suspiciousAccounts, setSuspiciousAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnverified, setSelectedUnverified] = useState([]);
  const [selectedSuspicious, setSelectedSuspicious] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUnverified: 0,
    totalSuspicious: 0,
    totalBlocked: 0
  });

  useEffect(() => {
    loadSecurityData();
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

  // Auto-cleanup functions removed - use manual review instead

  const handleBulkDelete = async (accounts, type) => {
    const count = accounts.length;
    if (count === 0) return;
    
    const accountList = accounts.map(uid => {
      const account = [...unverifiedAccounts, ...suspiciousAccounts].find(a => a.uid === uid);
      return account?.email || uid;
    }).join('\n');
    
    if (!confirm(`⚠️ WARNING: You are about to PERMANENTLY DELETE ${count} accounts!\n\nAccounts:\n${accountList}\n\nThis action cannot be undone. Continue?`)) {
      return;
    }
    
    if (!confirm(`Final confirmation: Delete ${count} accounts? This will:\n- Cancel their subscriptions\n- Delete all their data\n- Send goodbye emails\n- Remove from Firebase Auth`)) {
      return;
    }
    
    setBulkActionLoading(true);
    
    try {
      const functions = getFunctions();
      const terminateUser = httpsCallable(functions, 'terminateUser');
      
      let successCount = 0;
      let failCount = 0;
      
      // Process deletions one by one (to avoid overwhelming the system)
      for (const uid of accounts) {
        const account = [...unverifiedAccounts, ...suspiciousAccounts].find(a => a.uid === uid);
        if (!account) continue;
        
        try {
          const result = await terminateUser({ userId: uid, email: account.email });
          if (result.data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Failed to delete ${account.email}:`, error);
          failCount++;
        }
      }
      
      alert(`✅ Bulk deletion complete!\n\n${successCount} deleted successfully\n${failCount} failed`);
      
      // Clear selections and reload
      setSelectedUnverified([]);
      setSelectedSuspicious([]);
      loadSecurityData();
      
    } catch (error) {
      console.error('Bulk deletion error:', error);
      alert('❌ Bulk deletion failed: ' + (error.message || 'Unknown error'));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getSuspiciousReason = (account) => {
    // Reasons are now determined by Cloud Function
    // Just parse what it sent us
    const reasons = [];
    
    if (account.isDisposableEmail) {
      reasons.push('Disposable Email');
    }
    if (!account.emailVerified) {
      reasons.push('Unverified');
    }
    if (account.daysSinceActive && account.daysSinceActive > 90) {
      reasons.push(`Inactive ${Math.floor(account.daysSinceActive)} days`);
    }
    if (account.daysSinceCreation && account.daysSinceCreation > 14 && !account.lastActive) {
      reasons.push('Never Used');
    }
    
    return reasons.join(', ') || account.suspiciousReason || 'Suspicious Pattern';
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
      {/* Purpose Statement Banner */}
      <div 
        className="rounded-lg p-6 border-l-4"
        style={{ 
          borderLeftColor: theme.primary,
          background: theme.cardBackground,
          border: `1px solid ${theme.border}`,
          borderLeft: `4px solid ${theme.primary}`
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="p-3 rounded-lg"
            style={{ background: theme.primary + '20' }}
          >
            <Shield size={28} style={{ color: theme.primary }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2" style={{ color: theme.text }}>
              Account Security & Cleanup
            </h2>
            <p className="text-sm mb-3" style={{ color: theme.textLight }}>
              This tool helps you identify and remove spam accounts, bot signups, and abandoned trials. 
              Use it to keep your user base clean and reduce Firestore storage costs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Ban size={16} style={{ color: '#f59e0b', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: theme.text }}>Block:</strong>{' '}
                  <span style={{ color: theme.textLight }}>Disable login, keep data (reversible)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Trash2 size={16} style={{ color: '#dc2626', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: theme.text }}>Delete:</strong>{' '}
                  <span style={{ color: theme.textLight }}>Permanent removal of all data + subscriptions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Manual Review Notice */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-2 mb-3">
          <Info size={20} style={{ color: theme.primary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Account Management</h3>
        </div>
        <div className="space-y-2 text-sm" style={{ color: theme.textLight }}>
          <p>
            <strong style={{ color: theme.text }}>Manual review is recommended.</strong> Use the auditing system below to identify suspicious accounts.
          </p>
          <p>
            <strong style={{ color: theme.text }}>Delete Action:</strong> The "Delete" button will permanently remove the account, cancel active subscriptions, delete all Firestore data (users, userData, userSubscriptions, userPreferences, userState, lifetimeAccess), send a confirmation email, and delete from Firebase Auth. This action cannot be undone.
          </p>
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
        <div className="p-4 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.border }}>
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <Mail size={20} style={{ color: '#ef4444' }} />
            Unverified Accounts ({filteredUnverified.length})
          </h3>
          {selectedUnverified.length > 0 && (
            <button
              onClick={() => handleBulkDelete(selectedUnverified, 'unverified')}
              disabled={bulkActionLoading}
              className="px-4 py-2.5 rounded text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#dc2626', color: '#fff' }}
            >
              <Trash2 size={16} />
              Delete Selected ({selectedUnverified.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: theme.background }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>
                  <input
                    type="checkbox"
                    checked={filteredUnverified.length > 0 && selectedUnverified.length === filteredUnverified.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUnverified(filteredUnverified.map(a => a.uid));
                      } else {
                        setSelectedUnverified([]);
                      }
                    }}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Account Age</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Last Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnverified.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm" style={{ color: theme.textLight }}>
                    No unverified accounts found
                  </td>
                </tr>
              ) : (
                filteredUnverified.map(account => (
                  <tr key={account.uid} className="border-b" style={{ borderColor: theme.border }}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUnverified.includes(account.uid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUnverified([...selectedUnverified, account.uid]);
                          } else {
                            setSelectedUnverified(selectedUnverified.filter(id => id !== account.uid));
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: theme.text }}>{account.email}</div>
                      {account.isDisposableEmail && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 mt-1 inline-block">
                          Disposable Email
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                      {account.daysSinceCreation !== undefined ? (
                        <span>
                          {account.daysSinceCreation} days
                          {account.daysSinceCreation > 90 && (
                            <span className="ml-1 text-xs text-orange-600">⚠️ Old</span>
                          )}
                        </span>
                      ) : (
                        account.createdAt?.toDate ? formatMMDDYYYY(account.createdAt.toDate()) : 'Unknown'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: theme.textLight }}>
                        {account.lastActive?.toDate ? formatMMDDYYYY(account.lastActive.toDate()) : (
                          <span className="text-red-600 font-medium">Never</span>
                        )}
                      </div>
                      {account.daysSinceActive !== undefined && account.daysSinceActive > 0 && (
                        <div className="text-xs" style={{ color: theme.textLight }}>
                          ({account.daysSinceActive} days ago)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {account.hasSubscription ? (
                        <span className="text-xs px-2 py-1 rounded font-medium" style={{ 
                          background: '#d1fae5', 
                          color: '#065f46',
                          border: '1px solid #a7f3d0'
                        }}>
                          Active Subscriber ⚠️
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBlockUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                          title="Disable login (reversible)"
                        >
                          {actionLoading === account.uid ? '...' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleTerminateUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#dc2626', color: '#fff' }}
                          title="Permanently delete all data"
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
        <div className="p-4 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.border }}>
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            Suspicious Accounts ({filteredSuspicious.length})
          </h3>
          {selectedSuspicious.length > 0 && (
            <button
              onClick={() => handleBulkDelete(selectedSuspicious, 'suspicious')}
              disabled={bulkActionLoading}
              className="px-4 py-2.5 rounded text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#dc2626', color: '#fff' }}
            >
              <Trash2 size={16} />
              Delete Selected ({selectedSuspicious.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: theme.background }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>
                  <input
                    type="checkbox"
                    checked={filteredSuspicious.length > 0 && selectedSuspicious.length === filteredSuspicious.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSuspicious(filteredSuspicious.map(a => a.uid));
                      } else {
                        setSelectedSuspicious([]);
                      }
                    }}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Account Age</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuspicious.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm" style={{ color: theme.textLight }}>
                    No suspicious accounts found
                  </td>
                </tr>
              ) : (
                filteredSuspicious.map(account => (
                  <tr key={account.uid} className="border-b" style={{ borderColor: theme.border }}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSuspicious.includes(account.uid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSuspicious([...selectedSuspicious, account.uid]);
                          } else {
                            setSelectedSuspicious(selectedSuspicious.filter(id => id !== account.uid));
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: theme.text }}>{account.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                        {getSuspiciousReason(account)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                      {account.daysSinceCreation !== undefined ? (
                        <span>
                          {account.daysSinceCreation} days
                          {account.daysSinceCreation > 90 && (
                            <span className="ml-1 text-xs text-orange-600">⚠️ Old</span>
                          )}
                        </span>
                      ) : (
                        account.createdAt?.toDate ? formatMMDDYYYY(account.createdAt.toDate()) : 'Unknown'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {account.hasSubscription ? (
                        <span className="text-xs px-2 py-1 rounded font-medium" style={{ 
                          background: '#d1fae5', 
                          color: '#065f46',
                          border: '1px solid #a7f3d0'
                        }}>
                          Active Subscriber ⚠️
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBlockUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                          title="Disable login (reversible)"
                        >
                          {actionLoading === account.uid ? '...' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleTerminateUser(account.uid, account.email)}
                          disabled={actionLoading === account.uid}
                          className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                          style={{ backgroundColor: '#dc2626', color: '#fff' }}
                          title="Permanently delete all data"
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

