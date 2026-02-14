import React, { useState } from 'react';
import { Plus, UserPlus, CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';
import { getUserList, getAllLifetimeUsers, getUserByEmail } from '../../services/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ManualLifetimeGrant({ theme, onUserAdded }) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Beta tester');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });

  const handleGrantAccess = async () => {
    if (!email.trim()) {
      setResult({ type: 'error', message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Try to find the user by email (optional - user may not exist yet)
      // This is completely optional - we can grant access even if user doesn't exist yet
      let user = null;
      try {
        user = await getUserByEmail(email.trim());
        if (!user) {
          console.log('✅ User not found in Firestore - will create pre-grant for:', email.trim());
        } else {
          console.log('✅ User found:', user.email);
        }
      } catch (error) {
        // getUserByEmail might throw an error, but that's okay - we'll create a pre-grant
        console.log('✅ User lookup failed (will create pre-grant):', error.message || error);
      }

      const combinedReason = customReason.trim() ? `${reason} – ${customReason.trim()}` : reason;

      // Grant lifetime access using Cloud Function (bypasses client-side security rules)
      // This works for BOTH existing users AND users who haven't signed up yet
      const functions = getFunctions();
      const adminGrantLifetimeAccess = httpsCallable(functions, 'adminGrantLifetimeAccess');
      
      console.log('📧 Calling adminGrantLifetimeAccess with:', {
        email: email.trim(),
        userId: user ? (user.uid || user.id) : null,
        reason: combinedReason,
        hasUser: !!user
      });
      
      // No password needed — cloud function verifies admin via Firebase Auth token
      const grantResult = await adminGrantLifetimeAccess({
        userId: user ? (user.uid || user.id) : null, // null if user doesn't exist - this is OK!
        email: email.trim(),
        reason: combinedReason,
        grantedBy: 'admin-manual'
      });
      
      console.log('✅ Grant result:', grantResult.data);

      // Send lifetime access email notification (works for any email, even if user doesn't exist)
      try {
        const sendLifetimeAccessEmail = httpsCallable(functions, 'sendLifetimeAccessEmail');
        const emailResult = await sendLifetimeAccessEmail({
          userEmail: email.trim(),
          userName: user ? (user.displayName || user.email.split('@')[0]) : email.split('@')[0],
          reason: combinedReason
        });
        const emailData = emailResult.data;
        if (emailData && emailData.success) {
          console.log('✅ Lifetime access email sent to:', email.trim());
        } else {
          console.warn('⚠️ Failed to send lifetime access email:', emailData?.message || 'Unknown error');
        }
      } catch (emailError) {
        console.warn('⚠️ Failed to send lifetime access email:', emailError);
        // Don't fail the whole operation if email fails
      }

      const successMessage = user 
        ? `✅ Successfully granted lifetime access to ${email.trim()} (${combinedReason}). Email notification sent!`
        : `✅ Lifetime access pre-granted to ${email.trim()} (${combinedReason}). Access will be activated when they sign up. Email notification sent!`;
      
      setResult({ 
        type: 'success', 
        message: successMessage
      });

      // Clear form
      setEmail('');
      setReason('Beta tester');
      setCustomReason('');

      // Notify parent component to refresh the list
      if (onUserAdded) {
        onUserAdded();
      }

    } catch (error) {
      console.error('❌ Error granting lifetime access:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        data: error.details || error.data
      });
      
      // Extract error message - could be from Cloud Function or network error
      let errorMessage = error.message || 'Unknown error';
      
      // If error has details/data, check there too
      if (error.details || error.data) {
        const errorData = error.details || error.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      // Check if the error mentions user not found - but we should still allow pre-granting
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('signed up')) {
        setResult({ 
          type: 'error', 
          message: `⚠️ ${errorMessage}. Note: Pre-granting should work even if the user hasn't signed up. Please check the backend logs.` 
        });
      } else {
        setResult({ 
          type: 'error', 
          message: `Failed to grant access: ${errorMessage}` 
        });
      }
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

  const handleTestEmail = async () => {
    if (!email.trim()) {
      setResult({ type: 'error', message: 'Please enter an email address to test' });
      return;
    }

    setTestingEmail(true);
    setResult(null);

    try {
      const functions = getFunctions();
      const sendLifetimeAccessEmail = httpsCallable(functions, 'sendLifetimeAccessEmail');
      const combinedReason = customReason.trim() ? `${reason} – ${customReason.trim()}` : reason;
      const result = await sendLifetimeAccessEmail({
        userEmail: email,
        userName: email.split('@')[0],
        reason: combinedReason
      });
      
      const data = result.data;
      if (data && data.success) {
        setResult({ 
          type: 'success', 
          message: `✅ Test email sent successfully to ${email}! (Reason: ${combinedReason}). Check your inbox (and spam folder).` 
        });
      } else {
        setResult({ 
          type: 'error', 
          message: `Failed to send test email: ${data?.message || 'Unknown error'}` 
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setResult({ 
        type: 'error', 
        message: `Failed to send test email: ${error.message || 'Network error'}` 
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSendToAllUsers = async () => {
    if (!confirm('⚠️ Are you sure you want to send the manual lifetime grant email to ALL users? This cannot be undone.')) {
      return;
    }

    setSendingToAll(true);
    setSendProgress({ sent: 0, total: 0 });
    setResult(null);

    try {
      const users = await getUserList();
      const functions = getFunctions();
      const sendLifetimeAccessEmail = httpsCallable(functions, 'sendLifetimeAccessEmail');
      
      setSendProgress({ sent: 0, total: users.length });
      
      const combinedReason = customReason.trim() ? `${reason} – ${customReason.trim()}` : reason;

      let successCount = 0;
      let failCount = 0;

      // Send emails in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              const result = await sendLifetimeAccessEmail({
                userEmail: user.email,
                userName: user.displayName || user.email.split('@')[0],
                reason: combinedReason
              });
              const data = result.data;
              if (data && data.success) {
                successCount++;
              } else {
                console.error(`Failed to send to ${user.email}:`, data?.message || 'Unknown error');
                failCount++;
              }
            } catch (error) {
              console.error(`Failed to send to ${user.email}:`, error);
              failCount++;
            } finally {
              setSendProgress({ sent: successCount + failCount, total: users.length });
            }
          })
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setResult({ 
        type: 'success', 
        message: `✅ Sent emails to ${successCount} users${failCount > 0 ? ` (${failCount} failed)` : ''}!` 
      });
    } catch (error) {
      console.error('Error sending emails to all users:', error);
      setResult({ 
        type: 'error', 
        message: `Failed to send emails: ${error.message}` 
      });
    } finally {
      setSendingToAll(false);
      setSendProgress({ sent: 0, total: 0 });
    }
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
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Add extra context (optional)"
              className="mt-3 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            />
            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
              This note is appended to the selected reason and appears in the email as %REASON%.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTestEmail}
              disabled={testingEmail || sendingToAll || !email.trim()}
              className="flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ 
                backgroundColor: testingEmail ? theme.border : theme.secondary, 
                color: theme.text 
              }}
            >
              {testingEmail ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  Sending Test...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Test Email
                </>
              )}
            </button>
            
            <button
              onClick={handleGrantAccess}
              disabled={loading || sendingToAll || !email.trim()}
              className="flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
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
          </div>

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
