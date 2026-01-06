import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import CustomDropdown from '../components/common/inputs/CustomDropdown'
import BottomSheet from '../components/common/BottomSheet'
import { appendStockEvent, getStockHistory } from '../utils/stockHistory'
import { formatCurrency } from '../utils/currencyUtils'
import { PlusCircle, Filter, Edit, Package, Beaker, Percent, Hash, DollarSign, FileText, ShoppingCart, Merge, AlertCircle, Image as ImageIcon, Link as LinkIcon, TestTube, PackageOpen, ImageUp, X, PenTool, ChevronDown, Info, Calendar, Search, AlertTriangle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'
import DocumentationUpload from '../components/common/DocumentationUpload'
import ImagePreviewModal from '../components/common/ImagePreviewModal'
import StockpileCard from '../components/stockpile/StockpileCard'
import StockpileGroupCard from '../components/stockpile/StockpileGroupCard'
import IncomingGroupCard from '../components/stockpile/IncomingGroupCard'
import OutOfStockGroupCard from '../components/stockpile/OutOfStockGroupCard'
import MergeConfirmationModal from '../components/stockpile/MergeConfirmationModal'
import MergeSelectionModal from '../components/stockpile/MergeSelectionModal'
import DuplicateDetection from '../components/stockpile/DuplicateDetection'
import StockpileTipsBanner from '../components/stockpile/StockpileTipsBanner'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import useAutoSave from '../utils/useAutoSave'
import AutoSaveIndicator from '../components/common/AutoSaveIndicator'
import { saveAppData } from '../services/cloudStorage'
import { useFirebase } from '../context/FirebaseContext'
import GlassmorphismDatePicker from '../components/common/GlassmorphismDatePicker'
import ConfirmationModal from '../components/ui/ConfirmationModal'
import { recordDeletion } from '../utils/deletionTracking'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import { syncOrderDocumentationToStockpile } from '../utils/documentationSync'
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers'

export default function Stockpile() {
  const { theme } = useOutletContext()
  const navigate = useNavigate();
  const location = useLocation();
  const { vendors, addVendor, orders, setOrders, stockpile: items, setStockpile: setItems, protocols, reconItems, reconHistory, supplements, metrics, calendarNotes, scheduledBuys } = useAppContext();
  const { firebaseUser } = useFirebase();
  const { isReadOnly } = useSubscriptionAccess();
  const [activeTab, setActiveTab] = useState('onhand')
  const [stockpileFilter, setStockpileFilter] = useState('view all') // 'view all' | 'low' | 'well stocked'
  const [showStockpileSearch, setShowStockpileSearch] = useState(false)
  const [stockpileSearchQuery, setStockpileSearchQuery] = useState('')
  const [openAdd, setOpenAdd] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [viewingGroup, setViewingGroup] = useState(null) // For view modal
  const [previewImage, setPreviewImage] = useState(null)
  const [deleteOutOfStockGroup, setDeleteOutOfStockGroup] = useState(null) // For delete confirmation
  const [isTransitioning, setIsTransitioning] = useState(false) // Track modal transitions
  const [form, setForm] = useState({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', date: '', cost: '', priceUnit: 'vial', documentation: [], mgUnit: 'mg', unit: 'vial' })
  const [isAmountFocused, setIsAmountFocused] = useState(false)
  const [isQuantityFocused, setIsQuantityFocused] = useState(false)
  const [isPriceFocused, setIsPriceFocused] = useState(false)
  const [isAmountUnitDropdownOpen, setIsAmountUnitDropdownOpen] = useState(false)
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false)
  const [isPriceUnitDropdownOpen, setIsPriceUnitDropdownOpen] = useState(false)
  const [manageRowDropdowns, setManageRowDropdowns] = useState({}) // { [rowId]: { amountUnit: false, unit: false } }
  const [expandedManageRows, setExpandedManageRows] = useState({}) // { [rowId]: boolean }
  
  // Handle direct navigation to specific stockpile item (from search)
  useEffect(() => {
    if (location.state?.openStockpileId) {
      const itemToOpen = items.find(i => i.id === location.state.openStockpileId);
      if (itemToOpen) {
        // Pre-populate form with the item data
        setForm({
          name: itemToOpen.name || '',
          mg: itemToOpen.mg || '',
          quantity: itemToOpen.quantity || '',
          vendor: itemToOpen.vendor || '',
          vendorId: itemToOpen.vendorId || null,
          purity: itemToOpen.purity || '',
          capColor: itemToOpen.capColor || '',
          batchNumber: itemToOpen.batchNumber || '',
          date: itemToOpen.date || '',
          cost: itemToOpen.cost || '',
          priceUnit: itemToOpen.priceUnit || 'vial',
          documentation: itemToOpen.documentation || []
        });
        setOpenAdd(true);
        // Clear state after use
        window.history.replaceState({}, document.title);
      }
    }
    
    // Handle navigation back from orders page - set active tab
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear state after use
      window.history.replaceState({}, document.title);
    }
  }, [location.state, items]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!isAmountUnitDropdownOpen && !isUnitDropdownOpen && !isPriceUnitDropdownOpen && Object.values(manageRowDropdowns).every(v => !v.amountUnit && !v.unit)) return;

    const handleClickOutside = (event) => {
      const isClickInside = event.target.closest('[data-dropdown-container]');
      if (!isClickInside) {
        setIsAmountUnitDropdownOpen(false);
        setIsUnitDropdownOpen(false);
        setIsPriceUnitDropdownOpen(false);
        // Close all manage row dropdowns
        setManageRowDropdowns({});
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isAmountUnitDropdownOpen, isUnitDropdownOpen, isPriceUnitDropdownOpen, manageRowDropdowns]);
  
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
  const [mergeSourceItem, setMergeSourceItem] = useState(null) // For individual item merge
  
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
      const combinedQuery = stockpileSearchQuery || query || searchQuery;
      return (
        (!vendorFilter || vendorName.toLowerCase().includes(vendorFilter.toLowerCase())) &&
        (!combinedQuery || (i.name || '').toLowerCase().includes(combinedQuery.toLowerCase()) || String(i.batchNumber || '').toLowerCase().includes(combinedQuery.toLowerCase()))
      )
    })
  }, [items, vendorFilter, query, searchQuery, stockpileSearchQuery, vendorMap])

  const groups = useMemo(() => {
    const map = new Map()
    for (const it of filtered) {
      // Only treat as Unknown if name is truly empty/null/undefined (not the string "Unknown")
      const name = (!it.name || it.name.trim() === '') ? 'Unknown' : it.name
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
    return Array.from(map.values()).sort((a, b) => {
      // Sort Unknown groups to the end
      if (a.name === 'Unknown' && b.name !== 'Unknown') return 1
      if (b.name === 'Unknown' && a.name !== 'Unknown') return -1
      return a.name.localeCompare(b.name)
    })
  }, [filtered])

  // Filter groups based on stock status
  const filteredGroups = useMemo(() => {
    if (stockpileFilter === 'view all') {
      return groups
    } else if (stockpileFilter === 'low') {
      return groups.filter(g => {
        const hasLowStock = Object.values(g.variants).some(v => v.totalVials <= 2)
        return hasLowStock && g.totalVials > 0
      })
    } else if (stockpileFilter === 'well stocked') {
      return groups.filter(g => {
        const hasLowStock = Object.values(g.variants).some(v => v.totalVials <= 2)
        return !hasLowStock && g.totalVials > 0
      })
    }
    return groups
  }, [groups, stockpileFilter])

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const allCount = groups.filter(g => g.totalVials > 0).length
    const lowCount = groups.filter(g => {
      const hasLowStock = Object.values(g.variants).some(v => v.totalVials <= 2)
      return hasLowStock && g.totalVials > 0
    }).length
    const wellStockedCount = groups.filter(g => {
      const hasLowStock = Object.values(g.variants).some(v => v.totalVials <= 2)
      return !hasLowStock && g.totalVials > 0
    }).length
    return { all: allCount, low: lowCount, wellStocked: wellStockedCount }
  }, [groups])

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
    // Special handling for "Unknown" category: match items with empty/null names OR explicitly named "Unknown"
    const matchesName = (itemName, targetName) => {
      const normalizedItemName = itemName || ''
      if (targetName === 'Unknown') {
        return normalizedItemName === '' || normalizedItemName === 'Unknown'
      }
      return normalizedItemName === targetName
    }
    const rows = ((items || []) || []).filter(i => matchesName(i.name, peptideName)).map(i => ({ ...i }))
    if (rows.length === 0) rows.push({ id: generateId(), name: peptideName, mg: '', quantity: '', unit: 'vial', cost: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', documentation: [], mgUnit: 'mg' })
    setManageRows(rows)
  }
  
  // Handle stockpile updates when orders change (e.g., delivered status)
  const handleStockpileUpdate = (previousOrder, newOrder) => {
    if (!newOrder) {
      console.log('⚠️ handleStockpileUpdate: newOrder is null/undefined, skipping');
      return;
    }

    const prevStatus = (previousOrder?.status || '').toLowerCase();
    const newStatus = (newOrder?.status || '').toLowerCase();
    
    const wasDelivered = prevStatus.includes('delivered');
    const isDelivered = newStatus.includes('delivered');

    // Check if shipping costs should be included
    const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
    const includeShipping = settings.orders?.includeShippingInCosts ?? true;

    // If both orders are delivered, we need to update existing stockpile items
    if (wasDelivered && isDelivered && previousOrder && newOrder) {
      const orderIdPrefix = `orderitem-${newOrder.id}-`;
      
      // Remove old stockpile items for this order
      setItems(prev => prev.filter(stockItem => {
        const itemId = stockItem?.id;
        if (!itemId || typeof itemId !== 'string') return true;
        return !itemId.startsWith(orderIdPrefix);
      }));
      
      // Add updated stockpile items
      const updatedStockItems = (newOrder.items || []).map(item => {
        const quantity = Number(item.quantity) || 1;
        const isKit = (item.unit || '').toLowerCase() === 'kit';
        const vialsPerItem = isKit ? 10 : 1;
        const price = Number(item.price) || 0;
        
        let costPerVial;
        if (includeShipping) {
          const shippingCost = parseFloat(newOrder.shippingCost) || 0;
          const totalOrderCost = (newOrder.items || []).reduce((sum, orderItem) => {
            const orderItemPrice = parseFloat(orderItem.price) || 0;
            const orderItemQuantity = parseInt(orderItem.quantity, 10) || 1;
            return sum + (orderItemPrice * orderItemQuantity);
          }, 0) + shippingCost;
          const itemCostShare = totalOrderCost > 0 ? (price * quantity) / (totalOrderCost - shippingCost) : 1;
          const itemShippingShare = shippingCost * itemCostShare;
          const totalItemCost = (price * quantity) + itemShippingShare;
          costPerVial = vialsPerItem > 1 ? totalItemCost / vialsPerItem : totalItemCost;
        } else {
          costPerVial = vialsPerItem > 1 ? price / vialsPerItem : price;
        }

        return {
          id: `orderitem-${newOrder.id}-${item.id}`,
          name: item.name || '',
          mg: item.mg || '',
          mgUnit: item.mgUnit || 'mg',
          quantity: quantity * vialsPerItem,
          unit: 'vial',
          cost: costPerVial,
          costPerMg: item.costPerMg || '',
          vendor: newOrder.vendor || '',
          vendorId: newOrder.vendorId,
          purchaseDate: newOrder.date,
          notes: `From order #${newOrder.publicOrderNumber ?? newOrder.id}`,
          orderId: newOrder.id
        };
      });
      setItems(prev => [...prev, ...updatedStockItems]);
      return;
    }

    // Status changed TO Delivered: Add items to stockpile.
    if (!wasDelivered && isDelivered) {
      if (!newOrder.items || newOrder.items.length === 0) {
        console.log('⚠️ handleStockpileUpdate: Order is delivered but has no items, skipping stockpile update');
        return;
      }

      const newStockItems = (newOrder.items || []).map(item => {
        const quantity = Number(item.quantity) || 1;
        const isKit = (item.unit || '').toLowerCase() === 'kit';
        const vialsPerItem = isKit ? 10 : 1;
        const price = Number(item.price) || 0;
        
        let costPerVial;
        if (includeShipping) {
          const shippingCost = parseFloat(newOrder.shippingCost) || 0;
          const totalOrderCost = (newOrder.items || []).reduce((sum, orderItem) => {
            const orderItemPrice = parseFloat(orderItem.price) || 0;
            const orderItemQuantity = parseInt(orderItem.quantity, 10) || 1;
            return sum + (orderItemPrice * orderItemQuantity);
          }, 0) + shippingCost;
          const itemCostShare = totalOrderCost > 0 ? (price * quantity) / (totalOrderCost - shippingCost) : 1;
          const itemShippingShare = shippingCost * itemCostShare;
          const totalItemCost = (price * quantity) + itemShippingShare;
          costPerVial = vialsPerItem > 1 ? totalItemCost / vialsPerItem : totalItemCost;
        } else {
          costPerVial = vialsPerItem > 1 ? price / vialsPerItem : price;
        }

        return {
          id: `orderitem-${newOrder.id}-${item.id}`,
          name: item.name || '',
          mg: item.mg || '',
          mgUnit: item.mgUnit || 'mg',
          quantity: quantity * vialsPerItem,
          unit: 'vial',
          cost: costPerVial,
          costPerMg: item.costPerMg || '',
          vendor: newOrder.vendor || '',
          vendorId: newOrder.vendorId,
          purchaseDate: newOrder.date,
          notes: `From order #${newOrder.publicOrderNumber ?? newOrder.id}`,
          orderId: newOrder.id
        };
      });

      // Sync documentation from order to stockpile items
      const stockItemsWithDocs = syncOrderDocumentationToStockpile(newOrder, newStockItems);
      setItems(prev => [...prev, ...stockItemsWithDocs]);
    } 
    // Status changed FROM Delivered: Remove items from stockpile.
    else if (wasDelivered && !isDelivered) {
      const orderIdPrefix = `orderitem-${previousOrder.id}-`;
      setItems(prev => prev.filter(stockItem => {
        const itemId = stockItem?.id;
        if (!itemId || typeof itemId !== 'string') return true;
        return !itemId.startsWith(orderIdPrefix);
      }));
    }
  };

  const handleEditIncoming = (peptideName) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Find all non-delivered orders that contain items with this peptide name
    const matchesName = (itemName, targetName) => {
      const normalizedItemName = itemName || ''
      if (targetName === 'Unknown') {
        return normalizedItemName === '' || normalizedItemName === 'Unknown'
      }
      return normalizedItemName === targetName
    }
    
    const relevantOrders = (orders || []).filter(o => {
      const status = (o.status || '').toLowerCase()
      if (status.includes('delivered')) return false
      
      // Check if any item in this order matches the peptide name
      return (o.items || []).some(item => matchesName(item.name, peptideName))
    })
    
    // Open modal with the first order (or show all if multiple)
    if (relevantOrders.length > 0) {
      // Open the first order in a modal
      setEditingOrder(relevantOrders[0]);
      setShowOrderModal(true);
    }
  }
  const addManageRow = () => {
    const newRowId = generateId();
    setManageRows(prev => ([...prev, { id: newRowId, name: manageName, mg: '', quantity: '', unit: 'vial', cost: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '', documentation: [], mgUnit: 'mg' }]));
    // Auto-expand the new row and scroll into view smoothly
    setTimeout(() => {
      setExpandedManageRows(prev => ({ ...prev, [newRowId]: true }));
      // Scroll to the new row after a brief delay to allow DOM update
      setTimeout(() => {
        const newRowElement = document.getElementById(`manage-row-${newRowId}`);
        if (newRowElement) {
          newRowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }, 50);
  }
  const removeManageRow = (id) => setManageRows(prev => prev.filter(r => r.id !== id))
  
  const deleteManageRow = async (id) => {
    try {
      // Find the item to delete
      const itemToDelete = manageRows.find(r => r.id === id);
      if (!itemToDelete) return;

      // Record deletion with item snapshot for restore functionality
      recordDeletion('stockpile', itemToDelete.id, itemToDelete);
      
      // Remove from manage rows
      setManageRows(prev => prev.filter(r => r.id !== id));
      
      // Delete the item from stockpile
      const updatedItems = items.filter(i => i.id !== id);
      setItems(updatedItems);
      
      // Sync to cloud
      if (firebaseUser) {
        try {
          const userId = firebaseUser.uid;
          const appData = {
            protocols: protocols || [],
            reconItems: reconItems || [],
            reconHistory: reconHistory || [],
            supplements: supplements || [],
            orders: orders || [],
            metrics: metrics || [],
            vendors: vendors || [],
            calendarNotes: calendarNotes || {},
            stockpile: updatedItems,
            scheduledBuys: scheduledBuys || []
          };
          await saveAppData(userId, appData, { skipMerge: true });
        } catch (e) {
          console.error('Failed to sync deleted item to cloud:', e);
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { 
              message: 'Item deleted locally but failed to sync to cloud', 
              type: 'warning' 
            } 
          }));
          return;
        }
      }
      
      // If no more rows, close the modal
      if (manageRows.length === 1) {
        setManageName(null);
        setManageRows([]);
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Item deleted successfully', 
          type: 'success' 
        } 
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Failed to delete item. Please try again.', 
          type: 'error' 
        } 
      }));
    }
  }
  
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

  // Handle merging individual item from Unknown category
  const handleMergeIndividualItem = (item) => {
    setMergeSourceItem(item)
    setShowMergeSelectionModal(true)
  }

  const handleSelectGroupForItem = (targetGroup) => {
    if (!mergeSourceItem) return
    // Create a temporary group structure for the single item
    const tempSourceGroup = {
      name: mergeSourceItem.name || 'Unknown',
      groupKey: `temp-${mergeSourceItem.id}`,
      totalVials: Number(mergeSourceItem.quantity) || 0,
      totalMg: (Number(mergeSourceItem.quantity) || 0) * (Number(mergeSourceItem.mg) || 0),
      unit: mergeSourceItem.mgUnit || 'mg',
      variants: {
        [`${mergeSourceItem.mg || ''}__${mergeSourceItem.mgUnit || 'mg'}`]: {
          items: [mergeSourceItem]
        }
      }
    }
    setMergeData({ source: tempSourceGroup, target: targetGroup })
    setShowMergeModal(true)
    setShowMergeSelectionModal(false)
    setMergeSourceItem(null)
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
      
      // If merging from manage modal (individual item), remove it from manageRows
      if (mergeSourceItem) {
        setManageRows(prev => {
          const remaining = prev.filter(r => r.id !== mergeSourceItem.id)
          // If no more rows, close the manage modal
          if (remaining.length === 0) {
            setTimeout(() => {
              setManageName(null)
              setManageRows([])
            }, 100)
          }
          return remaining
        })
        setMergeSourceItem(null)
      }
      
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
      { value: 'incoming', label: 'Incoming' },
      { value: 'outofstock', label: 'Out of Stock' }
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
  const saveManage = async () => {
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
    
    // Special handling for "Unknown" category: match items with empty/null names OR explicitly named "Unknown"
    const matchesManageName = (itemName) => {
      const normalizedItemName = itemName || ''
      if (manageName === 'Unknown') {
        return normalizedItemName === '' || normalizedItemName === 'Unknown'
      }
      return normalizedItemName === manageName
    }
    
    const others = (items || []).filter(i => !matchesManageName(i.name))
    
    // Track deleted items for logging
    const before = (items || []).filter(i => matchesManageName(i.name))
    const deletedItems = before.filter(b => {
      const afterMatch = cleaned.find(a => String(a.mg) === String(b.mg) && (a.vendorId ? a.vendorId === b.vendorId : (a.vendor||'') === (b.vendor||'')))
      return !afterMatch
    })
    
    if (deletedItems.length > 0) {
      console.log('🗑️ Deleting stockpile items:', deletedItems.map(i => `${i.name} ${i.mg}mg from ${i.vendorId ? vendorMap[i.vendorId] : i.vendor}`).join(', '))
    }
    
    // Add/update timestamps for modified items
    const now = new Date().toISOString();
    const cleanedWithTimestamps = cleaned.map(item => ({
      ...item,
      updatedAt: now,
      createdAt: item.createdAt || now
    }));
    
    // Append history snapshots and usage markers
    try {
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
    
    const updatedItems = [...cleanedWithTimestamps, ...others]
    setItems(updatedItems)
    
    // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletions persist
    // This prevents server data from restoring deleted items
    if (firebaseUser && deletedItems.length > 0) {
      try {
        const userId = firebaseUser.uid;
        const appData = {
          protocols: protocols || [],
          reconItems: reconItems || [],
          reconHistory: reconHistory || [],
          supplements: supplements || [],
          orders: orders || [],
          metrics: metrics || [],
          vendors: vendors || [],
          calendarNotes: calendarNotes || {},
          stockpile: updatedItems, // Use updated items with deletions
          scheduledBuys: scheduledBuys || []
        };
        
        // Force immediate sync with skipMerge to overwrite server data
        const syncResult = await saveAppData(userId, appData, { skipMerge: true });
        if (syncResult) {
          console.log('✅ Deleted items synced to cloud immediately');
        } else {
          console.error('❌ Failed to sync deleted items to cloud');
        }
      } catch (error) {
        console.error('❌ Error syncing deleted items to cloud:', error);
        // Don't throw - the auto-sync will handle it
      }
    }
    
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
      setShowCloseConfirmation(true);
      return;
    }
    
    setOpenAdd(false);
    clearSavedData();
  };

  const handleConfirmClose = () => {
    setOpenAdd(false);
    clearSavedData();
    setShowCloseConfirmation(false);
  };

  return (
    <section className="space-y-4">
      <StockpileTipsBanner theme={theme} />
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
            
            {/* Filter and Search */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                {/* Stock Status Filter - Dropdown */}
                <div className="flex-1">
                  <CustomDropdown
                    value={stockpileFilter}
                    onChange={setStockpileFilter}
                    options={[
                      { 
                        value: 'view all', 
                        label: `View All (${filterCounts.all})`,
                        icon: <Package size={16} style={{ color: theme.textLight }} />
                      },
                      { 
                        value: 'low', 
                        label: `Low (${filterCounts.low})`,
                        icon: <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                      },
                      { 
                        value: 'well stocked', 
                        label: `Well Stocked (${filterCounts.wellStocked})`,
                        icon: <Package size={16} style={{ color: theme.primary }} />
                      }
                    ]}
                    theme={theme}
                    placeholder="Filter stockpile..."
                    outlined={true}
                    customShadow={true}
                  />
                </div>

                {/* Search Input - Inline with Dropdown */}
                <div className="relative" style={{ width: showStockpileSearch ? '250px' : 'auto' }}>
                  {showStockpileSearch ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={stockpileSearchQuery}
                        onChange={(e) => setStockpileSearchQuery(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                        className="w-full px-4 py-3.5 pr-10 text-sm border rounded-xl transition-all"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                          color: theme.isDark ? theme.text : '#181A18',
                          boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                          minWidth: '200px'
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowStockpileSearch(false)
                            setStockpileSearchQuery('')
                          }
                        }}
                        onBlur={(e) => {
                          // Don't close if clicking on the close button
                          if (!e.currentTarget.parentElement.contains(e.relatedTarget)) {
                            // Only close if search is empty
                            if (!stockpileSearchQuery.trim()) {
                              setShowStockpileSearch(false)
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setStockpileSearchQuery('')
                          setShowStockpileSearch(false)
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors"
                        style={{
                          color: theme.textLight
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <X size={18} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowStockpileSearch(true)
                      }}
                      className="p-2.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        border: `1px solid ${theme.border}`,
                        color: theme.text,
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                      }}
                      title="Search stockpile"
                    >
                      <Search size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Duplicate Detection */}
            <DuplicateDetection
              groups={filteredGroups.filter(g => g.totalVials > 0)}
              theme={theme}
              onMergeRequest={handleMergeRequest}
              onDismissSuggestion={handleDismissDuplicate}
              dismissedDuplicates={dismissedDuplicates}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.filter(g => g.totalVials > 0).map(g => {
                    // Check if this is an "Unknown" group (only truly empty/null names, not the string "Unknown")
                    const isUnknownGroup = (!g.name || g.name.trim() === '');
                    
                    return (
                      <StockpileGroupCard
                        key={g.name}
                        group={g}
                        theme={theme}
                        isUnknownGroup={isUnknownGroup}
                        vendorMap={vendorMap}
                        isReadOnly={isReadOnly}
                        onCardClick={() => {
                          // Open view modal first
                          setViewingGroup(g);
                        }}
                        onViewDetails={() => {
                          if (isReadOnly) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          // Smooth transition: close view modal first, then open manage modal
                          setIsTransitioning(true);
                          setViewingGroup(null);
                          setTimeout(() => {
                            openManage(g.name);
                            setIsTransitioning(false);
                          }, 450);
                        }}
                        onMergeIndividualItem={handleMergeIndividualItem}
                        onDeleteItem={async (item) => {
                          // Show confirmation dialog
                          if (!window.confirm(`Are you sure you want to delete this item?\n\n${item.name || 'Unknown'} - ${item.mg}${item.mgUnit || 'mg'} from ${item.vendorId ? vendorMap[item.vendorId] : item.vendor || 'Unknown'}`)) {
                            return;
                          }

                          try {
                            // Record deletion with item snapshot for restore functionality
                            recordDeletion('stockpile', item.id, item);
                            
                            // Delete the item directly
                            const updatedItems = items.filter(i => i.id !== item.id);
                            setItems(updatedItems);
                            
                            // Sync to cloud
                            if (firebaseUser) {
                              try {
                                const userId = firebaseUser.uid;
                                const appData = {
                                  protocols: protocols || [],
                                  reconItems: reconItems || [],
                                  reconHistory: reconHistory || [],
                                  supplements: supplements || [],
                                  orders: orders || [],
                                  metrics: metrics || [],
                                  vendors: vendors || [],
                                  calendarNotes: calendarNotes || {},
                                  stockpile: updatedItems,
                                  scheduledBuys: scheduledBuys || []
                                };
                                await saveAppData(userId, appData, { skipMerge: true });
                              } catch (e) {
                                console.error('Failed to sync deleted item to cloud:', e);
                                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                  detail: { 
                                    message: 'Item deleted locally but failed to sync to cloud', 
                                    type: 'warning' 
                                  } 
                                }));
                                return;
                              }
                            }
                            
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                              detail: { 
                                message: 'Item deleted successfully', 
                                type: 'success' 
                              } 
                            }));
                          } catch (error) {
                            console.error('Error deleting item:', error);
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                              detail: { 
                                message: 'Failed to delete item. Please try again.', 
                                type: 'error' 
                              } 
                            }));
                          }
                        }}
                        onViewOrder={(orderId) => {
                          navigate(`/app/orders`, { state: { openOrderId: orderId } });
                        }}
                        onSendToRecon={(item, group) => {
                          try {
                            const payload = { 
                              peptide: group.name, 
                              mg: String(item.mg), 
                              mgUnit: item.mgUnit || 'mg',
                              vendor: item.vendorId ? (vendorMap[item.vendorId] || item.vendor) : item.vendor, 
                              vendorId: item.vendorId || null,
                              cost: item.cost || '',
                              costPerMg: item.costPerMg || '',
                              stockpileId: item.id,
                              quantity: item.quantity,
                              unit: item.unit,
                              quantityUsed: 1,
                              dateAcquired: item.date || ''
                            };
                            localStorage.setItem('tpprover_recon_prefill', JSON.stringify(payload));
                            navigate('/app/recon');
                          } catch { }
                        }}
                        onPreviewImage={setPreviewImage}
                        getUseByStatus={getUseByStatus}
                        onCompleteEntry={(item) => {
                          // Pre-fill form with item data and open add modal
                          setForm({
                            name: '',
                            mg: item.mg || '',
                            quantity: item.quantity || '',
                            vendor: item.vendor || '',
                            vendorId: item.vendorId || null,
                            purity: item.purity || '',
                            capColor: item.capColor || '',
                            batchNumber: item.batchNumber || '',
                            date: item.date || '',
                            cost: item.cost || '',
                            priceUnit: item.priceUnit || 'vial',
                            documentation: item.documentation || [],
                            mgUnit: item.mgUnit || 'mg',
                            unit: item.unit || 'vial'
                          });
                          setOpenAdd(true);
                          // Delete the incomplete item after opening form
                          const updatedItems = items.filter(i => i.id !== item.id);
                          setItems(updatedItems);
                          if (firebaseUser) {
                            try {
                              const userId = firebaseUser.uid;
                              const appData = {
                                protocols: protocols || [],
                                reconItems: reconItems || [],
                                reconHistory: reconHistory || [],
                                supplements: supplements || [],
                                orders: orders || [],
                                metrics: metrics || [],
                                vendors: vendors || [],
                                calendarNotes: calendarNotes || {},
                                stockpile: updatedItems,
                                scheduledBuys: scheduledBuys || []
                              };
                              saveAppData(userId, appData, { skipMerge: true });
                            } catch (e) {
                              console.error('Failed to sync to cloud:', e);
                            }
                          }
                        }}
                      />
                    );
                })}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incomingGroups.map(g => (
                  <IncomingGroupCard
                    key={`incoming-${g.name}`}
                    group={g}
                    theme={theme}
                    orders={orders}
                    vendorMap={vendorMap}
                    onViewOrder={(orderId) => {
                      if (isReadOnly) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      const orderToOpen = orders.find(o => o.id === orderId);
                      if (orderToOpen) {
                        setEditingOrder(orderToOpen);
                        setShowOrderModal(true);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

        {/* Out of Stock Tab */}
        {activeTab === 'outofstock' && (
          <div>
            {groups.filter(g => g.totalVials <= 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                  <Package size={32} style={{ color: theme.primary }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Out of Stock Items</h3>
                <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                  Items that have been depleted will appear here. You can restore them by adding new inventory.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.filter(g => g.totalVials <= 0).map(g => (
                  <OutOfStockGroupCard
                    key={`oos-${g.name}`}
                    group={g}
                    theme={theme}
                    isReadOnly={isReadOnly}
                    onDelete={(group) => {
                      if (isReadOnly) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      setDeleteOutOfStockGroup(group);
                    }}
                    onCardClick={() => {
                      if (isReadOnly) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      setOutOfStockModalName(g.name);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      <BottomSheet 
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
        maxHeight="90vh" 
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
                
                // Reset form first
                setForm({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, capColor: '', batchNumber: '', date: '', cost: '', priceUnit: 'vial', documentation: [], mgUnit: 'mg', unit: 'vial' });
                
                // Show success notification
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                  detail: { 
                    message: `✅ ${itemToAdd.name} added to stockpile!`, 
                    type: 'success' 
                  } 
                }));
                
                // Reset saving state immediately
                setIsSavingToStockpile(false);
                
                // Close modal - use requestAnimationFrame to ensure it happens after React state updates
                requestAnimationFrame(() => {
                  setOpenAdd(false);
                });
              } catch (error) {
                console.error('❌ Failed to save stockpile item:', error);
                setSaveError('Failed to save stockpile item. Please try again.');
                setIsSavingToStockpile(false);
              }
            }} 
            disabled={isSavingToStockpile || isReadOnly || !form.name?.trim() || !form.mg?.trim() || !form.quantity?.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-75 whitespace-nowrap min-w-fit" 
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
          <div className="flex items-center gap-4 mb-3">
            <TestTube size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Vial Details</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Research Parameters
                </span>
              </div>
            </div>
          </div>

          {/* Main form */}
          <div className="space-y-4">
            <TextInput 
              label="Peptide Name" 
                value={form.name}
              onChange={v => updateFormData({ name: v })} 
              placeholder="e.g., BPC-157, Lipo-C" 
              theme={theme}
              customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
              outlined={true}
              customTextColor={theme.isDark ? null : "#181A18"}
            />
            {/* Amount & Quantity in two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <div 
                  className="flex items-stretch rounded-lg"
                  style={{ 
                    border: `1px solid #f0eee7`,
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                  }}
                >
                <input 
                  type="text"
                  id="amount-input"
                  value={form.mg || ''} 
                  onChange={e => updateFormData({ mg: e.target.value })} 
                  onFocus={() => setIsAmountFocused(true)}
                  onBlur={(e) => {
                    setTimeout(() => {
                      const relatedTarget = e.relatedTarget || document.activeElement
                      const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                      if (!isClickingDropdown && !isAmountUnitDropdownOpen) {
                        setIsAmountFocused(false)
                      }
                    }, 150)
                  }}
                  placeholder=" "
                  className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.isDark ? theme.text : '#181A18',
                    border: 'none',
                    paddingLeft: '12px',
                    paddingRight: '8px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsAmountUnitDropdownOpen(prev => !prev)}
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                  data-dropdown-container
                  style={{ 
                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                    color: theme.isDark ? theme.text : '#181A18',
                    minWidth: '100px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                  }}
                >
                  <span className="text-sm font-semibold">
                    {(form.mgUnit || 'mg')}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div 
                  className="relative overflow-hidden transition-all duration-300 ease-in-out"
                  data-dropdown-container
                  style={{
                    maxHeight: isAmountUnitDropdownOpen ? '300px' : '0',
                    opacity: isAmountUnitDropdownOpen ? 1 : 0,
                    transform: isAmountUnitDropdownOpen ? 'translateY(0)' : 'translateY(-10px)',
                    pointerEvents: isAmountUnitDropdownOpen ? 'auto' : 'none'
                  }}
                >
                  <div 
                    className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                    style={{
                      backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                      borderColor: theme.border,
                      minWidth: '100px',
                      boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                      {[
                        { value: 'mg', label: 'mg' },
                        { value: 'mL', label: 'mL' },
                        { value: 'g', label: 'g' },
                        { value: 'IU', label: 'IU' }
                      ].map((option, optIdx) => (
                        <React.Fragment key={option.value}>
                          {optIdx > 0 && (
                            <div 
                              className="h-px mx-2"
                              style={{ backgroundColor: theme.border }}
                            />
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              updateFormData({ mgUnit: option.value });
                              setIsAmountUnitDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                            style={{
                              color: (form.mgUnit || 'mg') === option.value ? theme.primary : theme.text,
                              backgroundColor: 'transparent',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                              e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = (form.mgUnit || 'mg') === option.value ? theme.primary : theme.text;
                            }}
                          >
                            {option.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              <label 
                htmlFor="amount-input"
                className="absolute pointer-events-none transition-all"
                style={{
                  fontSize: (isAmountFocused || (form.mg && form.mg.trim())) ? '0.75rem' : '0.9375rem',
                  top: (isAmountFocused || (form.mg && form.mg.trim())) ? '-8px' : '14px',
                  left: (isAmountFocused || (form.mg && form.mg.trim())) ? '12px' : '16px',
                  padding: (isAmountFocused || (form.mg && form.mg.trim())) ? '0 4px' : '0',
                  background: (isAmountFocused || (form.mg && form.mg.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                  color: (isAmountFocused || (form.mg && form.mg.trim())) ? theme.primary : (theme.textLight || theme.text),
                  fontWeight: 500
                }}
              >
                Amount
              </label>
            </div>
            <div className="relative">
              <div 
                className="flex items-stretch rounded-lg"
                style={{ 
                  border: `1px solid #f0eee7`,
                  boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                  backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                }}
              >
                <input 
                  type="text"
                  id="quantity-input"
                  value={form.quantity || ''} 
                  onChange={e => updateFormData({ quantity: e.target.value })} 
                  onFocus={() => setIsQuantityFocused(true)}
                  onBlur={(e) => {
                    setTimeout(() => {
                      const relatedTarget = e.relatedTarget || document.activeElement
                      const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                      if (!isClickingDropdown && !isUnitDropdownOpen) {
                        setIsQuantityFocused(false)
                      }
                    }, 150)
                  }}
                  placeholder=" "
                  className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.isDark ? theme.text : '#181A18',
                    border: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsUnitDropdownOpen(prev => !prev)}
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                  data-dropdown-container
                  style={{ 
                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                    color: theme.isDark ? theme.text : '#181A18',
                    minWidth: '100px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                  }}
                >
                  <span className="text-sm font-semibold">
                    {(() => {
                      const unit = (form.unit || 'vial').toLowerCase();
                      const quantity = Number(form.quantity) || 1;
                      if (unit === 'vial') {
                        return quantity === 1 ? 'Vial' : 'Vials';
                      } else if (unit === 'kit') {
                        return quantity === 1 ? 'Kit' : 'Kits';
                      } else if (unit === 'bottle') {
                        return quantity === 1 ? 'Bottle' : 'Bottles';
                      } else if (unit === 'tablets') {
                        return 'Tablets';
                      }
                      return unit.charAt(0).toUpperCase() + unit.slice(1);
                    })()}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div 
                  className="relative overflow-hidden transition-all duration-300 ease-in-out"
                  data-dropdown-container
                  style={{
                    maxHeight: isUnitDropdownOpen ? '300px' : '0',
                    opacity: isUnitDropdownOpen ? 1 : 0,
                    transform: isUnitDropdownOpen ? 'translateY(0)' : 'translateY(-10px)',
                    pointerEvents: isUnitDropdownOpen ? 'auto' : 'none'
                  }}
                >
                  <div 
                    className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                    style={{
                      backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                      borderColor: theme.border,
                      minWidth: '120px',
                      boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                      {[
                        { value: 'vial', label: 'Vial' },
                        { value: 'kit', label: 'Kit' },
                        { value: 'bottle', label: 'Bottle' },
                        { value: 'tablets', label: 'Tablets' }
                      ].map((option, optIdx) => (
                        <React.Fragment key={option.value}>
                          {optIdx > 0 && (
                            <div 
                              className="h-px mx-2"
                              style={{ backgroundColor: theme.border }}
                            />
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              updateFormData({ unit: option.value });
                              setIsUnitDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                            style={{
                              color: (form.unit || 'vial') === option.value ? theme.primary : theme.text,
                              backgroundColor: 'transparent',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                              e.currentTarget.style.color = theme.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = (form.unit || 'vial') === option.value ? theme.primary : theme.text;
                            }}
                          >
                            {option.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              <label 
                htmlFor="quantity-input"
                className="absolute pointer-events-none transition-all"
                style={{
                  fontSize: (isQuantityFocused || (form.quantity && form.quantity.trim())) ? '0.75rem' : '0.9375rem',
                  top: (isQuantityFocused || (form.quantity && form.quantity.trim())) ? '-8px' : '14px',
                  left: (isQuantityFocused || (form.quantity && form.quantity.trim())) ? '12px' : '16px',
                  padding: (isQuantityFocused || (form.quantity && form.quantity.trim())) ? '0 4px' : '0',
                  background: (isQuantityFocused || (form.quantity && form.quantity.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                  color: (isQuantityFocused || (form.quantity && form.quantity.trim())) ? theme.primary : (theme.textLight || theme.text),
                  fontWeight: 500
                }}
              >
                Quantity
              </label>
            </div>
            </div>
          </div>
          
          <TextInput label="Crimp / Cap Color" value={form.capColor} onChange={v => updateFormData({ capColor: v })} placeholder="Black Crimp/Black Cap" theme={theme} uppercase={true} outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
          
          <div className="relative">
            <div 
              className="flex items-stretch rounded-lg"
              style={{ 
                border: `1px solid #f0eee7`,
                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
              }}
            >
              <input 
                type="text"
                id="price-input"
                value={form.cost || ''} 
                onChange={e => updateFormData({ cost: e.target.value })} 
                onFocus={() => setIsPriceFocused(true)}
                onBlur={(e) => {
                  setTimeout(() => {
                    const relatedTarget = e.relatedTarget || document.activeElement
                    const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                    if (!isClickingDropdown && !isPriceUnitDropdownOpen) {
                      setIsPriceFocused(false)
                    }
                  }, 150)
                }}
                placeholder=" "
                className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.isDark ? theme.text : '#181A18',
                  border: 'none',
                  paddingLeft: '12px',
                  paddingRight: '8px'
                }}
              />
              <button
                type="button"
                onClick={() => setIsPriceUnitDropdownOpen(prev => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                data-dropdown-container
                style={{ 
                  borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                  backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                  color: theme.isDark ? theme.text : '#181A18',
                  minWidth: '100px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                }}
              >
                <span className="text-sm font-semibold">
                  {(() => {
                    const unit = (form.priceUnit || 'vial').toLowerCase();
                    if (unit === 'vial') return 'Vial';
                    if (unit === 'mg') return 'mg';
                    if (unit === 'g') return 'g';
                    if (unit === 'iu') return 'IU';
                    if (unit === 'tablet') return 'Tablet';
                    return unit.charAt(0).toUpperCase() + unit.slice(1);
                  })()}
                </span>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div 
                className="relative overflow-hidden transition-all duration-300 ease-in-out"
                data-dropdown-container
                style={{
                  maxHeight: isPriceUnitDropdownOpen ? '300px' : '0',
                  opacity: isPriceUnitDropdownOpen ? 1 : 0,
                  transform: isPriceUnitDropdownOpen ? 'translateY(0)' : 'translateY(-10px)',
                  pointerEvents: isPriceUnitDropdownOpen ? 'auto' : 'none'
                }}
              >
                <div 
                  className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                  style={{
                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                    borderColor: theme.border,
                    minWidth: '120px',
                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                    {[
                      { value: 'vial', label: 'Vial' },
                      { value: 'mg', label: 'mg' },
                      { value: 'g', label: 'g' },
                      { value: 'iu', label: 'IU' },
                      { value: 'tablet', label: 'Tablet' }
                    ].map((option, optIdx) => (
                      <React.Fragment key={option.value}>
                        {optIdx > 0 && (
                          <div 
                            className="h-px mx-2"
                            style={{ backgroundColor: theme.border }}
                          />
                        )}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            updateFormData({ priceUnit: option.value });
                            setIsPriceUnitDropdownOpen(false);
                          }}
                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                            style={{
                              color: (form.priceUnit || 'vial') === option.value ? theme.primary : theme.text,
                              backgroundColor: 'transparent',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                            e.currentTarget.style.color = theme.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = (form.priceUnit || 'vial') === option.value ? theme.primary : theme.text;
                          }}
                        >
                          {option.label}
                        </button>
                        </React.Fragment>
                      ))}
                  </div>
                </div>
            <label 
              htmlFor="price-input"
              className="absolute pointer-events-none transition-all"
              style={{
                fontSize: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '0.75rem' : '0.9375rem',
                top: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '-8px' : '14px',
                left: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '12px' : '16px',
                padding: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '0 4px' : '0',
                background: (isPriceFocused || (form.cost && String(form.cost).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                color: (isPriceFocused || (form.cost && String(form.cost).trim())) ? theme.primary : (theme.textLight || theme.text),
                fontWeight: 500
              }}
            >
              Cost per ($)
            </label>
          </div>
          </div>
          
          {/* ORDER DETAILS Section Header */}
          <div className="flex items-center gap-4 mb-3 pt-1">
            <PackageOpen size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Order Details</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Purchase Information
                </span>
              </div>
            </div>
          </div>
          
          <VendorSuggestInput label="Vendor" value={form.vendor} onChange={v => updateFormData({ vendor: v })} placeholder="e.g., Pharm..." theme={theme} />
          
          {/* Purity & Batch Number in two columns */}
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Purity %" value={form.purity} onChange={v => updateFormData({ purity: v })} placeholder="e.g., 98" theme={theme} outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
            <TextInput label="Batch #" value={form.batchNumber} onChange={v => updateFormData({ batchNumber: v })} placeholder="# XXX" theme={theme} uppercase={true} outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
          </div>
          
          {/* Date Acquired */}
          <GlassmorphismDatePicker
            value={form.date}
            onChange={(dateString) => updateFormData({ date: dateString })}
            theme={theme}
            placeholder="Date Acquired"
          />
          
          {/* EXTRA DETAILS Section Header */}
          <div className="flex items-center gap-4 mb-3 pt-1">
            <ImageUp size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Extra Details</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Documentation
                </span>
              </div>
            </div>
          </div>
          
          {/* Documentation Upload */}
          <div className="mt-4">
          <DocumentationUpload
            documentation={form.documentation}
            onChange={(documentation) => updateFormData({ documentation })}
            theme={theme}
            title=""
            description="Upload images or links for received peptide documentation (photos of received vials, condition notes, quality check notes, etc.)"
            placeholder="Add photos, screenshots, or files that correlate with this peptide."
            allowImages={true}
            allowLinks={true}
          />
        </div>
      </div>
      </BottomSheet>

      <BottomSheet 
        open={!!manageName} 
        onClose={() => { 
          setIsTransitioning(false);
          setManageName(null); 
          setManageRows([]); 
          setShowHistory(false); 
          clearManageSavedData(); 
        }} 
        title={`${manageName || 'Manage'}`}
        onBack={() => { 
          // Smooth transition: close manage modal first, then open view modal
          const groupToView = groups.find(g => g.name === manageName);
          setIsTransitioning(true);
          setManageName(null); 
          setManageRows([]); 
          setShowHistory(false); 
          clearManageSavedData();
          // Wait for close animation before opening view modal
          setTimeout(() => {
            if (groupToView) {
              setViewingGroup(groupToView);
            }
            setIsTransitioning(false);
          }, 450);
        }}
        titleExtra={
          <button 
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" 
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', 
              border: `1px solid ${theme.border}`, 
              color: theme.text
            }} 
            onClick={() => setShowHistory(v => !v)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        }
        theme={theme} 
        maxHeight="90vh"
        footer={(
        <div className="w-full flex items-center justify-end px-2">
          <button 
            onClick={() => {
              if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
              }
              saveManage();
            }} 
            className="px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95" 
            style={{ 
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
              color: theme?.textOnPrimary || '#ffffff'
            }}
          >
            Save Changes
          </button>
        </div>
      )}>
        <div className="space-y-4">
          {showHistory && (
            <div className="rounded-xl border p-3 max-h-40 overflow-auto text-xs space-y-2" style={{ 
              borderColor: theme.border,
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
            }}>
              {(getStockHistory() || []).filter(h => (h.name || '') === (manageName || '')).slice(0,50).map(h => (
                <div key={h.id} className="flex items-center justify-between py-1">
                  <span style={{ color: theme.text }}>{h.type} • {h.name} {h.mg}mg {h.vendor ? `• ${h.vendor}` : ''} {h.prevQty!=null ? `(from ${h.prevQty}${h.nextQty!=null?`→${h.nextQty}`:''})` : ''}</span>
                  <span style={{ color: theme.textLight }}>{new Date(h.date).toLocaleDateString()}</span>
                </div>
              ))}
              {(getStockHistory() || []).filter(h => (h.name || '') === (manageName || '')).length === 0 && (
                <div className="text-center py-2" style={{ color: theme.textLight }}>No history yet for this research material.</div>
              )}
            </div>
          )}
          {/* Vials List */}
          <div className="space-y-2">
          {manageRows.map((row, rowIdx) => {
            const isExpanded = expandedManageRows[row.id];
            const vendorName = row.vendorId ? (vendorMap[row.vendorId] || row.vendor || 'Unknown') : (row.vendor || 'Unknown');
            
            return (
            <div
              id={`manage-row-${row.id}`}
              key={row.id}
              className="transition-all"
            >
              {/* Collapsible Header Row */}
              <div 
                className="flex items-center justify-between p-3 cursor-pointer transition-all rounded-lg border-b"
                style={{
                  backgroundColor: isExpanded 
                    ? (theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
                    : 'transparent',
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Immediate state update for instant feedback
                  setExpandedManageRows(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Chevron */}
                  <div className="flex-shrink-0 transition-transform duration-150 ease-out" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', willChange: 'transform' }}>
                    <ChevronDown size={16} style={{ color: theme.primary }} strokeWidth={2.5} />
                  </div>
                  
                  {/* Summary Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                      {vendorName}
                    </div>
                    <div className="text-xs font-semibold opacity-60" style={{ color: theme.text }}>
                      {row.mg || '?'}{row.mgUnit || 'mg'}
                    </div>
                    <div className="text-xs font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10" style={{ color: theme.text }}>
                      {row.quantity || '0'} {row.quantity === '1' ? 'vial' : 'vials'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {(manageName === 'Unknown' || !manageName || manageName.trim() === '') && (
                    <button
                      className="p-1.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        color: theme.primary
                      }}
                      onClick={() => {
                        if (isReadOnly) {
                          setShowUpgradeModal(true);
                          return;
                        }
                        handleMergeIndividualItem(row);
                      }}
                      title="Merge"
                    >
                      <Merge size={16} strokeWidth={2.5} />
                    </button>
                  )}
                  <button
                    className="p-1.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(200, 122, 92, 0.15)' : 'rgba(200, 122, 92, 0.1)',
                      color: '#c87a5c'
                    }}
                    onClick={() => {
                      if (manageName === 'Unknown' || !manageName || manageName.trim() === '') {
                        deleteManageRow(row.id);
                      } else {
                        if (manageRows.length === 1) {
                          window.dispatchEvent(new CustomEvent('tpp:toast', { 
                            detail: { message: 'Cannot remove the last variant. Delete the entire group from the main view instead.', type: 'error' } 
                          }));
                          return;
                        }
                        removeManageRow(row.id);
                      }
                    }}
                    title="Delete"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Expanded Edit Form */}
              <div 
                className="overflow-hidden"
                style={{ 
                  maxHeight: isExpanded ? '2000px' : '0',
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? 'translateY(0)' : 'translateY(-2px)',
                  transition: isExpanded 
                    ? 'max-height 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'max-height 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 120ms cubic-bezier(0.4, 0, 0.2, 1), transform 120ms cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'max-height, opacity, transform',
                }}
              >
                <div className="p-3 space-y-4 border-t" style={{ borderColor: theme.border }}>
                  {/* VIAL DETAILS Section Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <TestTube size={24} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-semibold tracking-wide" style={{ color: theme.text }}>Vial Details</h4>
                      <div className="flex items-center gap-2 ml-1">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                          Research Parameters
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Quantity in two columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Amount with Unit Dropdown */}
                    <div className="relative">
                      <div 
                        className="flex items-stretch rounded-lg"
                        style={{ 
                          border: `1px solid ${(manageRowDropdowns[row.id]?.amountFocused || false) ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                          boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                          backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                        }}
                      >
                        <input 
                          type="text"
                          id={`amount-input-${row.id}`}
                          value={row.mg || ''}
                          onChange={e => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, mg: e.target.value } : r))}
                          onFocus={() => setManageRowDropdowns(prev => ({ ...prev, [row.id]: { ...prev[row.id], amountFocused: true } }))}
                          onBlur={(e) => {
                            setTimeout(() => {
                              const relatedTarget = e.relatedTarget || document.activeElement
                              const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                              if (!isClickingDropdown && !(manageRowDropdowns[row.id]?.amountUnit)) {
                                setManageRowDropdowns(prev => ({ ...prev, [row.id]: { ...prev[row.id], amountFocused: false } }))
                              }
                            }, 150)
                          }}
                          placeholder=" "
                          className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                          style={{
                            backgroundColor: 'transparent',
                            color: theme.isDark ? theme.text : '#181A18',
                            border: 'none',
                            paddingLeft: '12px',
                            paddingRight: '8px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setManageRowDropdowns(prev => ({ ...prev, [row.id]: { ...prev[row.id], amountUnit: !prev[row.id]?.amountUnit } }))}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                          data-dropdown-container
                          style={{ 
                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                            color: theme.isDark ? theme.text : '#181A18',
                            minWidth: '100px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                          }}
                        >
                          <span className="text-sm font-semibold">
                            {(row.mgUnit || 'mg')}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                      {/* Dropdown positioned outside flex container, aligned with button */}
                      {(manageRowDropdowns[row.id]?.amountUnit) && (
                        <div 
                          className="absolute z-[9999] rounded-lg shadow-lg border overflow-hidden"
                          data-dropdown-container
                          style={{
                            top: '100%',
                            right: '0',
                            marginTop: '4px',
                            backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                            borderColor: theme.border,
                            minWidth: '100px',
                            boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          {[
                            { value: 'mg', label: 'mg' },
                            { value: 'mL', label: 'mL' },
                            { value: 'g', label: 'g' },
                            { value: 'IU', label: 'IU' }
                          ].map((option, optIdx) => (
                            <React.Fragment key={option.value}>
                              {optIdx > 0 && (
                                <div 
                                  className="h-px mx-2"
                                  style={{ backgroundColor: theme.border }}
                                />
                              )}
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, mgUnit: option.value } : r))
                                  setManageRowDropdowns(prev => ({ ...prev, [row.id]: { ...prev[row.id], amountUnit: false } }))
                                }}
                                className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                style={{
                                  color: (row.mgUnit || 'mg') === option.value ? theme.primary : theme.text,
                                  backgroundColor: 'transparent',
                                  WebkitTapHighlightColor: 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                  e.currentTarget.style.color = theme.primary;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = (row.mgUnit || 'mg') === option.value ? theme.primary : theme.text;
                                }}
                              >
                                {option.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      <label 
                        htmlFor={`amount-input-${row.id}`}
                        className="absolute pointer-events-none transition-all"
                        style={{
                          fontSize: ((manageRowDropdowns[row.id]?.amountFocused) || (row.mg && row.mg.trim())) ? '0.75rem' : '0.9375rem',
                          top: ((manageRowDropdowns[row.id]?.amountFocused) || (row.mg && row.mg.trim())) ? '-8px' : '14px',
                          left: ((manageRowDropdowns[row.id]?.amountFocused) || (row.mg && row.mg.trim())) ? '12px' : '16px',
                          padding: ((manageRowDropdowns[row.id]?.amountFocused) || (row.mg && row.mg.trim())) ? '0 4px' : '0',
                          background: ((manageRowDropdowns[row.id]?.amountFocused) || (row.mg && row.mg.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                          color: ((manageRowDropdowns[row.id]?.amountFocused) || (row.mg && row.mg.trim())) ? theme.primary : (theme.textLight || theme.text),
                          fontWeight: 500
                        }}
                      >
                        Amount
                      </label>
                    </div>
                    <TextInput
                      label="Quantity"
                      value={row.quantity || ''}
                      onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: v } : r))}
                      placeholder="2"
                      theme={theme}
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                  </div>

                  <TextInput 
                    label="Crimp / Cap Color" 
                    value={row.capColor || ''} 
                    onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, capColor: v } : r))} 
                    placeholder="Black Crimp/Black Cap" 
                    theme={theme} 
                    uppercase={true} 
                    outlined={true} 
                    customTextColor={theme.isDark ? null : "#181A18"} 
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} 
                  />

                  {/* ORDER DETAILS Section Header */}
                  <div className="flex items-center gap-3 mb-2 pt-1">
                    <PackageOpen size={24} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-semibold tracking-wide" style={{ color: theme.text }}>Order Details</h4>
                      <div className="flex items-center gap-2 ml-1">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                          Purchase Information
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Vendor */}
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
                    placeholder="e.g., Pharm..."
                    theme={theme}
                  />

                  {/* Purity & Batch Number in two columns */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <TextInput
                      label="Purity %"
                      value={row.purity || ''}
                      onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, purity: v } : r))}
                      placeholder="e.g., 98"
                      theme={theme}
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                    <TextInput
                      label="Batch #"
                      value={row.batchNumber || ''}
                      onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, batchNumber: v } : r))}
                      placeholder="# XXX"
                      theme={theme}
                      uppercase={true}
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                  </div>

                  {/* Date Acquired */}
                  <GlassmorphismDatePicker
                    value={row.date || ''}
                    onChange={(dateString) => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, date: dateString } : r))}
                    theme={theme}
                    placeholder="Date Acquired"
                  />

                  {/* EXTRA DETAILS Section Header */}
                  <div className="flex items-center gap-3 mb-2 pt-1">
                    <ImageUp size={24} style={{ color: theme.primary }} />
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-semibold tracking-wide" style={{ color: theme.text }}>Extra Details</h4>
                      <div className="flex items-center gap-2 ml-1">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                          Documentation
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documentation */}
                  <DocumentationUpload
                    documentation={row.documentation || []}
                    onChange={(documentation) => 
                      setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, documentation } : r))
                    }
                    theme={theme}
                    title=""
                    description="Upload images or links for received peptide documentation (photos of received vials, condition notes, quality check notes, etc.)"
                    placeholder="Add photos, screenshots, or files that correlate with this peptide."
                    allowImages={true}
                    allowLinks={true}
                  />
                </div>
              </div>
            </div>
            );
          })}
          </div>

          {/* Add Vial Button */}
          <button 
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border" 
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: theme.border,
              color: theme.primary
            }} 
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.borderColor = theme.primary + '40';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = theme.border;
            }}
            onClick={() => {
              if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
              }
              addManageRow();
            }}
          >
            <PlusCircle size={18} strokeWidth={2.5} />
            Add to Stock
          </button>
        </div>
      </BottomSheet>
      
      {/* Merge Selection Modal */}
      <MergeSelectionModal
        open={showMergeSelectionModal}
        onClose={() => {
          setShowMergeSelectionModal(false)
          setMergeSourceGroup(null)
          setMergeSourceItem(null)
        }}
        sourceGroup={mergeSourceGroup || (mergeSourceItem ? {
          name: mergeSourceItem.name || 'Unknown',
          groupKey: `temp-${mergeSourceItem.id}`,
          totalVials: Number(mergeSourceItem.quantity) || 0,
          totalMg: (Number(mergeSourceItem.quantity) || 0) * (Number(mergeSourceItem.mg) || 0),
          unit: mergeSourceItem.mgUnit || 'mg'
        } : null)}
        availableGroups={groups.filter(g => {
          // When merging from Unknown (group or item), only show named groups (exclude other Unknown groups)
          const isSourceUnknown = (mergeSourceGroup && (mergeSourceGroup.name === 'Unknown' || !mergeSourceGroup.name || mergeSourceGroup.name.trim() === '')) ||
                                  (mergeSourceItem && (!mergeSourceItem.name || mergeSourceItem.name.trim() === ''));
          const isTargetUnknown = g.name === 'Unknown' || !g.name || g.name.trim() === '';
          
          const sourceKey = mergeSourceGroup?.groupKey || (mergeSourceItem ? `temp-${mergeSourceItem.id}` : null);
          
          return g.groupKey !== sourceKey && 
                 g.totalVials > 0 && 
                 (!isSourceUnknown || !isTargetUnknown); // If source is Unknown, exclude Unknown targets
        })}
        onSelectGroup={mergeSourceItem ? handleSelectGroupForItem : handleSelectMergeGroup}
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
      <BottomSheet
        open={!!outOfStockModalName}
        onClose={() => setOutOfStockModalName(null)}
        title={`${outOfStockModalName || ''} - Out of Stock!`}
        theme={theme}
        maxHeight="90vh"
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
                // Smooth transition: close out of stock modal first, then open manage modal
                setIsTransitioning(true);
                setOutOfStockModalName(null);
                setTimeout(() => {
                  openManage(outOfStockModalName);
                  setIsTransitioning(false);
                }, 450);
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
                // Smooth transition: close out of stock modal first, then open manage modal
                setIsTransitioning(true);
                setOutOfStockModalName(null);
                setTimeout(() => {
                  openManage(outOfStockModalName);
                  setShowHistory(true);
                  setIsTransitioning(false);
                }, 450);
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
      </BottomSheet>

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        actionAttempted="manage stockpile"
        theme={theme}
      />

      {/* View Group Modal - Read-only overview */}
      {viewingGroup && (
        <BottomSheet
          open={!!viewingGroup}
          onClose={() => setViewingGroup(null)}
          onBack={() => setViewingGroup(null)}
          title={viewingGroup.name}
          titleExtra={(
            <div className="flex flex-col items-end leading-none">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>
                  {viewingGroup.totalMg > 0 ? viewingGroup.totalMg : viewingGroup.totalVials}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70" style={{ color: theme.text }}>
                  {viewingGroup.totalMg > 0 ? (viewingGroup.unit || 'mg') : (viewingGroup.totalVials === 1 ? 'vial' : 'vials')}
                </span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 -mt-0.5" style={{ color: theme.text }}>
                Total Stock
              </div>
            </div>
          )}
          theme={theme}
          maxHeight="90vh"
          footer={(
            <div className="w-full flex items-center justify-end px-2">
              <button
                onClick={() => {
                  if (isReadOnly) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  // Smooth transition: close view modal first, then open manage modal
                  setIsTransitioning(true);
                  setViewingGroup(null);
                  // Wait for close animation (400ms) before opening manage modal
                  setTimeout(() => {
                    openManage(viewingGroup.name);
                    setIsTransitioning(false);
                  }, 450); // Slightly longer than animation duration for smooth transition
                }}
                className="px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
                  color: theme?.textOnPrimary || '#ffffff'
                }}
              >
                Edit Stockpile
              </button>
            </div>
          )}
        >
          <div className="space-y-6">
            {/* Detailed Inventory List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Beaker size={16} style={{ color: '#8ca68c' }} />
                <h4 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.text }}>Research Vials</h4>
              </div>
              
              {Object.values(viewingGroup.variants)
                .sort((a, b) => String(a.mg).localeCompare(String(b.mg)))
                .map(variant => (
                  <div
                    key={variant.mg}
                    className="relative pl-4"
                  >
                    {/* Vertical indicator line */}
                    <div 
                      className="absolute left-0 top-1 bottom-1 w-1 rounded-full"
                      style={{ backgroundColor: '#8ca68c', opacity: 0.3 }}
                    />

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: theme.text }}>
                        <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 font-semibold">
                          {variant.mg} {variant.unit || 'mg'}
                        </span>
                        <span className="opacity-30">•</span>
                        <span className="opacity-50 font-medium">{variant.totalVials} {variant.totalVials === 1 ? 'Vial' : 'Vials'}</span>
                      </div>
                      <div className="h-px flex-1 ml-4 opacity-10" style={{ backgroundColor: theme.text }} />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {variant.items.map(item => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                          style={{ 
                            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/10">
                                <Package size={16} style={{ color: theme.primary }} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold" style={{ color: theme.text }}>
                                  {item.vendorId ? vendorMap[item.vendorId] : item.vendor || 'Unknown Vendor'}
                                </div>
                                {item.date && (
                                  <div className="text-[10px] font-normal opacity-40 uppercase tracking-tight" style={{ color: theme.text }}>
                                    Acquired {new Date(item.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {item.useByDate && (() => {
                              const useByStatus = getUseByStatus(item.useByDate);
                              return (
                                <div 
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide shadow-sm"
                                  style={{
                                    backgroundColor: useByStatus?.status === 'expired' 
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : useByStatus?.status === 'expiring'
                                      ? 'rgba(251, 191, 36, 0.15)'
                                      : 'rgba(16, 185, 129, 0.12)',
                                    color: useByStatus?.status === 'expired'
                                      ? '#ef4444'
                                      : useByStatus?.status === 'expiring'
                                      ? '#f59e0b'
                                      : '#10b981'
                                  }}
                                >
                                  {useByStatus?.status === 'expired' ? 'Expired' : useByStatus?.status === 'expiring' ? 'Expiring' : 'Stable'}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-black/5 dark:border-white/5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-medium uppercase tracking-wide opacity-40" style={{ color: theme.text }}>Purity</span>
                              <span className="text-sm font-semibold" style={{ color: theme.text }}>{item.purity ? `${item.purity}%` : 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-medium uppercase tracking-wide opacity-40" style={{ color: theme.text }}>Batch #</span>
                              <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.batchNumber || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-medium uppercase tracking-wide opacity-40" style={{ color: theme.text }}>Cap Color</span>
                              <span className="text-sm font-semibold" style={{ color: theme.text }}>{item.capColor || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-medium uppercase tracking-wide opacity-40" style={{ color: theme.text }}>Exp. Date</span>
                              <span className="text-sm font-semibold" style={{ color: theme.text }}>{item.useByDate ? new Date(item.useByDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>

                          {item.notes && (
                            <div className="mt-3 p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                              <div className="flex items-start gap-2">
                                <Info size={12} className="mt-0.5 opacity-30" style={{ color: theme.text }} />
                                <p className="text-xs leading-relaxed italic opacity-60 font-normal" style={{ color: theme.text }}>{item.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Image Preview Modal */}
      <ImagePreviewModal
        image={previewImage}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        theme={theme}
        readonly={true}
      />

      {/* Close Confirmation Modal */}
      <ConfirmationModal
        open={showCloseConfirmation}
        onClose={() => setShowCloseConfirmation(false)}
        onConfirm={handleConfirmClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Close Without Saving"
        cancelText="Cancel"
        type="warning"
        theme={theme}
      />

      {/* Delete Out of Stock Confirmation Modal */}
      <ConfirmationModal
        open={!!deleteOutOfStockGroup}
        onClose={() => setDeleteOutOfStockGroup(null)}
        onConfirm={async () => {
          if (!deleteOutOfStockGroup) return;

          const g = deleteOutOfStockGroup;
          const groupItems = Object.values(g.variants).flatMap(v => v.items);
          const itemCount = groupItems.length;

          try {
            // Record deletions for all items in the group
            groupItems.forEach(item => {
              recordDeletion('stockpile', item.id, item);
            });

            // Delete all items in this group
            const updatedItems = items.filter(i => {
              // Check if this item belongs to the group
              const itemName = i.name || '';
              const itemMgUnit = i.mgUnit || 'mg';
              const groupKey = `${g.name}__${g.unit}`;
              const itemKey = `${itemName}__${itemMgUnit}`;
              return itemKey !== groupKey;
            });

            setItems(updatedItems);

            // Sync to cloud
            if (firebaseUser) {
              try {
                const userId = firebaseUser.uid;
                const appData = {
                  protocols: protocols || [],
                  reconItems: reconItems || [],
                  reconHistory: reconHistory || [],
                  supplements: supplements || [],
                  orders: orders || [],
                  metrics: metrics || [],
                  vendors: vendors || [],
                  calendarNotes: calendarNotes || {},
                  stockpile: updatedItems,
                  scheduledBuys: scheduledBuys || []
                };
                await saveAppData(userId, appData, { skipMerge: true });
              } catch (e) {
                console.error('Failed to sync deleted items to cloud:', e);
                window.dispatchEvent(new CustomEvent('tpp:toast', { 
                  detail: { 
                    message: 'Items deleted locally but failed to sync to cloud', 
                    type: 'warning' 
                  } 
                }));
                setDeleteOutOfStockGroup(null);
                return;
              }
            }

            window.dispatchEvent(new CustomEvent('tpp:toast', { 
              detail: { 
                message: itemCount === 1 
                  ? 'Item deleted successfully' 
                  : `${itemCount} items deleted successfully`, 
                type: 'success' 
              } 
            }));
            setDeleteOutOfStockGroup(null);
          } catch (error) {
            console.error('Error deleting out of stock items:', error);
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
              detail: { 
                message: 'Failed to delete items. Please try again.', 
                type: 'error' 
              } 
            }));
            setDeleteOutOfStockGroup(null);
          }
        }}
        title="Delete Out of Stock Item"
        message={deleteOutOfStockGroup ? (
          (() => {
            const itemCount = Object.values(deleteOutOfStockGroup.variants).flatMap(v => v.items).length;
            return itemCount === 1
              ? `Are you sure you want to delete this out of stock item?\n\n${deleteOutOfStockGroup.name}`
              : `Are you sure you want to delete all ${itemCount} out of stock items for ${deleteOutOfStockGroup.name}?`;
          })()
        ) : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
      />

      {/* Order Details Modal for Incoming Orders */}
      <OrderDetailsModal
        open={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setEditingOrder(null);
        }}
        theme={theme}
        order={editingOrder}
        vendors={vendors}
        activeTab={editingOrder?.category || editingOrder?.type || 'domestic'}
        onSave={(data) => {
          const vendorId = vendors.find(v => v.name === data.vendor)?.id || null;
          if (editingOrder) {
            const now = new Date().toISOString();
            const updatedOrder = {
              ...editingOrder,
              ...data,
              vendorId,
              updatedAt: now
            };
            handleStockpileUpdate(editingOrder, updatedOrder);
            setOrders(prev => {
              const normalizedPrev = ensurePublicOrderNumbers(prev);
              return normalizedPrev.map(o => o.id === editingOrder.id ? updatedOrder : o);
            });
          } else {
            const category = data.category || 'domestic';
            const nextPublicNumber = getNextPublicOrderNumber(orders);
            const now = new Date().toISOString();
            const newOrder = {
              id: generateId(),
              publicOrderNumber: nextPublicNumber,
              ...data,
              vendorId,
              category,
              type: category,
              createdAt: now,
              updatedAt: now
            };
            handleStockpileUpdate(null, newOrder);
            setOrders(prev => {
              const normalizedPrev = ensurePublicOrderNumbers(prev);
              return [newOrder, ...normalizedPrev];
            });
          }
          setShowOrderModal(false);
          setEditingOrder(null);
        }}
        onDelete={async (id) => {
          const orderToDelete = orders.find(o => o.id === id);
          if (orderToDelete) {
            // Remove from stockpile if delivered
            const status = (orderToDelete.status || '').toLowerCase();
            if (status.includes('delivered')) {
              const orderIdPrefix = `orderitem-${id}-`;
              setItems(prev => prev.filter(stockItem => {
                const itemId = stockItem?.id;
                if (!itemId || typeof itemId !== 'string') return true;
                return !itemId.startsWith(orderIdPrefix);
              }));
            }
            setOrders(prev => prev.filter(o => o.id !== id));
          }
          setShowOrderModal(false);
          setEditingOrder(null);
        }}
        isReadOnly={isReadOnly}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
    </section>
  )
}
