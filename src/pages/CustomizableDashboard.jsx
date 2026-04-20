import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Settings, FlaskConical, Package, Syringe, Target, Scale, Activity, Zap, Shield, Brain, Heart, TrendingUp, ShoppingCart, Droplets, ChevronUp, ChevronDown, Flame, ListChecks } from 'lucide-react';
import { getProtocolColor } from '../utils/protocolColors';
import { useAppContext } from '../context/AppContext';
import { useBadgeStats } from '../utils/badges';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import WidgetFactory from '../components/dashboard/WidgetFactory';
// Toast notifications now handled globally in App.jsx
import useLocalStorage, { useSyncedGoals } from '../utils/hooks';
import { 
  loadDashboardLayout, 
  saveDashboardLayout, 
  validateWidgetPosition,
  findEmptyPosition,
  resetDashboardLayout,
  getSizeConfig,
  WIDGET_TYPES,
  WIDGET_SIZES,
  compactGrid
} from '../utils/dashboardCustomization';
import { fixDataInconsistencies, diagnoseDashboardData } from '../utils/dataCleanup';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCalendarDone } from '../utils/taskCompletion';
import { maybeIncrementStreakForAllTasksComplete } from '../utils/taskStreak';
import { tryHydrationGoalRewards, getHydrationStreak } from '../utils/hydrationStreak';
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
import BottomSheet from '../components/common/BottomSheet';
import DontForgetWidget from '../components/dashboard/widgets/DontForgetWidget';
import ExpandableTooltip from '../components/ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../utils/widgetTooltips';
import ProtocolFollowUpModal from '../components/protocols/ProtocolFollowUpModal';
import ConversionWidget from '../components/dashboard/ConversionWidget';
import UpgradeModal from '../components/common/UpgradeModal';
import DashboardTipsBanner from '../components/dashboard/DashboardTipsBanner';
import DashboardBioCheckIn from '../components/dashboard/DashboardBioCheckIn';
import DailyUnlockCelebration from '../components/dashboard/DailyUnlockCelebration';
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers';
import { saveAppData } from '../services/cloudStorage';
import { useFirebase } from '../context/FirebaseContext';
import { recordDeletion } from '../utils/deletionTracking';
import { generateId } from '../utils/string';
import { prepareItemForSave } from '../utils/userDataSave';
import { buildOrderPrefillFromWishlistItem, buildStockpilePrefillFromWishlistItem } from '../utils/wishlistAcquirePrefill';

const WATER_CARD_BLUE = '#3b9ed8';

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
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handle = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Dashboard data state
  const [todaysTasks, setTodaysTasks] = useState([]);
  // Toast notifications now handled globally
  const [goals, setGoals] = useSyncedGoals();
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
  const [wishlistStockpilePrefill, setWishlistStockpilePrefill] = useState(null);
  const [newOrderDraftFromWishlist, setNewOrderDraftFromWishlist] = useState(null);
  const [newOrderModalKey, setNewOrderModalKey] = useState(0);
  const [showAddWishlistModal, setShowAddWishlistModal] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tpprover_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  const [fabOpen, setFabOpen] = useState(false);

  const openBlankNewOrder = useCallback(() => {
    setNewOrderDraftFromWishlist(null);
    setNewOrderModalKey((k) => k + 1);
    setShowNewOrder(true);
  }, []);

  const handleWishlistAcquire = useCallback((item, destination) => {
    if (isReadOnly) {
      setShowUpgradeModal(true);
      return;
    }
    if (!item?.id) return;
    setWishlist((prev) => {
      const next = prev.filter((w) => String(w.id) !== String(item.id));
      try {
        localStorage.setItem('tpprover_wishlist', JSON.stringify(next));
        localStorage.setItem('tpprover_wishlist_lastUpdate', String(Date.now()));
      } catch (e) {
        console.error('Failed to update wishlist after acquire:', e);
      }
      window.dispatchEvent(new CustomEvent('tpp:wishlist-updated', { detail: { wishlist: next } }));
      return next;
    });
    if (destination === 'order') {
      const draft = buildOrderPrefillFromWishlistItem(item);
      setNewOrderDraftFromWishlist(draft);
      setNewOrderModalKey((k) => k + 1);
      setShowNewOrder(true);
    } else {
      setWishlistStockpilePrefill(buildStockpilePrefillFromWishlistItem(item));
      setShowStockpileAdd(true);
    }
  }, [isReadOnly]);

  // FAB speed-dial
  const fabClosing = false; // kept for code compat — close is now instant
  const beginFabClose = useCallback(() => { setFabOpen(false); }, []);

  // Research Notes modal is now handled globally in App.jsx

  // vendorNames removed — use `vendors` from AppContext instead

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

  // Compute dashboard data: all incoming orders (placed / in transit / recently delivered) for widget pagination
  const incomingOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const activeOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      const isDelivered = status.includes('delivered');
      if (!isDelivered) return true;
      if (o.deliveryDate) return new Date(o.deliveryDate) >= threeDaysAgo;
      if (o.date) return new Date(o.date) >= threeDaysAgo;
      return false;
    });
    if (activeOrders.length === 0) return [];
    activeOrders.sort((a, b) => new Date(a.deliveryDate || a.date || 0) - new Date(b.deliveryDate || b.date || 0));
    return activeOrders.map(o => ({
      id: o.id,
      peptide: o.items?.[0]?.name || 'Unknown Item',
      mg: o.items?.[0]?.mg || 'N/A',
      vendor: o.vendorName || o.vendor || 'Unknown Vendor',
      status: o.status || 'Order Placed',
      shipDate: o.shipDate || o.date,
      deliveryDate: o.deliveryDate,
      date: o.date,
      tracking: o.tracking
    }));
  }, [orders]);

  const incomingOrder = incomingOrders.length > 0 ? incomingOrders[0] : null;

  const pendingVendors = useMemo(() => {
    return vendors.filter(vendor => vendor.isStub === true);
  }, [vendors]);

  // Action-items sheet state (opened from Topbar ClipboardList icon)
  const [showActionItemsSheet, setShowActionItemsSheet] = useState(false);

  // To-Do inline modals — open directly without leaving the page
  const [toDoFollowUp, setToDoFollowUp] = useState(null); // { protocolId, historyId }
  const [toDoStockpileItem, setToDoStockpileItem] = useState(null); // stockpile item object

  // Quick-action cards: water + weight

  // Read hydration prefs from settings
  const hydrationPrefs = useMemo(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return { unit: s.hydration?.unit || 'oz', cupSize: s.hydration?.cupSize || 8, dailyGoal: s.hydration?.dailyGoal || 64 };
    } catch { return { unit: 'oz', cupSize: 8, dailyGoal: 64 }; }
  }, []);

  const [waterData, setWaterData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_water_tracker') || '{}'); } catch { return {}; }
  });
  const [hydrationStreakN, setHydrationStreakN] = useState(() => getHydrationStreak());
  useEffect(() => {
    const sync = () => setHydrationStreakN(getHydrationStreak());
    window.addEventListener('tpp:hydration-streak-updated', sync);
    window.addEventListener('tpp:hydration-goal-complete', sync);
    return () => {
      window.removeEventListener('tpp:hydration-streak-updated', sync);
      window.removeEventListener('tpp:hydration-goal-complete', sync);
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayWater = waterData[today] || { amount: 0, goal: hydrationPrefs.dailyGoal, unit: hydrationPrefs.unit };
  const todayWaterAmt = Number(todayWater.amount ?? todayWater.glasses ?? 0) || 0;
  const waterPct = Math.min(todayWaterAmt / (todayWater.goal || hydrationPrefs.dailyGoal), 1);

  const addWater = useCallback((amount) => {
    const updated = { ...waterData };
    const prev = updated[today] || {};
    const prevAmt = Number(prev.amount ?? prev.glasses ?? 0) || 0;
    const goal = prev.goal > 0 ? prev.goal : hydrationPrefs.dailyGoal;
    const unit = prev.unit || hydrationPrefs.unit;
    const newAmt = Math.max(0, prevAmt + amount);
    const dayData = {
      ...prev,
      amount: newAmt,
      glasses: newAmt,
      goal,
      unit,
    };
    updated[today] = dayData;
    setWaterData(updated);
    localStorage.setItem('tpprover_water_tracker', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tpp:water-tracker-updated', { detail: { waterData: updated } }));
    tryHydrationGoalRewards(today, dayData);
  }, [waterData, today, hydrationPrefs]);

  const commitMetricsUpdate = useCallback(async (updatedMetrics) => {
    setMetrics(updatedMetrics);
    if (!firebaseUser) return;
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
        scheduledBuys: scheduledBuys || [],
      };
      await saveAppData(userId, appData, { skipMerge: true });
    } catch (error) {
      console.error('Error syncing metrics from check-in:', error);
    }
  }, [firebaseUser, protocols, reconItems, reconHistory, supplements, orders, vendors, calendarNotes, stockpile, scheduledBuys, setMetrics]);

  const lastWeight = useMemo(() => {
    const entries = (metrics || []).filter(m => (m.type || '').toLowerCase().includes('weight') || (m.label || '').toLowerCase().includes('weight'));
    if (!entries.length) return null;
    return entries.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))[0];
  }, [metrics]);

  const [weightInput, setWeightInput] = useState('');
  useEffect(() => {
    const handler = () => setShowActionItemsSheet(true);
    window.addEventListener('tpp:open-action-items', handler);
    return () => window.removeEventListener('tpp:open-action-items', handler);
  }, []);

  // Filter mock scheduled buys when sample data is cleared.
  // AppContext already loads scheduledBuys from localStorage/Firebase on init and
  // keeps it in sync, so we only need to handle the sample-data-cleared event here.
  useEffect(() => {
    const handleSampleDataCleared = () => {
      setScheduledBuys(prev => prev.filter(b => {
        if (b.isMock) return false;
        const mockVendors = ['BioTech Solutions', 'Peptide Research Co', 'Research Labs Pro'];
        if (mockVendors.includes(b.vendor)) return false;
        if (b.id === 201 || b.id === 202 || b.id === 203) return false;
        const mockItems = ['Tirzepatide Bulk Order', 'BPC-157 Research Batch', 'Epithalon + Thymalin Stack'];
        if (mockItems.includes(b.item)) return false;
        return true;
      }));
    };

    window.addEventListener('sample-data-cleared', handleSampleDataCleared);

    return () => {
      window.removeEventListener('sample-data-cleared', handleSampleDataCleared);
    };
  }, [setScheduledBuys]);

  // Load and sync wishlist data
  // Wishlist is NOT in AppContext state, so we reload from localStorage when
  // cloud data arrives or when a local update event fires.
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

    const handleWishlistUpdated = (e) => {
      if (e.detail?.wishlist) {
        setWishlist(e.detail.wishlist);
      } else {
        loadWishlist();
      }
    };

    const handleCloudDataLoaded = () => {
      loadWishlist();
    };

    window.addEventListener('tpp:wishlist-updated', handleWishlistUpdated);
    window.addEventListener('tpp:cloud-data-loaded', handleCloudDataLoaded);

    const handleStorageChange = (e) => {
      if (e.key === 'tpprover_wishlist') {
        loadWishlist();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('tpp:wishlist-updated', handleWishlistUpdated);
      window.removeEventListener('tpp:cloud-data-loaded', handleCloudDataLoaded);
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
      openBlankNewOrder();
    };
    const handleOpenVendor = () => {
      setEditingVendor(null);
      setShowNewVendor(true);
    };
    const handleOpenProtocol = () => {
      setShowNewProtocol(true);
    };
    const handleDashboardCustomize = () => {
      setIsCustomizing(prev => !prev);
    };
    const handleDashboardSettings = () => {
      setShowCustomizer(true);
    };
    const handleGroupBuyDeletedInQuickActions = () => {
      // No-op: context scheduledBuys is already updated by the delete handler
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
  }, [openBlankNewOrder]);

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
              deliveryMethod: pep.deliveryMethod || pep.delivery || 'pipette',
              delivery: pep.delivery || pep.deliveryMethod || 'pipette',
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

  // Gamification: streak + unlock celebration when all tasks for today are complete
  useEffect(() => {
    const dateKey = toKey(new Date());
    const res = maybeIncrementStreakForAllTasksComplete(todaysTasks, dateKey);
    if (res.incremented) {
      window.dispatchEvent(new CustomEvent('tpp:task-streak-updated', { detail: { streak: res.streak } }));
      window.dispatchEvent(new CustomEvent('tpp:daily-tasks-unlock', { detail: { streak: res.streak } }));
    }
  }, [todaysTasks]);

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
      g.id === goalId ? prepareItemForSave({ ...g, completed: !g.completed }) : g
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
        WIDGET_TYPES.ANALYTICS,   // Analytics Dashboard
        WIDGET_TYPES.COMPLIANCE, // Research Consistency
        WIDGET_TYPES.SPENDING,   // Spending
        WIDGET_TYPES.LEAD_TIME   // Average Delivery
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

  // ── Home section: pin TASKS widget at top, hide from main grid ──────────
  const homeHiddenTypes = new Set([
    WIDGET_TYPES.TASKS,
    WIDGET_TYPES.METRICS,
    WIDGET_TYPES.NOTES,
    WIDGET_TYPES.QUICK_ACTIONS,
    WIDGET_TYPES.GOALS,
    WIDGET_TYPES.WISHLIST,
    WIDGET_TYPES.INVENTORY,
    WIDGET_TYPES.SPENDING,
    WIDGET_TYPES.ACTIVE_PROTOCOLS_NOTES,
    WIDGET_TYPES.SUPPLEMENTS,
    WIDGET_TYPES.BADGES,
    WIDGET_TYPES.LEAD_TIME,
    WIDGET_TYPES.UPCOMING_BUYS,
    WIDGET_TYPES.DONT_FORGET,
    WIDGET_TYPES.PENDING_VENDORS,
    WIDGET_TYPES.TIPS,
    WIDGET_TYPES.WATER_TRACKER,
    WIDGET_TYPES.HYDRATION,
  ]);
  const topTasksWidget = enabledWidgetsForGrid.find(w => w.type === WIDGET_TYPES.TASKS) || null;
  const mainGridWidgets = enabledWidgetsForGrid.filter(w => !homeHiddenTypes.has(w.type));

  // ── Stockpile computed values ─────────────────────────────────────────────
  const lowStockCount = useMemo(() => (stockpile || []).filter(s => Number(s.quantity) <= 1).length, [stockpile]);
  const stockpileValueFormatted = useMemo(() => {
    const total = (stockpile || []).reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.quantity) || 0), 0);
    return `$${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }, [stockpile]);
  const stockpileHealthPct = useMemo(() => {
    if (!stockpile || stockpile.length === 0) return null;
    const healthy = stockpile.filter(s => Number(s.quantity) > 1).length;
    return Math.round((healthy / stockpile.length) * 100);
  }, [stockpile]);

  // ── Purpose string → icon mapping ────────────────────────────────────────
  const getPurposeIcon = (purposeStr) => {
    const p = (purposeStr || '').toLowerCase();
    if (p.includes('weight') || p.includes('fat')) return Scale;
    if (p.includes('muscle') || p.includes('strength')) return Zap;
    if (p.includes('cognitive') || p.includes('neuro') || p.includes('brain')) return Brain;
    if (p.includes('immune') || p.includes('protection')) return Shield;
    if (p.includes('heal') || p.includes('recover') || p.includes('repair')) return Activity;
    if (p.includes('heart') || p.includes('cardio')) return Heart;
    if (p.includes('anti') || p.includes('longevity')) return Target;
    return FlaskConical;
  };

  // ── Home insight cards ────────────────────────────────────────────────────
  const homeInsightCards = useMemo(() => {
    const activeProtocols = (protocols || []).filter(p => p.active !== false);
    const nextDoseProtocol = activeProtocols[0] || null;
    return [
      {
        key: 'protocols',
        label: 'Active Protocols',
        value: activeProtocols.length,
        hint: activeProtocols.length === 0 ? 'No active protocols' : `${activeProtocols.length} running`,
        to: '/app/protocols',
        accent: '#6B8FA3',
        progress: null,
      },
      {
        key: 'dose',
        label: 'Next Scheduled Dose',
        value: nextDoseProtocol?.protocolName || '—',
        hint: nextDoseProtocol?.purpose || 'No active protocols',
        to: '/app/protocols',
        accent: '#7F9E95',
        progress: null,
      },
      {
        key: 'stockpile',
        label: lowStockCount > 0 ? 'Restock Needed' : 'Stockpile',
        value: lowStockCount > 0 ? `${lowStockCount} low` : stockpileValueFormatted,
        hint: lowStockCount > 0 ? 'Items running low' : 'All stocked up',
        to: '/app/stockpile',
        accent: lowStockCount > 0 ? '#C47A5A' : '#7B6B9C',
        progress: stockpileHealthPct,
      },
    ];
  }, [protocols, lowStockCount, stockpileValueFormatted, stockpileHealthPct]);

  return (
    <>
      <DailyUnlockCelebration theme={theme} />
      {/* Tips Banner - Compact header tips for new users */}
      <DashboardTipsBanner theme={theme} />
      
      {/* Decorative background icon */}
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

      {/* ── Unified dashboard grid — all items same width ─────────────────── */}
      <div className="w-full max-w-full min-w-0" style={{ paddingBottom: 'calc(3.5rem + 0.75rem)' }}>
        <div className="dashboard-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5 auto-rows-min px-3 sm:px-5 md:px-6 lg:px-8 py-3" style={{ fontFamily: 'Poppins, sans-serif' }}>

          {/* Today's Research — pinned first, never remove */}
          {topTasksWidget && (
            <DashboardWidget
              key={`top-${topTasksWidget.id}`}
              widget={topTasksWidget}
              theme={theme}
              gridClassName="col-span-1 sm:col-span-2"
              isCustomizing={isCustomizing}
              onToggleVisibility={handleToggleWidgetVisibility}
              onSettings={handleWidgetSettings}
              onResize={handleResizeWidget}
              onMove={handleMoveWidget}
              style={{ minHeight: '260px', maxHeight: '420px' }}
            >
              <WidgetFactory
                widget={topTasksWidget}
                theme={theme}
                tasks={todaysTasks}
                incomingOrder={incomingOrder}
                incomingOrders={incomingOrders}
                upcomingBuys={scheduledBuys}
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
                onNewOrder={openBlankNewOrder}
                onAddBuy={() => { setEditingScheduledBuy(null); setShowAddBuyModal(true); }}
                onOpenBuy={(buy) => { setEditingScheduledBuy({ ...buy, item: buy.item || buy.name || buy.peptideName }); setShowAddBuyModal(true); }}
                wishlist={wishlist}
                onAddWishlistItem={() => { setEditingWishlistItem(null); setShowAddWishlistModal(true); }}
                onEditWishlistItem={(item) => { setEditingWishlistItem(item); setShowAddWishlistModal(true); }}
                onWishlistAcquire={handleWishlistAcquire}
                protocols={protocols}
                onAddProtocolNote={() => window.dispatchEvent(new CustomEvent('tpp:protocol-history-updated'))}
                onViewAllVendors={() => navigate('/app/vendors')}
                onCompleteVendor={(vendor) => { setEditingVendor(vendor); setShowNewVendor(true); }}
                onGoalToggle={handleGoalToggle}
                onAddGoal={() => setShowGoal(true)}
                onAddMetric={() => setShowMetrics(true)}
                onEditGoal={(goal) => { setEditingGoal(goal); setShowGoal(true); }}
                onEditMetric={(metric, onReopen) => {
                  setEditingMetric(metric);
                  setShowMetrics(true);
                  if (onReopen) { setShowBackButton(true); setOnBackToAllEntries(() => onReopen); }
                  else { setShowBackButton(false); setOnBackToAllEntries(null); }
                }}
                onAddSupplement={() => setShowAddSupplement(true)}
                onEditSupplement={(supplement) => { setEditingSupplement(supplement); setShowAddSupplement(true); }}
                onDeleteSupplement={(id) => { if (deleteSupplement) deleteSupplement(id); }}
              />
            </DashboardWidget>
          )}

          {/* Active Protocols card */}
          {(() => {
            const card = homeInsightCards.find(c => c.key === 'protocols');
            if (!card) return null;
            const activeProtocols = (protocols || []).filter(p => p.active !== false);
            const maxPreview = 2;
            const previewProtocols = activeProtocols.slice(0, maxPreview);
            const moreCount = activeProtocols.length - previewProtocols.length;
            return (
              <div
                key="home-protocols"
                className="col-span-1 sm:col-span-2 rounded-2xl p-4 sm:p-5 text-left shadow-[0_2px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_18px_rgba(0,0,0,0.28)] w-full overflow-hidden ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                style={{ backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold flex items-center gap-2 truncate min-w-0" style={{ color: theme.text }}>
                    Active Protocols
                    <FlaskConical size={18} strokeWidth={2.25} style={{ color: theme.primary }} className="flex-shrink-0" aria-hidden />
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeProtocols.length > 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}
                      >
                        {activeProtocols.length} total
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(card.to)}
                      className="text-[10px] sm:text-[11px] font-semibold rounded-lg px-2 py-0.5 transition-colors hover:opacity-90 touch-manipulation"
                      style={{ color: card.accent }}
                    >
                      View all
                    </button>
                  </div>
                </div>
                {activeProtocols.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate(card.to)}
                    className="w-full flex items-center gap-3 text-left rounded-xl p-1 -m-1 transition-transform active:scale-[0.99] touch-manipulation border-0 cursor-pointer bg-transparent"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.accent}18`, color: card.accent }}>
                      <FlaskConical size={20} strokeWidth={2.25} />
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{ color: theme.text }}>None</p>
                      <p className="text-[11px]" style={{ color: theme.textLight }}>No active protocols — tap to open Protocols</p>
                    </div>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {previewProtocols.map((p) => {
                      const color = p.protocolColor || getProtocolColor(p.id);
                      const PIcon = getPurposeIcon(p.purpose);
                      const sole = previewProtocols.length === 1;
                      const chipShadow = theme.isDark
                        ? `0 2px 14px rgba(0,0,0,0.45), 0 0 0 1px ${color}42, inset 0 1px 0 ${color}38, inset 0 -1px 0 rgba(0,0,0,0.35)`
                        : `0 2px 10px ${color}28, 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px ${color}35, inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 ${color}18`;
                      const chipHoverShadow = theme.isDark
                        ? `0 4px 18px rgba(0,0,0,0.5), 0 0 0 1px ${color}55, inset 0 1px 0 ${color}45`
                        : `0 4px 16px ${color}35, 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px ${color}45, inset 0 1px 0 rgba(255,255,255,0.85)`;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => navigate('/app/protocols', { state: { highlightProtocolId: p.id } })}
                          className={`group rounded-xl px-2.5 py-2 text-left border-0 cursor-pointer touch-manipulation min-w-0 flex items-center gap-2.5 transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.99] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${sole ? 'col-span-2' : ''}`}
                          style={{
                            background: `linear-gradient(165deg, ${color}40 0%, ${color}1f 42%, ${color}0f 100%)`,
                            boxShadow: chipShadow,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = chipHoverShadow; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = chipShadow; }}
                          aria-label={`Open ${p.protocolName || 'protocol'}`}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-[1.04]"
                            style={{
                              background: `linear-gradient(180deg, ${color}55 0%, ${color}30 55%, ${color}1c 100%)`,
                              boxShadow: theme.isDark
                                ? `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.35)`
                                : `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 ${color}35`,
                              color,
                            }}
                          >
                            <PIcon size={17} strokeWidth={2.2} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]" />
                          </div>
                          <div className="min-w-0 flex-1 flex items-center gap-1.5">
                            <p className="text-[11px] sm:text-xs font-semibold truncate leading-tight tracking-tight" style={{ color: theme.text }}>{p.protocolName || 'Untitled'}</p>
                            <span
                              className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white/30 dark:ring-black/20 shadow-sm"
                              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}99` }}
                              aria-hidden
                            />
                          </div>
                        </button>
                      );
                    })}
                    {moreCount > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate(card.to)}
                        className="col-span-2 rounded-xl py-2 px-2.5 text-center border-0 cursor-pointer text-[10px] sm:text-[11px] font-semibold transition-all duration-200 touch-manipulation hover:-translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{
                          color: theme.textLight,
                          background: theme.isDark
                            ? 'linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                            : 'linear-gradient(165deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)',
                          boxShadow: theme.isDark
                            ? '0 1px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
                            : '0 1px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
                        }}
                      >
                        +{moreCount} more on Protocols
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Regular widgets (Analytics, Compliance, etc.) */}
          {mainGridWidgets.map((widget, index) => {
              // Desktop only: use the widget's configured size directly (no overrides)
              const effectiveSize = widget.size;
              const sizeConfig = getSizeConfig(effectiveSize);
              
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
              if (widget.type === WIDGET_TYPES.ANALYTICS) {
                if (sizeConfig.h === 1) {
                  minHeight = '260px';
                  maxHeight = '360px';
                } else if (sizeConfig.h === 2) {
                  minHeight = '384px';
                  maxHeight = '520px';
                }
              }
              
              return (
                  <DashboardWidget
                    key={`${widget.id}-${widget.position?.x}-${widget.position?.y}-${widget.enabled}`}
                    widget={widget}
                    theme={theme}
                    gridClassName={gridClasses}
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
                      incomingOrders={incomingOrders}
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
                      onNewOrder={openBlankNewOrder}
                      onAddBuy={() => { setEditingScheduledBuy(null); setShowAddBuyModal(true); }}
                      onOpenBuy={(buy) => { setEditingScheduledBuy({ ...buy, item: buy.item || buy.name || buy.peptideName }); setShowAddBuyModal(true); }}
                      wishlist={wishlist}
                      onAddWishlistItem={() => { setEditingWishlistItem(null); setShowAddWishlistModal(true); }}
                      onEditWishlistItem={(item) => { setEditingWishlistItem(item); setShowAddWishlistModal(true); }}
                      onWishlistAcquire={handleWishlistAcquire}
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
              );
            })}
            
            {/* ConversionWidget temporarily removed - will be re-added with proper IAP support */}

            {/* ── Quick-action cards: Water + Weight — always side by side ─── */}
            <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">

            {/* Water card */}
            <div
              className="col-span-1 rounded-2xl overflow-hidden relative cursor-pointer touch-manipulation"
              style={{ backgroundColor: theme.cardBackground, boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.28)' : '0 2px 12px rgba(0,0,0,0.07)', minHeight: 110 }}
              onClick={() => navigate('/app/insights?tab=hydration')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/insights?tab=hydration'); }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ zIndex: 0 }}>
                <div
                  className="absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out"
                  style={{ height: `${Math.max(waterPct * 100, 4)}%` }}
                >
                  <div className="absolute inset-x-0 -top-3 h-6 overflow-hidden">
                    <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="w-[200%] h-full animate-wave" style={{ opacity: 0.7 }}>
                      <path d="M0,6 C30,0 70,12 100,6 C130,0 170,12 200,6 L200,12 L0,12 Z" fill={WATER_CARD_BLUE} />
                    </svg>
                  </div>
                  <div className="absolute inset-0" style={{ backgroundColor: WATER_CARD_BLUE, opacity: 0.18 }} />
                </div>
              </div>
              <div className="relative z-10 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>Water</span>
                    <Droplets size={13} strokeWidth={2.2} style={{ color: WATER_CARD_BLUE }} aria-hidden />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {hydrationStreakN > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '22', color: theme.primary }}>
                        <Flame size={10} />{hydrationStreakN}d
                      </span>
                    )}
                    <span className="text-[10px] font-semibold" style={{ color: WATER_CARD_BLUE }}>{Math.round(waterPct * 100)}%</span>
                  </div>
                </div>
                <p className="text-xl font-bold leading-tight" style={{ color: theme.text }}>
                  {todayWaterAmt}
                  <span className="text-[10px] font-normal ml-1" style={{ color: theme.textLight }}>/ {todayWater.goal || hydrationPrefs.dailyGoal} {hydrationPrefs.unit}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addWater(-hydrationPrefs.cupSize); }}
                    disabled={todayWaterAmt <= 0}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold touch-manipulation active:scale-90 transition-transform disabled:opacity-30"
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: theme.text }}
                  >−</button>
                  <span className="flex-1 text-center text-[10px]" style={{ color: theme.textLight }}>+{hydrationPrefs.cupSize} {hydrationPrefs.unit}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addWater(hydrationPrefs.cupSize); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold touch-manipulation active:scale-90 transition-transform"
                    style={{ backgroundColor: `${WATER_CARD_BLUE}28`, color: WATER_CARD_BLUE }}
                  >+</button>
                </div>
              </div>
            </div>

            {/* Weight card — number entry + Save (no +/- nudging) */}
            {(() => {
              const unit = lastWeight?.unit || 'lbs';
              const lastValStr = lastWeight?.value != null && lastWeight.value !== '' ? String(lastWeight.value) : '';
              const parsed = parseFloat(weightInput);
              const hasValidInput = weightInput !== '' && !Number.isNaN(parsed) && parsed > 0;
              const isDirty = hasValidInput && weightInput !== lastValStr;
              return (
                <div
                  className="col-span-1 rounded-2xl overflow-hidden relative"
                  style={{ backgroundColor: theme.cardBackground, boxShadow: theme.isDark ? '0 2px 12px rgba(0,0,0,0.28)' : '0 2px 12px rgba(0,0,0,0.07)', minHeight: 110 }}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>Weight</span>
                        <Scale size={13} strokeWidth={2.2} style={{ color: theme.primary }} aria-hidden />
                      </div>
                      {lastWeight?.date && !isDirty && (
                        <span className="text-[10px]" style={{ color: theme.textLight }}>
                          {new Date(lastWeight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseFloat(weightInput);
                            if (!val || val <= 0) return;
                            setMetrics(prev => [{ id: `weight-${Date.now()}`, type: 'weight', label: 'Weight', value: val, weight: val, unit, date: new Date().toISOString(), createdAt: new Date().toISOString() }, ...(prev || [])]);
                            setWeightInput('');
                            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `✓ ${val} ${unit} logged`, type: 'success' } }));
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full touch-manipulation"
                          style={{ backgroundColor: theme.primary, color: '#fff' }}
                        >Save</button>
                      )}
                    </div>
                    <div
                      className="rounded-xl px-2.5 py-2 flex items-baseline gap-1.5 border"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : `${theme.primary}10`,
                        borderColor: `${theme.primary}38`,
                        boxShadow: theme.isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : `inset 0 1px 2px ${theme.primary}14`,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        aria-label="Weight entry"
                        placeholder={lastValStr || '—'}
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-xl font-bold tabular-nums outline-none w-full"
                        style={{ color: theme.text }}
                      />
                      <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: theme.primary, opacity: 0.85 }}>{unit}</span>
                    </div>
                    <p className="text-[10px] mt-1.5 leading-snug" style={{ color: theme.textLight }}>
                      {lastWeight ? `Last: ${lastWeight.value} ${unit}` : 'Type weight, then Save'}
                    </p>
                  </div>
                </div>
              );
            })()}

            </div>{/* end water+weight row */}

            <div className="col-span-1 sm:col-span-2 w-full">
              <DashboardBioCheckIn
                theme={theme}
                metrics={metrics}
                onCommit={commitMetricsUpdate}
                isReadOnly={isReadOnly}
              />
            </div>

          </div>
        </div>

        {/* Hidden Widgets Section - Only shown in customizing mode */}
        {isCustomizing && hiddenWidgets.length > 0 && (
          <div className="mt-4 mx-3 sm:mx-5 md:mx-6 lg:mx-8 p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px dashed ${theme.border}` }}>
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
                        incomingOrders={incomingOrders}
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
                        onNewOrder={openBlankNewOrder}
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
                        onWishlistAcquire={handleWishlistAcquire}
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
          <div className="text-center py-12 px-3 sm:px-5 md:px-6 lg:px-8">
            <p className="text-lg mb-4" style={{ color: theme.textLight }}>
              No widgets enabled. 
            </p>
            <button
              onClick={() => setShowCustomizer(true)}
              className="px-6 py-3 rounded-lg font-semibold action-button-hover btn-primary-inset"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary
              }}
            >
              Add Widgets
            </button>
          </div>
        )}

      {/* Modals */}
      <DashboardCustomizer
        widgets={widgets}
        onUpdateWidgets={handleUpdateWidgets}
        theme={theme}
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />

      {/* Action Items Sheet — opened from Topbar ClipboardList icon */}
      <BottomSheet
        open={showActionItemsSheet}
        onClose={() => setShowActionItemsSheet(false)}
        title={
          <span className="flex items-center gap-2">
            To-Do
            <ListChecks size={18} style={{ color: theme.primary, opacity: 0.75 }} />
          </span>
        }
        titleExtra={<ExpandableTooltip content={WIDGET_TOOLTIPS.dont_forget} theme={theme} />}
        theme={theme}
      >
        <DontForgetWidget
          widget={{ id: 'dont_forget', type: 'dont_forget' }}
          theme={theme}
          vendors={vendors}
          stockpile={stockpile}
          onCompleteVendor={(vendor) => { setShowActionItemsSheet(false); setEditingVendor(vendor); setShowNewVendor(true); }}
          onViewAllVendors={() => { setShowActionItemsSheet(false); navigate('/app/vendors'); }}
          onOpenFollowUp={(protocolId, historyId) => { setShowActionItemsSheet(false); setToDoFollowUp({ protocolId, historyId }); }}
          onEditStockpileItem={(item) => { setShowActionItemsSheet(false); setToDoStockpileItem(item); }}
          onClose={() => setShowActionItemsSheet(false)}
          isReadOnly={isReadOnly}
          onUpgrade={() => setShowUpgradeModal(true)}
          hideHeader
        />
      </BottomSheet>

      {/* To-Do: Follow-up assessment — opens inline without page navigation */}
      {toDoFollowUp && (() => {
        const protocol = (protocols || []).find(p => p.id === toDoFollowUp.protocolId);
        if (!protocol) return null;
        return (
          <ProtocolFollowUpModal
            open={!!toDoFollowUp}
            onClose={() => setToDoFollowUp(null)}
            protocol={protocol}
            historyEntryId={toDoFollowUp.historyId}
            theme={theme}
          />
        );
      })()}

      {/* To-Do: Complete incomplete stockpile entry — pre-filled edit form */}
      <AddToStockpileBottomSheet
        open={!!toDoStockpileItem}
        onClose={() => setToDoStockpileItem(null)}
        theme={theme}
        editItem={toDoStockpileItem}
        onUpgrade={() => setShowUpgradeModal(true)}
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
        onClose={() => {
          setShowStockpileAdd(false);
          setWishlistStockpilePrefill(null);
        }}
        theme={theme}
        wishlistPrefill={wishlistStockpilePrefill}
      />

      <OrderDetailsModal
        key={`new-order-${newOrderModalKey}`}
        open={!!showNewOrder}
        onClose={() => {
          setShowNewOrder(false);
          setNewOrderDraftFromWishlist(null);
        }}
        order={newOrderDraftFromWishlist}
        theme={theme}
        vendors={vendors}
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
          setNewOrderDraftFromWishlist(null);
        }}
        onDelete={() => {
          setShowNewOrder(false);
          setNewOrderDraftFromWishlist(null);
        }}
      />

      <GoalModal
        open={showGoal}
        onClose={() => { setShowGoal(false); setEditingGoal(null); }}
        theme={theme}
        goal={editingGoal}
        onSave={(goal) => {
          if (editingGoal) {
            const updated = prepareItemForSave({ ...editingGoal, ...goal });
            setGoals(prev => prev.map(g => g.id === editingGoal.id ? updated : g));
          } else {
            const newGoal = prepareItemForSave(goal, { isNew: true });
            setGoals(prev => [...prev, newGoal]);
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
          const isEdit = buy.id && true;
          const newBuy = prepareItemForSave({
            ...buy,
            name: buy.item || buy.name,
            peptideName: buy.item || buy.peptideName,
          }, { isNew: !isEdit });
          
          setScheduledBuys(prev => {
            const exists = buy.id && prev.some(b => b.id === buy.id);
            let updated;
            if (exists) {
              updated = prev.map(b => b.id === buy.id ? prepareItemForSave({ ...b, ...newBuy }) : b);
            } else {
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

      {/* ── FAB Speed Dial ───────────────────────────────────────────────── */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-[9990]"
          style={{ background: theme.isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)' }}
          onClick={beginFabClose}
        />
      )}
      <div
        className="fixed z-[9991] flex flex-col items-end gap-3"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)',
          right: '1rem',
        }}
      >
        {/* Satellite actions */}
        {fabOpen && (() => {
          const actions = [
            {
              label: 'Start Protocol',
              Icon: Syringe,
              bg: theme.primary,
              iconColor: '#fff',
              onClick: () => { beginFabClose(); setShowQuickStartProtocol(true); },
            },
            {
              label: 'Log Metric',
              Icon: TrendingUp,
              bg: theme.cardBackground,
              iconColor: theme.primary,
              onClick: () => { beginFabClose(); setShowMetrics(true); },
            },
            {
              label: 'New Order',
              Icon: ShoppingCart,
              bg: theme.cardBackground,
              iconColor: theme.primary,
              onClick: () => { beginFabClose(); openBlankNewOrder(); },
            },
            {
              label: 'Add Stockpile',
              Icon: Package,
              bg: theme.cardBackground,
              iconColor: theme.primary,
              onClick: () => { beginFabClose(); setShowStockpileAdd(true); },
            },
          ];
          return actions.map((action, i) => {
            const delay = `${(actions.length - 1 - i) * 40}ms`;
            return (
              <div
                key={action.label}
                className="flex items-center gap-2.5"
                style={{ animation: `fab-dial-in 0.22s ease-out ${delay} both` }}
              >
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {action.label}
                </span>
                <button
                  type="button"
                  onClick={action.onClick}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 touch-manipulation active:scale-90 transition-transform"
                  style={{
                    backgroundColor: action.bg,
                    boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.12)',
                  }}
                >
                  <action.Icon size={18} strokeWidth={2} color={action.iconColor} />
                </button>
              </div>
            );
          });
        })()}

        {/* Main + / X FAB */}
        <button
          type="button"
          onClick={() => fabOpen ? beginFabClose() : setFabOpen(true)}
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 touch-manipulation transition-all duration-300 ease-out"
          style={{
            backgroundColor: theme.primary,
            color: '#fff',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.18), inset 0 -1px 2px rgba(255,255,255,0.12), 0 4px 16px rgba(0,0,0,0.22)',
          }}
          aria-label={fabOpen ? 'Close quick actions' : 'Quick actions'}
        >
          <span
            className="absolute transition-all duration-300 ease-out"
            style={{ opacity: fabOpen ? 0 : 1, transform: fabOpen ? 'rotate(90deg) scale(0.6)' : 'rotate(0deg) scale(1)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
          <span
            className="absolute transition-all duration-300 ease-out"
            style={{ opacity: fabOpen ? 1 : 0, transform: fabOpen ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.6)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </button>
      </div>
    </>
  );
}
