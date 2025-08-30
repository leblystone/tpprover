  import React, { useEffect, useState } from 'react'
  import { useOutletContext } from 'react-router-dom'
  import { themes, defaultThemeName } from '../theme/themes'
  import { exportToCSV } from '../utils/export'
  import { clearAppData, clearSpecific } from '../utils/reset'
  import { clearMockData } from '../utils/seed'
  import TermsOfServiceModal from '../components/legal/TermsOfServiceModal'

  // Settings persistence (local-only)
  function loadSettings() {
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
      },
      privacy: {
        analytics: false,
        functional: true,
        marketing: false,
        dataSharing: false,
      },
    }
  }

  export default function Settings() {
    const { theme } = useOutletContext()
    const [pwaPrompted, setPWAPrompted] = useState(false)
    const [selectedTheme, setSelectedTheme] = useState(() => {
        try { return localStorage.getItem('tpprover_theme') || defaultThemeName } catch { return defaultThemeName }
    })
    const [showTerms, setShowTerms] = useState(false)
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
      const removed = clearAppData('tpprover_')
      try { ['tpprover_orders_bump','tpprover_calendar_bump'].forEach(k => localStorage.removeItem(k)) } catch {}
      setTimeout(() => window.location.reload(), 200)
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

    return (
      <section className="space-y-6">
        {/* Notifications */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: theme.primaryDark }}>Notifications</h2>
          <p className="text-sm text-gray-500 mb-4">Choose how you want to be notified.</p>
          <div className="space-y-3">
            <SettingToggle checked={settings.notifications.email} onChange={v => update('notifications.email', v)} label="Email Notifications" description="Receive summaries, updates, and news." theme={theme} />
            <SettingToggle checked={settings.notifications.push} onChange={v => update('notifications.push', v)} label="Push Notifications" description="Get notified in real-time on your devices." theme={theme} />
            <SettingToggle checked={settings.notifications.billing} onChange={v => update('notifications.billing', v)} label="Billing Updates" description="Get notified about invoices and payment status." theme={theme} />
            <SettingToggle checked={settings.notifications.researchReminders} onChange={v => update('notifications.researchReminders', v)} label="Research Reminders" description="Stay on track with your research schedule." theme={theme} />
            <SettingToggle checked={settings.notifications.groupBuys} onChange={v => update('notifications.groupBuys', v)} label="Group Buy Updates" description="Get alerts for new group buy opportunities." theme={theme} />
          </div>
        </div>

        {/* Theme & Appearance */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>Theme</label>
              <select
                value={selectedTheme}
                onChange={handleThemeChange}
                className="w-full p-2 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
              >
                {Object.keys(themes).filter(t => t !== 'beekeeper').map(t => <option key={t} value={t}>{themes[t].name}</option>)}
              </select>
            </div>
            <SettingSelect label="Font Size" value={settings.appearance.fontScale} onChange={e => update('appearance.fontScale', e.target.value)} options={[{ value: '0.9', label: 'Small' }, { value: '1.0', label: 'Default' }, { value: '1.1', label: 'Large' }, { value: '1.25', label: 'XL' }]} theme={theme} />
          </div>
        </div>

        {/* Region & Language */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: theme.primaryDark }}>Region & Language</h2>
          <p className="text-sm text-gray-500 mb-4">Set your preferences for language, time, and date.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SettingSelect label="Language" value={settings.region.language} onChange={e => update('region.language', e.target.value)} options={[{ value: 'en-US', label: 'English (US)' }, { value: 'en-GB', label: 'English (UK)' }, { value: 'es-ES', label: 'Español (ES)' }]} theme={theme} />
            <SettingSelect label="Time Zone" value={settings.region.timeZone} onChange={e => update('region.timeZone', e.target.value)} options={tzList.map(tz => ({ value: tz, label: tz }))} theme={theme} />
            <SettingSelect label="Week Starts On" value={settings.region.weekStartsOn} onChange={e => update('region.weekStartsOn', e.target.value)} options={[{ value: 'sunday', label: 'Sunday' }, { value: 'monday', label: 'Monday' }]} theme={theme} />
          </div>
        </div>

        {/* Privacy & Cookies */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: theme.primaryDark }}>Privacy</h2>
          <p className="text-sm text-gray-500 mb-4">Manage your data and cookie preferences.</p>
          <div className="space-y-3">
            <SettingToggle checked={settings.privacy.functional} onChange={v => update('privacy.functional', v)} label="Functional Cookies" description="Required for the app to work correctly." theme={theme} disabled />
            <SettingToggle checked={settings.privacy.analytics} onChange={v => update('privacy.analytics', v)} label="Analytics Cookies" description="Help us improve the app with usage data." theme={theme} />
            <SettingToggle checked={settings.privacy.marketing} onChange={v => update('privacy.marketing', v)} label="Marketing Cookies" description="Allow personalized offers and ads." theme={theme} />
            <SettingToggle checked={settings.privacy.dataSharing} onChange={v => update('privacy.dataSharing', v)} label="Anonymous Usage Metrics" description="Help us improve by sharing anonymous data." theme={theme} />
          </div>
        </div>

        {/* Legal */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-1" style={{ color: theme.primaryDark }}>Legal</h2>
          <p className="text-sm text-gray-500 mb-4">Terms of Service and other legal documents.</p>
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
          </div>
        </div>

        {/* Data & App */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>Data Management</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={exportAll}>Export Backup (CSV)</button>
              <label className="px-3 py-2 rounded-md text-sm font-semibold cursor-pointer hover:opacity-90" style={{ backgroundColor: theme.accent, color: theme.accentText }}>
                Import Backup
                <input type="file" accept=".csv,.json" className="hidden" onChange={e => e.target.files && e.target.files[0] && importBackup(e.target.files[0])} />
              </label>
              <button
                className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
                onClick={handleInstall}
                disabled={!pwaPrompted}
                title={pwaPrompted ? 'Install The Pep Planner' : 'Install not available: use your browser menu to Add to Home Screen'}
              >
                Install App
              </button>
            </div>
            <div>
                <button 
                    onClick={() => {
                        if (window.confirm("Are you sure you want to remove all sample data? This action cannot be undone.")) {
                            clearMockData();
                            window.location.reload();
                        }
                    }}
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                    Remove Demo Data
                </button>
                <p className="text-xs text-gray-500 mt-1">Remove all the initial sample data to start with a clean slate.</p>
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
        </div>
        <TermsOfServiceModal open={showTerms} onClose={() => setShowTerms(false)} onAgree={null} theme={theme} />
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


