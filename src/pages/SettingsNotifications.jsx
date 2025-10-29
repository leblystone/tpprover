import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { loadSettings, saveSettings, getDefaultSettings } from '../utils/settingsHelpers'
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

  const update = (path, value) => {
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
          PushNotifications.addListener('registration', async (token) => {
            await savePushTokenToFirestore(token.value);
          });
          
          const result = await PushNotifications.requestPermissions();
          if (result.receive === 'granted') {
            await PushNotifications.register();
          } else {
            throw new Error('Push notification permission denied');
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
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/settings')}
          className="p-2 rounded-lg hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.secondary }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Notifications</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Choose how you want to be notified</p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-3">
        <SettingToggle 
          checked={settings.notifications.push ?? false} 
          onChange={handlePWANotificationToggle}
          label="Push Notifications" 
          description="Get notified in real-time on your devices, even when the app is closed."
          theme={theme}
          disabled={!pwaNotificationStatus.supported || pwaNotificationStatus.loading}
        />
        <SettingToggle 
          checked={settings.notifications.researchReminders} 
          onChange={v => update('notifications.researchReminders', v)} 
          label="Research Reminders" 
          description="Stay on track with your research schedule." 
          theme={theme}
          disabled={!settings.notifications.push}
        />
        <SettingToggle 
          checked={settings.notifications.groupBuys} 
          onChange={v => update('notifications.groupBuys', v)} 
          label="Group Buy Updates" 
          description="Get alerts for new group buy opportunities." 
          theme={theme}
          disabled={!settings.notifications.push}
        />
        <SettingToggle 
          checked={settings.notifications?.lowStockAlerts ?? true} 
          onChange={v => update('notifications.lowStockAlerts', v)} 
          label="Low Stock Notifications" 
          description="Get notified when you're down to 3 or fewer vials" 
          theme={theme}
          disabled={!settings.notifications.push}
        />
        <SettingToggle 
          checked={settings.notifications?.orderStatusUpdates ?? true} 
          onChange={v => update('notifications.orderStatusUpdates', v)} 
          label="Order Status Updates" 
          description="Get notified about order arrivals and status changes" 
          theme={theme}
          disabled={!settings.notifications.push}
        />
        <SettingToggle 
          checked={settings.notifications?.washoutReminders ?? true} 
          onChange={v => update('notifications.washoutReminders', v)} 
          label="Washout Reminders" 
          description="Get reminded about washout periods between protocols" 
          theme={theme}
          disabled={!settings.notifications.push}
        />
        <SettingToggle 
          checked={settings.notifications?.cycleReminders ?? true} 
          onChange={v => update('notifications.cycleReminders', v)} 
          label="Cycle Reminders" 
          description="Get reminded about upcoming protocol cycles" 
          theme={theme}
          disabled={!settings.notifications.push}
        />
      </div>
    </section>
  )
}

const SettingToggle = ({ checked, onChange, label, description, theme, disabled }) => (
  <div 
    className="flex items-start justify-between p-4 rounded-lg"
    style={{ backgroundColor: theme.cardBackground }}
  >
    <div>
      <div className="text-sm font-medium" style={{ color: theme.text }}>{label}</div>
      <div className="text-xs" style={{ color: theme.mutedText }}>{description}</div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
      <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
           style={{ backgroundColor: checked ? theme.primary : '', opacity: disabled ? 0.5 : 1 }}></div>
    </label>
  </div>
)

