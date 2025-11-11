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
import { areAnalyticsEnabled, areGroupBuysEnabled } from '../utils/featureSettings';
import { isInjectionSiteTrackingEnabled } from '../utils/injectionSiteSettings';

// Import modals that might be needed
import ReconCalculatorModal from '../components/recon/ReconCalculatorModal';
import OCRImportModal from '../components/import/OCRImportModal';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal';
import VendorDetailsModal from '../components/vendors/VendorDetailsModal';
import GoalModal from '../components/research/GoalModal';
import BodyMetricsModal from '../components/research/BodyMetricsModal';
import SupplementEditorModal from '../components/dashboard/SupplementEditorModal';
import BadgesModal from '../components/badges/BadgesModal';
import AddScheduledBuyModal from '../components/orders/AddScheduledBuyModal';
import ConversionWidget from '../components/dashboard/ConversionWidget';
import UpgradeModal from '../components/common/UpgradeModal';
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers';

export default function CustomizableDashboard() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const { isReadOnly } = useSubscriptionAccess();
  const { 
    scheduledBuys,
    setScheduledBuys, 
    orders, 
    setOrders, 
    vendors, 
    setVendors, 
    protocols,
    setProtocols, 
    supplements, 
    addSupplement, 
    updateSupplement, 
    deleteSupplement,
    subscription,
    reconItems
  } = useAppContext();

  // Dashboard customization state
  const [widgets, setWidgets] = useState(() => {
    // For now, always load fresh defaults to show new widgets
    // TODO: Remove this and use loadDashboardLayout() after testing
    return resetDashboardLayout();
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
  const [metrics, setMetrics] = useLocalStorage('tpprover_metrics', []);
  const [calendarBump, setCalendarBump] = useState(0);

  // Modal states
  const [showRecon, setShowRecon] = useState(false);
  const [reconPrefill, setReconPrefill] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [showAddSupplement, setShowAddSupplement] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [showBadges, setShowBadges] = useState(false);
  const [showAddBuyModal, setShowAddBuyModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
      peptide: latest.items?.[0]?.name || 'Unknown Item',
      mg: latest.items?.[0]?.mg || 'N/A',
      vendor: latest.vendorName || latest.vendor || 'Unknown Vendor',
      status: latest.status || 'Order Placed',
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
          const now = new Date();
          const upcoming = filteredBuys.filter(b => 
            new Date(b.openDate) >= now || 
            (new Date(b.closeDate) >= now && new Date(b.openDate) <= now)
          );
          setScheduledBuys(upcoming.map(b => ({
            id: b.id,
            name: b.item,
            date: b.openDate,
            openDate: b.openDate,
            closeDate: b.closeDate,
            vendor: b.vendor,
            notes: b.notes,
            isMock: b.isMock // Preserve isMock flag for filtering
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
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setScheduledBuys]);

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
          const now = new Date();
          const upcoming = filteredBuys.filter(b => 
            new Date(b.openDate) >= now || 
            (new Date(b.closeDate) >= now && new Date(b.openDate) <= now)
          );
          setScheduledBuys(upcoming.map(b => ({
            id: b.id,
            name: b.item,
            date: b.openDate,
            openDate: b.openDate,
            closeDate: b.closeDate,
            vendor: b.vendor,
            notes: b.notes,
            isMock: b.isMock
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
  useEffect(() => {

    const tasks = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = today.toISOString().split('T')[0];
    
    // Add supplement tasks
    supplements.forEach(supplement => {
      const schedule = Array.isArray(supplement.schedule) ? supplement.schedule : [];
      schedule.forEach(time => {
        const task = {
          id: `supplement_${supplement.id}_${time}`,
          name: supplement.name,
          dose: supplement.dose,
          unit: supplement.unit || '',
          time: time,
          type: 'supplement',
          delivery: supplement.delivery,
          completed: false
        };
        
        // Generate stable task ID and check completion status
        const taskId = generateTaskId(task);
        task.stableTaskId = taskId;
        task.completed = isTaskCompleted(taskId);
        
        tasks.push(task);
      });
    });

    // Add protocol/peptide tasks
    protocols.forEach(protocol => {
      if (!protocol) return;
      
      // Normalize active state from various sources/legacy values
      const lifecycleStatus = String(protocol?.lifecycle?.status || protocol?.status || '').toLowerCase();
      const activeFlag = protocol?.active;
      const isActive = activeFlag === true ||
        activeFlag === 'true' ||
        activeFlag === 1 ||
        lifecycleStatus === 'active' ||
        lifecycleStatus === 'running';

      if (!isActive) return;
      
      // Check for autosaved draft data
      let protocolData = protocol;
      try {
        const draftKey = `tpprover_protocol_draft_${protocol.id}`;
        const draftData = localStorage.getItem(draftKey);
        if (draftData) {
          const parsed = JSON.parse(draftData);
          if (parsed.data && Object.keys(parsed.data).length > 0) {

            protocolData = { ...protocol, ...parsed.data };
          }
        }
      } catch (e) {
        console.warn('Failed to load autosaved data for protocol:', protocol.id);
      }
      
      let startDate = null;
      if (protocolData.startDate) {
        const parsed = new Date(`${protocolData.startDate}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          startDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
      }

      let endDate = null;
      if (protocolData.endDate) {
        const parsed = new Date(`${protocolData.endDate}T23:59:59`);
        if (!Number.isNaN(parsed.getTime())) {
          endDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
      }
      
      // Check if protocol is active today
      if (startDate && today < startDate) return;
      if (endDate && today > endDate) return;
      
      const peptides = Array.isArray(protocolData.peptides) ? protocolData.peptides : [];
      
      // Find matching recon item for this protocol (optional - for users who use recon calculator)
      // Try multiple matching strategies
      const reconItem = reconItems.find(r => {
        if (!r.name) return false;
        return r.name === protocolData.protocolName || 
               r.name.startsWith(protocolData.protocolName) ||
               protocolData.protocolName.includes(r.name);
      });
      
      peptides.forEach((peptide, peptideIndex) => {
        const frequency = peptide.frequency || {};
        const times = Array.isArray(frequency.time) ? frequency.time : ['AM'];
        
        times.forEach(time => {
          // Extract dose and unit properly - handle both simple and complex displays
          let dose = peptide.dosage?.amount || '';
          let unit = peptide.dosage?.unit || 'mcg';
          const unitValue = peptide.unitValue || '';
          
          // Build the complete dose display
          if (dose && unit) {
            if (unitValue) {
              // Complex display: "2 mg | 20 units" - store complete string in dose, clear unit
              dose = `${dose} ${unit} | ${unitValue} units`;
              unit = ''; // Clear unit since it's included in dose
            } else {
              // Simple display: "2 mg" - store complete string in dose, clear unit
              dose = `${dose} ${unit}`;
              unit = ''; // Clear unit since it's included in dose
            }
          }
          
          // Get delivery method and pen color from either recon item OR protocol data
          // Priority: recon item (if user used recon calculator) > protocol data (manual entry)
          const deliveryMethod = reconItem?.deliveryMethod || peptide.deliveryMethod;
          const penColor = reconItem?.penColor || peptide.penColor;
          const penType = reconItem?.penType || peptide.penType;
          const administrationRoute = reconItem?.administrationRoute || peptide.injectionType;
          
          const task = {
            id: `protocol_${protocolData.id}_${peptideIndex}_${time}`,
            name: peptide.name || 'Unknown Peptide',
            dose: dose,
            unit: unit,
            time: time,
            type: 'peptide',
            protocolId: protocolData.id,
            protocolName: protocolData.protocolName,
            deliveryMethod: deliveryMethod,
            penColor: penColor,
            penType: penType,
            administrationRoute: administrationRoute,
            completed: false
          };

          // Generate stable task ID and check completion status
          const taskId = generateTaskId(task);
          task.stableTaskId = taskId;
          task.completed = isTaskCompleted(taskId);
          
          tasks.push(task);
        });
      });
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
  }, [supplements, protocols, calendarBump]);

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

  const handleTaskToggle = (task, date = new Date()) => {
    
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
    
    // Update local state to reflect the change immediately (for visual feedback)
    setTodaysTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, completed: newCompletedState } : t
    ));
    
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

  // Listen for task completion changes from other views
  useEffect(() => {
    const handleTaskCompletionChange = (event) => {
      const { taskId, completed, date, timeSlot } = event.detail;
      
      // Only refresh if this event came from another view (not from this Dashboard)
      // We can detect this by checking if the task is in our current todaysTasks
      const isFromThisView = todaysTasks.some(task => {
        const taskIdFromTask = task.stableTaskId || generateTaskId(task);
        return taskIdFromTask === taskId;
      });
      
      if (!isFromThisView) {
        // Refresh today's tasks to reflect changes from other views
        // This will trigger the useEffect that generates todaysTasks
        setCalendarBump(Date.now());
      }
    };

    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    return () => window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
  }, [todaysTasks]);

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
    <ViewContainer theme={theme}>
      <div className="space-y-2 overflow-x-hidden w-full max-w-full relative">
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
        <div className="overflow-x-hidden">
          <div className="dashboard-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-min w-full max-w-full p-1">
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
              
              // Special case: hide widgets that should be conditionally shown
              if (widget.type === 'pending_vendors' && (!pendingVendors || pendingVendors.length === 0)) {
                return null;
              }

              return (
                <div key={`${widget.id}-${widget.position?.x}-${widget.position?.y}-${widget.enabled}`} className={`${gridClasses} w-full max-w-full flex`}>
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
                      goals={goals}
                      metrics={metrics}
                      supplements={supplements}
                      isReadOnly={isReadOnly}
                      onUpgrade={() => setShowUpgradeModal(true)}
                      onTaskToggle={handleTaskToggle}
                      onNewOrder={() => setShowNewOrder(true)}
                      onAddBuy={() => setShowAddBuyModal(true)}
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
                  <div key={widget.id} className={`${gridClasses} w-full max-w-full flex`}>
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
                        upcomingBuys={scheduledBuys}
                        pendingVendors={pendingVendors}
                        goals={goals}
                        metrics={metrics}
                        supplements={supplements}
                        isReadOnly={isReadOnly}
                        onUpgrade={() => setShowUpgradeModal(true)}
                        onTaskToggle={handleTaskToggle}
                        onNewOrder={() => setShowNewOrder(true)}
                        onAddBuy={() => setShowAddBuyModal(true)}
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
          const savedVendor = { ...v, isStub: false, needsCompletion: false };
          setVendors(prev => {
            const existing = prev.find(p => p.id === savedVendor.id);
            if (existing) {
              return prev.map(p => p.id === savedVendor.id ? savedVendor : p);
            }
            return [...prev, { ...savedVendor, id: Date.now() }];
          });
          setEditingVendor(null);
          setShowNewVendor(false);
        }}
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
              id: o.id || Date.now(), 
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
              return [...prev, { id: Date.now(), name: o.vendor }];
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
            setGoals(prev => [...prev, { ...goal, id: Date.now() }]);
          }
          setShowGoal(false);
          setEditingGoal(null);
        }}
      />

      <BodyMetricsModal
        open={showMetrics}
        onClose={() => { setShowMetrics(false); setEditingMetric(null); }}
        theme={theme}
        metric={editingMetric}
        onSave={(metric) => {
          if (editingMetric) {
            setMetrics(prev => prev.map(m => m.id === editingMetric.id ? { ...editingMetric, ...metric } : m));
          } else {
            setMetrics(prev => [...prev, { ...metric, id: Date.now() }]);
          }
          setShowMetrics(false);
          setEditingMetric(null);
        }}
      />

      <AddScheduledBuyModal
        open={showAddBuyModal}
        onClose={() => setShowAddBuyModal(false)}
        theme={theme}
        onSave={(buy) => {
          const newBuy = { 
            ...buy, 
            id: Date.now(),
            name: buy.item, // Map item to name for display
            peptideName: buy.item // Also set peptideName for backward compatibility
          };
          setScheduledBuys(prev => [...prev, newBuy]);
          setShowAddBuyModal(false);
          addToast('Scheduled buy added', 'success');
        }}
      />

      <SupplementEditorModal
        open={showAddSupplement}
        onClose={() => { setShowAddSupplement(false); setEditingSupplement(null); }}
        theme={theme}
        supplement={editingSupplement}
        onSave={(supplement) => {
          if (editingSupplement) {
            updateSupplement(supplement);
          } else {
            addSupplement(supplement);
          }
          setShowAddSupplement(false);
          setEditingSupplement(null);
          addToast('Supplement saved', 'success');
        }}
      />

      <ProtocolEditorModal
        open={showNewProtocol}
        onClose={() => setShowNewProtocol(false)}
        theme={theme}
        isReadOnly={isReadOnly}
        onUpgrade={() => setShowUpgradeModal(true)}
        onSave={(protocol) => {
          setProtocols(prev => [...prev, { ...protocol, id: Date.now() }]);
          setShowNewProtocol(false);
          addToast('Protocol created', 'success');
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
