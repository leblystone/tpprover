import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { exportToCSV } from '../utils/export'
import { clearAppData, clearSpecific } from '../utils/reset'
import { clearMockData } from '../utils/seed'
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal'
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal'
import { useAppContext } from '../context/AppContext'
import SuccessModal from '../components/ui/SuccessModal'
import pwaNotificationService from '../services/pwaNotifications'
import CollapsibleSection from '../components/common/CollapsibleSection'
import { getCurrencyOptions } from '../utils/currencyUtils'
import { Bell, Palette, Settings as SettingsIcon, Shield, FileText, Trash2 } from 'lucide-react'

// PWA Notification Toggle Component
function PWANotificationToggle({ checked, onChange, status, theme }) {
  const getStatusText = () => {
    if (!status.supported) return 'Not supported in this browser';
    if (status.loading) return 'Updating...';
    if (status.permission === 'denied') return 'Permission denied - enable in browser settings';
    if (status.permission === 'default') return 'Click to enable native notifications';
    if (checked) return 'Native notifications enabled';
    return 'Click to enable native notifications';
  };

  const getStatusColor = () => {
    if (!status.supported || status.permission === 'denied') return theme.error;
    if (status.loading) return theme.warning;
    if (checked) return theme.success;
    return theme.textLight;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium" style={{ color: theme.text }}>Push Notifications</h3>
          {status.supported && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: theme.accent + '20', color: theme.text }}>
              PWA
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </p>
        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
          Get notified in real-time on your devices, even when the app is closed.
        </p>
      </div>
      <div className="ml-4">
        <button
          onClick={() => onChange(!checked)}
          disabled={!status.supported || status.loading || status.permission === 'denied'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            checked ? 'bg-green-600' : 'bg-gray-200'
          } ${status.loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            backgroundColor: checked ? theme.success : theme.border,
            focusRingColor: theme.primary
          }}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// Settings persistence (local-only)
export function loadSettings() {
  try { return JSON.parse(localStorage.getItem('tpprover_settings') || 'null') } catch { return null }
}
function saveSettings(obj) {
  try { localStorage.setItem('tpprover_settings', JSON.stringify(obj)) } catch {}
}
function getDefaultSettings() {
  const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC'
  return {
    notifications: {
      email: true,
      push: false,
      billing: true,
      researchReminders: true,
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
      defaultView: 'month', // 'month' | 'week' | 'day'
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
    },
    ui: {
      showTooltips: true, // Show helpful tooltips
      animationsEnabled: true, // Enable/disable animations
    },
    privacy: {
      analytics: true,
      functional: true,
      dataSharing: true,
    },
  }
}

export default function Settings() {
  // Settings page component
  const { theme } = useOutletContext()
  const { refreshDataAfterClear } = useAppContext()
  const [pwaPrompted, setPWAPrompted] = useState(false)
  
  // PWA Notification state
  const [pwaNotificationStatus, setPwaNotificationStatus] = useState({
    supported: false,
    permission: 'default',
    enabled: false,
    loading: false
  })
  
  // Currency options for the dropdown
  const currencyOptions = getCurrencyOptions()
    const [selectedTheme, setSelectedTheme] = useState(() => {
        try { 
            const savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
            // Migrate users from beekeeper theme to sage theme
            if (savedTheme === 'beekeeper') {
                localStorage.setItem('tpprover_theme', defaultThemeName);
                return defaultThemeName;
            }
            // Ensure the theme exists in the themes object
            if (themes[savedTheme]) {
                return savedTheme;
            }
            return defaultThemeName;
        } catch { 
            return defaultThemeName 
        }
    })
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)
    const [showDemoSuccessModal, setShowDemoSuccessModal] = useState(false)
    const [user, setUser] = useState(() => {
      try { return JSON.parse(localStorage.getItem('tpprover_user') || '{}') } catch { return {} }
    })

    // Settings state
    const [settings, setSettings] = useState(() => loadSettings() || getDefaultSettings())

    useEffect(() => {
        // Apply font scaling from settings
        try {
            const scale = settings?.appearance?.fontScale || '1.0';
            document.documentElement.style.fontSize = `${parseFloat(scale) * 16}px`;
        } catch {}
    }, [settings?.appearance?.fontScale]);

    // Initialize PWA notification status
    useEffect(() => {
        const updatePWAStatus = () => {
            const status = pwaNotificationService.getStatus();
            setPwaNotificationStatus({
                supported: status.supported,
                permission: status.permission,
                enabled: status.enabled,
                loading: false
            });
        };

        // Initial status check
        updatePWAStatus();

        // Listen for PWA notification events
        const handleEnabled = () => updatePWAStatus();
        const handleDisabled = () => updatePWAStatus();

        window.addEventListener('pwa-notifications-enabled', handleEnabled);
        window.addEventListener('pwa-notifications-disabled', handleDisabled);

        return () => {
            window.removeEventListener('pwa-notifications-enabled', handleEnabled);
            window.removeEventListener('pwa-notifications-disabled', handleDisabled);
        };
    }, []);

    const tzList = (() => {
      const common = ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Europe/Berlin','Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Australia/Sydney']
      const cur = settings?.region?.timeZone
      const all = Array.from(new Set([cur, ...common].filter(Boolean)))
      return all
    })()

    useEffect(() => {
      const handler = (e) => {
        e.preventDefault()
        setPWAPrompted(true)
        window.deferredPrompt = e
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
      const prompt = window.deferredPrompt
      if (prompt) {
        prompt.prompt()
        await prompt.userChoice
        window.deferredPrompt = null
        setPWAPrompted(false)
      }
    }

    const handleThemeChange = (e) => {
      setSelectedTheme(e.target.value);
      try { localStorage.setItem('tpprover_theme', e.target.value); } catch {}
      window.location.reload();
    };

    const exportAll = () => {
      const data = {
        protocols: JSON.parse(localStorage.getItem('tpprover_protocols') || '[]'),
        orders: JSON.parse(localStorage.getItem('tpprover_orders') || '[]'),
        stockpile: JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]'),
        supplements: JSON.parse(localStorage.getItem('tpprover_supplements') || '[]'),
        glossary: JSON.parse(localStorage.getItem('tpprover_glossary') || '[]'),
      }
      const allData = [
          ...data.protocols.map(d => ({ type: 'protocol', ...d })),
          ...data.orders.map(d => ({ type: 'order', ...d })),
          ...data.stockpile.map(d => ({ type: 'stockpile', ...d })),
          ...data.supplements.map(d => ({ type: 'supplement', ...d })),
          ...data.glossary.map(d => ({ type: 'glossary', ...d })),
      ];
      exportToCSV(allData, `tpprover-backup-${new Date().toISOString().slice(0,10)}.csv`);
    }

    const importBackup = async (file) => {
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.protocols) localStorage.setItem('tpprover_protocols', JSON.stringify(data.protocols))
        if (data.orders) localStorage.setItem('tpprover_orders', JSON.stringify(data.orders))
        if (data.stockpile) localStorage.setItem('tpprover_stockpile', JSON.stringify(data.stockpile))
        if (data.supplements) localStorage.setItem('tpprover_supplements', JSON.stringify(data.supplements))
        if (data.glossary) localStorage.setItem('tpprover_glossary', JSON.stringify(data.glossary))
      } catch (e) {
        // silent
      }
    }

    const clearAllData = () => {
        if (window.confirm("Are you sure you want to permanently delete ALL data? This will log you out and cannot be undone.")) {
            try {
                // Manually list all known keys for this app to ensure complete removal.
                const allAppKeys = [
                    'tpprover_protocols', 'tpprover_recon_items', 'tpprover_recon_history',
                    'tpprover_supplements', 'tpprover_orders', 'tpprover_metrics',
                    'tpprover_vendors', 'tpprover_calendar_notes', 'tpprover_stockpile',
                    'tpprover_scheduled_buys', 'tpprover_auth_token', 'tpprover_user',
                    'tpprover_settings', 'tpprover_theme', 'tpprover_has_onboarded',
                    'tpprover_has_seeded', 'tpprover_demo_data_cleared', 
                    'tpprover_demo_banner_dismissed'
                ];
                allAppKeys.forEach(key => localStorage.removeItem(key));
                window.location.href = '/login'; // Redirect to login after wipe
            } catch (e) {
                console.error("Failed to clear all data", e);
                window.location.reload();
            }
        }
    }

    const clearSessionOnly = () => {
      const keys = ['tpprover_user','tpprover_is_tester','tpprover_vendors_import_hint','tpprover_protocols_import_hint','tpprover_calendar_bump','tpprover_orders_bump','tpprover_recon_prefill','tpprover_theme']
      clearSpecific(keys)
    }

    const update = (path, value) => {
      const next = { ...settings }
      const segs = path.split('.')
      let ref = next
      for (let i=0; i<segs.length-1; i++) ref = ref[segs[i]]
      ref[segs[segs.length-1]] = value
      setSettings(next)
      saveSettings(next)
    }

    // Handle PWA notification toggle
    const handlePWANotificationToggle = async (enabled) => {
      if (pwaNotificationStatus.loading) return;
      
      setPwaNotificationStatus(prev => ({ ...prev, loading: true }));
      
      try {
        if (enabled) {
          await pwaNotificationService.enable();
          // Update local settings
          update('notifications.push', true);
        } else {
          await pwaNotificationService.disable();
          // Update local settings
          update('notifications.push', false);
        }
      } catch (error) {
        console.error('Failed to toggle PWA notifications:', error);
        
        // Show error message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: error.message || 'Failed to update notification settings', 
            type: 'error' 
          } 
        }));
        
        // Reset loading state
        setPwaNotificationStatus(prev => ({ ...prev, loading: false }));
      }
    };

    return (
      <section className="space-y-4">
        {/* Notifications */}
        <CollapsibleSection
          title="Notifications"
          description="Choose how you want to be notified"
          icon={Bell}
          theme={theme}
          defaultExpanded={true}
        >
          <div className="space-y-3">
            <SettingToggle checked={settings.notifications.email} onChange={v => update('notifications.email', v)} label="Email Notifications" description="Receive summaries, updates, and news." theme={theme} />
            <PWANotificationToggle 
              checked={pwaNotificationStatus.enabled} 
              onChange={handlePWANotificationToggle}
              status={pwaNotificationStatus}
              theme={theme}
            />
            <SettingToggle checked={settings.notifications.billing} onChange={v => update('notifications.billing', v)} label="Billing Updates" description="Get notified about invoices and payment status." theme={theme} />
            <SettingToggle checked={settings.notifications.researchReminders} onChange={v => update('notifications.researchReminders', v)} label="Research Reminders" description="Stay on track with your research schedule." theme={theme} />
            <SettingToggle checked={settings.notifications.groupBuys} onChange={v => update('notifications.groupBuys', v)} label="Group Buy Updates" description="Get alerts for new group buy opportunities." theme={theme} />
          </div>
        </CollapsibleSection>

        {/* Theme & Appearance */}
        <CollapsibleSection
          title="Appearance"
          description="Customize your app's look and feel"
          icon={Palette}
          theme={theme}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>Theme</label>
              <select
                value={selectedTheme}
                onChange={handleThemeChange}
                className="w-full p-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
              >
                {Object.keys(themes).map(t => <option key={t} value={t}>{themes[t].name}</option>)}
              </select>
            </div>
            <SettingSelect label="Font Size" value={settings.appearance.fontScale} onChange={e => update('appearance.fontScale', e.target.value)} options={[{ value: '0.9', label: 'Small' }, { value: '1.0', label: 'Default' }, { value: '1.1', label: 'Large' }, { value: '1.25', label: 'XL' }]} theme={theme} />
          </div>
        </CollapsibleSection>

        {/* App Preferences */}
        <CollapsibleSection
          title="App Preferences"
          description="Customize language, currency, tracking, and other app settings"
          icon={SettingsIcon}
          theme={theme}
        >
          <div className="space-y-4">
            <SettingToggle checked={settings.tracking?.injectionSites ?? true} onChange={v => update('tracking.injectionSites', v)} label="Injection Site Tracking" description="Track injection sites for better rotation and history" theme={theme} />
            <SettingToggle checked={settings.features?.groupBuys ?? true} onChange={v => update('features.groupBuys', v)} label="Group Buy Features" description="Enable group buy functionality and related features" theme={theme} />
            <SettingToggle checked={settings.features?.analytics ?? true} onChange={v => update('features.analytics', v)} label="Analytics Dashboard" description="Show analytics and metrics in dashboard" theme={theme} />
            <SettingToggle checked={settings.research?.showDosageWarnings ?? true} onChange={v => update('research.showDosageWarnings', v)} label="Dosage Warnings" description="Show warnings for unusual dosages" theme={theme} />
            <SettingToggle checked={settings.orders?.autoStockpileUpdate ?? true} onChange={v => update('orders.autoStockpileUpdate', v)} label="Auto Stockpile Updates" description="Automatically add delivered orders to stockpile" theme={theme} />
            <SettingToggle checked={settings.orders?.lowStockAlerts ?? true} onChange={v => update('orders.lowStockAlerts', v)} label="Low Stock Alerts" description="Get notified when stock is running low" theme={theme} />
            <SettingToggle checked={settings.notifications?.lowStockAlerts ?? true} onChange={v => update('notifications.lowStockAlerts', v)} label="Low Stock Notifications" description="Get notified when you're down to 3 or fewer vials" theme={theme} />
            <SettingToggle checked={settings.notifications?.orderStatusUpdates ?? true} onChange={v => update('notifications.orderStatusUpdates', v)} label="Order Status Updates" description="Get notified about order arrivals and status changes" theme={theme} />
            <SettingToggle checked={settings.notifications?.washoutReminders ?? true} onChange={v => update('notifications.washoutReminders', v)} label="Washout Reminders" description="Get reminded about washout periods between protocols" theme={theme} />
            <SettingToggle checked={settings.notifications?.cycleReminders ?? true} onChange={v => update('notifications.cycleReminders', v)} label="Cycle Reminders" description="Get reminded about upcoming protocol cycles" theme={theme} />
            <SettingToggle checked={settings.ui?.showTooltips ?? true} onChange={v => update('ui.showTooltips', v)} label="Show Tooltips" description="Display helpful tooltips throughout the app" theme={theme} />
            <SettingToggle checked={settings.ui?.animationsEnabled ?? true} onChange={v => update('ui.animationsEnabled', v)} label="Animations" description="Enable smooth animations and transitions" theme={theme} />
            <SettingSelect label="Week Starts On" value={settings.region.weekStartsOn} onChange={e => update('region.weekStartsOn', e.target.value)} options={[{ value: 'sunday', label: 'Sunday' }, { value: 'monday', label: 'Monday' }]} theme={theme} />
            <SettingSelect label="Language" value={settings.region.language} onChange={e => update('region.language', e.target.value)} options={[{ value: 'en-US', label: 'English (US)' }, { value: 'en-GB', label: 'English (UK)' }, { value: 'es-ES', label: 'Español (ES)' }]} theme={theme} />
            <SettingSelect label="Currency" value={settings.region.currency} onChange={e => update('region.currency', e.target.value)} options={currencyOptions} theme={theme} />
            <SettingSelect label="Time Zone" value={settings.region.timeZone} onChange={e => update('region.timeZone', e.target.value)} options={tzList.map(tz => ({ value: tz, label: tz }))} theme={theme} />
            <SettingSelect label="Time Format" value={settings.calendar?.timeFormat ?? '12h'} onChange={e => update('calendar.timeFormat', e.target.value)} options={[{ value: '12h', label: '12 Hour (AM/PM)' }, { value: '24h', label: '24 Hour' }]} theme={theme} />
            <SettingSelect label="Calendar Default View" value={settings.calendar?.defaultView ?? 'month'} onChange={e => update('calendar.defaultView', e.target.value)} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }]} theme={theme} />
          </div>
        </CollapsibleSection>

        {/* Privacy & Cookies */}
        <CollapsibleSection
          title="Privacy"
          description="Manage your data and cookie preferences"
          icon={Shield}
          theme={theme}
        >
          <div className="space-y-3">
            <SettingToggle checked={settings.privacy.functional} onChange={v => update('privacy.functional', v)} label="Functional Cookies" description="Required for the app to work correctly." theme={theme} disabled />
            <SettingToggle checked={settings.privacy.analytics} onChange={v => update('privacy.analytics', v)} label="Analytics Cookies" description="Help us improve the app with usage data." theme={theme} />
            <SettingToggle checked={settings.privacy.dataSharing} onChange={v => update('privacy.dataSharing', v)} label="Anonymous Usage Metrics" description="Help us improve by sharing anonymous data." theme={theme} />
          </div>
        </CollapsibleSection>

        {/* Legal */}
        <CollapsibleSection
          title="Legal & Privacy"
          description="Terms of Service, Privacy Policy, and other legal documents"
          icon={FileText}
          theme={theme}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Terms of Service</div>
                {user.termsAgreed?.date && (
                  <div className="text-xs text-gray-500">Agreed on {new Date(user.termsAgreed.date).toLocaleDateString()}</div>
                )}
              </div>
              <button onClick={() => setShowTerms(true)} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }}>View</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Privacy Policy</div>
                <div className="text-xs text-gray-500">How we collect, use, and protect your data</div>
              </div>
              <button onClick={() => setShowPrivacy(true)} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }}>View</button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Data & App */}
        <CollapsibleSection
          title="Data Management"
          description="Export, import, and manage your app data"
          icon={Trash2}
          theme={theme}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={exportAll}>Export Backup (CSV)</button>
              <label className="px-3 py-2 rounded-md text-sm font-semibold cursor-pointer hover:opacity-90" style={{ backgroundColor: theme.accent, color: theme.accentText }}>
                Import Backup
                <input type="file" accept=".csv,.json" className="hidden" onChange={e => e.target.files && e.target.files[0] && importBackup(e.target.files[0])} />
              </label>
              {pwaPrompted && <button className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={handleInstall}>Install App</button>}
            </div>
            <div>
                <button 
                    onClick={() => {
                        if (window.confirm("Are you sure you want to remove all demo data? Your own entries will not be affected.")) {
                            clearMockData();
                            // Set a flag to prevent re-seeding on next load
                            localStorage.setItem('tpprover_demo_data_cleared', 'true');
                            // Hide the banner permanently
                            localStorage.setItem('tpprover_demo_banner_dismissed', 'true');
                            // Refresh the app context data instead of reloading the page
                            refreshDataAfterClear();
                            
                            // Show modern success modal
                            setShowDemoSuccessModal(true);
                        }
                    }}
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                    Remove demo data
                </button>
                <p className="text-xs text-gray-500 mt-1">Remove all sample orders, protocols, etc., to start with a clean slate.</p>
            </div>
            <div>
              <div className="font-semibold text-red-600 mb-2">Danger Zone</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="px-3 py-2 rounded-md text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200" onClick={clearSessionOnly}>Clear Session Only</button>
                <button className="px-3 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700" onClick={clearAllData}>Clear ALL Data</button>
              </div>
              <p className="text-xs text-gray-500 mt-2">"Clear ALL" will permanently wipe all data in this browser. This cannot be undone.</p>
            </div>
          </div>
        </CollapsibleSection>
        <TermsOfServiceModal open={showTerms} onClose={() => setShowTerms(false)} onAgree={null} theme={theme} />
        <LandingPrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
        <SuccessModal
          open={showDemoSuccessModal}
          onClose={() => setShowDemoSuccessModal(false)}
          title="Demo Data Removed!"
          message="All sample data has been successfully removed. Your personal entries remain safe and intact."
          theme={theme}
        />
      </section>
    )
  }

const SettingToggle = ({ checked, onChange, label, description, theme, disabled }) => (
  <div className="flex items-start justify-between">
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
      <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
           style={{ backgroundColor: checked ? theme.primary : '', opacity: disabled ? 0.5 : 1 }}></div>
    </label>
  </div>
)

const SettingSelect = ({ label, value, onChange, options, theme }) => (
  <div>
    <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>{label}</label>
    <select className="w-full p-2 rounded-md border bg-white" value={value} onChange={onChange} style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)


