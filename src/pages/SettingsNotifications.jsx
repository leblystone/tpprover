import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, FlaskConical, Package, Send, RefreshCw, CreditCard, Zap, Bug, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { loadSettings, saveSettings, getDefaultSettings, syncNotificationSettingsToFirestore, getLocalTimezone } from '../utils/settingsHelpers'
import pwaNotificationService from '../services/pwaNotifications'
import { Capacitor } from '@capacitor/core'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useFirebase } from '../context/FirebaseContext'
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
        
        // Request permissions first (in case they were revoked)
        const permResult = await PushNotifications.requestPermissions();
        
        if (permResult.receive !== 'granted') {
          setTestState({ loading: false, result: { type: 'error', message: 'Push permission denied. Check iOS Settings > Notifications for this app.' } });
          return;
        }
        
        // Set up one-time listener for the token
        const tokenPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Token registration timed out (10s). Check APNs configuration.')), 10000);
          
          PushNotifications.addListener('registration', async (token) => {
            clearTimeout(timeout);
            console.log('📱 FCM token re-registered:', token.value);
            
            // Save to Firestore
            await savePushTokenToFirestore(token.value);
            resolve(token.value);
          });
          
          PushNotifications.addListener('registrationError', (error) => {
            clearTimeout(timeout);
            console.error('❌ Registration error:', JSON.stringify(error));
            reject(new Error(`Registration failed: ${error.error || JSON.stringify(error)}`));
          });
        });
        
        // Trigger registration
        await PushNotifications.register();
        
        // Wait for token
        const token = await tokenPromise;
        
        setTestState({ 
          loading: false, 
          result: { type: 'success', message: `Token registered! (${token.substring(0, 15)}...)` }
        });
        
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '✅ FCM token registered successfully!', type: 'success' }
        }));
        
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

        {/* Test & Diagnostics */}
        {settings.notifications.push && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Zap size={14} style={{ color: theme.primary }} />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
                Test & Diagnostics
              </h4>
            </div>

            <div 
              className="p-4 rounded-2xl border-2 transition-all shadow-sm space-y-3"
              style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
            >
              {/* Send Test Notification */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSendTestNotification}
                  disabled={testState.loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{ 
                    backgroundColor: theme.primary, 
                    color: theme.textOnPrimary,
                    opacity: testState.loading ? 0.7 : 1
                  }}
                >
                  {testState.loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  {testState.loading ? 'Sending...' : 'Send Test Notification'}
                </button>
              </div>

              {/* Test Result */}
              {testState.result && (
                <div 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ 
                    backgroundColor: testState.result.type === 'success' ? '#10b98120' : '#ef444420',
                    color: testState.result.type === 'success' ? '#10b981' : '#ef4444'
                  }}
                >
                  {testState.result.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {testState.result.message}
                </div>
              )}

              {/* Run Diagnostics */}
              <button
                onClick={handleRunDiagnostics}
                disabled={diagState.loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.98] border"
                style={{ 
                  borderColor: theme.border,
                  backgroundColor: 'transparent',
                  color: theme.text,
                  opacity: diagState.loading ? 0.7 : 1
                }}
              >
                {diagState.loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Bug size={13} />
                )}
                {diagState.loading ? 'Checking...' : 'Run Diagnostics'}
              </button>

              {/* Diagnostic Results */}
              {diagState.open && diagState.data && (
                <div 
                  className="rounded-xl border p-3 space-y-2 text-[11px] font-mono"
                  style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#0f172a' : '#f8fafc' }}
                >
                  <div className="text-xs font-bold font-sans mb-2" style={{ color: theme.text }}>
                    Notification Diagnostics
                  </div>
                  
                  {diagState.data.error ? (
                    <div style={{ color: '#ef4444' }}>Error: {diagState.data.error}</div>
                  ) : (
                    <>
                      <DiagRow label="Platform" value={`${diagState.data.platform} (${diagState.data.isNative ? 'native' : 'web'})`} theme={theme} />
                      <DiagRow label="Device Timezone" value={diagState.data.browserTimezone} theme={theme} />
                      <DiagRow label="Stored Timezone" value={diagState.data.localStorageTimezone} theme={theme} ok={diagState.data.timezonesMatch} />
                      <DiagRow label="Firestore Timezone" value={diagState.data.firestore?.storedTimezone || 'N/A'} theme={theme} ok={diagState.data.firestoreTimezoneMatch} />
                      <DiagRow label="Permission" value={diagState.data.notificationPermission} theme={theme} ok={diagState.data.notificationPermission === 'granted'} />
                      <DiagRow label="Firebase User" value={diagState.data.firebaseUser} theme={theme} ok={!diagState.data.firebaseUser.includes('NOT')} />
                      
                      {diagState.data.firestore && !diagState.data.firestore.error && (
                        <>
                          <div className="h-px my-1" style={{ backgroundColor: theme.border + '40' }} />
                          <DiagRow label="FCM Token" value={diagState.data.firestore.hasFcmToken ? 'Present' : 'MISSING'} theme={theme} ok={diagState.data.firestore.hasFcmToken} />
                          {!diagState.data.firestore.hasFcmToken && (
                            <button
                              onClick={handleFixToken}
                              disabled={testState.loading}
                              className="w-full py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-[0.98]"
                              style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                            >
                              {testState.loading ? '⏳ Registering...' : '🔧 Fix: Re-register FCM Token'}
                            </button>
                          )}
                          <DiagRow label="Push Enabled" value={diagState.data.firestore.pushEnabled ? 'Yes' : 'No'} theme={theme} ok={diagState.data.firestore.pushEnabled} />
                          <DiagRow label="Research Reminders" value={diagState.data.firestore.researchReminders ? 'Yes' : 'No'} theme={theme} ok={diagState.data.firestore.researchReminders} />
                          <DiagRow label="AM Enabled" value={`${diagState.data.firestore.amEnabled ? 'Yes' : 'No'} @ ${diagState.data.firestore.amTime}`} theme={theme} />
                          <DiagRow label="PM Enabled" value={`${diagState.data.firestore.pmEnabled ? 'Yes' : 'No'} @ ${diagState.data.firestore.pmTime}`} theme={theme} />
                        </>
                      )}
                      
                      <div className="h-px my-1" style={{ backgroundColor: theme.border + '40' }} />
                      <DiagRow label="Local Time" value={diagState.data.localTime} theme={theme} />
                    </>
                  )}
                  
                  <button
                    onClick={() => setDiagState(prev => ({ ...prev, open: false }))}
                    className="w-full text-center py-1 text-[10px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity mt-1"
                    style={{ color: theme.text }}
                  >
                    Close
                  </button>
                </div>
              )}

              <p className="text-[10px] opacity-40 text-center leading-relaxed" style={{ color: theme.text }}>
                Test sends a real push notification via Firebase. Diagnostics show what the server sees when deciding to send your reminders.
              </p>
            </div>
          </div>
        )}

      </div>

    </section>
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

const SettingToggle = ({ checked, onChange, label, description, theme, disabled, isLast }) => (
  <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: (checked && !disabled) ? theme.primary + '15' : theme.secondary }}
      >
        <Bell size={16} style={{ color: (checked && !disabled) ? theme.primary : theme.text }} className={checked ? 'opacity-100' : 'opacity-40'} />
      </div>
      <div>
        <div className="text-sm font-bold mb-0.5" style={{ color: theme.text }}>
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

