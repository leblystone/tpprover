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
  WIDGET_TYPES
} from '../utils/dashboardCustomization';

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

export default function CustomizableDashboard() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const { 
    setScheduledBuys, 
    orders, 
    setOrders, 
    vendors, 
    setVendors, 
    setProtocols, 
    supplements, 
    addSupplement, 
    updateSupplement, 
    deleteSupplement 
  } = useAppContext();

  // Dashboard customization state
  const [widgets, setWidgets] = useState(() => loadDashboardLayout());
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Dashboard data state
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [upcomingBuys, setUpcomingBuys] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [goals, setGoals] = useLocalStorage('tpprover_goals', []);
  const [metrics, setMetrics] = useLocalStorage('tpprover_metrics', []);

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
        setUpcomingBuys(upcoming.map(b => ({
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
  }, []);

  // Generate today's tasks from supplements and protocols
  useEffect(() => {
    const tasks = [];
    
    // Add supplement tasks
    supplements.forEach(supplement => {
      const schedule = Array.isArray(supplement.schedule) ? supplement.schedule : [];
      schedule.forEach(time => {
        tasks.push({
          id: `supplement_${supplement.id}_${time}`,
          name: supplement.name,
          dose: supplement.dose,
          unit: supplement.unit || '',
          time: time,
          type: 'supplement',
          delivery: supplement.delivery,
          completed: false
        });
      });
    });

    setTodaysTasks(tasks);
  }, [supplements]);

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

  const handleMoveWidget = (widgetId, newPosition) => {
    setWidgets(prev => prev.map(w => {
      if (w.id === widgetId) {
        const updatedWidget = { ...w, position: newPosition };
        if (validateWidgetPosition(updatedWidget, prev, widgetId)) {
          return updatedWidget;
        }
      }
      return w;
    }));
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

  // Task management
  const handleTaskToggle = (taskId) => {
    setTodaysTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Goal management
  const handleGoalToggle = (goalId) => {
    setGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, completed: !g.completed } : g
    ));
  };

  // Filter enabled widgets and sort by position
  const enabledWidgets = widgets
    .filter(w => w.enabled)
    .sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    });

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-min">
            {enabledWidgets.map(widget => {
              // Determine widget size based on type and content
              let gridClasses = '';
              let minHeight = '';
              
              switch (widget.type) {
                case 'tasks':
                  // Dynamic sizing based on task count
                  const taskCount = todaysTasks ? todaysTasks.length : 0;
                  if (taskCount === 0) {
                    gridClasses = 'col-span-2 sm:col-span-1 lg:col-span-2';
                    minHeight = '180px';
                  } else if (taskCount <= 3) {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '250px';
                  } else {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '350px';
                  }
                  break;
                case 'upcoming_order':
                  // Dynamic sizing based on whether there are active orders
                  if (incomingOrder) {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '350px';
                  } else {
                    gridClasses = 'col-span-2 sm:col-span-1 lg:col-span-2';
                    minHeight = '150px';
                  }
                  break;
                case 'goals_only':
                  // Dynamic sizing based on goal count
                  const goalCount = goals ? goals.length : 0;
                  if (goalCount === 0) {
                    gridClasses = 'col-span-2 sm:col-span-1 lg:col-span-2';
                    minHeight = '180px';
                  } else if (goalCount <= 2) {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '220px';
                  } else {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '300px';
                  }
                  break;
                case 'metrics_only':
                  // Dynamic sizing based on metrics count
                  const metricsCount = metrics ? metrics.length : 0;
                  if (metricsCount === 0) {
                    gridClasses = 'col-span-2 sm:col-span-1 lg:col-span-2';
                    minHeight = '180px';
                  } else if (metricsCount <= 2) {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '250px';
                  } else {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '320px';
                  }
                  break;
                case 'goals':
                  gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                  minHeight = '280px';
                  break;
                case 'upcoming_buys':
                  // Dynamic sizing based on whether there are upcoming buys
                  if (upcomingBuys && upcomingBuys.length > 0) {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '200px';
                  } else {
                    gridClasses = 'col-span-2 sm:col-span-1 lg:col-span-1';
                    minHeight = '140px';
                  }
                  break;
                case 'pending_vendors':
                  // Dynamic sizing based on whether there are pending vendors
                  if (pendingVendors && pendingVendors.length > 0) {
                    gridClasses = 'col-span-2 sm:col-span-2 lg:col-span-2';
                    minHeight = '180px';
                  } else {
                    // Don't show this widget if no pending vendors
                    return null;
                  }
                  break;
                case 'analytics':
                  gridClasses = 'col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-6';
                  minHeight = '400px';
                  break;
                case 'badges':
                  gridClasses = 'col-span-2 sm:col-span-3 lg:col-span-4';
                  minHeight = '120px';
                  break;
                default:
                  gridClasses = 'col-span-1';
                  minHeight = '200px';
              }

              return (
                <div key={widget.id} className={gridClasses}>
                  <DashboardWidget
                    widget={widget}
                    theme={theme}
                    isCustomizing={isCustomizing}
                    onRemove={handleRemoveWidget}
                    onSettings={handleWidgetSettings}
                    onResize={handleResizeWidget}
                    onMove={handleMoveWidget}
                    style={{ minHeight }}
                  >
                    <WidgetFactory
                      widget={widget}
                      theme={theme}
                      tasks={todaysTasks}
                      incomingOrder={incomingOrder}
                      upcomingBuys={upcomingBuys}
                      pendingVendors={pendingVendors}
                      goals={goals}
                      metrics={metrics}
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
                    />
                  </DashboardWidget>
                </div>
              );
            })}
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

      <ToastContainer 
        toasts={toasts} 
        removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} 
      />
    </ViewContainer>
  );
}
