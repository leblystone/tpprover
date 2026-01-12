// Settings persistence (local-only)
// Cache settings to avoid repeated localStorage reads
let settingsCache = null;
let settingsCacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds cache

export function loadSettings() {
  try {
    // Use cache if available and fresh
    const now = Date.now();
    if (settingsCache && (now - settingsCacheTimestamp) < CACHE_DURATION) {
      return settingsCache;
    }
    
    const settings = JSON.parse(localStorage.getItem('tpprover_settings') || 'null')
    
    // Update cache
    settingsCache = settings;
    settingsCacheTimestamp = now;
    
    // Only log in development mode (first load only per session)
    if (import.meta.env.DEV && !window._settingsLoaded) {
      console.log('📥 Settings loaded from localStorage:', settings);
      window._settingsLoaded = true;
    }
    
    return settings
  } catch (error) {
    console.error('❌ Failed to load settings:', error)
    return null
  }
}

// Clear cache when settings are saved
export function clearSettingsCache() {
  settingsCache = null;
  settingsCacheTimestamp = 0;
}

export function saveSettings(obj) {
  try { 
    localStorage.setItem('tpprover_settings', JSON.stringify(obj))
    
    // Update cache
    settingsCache = obj;
    settingsCacheTimestamp = Date.now();
    
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log('✅ Settings saved to localStorage:', obj)
    }
  } catch (error) {
    console.error('❌ Failed to save settings:', error)
  }
}

/**
 * Get the device's local timezone
 * Works in web, iOS (WKWebView), and Android (Chrome WebView)
 * No permissions required - reads from system settings
 */
export function getLocalTimezone() {
  try {
    // Primary method: Intl.DateTimeFormat (works in modern browsers and Capacitor WebViews)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const options = Intl.DateTimeFormat().resolvedOptions();
      if (options && options.timeZone) {
        return options.timeZone;
      }
    }
    
    // Fallback: Calculate from timezone offset (works everywhere but less precise)
    const offset = -new Date().getTimezoneOffset(); // Negative because getTimezoneOffset returns opposite
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    
    // Return offset format as fallback (e.g., "UTC-5")
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (error) {
    console.warn('⚠️ Could not detect timezone, defaulting to UTC:', error);
    return 'UTC';
  }
}

/**
 * Load notification settings from Firestore
 * This ensures settings sync across devices/platforms
 */
export async function loadNotificationSettingsFromFirestore() {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
    if (!user?.email && !user?.uid) {
      // User not logged in, return null
      return null;
    }

    // Use uid if available, otherwise use email
    const userId = user.uid || user.email?.toLowerCase();
    if (!userId) {
      return null;
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const firestoreSettings = userData.notificationSettings;
    const firestoreRegionSettings = userData.settings?.region;

    if (!firestoreSettings) {
      return null;
    }

    // Map Firestore structure back to localStorage structure
    const notificationSettings = {
      push: firestoreSettings.push === true,
      billing: firestoreSettings.billing === true,
      researchReminders: firestoreSettings.researchReminders === true,
      researchReminderTime: firestoreSettings.researchReminderTime || '08:00',
      // AM/PM reminder settings
      researchRemindersAM: firestoreSettings.researchRemindersAM === true,
      researchReminderTimeAM: firestoreSettings.researchReminderTimeAM || '08:00',
      researchRemindersPM: firestoreSettings.researchRemindersPM === true,
      researchReminderTimePM: firestoreSettings.researchReminderTimePM || '18:00',
      groupBuys: firestoreSettings.groupBuys === true,
      lowStockAlerts: firestoreSettings.lowStockAlerts === true,
      orderStatusUpdates: firestoreSettings.orderStatusUpdates === true,
      washoutReminders: firestoreSettings.washoutReminders === true,
      cycleReminders: firestoreSettings.cycleReminders === true,
    };

    // Also get timezone if available
    const regionSettings = firestoreRegionSettings ? {
      timeZone: firestoreRegionSettings.timeZone || getLocalTimezone()
    } : null;

    if (import.meta.env.DEV) {
      console.log('📥 Notification settings loaded from Firestore:', notificationSettings);
    }

    return {
      notifications: notificationSettings,
      region: regionSettings
    };
  } catch (error) {
    console.error('❌ Failed to load notification settings from Firestore:', error);
    return null;
  }
}

/**
 * Sync notification settings to Firestore
 * This ensures the scheduled functions can read user preferences
 */
export async function syncNotificationSettingsToFirestore() {
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
    if (!user?.email && !user?.uid) {
      console.warn('📱 No user found, cannot sync notification settings to Firestore');
      return;
    }

    // Get settings from localStorage
    const settings = loadSettings();
    if (!settings?.notifications) {
      console.warn('📱 No notification settings found in localStorage');
      return;
    }

    // Use uid if available, otherwise use email
    const userId = user.uid || user.email?.toLowerCase();
    if (!userId) {
      console.warn('📱 No user ID found, cannot sync notification settings');
      return;
    }

    const userRef = doc(db, 'users', userId);
    
    // Sync notification settings to Firestore
    // Map localStorage structure to Firestore structure
    await setDoc(userRef, {
      notificationSettings: {
        push: settings.notifications.push === true,
        billing: settings.notifications.billing === true,
        researchReminders: settings.notifications.researchReminders === true,
        researchReminderTime: settings.notifications.researchReminderTime || '08:00', // HH:mm format
        // AM/PM reminder settings
        researchRemindersAM: settings.notifications.researchRemindersAM === true,
        researchReminderTimeAM: settings.notifications.researchReminderTimeAM || '08:00',
        researchRemindersPM: settings.notifications.researchRemindersPM === true,
        researchReminderTimePM: settings.notifications.researchReminderTimePM || '18:00',
        groupBuys: settings.notifications.groupBuys === true,
        lowStockAlerts: settings.notifications.lowStockAlerts === true,
        orderStatusUpdates: settings.notifications.orderStatusUpdates === true,
        washoutReminders: settings.notifications.washoutReminders === true,
        cycleReminders: settings.notifications.cycleReminders === true,
        lastUpdated: serverTimestamp()
      },
      // Also sync settings.region.timeZone for timezone-aware reminders
      settings: {
        region: {
          timeZone: settings.region?.timeZone || getLocalTimezone()
        }
      }
    }, { merge: true });

    if (import.meta.env.DEV) {
      console.log('✅ Notification settings synced to Firestore:', settings.notifications);
    }
  } catch (error) {
    console.error('❌ Failed to sync notification settings to Firestore:', error);
    // Don't throw - this is a background sync operation
  }
}

export function getDefaultSettings() {
  const tz = getLocalTimezone()
  const defaults = {
    notifications: {
      email: true,
      push: true,
      billing: true,
      researchReminders: true, // Legacy - kept for backward compatibility
      researchRemindersAM: false,
      researchReminderTimeAM: '08:00', // Default 8:00 AM in HH:mm format
      researchRemindersPM: false,
      researchReminderTimePM: '18:00', // Default 6:00 PM in HH:mm format
      groupBuys: true,
      lowStockAlerts: true,
      orderStatusUpdates: true,
      washoutReminders: true,
      cycleReminders: true,
    },
    appearance: {
      mode: 'system', // 'system' | 'light' | 'dark'
      fontScale: '1.0', // '0.9' | '1.0' | '1.1' | '1.25'
      highContrast: false,
    },
    region: {
      language: 'en-US',
      timeZone: tz,
      weekStartsOn: 'monday', // 'sunday' | 'monday'
      currency: 'USD', // 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF'
    },
    tracking: {
      injectionSites: true, // Track injection sites for rotation
    },
    features: {
      groupBuys: true, // Enable group buy features
      analytics: true, // Enable analytics dashboard
      metricsTracking: true, // Track usage metrics and progress
      toastNotifications: true, // Enable toast notifications
      showWashoutIcons: true, // Show washout icons in monthly calendar view
    },
    calendar: {
      defaultView: 'month', // 'month' | 'week'
      showWeekends: true, // Hide/show weekends in calendar
      timeFormat: '12h', // '12h' | '24h'
      reminderTime: 30, // Minutes before reminder (for notifications)
    },
    research: {
      autoCompleteTasks: false, // Auto-complete tasks when marked done
      showDosageWarnings: true, // Show dosage validation warnings
      protocolReminders: true, // Remind about protocol changes
      washoutReminders: true, // Remind about washout periods
    },
    orders: {
      autoStockpileUpdate: true, // Auto-add delivered orders to stockpile
      lowStockAlerts: true, // Alert when stock is low
      expiryTracking: true, // Track expiration dates
      costTracking: true, // Track cost per mg calculations
      lowStockThreshold: 3, // Alert when stock drops to this number
      includeShippingInCosts: true, // Include shipping costs in stockpile and reconstitution calculations
    },
    privacy: {
      analytics: true,
      functional: true,
      dataSharing: true,
    },
  }
  
  // Only log in development mode
  if (import.meta.env.DEV) {
    console.log('🔧 Default settings generated:', defaults)
  }
  return defaults
}


