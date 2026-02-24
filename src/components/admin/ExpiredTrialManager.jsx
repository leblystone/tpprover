import React, { useState, useEffect } from 'react';
import { Download, Send, Users, Mail, Loader, CheckCircle, AlertCircle, RefreshCw, Zap, Clock, Filter, Search } from 'lucide-react';
import { getUserList } from '../../services/firebase';
import { exportToCSV } from '../../utils/export';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, where, limit, getDocs } from 'firebase/firestore';

const HISTORY_LIMIT = 300;

export default function ExpiredTrialManager({ theme }) {
  const [activeTab, setActiveTab] = useState('users');
  const [expiredUsers, setExpiredUsers] = useState([]);
  const [loading, setLoading] = useState({ fetching: false, exporting: false, sending: false, winBack: false, history: false });
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [lastExportDate, setLastExportDate] = useState(null);
  const [winBackResult, setWinBackResult] = useState(null);
  const [emailHistory, setEmailHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  const loadEmailHistory = async () => {
    setLoading(prev => ({ ...prev, history: true }));
    try {
      const db = getFirestore();
      const q = query(
        collection(db, 'emailHistory'),
        where('type', 'in', ['winBack', 'trialExpiredSurvey']),
        limit(HISTORY_LIMIT)
      );
      const snap = await getDocs(q);
      const records = snap.docs
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            type: d.type,
            email: d.recipientEmail,
            name: d.recipientName || null,
            sentAt: d.sentAt?.toDate ? d.sentAt.toDate() : d.sentAt ? new Date(d.sentAt) : null,
            status: d.status || 'sent',
            sentBy: d.sentBy || 'scheduled',
            trialExtended: d.trialExtended || false,
            trialEndDate: d.trialEndDate || null,
          };
        })
        .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
      setEmailHistory(records);
    } catch (error) {
      console.error('❌ Error loading email history:', error);
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  };

  useEffect(() => {
    loadExpiredUsers();
    loadEmailHistory();
  }, []);

  const loadExpiredUsers = async () => {
    setLoading(prev => ({ ...prev, fetching: true }));
    try {
      const allUsers = await getUserList();
      const now = new Date();
      const expired = [];

      for (const user of allUsers) {
        const subscription = user.subscription || {};
        
        // ============================================
        // FILTERING LOGIC: Only include users who:
        // 1. Never had a paid subscription (monthly, annual, lifetime)
        // 2. Only had trial subscriptions
        // 3. Trial has expired
        // ============================================
        
        // Skip if user has lifetime access (granted or purchased)
        if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime') {
          continue;
        }
        
        // Skip if user has active paid subscription (not trial)
        if (subscription.status === 'active' && 
            subscription.plan && 
            !['30-Day Research Trial', '7-Day Free Trial'].includes(subscription.plan)) {
          continue;
        }
        
        // CRITICAL: Skip if user EVER had a paid subscription (even if now canceled/expired)
        // Check for payment indicators that prove they paid at some point
        const hasPaymentHistory = 
          subscription.stripeSubscriptionId || 
          subscription.stripeCustomerId ||
          subscription.paymentMethodId ||
          subscription.paymentProvider ||
          (subscription.platform && ['stripe', 'google-play', 'apple', 'squarespace'].includes(subscription.platform)) ||
          subscription.googlePlayPurchaseToken ||
          subscription.appleTransactionId ||
          subscription.customerId;
        
        if (hasPaymentHistory) {
          // This user has payment history - they've paid before, skip them
          continue;
        }
        
        // Skip if subscription plan indicates paid subscription (even if status is canceled/expired)
        const plan = subscription.plan?.toLowerCase() || '';
        const paidPlanIndicators = ['monthly', 'annual', 'yearly', 'year', 'lifetime', 'subscription'];
        if (paidPlanIndicators.some(indicator => plan.includes(indicator) && !plan.includes('trial'))) {
          // Check if it's actually a trial plan name
          if (!plan.includes('trial') && !plan.includes('free')) {
            continue;
          }
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
          // Default 30-day trial from creation
          const createdDate = user.createdAt.toDate ? 
            user.createdAt.toDate() : 
            new Date(user.createdAt);
          trialEndDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
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
    // Only send to users who are eligible (5+ days since expiration)
    const eligibleUsers = expiredUsers.filter(u => u.daysSinceExpiration >= 5);
    
    if (eligibleUsers.length === 0) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'No eligible expired trial users to send surveys to. Users must be expired for at least 5 days.', type: 'warning' }
      }));
      return;
    }

    const confirmed = window.confirm(
      `Send survey emails to ${eligibleUsers.length} eligible expired trial users?\n\n` +
      `This will send the "Trial Expired Survey" email template to users who have been expired for 5+ days.\n\n` +
      `(Total expired users: ${expiredUsers.length}, Eligible: ${eligibleUsers.length})`
    );

    if (!confirmed) return;

    setLoading(prev => ({ ...prev, sending: true }));
    setSendProgress({ sent: 0, total: eligibleUsers.length, failed: 0 });

    try {
      const functions = getFunctions();
      const sendTrialExpiredSurvey = httpsCallable(functions, 'sendTrialExpiredSurveyEmail');
      
      let sent = 0;
      let failed = 0;

      // Send emails in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = eligibleUsers.slice(i, i + batchSize);
        
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
        if (i + batchSize < eligibleUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: `✅ Sent ${sent} survey emails${failed > 0 ? ` (${failed} failed)` : ''}!`, 
          type: sent > 0 ? 'success' : 'error' 
        }
      }));

      await loadExpiredUsers();
      await loadEmailHistory();
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

  const triggerWinBack = async () => {
    const confirmed = window.confirm(
      `Trigger Win-Back Campaign Now?\n\n` +
      `This will immediately run the win-back campaign and:\n` +
      `• Email all canceled/expired users whose access ended 14–180 days ago\n` +
      `• Grant each eligible user a 14-day trial extension\n` +
      `• Skip anyone who received a win-back email in the last 60 days\n\n` +
      `This normally runs every Friday — are you sure you want to run it now?`
    );
    if (!confirmed) return;

    setLoading(prev => ({ ...prev, winBack: true }));
    setWinBackResult(null);

    try {
      const functions = getFunctions();
      // Timeout set to 540s to match server-side — large user lists take time
      const manualTrigger = httpsCallable(functions, 'manualTriggerWinBackCampaign', { timeout: 540000 });
      const result = await manualTrigger({});
      const data = result.data;

      setWinBackResult(data);
      if (data.success) await loadEmailHistory();
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: data.success
            ? `✅ Win-back campaign complete! Sent: ${data.sent}, Skipped: ${data.skipped}`
            : `❌ Win-back campaign failed: ${data.error}`,
          type: data.success ? 'success' : 'error'
        }
      }));
    } catch (error) {
      console.error('❌ Error triggering win-back campaign:', error);
      // Campaign may still be running on the server — refresh history after a delay
      setWinBackResult({ success: false, error: `${error.message} — campaign may still be running, check Email History in ~2 min` });
      setTimeout(() => loadEmailHistory(), 120000);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `⚠️ Client timed out — campaign may still be running on server. Check Email History in ~2 minutes.`, type: 'warning' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, winBack: false }));
    }
  };

  const filteredHistory = emailHistory.filter(h => {
    const matchesType = historyFilter === 'all' || h.type === historyFilter;
    const matchesSearch = !historySearch || h.email?.toLowerCase().includes(historySearch.toLowerCase()) || h.name?.toLowerCase().includes(historySearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const winBackCount = emailHistory.filter(h => h.type === 'winBack').length;
  const surveyCount = emailHistory.filter(h => h.type === 'trialExpiredSurvey').length;

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
            <Users size={20} style={{ color: theme.primary }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.text }}>Expired Trial Users</h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Manage and re-engage users whose trials have expired
            </p>
          </div>
        </div>
        <button
          onClick={() => { loadExpiredUsers(); loadEmailHistory(); }}
          disabled={loading.fetching || loading.history}
          className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.secondary, color: theme.text }}
        >
          {(loading.fetching || loading.history) ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: theme.primary }}>{expiredUsers.length}</div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Expired Trials</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: theme.warning }}>{expiredUsers.filter(u => u.daysSinceExpiration >= 5).length}</div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Survey Eligible</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: '#7c3aed' }}>{winBackCount}</div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Win-Back Sent</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <div className="text-2xl font-bold" style={{ color: theme.success }}>{surveyCount}</div>
          <div className="text-xs font-medium" style={{ color: theme.textLight }}>Surveys Sent</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={exportExpiredEmails}
          disabled={loading.exporting || expiredUsers.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          {loading.exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
          Export Emails (CSV)
        </button>
        <button
          onClick={bulkSendSurvey}
          disabled={loading.sending || expiredUsers.filter(u => u.daysSinceExpiration >= 5).length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
        >
          {loading.sending ? <><Loader size={16} className="animate-spin" /> Sending… ({sendProgress.sent}/{sendProgress.total})</> : <><Send size={16} /> Send Survey ({expiredUsers.filter(u => u.daysSinceExpiration >= 5).length})</>}
        </button>
        <button
          onClick={triggerWinBack}
          disabled={loading.winBack}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
        >
          {loading.winBack ? <><Loader size={16} className="animate-spin" /> Running Campaign…</> : <><Zap size={16} /> Trigger Win-Back Now</>}
        </button>
      </div>

      {/* Inline result banners */}
      {winBackResult && (
        <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
          style={{ backgroundColor: winBackResult.success ? theme.success + '20' : theme.error + '20', color: winBackResult.success ? theme.success : theme.error }}>
          {winBackResult.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>
            {winBackResult.success
              ? `Win-back complete — ${winBackResult.sent} email${winBackResult.sent !== 1 ? 's' : ''} sent, ${winBackResult.skipped} skipped.`
              : `Win-back failed: ${winBackResult.error}`}
          </span>
        </div>
      )}
      {lastExportDate && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
          <CheckCircle size={16} className="inline mr-2" />Last exported: {lastExportDate.toLocaleString()}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ backgroundColor: theme.background }}>
        {[
          { id: 'users', label: 'Expired Users', icon: Users, count: expiredUsers.length },
          { id: 'history', label: 'Email History', icon: Clock, count: emailHistory.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? theme.cardBackground : 'transparent',
              color: activeTab === tab.id ? theme.text : theme.textLight,
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <tab.icon size={15} />
            {tab.label}
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{ backgroundColor: activeTab === tab.id ? theme.primary + '20' : theme.textLight + '15', color: activeTab === tab.id ? theme.primary : theme.textLight }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        loading.fetching ? (
          <div className="text-center py-10">
            <Loader size={24} className="animate-spin mx-auto mb-2" style={{ color: theme.primary }} />
            <p className="text-sm" style={{ color: theme.textLight }}>Loading expired trial users…</p>
          </div>
        ) : expiredUsers.length === 0 ? (
          <div className="text-center py-10">
            <Users size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm font-medium" style={{ color: theme.textLight }}>No expired trial users found</p>
          </div>
        ) : (
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
              Showing {expiredUsers.length} expired trial {expiredUsers.length === 1 ? 'user' : 'users'}
            </div>
            <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
              {expiredUsers.map((user) => (
                <div key={user.uid || user.email}
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Mail size={15} style={{ color: theme.textLight }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: theme.text }}>{user.displayName || user.email}</div>
                      <div className="text-xs truncate" style={{ color: theme.textLight }}>{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0" style={{ color: theme.textLight }}>
                    <span>Expired {user.trialEndDate.toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{
                      backgroundColor: user.daysSinceExpiration >= 5 ? theme.warning + '20' : theme.textLight + '15',
                      color: user.daysSinceExpiration >= 5 ? theme.warning : theme.textLight
                    }}>{user.daysSinceExpiration}d ago</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div>
          {/* Filter + search row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <Filter size={13} style={{ color: theme.textLight }} />
              {[
                { id: 'all', label: 'All' },
                { id: 'winBack', label: 'Win-Back' },
                { id: 'trialExpiredSurvey', label: 'Survey' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: historyFilter === f.id
                      ? (f.id === 'winBack' ? '#7c3aed' : f.id === 'trialExpiredSurvey' ? theme.success : theme.primary)
                      : theme.background,
                    color: historyFilter === f.id ? '#fff' : theme.textLight,
                    border: `1px solid ${historyFilter === f.id ? 'transparent' : theme.border}`,
                  }}
                >
                  {f.label}
                  {f.id !== 'all' && (
                    <span className="ml-1 opacity-75">
                      ({f.id === 'winBack' ? winBackCount : surveyCount})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border"
              style={{ borderColor: theme.border, backgroundColor: theme.background }}>
              <Search size={13} style={{ color: theme.textLight }} />
              <input
                type="text"
                placeholder="Search by email or name…"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: theme.text }}
              />
            </div>
          </div>

          {loading.history ? (
            <div className="text-center py-10">
              <Loader size={24} className="animate-spin mx-auto mb-2" style={{ color: theme.primary }} />
              <p className="text-sm" style={{ color: theme.textLight }}>Loading email history…</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-10">
              <Clock size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>
                {emailHistory.length === 0 ? 'No emails sent yet' : 'No results match your filter'}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                Showing {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
                {emailHistory.length >= HISTORY_LIMIT && ` (latest ${HISTORY_LIMIT})`}
              </div>
              <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
                {filteredHistory.map(record => (
                  <div key={record.id}
                    className="p-3 rounded-lg border flex items-center justify-between gap-3"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail size={15} style={{ color: theme.textLight }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: theme.text }}>
                          {record.name || record.email}
                        </div>
                        <div className="text-xs truncate" style={{ color: theme.textLight }}>{record.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Type badge */}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                        backgroundColor: record.type === 'winBack' ? '#7c3aed20' : theme.success + '20',
                        color: record.type === 'winBack' ? '#7c3aed' : theme.success,
                      }}>
                        {record.type === 'winBack' ? '⚡ Win-Back' : '📋 Survey'}
                      </span>
                      {/* Sent by */}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.textLight + '15', color: theme.textLight }}>
                        {record.sentBy === 'manual' ? 'Manual' : record.sentBy === 'admin' ? 'Admin' : 'Scheduled'}
                      </span>
                      {/* Trial extended badge */}
                      {record.trialExtended && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#7c3aed15', color: '#7c3aed' }}>
                          +14d trial
                        </span>
                      )}
                      {/* Date */}
                      <span className="text-xs" style={{ color: theme.textLight }}>
                        {record.sentAt ? record.sentAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

