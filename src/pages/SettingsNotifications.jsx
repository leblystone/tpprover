import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, BellSimpleRinging, Flask, Package, PaperPlaneTilt as Send, ArrowClockwise as RefreshCw, CreditCard, Lightning as Zap, Bug, CheckCircle, XCircle, Spinner as Loader2, Wrench, HardDrives, WashingMachine, Repeat, CalendarDots, TrendDown, TruckTrailer, UsersFour, Invoice, TestTube, IconContext } from '@phosphor-icons/react'
import { loadSettings, saveSettings, getDefaultSettings, syncNotificationSettingsToFirestore, getLocalTimezone } from '../utils/settingsHelpers'
import pwaNotificationService from '../services/pwaNotifications'
import unifiedNotificationService from '../services/unifiedNotifications'
import { Capacitor } from '@capacitor/core'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useFirebase } from '../context/FirebaseContext'
import TimePicker15Min from '../components/common/inputs/TimePicker15Min'
import { saveFcmTokenToFirestore, ensureNativePushRegistration } from '../utils/fcmToken'

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

  // Test notification state
  const [testState, setTestState] = useState({ loading: false, result: null })
  // Diagnostic state
  const [diagState, setDiagState] = useState({ loading: false, data: null, open: false })


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

  // Initialize PWA notification status, and verify it against the REAL
  // device permission (not just our stored preference flag) so the toggle
  // can never silently lie about being "on" after the user revokes
  // permission from their phone's Settings app instead of ours.
  useEffect(() => {
    const updatePWAStatus = async () => {
      const status = pwaNotificationService.getStatus();
      const isNative = Capacitor.isNativePlatform();

      let actuallyGranted = status.enabled;
      if (isNative) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permission = await LocalNotifications.checkPermissions();
          actuallyGranted = permission.display === 'granted';
        } catch (_) {
          // Fall back to whatever pwaNotificationService reported
        }
      }

      setPwaNotificationStatus({
        supported: status.supported || isNative,
        permission: actuallyGranted ? 'granted' : status.permission,
        enabled: actuallyGranted,
        loading: false,
        isNative: isNative
      });

      // If the toggle we've been showing said "on" but the device disagrees,
      // correct the stored preference so it stops lying about being enabled.
      // Read fresh from storage (not the `settings` state closure) to avoid
      // clobbering any unrelated edits made elsewhere since this effect ran.
      if (!actuallyGranted) {
        const freshSettings = loadSettings();
        if (freshSettings?.notifications?.push === true) {
          freshSettings.notifications.push = false;
          saveSettings(freshSettings);
          setSettings(prev => ({
            ...prev,
            notifications: { ...prev.notifications, push: false }
          }));
          syncNotificationSettingsToFirestore();
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: {
              message: 'Notifications were turned off in your device settings, so we\'ve switched this off too.',
              type: 'error'
            }
          }));
        }
      }
    };

    updatePWAStatus();

    const handleEnabled = () => updatePWAStatus();
    const handleDisabled = () => updatePWAStatus();
    const handleRevoked = () => updatePWAStatus();
    const handleFocus = () => updatePWAStatus();

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);
    window.addEventListener('tpp:notifications-permission-revoked', handleRevoked);
    window.addEventListener('focus', handleFocus);

    // CRITICAL for native: DOM 'focus' doesn't fire reliably in a Capacitor
    // WebView when returning from phone Settings, so also hook into the
    // native appStateChange event to force a recheck the moment the app
    // resumes to the foreground.
    let capacitorAppListener = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) updatePWAStatus();
        }).then(listener => {
          capacitorAppListener = listener;
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
      window.removeEventListener('tpp:notifications-permission-revoked', handleRevoked);
      window.removeEventListener('focus', handleFocus);
      if (capacitorAppListener) {
        capacitorAppListener.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (enabled) {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const perm = await PushNotifications.checkPermissions();
          if (perm.receive !== 'granted') {
            const requested = await PushNotifications.requestPermissions();
            if (requested.receive !== 'granted') {
              throw new Error('Push notification permission denied');
            }
          }
          await ensureNativePushRegistration(firebaseUser?.uid);
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

      // When freshly enabled, fire a real confirmation notification so the user
      // sees proof-of-life right in their notification tray, not just a toast
      if (enabled) {
        unifiedNotificationService.sendEnabledConfirmation().catch(() => {});
      }
      
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

  // Send a real test push notification via Firebase
  const handleSendTestNotification = async () => {
    if (testState.loading) return;
    setTestState({ loading: true, result: null });
    
    try {
      const functions = getFunctions();
      const sendTest = httpsCallable(functions, 'sendTestNotification');
      const result = await sendTest({ 
        type: 'researchReminders', 
        testData: {
          title: '🧪 Test Notification',
          body: 'If you see this, push notifications are working! 🎉'
        }
      });
      
      const success = result.data?.success;
      setTestState({ 
        loading: false, 
        result: success 
          ? { type: 'success', message: 'Notification sent! Check your device.' }
          : { type: 'error', message: result.data?.error || 'Failed to send. Check diagnostics below.' }
      });
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: success ? '✅ Test notification sent!' : '❌ Failed to send notification',
          type: success ? 'success' : 'error'
        }
      }));
    } catch (error) {
      console.error('Test notification error:', error);
      setTestState({ 
        loading: false, 
        result: { type: 'error', message: error.message || 'Failed to send test notification' }
      });
    }
    
    // Clear result after 8 seconds
    setTimeout(() => setTestState(prev => ({ ...prev, result: null })), 8000);
  };

  // Force re-register FCM token (fixes MISSING token)
  const handleFixToken = async () => {
    setTestState({ loading: true, result: null });
    
    try {
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permResult = await PushNotifications.requestPermissions();
        
        if (permResult.receive !== 'granted') {
          setTestState({ loading: false, result: { type: 'error', message: 'Push permission denied. Check device Settings > Notifications for this app.' } });
          return;
        }

        const result = await ensureNativePushRegistration(firebaseUser?.uid);
        const token = result?.token;
        if (token) {
          setTestState({
            loading: false,
            result: { type: 'success', message: `Token registered! (${token.substring(0, 15)}...)` }
          });
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: '✅ FCM token registered successfully!', type: 'success' }
          }));
        } else if (result?.pendingFlushed || result?.save?.success) {
          setTestState({
            loading: false,
            result: { type: 'success', message: 'Pending token saved to your account.' }
          });
        } else if (result?.timedOut) {
          setTestState({
            loading: false,
            result: { type: 'error', message: 'Registration timed out — force-close the app and reopen, then try Fix Token again.' }
          });
        } else {
          throw new Error(result?.error || 'Failed to register token');
        }
      } else {
        // Web/PWA — re-enable
        await pwaNotificationService.enable();
        setTestState({ loading: false, result: { type: 'success', message: 'PWA token refreshed!' } });
      }
    } catch (error) {
      console.error('Fix token error:', error);
      setTestState({ 
        loading: false, 
        result: { type: 'error', message: error.message || 'Failed to register token' }
      });
    }
    
    setTimeout(() => setTestState(prev => ({ ...prev, result: null })), 10000);
  };

  // Run notification diagnostics
  const handleRunDiagnostics = async () => {
    if (diagState.loading) return;
    setDiagState({ loading: true, data: null, open: true });
    
    try {
      const currentTz = getLocalTimezone();
      const storedSettings = loadSettings();
      const storedTz = storedSettings?.region?.timeZone;
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      // Check Firestore data
      let firestoreData = null;
      if (firebaseUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            firestoreData = {
              hasFcmToken: !!data.fcmToken,
              tokenPrefix: data.fcmToken ? data.fcmToken.substring(0, 20) + '...' : 'MISSING',
              pushEnabled: data.notificationSettings?.push === true,
              researchReminders: data.notificationSettings?.researchReminders === true,
              amEnabled: data.notificationSettings?.researchRemindersAM === true,
              pmEnabled: data.notificationSettings?.researchRemindersPM === true,
              amTime: data.notificationSettings?.researchReminderTimeAM || '08:00',
              pmTime: data.notificationSettings?.researchReminderTimePM || '18:00',
              storedTimezone: data.settings?.region?.timeZone || 'NOT SET',
            };
          }
        } catch (e) {
          firestoreData = { error: e.message };
        }
      }
      
      setDiagState({
        loading: false,
        open: true,
        data: {
          platform,
          isNative,
          browserTimezone: currentTz,
          localStorageTimezone: storedTz || 'NOT SET',
          timezonesMatch: currentTz === storedTz,
          firestoreTimezoneMatch: firestoreData?.storedTimezone === currentTz,
          notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A (native)',
          firebaseUser: firebaseUser?.uid ? `${firebaseUser.uid.substring(0, 8)}...` : 'NOT LOGGED IN',
          firestore: firestoreData,
          localTime: new Date().toLocaleString(),
        }
      });
    } catch (error) {
      setDiagState({ loading: false, open: true, data: { error: error.message } });
    }
  };


  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
    <section className="page-bg max-w-xl mx-auto space-y-4 px-3 sm:px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-2.5 rounded-full hover:opacity-80 transition-all active:scale-95 shrink-0"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Notifications</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Alerts & Communication
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      {/* Notification Settings */}
      <div className="space-y-4">
        {/* Master Control */}
        <div 
          className="content-section px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
          style={{ borderColor: 'transparent' }}
        >
          <SettingToggle 
            checked={settings.notifications.push ?? false} 
            onChange={handlePWANotificationToggle}
            label="Push Notifications" 
            description="Receive real-time alerts even when the app is closed"
            theme={theme}
            icon={BellSimpleRinging}
            disabled={!pwaNotificationStatus.supported || pwaNotificationStatus.loading}
            isLast={true}
          />
        </div>

        {/* Protocol & Research */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Flask size={18} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Protocol & Research
            </h4>
            <div
              className="flex-1 h-px"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>

          <div 
            className="content-section px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.notifications.researchReminders} 
              onChange={v => {
                update('notifications.researchReminders', v)
                // Turning master on → enable both AM and PM if neither is on yet
                if (v) {
                  if (!settings.notifications.researchRemindersAM && !settings.notifications.researchRemindersPM) {
                    update('notifications.researchRemindersAM', true)
                    update('notifications.researchRemindersPM', true)
                  }
                } else {
                  // Turning master off → disable both sub-toggles too
                  update('notifications.researchRemindersAM', false)
                  update('notifications.researchRemindersPM', false)
                }
              }} 
              label="Research Reminders" 
              description="Alerts for scheduled research activities" 
              theme={theme}
              icon={TestTube}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications?.washoutReminders ?? true} 
              onChange={v => update('notifications.washoutReminders', v)} 
              label="Washout Reminders" 
              description="Alerts for washout periods between protocols" 
              theme={theme}
              icon={WashingMachine}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications?.cycleReminders ?? true} 
              onChange={v => update('notifications.cycleReminders', v)} 
              label="Cycle Reminders" 
              description="Alerts for protocol cycle schedules" 
              theme={theme}
              icon={Repeat}
              disabled={!settings.notifications.push}
              isLast={true}
            />
          </div>

          {/* Reminder Time Settings */}
          {settings.notifications.researchReminders && (
            <div 
              className="content-section p-4 rounded-2xl border-2 transition-all shadow-sm space-y-3"
              style={{ borderColor: 'transparent' }}
            >
              <div className="flex items-start gap-2 mb-1">
                <CalendarDots size={18} className="mt-0.5" style={{ color: theme.primary }} />
                <div className="flex-1">
                  <h5 className="text-xs font-semibold mb-0.5" style={{ color: theme.text }}>
                    Daily Reminder Times
                  </h5>
                  <p className="text-[10px] leading-relaxed opacity-60" style={{ color: theme.text }}>
                    Default reminder times for all protocols and supplements. Protocols with a custom reminder time will use their own time instead.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold block opacity-70" style={{ color: theme.text }}>
                      Morning Reminder
                    </label>
                    <label htmlFor="amReminder" className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: theme.text, opacity: settings.notifications.push ? 1 : 0.5 }}>
                      <input
                        type="checkbox"
                        id="amReminder"
                        checked={settings.notifications.researchRemindersAM ?? false}
                        onChange={(e) => update('notifications.researchRemindersAM', e.target.checked)}
                        disabled={!settings.notifications.push}
                        className="sr-only peer"
                      />
                      <span
                        className="relative w-9 h-5 rounded-full transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1"
                        style={{
                          backgroundColor: (settings.notifications.researchRemindersAM ?? false) ? `${theme.primary}cc` : (theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'),
                          boxShadow: (settings.notifications.researchRemindersAM ?? false)
                            ? `0 0 0 1px ${theme.primary}55 inset`
                            : `0 0 0 1px ${theme.border}55 inset`,
                        }}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-300"
                          style={{
                            transform: (settings.notifications.researchRemindersAM ?? false) ? 'translateX(16px)' : 'translateX(0)',
                            backgroundColor: '#fff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                          }}
                        />
                      </span>
                      AM
                    </label>
                  </div>
                  <TimePicker15Min
                    label={null}
                    value={settings.notifications.researchReminderTimeAM || '08:00'}
                    onChange={(time) => update('notifications.researchReminderTimeAM', time)}
                    theme={theme}
                    disabled={!settings.notifications.push}
                    timeRange="am"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold block opacity-70" style={{ color: theme.text }}>
                      Evening Reminder
                    </label>
                    <label htmlFor="pmReminder" className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: theme.text, opacity: settings.notifications.push ? 1 : 0.5 }}>
                      <input
                        type="checkbox"
                        id="pmReminder"
                        checked={settings.notifications.researchRemindersPM ?? false}
                        onChange={(e) => update('notifications.researchRemindersPM', e.target.checked)}
                        disabled={!settings.notifications.push}
                        className="sr-only peer"
                      />
                      <span
                        className="relative w-9 h-5 rounded-full transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1"
                        style={{
                          backgroundColor: (settings.notifications.researchRemindersPM ?? false) ? `${theme.primary}cc` : (theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'),
                          boxShadow: (settings.notifications.researchRemindersPM ?? false)
                            ? `0 0 0 1px ${theme.primary}55 inset`
                            : `0 0 0 1px ${theme.border}55 inset`,
                        }}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-300"
                          style={{
                            transform: (settings.notifications.researchRemindersPM ?? false) ? 'translateX(16px)' : 'translateX(0)',
                            backgroundColor: '#fff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                          }}
                        />
                      </span>
                      PM
                    </label>
                  </div>
                  <TimePicker15Min
                    label={null}
                    value={settings.notifications.researchReminderTimePM || '18:00'}
                    onChange={(time) => update('notifications.researchReminderTimePM', time)}
                    theme={theme}
                    disabled={!settings.notifications.push}
                    timeRange="pm"
                  />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Orders & Stock */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Package size={18} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Orders & Stock
            </h4>
            <div
              className="flex-1 h-px"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>

          <div 
            className="content-section px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.notifications?.lowStockAlerts ?? true} 
              onChange={v => update('notifications.lowStockAlerts', v)} 
              label="Low Stock Notifications" 
              description="Alerts when inventory drops to 3 or fewer vials" 
              theme={theme}
              icon={TrendDown}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications?.orderStatusUpdates ?? true} 
              onChange={v => update('notifications.orderStatusUpdates', v)} 
              label="Order Status Updates" 
              description="Notifications for order arrivals and status changes" 
              theme={theme}
              icon={TruckTrailer}
              disabled={!settings.notifications.push}
            />
            <SettingToggle 
              checked={settings.notifications.groupBuys} 
              onChange={v => update('notifications.groupBuys', v)} 
              label="Group Buy Updates" 
              description="Alerts for new group buy opportunities" 
              theme={theme}
              icon={UsersFour}
              disabled={!settings.notifications.push}
              isLast={true}
            />
          </div>
        </div>

        {/* Subscription & Billing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CreditCard size={18} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Subscription & Billing
            </h4>
            <div
              className="flex-1 h-px"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>

          <div 
            className="content-section px-4 py-1 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.notifications?.subscription ?? settings.notifications?.billing ?? true} 
              onChange={v => {
                update('notifications.subscription', v)
                update('notifications.billing', v)
              }} 
              label="Subscription & plan alerts" 
              description="Notifications for renewals, payments, and trial status" 
              theme={theme}
              icon={Invoice}
              disabled={!settings.notifications.push}
              isLast={true}
            />
          </div>
        </div>


      </div>

    </section>
    </IconContext.Provider>
  )
}

const DiagRow = ({ label, value, theme, ok }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="opacity-60 shrink-0" style={{ color: theme.text }}>{label}</span>
    <span className="text-right flex items-center gap-1 truncate" style={{ color: ok === true ? '#10b981' : ok === false ? '#ef4444' : theme.text }}>
      {ok === true && <CheckCircle size={10} />}
      {ok === false && <XCircle size={10} />}
      {value}
    </span>
  </div>
)

const SettingToggle = ({ checked, onChange, label, description, theme, disabled, isLast, icon: Icon = HardDrives }) => (
  <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: (checked && !disabled) ? theme.primary + '15' : theme.secondary }}
      >
        <Icon size={18} style={{ color: (checked && !disabled) ? theme.primary : theme.text }} className={checked ? 'opacity-100' : 'opacity-40'} />
      </div>
      <div>
        <div className="text-sm font-semibold mb-0.5" style={{ color: theme.text }}>
          {label}
        </div>
        <div className="text-xs opacity-60" style={{ color: theme.text }}>
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

