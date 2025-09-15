import React, { useState, useEffect } from 'react';
import { grantBetaLifetimeAccess, getBetaAccessStatus } from '../../utils/betaAccess';
import { useAppContext } from '../../context/AppContext';

/**
 * Admin component for managing beta user lifetime access
 */
export default function BetaAccessManager({ theme }) {
  const { user } = useAppContext();
  const [betaStatus, setBetaStatus] = useState(null);
  const [emailToGrant, setEmailToGrant] = useState('');
  const [grantedUsers, setGrantedUsers] = useState([]);

  useEffect(() => {
    if (user) {
      const status = getBetaAccessStatus(user);
      setBetaStatus(status);
    }
    
    // Load granted users list
    loadGrantedUsers();
  }, [user]);

  const loadGrantedUsers = () => {
    try {
      const granted = JSON.parse(localStorage.getItem('tpprover_beta_lifetime_granted') || '[]');
      const completed = JSON.parse(localStorage.getItem('tpprover_beta_feedback_completed') || '[]');
      setGrantedUsers([...new Set([...granted, ...completed])]);
    } catch {
      setGrantedUsers([]);
    }
  };

  const handleGrantAccess = () => {
    if (!emailToGrant.trim()) return;
    
    // Create a mock user object for granting
    const mockUser = { 
      email: emailToGrant.toLowerCase().trim(),
      uid: 'manual_grant_' + Date.now()
    };
    
    const success = grantBetaLifetimeAccess(mockUser, 'Manual admin grant');
    
    if (success) {
      setEmailToGrant('');
      loadGrantedUsers();
    }
  };

  const handleBulkGrant = () => {
    const emails = emailToGrant.split('\n').filter(email => email.trim());
    let granted = 0;
    
    emails.forEach(email => {
      const mockUser = { 
        email: email.toLowerCase().trim(),
        uid: 'bulk_grant_' + Date.now() + '_' + granted
      };
      
      if (grantBetaLifetimeAccess(mockUser, 'Bulk admin grant')) {
        granted++;
      }
    });
    
    alert(`Granted lifetime access to ${granted} users`);
    setEmailToGrant('');
    loadGrantedUsers();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>
          Beta Access Manager
        </h3>
        
        {/* Current user status */}
        {betaStatus && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: theme.secondary }}>
            <h4 className="font-medium mb-2">Your Beta Status:</h4>
            <div className="text-sm space-y-1">
              <div>Has Lifetime Access: <span className={betaStatus.hasLifetimeAccess ? 'text-green-600' : 'text-red-600'}>
                {betaStatus.hasLifetimeAccess ? 'Yes' : 'No'}
              </span></div>
              <div>Active Reasons: {betaStatus.activeReasons.join(', ') || 'None'}</div>
            </div>
          </div>
        )}

        {/* Grant access form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Grant Lifetime Access (Email or multiple emails separated by new lines):
            </label>
            <textarea
              value={emailToGrant}
              onChange={(e) => setEmailToGrant(e.target.value)}
              placeholder="user@example.com&#10;another@example.com"
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border }}
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleGrantAccess}
              className="px-4 py-2 rounded-md font-medium hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Grant Single User
            </button>
            <button
              onClick={handleBulkGrant}
              className="px-4 py-2 rounded-md font-medium hover:opacity-90"
              style={{ backgroundColor: theme.accent, color: theme.textOnPrimary }}
            >
              Bulk Grant Multiple Users
            </button>
          </div>
        </div>

        {/* Granted users list */}
        {grantedUsers.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Users with Lifetime Access ({grantedUsers.length}):</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {grantedUsers.map((user, index) => (
                <div key={index} className="text-sm p-2 rounded" style={{ backgroundColor: theme.secondary }}>
                  {user}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
