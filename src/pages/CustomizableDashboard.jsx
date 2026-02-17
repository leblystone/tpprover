import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Settings, Edit, FlaskConical } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useBadgeStats } from '../utils/badges';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import ViewContainer from '../components/ui/ViewContainer';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import WidgetFactory from '../components/dashboard/WidgetFactory';
// Toast notifications now handled globally in App.jsx
import useLocalStorage from '../utils/hooks';
import { 
  loadDashboardLayout, 
  saveDashboardLayout, 
  validateWidgetPosition,
  findEmptyPosition,
  resetDashboardLayout,
  getSizeConfig,
  WIDGET_TYPES,
  compactGrid
} from '../utils/dashboardCustomization';
import { fixDataInconsistencies, diagnoseDashboardData } from '../utils/dataCleanup';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCalendarDone } from '../utils/taskCompletion';
import { toKey } from '../components/calendar/MonthGrid';
import { calculateScheduledTasksForDate } from '../utils/calendarTasks';
import { areAnalyticsEnabled, areGroupBuysEnabled } from '../utils/featureSettings';
import { isInjectionSiteTrackingEnabled } from '../utils/injectionSiteSettings';

// Import modals that might be needed
import ReconCalculatorModal from '../components/recon/ReconCalculatorModal';
import OCRImportModal from '../components/import/OCRImportModal';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal';
import QuickStartProtocolModal from '../components/protocols/QuickStartProtocolModal';
import { saveProtocolHistoryEntry } from '../utils/protocolHistory';
import VendorDetailsModal from '../components/vendors/VendorDetailsModal';
import GoalModal from '../components/research/GoalModal';
import BodyMetricsModal from '../components/research/BodyMetricsModal';
import SupplementEditorModal from '../components/dashboard/SupplementEditorModal';
import BadgesModal from '../components/badges/BadgesModal';
import AddScheduledBuyModal from '../components/orders/AddScheduledBuyModal';
import AddWishlistItemModal from '../components/dashboard/AddWishlistItemModal';
import AddToStockpileBottomSheet from '../components/stockpile/AddToStockpileBottomSheet';
import ConversionWidget from '../components/dashboard/ConversionWidget';
import UpgradeModal from '../components/common/UpgradeModal';
import DashboardTipsBanner from '../components/dashboard/DashboardTipsBanner';
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers';
import { saveAppData } from '../services/cloudStorage';
import { useFirebase } from '../context/FirebaseContext';
import { recordDeletion } from '../utils/deletionTracking';
import { generateId } from '../utils/string';
import { prepareItemForSave } from '../utils/userDataSave';

export default function CustomizableDashboard() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const { isReadOnly } = useSubscriptionAccess();
  const { firebaseUser } = useFirebase();
  const { 
    scheduledBuys,
    setScheduledBuys, 
    orders, 
    setOrders, 
    vendors, 
    setVendors,
    addVendor,
    protocols,
    setProtocols,
    addProtocol, 
    supplements, 
    addSupplement, 
    updateSupplement, 
    deleteSupplement,
    subscription,
    reconItems,
    reconHistory,
    calendarNotes,
    stockpile,
    setStockpile,
    metrics,
    setMetrics
  } = useAppContext();

  // Dashboard customization state
  const [widgets, setWidgets] = useState(() => {
    // Load saved dashboard layout or use defaults
    return loadDashboardLayout();
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [groupBuysEnabled, setGroupBuysEnabled] = useState(true);
  const [injectionSiteTrackingEnabled, setInjectionSiteTrackingEnabled] = useState(true);

  // Dashboard data state
  const [todaysTasks, setTodaysTasks] = useState([]);
  // Toast notifications now handled globally
  const [goals, setGoals] = useLocalStorage('tpprover_goals', []);
  // metrics and setMetrics are now from useAppContext() above
  const [calendarBump, setCalendarBump] = useState(0);

  // Modal states
  const [showRecon, setShowRecon] = useState(false);
  const [reconPrefill, setReconPrefill] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [showQuickStartProtocol, setShowQuickStartProtocol] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [showBackButton, setShowBackButton] = useState(false);
  const [onBackToAllEntries, setOnBackToAllEntries] = useState(null);
  const [showAddSupplement, setShowAddSupplement] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [showBadges, setShowBadges] = useState(false);
  const [showAddBuyModal, setShowAddBuyModal] = useState(false);
  const [editingScheduledBuy, setEditingScheduledBuy] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showStockpileAdd, setShowStockpileAdd] = useState(false);
  const [showAddWishlistModal, setShowAddWishlistModal] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tpprover_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  const [vendorNames] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('tpprover_vendors') || '[]');
    } catch { 
      return []; 
    }
  });

  // Check analytics, group buys, and injection site tracking settings on mount and when they change
  useEffect(() => {
    const checkSettings = () => {
      setAnalyticsEnabled(areAnalyticsEnabled());
      setGroupBuysEnabled(areGroupBuysEnabled());
      setInjectionSiteTrackingEnabled(isInjectionSiteTrackingEnabled());
    };
    
    // Check on mount
    checkSettings();
    
    // Listen for settings changes (cross-tab)
    const handleStorageChange = (e) => {
      if (e.key === 'tpprover_settings' || !e.key) {
        checkSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case settings changed in same window
    // Reduced frequency to every 2 seconds for better performance
    const interval = setInterval(checkSettings, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Compute dashboard data
  const incomingOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    
    const activeOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return !status.includes('delivered');
    });
    
    if (activeOrders.length === 0) return null;
    
    activeOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = activeOrders[0];
    
    return {
      ...latest,
      peptide: latest.items?.[0]?.name || 'Unknown Item',
      mg: latest.items?.[0]?.mg || 'N/A',
      vendor: latest.vendorName || latest.vendor || 'Unknown Vendor',
      status: latest.status || 'Order Placed',
      date: latest.date,
      shipDate: latest.shipDate || latest.date,
      deliveryDate: latest.deliveryDate,
      tracking: latest.tracking
    };
  }, [orders]);

  const pendingVendors = useMemo(() => {
    return vendors.filter(vendor => vendor.isStub === true);
  }, [vendors]);

  // Load upcoming buys - use AppContext's scheduledBuys which already has filtering applied
  // But also listen for data clearing events to ensure UI updates
  useEffect(() => {
    const loadAndFilterBuys = () => {
      try {
        const raw = localStorage.getItem('tpprover_scheduled_buys');
        if (raw) {
          const buys = JSON.parse(raw);
          // Filter out mock scheduled buys if sample data was cleared
          const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
          const filteredBuys = sampleDataCleared 
            ? buys.filter(b => {
                // Filter by isMock flag
                if (b.isMock) return false;
                // Also filter by known mock vendors
                const mockVendors = ['BioTech Solutions', 'Peptide Research Co', 'Research Labs Pro'];
                if (mockVendors.includes(b.vendor)) return false;
                // Filter by known mock IDs
                if (b.id === 201 || b.id === 202 || b.id === 203) return false;
                // Filter by known mock item names
                const mockItems = ['Tirzepatide Bulk Order', 'BPC-157 Research Batch', 'Epithalon + Thymalin Stack'];
                if (mockItems.includes(b.item)) return false;
                return true;
              })
            : buys;
          setScheduledBuys(filteredBuys.map(b => ({
            id: b.id,
            item: b.item,
            name: b.name || b.item,
            peptideName: b.peptideName || b.item,
            date: b.openDate || b.date,
            openDate: b.openDate,
            closeDate: b.closeDate,
            vendor: b.vendor,
            location: b.location,
            participants: b.participants,
            price: b.price,
            notes: b.notes,
            description: b.description,
            isMock: b.isMock,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt
          })));
        } else {
          // If no data in localStorage, clear the state
          setScheduledBuys([]);
        }
      } catch (error) {
        console.error('Error loading upcoming buys:', error);
      }
    };

    // Load on mount
    loadAndFilterBuys();

    // Listen for sample data cleared event
    const handleSampleDataCleared = () => {
      loadAndFilterBuys();
    };

    // Listen for group buy deleted event
    const handleGroupBuyDeletedInMainEffect = () => {
      loadAndFilterBuys();
    };

    window.addEventListener('sample-data-cleared', handleSampleDataCleared);
    window.addEventListener('tpp:group-buy-deleted', handleGroupBuyDeletedInMainEffect);
    window.addEventListener('tpp:scheduled-buys-updated', loadAndFilterBuys);

    // Also listen for localStorage changes (cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'tpprover_scheduled_buys' || e.key === 'tpprover_sample_data_cleared') {
        loadAndFilterBuys();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('sample-data-cleared', handleSampleDataCleared);
      window.removeEventListener('tpp:group-buy-deleted', handleGroupBuyDeletedInMainEffect);
      window.removeEventListener('tpp:scheduled-buys-updated', loadAndFilterBuys);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setScheduledBuys]);

  // Load and sync wishlist data
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const raw = localStorage.getItem('tpprover_wishlist');
        if (raw) {
          const items = JSON.parse(raw);
          setWishlist(items);
        } else {
          setWishlist([]);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
        setWishlist([]);
      }
    };

    loadWishlist();

    // Listen for wishlist update events
    const handleWishlistUpdated = (e) => {
      if (e.detail?.wishlist) {
        setWishlist(e.detail.wishlist);
      } else {
        loadWishlist();
      }
    };

    window.addEventListener('tpp:wishlist-updated', handleWishlistUpdated);

    // Also listen for localStorage changes (cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'tpprover_wishlist') {
        loadWishlist();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('tpp:wishlist-updated', handleWishlistUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for protocol history updates to refresh active protocols notes
  useEffect(() => {
    const handleProtocolHistoryUpdate = () => {
      // Force re-render of widgets that depend on protocol history
      // The widget will automatically refresh when protocols prop updates
    };

    window.addEventListener('tpp:protocol-history-updated', handleProtocolHistoryUpdate);
    return () => {
      window.removeEventListener('tpp:protocol-history-updated', handleProtocolHistoryUpdate);
    };
  }, []);

  // Quick Actions event listeners
  useEffect(() => {
    const handleOpenRecon = () => setShowRecon(true);
    const handleOpenOrder = () => {
      setShowNewOrder(true);
    };
    const handleOpenVendor = () => {
      setEditingVendor(null);
      setShowNewVendor(true);
    };
    const handleOpenProtocol = () => {
      setShowNewProtocol(true);
    };
    const handleDashboardCustomize = () => {
      setIsCustomizing(!isCustomizing);
    };
    const handleDashboardSettings = () => {
      setShowCustomizer(true);
    };
    const handleGroupBuyDeletedInQuickActions = () => {
      // Refresh the scheduled buys data from localStorage
      // Use the same filtering logic as the main useEffect
      try {
        const raw = localStorage.getItem('tpprover_scheduled_buys');
        if (raw) {
          const buys = JSON.parse(raw);
          const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
          const filteredBuys = sampleDataCleared 
            ? buys.filter(b => !b.isMock)
            : buys;
          setScheduledBuys(filteredBuys.map(b => ({
            id: b.id,
            item: b.item,
            name: b.name || b.item,
            peptideName: b.peptideName || b.item,
            date: b.openDate || b.date,
            openDate: b.openDate,
            closeDate: b.closeDate,
            vendor: b.vendor,
            location: b.location,
            participants: b.participants,
            price: b.price,
            notes: b.notes,
            description: b.description,
            isMock: b.isMock,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt
          })));
        } else {
          setScheduledBuys([]);
        }
      } catch (error) {
        console.error('Error refreshing scheduled buys:', error);
      }
    };

    window.addEventListener('tpp:openRecon', handleOpenRecon);
    window.addEventListener('tpp:openOrder', handleOpenOrder);
    window.addEventListener('tpp:openVendor', handleOpenVendor);
    window.addEventListener('tpp:openProtocol', handleOpenProtocol);
    window.addEventListener('tpp:dashboard-customize', handleDashboardCustomize);
    window.addEventListener('tpp:dashboard-settings', handleDashboardSettings);
    window.addEventListener('tpp:group-buy-deleted', handleGroupBuyDeletedInQuickActions);

    return () => {
      window.removeEventListener('tpp:openRecon', handleOpenRecon);
      window.removeEventListener('tpp:openOrder', handleOpenOrder);
      window.removeEventListener('tpp:openVendor', handleOpenVendor);
      window.removeEventListener('tpp:openProtocol', handleOpenProtocol);
      window.removeEventListener('tpp:dashboard-customize', handleDashboardCustomize);
      window.removeEventListener('tpp:dashboard-settings', handleDashboardSettings);
      window.removeEventListener('tpp:group-buy-deleted', handleGroupBuyDeletedInQuickActions);
    };
  }, [isCustomizing]);

  // Listen for autosave changes to protocols
  useEffect(() => {
    const handleAutosaveChange = () => {

      // Force task regeneration by updating calendarBump
      setCalendarBump(Date.now());
    };

    // Listen for autosave events
    window.addEventListener('tpp:protocol-autosaved', handleAutosaveChange);
    
    return () => {
      window.removeEventListener('tpp:protocol-autosaved', handleAutosaveChange);
    };
  }, []);

  // Generate today's tasks from supplements and protocols
  // CRITICAL: Use Calendar's shared logic to ensure perfect sync
  useEffect(() => {
    // CRITICAL: Use Calendar's EXACT date calculation method to ensure perfect sync
    // Calendar uses: toKey(new Date()) which extracts year/month/day from current date
    const calendarRawDate = new Date();
    const finalToday = new Date(calendarRawDate.getFullYear(), calendarRawDate.getMonth(), calendarRawDate.getDate());
    finalToday.setHours(0, 0, 0, 0);
    
    try {
      // Get today's scheduled tasks using the same logic as Calendar
      const scheduledData = calculateScheduledTasksForDate(finalToday, protocols, supplements, reconItems);
      
      // Get the date key for today to check completion status
      const todayKey = toKey(finalToday);
      
      const tasks = [];
      
      // Convert Calendar's scheduled data format to Dashboard task format
      // Process peptides and supplements from all time slots
      Object.keys(scheduledData.bySlot || {}).forEach(timeSlot => {
        const slot = scheduledData.bySlot[timeSlot];
        
        // Process peptides
        if (slot.peptides && Array.isArray(slot.peptides)) {
          slot.peptides.forEach(pep => {
            // CRITICAL: Preserve ALL fields exactly as Calendar provides them
            // Do NOT use fallbacks that might override Calendar's data
            const task = {
              id: `${pep.protocolId || 'protocol'}-${pep.name || 'Peptide'}-${timeSlot}`,
              type: 'peptide',
              name: pep.name || 'Peptide',
              dose: pep.dose || '',
              unit: pep.unit || '',
              time: timeSlot,
              protocolId: pep.protocolId,
              peptideId: pep.peptideId,
              completed: false,
              // CRITICAL: Use EXACTLY what Calendar provides - no fallbacks that might override
              deliveryMethod: pep.deliveryMethod || pep.delivery || 'injection',
              delivery: pep.delivery || pep.deliveryMethod || 'injection',
              // CRITICAL: Preserve pen color and type - use undefined if not set (not null)
              penColor: pep.penColor,
              penType: pep.penType,
              protocolName: pep.name, // For blended protocols, name is the protocol name
              administrationRoute: pep.administrationRoute
            };
            
            // Generate stable task ID and check completion status for today's date
            const taskId = generateTaskId(task);
            const wasCompleted = isTaskCompleted(taskId, todayKey, timeSlot);
            task.completed = wasCompleted;
            task.stableTaskId = taskId;
            tasks.push(task);
          });
        }
        
        // Process supplements
        if (slot.supplements && Array.isArray(slot.supplements)) {
          slot.supplements.forEach(supp => {
            const task = {
              id: `${supp.id || 'supplement'}-${timeSlot}`,
              type: 'supplement',
              name: supp.name || 'Supplement',
              dose: supp.dose || '',
              unit: supp.unit || '',
              delivery: supp.delivery || supp.deliveryMethod || 'oral',
              time: timeSlot,
              completed: false,
            };
            
            // Generate stable task ID and check completion status for today's date
            const taskId = generateTaskId(task);
            const wasCompleted = isTaskCompleted(taskId, todayKey, timeSlot);
            task.completed = wasCompleted;
            task.stableTaskId = taskId;
            tasks.push(task);
          });
        }
      });

      // Sort tasks: unchecked first, then checked, then by type, then by name
      tasks.sort((a, b) => {
        // First, sort by completion status (unchecked first, then checked)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Then by type (peptides first)
        if (a.type === 'peptide' && b.type !== 'peptide') return -1
        if (a.type !== 'peptide' && b.type === 'peptide') return 1
        // Finally by name
        return a.name.localeCompare(b.name)
      });
      
      setTodaysTasks(tasks);
    } catch (error) {
      console.error('❌ CustomizableDashboard: Error generating tasks', error);
      console.error('Error stack:', error.stack);
      setTodaysTasks([]);
    }
  }, [supplements, protocols, reconItems, calendarBump]);

  // Save layout when widgets change
  useEffect(() => {
    saveDashboardLayout(widgets);
  }, [widgets]);

  // Toast utility - now uses global toast system
  const addToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message, type } 
    }));
  };

  // Widget management functions
  const handleUpdateWidgets = (newWidgets) => {
    setWidgets(newWidgets);
  };

  // Notify topbar of customizing state changes
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:dashboard-customizing-changed', {
      detail: { isCustomizing }
    }));
  }, [isCustomizing]);

  const handleToggleWidgetVisibility = (widgetId) => {
    setWidgets(prev => {
      const newWidgets = prev.map(w => {
        if (w.id === widgetId) {
          return { ...w, enabled: !w.enabled };
        }
        return w;
      });
      // Compact the grid to rearrange enabled widgets and remove empty spaces
      const compactedWidgets = compactGrid(newWidgets);
      // Save layout after toggling visibility
      saveDashboardLayout(compactedWidgets);
      return compactedWidgets;
    });
  };

  const handleMoveWidget = (draggedWidgetId, targetWidgetId) => {

    // If it's the old position-based system, handle it differently
    if (typeof targetWidgetId === 'object') {

      const newPosition = targetWidgetId;
      setWidgets(prev => prev.map(w => {
        if (w.id === draggedWidgetId) {
          const updatedWidget = { ...w, position: newPosition };
          if (validateWidgetPosition(updatedWidget, prev, draggedWidgetId)) {
            return updatedWidget;
          }
        }
        return w;
      }));
      return;
    }
    
    // Handle widget reordering for drag and drop

    setWidgets(prev => {
      console.log('📦 Current widgets before move:', prev.map(w => ({ id: w.id, type: w.type })));
      
      const draggedIndex = prev.findIndex(w => w.id === draggedWidgetId);
      const targetIndex = prev.findIndex(w => w.id === targetWidgetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return prev;
      }
      
      // Create a new array and move the dragged widget to the target position
      const newWidgets = [...prev];
      const [draggedWidget] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedWidget);

      // Save the new layout
      saveDashboardLayout(newWidgets);
      
      return newWidgets;
    });
  };

  const handleResizeWidget = (widgetId, newSize) => {
    setWidgets(prev => prev.map(w => {
      if (w.id === widgetId) {
        const updatedWidget = { ...w, size: newSize };
        if (!validateWidgetPosition(updatedWidget, prev, widgetId)) {
          // Find a new valid position
          updatedWidget.position = findEmptyPosition(prev.filter(widget => widget.id !== widgetId), newSize);
        }
        return updatedWidget;
      }
      return w;
    }));
  };

  const handleWidgetSettings = (widgetId) => {
    setShowCustomizer(true);
    // Focus on the specific widget in the customizer
  };

  // Task management - using unified completion system

  const handleTaskToggle = (taskOrId, date = new Date()) => {
    // Handle both task object and task ID
    let task;
    if (typeof taskOrId === 'string' || typeof taskOrId === 'number') {
      // If ID was passed, find the task
      task = todaysTasks.find(t => t.id === taskOrId || t.stableTaskId === taskOrId);
      if (!task) {
        console.warn('Task not found for ID:', taskOrId);
        return;
      }
    } else {
      task = taskOrId;
    }
    
    // Check if this is a syringe or pen delivery method
    const deliveryMethod = task.deliveryMethod || task.delivery;
    const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
    
    // Injection confirmation is now handled inline in the task components
    
    const dateKey = toKey(date);
    const taskId = task.stableTaskId || generateTaskId(task);
    const currentlyCompleted = isTaskCompleted(taskId, dateKey, task.time);
    const newCompletedState = !currentlyCompleted;

    // Toggle in the unified system (this will dispatch the global event)
    toggleTaskCompletion(taskId, newCompletedState, dateKey, task.time);
    
    // CRITICAL: Update protection timestamp to prevent listener from overwriting
    // This prevents the real-time listener from replacing data for 30 seconds
    try {
      const now = Date.now();
      localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
    } catch (e) {
      console.warn('⚠️ Failed to save task toggle protection timestamp:', e);
    }
    
    // Update local state to reflect the change immediately (for visual feedback)
    setTodaysTasks(prev => prev.map(t => {
      const tTaskId = t.stableTaskId || generateTaskId(t);
      if (tTaskId === taskId || t.id === task.id) {
        return { ...t, completed: newCompletedState };
      }
      return t;
    }));
    
    // Add a slight delay before re-sorting to let user see the check mark
    setTimeout(() => {
      setTodaysTasks(prev => {
        // Re-sort the tasks: unchecked first, then checked, then by type, then by name
        const sortedTasks = [...prev].sort((a, b) => {
          // First, sort by completion status (unchecked first, then checked)
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // Then by type (peptides first)
          if (a.type === 'peptide' && b.type !== 'peptide') return -1
          if (a.type !== 'peptide' && b.type === 'peptide') return 1
          // Finally by name
          return a.name.localeCompare(b.name)
        });
        
        return sortedTasks;
      });
    }, 800); // 800ms delay - enough to see the check mark but not too long
  };

  // Listen for task completion changes from all views (including this one)
  useEffect(() => {
    const handleTaskCompletionChange = (event) => {
      const { taskId, completed, date, timeSlot, source } = event.detail;
      
      // If this is a cloud sync event, regenerate all tasks from scratch
      if (source === 'cloud-sync') {
        console.log('🔄 Cloud sync detected - regenerating all tasks');
        setCalendarBump(Date.now());
        return;
      }
      
      // Get today's date key for comparison
      const todayKey = toKey(new Date());
      
      // Update tasks in todaysTasks if they match
      setTodaysTasks(prev => prev.map(task => {
        const taskIdFromTask = task.stableTaskId || generateTaskId(task);
        // Match by taskId and ensure date/timeSlot match
        if (taskIdFromTask === taskId) {
          // If date matches today and timeSlot matches (or timeSlot not specified)
          if (date === todayKey && (!timeSlot || timeSlot === task.time)) {
            return { ...task, completed };
          }
        }
        return task;
      }));
      
      // Also trigger a full refresh to catch any other changes
      // This ensures tasks are regenerated with latest completion status
      // Use a small delay to let the immediate update above take effect first
      setTimeout(() => {
        setCalendarBump(Date.now());
      }, 100);
    };

    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    return () => window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
  }, []);

  // Goal management
  const handleGoalToggle = (goalId) => {
    setGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, completed: !g.completed } : g
    ));
  };

  // Filter enabled widgets - use array order for drag-and-drop, not position sorting
  // Also filter out analytics widgets if analytics is disabled
  // And filter out group buy widgets if group buys are disabled
  const enabledWidgets = widgets.filter(w => {
    if (!w.enabled) return false;
    
    // Hide analytics-related widgets when analytics is disabled
    if (!analyticsEnabled) {
      const analyticsWidgetTypes = [
        WIDGET_TYPES.COMPLIANCE,  // Research Consistency
        WIDGET_TYPES.SPENDING,    // Spending
        WIDGET_TYPES.LEAD_TIME    // Average Delivery
      ];
      if (analyticsWidgetTypes.includes(w.type)) {
        return false;
      }
    }
    
    // Hide group buy widget when group buys are disabled
    if (!groupBuysEnabled && w.type === WIDGET_TYPES.UPCOMING_BUYS) {
      return false;
    }
    
    // Hide injection history widget when injection site tracking is disabled
    if (!injectionSiteTrackingEnabled && w.type === WIDGET_TYPES.INJECTION_HISTORY) {
      return false;
    }
    
    return true;
  });

  // In customizing mode, separate enabled and hidden widgets
  // In normal mode, only show enabled widgets
  const enabledWidgetsForGrid = (isCustomizing 
    ? widgets.filter(w => w.enabled) 
    : enabledWidgets).sort((a, b) => {
    // Tips widget always goes last
    if (a.type === WIDGET_TYPES.TIPS) return 1;
    if (b.type === WIDGET_TYPES.TIPS) return -1;
    
    // Sort by position to maintain layout order after compaction
    const aY = a.position?.y || 0;
    const bY = b.position?.y || 0;
    if (aY !== bY) return aY - bY;
    const aX = a.position?.x || 0;
    const bX = b.position?.x || 0;
    return aX - bX;
  });
  const hiddenWidgets = isCustomizing 
    ? widgets.filter(w => !w.enabled) 
    : [];

  return (
    <ViewContainer theme={theme} transparent={true}>
      {/* Tips Banner - Compact header tips for new users */}
      <DashboardTipsBanner theme={theme} />
      
      <div className="space-y-2 overflow-x-hidden w-full max-w-full relative box-border" style={{ minWidth: 0, boxSizing: 'border-box', width: '100%', fontFamily: 'Poppins, sans-serif' }}>
        {/* Decorative background icon - positioned within content area */}
        <div className="absolute bottom-8 right-8 pointer-events-none z-0 hidden lg:block">
          <FlaskConical 
            size={280} 
            strokeWidth={1}
            style={{ 
              color: theme.primary || '#3B82F6',
              opacity: 0.22
            }}
          />
        </div>

        {/* Dashboard Layout - Flexible Grid */}
        <div className="w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
<div className="dashboard-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-4 auto-rows-min box-border p-1" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {enabledWidgetsForGrid.map((widget, index) => {
              // Use consistent widget sizing based on configuration
              const sizeConfig = getSizeConfig(widget.size);
              
              // Map grid width to CSS classes
              let gridClasses = '';
              switch (sizeConfig.w) {
                case 1:
                  gridClasses = 'col-span-1';
                  break;
                case 2:
                  gridClasses = 'col-span-2';
                  break;
                case 3:
                  gridClasses = 'col-span-3';
                  break;
                case 4:
                  gridClasses = 'col-span-4';
                  break;
                default:
                  gridClasses = 'col-span-2';
              }
              
              // Set consistent min and max height based on grid height
              let minHeight = '';
              let maxHeight = '';
              switch (sizeConfig.h) {
                case 1:
                  minHeight = '200px';
                  maxHeight = '280px';
                  break;
                case 2:
                  minHeight = '300px';
                  maxHeight = '400px';
                  break;
                case 3:
                  minHeight = '450px';
                  maxHeight = '600px';
                  break;
                default:
                  minHeight = '200px';
                  maxHeight = '280px';
              }
              
              return (
                <div key={`${widget.id}-${widget.position?.x}-${widget.position?.y}-${widget.enabled}`} className={`${gridClasses} w-full flex`}>
                  <DashboardWidget
                    widget={widget}
                    theme={theme}
                    isCustomizing={isCustomizing}
                    onToggleVisibility={handleToggleWidgetVisibility}
                    onSettings={handleWidgetSettings}
                    onResize={handleResizeWidget}
                    onMove={handleMoveWidget}
                    style={{ minHeight, maxHeight }}
                  >
                    <WidgetFactory
                      widget={widget}
                      theme={theme}
                      tasks={todaysTasks}
                      incomingOrder={incomingOrder}
                      upcomingBuys={(() => {
                        // Additional safety filter: remove mock buys if sample data was cleared
                        const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                        if (!sampleDataCleared) return scheduledBuys;
                        return scheduledBuys.filter(buy => {
                          if (buy.isMock) return false;
                          const mockVendors = ['BioTech Solutions', 'Peptide Research Co', 'Research Labs Pro'];
                          if (mockVendors.includes(buy.vendor)) return false;
                          if (buy.id === 201 || buy.id === 202 || buy.id === 203) return false;
                          const mockItems = ['Tirzepatide Bulk Order', 'BPC-157 Research Batch', 'Epithalon + Thymalin Stack'];
                          if (mockItems.includes(buy.item || buy.name)) return false;
                          return true;
                        });
                      })()}
                      pendingVendors={pendingVendors}
                      vendors={vendors}
                      stockpile={stockpile}
                      goals={goals}
                      metrics={metrics}
                      supplements={supplements}
                      isReadOnly={isReadOnly}
                      onUpgrade={() => setShowUpgradeModal(true)}
                      onTaskToggle={handleTaskToggle}
                      onOpenQuickStart={() => setShowQuickStartProtocol(true)}
                      onOpenFullSetup={() => setShowNewProtocol(true)}
                      onOpenStockpileAdd={() => setShowStockpileAdd(true)}
                      onNewOrder={() => setShowNewOrder(true)}
                      onAddBuy={() => { setEditingScheduledBuy(null); setShowAddBuyModal(true); }}
                      onOpenBuy={(buy) => { setEditingScheduledBuy({ ...buy, item: buy.item || buy.name || buy.peptideName }); setShowAddBuyModal(true); }}
                      wishlist={wishlist}
                      onAddWishlistItem={() => { setEditingWishlistItem(null); setShowAddWishlistModal(true); }}
                      onEditWishlistItem={(item) => { setEditingWishlistItem(item); setShowAddWishlistModal(true); }}
                      protocols={protocols}
                      onAddProtocolNote={(protocolId) => {
                        // Refresh protocol notes if needed
                        window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'));
                      }}
                      onViewAllVendors={() => navigate('/app/vendors')}
                      onCompleteVendor={(vendor) => {
                        setEditingVendor(vendor);
                        setShowNewVendor(true);
                      }}
                      onGoalToggle={handleGoalToggle}
                      onAddGoal={() => setShowGoal(true)}
                      onAddMetric={() => setShowMetrics(true)}
                      onEditGoal={(goal) => {
                        setEditingGoal(goal);
                        setShowGoal(true);
                      }}
                      onEditMetric={(metric, onReopen) => {
                        setEditingMetric(metric);
                        setShowMetrics(true);
                        if (onReopen) {
                          setShowBackButton(true);
                          setOnBackToAllEntries(() => onReopen);
                        } else {
                          setShowBackButton(false);
                          setOnBackToAllEntries(null);
                        }
                      }}
                      onAddSupplement={() => setShowAddSupplement(true)}
                      onEditSupplement={(supplement) => {
                        setEditingSupplement(supplement);
                        setShowAddSupplement(true);
                      }}
                      onDeleteSupplement={(supplementId) => {
                        if (deleteSupplement) {
                          deleteSupplement(supplementId);
                        }
                      }}
                    />
                  </DashboardWidget>
                </div>
              );
            })}
            
            {/* UNMOVEABLE SYSTEM WIDGET - Always shown at the end */}
            <div className="col-span-2">
              <ConversionWidget theme={theme} subscription={subscription} />
            </div>
          </div>
        </div>

        {/* Hidden Widgets Section - Only shown in customizing mode */}
        {isCustomizing && hiddenWidgets.length > 0 && (
          <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px dashed ${theme.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
              Hidden Widgets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {hiddenWidgets.map((widget) => {
                const sizeConfig = getSizeConfig(widget.size);
                let gridClasses = '';
                switch (sizeConfig.w) {
                  case 1:
                    gridClasses = 'col-span-1';
                    break;
                  case 2:
                    gridClasses = 'col-span-2';
                    break;
                  case 3:
                    gridClasses = 'col-span-3';
                    break;
                  case 4:
                    gridClasses = 'col-span-4';
                    break;
                  default:
                    gridClasses = 'col-span-2';
                }

                let minHeight = '200px';
                let maxHeight = '280px';
                switch (sizeConfig.h) {
                  case 1:
                    minHeight = '200px';
                    maxHeight = '280px';
                    break;
                  case 2:
                    minHeight = '300px';
                    maxHeight = '400px';
                    break;
                  case 3:
                    minHeight = '450px';
                    maxHeight = '600px';
                    break;
                }

                return (
                  <div key={widget.id} className={`${gridClasses} w-full flex`}>
                    <DashboardWidget
                      widget={widget}
                      theme={theme}
                      isCustomizing={isCustomizing}
                      onToggleVisibility={handleToggleWidgetVisibility}
                      onSettings={handleWidgetSettings}
                      onResize={handleResizeWidget}
                      onMove={handleMoveWidget}
                      style={{ minHeight, maxHeight }}
                    >
                      <WidgetFactory
                        widget={widget}
                        theme={theme}
                        tasks={todaysTasks}
                        incomingOrder={incomingOrder}
                        upcomingBuys={(() => {
                          const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                          if (!sampleDataCleared) return scheduledBuys;
                          return scheduledBuys.filter(buy => {
                            if (buy.isMock) return false;
                            const mockVendors = ['BioTech Solutions', 'Peptide Research Co', 'Research Labs Pro'];
                            if (mockVendors.includes(buy.vendor)) return false;
                            if (buy.id === 201 || buy.id === 202 || buy.id === 203) return false;
                            const mockItems = ['Tirzepatide Bulk Order', 'BPC-157 Research Batch', 'Epithalon + Thymalin Stack'];
                            if (mockItems.includes(buy.item || buy.name)) return false;
                            return true;
                          });
                        })()}
                        pendingVendors={pendingVendors}
                        vendors={vendors}
                        stockpile={stockpile}
                        goals={goals}
                        metrics={metrics}
                        supplements={supplements}
                        isReadOnly={isReadOnly}
                        onUpgrade={() => setShowUpgradeModal(true)}
                        onTaskToggle={handleTaskToggle}
                      onOpenQuickStart={() => setShowQuickStartProtocol(true)}
                      onOpenFullSetup={() => setShowNewProtocol(true)}
                      onOpenStockpileAdd={() => setShowStockpileAdd(true)}
                        onNewOrder={() => setShowNewOrder(true)}
                        onAddBuy={() => { setEditingScheduledBuy(null); setShowAddBuyModal(true); }}
                      onOpenBuy={(buy) => { setEditingScheduledBuy({ ...buy, item: buy.item || buy.name || buy.peptideName }); setShowAddBuyModal(true); }}
                        onViewAllVendors={() => navigate('/app/vendors')}
                        onCompleteVendor={(vendor) => {
                          setEditingVendor(vendor);
                          setShowNewVendor(true);
                        }}
                        onGoalToggle={handleGoalToggle}
                        onAddGoal={() => setShowGoal(true)}
                        onAddMetric={() => setShowMetrics(true)}
                        onEditGoal={(goal) => {
                          setEditingGoal(goal);
                          setShowGoal(true);
                        }}
                        onEditMetric={(metric) => {
                          setEditingMetric(metric);
                          setShowMetrics(true);
                        }}
                        wishlist={wishlist}
                        onAddWishlistItem={() => { setEditingWishlistItem(null); setShowAddWishlistModal(true); }}
                        onEditWishlistItem={(item) => { setEditingWishlistItem(item); setShowAddWishlistModal(true); }}
                        onAddSupplement={() => setShowAddSupplement(true)}
                        onEditSupplement={(supplement) => {
                          setEditingSupplement(supplement);
                          setShowAddSupplement(true);
                        }}
                        onDeleteSupplement={(supplementId) => {
                          if (deleteSupplement) {
                            deleteSupplement(supplementId);
                          }
                        }}
                      />
                    </DashboardWidget>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {enabledWidgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg mb-4" style={{ color: theme.textLight }}>
              No widgets enabled. 
            </p>
            <button
              onClick={() => setShowCustomizer(true)}
              className="px-6 py-3 rounded-lg font-semibold action-button-hover"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary
              }}
            >
              Add Widgets
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <DashboardCustomizer
        widgets={widgets}
        onUpdateWidgets={handleUpdateWidgets}
        theme={theme}
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />

      <ReconCalculatorModal
        open={showRecon}
        onClose={() => setShowRecon(false)}
        theme={theme}
        prefillData={reconPrefill}
      />

      <OCRImportModal 
        open={showImport} 
        onClose={() => setShowImport(false)} 
        theme={theme} 
        onImport={() => addToast('Import saved', 'success')} 
      />

      <VendorDetailsModal
        open={!!editingVendor || showNewVendor}
        onClose={() => { setEditingVendor(null); setShowNewVendor(false); }}
        theme={theme}
        vendor={editingVendor}
        isReadOnly={isReadOnly}
        onUpgrade={() => setShowUpgradeModal(true)}
        onSave={(v) => {
          // When user manually saves (completes profile), remove stub status
          // Use addVendor to ensure proper syncing with Orders page and vendor list
          const vendorId = v.id || editingVendor?.id || generateId();
          addVendor({ ...v, id: vendorId, isStub: false, needsCompletion: false });
          setEditingVendor(null);
          setShowNewVendor(false);
        }}
      />

      <AddToStockpileBottomSheet
        open={!!showStockpileAdd}
        onClose={() => setShowStockpileAdd(false)}
        theme={theme}
      />

      <OrderDetailsModal
        open={!!showNewOrder}
        onClose={() => setShowNewOrder(false)}
        order={{}}
        theme={theme}
        vendorList={vendorNames}
        isReadOnly={isReadOnly}
        onUpgrade={() => setShowUpgradeModal(true)}
        onSave={(o) => {
          const category = o.category || 'domestic';
          setOrders(prev => {
            const normalizedPrev = ensurePublicOrderNumbers(prev);
            const nextNumber = getNextPublicOrderNumber(normalizedPrev);
            const newOrder = { 
              ...o, 
              id: o.id || generateId(), 
              category, 
              type: category,
              publicOrderNumber: nextNumber
            };
            return [newOrder, ...normalizedPrev];
          });
          if (o.vendor) {
            setVendors(prev => {
              const existing = prev.find(v => v.name === o.vendor);
              if (existing) return prev;
              return [...prev, { id: generateId(), name: o.vendor }];
            });
          }
          setShowNewOrder(false);
        }}
        onDelete={() => setShowNewOrder(false)}
      />

      <GoalModal
        open={showGoal}
        onClose={() => { setShowGoal(false); setEditingGoal(null); }}
        theme={theme}
        goal={editingGoal}
        onSave={(goal) => {
          if (editingGoal) {
            setGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...editingGoal, ...goal } : g));
          } else {
            setGoals(prev => [...prev, { ...goal, id: generateId() }]);
          }
          setShowGoal(false);
          setEditingGoal(null);
        }}
      />

      <BodyMetricsModal
        open={showMetrics}
        onClose={() => { 
          setShowMetrics(false); 
          setEditingMetric(null);
          setShowBackButton(false);
          setOnBackToAllEntries(null);
        }}
        theme={theme}
        metric={editingMetric}
        showBackButton={showBackButton}
        onBack={onBackToAllEntries}
        onDelete={async (metricData) => {
          if (editingMetric?.id) {
            const metricToDelete = editingMetric;
            console.log('🗑️ Deleting metric:', metricToDelete.name || 'Unknown');
            
            // Record deletion with item snapshot for restore functionality
            const { recordDeletion } = require('../utils/deletionTracking');
            recordDeletion('metrics', editingMetric.id, metricToDelete);
            
            // Remove from local state
            const updatedMetrics = metrics.filter(m => m.id !== editingMetric.id);
            setMetrics(updatedMetrics);
            setShowMetrics(false);
            setEditingMetric(null);
            
            // CRITICAL: Force immediate cloud sync with skipMerge to ensure deletion persists
            if (firebaseUser) {
              try {
                const userId = firebaseUser.uid;
                const appData = {
                  protocols: protocols || [],
                  reconItems: reconItems || [],
                  reconHistory: reconHistory || [],
                  supplements: supplements || [],
                  orders: orders || [],
                  metrics: updatedMetrics, // Use updated metrics with deletion
                  vendors: vendors || [],
                  calendarNotes: calendarNotes || {},
                  stockpile: stockpile || [],
                  scheduledBuys: scheduledBuys || []
                };
                
                const syncResult = await saveAppData(userId, appData, { skipMerge: true });
                if (syncResult) {
                  console.log('✅ Deleted metric synced to cloud immediately');
                } else {
                  console.error('❌ Failed to sync deleted metric to cloud');
                }
              } catch (error) {
                console.error('❌ Error syncing deleted metric to cloud:', error);
              }
            }
            
            // If we have a back callback, use it to return to view all modal
            if (onBackToAllEntries) {
              setTimeout(() => {
                onBackToAllEntries();
              }, 100);
            }
            setShowBackButton(false);
            setOnBackToAllEntries(null);
          }
        }}
        onSave={async (metric) => {
          const now = new Date().toISOString();
          let updatedMetrics;
          
          if (editingMetric && editingMetric.id) {
            // Editing existing metric
            updatedMetrics = metrics.map(m => 
              m.id === editingMetric.id 
                ? { ...m, ...metric, id: editingMetric.id, updatedAt: now }
                : m
            );
          } else if (metric.id) {
            // Metric has an id but wasn't in editingMetric (edge case)
            updatedMetrics = metrics.map(m => 
              m.id === metric.id 
                ? { ...m, ...metric, updatedAt: now }
                : m
            );
          } else {
            // Creating new metric
            updatedMetrics = [...metrics, { ...metric, id: generateId(), createdAt: now, updatedAt: now }];
          }
          
          setMetrics(updatedMetrics);
          setShowMetrics(false);
          setEditingMetric(null);
          setShowBackButton(false);
          setOnBackToAllEntries(null);
          
          // CRITICAL: Sync to Firebase to persist changes
          if (firebaseUser) {
            try {
              const userId = firebaseUser.uid;
              const appData = {
                protocols: protocols || [],
                reconItems: reconItems || [],
                reconHistory: reconHistory || [],
                supplements: supplements || [],
                orders: orders || [],
                metrics: updatedMetrics,
                vendors: vendors || [],
                calendarNotes: calendarNotes || {},
                stockpile: stockpile || [],
                scheduledBuys: scheduledBuys || []
              };
              
              const syncResult = await saveAppData(userId, appData, { skipMerge: true });
              if (syncResult) {
                console.log('✅ Saved metric synced to cloud immediately');
              } else {
                console.error('❌ Failed to sync saved metric to cloud');
              }
            } catch (error) {
              console.error('❌ Error syncing saved metric to cloud:', error);
            }
          }
          
          // If we have a back callback, use it to return to view all modal
          if (onBackToAllEntries) {
            setTimeout(() => {
              onBackToAllEntries();
            }, 100);
          }
        }}
      />

      <AddScheduledBuyModal
        open={showAddBuyModal}
        onClose={() => { setShowAddBuyModal(false); setEditingScheduledBuy(null); }}
        theme={theme}
        buy={editingScheduledBuy}
        onSave={(buy) => {
          // ✅ Remove client-side timestamp - will be set by Firestore serverTimestamp during sync
          const newBuy = { 
            ...buy, 
            id: buy.id || generateId(),
            name: buy.item, // Map item to name for display
            peptideName: buy.item, // Also set peptideName for backward compatibility
            createdAt: buy.createdAt || new Date().toISOString() // Keep createdAt for initial tracking
            // updatedAt will be set by Firestore serverTimestamp during sync
          };
          
          // Update state
          setScheduledBuys(prev => {
            const isEdit = buy.id && prev.some(b => b.id === buy.id);
            let updated;
            if (isEdit) {
              // Update existing buy - no client-side timestamp
              updated = prev.map(b => b.id === buy.id ? { ...b, ...newBuy } : b);
            } else {
              // Add new buy
              updated = [...prev, newBuy];
            }
            
            // Save to localStorage immediately
            try {
              localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updated));
              // Also set the protection timestamp
              localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
            } catch (e) {
              console.error('Failed to save scheduled buys to localStorage:', e);
            }
            
            // Dispatch event to trigger cloud sync protection
            window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
              detail: { scheduledBuys: updated }
            }));
            
            return updated;
          });
          
          setShowAddBuyModal(false);
          addToast(buy.id ? 'Scheduled buy updated' : 'Scheduled buy added', 'success');
        }}
        onDelete={(buyId) => {
          // Record deletion in persistent tracking to prevent restoration
          recordDeletion('scheduledBuys', String(buyId));
          
          // Delete the scheduled buy
          setScheduledBuys(prev => {
            const updated = prev.filter(b => b.id !== buyId);
            
            // Save to localStorage immediately
            try {
              localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updated));
              // Set the protection timestamp
              localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
            } catch (e) {
              console.error('Failed to save scheduled buys to localStorage:', e);
            }
            
            // Dispatch event to trigger cloud sync protection
            window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
              detail: { scheduledBuys: updated }
            }));
            
            return updated;
          });
          
          setShowAddBuyModal(false);
          addToast('Scheduled buy deleted', 'success');
        }}
      />

      <AddWishlistItemModal
        open={showAddWishlistModal}
        onClose={() => { setShowAddWishlistModal(false); setEditingWishlistItem(null); }}
        theme={theme}
        item={editingWishlistItem ?? null}
        onSave={(item) => {
          if (isReadOnly) {
            setShowUpgradeModal(true);
            return;
          }
          
          const newItem = prepareItemForSave(
            { ...item, createdAt: item.createdAt || new Date().toISOString() },
            { isNew: !item.id }
          );
          
          setWishlist(prev => {
            const isEdit = item.id && prev.some(i => i.id === item.id);
            let updated;
            if (isEdit) {
              updated = prev.map(i => i.id === item.id ? prepareItemForSave({ ...i, ...newItem }) : i);
            } else {
              updated = [...prev, newItem];
            }
            
            // Save to localStorage immediately
            try {
              localStorage.setItem('tpprover_wishlist', JSON.stringify(updated));
              localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
            } catch (e) {
              console.error('Failed to save wishlist to localStorage:', e);
            }
            
            // Dispatch event to trigger updates
            window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', {
              detail: { wishlist: updated }
            }));
            
            return updated;
          });
          
          setShowAddWishlistModal(false);
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: item.id ? 'Wishlist item updated' : 'Item added to wishlist', type: 'success' } 
          }));
        }}
      />

      <SupplementEditorModal
        open={showAddSupplement}
        onClose={() => { setShowAddSupplement(false); setEditingSupplement(null); }}
        theme={theme}
        supplement={editingSupplement}
        onSave={async (supplement) => {
          // Handle delete case directly
          if (supplement._delete && supplement.id) {
            await deleteSupplement(supplement.id);
            setShowAddSupplement(false);
            setEditingSupplement(null);
            addToast('Supplement deleted', 'success');
            return;
          }
          
          // Handle save/update
          if (editingSupplement) {
            await updateSupplement(supplement);
            addToast('Supplement saved', 'success');
          } else {
            addSupplement(supplement);
            addToast('Supplement added', 'success');
          }
          setShowAddSupplement(false);
          setEditingSupplement(null);
        }}
      />

      <QuickStartProtocolModal
        open={showQuickStartProtocol}
        onClose={() => setShowQuickStartProtocol(false)}
        theme={theme}
        onSave={async (protocolData) => {
          const finalProtocol = prepareItemForSave({ ...protocolData }, { isNew: true });
          addProtocol(finalProtocol);
          const now = new Date();
          const historyEntry = {
            id: generateId(),
            protocolId: finalProtocol.id,
            startDate: finalProtocol.startDate,
            endDate: null,
            status: 'active',
            notes: [],
            createdAt: now,
            protocolData: {
              protocolName: finalProtocol.protocolName,
              peptides: finalProtocol.peptides || [],
              linkedItems: finalProtocol.linkedItems || {}
            }
          };
          saveProtocolHistoryEntry(historyEntry);
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `${finalProtocol.protocolName} started successfully!`, type: 'success' } }));
          setShowQuickStartProtocol(false);
        }}
      />

      <ProtocolEditorModal
        open={showNewProtocol}
        onClose={() => setShowNewProtocol(false)}
        theme={theme}
        isReadOnly={isReadOnly}
        onUpgrade={() => setShowUpgradeModal(true)}
        onSave={(protocol) => {
          const cleaned = prepareItemForSave({ id: generateId(), ...protocol, active: false, startDate: protocol.startDate || '' }, { isNew: true });
          addProtocol(cleaned);
          setShowNewProtocol(false);
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol created', type: 'success' } }));
        }}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        theme={theme}
        actionAttempted="continue using this feature"
      />

      {/* Toast notifications now handled globally in App.jsx */}
    </ViewContainer>
  );
}
