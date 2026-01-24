import React, { useState, useEffect } from 'react';
import { 
  Trash2, RefreshCw, Search, Calendar, User, Mail, Shield, 
  CreditCard, Filter, Download, AlertTriangle, Info
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, where, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatMMDDYYYY, formatDateTime } from '../../utils/date';

export default function AccountDeletionHistory({ theme }) {
  const [deletions, setDeletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'self_service', 'admin_terminated'
  const [stats, setStats] = useState({
    total: 0,
    selfService: 0,
    adminTerminated: 0,
    withSubscriptions: 0
  });

  useEffect(() => {
    loadDeletions();
  }, [filterType]);

  const loadDeletions = async () => {
    setLoading(true);
    try {
      const deletionsRef = collection(db, 'accountDeletions');
      let q = query(deletionsRef, orderBy('deletedAt', 'desc'), limit(100));
      
      if (filterType !== 'all') {
        q = query(deletionsRef, where('deletionType', '==', filterType), orderBy('deletedAt', 'desc'), limit(100));
      }

      const snapshot = await getDocs(q);
      const deletionData = [];
      
      snapshot.forEach((doc) => {
        deletionData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setDeletions(deletionData);
      
      // Calculate stats
      const total = deletionData.length;
      const selfService = deletionData.filter(d => d.deletionType === 'self_service').length;
      const adminTerminated = deletionData.filter(d => d.deletionType === 'admin_terminated').length;
      const withSubscriptions = deletionData.filter(d => d.subscriptionCancelled).length;

      setStats({
        total,
        selfService,
        adminTerminated,
        withSubscriptions
      });
    } catch (error) {
      console.error('Error loading deletion history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeletions = deletions.filter(deletion => {
    const matchesSearch = 
      deletion.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deletion.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deletion.deletedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Email', 'Name', 'Type', 'Deleted By', 'Subscription Cancelled', 'Stripe Subscription ID'];
    const rows = filteredDeletions.map(d => [
      d.deletedAt?.toDate ? formatDateTime(d.deletedAt.toDate()) : 'Unknown',
      d.userEmail || 'N/A',
      d.userName || 'N/A',
      d.deletionType === 'self_service' ? 'Self Service' : 'Admin Terminated',
      d.deletedBy || 'N/A',
      d.subscriptionCancelled ? 'Yes' : 'No',
      d.stripeSubscriptionId || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-deletions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Total Deletions</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.total}</p>
            </div>
            <Trash2 size={24} style={{ color: '#dc2626' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Self Service</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.selfService}</p>
            </div>
            <User size={24} style={{ color: '#5FAF8B' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Admin Terminated</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.adminTerminated}</p>
            </div>
            <Shield size={24} style={{ color: '#f59e0b' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>With Subscriptions</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.withSubscriptions}</p>
            </div>
            <CreditCard size={24} style={{ color: '#7F9E95' }} />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-start gap-2">
          <Info size={20} style={{ color: theme.primary }} />
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
              Account Deletion History
            </p>
            <p className="text-xs" style={{ color: theme.textLight }}>
              This log tracks all account deletions, including self-service deletions and admin-terminated accounts. 
              Each entry includes the user's email, deletion type, timestamp, and whether subscriptions were cancelled.
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Search size={20} style={{ color: theme.textLight }} />
          <input
            type="text"
            placeholder="Search by email, name, or deleted by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border"
            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={20} style={{ color: theme.textLight }} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-lg border"
            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
          >
            <option value="all">All Types</option>
            <option value="self_service">Self Service</option>
            <option value="admin_terminated">Admin Terminated</option>
          </select>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2 rounded-lg border flex items-center gap-2 transition-all hover:opacity-80"
          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
        >
          <Download size={16} />
          <span className="text-sm">Export CSV</span>
        </button>

        <button
          onClick={loadDeletions}
          className="px-4 py-2 rounded-lg border flex items-center gap-2 transition-all hover:opacity-80"
          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
        >
          <RefreshCw size={16} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Deletions Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: theme.background }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>User Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Deleted By</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: theme.textLight }}>Subscription</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeletions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm" style={{ color: theme.textLight }}>
                    {searchTerm ? 'No deletions found matching your search' : 'No account deletions recorded yet'}
                  </td>
                </tr>
              ) : (
                filteredDeletions.map(deletion => (
                  <tr key={deletion.id} className="border-b" style={{ borderColor: theme.border }}>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: theme.text }}>
                        {deletion.deletedAt?.toDate ? formatDateTime(deletion.deletedAt.toDate()) : 'Unknown'}
                      </div>
                      {deletion.deletedAt?.toDate && (
                        <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                          {formatMMDDYYYY(deletion.deletedAt.toDate())}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: theme.text }}>{deletion.userEmail || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: theme.text }}>{deletion.userName || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ 
                          backgroundColor: deletion.deletionType === 'self_service' ? '#dcfce7' : '#fef3c7',
                          color: deletion.deletionType === 'self_service' ? '#166534' : '#92400e'
                        }}
                      >
                        {deletion.deletionType === 'self_service' ? (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            Self Service
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Shield size={12} />
                            Admin
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: theme.text }}>
                        {deletion.deletedBy === deletion.userId ? (
                          <span className="text-xs" style={{ color: theme.textLight }}>Self</span>
                        ) : (
                          deletion.deletedBy || 'Unknown'
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {deletion.subscriptionCancelled ? (
                        <div className="flex items-center gap-1">
                          <CreditCard size={14} style={{ color: '#dc2626' }} />
                          <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>Cancelled</span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: theme.textLight }}>None</span>
                      )}
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


