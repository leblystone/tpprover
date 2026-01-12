import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Database, AlertCircle, Trash2, Download, FileText } from 'lucide-react'
import { exportUserDataToCSV, exportUserDataToPDF } from '../utils/export'
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

  const getAllData = () => {
    return {
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
      goals: JSON.parse(localStorage.getItem('tpprover_user_goals') || '[]'),
      protocolHistory: JSON.parse(localStorage.getItem('tpprover_protocol_history') || '[]'),
    };
  };

  const exportAllCSV = () => {
    const data = getAllData();
    exportUserDataToCSV(data);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Backup exported successfully as CSV!', type: 'success' } 
    }));
  };

  const exportAllPDF = async () => {
    try {
      const data = getAllData();
      await exportUserDataToPDF(data, null, theme);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Backup exported successfully as PDF!', type: 'success' } 
      }));
    } catch (error) {
      console.error('PDF export error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'PDF export failed. Please try again.', type: 'error' } 
      }));
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Data Management</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Backup, Recovery & Exports
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      {/* Data Settings */}
      <div className="space-y-4">
        {/* Deletion Request Chip */}
        {hasDeletionRequest && (
          <div 
            className="p-5 rounded-[2rem] border-2 flex items-center gap-4 animate-pulse"
            style={{ 
              backgroundColor: '#991B1B08',
              borderColor: '#991B1B20'
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#991B1B15' }}
            >
              <AlertCircle size={20} style={{ color: '#991B1B' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black tracking-tight" style={{ color: '#991B1B' }}>
                Account Deletion Pending
              </p>
              <p className="text-[10px] opacity-60" style={{ color: '#991B1B' }}>
                Your account will be permanently deleted within 48 hours.
              </p>
            </div>
          </div>
        )}

        {/* Recently Deleted Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Trash2 size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Recently Deleted
            </h4>
          </div>
          <RecentlyDeleted theme={theme} />
        </div>

        {/* Recovery Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Database size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Recovery & Backups
            </h4>
          </div>

          <div 
            className="p-6 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                <RotateCcw size={18} style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight" style={{ color: theme.text }}>
                  Cloud Data Recovery
                </div>
                <p className="text-[10px] opacity-50 leading-relaxed" style={{ color: theme.text }}>
                  Restores your research protocols and inventory from the latest cloud backup.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50" 
                style={{ 
                  backgroundColor: theme.primary, 
                  color: '#ffffff' 
                }}
                onClick={recoverFromSnapshot}
                disabled={recoveryStatus === 'restoring' || recoveryStatus === 'syncing'}
              >
                <RotateCcw size={14} className={recoveryStatus === 'restoring' || recoveryStatus === 'syncing' ? 'animate-spin' : ''} />
                {recoveryStatus === 'checking' && 'Checking...'}
                {recoveryStatus === 'restoring' && 'Restoring...'}
                {recoveryStatus === 'syncing' && 'Syncing...'}
                {recoveryStatus === 'success' && 'Recovered!'}
                {!recoveryStatus && 'Initialize Recovery'}
              </button>
              
              {pwaPrompted && (
                <button 
                  className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border active:scale-95" 
                  style={{ borderColor: theme.border, color: theme.text }} 
                  onClick={handleInstall}
                >
                  Install Local App
                </button>
              )}

              <button 
                className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border active:scale-95" 
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={exportAllCSV}
              >
                <Download size={14} />
                Export CSV Backup
              </button>
              
              <button 
                className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border active:scale-95" 
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={exportAllPDF}
              >
                <FileText size={14} />
                Export PDF Backup
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-red-800">
            <Trash2 size={14} />
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Danger Zone
            </h4>
          </div>

          <div 
            className="p-6 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: '#991B1B20' }}
          >
            <div className="space-y-3">
              <button 
                className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 bg-black/5 hover:bg-black/10 active:scale-95"
                style={{ color: theme.text }}
                onClick={clearSessionOnly}
              >
                Clear Cache & Session
              </button>
              
              <button 
                className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95" 
                style={{ backgroundColor: '#991B1B15', color: '#991B1B' }}
                onClick={clearAllData}
              >
                Wipe Local Device Data
              </button>
              
              <button 
                className="w-full px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95" 
                style={{ backgroundColor: '#991B1B', color: '#ffffff' }}
                onClick={() => setShowDeleteAccountModal(true)}
              >
                Permanently Delete Account
              </button>
            </div>
            <p className="text-[10px] mt-4 text-center opacity-40 leading-relaxed" style={{ color: theme.text }}>
              Action cannot be undone. "Wipe Local" clears browser data.<br/>
              "Delete Account" removes everything from our research servers.
            </p>
          </div>
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

