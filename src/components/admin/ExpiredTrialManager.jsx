import React, { useState, useEffect } from 'react';
import { Download, Send, Users, Mail, Loader, CheckCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { getUserList } from '../../services/firebase';
import { exportToCSV } from '../../utils/export';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ExpiredTrialManager({ theme }) {
  const [expiredUsers, setExpiredUsers] = useState([]);
  const [loading, setLoading] = useState({ fetching: false, exporting: false, sending: false });
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [lastExportDate, setLastExportDate] = useState(null);

  useEffect(() => {
    loadExpiredUsers();
  }, []);

  const loadExpiredUsers = async () => {
    setLoading(prev => ({ ...prev, fetching: true }));
    try {
      const allUsers = await getUserList();
      const now = new Date();
      const expired = [];

      for (const user of allUsers) {
        // Skip if user has active subscription or lifetime access
        if (user.subscription?.status === 'active' && 
            user.subscription?.plan && 
            !['10-Day Research Trial', '7-Day Free Trial'].includes(user.subscription?.plan)) {
          continue;
        }
        
        if (user.subscription?.hasLifetimeAccess || user.subscription?.interval === 'lifetime') {
          continue;
        }

        // Determine trial end date
        let trialEndDate = null;
        if (user.subscription?.currentPeriodEnd) {
          trialEndDate = user.subscription.currentPeriodEnd.toDate ? 
            user.subscription.currentPeriodEnd.toDate() : 
            new Date(user.subscription.currentPeriodEnd);
        } else if (user.trialEndDate) {
          trialEndDate = user.trialEndDate.toDate ? 
            user.trialEndDate.toDate() : 
            new Date(user.trialEndDate);
        } else if (user.createdAt) {
          // Default 7-day trial from creation
          const createdDate = user.createdAt.toDate ? 
            user.createdAt.toDate() : 
            new Date(user.createdAt);
          trialEndDate = new Date(createdDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        }

        if (!trialEndDate || isNaN(trialEndDate.getTime())) {
          continue;
        }

        // Check if trial has expired
        if (trialEndDate < now) {
          const daysSinceExpiration = Math.floor((now - trialEndDate) / (1000 * 60 * 60 * 24));
          expired.push({
            ...user,
            email: user.email,
            trialEndDate: trialEndDate,
            daysSinceExpiration: daysSinceExpiration,
            displayName: user.displayName || user.email?.split('@')[0] || 'User'
          });
        }
      }

      // Sort by expiration date (most recent first)
      expired.sort((a, b) => b.trialEndDate - a.trialEndDate);
      setExpiredUsers(expired);
    } catch (error) {
      console.error('❌ Error loading expired trial users:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `Failed to load expired users: ${error.message}`, type: 'error' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, fetching: false }));
    }
  };

  const exportExpiredEmails = () => {
    setLoading(prev => ({ ...prev, exporting: true }));
    try {
      const emailData = expiredUsers.map(user => ({
        Email: user.email,
        Name: user.displayName || '',
        'Trial Ended': user.trialEndDate.toLocaleDateString(),
        'Days Since Expiration': user.daysSinceExpiration,
        'User ID': user.uid || ''
      }));

      const filename = `expired-trial-users-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(emailData, filename);
      setLastExportDate(new Date());
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `✅ Exported ${emailData.length} expired trial user emails!`, type: 'success' }
      }));
    } catch (error) {
      console.error('❌ Error exporting emails:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `Failed to export: ${error.message}`, type: 'error' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, exporting: false }));
    }
  };

  const bulkSendSurvey = async () => {
    if (expiredUsers.length === 0) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'No expired trial users to send surveys to.', type: 'warning' }
      }));
      return;
    }

    const confirmed = window.confirm(
      `Send survey emails to ${expiredUsers.length} expired trial users?\n\n` +
      `This will send the "Trial Expired Survey" email template to all users.`
    );

    if (!confirmed) return;

    setLoading(prev => ({ ...prev, sending: true }));
    setSendProgress({ sent: 0, total: expiredUsers.length, failed: 0 });

    try {
      const functions = getFunctions();
      const sendTrialExpiredSurvey = httpsCallable(functions, 'sendTrialExpiredSurveyEmail');
      
      let sent = 0;
      let failed = 0;

      // Send emails in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < expiredUsers.length; i += batchSize) {
        const batch = expiredUsers.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (user) => {
          try {
            await sendTrialExpiredSurvey({
              userEmail: user.email,
              userName: user.displayName || user.email?.split('@')[0] || 'there',
              surveyLink: null // Will use default from template
            });
            sent++;
            setSendProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
            return { success: true, email: user.email };
          } catch (error) {
            console.error(`❌ Failed to send to ${user.email}:`, error);
            failed++;
            setSendProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            return { success: false, email: user.email, error: error.message };
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < expiredUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: `✅ Sent ${sent} survey emails${failed > 0 ? ` (${failed} failed)` : ''}!`, 
          type: sent > 0 ? 'success' : 'error' 
        }
      }));

      // Reload to refresh the list
      await loadExpiredUsers();
    } catch (error) {
      console.error('❌ Error sending bulk survey emails:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `Failed to send surveys: ${error.message}`, type: 'error' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, sending: false }));
      setSendProgress({ sent: 0, total: 0, failed: 0 });
    }
  };

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
            <Users size={20} style={{ color: theme.primary }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
              Expired Trial Users
            </h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Manage and survey users whose trials have expired
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadExpiredUsers}
            disabled={loading.fetching}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.secondary, color: theme.text }}
          >
            {loading.fetching ? (
              <>
                <Loader size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: theme.primary }}>{expiredUsers.length}</div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Expired Trials</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: theme.warning }}>
            {expiredUsers.filter(u => u.daysSinceExpiration >= 5).length}
          </div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Eligible for Survey</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: theme.textLight }}>
            {expiredUsers.length > 0 ? Math.max(...expiredUsers.map(u => u.daysSinceExpiration)) : 0}
          </div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Oldest Expiration (days)</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={exportExpiredEmails}
          disabled={loading.exporting || expiredUsers.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          {loading.exporting ? (
            <>
              <Loader size={16} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={16} />
              Export Emails (CSV)
            </>
          )}
        </button>
        <button
          onClick={bulkSendSurvey}
          disabled={loading.sending || expiredUsers.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
        >
          {loading.sending ? (
            <>
              <Loader size={16} className="animate-spin" />
              Sending... ({sendProgress.sent}/{sendProgress.total})
            </>
          ) : (
            <>
              <Send size={16} />
              Send Survey to All ({expiredUsers.length})
            </>
          )}
        </button>
      </div>

      {lastExportDate && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
          <CheckCircle size={16} className="inline mr-2" />
          Last exported: {lastExportDate.toLocaleString()}
        </div>
      )}

      {/* User List */}
      {loading.fetching ? (
        <div className="text-center py-8">
          <Loader size={24} className="animate-spin mx-auto mb-2" style={{ color: theme.primary }} />
          <p className="text-sm" style={{ color: theme.textLight }}>Loading expired trial users...</p>
        </div>
      ) : expiredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users size={48} className="mx-auto mb-3 opacity-50" style={{ color: theme.textLight }} />
          <p className="text-sm font-medium" style={{ color: theme.textLight }}>
            No expired trial users found
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
            Showing {expiredUsers.length} expired trial {expiredUsers.length === 1 ? 'user' : 'users'}
          </div>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {expiredUsers.map((user) => (
              <div
                key={user.uid || user.email}
                className="p-3 rounded-lg border flex items-center justify-between"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Mail size={16} style={{ color: theme.textLight }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: theme.text }}>
                      {user.displayName || user.email}
                    </div>
                    <div className="text-xs truncate" style={{ color: theme.textLight }}>
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: theme.textLight }}>
                  <div>
                    Expired: {user.trialEndDate.toLocaleDateString()}
                  </div>
                  <div className="px-2 py-1 rounded" style={{ 
                    backgroundColor: user.daysSinceExpiration >= 5 ? theme.warning + '20' : theme.textLight + '20',
                    color: user.daysSinceExpiration >= 5 ? theme.warning : theme.textLight
                  }}>
                    {user.daysSinceExpiration} days ago
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

