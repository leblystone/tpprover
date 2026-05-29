import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CircleNotch, ArrowsClockwise, PaperPlaneTilt, WarningCircle, CheckCircle, Clock } from '@phosphor-icons/react';

export default function EmailQueueManager({ theme }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const functions = getFunctions();

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('📧 EmailQueueManager component mounted');
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const getStats = httpsCallable(functions, 'getEmailQueueStats');
      const result = await getStats();
      
      console.log('Email Queue Stats Result:', result.data);
      
      if (result.data && result.data.success) {
        setStats(result.data.stats);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to fetch stats:', result.data?.error || 'Unknown error');
        // Set default stats if function fails
        setStats({
          today: { sent: 0, limit: 100, remaining: 100, date: new Date().toISOString().split('T')[0] },
          queue: { total: 0, byPriority: { critical: 0, high: 0, normal: 0, low: 0 } }
        });
      }
    } catch (error) {
      console.error('Error fetching email queue stats:', error);
      // Set default stats on error
      setStats({
        today: { sent: 0, limit: 100, remaining: 100, date: new Date().toISOString().split('T')[0] },
        queue: { total: 0, byPriority: { critical: 0, high: 0, normal: 0, low: 0 } }
      });
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setProcessing(true);
    try {
      const processQueue = httpsCallable(functions, 'processEmailQueueManually');
      const result = await processQueue();
      
      if (result.data.success) {
        alert(`✅ Processed ${result.data.processed} emails! ${result.data.failed > 0 ? `(${result.data.failed} failed)` : ''}`);
        await fetchStats(); // Refresh stats
      } else {
        alert(`❌ Failed to process queue: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Always show the component, even if loading or stats are null
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Email Queue Manager</h3>
            <p className="text-xs" style={{ color: theme.textLight }}>
              Manage email sending within your 100 emails/day limit
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <CircleNotch size={24} className="animate-spin mx-auto mb-2" style={{ color: theme.primary }} />
          <p className="text-sm" style={{ color: theme.textLight }}>Loading email queue stats...</p>
        </div>
      </div>
    );
  }

  // Use default stats if none available
  const displayStats = stats || {
    today: { sent: 0, limit: 100, remaining: 100, date: new Date().toISOString().split('T')[0] },
    queue: { total: 0, byPriority: { critical: 0, high: 0, normal: 0, low: 0 } }
  };

  const { today, queue } = displayStats;
  const quotaPercentage = (today.sent / today.limit) * 100;
  const isNearLimit = quotaPercentage >= 80;
  const isAtLimit = today.remaining <= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Email Queue Manager</h3>
          <p className="text-xs" style={{ color: theme.textLight }}>
            Manage email sending within your 100 emails/day limit
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            {loading ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <ArrowsClockwise size={16} />
            )}
            Refresh
          </button>
          <button
            onClick={processQueue}
            disabled={processing || isAtLimit || queue.total === 0}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
          >
            {processing ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={16} />
            )}
            Process Queue
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="text-xs" style={{ color: theme.textLight }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Today's Quota */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium" style={{ color: theme.text }}>Today's Email Quota</div>
          <div className="text-sm font-bold" style={{ color: isAtLimit ? theme.error : isNearLimit ? theme.warning : theme.success }}>
            {today.sent} / {today.limit} sent
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${quotaPercentage}%`,
              backgroundColor: isAtLimit ? theme.error : isNearLimit ? theme.warning : theme.success
            }}
          />
        </div>
        <div className="text-xs" style={{ color: theme.textLight }}>
          {today.remaining > 0 ? (
            <span style={{ color: theme.success }}>
              ✅ {today.remaining} emails remaining today
            </span>
          ) : (
            <span style={{ color: theme.error }}>
              ⚠️ Daily limit reached. Emails will be queued.
            </span>
          )}
        </div>
      </div>

      {/* Queue Status */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium" style={{ color: theme.text }}>Email Queue</div>
          <div className="text-sm font-bold" style={{ color: queue.total > 0 ? theme.warning : theme.success }}>
            {queue.total} queued
          </div>
        </div>

        {queue.total === 0 ? (
          <div className="text-center py-4">
            <CheckCircle size={24} className="mx-auto mb-2" style={{ color: theme.success }} />
            <p className="text-xs" style={{ color: theme.textLight }}>No emails in queue</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.textLight }}>Critical Priority</span>
              <span className="font-bold" style={{ color: theme.error }}>{queue.byPriority.critical}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.textLight }}>High Priority</span>
              <span className="font-bold" style={{ color: theme.warning }}>{queue.byPriority.high}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.textLight }}>Normal Priority</span>
              <span className="font-bold" style={{ color: theme.text }}>{queue.byPriority.normal}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.textLight }}>Low Priority</span>
              <span className="font-bold" style={{ color: theme.textLight }}>{queue.byPriority.low}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg text-sm" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
        <div className="flex items-start gap-2">
          <Clock size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">How It Works:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Critical emails (password resets, verifications) send immediately</li>
              <li>Bulk emails are automatically queued when quota is reached</li>
              <li>Queue processes automatically every hour</li>
              <li>You can manually process the queue anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

