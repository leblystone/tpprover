import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountDeletionHistory from '../../components/admin/AccountDeletionHistory';
import AccountDeletionRequests from '../../components/admin/AccountDeletionRequests';
import { Clock, History } from 'lucide-react';

export default function AdminSettingsDeletions() {
  const { theme } = useOutletContext();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'history'

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('requests')}
          className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'requests' ? theme.primary : theme.secondary,
            color: activeTab === 'requests' ? '#ffffff' : theme.text,
            border: `1px solid ${activeTab === 'requests' ? theme.primary : theme.border}`
          }}
        >
          <Clock size={16} />
          Pending Requests
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
          style={{
            backgroundColor: activeTab === 'history' ? theme.primary : theme.secondary,
            color: activeTab === 'history' ? '#ffffff' : theme.text,
            border: `1px solid ${activeTab === 'history' ? theme.primary : theme.border}`
          }}
        >
          <History size={16} />
          Deletion History
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'requests' ? (
          <AccountDeletionRequests theme={theme} />
        ) : (
          <AccountDeletionHistory theme={theme} />
        )}
      </div>
    </div>
  );
}
