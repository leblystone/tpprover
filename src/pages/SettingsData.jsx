import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { exportToCSV } from '../utils/export'
import { clearAppData, clearSpecific } from '../utils/reset'
import { useFirebase } from '../context/FirebaseContext'
import { useAppContext } from '../context/AppContext'
import { saveAppData } from '../services/cloudStorage'
import { ensurePublicOrderNumbers } from '../utils/orderNumbers'
import DeleteAccountModal from '../components/common/DeleteAccountModal'
import RecentlyDeleted from '../components/settings/RecentlyDeleted'

export default function SettingsData() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { firebaseUser } = useFirebase()
  const { 
    setProtocols, setOrders, setStockpile, setVendors, setReconItems, 
    setReconHistory, setSupplements, setMetrics, setCalendarNotes, setScheduledBuys 
  } = useAppContext()

  const [pwaPrompted, setPWAPrompted] = useState(false)
  const [recoveryStatus, setRecoveryStatus] = useState(null)
  const [hasRecoverySnapshot, setHasRecoverySnapshot] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [hasDeletionRequest, setHasDeletionRequest] = useState(false)

  // Check for recovery snapshot on mount and when it might appear
  useEffect(() => {
    const checkSnapshot = () => {
      const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
      setHasRecoverySnapshot(!!snapshot);
    };
    
    checkSnapshot();
    // Check every 2 seconds in case snapshot appears
    const interval = setInterval(checkSnapshot, 2000);
    return () => clearInterval(interval);
  }, [])

  // Check for deletion request status
  useEffect(() => {
    const checkDeletionRequest = () => {
      try {
        const deletionRequest = localStorage.getItem('tpprover_deletion_request_submitted');
        if (deletionRequest) {
          const data = JSON.parse(deletionRequest);
          // Only show if it's for the current user
          if (data.email === firebaseUser?.email) {
            setHasDeletionRequest(true);
          } else {
            setHasDeletionRequest(false);
          }
        } else {
          setHasDeletionRequest(false);
        }
      } catch (e) {
        console.error('Error checking deletion request:', e);
        setHasDeletionRequest(false);
      }
    };
    
    checkDeletionRequest();
    // Also check when modal closes
    const handleModalClose = () => {
      setTimeout(checkDeletionRequest, 100);
    };
    window.addEventListener('tpp:deletion-request-submitted', handleModalClose);
    return () => window.removeEventListener('tpp:deletion-request-submitted', handleModalClose);
  }, [firebaseUser?.email])

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
          'tpprover_has_seeded', 'tpprover_sample_data_cleared', 'tpprover_demo_data_cleared',
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

  const recoverFromSnapshot = async () => {
    try {
      setRecoveryStatus('checking');
      const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
      
      let snapshotData = null;
      
      if (snapshot) {
        const parsed = JSON.parse(snapshot);
        snapshotData = parsed.data;
      } else {
        // No snapshot, but check if localStorage has any data we can recover
        const hasLocalData = 
          localStorage.getItem('tpprover_protocols') ||
          localStorage.getItem('tpprover_orders') ||
          localStorage.getItem('tpprover_stockpile');
        
        if (hasLocalData) {
          // Recover from localStorage directly
          snapshotData = {
            protocols: JSON.parse(localStorage.getItem('tpprover_protocols') || '[]'),
            orders: JSON.parse(localStorage.getItem('tpprover_orders') || '[]'),
            stockpile: JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]'),
            vendors: JSON.parse(localStorage.getItem('tpprover_vendors') || '[]'),
            reconItems: JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]'),
            reconHistory: JSON.parse(localStorage.getItem('tpprover_recon_history') || '[]'),
            supplements: JSON.parse(localStorage.getItem('tpprover_supplements') || '[]'),
            metrics: JSON.parse(localStorage.getItem('tpprover_metrics') || '[]'),
            calendarNotes: JSON.parse(localStorage.getItem('tpprover_calendar_notes') || '{}'),
            scheduledBuys: JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]')
          };
        } else {
          setRecoveryStatus('no_snapshot');
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: 'No recovery data found.', type: 'error', duration: 4000 } 
          }));
          return;
        }
      }
      
      if (!snapshotData) {
        setRecoveryStatus('invalid');
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'No recovery data found.', type: 'error', duration: 4000 } 
        }));
        return;
      }

      // Check if there's actually any data to recover
      const hasAnyData = 
        (snapshotData.protocols && snapshotData.protocols.length > 0) ||
        (snapshotData.orders && snapshotData.orders.length > 0) ||
        (snapshotData.stockpile && snapshotData.stockpile.length > 0) ||
        (snapshotData.vendors && snapshotData.vendors.length > 0) ||
        (snapshotData.reconItems && snapshotData.reconItems.length > 0) ||
        (snapshotData.supplements && snapshotData.supplements.length > 0) ||
        (snapshotData.metrics && snapshotData.metrics.length > 0) ||
        (snapshotData.scheduledBuys && snapshotData.scheduledBuys.length > 0) ||
        (snapshotData.calendarNotes && Object.keys(snapshotData.calendarNotes).length > 0);

      if (!hasAnyData) {
        setRecoveryStatus('no_data');
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'No recovery data found.', type: 'error', duration: 4000 } 
        }));
        return;
      }

      setRecoveryStatus('restoring');

      // Restore to React state
      if (snapshotData.protocols) {
        setProtocols(snapshotData.protocols);
        localStorage.setItem('tpprover_protocols', JSON.stringify(snapshotData.protocols));
      }
      if (snapshotData.orders) {
        const orders = ensurePublicOrderNumbers(snapshotData.orders);
        setOrders(orders);
        localStorage.setItem('tpprover_orders', JSON.stringify(orders));
      }
      if (snapshotData.stockpile) {
        setStockpile(snapshotData.stockpile);
        localStorage.setItem('tpprover_stockpile', JSON.stringify(snapshotData.stockpile));
      }
      if (snapshotData.vendors) {
        setVendors(snapshotData.vendors);
        localStorage.setItem('tpprover_vendors', JSON.stringify(snapshotData.vendors));
      }
      if (snapshotData.reconItems) {
        setReconItems(snapshotData.reconItems);
        localStorage.setItem('tpprover_recon_items', JSON.stringify(snapshotData.reconItems));
      }
      if (snapshotData.reconHistory) {
        setReconHistory(snapshotData.reconHistory);
        localStorage.setItem('tpprover_recon_history', JSON.stringify(snapshotData.reconHistory));
      }
      if (snapshotData.supplements) {
        setSupplements(snapshotData.supplements);
        localStorage.setItem('tpprover_supplements', JSON.stringify(snapshotData.supplements));
      }
      if (snapshotData.metrics) {
        setMetrics(snapshotData.metrics);
        localStorage.setItem('tpprover_metrics', JSON.stringify(snapshotData.metrics));
      }
      if (snapshotData.calendarNotes) {
        setCalendarNotes(snapshotData.calendarNotes);
        localStorage.setItem('tpprover_calendar_notes', JSON.stringify(snapshotData.calendarNotes));
      }
      if (snapshotData.scheduledBuys) {
        setScheduledBuys(snapshotData.scheduledBuys);
        localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(snapshotData.scheduledBuys));
      }

      // Attempt to sync to cloud
      setRecoveryStatus('syncing');
      const syncResult = await saveAppData(firebaseUser.uid, snapshotData, { skipMerge: true });
      
      if (syncResult) {
        setRecoveryStatus('success');
        const itemCount = Object.values(snapshotData).reduce((sum, arr) => {
          if (Array.isArray(arr)) return sum + arr.length;
          if (typeof arr === 'object' && arr !== null) return sum + Object.keys(arr).length;
          return sum;
        }, 0);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: `Your research data has been recovered! ${itemCount} item${itemCount !== 1 ? 's' : ''} restored.`, 
            type: 'success',
            duration: 5000
          } 
        }));
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRecoveryStatus('sync_failed');
        const itemCount = Object.values(snapshotData).reduce((sum, arr) => {
          if (Array.isArray(arr)) return sum + arr.length;
          if (typeof arr === 'object' && arr !== null) return sum + Object.keys(arr).length;
          return sum;
        }, 0);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: `Your research data has been recovered on this device (${itemCount} item${itemCount !== 1 ? 's' : ''}), but couldn't sync to your other devices. Your data is safe here.`, 
            type: 'warning',
            duration: 5000
          } 
        }));
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      setRecoveryStatus('error');
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Unable to recover your data. Please try again later.', type: 'error', duration: 4000 } 
      }));
    }
  }

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
          <p className="text-sm" style={{ color: theme.mutedText }}>Recover and manage your app data</p>
        </div>
      </div>

      {/* Data Settings */}
      <div className="space-y-4">
        {/* Deletion Request Chip */}
        {hasDeletionRequest && (
          <div 
            className="p-3 rounded-lg border flex items-center gap-3"
            style={{ 
              backgroundColor: theme?.isDark ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
              borderColor: '#dc2626'
            }}
          >
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: '#dc2626' }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
                Account Deletion Request Submitted
              </p>
              <p className="text-xs mt-0.5" style={{ color: theme?.textLight }}>
                Your account will be deleted within 48 hours. A confirmation email will be sent upon completion.
              </p>
            </div>
          </div>
        )}

        {/* Recently Deleted Section */}
        <RecentlyDeleted theme={theme} />

        {/* Recovery Section */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Data Recovery</h4>
          <p className="text-xs mb-3" style={{ color: theme.mutedText }}>
            If your research data isn't showing up, this will check for any saved backups and restore them to your account. Your data will be synced across all your devices.
          </p>
          <div className="space-y-2">
            <button 
              className="w-full px-4 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg" 
              style={{ 
                background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)', 
                color: '#ffffff' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
              }}
              onClick={recoverFromSnapshot}
              disabled={recoveryStatus === 'restoring' || recoveryStatus === 'syncing'}
            >
              <RotateCcw size={16} className={recoveryStatus === 'restoring' || recoveryStatus === 'syncing' ? 'animate-spin' : ''} />
              {recoveryStatus === 'checking' && 'Checking...'}
              {recoveryStatus === 'restoring' && 'Restoring...'}
              {recoveryStatus === 'syncing' && 'Syncing...'}
              {recoveryStatus === 'success' && 'Recovered!'}
              {!recoveryStatus && 'Recover Data'}
            </button>
            {pwaPrompted && (
              <button 
                className="w-full px-4 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-all" 
                style={{ backgroundColor: theme.accent, color: theme.accentText }} 
                onClick={handleInstall}
              >
                Install App
              </button>
            )}
          </div>
        </div>

        {/* Danger Zone Section */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground, borderColor: '#8B1A1A', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: '#8B1A1A' }}>Danger Zone</h4>
          <div className="space-y-2">
            <button 
              className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: theme.secondary, color: theme.text }}
              onClick={clearSessionOnly}
            >
              Clear Session Only
            </button>
            <button 
              className="w-full px-4 py-3 rounded-lg text-sm font-medium text-white transition-all" 
              style={{ backgroundColor: '#8B1A1A' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A1515'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B1A1A'}
              onClick={clearAllData}
            >
              Clear ALL Data
            </button>
            <button 
              className="w-full px-4 py-3 rounded-lg text-sm font-medium text-white transition-all" 
              style={{ backgroundColor: '#8B1A1A' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A1515'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B1A1A'}
              onClick={() => setShowDeleteAccountModal(true)}
            >
              Delete Account Permanently
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: '#8B1A1A' }}>"Clear ALL" will permanently wipe all data in this browser. "Delete Account" will permanently delete your account and all associated data from our servers.</p>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        open={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        theme={theme}
      />
    </section>
  )
}

