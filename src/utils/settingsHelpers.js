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

export function getDefaultSettings() {
  const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC'
  const defaults = {
    notifications: {
      email: true,
      push: false,
      billing: true,
      researchReminders: false,
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


