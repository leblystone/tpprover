import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { exportToCSV } from '../utils/export'
import { clearAppData, clearSpecific } from '../utils/reset'
import { clearMockData } from '../utils/seed'
import SuccessModal from '../components/ui/SuccessModal'
import SampleDataModal from '../components/ui/SampleDataModal'
import RemoveSampleDataModal from '../components/ui/RemoveSampleDataModal'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'

export default function SettingsData() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { refreshDataAfterClear } = useAppContext()
  const { firebaseUser } = useFirebase()

  const [pwaPrompted, setPWAPrompted] = useState(false)
  const [showDemoSuccessModal, setShowDemoSuccessModal] = useState(false)
  const [sampleDataAction, setSampleDataAction] = useState('removed')
  const [showSampleDataModal, setShowSampleDataModal] = useState(false)
  const [showRemoveSampleDataModal, setShowRemoveSampleDataModal] = useState(false)
  const [isAddingSampleData, setIsAddingSampleData] = useState(false)
  const [isRemovingSampleData, setIsRemovingSampleData] = useState(false)

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

  const exportAll = () => {
    const data = {
      protocols: JSON.parse(localStorage.getItem('tpprover_protocols') || '[]'),
      orders: JSON.parse(localStorage.getItem('tpprover_orders') || '[]'),
      stockpile: JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]'),
      supplements: JSON.parse(localStorage.getItem('tpprover_supplements') || '[]'),
      glossary: JSON.parse(localStorage.getItem('tpprover_glossary') || '[]'),
      vendors: JSON.parse(localStorage.getItem('tpprover_vendors') || '[]'),
      calendarNotes: JSON.parse(localStorage.getItem('tpprover_calendar_notes') || '{}'),
      scheduledBuys: JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]'),
      reconItems: JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]'),
      reconHistory: JSON.parse(localStorage.getItem('tpprover_recon_history') || '[]'),
      metrics: JSON.parse(localStorage.getItem('tpprover_metrics') || '[]'),
    }
    const allData = [
      ...data.protocols.map(d => ({ type: 'protocol', ...d })),
      ...data.orders.map(d => ({ type: 'order', ...d })),
      ...data.stockpile.map(d => ({ type: 'stockpile', ...d })),
      ...data.supplements.map(d => ({ type: 'supplement', ...d })),
      ...data.glossary.map(d => ({ type: 'glossary', ...d })),
      ...data.vendors.map(d => ({ type: 'vendor', ...d })),
      ...data.scheduledBuys.map(d => ({ type: 'scheduled_buy', ...d })),
      ...data.reconItems.map(d => ({ type: 'recon_item', ...d })),
      ...data.reconHistory.map(d => ({ type: 'recon_history', ...d })),
      ...data.metrics.map(d => ({ type: 'metric', ...d })),
    ];
    exportToCSV(allData, `tpprover-backup-${new Date().toISOString().slice(0,10)}.csv`);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Backup exported successfully as CSV!', type: 'success' } 
    }));
  }

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const importBackup = async (file) => {
    try {
      const text = await file.text()
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error('File is empty');
        }
        
        const firstLine = lines[0].startsWith('\uFEFF') ? lines[0].slice(1) : lines[0];
        const headers = parseCSVLine(firstLine);
        const rows = lines.slice(1).map(line => {
          const values = parseCSVLine(line);
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        data = {
          protocols: rows.filter(r => r.type === 'protocol').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          orders: rows.filter(r => r.type === 'order').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          stockpile: rows.filter(r => r.type === 'stockpile').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          supplements: rows.filter(r => r.type === 'supplement').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          glossary: rows.filter(r => r.type === 'glossary').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          vendors: rows.filter(r => r.type === 'vendor').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          scheduledBuys: rows.filter(r => r.type === 'scheduled_buy').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          reconItems: rows.filter(r => r.type === 'recon_item').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          reconHistory: rows.filter(r => r.type === 'recon_history').map(r => {
            const { type, ...rest } = r;
            return rest;
          }),
          metrics: rows.filter(r => r.type === 'metric').map(r => {
            const { type, ...rest } = r;
            return rest;
          })
        };
      }
      
      if (data.protocols) localStorage.setItem('tpprover_protocols', JSON.stringify(data.protocols))
      if (data.orders) localStorage.setItem('tpprover_orders', JSON.stringify(data.orders))
      if (data.stockpile) localStorage.setItem('tpprover_stockpile', JSON.stringify(data.stockpile))
      if (data.supplements) localStorage.setItem('tpprover_supplements', JSON.stringify(data.supplements))
      if (data.glossary) localStorage.setItem('tpprover_glossary', JSON.stringify(data.glossary))
      if (data.vendors) localStorage.setItem('tpprover_vendors', JSON.stringify(data.vendors))
      if (data.calendarNotes) localStorage.setItem('tpprover_calendar_notes', JSON.stringify(data.calendarNotes))
      if (data.scheduledBuys) localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(data.scheduledBuys))
      if (data.reconItems) localStorage.setItem('tpprover_recon_items', JSON.stringify(data.reconItems))
      if (data.reconHistory) localStorage.setItem('tpprover_recon_history', JSON.stringify(data.reconHistory))
      if (data.metrics) localStorage.setItem('tpprover_metrics', JSON.stringify(data.metrics))
      
      const itemCounts = {
        protocols: data.protocols?.length || 0,
        orders: data.orders?.length || 0,
        stockpile: data.stockpile?.length || 0,
        supplements: data.supplements?.length || 0,
        glossary: data.glossary?.length || 0,
        vendors: data.vendors?.length || 0,
        scheduledBuys: data.scheduledBuys?.length || 0,
        reconItems: data.reconItems?.length || 0,
        reconHistory: data.reconHistory?.length || 0,
        metrics: data.metrics?.length || 0
      };
      
      const totalItems = Object.values(itemCounts).reduce((sum, count) => sum + count, 0);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: `Backup imported successfully! ${totalItems} items restored. Refreshing...`, 
          type: 'success' 
        } 
      }))
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      console.error('Error importing backup:', e)
      let errorMessage = 'Error importing backup. ';
      if (e.message?.includes('empty')) {
        errorMessage += 'The file appears to be empty.';
      } else if (e.message?.includes('JSON')) {
        errorMessage += 'Invalid file format. Please use a CSV or JSON backup file.';
      } else {
        errorMessage += 'Please check the file format and try again.';
      }
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: errorMessage, type: 'error' } 
      }))
    }
  }

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to permanently delete ALL data? This will log you out and cannot be undone.")) {
      try {
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
        window.location.href = '/login';
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

  const handleAddSampleData = async () => {
    setIsAddingSampleData(true);
    try {
      const { seedSampleDataToCloud } = await import('../services/demoDataSeeder');
      
      if (firebaseUser) {
        const seeded = await seedSampleDataToCloud(firebaseUser.uid, null);
        if (seeded) {
          localStorage.removeItem('tpprover_sample_data_cleared');
          localStorage.removeItem('tpprover_sample_banner_dismissed');
          setShowSampleDataModal(false);
          
          refreshDataAfterClear();
          
          setSampleDataAction('added');
          setShowDemoSuccessModal(true);
        } else {
          alert('Failed to add sample data. Check console for details.');
        }
      } else {
        alert('You must be logged in to add sample data.');
      }
    } catch (error) {
      console.error('❌ Adding sample data failed:', error);
      alert('Error adding sample data: ' + error.message);
    } finally {
      setIsAddingSampleData(false);
    }
  };

  const handleRemoveSampleData = async () => {
    setIsRemovingSampleData(true);
    try {
      clearMockData();
      
      localStorage.setItem('tpprover_sample_data_cleared', 'true');
      localStorage.setItem('tpprover_sample_banner_dismissed', 'true');
      
      refreshDataAfterClear();
      
      setShowRemoveSampleDataModal(false);
      setSampleDataAction('removed');
      setShowDemoSuccessModal(true);
    } catch (error) {
      console.error('❌ Removing sample data failed:', error);
      alert('Error removing sample data: ' + error.message);
    } finally {
      setIsRemovingSampleData(false);
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
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Data Management</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Export, import, and manage your app data</p>
        </div>
      </div>

      {/* Data Settings */}
      <div className="space-y-6">
        {/* Backup Section */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium" style={{ color: theme.text }}>Backup & Restore</h4>
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all" 
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} 
              onClick={exportAll}
            >
              Export Backup (CSV)
            </button>
            <label 
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-all" 
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              Import Backup
              <input type="file" accept=".csv,.json" className="hidden" onChange={e => e.target.files && e.target.files[0] && importBackup(e.target.files[0])} />
            </label>
            {pwaPrompted && (
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all" 
                style={{ backgroundColor: theme.accent, color: theme.accentText }} 
                onClick={handleInstall}
              >
                Install App
              </button>
            )}
          </div>
        </div>

        {/* Sample Data Section */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium" style={{ color: theme.text }}>Sample Data</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <button 
                onClick={() => setShowRemoveSampleDataModal(true)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
              >
                Remove Sample Data
              </button>
              <p className="text-xs text-gray-500">Remove sample content</p>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setShowSampleDataModal(true)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-all"
              >
                Add Sample Data
              </button>
              <p className="text-xs text-gray-500">Add examples to explore</p>
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium text-red-600">Danger Zone</h4>
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all" 
              onClick={clearSessionOnly}
            >
              Clear Session Only
            </button>
            <button 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all" 
              onClick={clearAllData}
            >
              Clear ALL Data
            </button>
          </div>
          <p className="text-xs text-gray-500">"Clear ALL" will permanently wipe all data in this browser. This cannot be undone.</p>
        </div>
      </div>

      <SuccessModal
        open={showDemoSuccessModal}
        onClose={() => setShowDemoSuccessModal(false)}
        title={sampleDataAction === 'added' ? "Sample Data Added!" : "Sample Data Removed!"}
        message={sampleDataAction === 'added' 
          ? "Sample data has been successfully added to help you explore the app features. Your personal entries remain safe and intact."
          : "All sample data has been successfully removed. Your personal entries remain safe and intact."
        }
        theme={theme}
      />
      <SampleDataModal
        open={showSampleDataModal}
        onClose={() => setShowSampleDataModal(false)}
        onAddSampleData={handleAddSampleData}
        theme={theme}
        isLoading={isAddingSampleData}
      />
      <RemoveSampleDataModal
        open={showRemoveSampleDataModal}
        onClose={() => setShowRemoveSampleDataModal(false)}
        onRemoveSampleData={handleRemoveSampleData}
        theme={theme}
        isLoading={isRemovingSampleData}
      />
    </section>
  )
}

