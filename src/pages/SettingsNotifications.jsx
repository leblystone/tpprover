import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, FlaskConical, Package, Send, RefreshCw, CreditCard, Bug } from 'lucide-react'
import { loadSettings, saveSettings, getDefaultSettings, syncNotificationSettingsToFirestore } from '../utils/settingsHelpers'
import pwaNotificationService from '../services/pwaNotifications'
import { Capacitor } from '@capacitor/core'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useFirebase } from '../context/FirebaseContext'
import { debugNotifications } from '../utils/debugNotifications'
import TimePicker15Min from '../components/common/inputs/TimePicker15Min'

/**
 * Save push token to Firestore for server-side push notifications
 */
async function savePushTokenToFirestore(token) {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
    if (!user?.email) {
      console.warn('📱 No user email found, cannot save FCM token');
      return;
    }

    // Try using uid first (correct Firestore structure)
    const userId = user.uid || user.email?.toLowerCase();
    const userRef = doc(db, 'users', userId);
    
    await setDoc(userRef, {
      fcmToken: token,
      pushToken: token, // Keep for backward compatibility
      notificationSettings: {
        push: true, // Firebase Functions check for 'push', not 'pushEnabled'
        pushEnabled: true, // Keep for backward compatibility
        lastUpdated: serverTimestamp()
      },
      deviceInfo: {
        platform: Capacitor.getPlatform(),
        isNative: true,
        lastUpdated: serverTimestamp()
      }
    }, { merge: true });
  } catch (error) {
    console.error('❌ Failed to save FCM token to Firestore:', error);
  }
}

export default function SettingsNotifications() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { firebaseUser } = useFirebase()
  
  // PWA Notification state
  const [pwaNotificationStatus, setPwaNotificationStatus] = useState({
    supported: false,
    permission: 'default',
    enabled: false,
    loading: false
  })

  // Debug modal state
  const [debugResults, setDebugResults] = useState(null)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)

  // Settings state
  const [settings, setSettings] = useState(() => {
    const loadedSettings = loadSettings()
    const defaultSettings = getDefaultSettings()
    
    return {
      ...defaultSettings,
      ...loadedSettings,
      notifications: {
        ...defaultSettings.notifications,
        ...(loadedSettings?.notifications || {})
      }
    }
  })

  // Initialize PWA notification status
  useEffect(() => {
    const updatePWAStatus = () => {
      const status = pwaNotificationService.getStatus();
      const isNative = Capacitor.isNativePlatform();
      
      setPwaNotificationStatus({
        supported: status.supported || isNative,
        permission: status.permission,
        enabled: status.enabled,
        loading: false,
        isNative: isNative
      });
    };

    updatePWAStatus();

    const handleEnabled = () => updatePWAStatus();
    const handleDisabled = () => updatePWAStatus();

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);

    return () => {
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
    };
  }, []);

  // Sync notification settings to Firestore on component load
  useEffect(() => {
    if (firebaseUser) {
      syncNotificationSettingsToFirestore();
    }
  }, [firebaseUser]);

  const update = async (path, value) => {
    const next = { ...settings }
    const segs = path.split('.')
    let ref = next
    
    for (let i = 0; i < segs.length - 1; i++) {
      if (!ref[segs[i]] || typeof ref[segs[i]] !== 'object') {
        ref[segs[i]] = {}
      }
      ref = ref[segs[i]]
    }
    
    ref[segs[segs.length - 1]] = value
    setSettings(next)
    saveSettings(next)
    
    // Sync notification settings to Firestore when they change
    if (path.startsWith('notifications.')) {
      await syncNotificationSettingsToFirestore();
    }
  }

  // Handle PWA notification toggle
  const handlePWANotificationToggle = async (enabled) => {
    if (pwaNotificationStatus.loading) return;
    
    update('notifications.push', enabled);
    
    setPwaNotificationStatus(prev => ({ ...prev, loading: true }));
    
    try {
      if (pwaNotificationStatus.isNative) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        if (enabled) {
          // Add listener BEFORE requesting permissions to catch token immediately
          const registrationListener = PushNotifications.addListener('registration', async (token) => {
            console.log('📱 FCM token received:', token.value);
            await savePushTokenToFirestore(token.value);
          });
          
          // Check if already registered (token might already exist)
          try {
            const registrationResult = await PushNotifications.checkPermissions();
            if (registrationResult.receive === 'granted') {
              // Already has permission, register to get token
              await PushNotifications.register();
            } else {
              // Request permission first
              const result = await PushNotifications.requestPermissions();
              if (result.receive === 'granted') {
                await PushNotifications.register();
              } else {
                throw new Error('Push notification permission denied');
              }
            }
          } catch (error) {
            console.error('Error checking/requesting push permissions:', error);
            // Try to register anyway (might already have permission)
            try {
              await PushNotifications.register();
            } catch (regError) {
              throw new Error('Push notification permission denied');
            }
          }
        }
      } else {
        if (enabled) {
          await pwaNotificationService.enable();
        } else {
          await pwaNotificationService.disable();
        }
      }
      
      setPwaNotificationStatus(prev => ({ 
        ...prev, 
        enabled: enabled,
        loading: false 
      }));
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: `Notifications ${enabled ? 'enabled' : 'disabled'}`, 
          type: 'success' 
        } 
      }));
      
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      
      update('notifications.push', !enabled);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: error.message || 'Failed to update notification settings', 
          type: 'error' 
        } 
      }));
      
      setPwaNotificationStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle debug notification diagnostics
  const handleDebugNotifications = async () => {
    setDebugLoading(true);
    try {
      const results = await debugNotifications();
      setDebugResults(results);
      setShowDebugModal(true);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Debug report generated', 
          type: 'success' 
        } 
      }));
    } catch (error) {
      console.error('Failed to run debug:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Failed to generate debug report', 
          type: 'error' 
        } 
      }));
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <section className="max-w-xl mx-auto space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-2 rounded-xl transition-all active:scale-95 border shadow-sm shrink-0"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Notifications</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Alerts & Communication
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      {/* Notification Settings */}
      <div className="space-y-4">
        {/* Master Control */}
        <div 
          className="px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
          style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
        >
          <SettingToggle 
            checked={settings.notifications.push ?? false} 
            onChange={handlePWANotificationToggle}
            label="Push Notifications" 
            description="Receive real-time alerts even when the app is closed"
            theme={theme}
            disabled={!pwaNotificationStatus.supported || pwaNotificationStatus.loading}
            isLast={true}
          />
        </div>

        {/* Protocol & Research */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <FlaskConical size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Protocol & Research
            </h4>
          </div>

          <div 
            className="px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.notifications.researchReminders} 
              onChange={v => update('notifications.researchReminders', v)} 
              label="Research Reminders" 
              description="Alerts for scheduled research activities" 
              theme={theme}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications?.washoutReminders ?? true} 
              onChange={v => update('notifications.washoutReminders', v)} 
              label="Washout Reminders" 
              description="Alerts for washout periods between protocols" 
              theme={theme}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications?.cycleReminders ?? true} 
              onChange={v => update('notifications.cycleReminders', v)} 
              label="Cycle Reminders" 
              description="Alerts for protocol cycle schedules" 
              theme={theme}
              disabled={!settings.notifications.push}
              isLast={true}
            />
          </div>

          {/* Reminder Time Settings */}
          {settings.notifications.researchReminders && (
            <div 
              className="p-4 rounded-2xl border-2 transition-all shadow-sm space-y-3"
              style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
            >
              <div className="flex items-start gap-2 mb-1">
                <Bell size={14} className="mt-0.5" style={{ color: theme.primary }} />
                <div className="flex-1">
                  <h5 className="text-xs font-bold mb-0.5" style={{ color: theme.text }}>
                    Daily Reminder Times
                  </h5>
                  <p className="text-[10px] leading-relaxed opacity-60" style={{ color: theme.text }}>
                    Set when you'd like to receive your daily research reminders. Changes sync across all pages.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TimePicker15Min
                  label="Morning Reminder"
                  value={settings.notifications.researchReminderTimeAM || '08:00'}
                  onChange={(time) => update('notifications.researchReminderTimeAM', time)}
                  theme={theme}
                  disabled={!settings.notifications.push}
                  timeRange="am"
                />
                <TimePicker15Min
                  label="Evening Reminder"
                  value={settings.notifications.researchReminderTimePM || '18:00'}
                  onChange={(time) => update('notifications.researchReminderTimePM', time)}
                  theme={theme}
                  disabled={!settings.notifications.push}
                  timeRange="pm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="checkbox"
                    id="amReminder"
                    checked={settings.notifications.researchRemindersAM ?? false}
                    onChange={(e) => update('notifications.researchRemindersAM', e.target.checked)}
                    disabled={!settings.notifications.push}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: theme.primary }}
                  />
                  <label htmlFor="amReminder" className="text-xs font-medium cursor-pointer" style={{ color: theme.text, opacity: settings.notifications.push ? 1 : 0.5 }}>
                    Enable AM
                  </label>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="checkbox"
                    id="pmReminder"
                    checked={settings.notifications.researchRemindersPM ?? false}
                    onChange={(e) => update('notifications.researchRemindersPM', e.target.checked)}
                    disabled={!settings.notifications.push}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: theme.primary }}
                  />
                  <label htmlFor="pmReminder" className="text-xs font-medium cursor-pointer" style={{ color: theme.text, opacity: settings.notifications.push ? 1 : 0.5 }}>
                    Enable PM
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orders & Stock */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Package size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Orders & Stock
            </h4>
          </div>

          <div 
            className="px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.notifications?.lowStockAlerts ?? true} 
              onChange={v => update('notifications.lowStockAlerts', v)} 
              label="Low Stock Notifications" 
              description="Alerts when inventory drops to 3 or fewer vials" 
              theme={theme}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications?.orderStatusUpdates ?? true} 
              onChange={v => update('notifications.orderStatusUpdates', v)} 
              label="Order Status Updates" 
              description="Notifications for order arrivals and status changes" 
              theme={theme}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications.groupBuys} 
              onChange={v => update('notifications.groupBuys', v)} 
              label="Group Buy Updates" 
              description="Alerts for new group buy opportunities" 
              theme={theme}
              disabled={!settings.notifications.push}
              isLast={true}
            />
          </div>
        </div>

        {/* Subscription & Billing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CreditCard size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Subscription & Billing
            </h4>
          </div>

          <div 
            className="px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.notifications?.billing ?? true} 
              onChange={v => update('notifications.billing', v)} 
              label="Billing Alerts" 
              description="Notifications for renewals, payments, and trial status" 
              theme={theme}
              disabled={!settings.notifications.push}
              isLast={true}
            />
          </div>
        </div>

        {/* Debug Button */}
        <div className="pt-4">
          <button
            onClick={handleDebugNotifications}
            disabled={debugLoading}
            className="w-full px-4 py-3 rounded-2xl border-2 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: theme.cardBackground, 
              borderColor: theme.primary + '40',
              opacity: debugLoading ? 0.6 : 1
            }}
          >
            <Bug size={16} style={{ color: theme.primary }} />
            <span className="text-sm font-bold" style={{ color: theme.text }}>
              {debugLoading ? 'Running Diagnostic...' : 'Debug Notifications'}
            </span>
          </button>
          <p className="text-[10px] text-center mt-2 opacity-50" style={{ color: theme.text }}>
            Check why notifications may not be working
          </p>
        </div>
      </div>

      {/* Debug Results Modal */}
      {showDebugModal && debugResults && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowDebugModal(false)}
        >
          <div 
            className="max-w-lg w-full rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: theme.cardBackground }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bug size={20} style={{ color: theme.primary }} />
                <h3 className="text-lg font-bold" style={{ color: theme.text }}>Notification Debug Report</h3>
              </div>
              <button 
                onClick={() => setShowDebugModal(false)}
                className="text-2xl opacity-50 hover:opacity-100"
                style={{ color: theme.text }}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Summary */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: theme.secondary }}>
                <h4 className="font-bold mb-2" style={{ color: theme.text }}>Status</h4>
                {debugResults.success ? (
                  <div className="space-y-2 text-sm" style={{ color: theme.text }}>
                    <div>✅ FCM Token: {debugResults.fcmToken}</div>
                    <div>🔔 Push Enabled: {debugResults.notificationSettings?.push ? '✅ Yes' : '❌ No'}</div>
                    <div>🌍 Timezone: {debugResults.timezone}</div>
                    <div>🕐 Current Time: {debugResults.currentTimeInUserTimezone}</div>
                  </div>
                ) : (
                  <div className="text-sm text-red-500">{debugResults.message}</div>
                )}
              </div>

              {/* Active Protocols */}
              {debugResults.activeProtocolsToday && debugResults.activeProtocolsToday.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: theme.secondary }}>
                  <h4 className="font-bold mb-2" style={{ color: theme.text }}>Active Protocols Today</h4>
                  <div className="space-y-1 text-sm" style={{ color: theme.text }}>
                    {debugResults.activeProtocolsToday.map((protocol, idx) => (
                      <div key={idx}>• {protocol.name}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Today */}
              {debugResults.tasksScheduledToday && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: theme.secondary }}>
                  <h4 className="font-bold mb-2" style={{ color: theme.text }}>
                    Tasks Today ({debugResults.tasksScheduledToday.length})
                  </h4>
                  {debugResults.tasksScheduledToday.length > 0 ? (
                    <div className="space-y-1 text-sm" style={{ color: theme.text }}>
                      {debugResults.tasksScheduledToday.slice(0, 5).map((task, idx) => (
                        <div key={idx}>• {task.peptideName} at {task.time}</div>
                      ))}
                      {debugResults.tasksScheduledToday.length > 5 && (
                        <div className="opacity-50">... and {debugResults.tasksScheduledToday.length - 5} more</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm opacity-50" style={{ color: theme.text }}>
                      No tasks scheduled for today
                    </div>
                  )}
                </div>
              )}

              {/* Debug Analysis */}
              {debugResults.debugLog && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: theme.secondary }}>
                  <h4 className="font-bold mb-2" style={{ color: theme.text }}>Analysis</h4>
                  <div className="space-y-2 text-sm" style={{ color: theme.text }}>
                    <div>Default AM: {debugResults.debugLog.wouldSendDefaultAM ? '✅ Would send' : '❌ Would not send'}</div>
                    <div>AM Reminder: {debugResults.debugLog.wouldSendAMReminder ? '✅ Would send' : '❌ Would not send'}</div>
                    <div>PM Reminder: {debugResults.debugLog.wouldSendPMReminder ? '✅ Would send' : '❌ Would not send'}</div>
                    {debugResults.debugLog.reasonForNoSend && debugResults.debugLog.reasonForNoSend !== 'N/A' && (
                      <div className="mt-2 p-2 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                        ⚠️ {debugResults.debugLog.reasonForNoSend}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reminder Settings */}
              {debugResults.notificationSettings && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: theme.secondary }}>
                  <h4 className="font-bold mb-2" style={{ color: theme.text }}>Reminder Settings</h4>
                  <div className="space-y-1 text-sm" style={{ color: theme.text }}>
                    <div>AM: {debugResults.notificationSettings.researchRemindersAM ? `✅ ${debugResults.notificationSettings.researchReminderTimeAM}` : '❌ Disabled'}</div>
                    <div>PM: {debugResults.notificationSettings.researchRemindersPM ? `✅ ${debugResults.notificationSettings.researchReminderTimePM}` : '❌ Disabled'}</div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDebugModal(false)}
              className="w-full mt-6 px-4 py-3 rounded-xl font-bold"
              style={{ backgroundColor: theme.primary, color: '#fff' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

const SettingToggle = ({ checked, onChange, label, description, theme, disabled, isLast }) => (
  <div className={`flex items-center justify-between py-2 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-4">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: (checked && !disabled) ? theme.primary + '15' : theme.secondary }}
      >
        <Bell size={18} style={{ color: (checked && !disabled) ? theme.primary : theme.text }} className={checked ? 'opacity-100' : 'opacity-40'} />
      </div>
      <div>
        <div className="text-base font-black tracking-tight mb-0.5" style={{ color: theme.text }}>
          {label}
        </div>
        <div className="text-[11px] opacity-50" style={{ color: theme.text }}>
          {description}
        </div>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
      <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
           style={{ 
             backgroundColor: checked ? theme.primary : '#d1d5db', 
             opacity: disabled ? 0.5 : 1
           }}></div>
    </label>
  </div>
)

