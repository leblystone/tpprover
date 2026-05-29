import React, { useState, useEffect } from 'react';
import { PaperPlaneTilt, DeviceMobile, Users, CircleNotch, CheckCircle, WarningCircle, Warning } from '@phosphor-icons/react';
import adminNotificationService from '../../services/adminNotifications';

export default function PushNotificationBroadcast({ theme }) {
  const [title, setTitle] = useState('📱 Update Available');
  const [body, setBody] = useState('A new version of The Pep Planner is available! Update now to get the latest features and improvements.');
  const [includeUpdateData, setIncludeUpdateData] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const statsData = await adminNotificationService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'warning', 
          message: 'Please fill in both title and message body' 
        }
      }));
      return;
    }

    if (!confirm(`Are you sure you want to send this push notification to ALL users (${stats?.usersWithPushEnabled || '?'} users with push enabled)?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const notificationData = {
        title: title.trim(),
        body: body.trim(),
        data: {}
      };

      // Add update-related data if enabled
      if (includeUpdateData) {
        notificationData.data = {
          type: 'update_prompt',
          action: 'update_available',
          timestamp: Date.now().toString()
        };
      }

      const result = await adminNotificationService.sendToAllUsers(notificationData);

      if (result.success) {
        setSendResult({ 
          success: true, 
          message: `✅ Push notification sent successfully to ${result.sent} out of ${result.total} users!`,
          details: result
        });
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            type: 'success', 
            message: `✅ Sent to ${result.sent}/${result.total} users` 
          }
        }));
        // Refresh stats
        await loadStats();
      } else {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      setSendResult({ 
        success: false, 
        message: `❌ Failed to send notification: ${error.message}` 
      });
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: `❌ Failed to send: ${error.message}` 
        }
      }));
    } finally {
      setIsSending(false);
    }
  };

  const presetUpdateMessages = [
    {
      name: 'Standard Update Prompt',
      title: '📱 Update Available',
      body: 'A new version of The Pep Planner is available! Update now to get the latest features and improvements.'
    },
    {
      name: 'Critical Update',
      title: '🔴 Important Update Required',
      body: 'A critical update is available for The Pep Planner. Please update as soon as possible for security and stability improvements.'
    },
    {
      name: 'New Features',
      title: '✨ New Features Available',
      body: 'Update The Pep Planner to access exciting new features and improvements! Tap to update now.'
    },
    {
      name: 'Custom',
      title: '',
      body: ''
    }
  ];

  const handlePresetSelect = (preset) => {
    if (preset.name !== 'Custom') {
      setTitle(preset.title);
      setBody(preset.body);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Header */}
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.text }}>
            <DeviceMobile size={20} />
            Push Notification Broadcast
          </h2>
          <p className="text-xs mt-1" style={{ color: theme.textLight }}>
            PaperPlaneTilt a one-time push notification to all users with push notifications enabled
          </p>
        </div>

        {/* Stats Card */}
        {stats && (
          <div className="p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <Users size={18} style={{ color: theme.primary }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: theme.text }}>
                {stats.usersWithPushEnabled || 0} users with push notifications enabled
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Out of {stats.totalUsers || 0} total users
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="p-3 rounded-lg border flex items-start gap-2" style={{ borderColor: '#f59e0b', backgroundColor: '#fef3c7' }}>
        <Warning size={16} style={{ color: '#d97706' }} className="flex-shrink-0 mt-0.5" />
        <div className="text-xs" style={{ color: '#92400e' }}>
          <strong>Warning:</strong> This will send a push notification to all users who have push notifications enabled. 
          Use this feature carefully and only when necessary to prompt users about important updates.
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Templates */}
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <label className="block text-sm font-semibold mb-2" style={{ color: theme.text }}>
            Quick Templates
          </label>
          <div className="grid grid-cols-2 gap-2">
            {presetUpdateMessages.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                disabled={isSending}
                className="px-3 py-2 rounded-lg border text-left transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.background
                }}
              >
                <div className="text-xs font-medium" style={{ color: theme.text }}>
                  {preset.name === 'Standard Update Prompt' ? '📱 Update Available' : 
                   preset.name === 'Critical Update' ? '🔴 Important Update Required' :
                   preset.name === 'New Features' ? '✨ New Features Available' : '✏️ Custom'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Notification Form */}
        <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="space-y-2">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                Notification Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Update Available"
                disabled={isSending}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text
                }}
                maxLength={100}
              />
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {title.length}/100 characters
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                Notification Message <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="A new version is available..."
                disabled={isSending}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-y disabled:opacity-50"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontFamily: 'inherit'
                }}
                maxLength={500}
              />
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                {body.length}/500 characters
              </div>
            </div>

            {/* Update Data Option */}
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.background }}>
              <input
                type="checkbox"
                id="includeUpdateData"
                checked={includeUpdateData}
                onChange={(e) => setIncludeUpdateData(e.target.checked)}
                disabled={isSending}
              />
              <label 
                htmlFor="includeUpdateData" 
                className="text-xs cursor-pointer flex-1"
                style={{ color: theme.text }}
              >
                Include update prompt data
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* PaperPlaneTilt Button */}
      <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <button
          onClick={handleSend}
          disabled={!title.trim() || !body.trim() || isSending}
          className="w-full px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: theme.primary,
            color: theme.textOnPrimary,
            boxShadow: `0 2px 6px ${theme.primary}30`
          }}
        >
          {isSending ? (
            <>
              <CircleNotch size={16} className="animate-spin" />
              Sending to all users...
            </>
          ) : (
            <>
              <PaperPlaneTilt size={16} />
              PaperPlaneTilt Push Notification to All Users
            </>
          )}
        </button>

        {stats && (
          <p className="text-xs mt-2 text-center" style={{ color: theme.textLight }}>
            Will be sent to approximately <strong style={{ color: theme.text }}>
              {stats.usersWithPushEnabled || 0} users
            </strong> with push notifications enabled
          </p>
        )}
      </div>

      {/* PaperPlaneTilt Result */}
      {sendResult && (
        <div className={`px-3 py-2 rounded-lg text-sm ${
          sendResult.success 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {sendResult.success ? (
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
            ) : (
              <WarningCircle size={16} className="flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium text-xs">{sendResult.message}</div>
              {sendResult.success && sendResult.details && sendResult.details.results && sendResult.details.results.length > 0 && (
                <div className="text-[10px] mt-1 opacity-90">
                  {sendResult.details.results.slice(0, 2).map((result, idx) => (
                    <div key={idx}>
                      {result.success ? '✅' : '❌'} User {result.userId?.substring(0, 8)}...
                      {result.error && ` - ${result.error}`}
                    </div>
                  ))}
                  {sendResult.details.results.length > 2 && (
                    <div className="opacity-75">
                      ... and {sendResult.details.total - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

