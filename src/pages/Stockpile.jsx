import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import Modal from '../components/common/Modal'
import { appendStockEvent, getStockHistory } from '../utils/stockHistory'
import { formatCurrency } from '../utils/currencyUtils'
import { PlusCircle, Filter, Edit, Package, Beaker, Percent, Hash, DollarSign, FileText, ShoppingCart, Merge, AlertCircle, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'
import DocumentationUpload from '../components/common/DocumentationUpload'
import ImagePreviewModal from '../components/common/ImagePreviewModal'
import StockpileCard from '../components/stockpile/StockpileCard'
import MergeConfirmationModal from '../components/stockpile/MergeConfirmationModal'
import MergeSelectionModal from '../components/stockpile/MergeSelectionModal'
import DuplicateDetection from '../components/stockpile/DuplicateDetection'
import StockpileHelpPanel from '../components/stockpile/StockpileHelpPanel'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import useAutoSave from '../utils/useAutoSave'
import AutoSaveIndicator from '../components/common/AutoSaveIndicator'
import { saveAppData } from '../services/cloudStorage'
import { useFirebase } from '../context/FirebaseContext'

export default function Stockpile() {
  const { theme } = useOutletContext()
  const navigate = useNavigate();
  const { vendors, addVendor, orders, stockpile: items, setStockpile: setItems, protocols, reconItems, reconHistory, supplements, metrics, calendarNotes, scheduledBuys } = useAppContext();
  const { firebaseUser } = useFirebase();
  const { isReadOnly } = useSubscriptionAccess();
  const [activeTab, setActiveTab] = useState('onhand')
  const [openAdd, setOpenAdd] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [form, setForm] = useState({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', date: '', useByDate: '', documentation: [] })
  
  // Auto-save functionality for stockpile form
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted, updateFormData } = useAutoSave(
    'tpprover_stockpile_form_draft',
    form,
    setForm,
    2000, // 2 second delay
    async () => {
      // Intentionally left blank — we only persist the draft locally.
      // Actual stockpile items are created when the user explicitly saves.
    }
  );
  
  // State for save operations
  const [isSavingToStockpile, setIsSavingToStockpile] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const getPrimaryActionGradient = (saving) => {
    const secondaryColor = theme?.secondary || '#d1d5db';
    if (saving) {
      return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
    }
    return `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`;
  };

  const primaryActionDefaultShadow = theme?.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
  const lowStock = useMemo(() => (items || []).filter(i => Number(i.quantity) <= 2).map(i => i.name), [items])
  const [vendorFilter, setVendorFilter] = useState('')
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Drag & Drop Merge functionality
  const [isDragMode, setIsDragMode] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showMergeSelectionModal, setShowMergeSelectionModal] = useState(false)
  const [mergeData, setMergeData] = useState({ source: null, target: null })
  const [mergeSourceGroup, setMergeSourceGroup] = useState(null)
  
  // Duplicate detection state - load from localStorage and persist across re-renders
  const [dismissedDuplicates, setDismissedDuplicates] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_dismissed_duplicates');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  })
  
  // CRITICAL: Persist dismissed duplicates across cloud sync
  // When items change (after cloud sync), ensure dismissed duplicates are preserved
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tpprover_dismissed_duplicates');
      if (saved) {
        const parsed = new Set(JSON.parse(saved));
        // Only update if localStorage has more dismissed items than current state
        // This prevents losing dismissed duplicates after cloud sync reloads items
        if (parsed.size > 0) {
          setDismissedDuplicates(prev => {
            // Merge with existing - localStorage is source of truth
            const merged = new Set([...prev, ...parsed]);
            // Only update if different
            if (merged.size !== prev.size) {
              return merged;
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error('Failed to reload dismissed duplicates:', e);
    }
  }, [items]) // Reload when items change (after cloud sync)
  
  // Documentation preview state
  const [previewImage, setPreviewImage] = useState(null)
  
  const vendorMap = useMemo(() => (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  
  // Copy link to clipboard
  const handleCopyLink = (url, title) => {
    navigator.clipboard.writeText(url).then(() => {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Link Copied 📋', 
          type: 'success' 
        } 
      }));
    }).catch(err => {
      console.error('Failed to copy link:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Failed to copy link', 
          type: 'error' 
        } 
      }));
    });
  };
  
  // Helper function to check use by date status
  const getUseByStatus = (useByDate) => {
    if (!useByDate) return null;
    const today = new Date();
    const useBy = new Date(useByDate);
    const daysDiff = Math.ceil((useBy - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (daysDiff <= 7) return { status: 'expiring', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (daysDiff <= 30) return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return null;
  };
  
  const filtered = useMemo(() => {
    return (items || []).filter(i => {
      const vendorName = i.vendorId ? vendorMap[i.vendorId] : (i.vendor || '');
      const combinedQuery = query || searchQuery;
      return (
        (!vendorFilter || vendorName.toLowerCase().includes(vendorFilter.toLowerCase())) &&
        (!combinedQuery || (i.name || '').toLowerCase().includes(combinedQuery.toLowerCase()) || String(i.batchNumber || '').toLowerCase().includes(combinedQuery.toLowerCase()))
      )
    })
  }, [items, vendorFilter, query, searchQuery, vendorMap])

  const groups = useMemo(() => {
    const map = new Map()
    for (const it of filtered) {
      const name = it.name || 'Unknown'
      const mg = String(it.mg || '')
      const mgUnit = it.mgUnit || 'mg'
      const qty = Number(it.quantity) || 0
      const mgNum = Number(it.mg) || 0
      
      // Create a unique key that includes the unit to separate mg from mL items
      const groupKey = `${name}__${mgUnit}`
      
      if (!map.has(groupKey)) {
        map.set(groupKey, { 
          name, 
          unit: mgUnit,
          groupKey, // Add groupKey property for duplicate detection
          totalMg: 0, 
          totalVials: 0,
          variants: {} 
        })
      }
      const g = map.get(groupKey)
      g.totalMg += qty * mgNum
      g.totalVials += qty
      
      const variantKey = `${mg}__${mgUnit}`
      if (!g.variants[variantKey]) {
        g.variants[variantKey] = { 
          mg, 
          unit: mgUnit,
          totalVials: 0, 
          items: [] 
        }
      }
      const v = g.variants[variantKey]
      v.totalVials += qty
      v.items.push(it)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  const incomingGroups = useMemo(() => {
    const list = Array.isArray(orders) ? orders.filter(o => {
      const s = (o.status || '').toLowerCase()
      return !s.includes('delivered')
    }) : []
    
    const map = new Map()
    
    for (const o of list) {
      if (!o.items || o.items.length === 0) continue; // Skip orders with no items

      for (const item of o.items) {
        const name = item.name || 'Unknown';
        const mg = String(item.mg || '');
        const mgUnit = item.mgUnit || 'mg';
        const vendorName = o.vendorId ? vendorMap[o.vendorId] : (o.vendor || 'Unknown');
        const mgNum = Number(item.mg) || 0;
        const quantity = Number(item.quantity) || 1;
        const isKit = (item.unit || '').toLowerCase() === 'kit';
        const vials = isKit ? quantity * 10 : quantity;

        // Create a unique key that includes the unit
        const groupKey = `${name}__${mgUnit}`;
        
        if (!map.has(groupKey)) {
          map.set(groupKey, { 
            name, 
            unit: mgUnit,
            totalMg: 0, 
            variants: {} 
          });
        }
        const g = map.get(groupKey);
        g.totalMg += mgNum * vials;

        const variantKey = `${mg}__${mgUnit}`;
        if (!g.variants[variantKey]) {
          g.variants[variantKey] = { 
            mg, 
            unit: mgUnit,
            totalMg: 0, 
            vendors: {} 
          };
        }
        const v = g.variants[variantKey];
        v.totalMg += mgNum * vials;

        if (!v.vendors[vendorName]) {
          v.vendors[vendorName] = 0;
        }
        v.vendors[vendorName] += mgNum * vials;
      }
    }
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [orders, vendorMap]);

  const [manageName, setManageName] = useState(null)
  const [manageRows, setManageRows] = useState([])
  const [outOfStockModalName, setOutOfStockModalName] = useState(null)
  
  // Auto-save functionality for manage modal
  const { isSaving: isManageSaving, lastSaved: lastManageSaved, clearSavedData: clearManageSavedData, markAsSubmitted: markManageSubmitted, updateFormData: updateManageData } = useAutoSave(
    `tpprover_manage_${manageName || 'default'}_draft`,
    manageRows,
    setManageRows,
    2000 // 2 second delay
  )
  const [showHistory, setShowHistory] = useState(false)
  const openManage = (peptideName) => {
    setManageName(peptideName)
    const rows = ((items || []) || []).filter(i => (i.name || '') === peptideName).map(i => ({ ...i }))
    if (rows.length === 0) rows.push({ id: generateId(), name: peptideName, mg: '', quantity: '', unit: 'vial', cost: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', documentation: [] })
    setManageRows(rows)
  }
  const addManageRow = () => setManageRows(prev => ([...prev, { id: generateId(), name: manageName, mg: '', quantity: '', unit: 'vial', cost: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', documentation: [] }]))
  const removeManageRow = (id) => setManageRows(prev => prev.filter(r => r.id !== id))
  
  // Merge functionality handlers
  const handleMergeRequest = (duplicateGroup, mainGroup) => {
    setMergeData({ source: duplicateGroup, target: mainGroup })
    setShowMergeModal(true)
  }

  const handleSelectMergeGroup = (sourceGroup, targetGroup) => {
    setMergeData({ source: sourceGroup, target: targetGroup })
    setShowMergeModal(true)
    setShowMergeSelectionModal(false)
    setMergeSourceGroup(null)
  }

  const handleConfirmMerge = async (mergeConfig) => {
    const { sourceItems, targetItems, mergedName, mergedUnit } = mergeConfig

    try {
      // CRITICAL: Update timestamps on merged items so they persist during cloud sync
      const now = new Date().toISOString()
      
      // Update all items to use the new merged name and unit
      // This includes BOTH source and target items
      const updatedItems = items.map(item => {
        // Check if this item belongs to the source group
        const isSourceItem = sourceItems.some(sourceItem => sourceItem.id === item.id)
        // Check if this item belongs to the target group
        const isTargetItem = targetItems.some(targetItem => targetItem.id === item.id)
        
        if (isSourceItem || isTargetItem) {
          return {
            ...item,
            name: mergedName,
            mgUnit: mergedUnit,
            // CRITICAL: Update timestamp so merged items are seen as newer than server data
            updatedAt: now
          }
        }
        return item
      })

      setItems(updatedItems)
      
      // CRITICAL: Immediately sync to cloud to prevent server data from overwriting merge
      // Save to localStorage immediately for persistence
      try {
        localStorage.setItem('tpprover_stockpile', JSON.stringify(updatedItems))
      } catch (e) {
        console.error('Failed to save merged items to localStorage:', e)
      }
      
      // CRITICAL: Force immediate cloud sync with skipMerge to overwrite server data
      // This prevents the real-time listener from reloading old data and overwriting the merge
      if (firebaseUser) {
        try {
          const userId = firebaseUser.uid;
          // Get all app data to sync (needed for saveAppData)
          const appData = {
            protocols: protocols || [],
            reconItems: reconItems || [],
            reconHistory: reconHistory || [],
            supplements: supplements || [],
            orders: orders || [],
            metrics: metrics || [],
            vendors: vendors || [],
            calendarNotes: calendarNotes || {},
            stockpile: updatedItems, // Use merged items
            scheduledBuys: scheduledBuys || []
          };
          
          // Force immediate sync with skipMerge to overwrite server data
          // This ensures merged items persist even if real-time listener triggers
          await saveAppData(userId, appData, { skipMerge: true });
          console.log('✅ Merged items synced to cloud immediately');
        } catch (e) {
          console.error('Failed to sync merged items to cloud:', e);
          // Don't throw - the auto-sync will handle it
        }
      }
      
      // Log the merge event
      appendStockEvent({
        name: `${mergeConfig.sourceGroup.name} + ${mergeConfig.targetGroup.name} → ${mergedName}`,
        details: `Combined ${sourceItems.length + targetItems.length} peptide entries into single inventory`
      })

      // Show success toast
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: `Merge of ${mergedName} completed!`, 
          type: 'success' 
        } 
      }))

      // Close modal and exit drag mode
      setShowMergeModal(false)
      setMergeData({ source: null, target: null })
      setIsDragMode(false)
      
      // Also dismiss this duplicate pair so it doesn't show again
      const duplicateKey = `${mergeConfig.sourceGroup.groupKey}-${mergeConfig.targetGroup.groupKey}`;
      const newDismissed = new Set([...dismissedDuplicates, duplicateKey]);
      setDismissedDuplicates(newDismissed);
      try {
        localStorage.setItem('tpprover_dismissed_duplicates', JSON.stringify(Array.from(newDismissed)));
      } catch (e) {
        console.error('Failed to save dismissed duplicates:', e);
      }
      
    } catch (error) {
      console.error('Failed to merge groups:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: `Failed to merge items. Please try again.`, 
          type: 'error' 
        } 
      }))
    }
  }

  const handleToggleDragMode = (enabled) => {
    setIsDragMode(enabled)
    if (!enabled) {
      // Reset any pending merge data when exiting drag mode
      setMergeData({ source: null, target: null })
    }
  }

  // Duplicate detection handlers
  const handleDismissDuplicate = (duplicate) => {
    const key = `${duplicate.group1.groupKey}-${duplicate.group2.groupKey}`;
    const newDismissed = new Set([...dismissedDuplicates, key]);
    setDismissedDuplicates(newDismissed);
    // Persist to localStorage
    try {
      localStorage.setItem('tpprover_dismissed_duplicates', JSON.stringify(Array.from(newDismissed)));
    } catch (e) {
      console.error('Failed to save dismissed duplicates:', e);
    }
  }

  // Set topbar tabs via custom event
  useEffect(() => {
    const tabs = [
      { value: 'onhand', label: 'On Hand' },
      { value: 'incoming', label: 'Incoming' }
    ];
    
    const handleAddClick = () => {
      if (isReadOnly) {
        setShowUpgradeModal(true);
        return;
      }
      setOpenAdd(true);
    };
    
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { 
      detail: { 
        tabs, 
        activeTab, 
        onTabChange: setActiveTab,
        onActionClick: handleAddClick,
        actionDisabled: isReadOnly
      } 
    }));
    
    // Listen for topbar search events for page-specific search
    const handleSearch = (e) => {
      setSearchQuery(e.detail.query);
    };
    window.addEventListener('tpp:stockpile-search', handleSearch);
    
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
      window.removeEventListener('tpp:stockpile-search', handleSearch);
    };
  }, [activeTab, isReadOnly])
  const saveManage = () => {
    // First, convert any "kit" entries in the temporary edit state back to "vial" for storage
    const convertedRows = manageRows.map(row => {
      if (row.unit === 'kit') {
        return {
          ...row,
          quantity: String((Number(row.quantity) || 0) * 10),
          unit: 'vial'
        };
      }
      return row;
    });

    // Auto-create any new vendors that were typed in
    convertedRows.forEach(row => {
        if (row.vendor && !vendors.some(v => v.name.toLowerCase() === row.vendor.toLowerCase())) {
            addVendor({ name: row.vendor, isStub: true });
        }
    });

    const cleaned = convertedRows.filter(r => (r.name || '').trim())
    const others = (items || []).filter(i => (i.name || '') !== manageName)
    
    // Add/update timestamps for modified items
    const now = new Date().toISOString();
    const cleanedWithTimestamps = cleaned.map(item => ({
      ...item,
      updatedAt: now,
      createdAt: item.createdAt || now
    }));
    
    // Append history snapshots and usage markers
    try {
      const before = (items || []).filter(i => (i.name || '') === manageName)
      const after = cleanedWithTimestamps
      // out-of-stock events
      before.forEach(b => {
        const afterMatch = after.find(a => String(a.mg) === String(b.mg) && (a.vendorId ? a.vendorId === b.vendorId : (a.vendor||'') === (b.vendor||'')))
        const prevQty = Number(b.quantity)||0
        const nextQty = Number(afterMatch?.quantity)||0
        if (prevQty > 0 && nextQty === 0) {
          appendStockEvent({ type: 'out_of_stock', name: manageName, mg: b.mg, vendor: b.vendorId ? vendorMap[b.vendorId] : b.vendor, prevQty })
        }
      })
      // quantity changes
      after.forEach(a => {
        const beforeMatch = before.find(b => String(b.mg) === String(a.mg) && (b.vendorId ? b.vendorId === a.vendorId : (b.vendor||'') === (a.vendor||'')))
        const prevQty = Number(beforeMatch?.quantity)||0
        const nextQty = Number(a.quantity)||0
        if (nextQty !== prevQty) {
          appendStockEvent({ type: 'adjust', name: manageName, mg: a.mg, vendor: a.vendorId ? vendorMap[a.vendorId] : a.vendor, prevQty, nextQty })
        }
      })
    } catch {}
    setItems([...cleanedWithTimestamps, ...others])
    markManageSubmitted(); // Clear auto-save data
    setManageName(null)
    setManageRows([])
  }

  const importCSV = async (file) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length === 0) return
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const idx = (k) => header.indexOf(k)
      const next = [...(items || [])]
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        const row = {
          id: generateId(),
          name: cols[idx('name')] || '',
          mg: cols[idx('mg')] || '',
          quantity: cols[idx('quantity')] || '',
          vendor: cols[idx('vendor')] || '',
          capColor: cols[idx('capcolor')] || cols[idx('cap_color')] || '',
          batchNumber: cols[idx('batchnumber')] || cols[idx('batch_#')] || cols[idx('batch')] || '',
          minQty: cols[idx('minqty')] || cols[idx('min_qty')] || '1',
        }
        next.unshift(row)
      }
      setItems(next)
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Stockpile CSV imported', type: 'success' } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'CSV import failed', type: 'error' } }))
    }
  }

  // Prevent modal from closing if there's unsaved data
  const handleCloseStockpileModal = () => {
    // Check if there's meaningful data that hasn't been saved
    const hasData = form && (
      form.name || 
      form.mg ||
      form.vendor ||
      form.quantity
    );
    
    if (hasData && !isSavingToStockpile) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!shouldClose) return;
    }
    
    setOpenAdd(false);
    clearSavedData();
  };

  return (
    <section className="space-y-4">
      <StockpileHelpPanel theme={theme} />
      <div className="space-y-6">
        {/* On Hand Tab */}
        {activeTab === 'onhand' && (
          <div>
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                  <Package size={32} style={{ color: theme.primary }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Inventory On Hand</h3>
                <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                  Add peptides to your stockpile to track quantities, vendors, batches, and documentation. 
                  Delivered orders automatically sync here, or add items manually to maintain your inventory.
                </p>
                {!isReadOnly && (
                  <button
                    onClick={() => setOpenAdd(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  >
                    <PlusCircle size={18} />
                    Add Your First Peptide
                  </button>
                )}
              </div>
            ) : (
              <div>
            
            {/* Duplicate Detection */}
            <DuplicateDetection
              groups={groups.filter(g => g.totalVials > 0)}
              theme={theme}
              onMergeRequest={handleMergeRequest}
              onDismissSuggestion={handleDismissDuplicate}
              dismissedDuplicates={dismissedDuplicates}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.filter(g => g.totalVials > 0).map(g => (
                    <div key={g.name} className="relative p-4 rounded-lg content-card shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground }}>
                        <div>
                                <div className="flex items-center justify-between mb-2">
                                <div className="font-semibold text-base" style={{ color: theme.text }}>{g.name}</div>
                                <div className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                                  {g.totalMg > 0 ? `${g.totalMg} ${g.unit || 'mg'}` : `${g.totalVials} ${g.totalVials === 1 ? 'vial' : 'vials'}`}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {Object.values(g.variants).sort((a, b) => String(a.mg).localeCompare(String(b.mg))).map(v => (
                                    <div key={v.mg} className="rounded-md shadow-sm p-3" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb' }}>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="font-medium flex items-center gap-2"><Beaker size={14} /> {v.mg} {v.unit || 'mg'}</div>
                                            <div className="text-xs font-semibold">{v.totalVials} vials</div>
                                        </div>
                                        <ul className="mt-1 text-xs space-y-3">
                                            {v.items.map(item => (
                                                <li key={item.id} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 font-medium"><Package size={12} /> {item.vendorId ? vendorMap[item.vendorId] : item.vendor}</div>
                                                        <div className="flex items-center">
                                                            {item.orderId && (
                                                                <button 
                                                                    title="View Source Order" 
                                                                    className="p-1 rounded-md transition-colors" 
                                                                    style={{ color: theme.primary }} 
                                                                    onClick={() => navigate(`/app/orders`, { state: { openOrderId: item.orderId } })}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                >
                                                                    <ShoppingCart size={14} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                title="Send to Recon Calculator" 
                                                                className="p-1 rounded-md transition-colors" 
                                                                style={{ color: theme.primary }} 
                                                                onClick={() => {
                                                                    try {
                                                                        const payload = { 
                                                                            peptide: g.name, 
                                                                            mg: String(item.mg), 
                                                                            vendor: item.vendorId ? vendorMap[item.vendorId] : item.vendor, 
                                                                            cost: item.cost,
                                                                            stockpileId: item.id,
                                                                            quantity: item.quantity,
                                                                            unit: item.unit,
                                                                            quantityUsed: 1
                                                                        };
                                                                        localStorage.setItem('tpprover_recon_prefill', JSON.stringify(payload));
                                                                        navigate('/app/recon');
                                                                    } catch { }
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C12 2 5 9 5 14a7 7 0 0 0 14 0c0-5-7-12-7-12z"></path></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {item.date && <div className="text-xs text-gray-400 pl-5">Acquired: {new Date(item.date).toLocaleDateString()}</div>}
                                                    {item.useByDate && (
                                                        (() => {
                                                            const useByStatus = getUseByStatus(item.useByDate);
                                                            return (
                                                                <div className={`text-xs pl-5 px-2 py-1 rounded-md inline-block ${useByStatus ? `${useByStatus.color} ${useByStatus.bgColor}` : 'text-gray-400'}`}>
                                                                    Use By: {new Date(item.useByDate).toLocaleDateString()}
                                                                    {useByStatus?.status === 'expired' && ' (EXPIRED)'}
                                                                    {useByStatus?.status === 'expiring' && ' (Expiring Soon)'}
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                    {item.purity && <div className="flex items-center gap-2 pl-5"><Percent size={12} /> {item.purity}% Purity</div>}
                                                    {item.documentation && item.documentation.length > 0 && (
                                                        <div className="text-xs pl-5 mt-1 space-y-1">
                                                                    {item.documentation.map((doc, index) => (
                                                                <div key={index} className="flex items-center gap-1.5">
                                                                    {doc.type === 'image' ? (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setPreviewImage(doc);
                                                                            }}
                                                                            className="flex items-center gap-1.5 p-1 rounded hover:bg-opacity-20 transition-all"
                                                                            style={{ 
                                                                                color: theme.primary
                                                                            }}
                                                                            title={`View ${doc.title}`}
                                                                        >
                                                                            <ImageIcon size={12} />
                                                                            <span className="text-xs hover:underline">{doc.title}</span>
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCopyLink(doc.url, doc.title);
                                                                            }}
                                                                            className="flex items-center gap-1.5 p-1 rounded hover:bg-opacity-20 transition-all"
                                                                            style={{ 
                                                                                color: theme.primary
                                                                            }}
                                                                            title={`Copy ${doc.title} link`}
                                                                        >
                                                                            <LinkIcon size={12} />
                                                                            <span className="text-xs hover:underline">{doc.title}</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <>
                                                        <div className="flex items-center gap-2 pl-5">
                                                            <Hash size={12} />
                                                            <span>{item.quantity} {Number(item.quantity) === 1 ? 'vial' : 'vials'} {Number(item.quantity) <= 2 && <span className="text-red-500 font-semibold ml-1">Low</span>}</span>
                                                        </div>
                                                        {(Number(item.cost) > 0 && Number(item.mg) > 0) && (
                                                            <div className="flex items-center gap-2 pl-5">
                                                                <DollarSign size={12} />
                                                                <span>{formatCurrency(Number(item.cost) / Number(item.mg))} / {item.mgUnit || 'mg'}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                    {item.notes && (
                                                        <div className="flex items-start gap-2 pl-5 mt-1 text-gray-500">
                                                            <FileText size={12} className="mt-0.5" />
                                                            <p className="text-xs italic">{item.notes}</p>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button 
                              className="p-1 rounded-md transition-colors" 
                              style={{ 
                                color: theme.primary,
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? 'not-allowed' : 'pointer'
                              }} 
                              onClick={() => {
                                if (isReadOnly) {
                                  setShowUpgradeModal(true);
                                  return;
                                }
                                // Find another group to merge with (show selection modal)
                                const otherGroups = groups.filter(og => og.groupKey !== g.groupKey && og.totalVials > 0);
                                if (otherGroups.length > 0) {
                                  setMergeSourceGroup(g);
                                  setShowMergeSelectionModal(true);
                                } else {
                                  window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                    detail: { 
                                      message: 'No other groups available to merge with', 
                                      type: 'info' 
                                    } 
                                  }));
                                }
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              title="Merge with another group"
                            >
                                <Merge size={16} />
                            </button>
                            <button 
                              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-all" 
                              style={{ 
                                backgroundColor: isReadOnly ? theme.textLight : theme.primary, 
                                color: theme.textOnPrimary,
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? 'not-allowed' : 'pointer'
                              }} 
                              onClick={() => {
                                if (isReadOnly) {
                                  setShowUpgradeModal(true);
                                  return;
                                }
                                openManage(g.name);
                              }}
                            >
                                <Edit size={14} /> Manage
                            </button>
                        </div>
                    </div>
                ))}
            </div>
              </div>
            )}
          </div>
        )}

        {/* Incoming Tab */}
        {activeTab === 'incoming' && (
          <div>
            {incomingGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                  <ShoppingCart size={32} style={{ color: theme.primary }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Incoming Orders</h3>
                <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                  Orders that are placed but not yet delivered will appear here. Once delivered, they'll automatically move to your on-hand inventory.
                </p>
                <button
                  onClick={() => {
                    window.history.pushState({}, '', '/app/orders?new=true');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  <PlusCircle size={18} />
                  Place Your First Order
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                {incomingGroups.map(g => (
                    <div key={`incoming-${g.name}`} className="p-4 rounded-lg content-card shadow-md hover:shadow-lg transition-shadow" style={{ 
                      border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                      backgroundColor: theme.cardBackground,
                      boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.4)' : undefined
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold" style={{ color: theme.text }}>{g.name}</div>
                        <div className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.secondary, color: theme.text }}>{g.totalMg} {g.unit || 'mg'} en route</div>
                      </div>
                      <div className="space-y-2">
                        {Object.values(g.variants).sort((a,b)=>String(a.mg).localeCompare(String(b.mg))).map(v => (
                          <div key={v.mg} className="rounded-md p-3" style={{ 
                            border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                            backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <div className="font-medium flex items-center gap-2"><Beaker size={14} /> {v.mg} {v.unit || 'mg'}</div>
                              <div className="text-xs">{v.totalMg} {v.unit || 'mg'}</div>
                            </div>
                            <ul className="mt-1 text-xs space-y-1" style={{ color: theme.text }}>
                              {Object.entries(v.vendors).sort((a,b)=>a[0].localeCompare(b[0])).map(([vendor, qtyMg]) => {
                                const vials = Math.max(1, Math.round((Number(qtyMg)||0) / (Number(v.mg)||1)))
                                return (
                                  <li key={vendor} className="flex items-center gap-2">
                                    <Package size={12} /> {vendor} ({vials} {vials === 1 ? 'vial' : 'vials'})
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Used / Depleted section - show on On Hand tab only */}
      {activeTab === 'onhand' && (
        <div className="space-y-6">
      {groups.some(g => g.totalVials <= 0) && (
              <>
                <div className="font-semibold" style={{ color: theme.primaryDark }}>Out of Stock</div>
                <hr className="mb-2" style={{ borderColor: theme.border }} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                  {groups.filter(g => g.totalVials <= 0).map(g => (
                    <div key={`oos-${g.name}`} className="relative p-3 rounded-lg content-card shadow-md hover:shadow-lg transition-shadow" style={{ 
                      border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                      backgroundColor: theme.cardBackground,
                      boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.4)' : undefined
                    }}>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div style={{ fontSize: '64px', color: 'rgba(185,28,28,0.10)', fontWeight: 800, transform: 'rotate(-20deg)' }}>OUT</div>
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold" style={{ color: theme.text }}>{g.name}</div>
                          <div className="flex items-center gap-1">
                            <div className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of Stock</div>
                            <button
                              onClick={() => {
                                if (isReadOnly) {
                                  setShowUpgradeModal(true);
                                  return;
                                }
                                setOutOfStockModalName(g.name);
                              }}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              style={{ color: theme.primary }}
                              title="Restore/Manage"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">No vials on hand.</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      )}

      <Modal 
        open={openAdd} 
        onClose={handleCloseStockpileModal} 
        title="Add to Stockpile" 
        titleExtra={
          <div className="flex items-center gap-2">
            <AutoSaveIndicator 
              isSaving={isSaving || isSavingToStockpile}
              lastSaved={lastSaved}
              theme={theme}
              compact={true}
              iconOnly={true}
            />
            {(isSaving || isSavingToStockpile) && (
              <span className="text-xs opacity-75" style={{ color: theme.textOnPrimary }}>
                {isSavingToStockpile ? 'Saving...' : 'Auto-saving...'}
              </span>
            )}
          </div>
        }
        theme={theme}
        variant="modern"
        maxWidth="max-w-2xl" 
        footer={(
        <div className="w-full flex items-center justify-end gap-3">
          <button 
            onClick={async () => { 
              try {
                setIsSavingToStockpile(true);
                setSaveError(null);
                
                if (isReadOnly) {
                  setShowUpgradeModal(true);
                  return;
                }
                
                // Validate required fields
                if (!form.name || !form.name.trim()) {
                  setSaveError('Peptide name is required');
                  setIsSavingToStockpile(false);
                  return;
                }
                
                if (!form.mg || form.mg.trim() === '') {
                  setSaveError('Amount is required');
                  setIsSavingToStockpile(false);
                  return;
                }
                
                if (!form.quantity || form.quantity.trim() === '') {
                  setSaveError('Quantity is required');
                  setIsSavingToStockpile(false);
                  return;
                }
                
                // Auto-create new vendor if it doesn't exist
                if (form.vendor && !vendors.some(v => v.name.toLowerCase() === form.vendor.toLowerCase())) {
                    addVendor({ name: form.vendor, isStub: true });
                }

                const finalVendor = (vendors || []).find(v => v.name === form.vendor);
                const now = new Date().toISOString();
                let itemToAdd = { 
                  ...form, 
                  id: generateId(), 
                  vendorId: finalVendor ? finalVendor.id : null,
                  createdAt: now,
                  updatedAt: now
                };
                
                // Convert kit to vials before saving
                if (itemToAdd.unit === 'kit') {
                    itemToAdd.quantity = (Number(itemToAdd.quantity) || 0) * 10;
                    itemToAdd.unit = 'vial';
                }

                setItems(prev => [itemToAdd, ...prev]); 
                markAsSubmitted(); // Clear auto-save data
                setOpenAdd(false); 
                setForm({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, capColor: '', batchNumber: '', date: '', useByDate: '', documentation: [] }) 
              } catch (error) {
                console.error('❌ Failed to save stockpile item:', error);
                setSaveError('Failed to save stockpile item. Please try again.');
              } finally {
                setIsSavingToStockpile(false);
              }
            }} 
            disabled={isSavingToStockpile || isReadOnly || !form.name?.trim() || !form.mg?.trim() || !form.quantity?.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-75" 
            style={{ 
              background: getPrimaryActionGradient(isSavingToStockpile || isReadOnly),
              color: (isSavingToStockpile || isReadOnly) ? (theme?.text || '#111827') : (theme?.textOnPrimary || '#ffffff'),
              border: 'none',
              boxShadow: (isSavingToStockpile || isReadOnly) ? 'none' : primaryActionDefaultShadow
            }}
            onMouseEnter={(e) => {
              if (isSavingToStockpile || isReadOnly) return;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = (isSavingToStockpile || isReadOnly) ? 'none' : primaryActionDefaultShadow;
              e.currentTarget.style.background = getPrimaryActionGradient(isSavingToStockpile || isReadOnly);
            }}
            title={isReadOnly ? "Upgrade to save stockpile items" : "Save stockpile changes"}
          >
            {isSavingToStockpile ? 'Saving…' : (isReadOnly ? 'Save Changes (Upgrade Required)' : 'Save Changes')}
          </button>
        </div>
      )}>
        <div className="space-y-6">
          {/* Error Display */}
          {saveError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-red-800">{saveError}</span>
              </div>
            </div>
          )}
          
          {/* VIAL DETAILS Section Header */}
          <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
            <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>VIAL DETAILS</h4>
          </div>

          {/* Main form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Peptide Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateFormData({ name: e.target.value })}
                placeholder="e.g., BPC-157, Lipo-C"
                className="w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
                style={{
                  border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                  backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                  color: theme.text,
                  boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
          {/* Amount & Quantity in two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Amount</label>
              <div 
                className="flex items-stretch rounded-lg overflow-hidden"
                style={{ 
                  border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                  boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <input 
                  type="text"
                  value={form.mg || ''} 
                  onChange={e => updateFormData({ mg: e.target.value })} 
                  placeholder="10"
                  className="flex-1 px-3 py-2 outline-none min-w-0"
                  style={{
                    backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                    color: theme.text
                  }}
                />
                <div 
                  className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                  style={{ 
                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                  }}
                >
                  {['mg', 'mL'].map(unit => (
                    <button 
                      key={unit} 
                      type="button" 
                      onClick={() => updateFormData({ mgUnit: unit })}
                      className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                        (form.mgUnit || 'mg') === unit 
                          ? 'text-white shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      style={(form.mgUnit || 'mg') === unit ? { backgroundColor: theme.primary } : {}}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Quantity</label>
              <div 
                className="flex items-stretch rounded-lg overflow-hidden"
                style={{ 
                  border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                  boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <input 
                  type="text"
                  value={form.quantity || ''} 
                  onChange={e => updateFormData({ quantity: e.target.value })} 
                  placeholder="5"
                  className="flex-1 px-3 py-2 outline-none min-w-0"
                  style={{
                    backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                    color: theme.text
                  }}
                />
                <div 
                  className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                  style={{ 
                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                  }}
                >
                  {['vial','kit'].map(k => (
                    <button 
                      key={k} 
                      type="button" 
                      onClick={() => updateFormData({ unit: k })}
                      className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                        ((form.unit || 'vial') === k) 
                          ? 'text-white shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      style={((form.unit || 'vial') === k) ? { backgroundColor: theme.primary } : {}}
                    >
                      {k.charAt(0).toUpperCase() + k.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <TextInput label="Crimp / Cap Color" value={form.capColor} onChange={v => updateFormData({ capColor: v })} placeholder="Clear Crimp/Gold Cap" theme={theme} uppercase={true} />
          
          {/* ORDER DETAILS Section Header */}
          <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
            <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>ORDER DETAILS</h4>
          </div>
          
          <VendorSuggestInput label="Vendor" value={form.vendor} onChange={v => updateFormData({ vendor: v })} placeholder="e.g., Pharm..." theme={theme} />
          
          {/* Purity & Batch Number in two columns */}
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Purity %" value={form.purity} onChange={v => updateFormData({ purity: v })} placeholder="e.g., 98" theme={theme} />
            <TextInput label="Batch #" value={form.batchNumber} onChange={v => updateFormData({ batchNumber: v })} placeholder="# XXX" theme={theme} uppercase={true} />
          </div>
          
          {/* Date Acquired & Use By Date in two columns */}
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Date Acquired" type="date" value={form.date} onChange={v => updateFormData({ date: v })} theme={theme} />
            <TextInput label="Use By" type="date" value={form.useByDate} onChange={v => updateFormData({ useByDate: v })} theme={theme} />
          </div>
          </div>
        </div>
        
        {/* Documentation Upload */}
        <div className="mt-4">
          <DocumentationUpload
            documentation={form.documentation}
            onChange={(documentation) => updateFormData({ documentation })}
            theme={theme}
            title="Post-Delivery Documentation"
            description="Upload images or links for received peptide documentation (photos of received vials, condition notes, quality check notes, etc.)"
            placeholder="Add photos of received vials, condition notes, quality check results, or other post-delivery documentation..."
            allowImages={true}
            allowLinks={true}
          />
        </div>
      </Modal>

      <Modal 
        open={!!manageName} 
        onClose={() => { setManageName(null); setManageRows([]); setShowHistory(false); clearManageSavedData(); }} 
        title={`${manageName || 'Manage'}`} 
        titleExtra={
          <AutoSaveIndicator 
            isSaving={isManageSaving}
            lastSaved={lastManageSaved}
            theme={theme}
            compact={true}
          />
        }
        theme={theme} 
        maxWidth="max-w-3xl" 
        footer={(
        <div className="w-full flex items-center justify-end gap-3">
          <button 
            onClick={() => {
              if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
              }
              saveManage();
            }} 
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95" 
            style={{ 
              background: getPrimaryActionGradient(false),
              color: theme?.textOnPrimary || '#ffffff',
              border: 'none',
              boxShadow: primaryActionDefaultShadow
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = primaryActionDefaultShadow;
              e.currentTarget.style.background = getPrimaryActionGradient(false);
            }}
          >
            Save Changes
          </button>
        </div>
      )}>
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <button 
              className="px-2 py-1 rounded text-xs transition-colors" 
              style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : theme.white, 
                border: theme.isDark ? 'none' : `1px solid ${theme.border}`, 
                color: theme.text,
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
              }} 
              onClick={() => setShowHistory(v => !v)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.white}
            >
              {showHistory ? 'Hide History' : 'History'}
            </button>
          </div>
          {showHistory && (
            <div className="rounded border p-2 max-h-40 overflow-auto text-xs" style={{ borderColor: theme.border }}>
              {(getStockHistory() || []).filter(h => (h.name || '') === (manageName || '')).slice(0,50).map(h => (
                <div key={h.id} className="flex items-center justify-between">
                  <span>{h.type} • {h.name} {h.mg}mg {h.vendor ? `• ${h.vendor}` : ''} {h.prevQty!=null ? `(from ${h.prevQty}${h.nextQty!=null?`→${h.nextQty}`:''})` : ''}</span>
                  <span style={{ color: theme.textLight }}>{new Date(h.date).toLocaleString()}</span>
                </div>
              ))}
              {(getStockHistory() || []).filter(h => (h.name || '') === (manageName || '')).length === 0 && (
                <div className="text-gray-500">No history yet for this peptide.</div>
              )}
            </div>
          )}
          {manageRows.map(row => (
            <div
              key={row.id}
              className="space-y-3 p-3 rounded-lg"
              style={{
                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                backgroundColor: theme.isDark ? '#111827' : theme.cardBackground,
                boxShadow: theme.isDark ? '0 1px 3px rgba(0,0,0,0.35)' : '0 2px 4px rgba(15, 23, 42, 0.08)'
              }}
            >
              <div className="space-y-2">
                <VendorSuggestInput
                  label="Vendor"
                  value={row.vendorId ? vendorMap[row.vendorId] : (row.vendor || '')}
                  onChange={v =>
                    updateManageData(prev =>
                      prev.map(r =>
                        r.id === row.id
                          ? { ...r, vendor: v, vendorId: (vendors || []).find(vnd => vnd.name === v)?.id || null }
                          : r
                      )
                    )
                  }
                  placeholder="Vendor"
                  theme={theme}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Amount</label>
                    <div
                      className="flex items-stretch rounded-lg overflow-hidden"
                      style={{
                        border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <input
                        type="text"
                        value={row.mg || ''}
                        onChange={e => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, mg: e.target.value } : r))}
                        placeholder="10"
                        className="flex-1 px-3 py-2 outline-none min-w-0"
                        style={{
                          backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                          color: theme.text
                        }}
                      />
                      <div
                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                        style={{
                          borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                          backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                        }}
                      >
                        {['mg', 'mL'].map(unit => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, mgUnit: unit } : r))}
                            className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                              (row.mgUnit || 'mg') === unit
                                ? 'text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                            style={(row.mgUnit || 'mg') === unit ? { backgroundColor: theme.primary } : {}}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Quantity</label>
                    <div
                      className="flex items-stretch rounded-lg overflow-hidden"
                      style={{
                        border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <input
                        type="text"
                        value={row.quantity || ''}
                        onChange={e => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))}
                        placeholder="5"
                        className="flex-1 px-3 py-2 outline-none min-w-0"
                        style={{
                          backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                          color: theme.text
                        }}
                      />
                      <div
                        className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                        style={{
                          borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                          backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                        }}
                      >
                        {['vial','kit'].map(k => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              const oldUnit = row.unit || 'vial';
                              if (oldUnit === k) return;
                              setManageRows(prev => prev.map(r => {
                                if (r.id !== row.id) return r;
                                const qty = Number(r.quantity) || 0;
                                let newQty = qty;
                                if (oldUnit === 'kit' && k === 'vial') {
                                  newQty = qty * 10;
                                } else if (oldUnit === 'vial' && k === 'kit') {
                                  if (qty > 0 && qty % 10 === 0) {
                                    newQty = qty / 10;
                                  } else {
                                    alert("You can only convert to kits if you have a multiple of 10 vials.");
                                    return r;
                                  }
                                }
                                return { ...r, unit: k, quantity: String(newQty) };
                              }));
                            }}
                            className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                              ((row.unit || 'vial') === k)
                                ? 'text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                            style={((row.unit || 'vial') === k) ? { backgroundColor: theme.primary } : {}}
                          >
                            {k.charAt(0).toUpperCase() + k.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <TextInput
                  label="Crimp / Cap Color"
                  value={row.capColor}
                  onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, capColor: v } : r))}
                  placeholder="Clear Crimp/Gold Cap"
                  theme={theme}
                  uppercase={true}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  label="Purity/Test %"
                  value={row.purity || ''}
                  onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, purity: v } : r))}
                  placeholder="e.g., 98"
                  theme={theme}
                />
                <TextInput
                  label="Batch #"
                  value={row.batchNumber}
                  onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, batchNumber: v } : r))}
                  placeholder="# XXX"
                  theme={theme}
                  uppercase={true}
                />
              </div>

              {/* Documentation Upload */}
              <div className="mt-4">
                <DocumentationUpload
                  documentation={row.documentation || []}
                  onChange={(documentation) => 
                    setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, documentation } : r))
                  }
                  theme={theme}
                  title="Documentation"
                  placeholder="Add photos of vials, COA links, batch documentation, etc."
                  allowImages={true}
                  allowLinks={true}
                />
              </div>

              <div className="flex justify-end">
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                  style={{
                    background: terracottaGradient,
                    color: '#ffffff',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = terracottaHoverGradient;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = terracottaGradient;
                  }}
                  onClick={() => removeManageRow(row.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button 
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95" 
            style={{ 
              background: theme.isDark ? '#1f2937' : `${theme.secondary}`,
              color: theme.primary,
              border: 'none'
            }} 
            onMouseEnter={(e) => {
              if (theme.isDark) {
                e.currentTarget.style.background = '#374151';
              } else {
                e.currentTarget.style.background = `${theme.primary}15`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.isDark ? '#1f2937' : `${theme.secondary}`;
            }}
            onClick={() => {
              if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
              }
              addManageRow();
            }}
          >
            + Add
          </button>
        </div>
      </Modal>
      
      {/* Merge Selection Modal */}
      <MergeSelectionModal
        open={showMergeSelectionModal}
        onClose={() => {
          setShowMergeSelectionModal(false)
          setMergeSourceGroup(null)
        }}
        sourceGroup={mergeSourceGroup}
        availableGroups={groups.filter(g => g.groupKey !== mergeSourceGroup?.groupKey && g.totalVials > 0)}
        onSelectGroup={handleSelectMergeGroup}
        theme={theme}
      />

      {/* Merge Confirmation Modal */}
      <MergeConfirmationModal
        open={showMergeModal}
        onClose={() => {
          setShowMergeModal(false)
          setMergeData({ source: null, target: null })
        }}
        onBack={() => {
          setShowMergeModal(false)
          setShowMergeSelectionModal(true)
        }}
        onConfirm={handleConfirmMerge}
        mergeData={mergeData}
        theme={theme}
      />

      {/* Out of Stock Options Modal */}
      <Modal
        open={!!outOfStockModalName}
        onClose={() => setOutOfStockModalName(null)}
        title={`${outOfStockModalName || ''} - Out of Stock!`}
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme.text }}>
            What would you like to do?
          </p>

          {/* Option Buttons */}
          <div className="space-y-3">
            {/* Found a Vial */}
            <button
              onClick={() => {
                openManage(outOfStockModalName);
                setOutOfStockModalName(null);
              }}
              className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md text-left"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.primary}20` }}>
                  <Package size={20} style={{ color: theme.primary }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: theme.primaryDark }}>Found a Vial?</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>Add vials back to your inventory</div>
                </div>
              </div>
            </button>

            {/* Incoming Order */}
            <button
              onClick={() => {
                setOutOfStockModalName(null);
                navigate('/app/orders');
              }}
              className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md text-left"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.success}20` }}>
                  <ShoppingCart size={20} style={{ color: theme.success }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: theme.primaryDark }}>Have an Incoming Order?</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>Track your order to automatically restock</div>
                </div>
              </div>
            </button>

            {/* Restore from History */}
            <button
              onClick={() => {
                openManage(outOfStockModalName);
                setOutOfStockModalName(null);
                setShowHistory(true);
              }}
              className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-md text-left"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.accent}20` }}>
                  <FileText size={20} style={{ color: theme.accent }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: theme.primaryDark }}>Restore from History</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>View usage history and restore if it was a mistake</div>
                </div>
              </div>
            </button>
          </div>

          {/* Cancel Button */}
          <div className="pt-2">
            <button
              onClick={() => setOutOfStockModalName(null)}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium border transition-all"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        actionAttempted="manage stockpile"
        theme={theme}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        theme={theme}
        readonly={true}
      />
    </section>
  )
}


