import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Settings, Edit } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useBadgeStats } from '../utils/badges';
import ViewContainer from '../components/ui/ViewContainer';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import DashboardCustomizer from '../components/dashboard/DashboardCustomizer';
import WidgetFactory from '../components/dashboard/WidgetFactory';
import { ToastContainer } from '../components/ui/Toast';
import useLocalStorage from '../utils/hooks';
import { 
  loadDashboardLayout, 
  saveDashboardLayout, 
  validateWidgetPosition,
  findEmptyPosition,
  resetDashboardLayout,
  getSizeConfig,
  WIDGET_TYPES
} from '../utils/dashboardCustomization';
import { fixDataInconsistencies, diagnoseDashboardData } from '../utils/dataCleanup';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCalendarDone } from '../utils/taskCompletion';
import { toKey } from '../components/calendar/MonthGrid';

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
import ResearchStatusWidget from '../components/dashboard/ResearchStatusWidget';

export default function CustomizableDashboard() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
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
    subscription
  } = useAppContext();

  // Dashboard customization state
  const [widgets, setWidgets] = useState(() => {
    // For now, always load fresh defaults to show new widgets
    // TODO: Remove this and use loadDashboardLayout() after testing
    return resetDashboardLayout();
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Dashboard data state
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [toasts, setToasts] = useState([]);
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

  const [vendorNames] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('tpprover_vendors') || '[]');
    } catch { 
      return []; 
    }
  });

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

  // Load upcoming buys
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tpprover_scheduled_buys');
      if (raw) {
        const buys = JSON.parse(raw);
        const now = new Date();
        const upcoming = buys.filter(b => 
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
          notes: b.notes
        })));
      }
    } catch (error) {
      console.error('Error loading upcoming buys:', error);
    }

    // Debug functions are now loaded globally via App.jsx -> debugUtils.js
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

    window.addEventListener('tpp:openRecon', handleOpenRecon);
    window.addEventListener('tpp:openOrder', handleOpenOrder);
    window.addEventListener('tpp:openVendor', handleOpenVendor);
    window.addEventListener('tpp:openProtocol', handleOpenProtocol);

    return () => {
      window.removeEventListener('tpp:openRecon', handleOpenRecon);
      window.removeEventListener('tpp:openOrder', handleOpenOrder);
      window.removeEventListener('tpp:openVendor', handleOpenVendor);
      window.removeEventListener('tpp:openProtocol', handleOpenProtocol);
    };
  }, []);

  // Generate today's tasks from supplements and protocols
  useEffect(() => {
    const tasks = [];
    const today = new Date();
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
      if (protocol.active === false) return;
      
      const startDate = protocol.startDate ? new Date(protocol.startDate) : null;
      const endDate = protocol.endDate ? new Date(protocol.endDate) : null;
      
      // Check if protocol is active today
      if (startDate && today < startDate) return;
      if (endDate && today > endDate) return;
      
      const peptides = Array.isArray(protocol.peptides) ? protocol.peptides : [];
      
      peptides.forEach((peptide, peptideIndex) => {
        const frequency = peptide.frequency || {};
        const times = Array.isArray(frequency.time) ? frequency.time : ['AM'];
        
        times.forEach(time => {
          const task = {
            id: `protocol_${protocol.id}_${peptideIndex}_${time}`,
            name: peptide.name || 'Unknown Peptide',
            dose: peptide.dosage?.amount || '',
            unit: peptide.dosage?.unit || 'mcg',
            time: time,
            type: 'peptide',
            protocolId: protocol.id,
            protocolName: protocol.protocolName,
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

    setTodaysTasks(tasks);
  }, [supplements, protocols, calendarBump]);

  // Save layout when widgets change
  useEffect(() => {
    saveDashboardLayout(widgets);
  }, [widgets]);

  // Toast utility
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Widget management functions
  const handleUpdateWidgets = (newWidgets) => {
    setWidgets(newWidgets);
  };

  const handleRemoveWidget = (widgetId) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleMoveWidget = (draggedWidgetId, targetWidgetId) => {
    console.log('🔥 handleMoveWidget called:', { draggedWidgetId, targetWidgetId });
    
    // If it's the old position-based system, handle it differently
    if (typeof targetWidgetId === 'object') {
      console.log('📍 Position-based move (old system)');
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
    console.log('🔄 Starting widget reorder...');
    setWidgets(prev => {
      console.log('📦 Current widgets before move:', prev.map(w => ({ id: w.id, type: w.type })));
      
      const draggedIndex = prev.findIndex(w => w.id === draggedWidgetId);
      const targetIndex = prev.findIndex(w => w.id === targetWidgetId);
      
      console.log('📍 Indices:', { draggedIndex, targetIndex });
      
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        console.log('❌ Move cancelled:', { draggedIndex, targetIndex, same: draggedIndex === targetIndex });
        return prev;
      }
      
      // Create a new array and move the dragged widget to the target position
      const newWidgets = [...prev];
      const [draggedWidget] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedWidget);
      
      console.log('✅ New widgets after move:', newWidgets.map(w => ({ id: w.id, type: w.type })));
      
      // Save the new layout
      saveDashboardLayout(newWidgets);
      console.log('💾 Layout saved');
      
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
    const dateKey = toKey(date);
    const taskId = task.stableTaskId || generateTaskId(task);
    const currentlyCompleted = isTaskCompleted(taskId, dateKey, task.time);
    const newCompletedState = !currentlyCompleted;
    
    console.log('🔄 Dashboard: Toggling task', {
      taskName: task.name,
      taskId,
      dateKey,
      newCompletedState
    });
    
    // Toggle in the unified system (this will dispatch the global event)
    toggleTaskCompletion(taskId, newCompletedState, dateKey, task.time);
    
    // Update local state to reflect the change immediately
    setTodaysTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, completed: newCompletedState } : t
    ));
  };

  // Listen for task completion changes from other views
  useEffect(() => {
    const handleTaskCompletionChange = (event) => {
      const { taskId, completed, date, timeSlot } = event.detail;
      console.log('📡 Dashboard: Received task completion change', { taskId, completed, date, timeSlot });
      
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
  const enabledWidgets = widgets.filter(w => w.enabled);

  return (
    <ViewContainer theme={theme}>
      <div className="space-y-6">
        {/* Header with buttons */}
        <div className="flex items-center justify-end mb-6 gap-2">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              isCustomizing ? 'ring-2 ring-opacity-50' : ''
            }`}
            style={{
              backgroundColor: isCustomizing ? theme.primary : theme.primaryDark,
              color: theme.textOnPrimary,
              ringColor: isCustomizing ? theme.primary : 'transparent'
            }}
          >
            <Edit size={14} className="inline mr-1" />
            {isCustomizing ? 'Done Editing' : 'Customize'}
          </button>
          
          <button
            onClick={() => setShowCustomizer(true)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: theme.primaryDark,
              color: theme.textOnPrimary
            }}
          >
            <Settings size={14} className="inline mr-1" />
            Settings
          </button>
        </div>

        {/* Dashboard Layout - Flexible Grid */}
        <div>
          <div className="dashboard-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-min">
            {enabledWidgets.map((widget, index) => {
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
                  minHeight = '240px';
                  maxHeight = '320px';
                  break;
                case 2:
                  minHeight = '400px';
                  maxHeight = '500px';
                  break;
                default:
                  minHeight = '240px';
                  maxHeight = '320px';
              }
              
              // Special case: hide widgets that should be conditionally shown
              if (widget.type === 'pending_vendors' && (!pendingVendors || pendingVendors.length === 0)) {
                return null;
              }

              return (
                <div key={`${widget.id}-${index}`} className={gridClasses}>
                  <DashboardWidget
                    widget={widget}
                    theme={theme}
                    isCustomizing={isCustomizing}
                    onRemove={handleRemoveWidget}
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
                      onTaskToggle={handleTaskToggle}
                      onNewOrder={() => setShowNewOrder(true)}
                      onAddBuy={() => setShowAddBuyModal(true)}
                      onViewAllVendors={() => navigate('/vendors')}
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
            
            {/* UNMOVEABLE SYSTEM WIDGETS - Always shown at the end */}
            <div className="col-span-full space-y-4">
              <ResearchStatusWidget theme={theme} subscription={subscription} />
              <ConversionWidget theme={theme} subscription={subscription} />
            </div>
          </div>
        </div>

        {enabledWidgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg mb-4" style={{ color: theme.textLight }}>
              No widgets enabled. 
            </p>
            <button
              onClick={() => setShowCustomizer(true)}
              className="px-6 py-3 rounded-lg font-semibold transition-colors"
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
        onSave={(v) => {
          setVendors(prev => {
            const existing = prev.find(p => p.id === v.id);
            if (existing) {
              return prev.map(p => p.id === v.id ? v : p);
            }
            return [...prev, { ...v, id: Date.now() }];
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
        onSave={(o) => {
          const category = o.category || 'domestic';
          const newOrder = { ...o, id: o.id || Date.now(), category, type: category };
          setOrders(prev => [newOrder, ...prev]);
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
          setScheduledBuys(prev => [...prev, { ...buy, id: Date.now() }]);
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
            updateSupplement(editingSupplement.id, supplement);
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
        onSave={(protocol) => {
          setProtocols(prev => [...prev, { ...protocol, id: Date.now() }]);
          setShowNewProtocol(false);
          addToast('Protocol created', 'success');
        }}
      />

      <ToastContainer 
        toasts={toasts} 
        removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} 
      />
    </ViewContainer>
  );
}
