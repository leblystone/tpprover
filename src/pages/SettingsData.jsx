import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Database, AlertCircle, Trash2, Download, FileText, Clock, Camera, Check, Shield, Cloud } from 'lucide-react'
import { exportUserDataToCSV, exportUserDataToPDF } from '../utils/export'
import { clearAppData, clearSpecific } from '../utils/reset'
import { useFirebase } from '../context/FirebaseContext'
import { useAppContext } from '../context/AppContext'
import { saveAppData, loadAppData, loadCloudSnapshotList, loadCloudSnapshot, saveCloudSnapshot, getLastCloudSyncTime } from '../services/cloudStorage'
import { ensurePublicOrderNumbers } from '../utils/orderNumbers'
import { migrateBlendedProtocolFrequencies } from '../utils/blendedProtocolMigration'
import DeleteAccountModal from '../components/common/DeleteAccountModal'
import RecentlyDeleted from '../components/settings/RecentlyDeleted'

function formatBackupTime(isoOrMs) {
  if (!isoOrMs) return '';
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function visitLabel(idx) {
  if (idx === 0) return '1 visit ago';
  if (idx === 1) return '2 visits ago';
  return '3 visits ago';
}

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

  // Cloud backup state
  const [visitBackups, setVisitBackups] = useState([])
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [selectedRestoreId, setSelectedRestoreId] = useState(null) // 'current' | snapshot doc id
  const [creatingBackup, setCreatingBackup] = useState(false)
  const restoreFileInputRef = useRef(null)

  // Load visit backups and last sync time on mount
  const loadBackups = useCallback(async () => {
    if (!firebaseUser?.uid) {
      setBackupsLoading(false);
      return;
    }
    try {
      setBackupsLoading(true);
      const [snapshots, syncTime] = await Promise.all([
        loadCloudSnapshotList(firebaseUser.uid),
        getLastCloudSyncTime(firebaseUser.uid)
      ]);
      setVisitBackups(snapshots);
      setLastSyncTime(syncTime);
    } catch (e) {
      console.error('Failed to load cloud backups:', e);
    } finally {
      setBackupsLoading(false);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  // Check for recovery snapshot on mount and when it might appear
  useEffect(() => {
    const checkSnapshot = () => {
      const snapshot = localStorage.getItem('tpprover_recovery_snapshot');
      setHasRecoverySnapshot(!!snapshot);
    };
    
    checkSnapshot();
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
      // Previously missing data types — now included for complete backup
      wishlist: JSON.parse(localStorage.getItem('tpprover_wishlist') || '[]'),
      userNotes: JSON.parse(localStorage.getItem('tpprover_user_notes') || '[]'),
      waterTracker: JSON.parse(localStorage.getItem('tpprover_water_tracker') || '{}'),
      taskCompletion: JSON.parse(localStorage.getItem('tpprover_task_completion') || '{}'),
      calendarDone: JSON.parse(localStorage.getItem('tpprover_calendar_done') || '{}'),
      injectionHistory: JSON.parse(localStorage.getItem('tpprover_injection_history') || '[]'),
      injectionStats: JSON.parse(localStorage.getItem('tpprover_injection_stats') || '{}'),
      stockpileHistory: JSON.parse(localStorage.getItem('tpprover_stockpile_history') || '[]'),
      deletionTracking: JSON.parse(localStorage.getItem('tpprover_deletion_tracking') || '{}'),
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

  /** Download full data as JSON backup. Use "Restore from file" to restore this later. */
  const downloadMyDataJSON = () => {
    try {
      const data = getAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pep-planner-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Your data has been downloaded. Keep this file as a backup.', type: 'success' }
      }));
    } catch (error) {
      console.error('JSON export error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Download failed. Please try again.', type: 'error' }
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
      // Previously missing from import — now included for complete restore
      if (data.protocolHistory) localStorage.setItem('tpprover_protocol_history', JSON.stringify(data.protocolHistory))
      if (data.goals) localStorage.setItem('tpprover_user_goals', JSON.stringify(data.goals))
      if (data.wishlist) localStorage.setItem('tpprover_wishlist', JSON.stringify(data.wishlist))
      if (data.userNotes) localStorage.setItem('tpprover_user_notes', JSON.stringify(data.userNotes))
      if (data.waterTracker) localStorage.setItem('tpprover_water_tracker', JSON.stringify(data.waterTracker))
      if (data.taskCompletion) localStorage.setItem('tpprover_task_completion', JSON.stringify(data.taskCompletion))
      if (data.calendarDone) localStorage.setItem('tpprover_calendar_done', JSON.stringify(data.calendarDone))
      if (data.injectionHistory) localStorage.setItem('tpprover_injection_history', JSON.stringify(data.injectionHistory))
      if (data.injectionStats) localStorage.setItem('tpprover_injection_stats', JSON.stringify(data.injectionStats))
      
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
        metrics: data.metrics?.length || 0,
        protocolHistory: data.protocolHistory?.length || 0,
        goals: data.goals?.length || 0,
        wishlist: data.wishlist?.length || 0,
        userNotes: data.userNotes?.length || 0,
        waterTracker: data.waterTracker ? Object.keys(data.waterTracker).length : 0,
        taskCompletion: data.taskCompletion ? Object.keys(data.taskCompletion).length : 0,
        calendarDone: data.calendarDone ? Object.keys(data.calendarDone).length : 0,
        injectionHistory: data.injectionHistory?.length || 0,
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

  const createPreDestructiveSnapshot = async () => {
    try {
      const data = getAllData();
      const snapshot = {
        data,
        timestamp: new Date().toISOString(),
        userId: firebaseUser?.uid || null,
        reason: 'pre_destructive_operation'
      };
      localStorage.setItem('tpprover_recovery_snapshot', JSON.stringify(snapshot));
      console.log('💾 Pre-destructive recovery snapshot saved (local)');

      // Also save to cloud so it persists across devices
      if (firebaseUser?.uid) {
        saveCloudSnapshot(firebaseUser.uid, data, 'pre_destructive').catch(e => {
          console.warn('Cloud pre-destructive snapshot failed (local copy still exists):', e);
        });
      }
      return true;
    } catch (e) {
      console.error('Failed to save pre-destructive snapshot:', e);
      return false;
    }
  }

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to permanently delete ALL data? This will log you out and cannot be undone.")) {
      try {
        // Create recovery snapshot BEFORE wiping (survives the clear since we only remove specific keys)
        createPreDestructiveSnapshot();

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

  const handleCreateBackupNow = async () => {
    if (!firebaseUser?.uid) return;
    setCreatingBackup(true);
    try {
      const data = getAllData();
      const result = await saveCloudSnapshot(firebaseUser.uid, data, 'manual');
      if (result) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Cloud backup created!', type: 'success' }
        }));
        await loadBackups();
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Could not create backup. Data may be too large.', type: 'error' }
        }));
      }
    } catch (e) {
      console.error('Manual backup failed:', e);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Backup creation failed.', type: 'error' }
      }));
    } finally {
      setCreatingBackup(false);
    }
  };

  const restoreData = (snapshotData) => {
    if (snapshotData.protocols) {
      const migrated = migrateBlendedProtocolFrequencies(snapshotData.protocols);
      setProtocols(migrated);
      localStorage.setItem('tpprover_protocols', JSON.stringify(migrated));
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
  };

  const recoverFromSelection = async () => {
    if (!selectedRestoreId) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Select a backup to restore from.', type: 'error', duration: 3000 }
      }));
      return;
    }

    try {
      setRecoveryStatus('checking');
      let snapshotData = null;

      if (selectedRestoreId === 'current') {
        // Restore from live cloud data
        const cloudData = await loadAppData(firebaseUser.uid);
        if (cloudData) {
          snapshotData = cloudData;
        }
      } else {
        // Restore from a visit backup
        const cloudSnap = await loadCloudSnapshot(firebaseUser.uid, selectedRestoreId);
        if (cloudSnap?.data) {
          snapshotData = cloudSnap.data;
        }
      }

      if (!snapshotData) {
        setRecoveryStatus('invalid');
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Could not load the selected backup.', type: 'error', duration: 4000 }
        }));
        return;
      }

      const hasAnyData =
        (snapshotData.protocols?.length > 0) ||
        (snapshotData.orders?.length > 0) ||
        (snapshotData.stockpile?.length > 0) ||
        (snapshotData.vendors?.length > 0) ||
        (snapshotData.reconItems?.length > 0) ||
        (snapshotData.supplements?.length > 0) ||
        (snapshotData.metrics?.length > 0) ||
        (snapshotData.scheduledBuys?.length > 0) ||
        (snapshotData.calendarNotes && Object.keys(snapshotData.calendarNotes).length > 0);

      if (!hasAnyData) {
        setRecoveryStatus('no_data');
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Selected backup contains no data to recover.', type: 'error', duration: 4000 }
        }));
        return;
      }

      setRecoveryStatus('restoring');
      restoreData(snapshotData);

      setRecoveryStatus('syncing');
      const syncResult = await saveAppData(firebaseUser.uid, snapshotData, { skipMerge: false });

      const itemCount = Object.values(snapshotData).reduce((sum, arr) => {
        if (Array.isArray(arr)) return sum + arr.length;
        if (typeof arr === 'object' && arr !== null) return sum + Object.keys(arr).length;
        return sum;
      }, 0);

      if (syncResult) {
        setRecoveryStatus('success');
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: {
            message: `Recovered ${itemCount} item${itemCount !== 1 ? 's' : ''} from cloud backup!`,
            type: 'success',
            duration: 5000
          }
        }));
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRecoveryStatus('sync_failed');
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: {
            message: `Recovered ${itemCount} item${itemCount !== 1 ? 's' : ''} on this device, but couldn't sync to cloud yet. Your data is safe here.`,
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
    <section className="page-bg max-w-xl mx-auto space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-2 rounded-xl transition-all active:scale-95 shrink-0 glass-button-nav"
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Data Management</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Backup, Recovery & Exports
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-3 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      {/* Data Settings */}
      <div className="space-y-3">
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
              <p className="text-sm font-semibold tracking-tight" style={{ color: '#991B1B' }}>
                Account Deletion Pending
              </p>
              <p className="text-[10px] opacity-60" style={{ color: '#991B1B' }}>
                Your account will be permanently deleted within 48 hours.
              </p>
            </div>
          </div>
        )}

        {/* Recently Deleted Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Trash2 size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Recently Deleted
            </h4>
          </div>
          <RecentlyDeleted theme={theme} />
        </div>

        {/* Recovery Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Database size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Recovery & Backups
            </h4>
          </div>

          <div 
            className="content-section p-4 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                <Cloud size={18} style={{ color: theme.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
                  Cloud Data Recovery
                </div>
                <p className="text-xs opacity-60 leading-relaxed" style={{ color: theme.text }}>
                  Go back to how your data looked during a previous visit.
                </p>
              </div>
            </div>

            {/* Restore Points */}
            <div className="space-y-2 mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-50 px-1" style={{ color: theme.text }}>
                Restore Points
              </span>

              {backupsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <RotateCcw size={16} className="animate-spin opacity-40" style={{ color: theme.text }} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Current Cloud Data — always available if synced */}
                  {lastSyncTime && (
                    <button
                      onClick={() => setSelectedRestoreId(selectedRestoreId === 'current' ? null : 'current')}
                      className="w-full text-left px-3.5 py-3 rounded-2xl border-2 transition-all active:scale-[0.98]"
                      style={{
                        borderColor: selectedRestoreId === 'current' ? theme.primary : theme.border + '60',
                        backgroundColor: selectedRestoreId === 'current' ? theme.primary + '08' : 'transparent'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            borderColor: selectedRestoreId === 'current' ? theme.primary : theme.border,
                            backgroundColor: selectedRestoreId === 'current' ? theme.primary : 'transparent'
                          }}
                        >
                          {selectedRestoreId === 'current' && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold" style={{ color: theme.text }}>
                              Current Cloud Data
                            </span>
                            <span
                              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: theme.primary + '15', color: theme.primary }}
                            >
                              Live
                            </span>
                          </div>
                          <span className="text-[10px] opacity-50 mt-0.5 block" style={{ color: theme.text }}>
                            Last synced {formatBackupTime(lastSyncTime)}
                          </span>
                        </div>
                        <Shield size={14} className="opacity-20 flex-shrink-0" style={{ color: theme.text }} />
                      </div>
                    </button>
                  )}

                  {/* Visit Backups — labeled "1 visit ago", "2 visits ago", etc. */}
                  {visitBackups.map((backup, idx) => {
                    const isSelected = selectedRestoreId === backup.id;
                    return (
                      <button
                        key={backup.id}
                        onClick={() => setSelectedRestoreId(isSelected ? null : backup.id)}
                        className="w-full text-left px-3.5 py-3 rounded-2xl border-2 transition-all active:scale-[0.98]"
                        style={{
                          borderColor: isSelected ? theme.primary : theme.border + '60',
                          backgroundColor: isSelected ? theme.primary + '08' : 'transparent'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                            style={{
                              borderColor: isSelected ? theme.primary : theme.border,
                              backgroundColor: isSelected ? theme.primary : 'transparent'
                            }}
                          >
                            {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold" style={{ color: theme.text }}>
                              {visitLabel(idx)}
                            </span>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] opacity-50" style={{ color: theme.text }}>
                                {formatBackupTime(backup.createdAt)}
                              </span>
                              <span className="text-[10px] opacity-30" style={{ color: theme.text }}>
                                {backup.totalItems} item{backup.totalItems !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <Clock size={14} className="opacity-20 flex-shrink-0" style={{ color: theme.text }} />
                        </div>
                      </button>
                    );
                  })}

                  {/* Empty state — no sync AND no backups */}
                  {!lastSyncTime && visitBackups.length === 0 && (
                    <div
                      className="text-center py-5 rounded-2xl border border-dashed"
                      style={{ borderColor: theme.border, color: theme.textLight }}
                    >
                      <Database size={20} className="mx-auto mb-1.5 opacity-30" />
                      <p className="text-[11px] opacity-50">No cloud data found</p>
                      <p className="text-[10px] opacity-30">Your data will back up automatically once you start using the app</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary actions — full width */}
            <div className="space-y-2 mb-3">
              <button 
                className="w-full px-4 py-2.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50" 
                style={{ 
                  backgroundColor: selectedRestoreId ? theme.primary : (theme.primary + '40'),
                  color: theme.textOnPrimary || '#ffffff' 
                }}
                onClick={recoverFromSelection}
                disabled={!selectedRestoreId || recoveryStatus === 'restoring' || recoveryStatus === 'syncing'}
              >
                <RotateCcw size={13} className={recoveryStatus === 'restoring' || recoveryStatus === 'syncing' ? 'animate-spin' : ''} />
                {recoveryStatus === 'checking' && 'Loading...'}
                {recoveryStatus === 'restoring' && 'Restoring...'}
                {recoveryStatus === 'syncing' && 'Syncing...'}
                {recoveryStatus === 'success' && 'Recovered!'}
                {!recoveryStatus && selectedRestoreId && 'Restore This Backup'}
                {!recoveryStatus && !selectedRestoreId && 'Select a Restore Point'}
              </button>

              <button
                className="w-full px-4 py-2.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border active:scale-95 disabled:opacity-50"
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={handleCreateBackupNow}
                disabled={creatingBackup || !firebaseUser?.uid}
              >
                <Camera size={13} className={creatingBackup ? 'animate-pulse' : ''} />
                {creatingBackup ? 'Saving...' : 'Back Up Now'}
              </button>
            </div>

            {/* Download my data (JSON) — full backup you can restore from file */}
            <p className="text-xs opacity-80 mb-2" style={{ color: theme.text }}>
              If something looks wrong, download your data as a backup. You can restore it later with &quot;Restore from file&quot;.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button 
                className="px-3 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 border active:scale-95" 
                style={{ borderColor: theme.primary, color: theme.primary }}
                onClick={downloadMyDataJSON}
              >
                <Download size={12} />
                Download my data
              </button>
              <button 
                className="px-3 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 border active:scale-95" 
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={() => restoreFileInputRef.current?.click()}
              >
                <RotateCcw size={12} />
                Restore from file
              </button>
              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importBackup(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Export CSV / PDF */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                className="px-3 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 border active:scale-95" 
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={exportAllCSV}
              >
                <Download size={12} />
                Export CSV
              </button>

              <button 
                className="px-3 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 border active:scale-95" 
                style={{ borderColor: theme.border, color: theme.text }}
                onClick={exportAllPDF}
              >
                <FileText size={12} />
                Export PDF
              </button>

              {pwaPrompted && (
                <button 
                  className="col-span-2 px-3 py-2.5 rounded-xl font-semibold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 border active:scale-95" 
                  style={{ borderColor: theme.border, color: theme.text }} 
                  onClick={handleInstall}
                >
                  Install App
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-red-800">
            <Trash2 size={14} />
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em]">
              Danger Zone
            </h4>
          </div>

          <div 
            className="content-section p-4 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: '#991B1B20' }}
          >
            <div className="space-y-3">
              <button 
                className="w-full px-6 py-3 rounded-2xl font-medium uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 bg-black/5 hover:bg-black/10 active:scale-95"
                style={{ color: theme.text }}
                onClick={clearSessionOnly}
              >
                Clear Cache & Session
              </button>
              
              <button 
                className="w-full px-6 py-3 rounded-2xl font-semibold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95" 
                style={{ backgroundColor: '#991B1B15', color: '#991B1B' }}
                onClick={clearAllData}
              >
                Wipe Local Device Data
              </button>
              
              <button 
                className="w-full px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95" 
                style={{ backgroundColor: '#991B1B', color: '#ffffff' }}
                onClick={() => setShowDeleteAccountModal(true)}
              >
                Permanently Delete Account
              </button>
            </div>
            <p className="text-[10px] mt-3 text-center opacity-40 leading-relaxed" style={{ color: theme.text }}>
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

