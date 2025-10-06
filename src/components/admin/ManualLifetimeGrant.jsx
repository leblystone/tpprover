import React, { useState } from 'react';
import { Plus, UserPlus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getUserList, grantLifetimeAccessFirestore, getAllLifetimeUsers } from '../../services/firebase';

export default function ManualLifetimeGrant({ theme, onUserAdded }) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Beta tester');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const handleGrantAccess = async () => {
    if (!email.trim()) {
      setResult({ type: 'error', message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // First, try to find the user by email
      const users = await getUserList();
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        setResult({ 
          type: 'error', 
          message: `User with email "${email}" not found in Firebase. Make sure they have signed up first.` 
        });
        return;
      }

      // Grant lifetime access
      await grantLifetimeAccessFirestore(
        user.uid || user.id,
        user.email,
        reason,
        'admin-manual'
      );

      setResult({ 
        type: 'success', 
        message: `✅ Successfully granted lifetime access to ${user.email}` 
      });

      // Clear form
      setEmail('');
      setReason('Beta tester');

      // Notify parent component to refresh the list
      if (onUserAdded) {
        onUserAdded();
      }

    } catch (error) {
      console.error('Error granting lifetime access:', error);
      setResult({ 
        type: 'error', 
        message: `Failed to grant access: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await getUserList();
      setAllUsers(users);
      setShowUserList(true);
    } catch (error) {
      console.error('Error loading users:', error);
      setResult({ type: 'error', message: 'Failed to load users' });
    }
  };

  const handleSelectUser = (userEmail) => {
    setEmail(userEmail);
    setShowUserList(false);
  };

  return (
    <div className="space-y-6">
      {/* Manual Grant Form */}
      <div className="rounded-lg border p-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
            <UserPlus size={20} style={{ color: theme.primary }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              Grant Lifetime Access
            </h3>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Manually grant lifetime access to a specific user
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              User Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                  focusRingColor: theme.primary
                }}
              />
              <button
                onClick={loadAllUsers}
                className="px-3 py-2 text-sm border rounded-lg hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }}
              >
                Browse Users
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            >
              <option value="Beta tester">Beta tester</option>
              <option value="Founder">Founder</option>
              <option value="Early supporter">Early supporter</option>
              <option value="Special case">Special case</option>
              <option value="Manual grant">Manual grant</option>
            </select>
          </div>

          <button
            onClick={handleGrantAccess}
            disabled={loading || !email.trim()}
            className="w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ 
              backgroundColor: loading ? theme.border : theme.primary, 
              color: theme.textOnPrimary 
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Granting Access...
              </>
            ) : (
              <>
                <Plus size={16} />
                Grant Lifetime Access
              </>
            )}
          </button>

          {result && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {result.type === 'success' ? (
                <CheckCircle size={16} className="text-green-600" />
              ) : (
                <XCircle size={16} className="text-red-600" />
              )}
              <span className={`text-sm ${
                result.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.message}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* User Browser Modal */}
      {showUserList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                Select User ({allUsers.length} total)
              </h3>
              <button
                onClick={() => setShowUserList(false)}
                className="text-gray-500 hover:text-gray-700"
                style={{ color: theme.textLight }}
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {allUsers.length === 0 ? (
                <div className="p-8 text-center" style={{ color: theme.textLight }}>
                  <AlertTriangle size={24} className="mx-auto mb-2" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: theme.border }}>
                  {allUsers.map((user, index) => (
                    <button
                      key={user.uid || user.id || index}
                      onClick={() => handleSelectUser(user.email)}
                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                      style={{ 
                        color: theme.text,
                        hoverBackgroundColor: theme.background
                      }}
                    >
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm opacity-75">
                        {user.displayName || 'No name'} • {user.uid || user.id}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
