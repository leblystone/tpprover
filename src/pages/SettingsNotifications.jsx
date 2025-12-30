import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, FlaskConical, Package, Send, RefreshCw, CreditCard } from 'lucide-react'
import { loadSettings, saveSettings, getDefaultSettings, syncNotificationSettingsToFirestore } from '../utils/settingsHelpers'
import pwaNotificationService from '../services/pwaNotifications'
import { Capacitor } from '@capacitor/core'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useFirebase } from '../context/FirebaseContext'

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
        pushEnabled: true,
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
          <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Notifications</h1>
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
      </div>
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

