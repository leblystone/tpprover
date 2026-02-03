import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Plus, ShoppingCart, Droplet, Edit, Trash2, Pill, TestTube, Info, Target, PlusCircle, Award, Check, CheckCircle, Clock, TrendingUp, TrendingDown, Bed, Smile, ShieldAlert, Beaker, Calendar, Pipette } from 'lucide-react'
import { Zap } from '../icons/lucide-safe'
import BadgeImage from '../components/badges/BadgeImage'
import { themes, defaultThemeName } from '../theme/themes'
import ViewContainer from '../components/ui/ViewContainer'
import TasksList from '../components/dashboard/TasksList'
import UpcomingOrderCard from '../components/dashboard/UpcomingOrderCard'
import ReconCalculatorModal from '../components/recon/ReconCalculatorModal'
import UpcomingBuys from '../components/dashboard/UpcomingBuys'
import PendingVendorsView from '../components/dashboard/PendingVendorsView'
import DontForgetWidget from '../components/dashboard/widgets/DontForgetWidget'
import OCRImportModal from '../components/import/OCRImportModal'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import { calculateRecon } from '../utils/recon'
import useLocalStorage from '../utils/hooks'
import { formatMMDDYYYY, parseDateString } from '../utils/date'
import { generateTaskId, toggleTaskCompletion, isTaskCompleted } from '../utils/taskCompletion'
import { calculateScheduledTasksForDate } from '../utils/calendarTasks'
import { debugTaskCompletion } from '../utils/taskPersistence'
import { toKey } from '../components/calendar/MonthGrid'
import GoalModal from '../components/research/GoalModal'
import BodyMetricsModal from '../components/research/BodyMetricsModal'
import SupplementEditorModal from '../components/dashboard/SupplementEditorModal'
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard'
import BadgesModal from '../components/badges/BadgesModal'
import AddScheduledBuyModal from '../components/orders/AddScheduledBuyModal'
import ResearchStatusWidget from '../components/dashboard/ResearchStatusWidget'
import ConversionWidget from '../components/dashboard/ConversionWidget'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'
import { useBadgeStats } from '../utils/badges'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import { handleCheckoutReturn } from '../utils/checkoutNavigation'
import UpgradeModal from '../components/common/UpgradeModal'
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers'
import { saveAppData } from '../services/cloudStorage'
import { recordDeletion } from '../utils/deletionTracking'
import { useFirebase } from '../context/FirebaseContext'

export default function Dashboard() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { protocols: protocolsFromContext } = useAppContext()
  const { totalBadges, earnedCount, progressPercentage } = useBadgeStats();
  const { setScheduledBuys, orders, setOrders, vendors, setVendors, setProtocols, supplements, addSupplement, updateSupplement, deleteSupplement, subscription, metrics, setMetrics, reconItems, reconHistory, calendarNotes, stockpile } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const { firebaseUser } = useFirebase();

  // Derive today's peptide tasks from active protocols
  const peptideLog = useMemo(() => {
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const out = {}
      // Minimal structure to keep downstream usage intact
      return out
    } catch { return {} }
  }, [])

  const incomingOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Get active orders (non-delivered) OR delivered orders within last 3 days
    const activeOrders = orders.filter(o => {
        const status = (o.status || '').toLowerCase();
        const isDelivered = status.includes('delivered');
        
        if (!isDelivered) {
            return true; // Include all non-delivered orders
        }
        
        // For delivered orders, only include if delivered within last 3 days
        if (o.deliveryDate) {
            const deliveryDate = new Date(o.deliveryDate);
            return deliveryDate >= threeDaysAgo;
        }
        
        // If no delivery date but status is delivered, check if order date is within 3 days
        if (o.date) {
            const orderDate = new Date(o.date);
            return orderDate >= threeDaysAgo;
        }
        
        return false;
    });
    
    if (activeOrders.length === 0) return [];
    
    // Sort by date to get the most recent first
    activeOrders.sort((a, b) => {
        const dateA = new Date(a.deliveryDate || a.date || 0);
        const dateB = new Date(b.deliveryDate || b.date || 0);
        return dateB - dateA;
    });
    
    // Map to widget format
    const mappedOrders = activeOrders.map(order => ({
        id: order.id,
        peptide: order.items?.[0]?.name || 'Unknown Item',
        mg: order.items?.[0]?.mg || 'N/A',
        vendor: order.vendorName || order.vendor || 'Unknown Vendor',
        status: order.status || 'Order Placed',
        shipDate: order.shipDate || order.date,
        deliveryDate: order.deliveryDate,
        date: order.date, // Order placed date
        tracking: order.tracking
    }));
    
    console.log('📦 Incoming orders found:', {
      totalOrders: orders.length,
      activeOrdersCount: activeOrders.length,
      mappedOrdersCount: mappedOrders.length,
      orders: mappedOrders.map(o => ({ id: o.id, peptide: o.peptide, status: o.status }))
    });
    
    // Ensure we always return an array
    return Array.isArray(mappedOrders) ? mappedOrders : [];
  }, [orders]);
  
  // Get first order for backward compatibility
  const incomingOrder = incomingOrders.length > 0 ? incomingOrders[0] : null;

  // Get actual pending vendors (auto-created with isStub: true)
  const pendingVendors = useMemo(() => {
    return vendors.filter(vendor => vendor.isStub === true);
  }, [vendors])

  // Use supplements from AppContext instead of local state
  // const [supplements, setSupplements] = useState([]);
  // useEffect(() => {
  //     try {
  //         const raw = localStorage.getItem('tpprover_supplements');
  //         if(raw) {
  //             setSupplements(JSON.parse(raw));
  //         }
  //     } catch {}
  // }, []);

  // Handle checkout return navigation
  useEffect(() => {
    handleCheckoutReturn(navigate, searchParams);
  }, [navigate, searchParams]);

  const [todaysTasks, setTodaysTasks] = useState([])
  const [washoutReminders, setWashoutReminders] = useState([])
  const [showRecon, setShowRecon] = useState(false)
  const [reconPrefill, setReconPrefill] = useState(null)
  const [upcomingBuys, setUpcomingBuys] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [showNewVendor, setShowNewVendor] = useState(false)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showNewProtocol, setShowNewProtocol] = useState(false)
  const [vendorNames, setVendorNames] = useState(() => { try { return JSON.parse(localStorage.getItem('tpprover_vendors')||'[]') } catch { return [] } })
  const [goals, setGoals] = useLocalStorage('tpprover_goals', [])
  const [metrics, setMetrics] = useLocalStorage('tpprover_metrics', [])
  const [showMetrics, setShowMetrics] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [showGoal, setShowGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [showAddSupplement, setShowAddSupplement] = useState(false)
  const [editingSupplement, setEditingSupplement] = useState(null)
  const [showBadges, setShowBadges] = useState(false)
  const [showAddBuyModal, setShowAddBuyModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);



  const formatSchedule = (item) => {
    const schedule = Array.isArray(item.schedule) ? item.schedule : [];
    const days = Array.isArray(item.days) ? item.days : [];

    if (schedule.length === 0) return 'Not set';

    let scheduleText = '';
    if (schedule.includes('AM') && schedule.includes('PM')) {
      scheduleText = 'AM/PM';
    } else if (schedule.length > 0) {
      scheduleText = schedule[0];
    }

    // If specific days are selected, show them
    if (days.length > 0 && days.length < 7) {
      return `${scheduleText} (${days.join(', ')})`;
    }
    // If no days selected (daily schedule), add "Daily"
    return `${scheduleText} Daily`;
  };

  const getDeliveryIcon = (delivery) => {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Pipette size={16} className="text-gray-500" />;
        case 'powder': return <Beaker size={16} className="text-gray-500" />;
        case 'pill':
        default: return <Pill size={16} className="text-gray-500" />;
    }
  };

  const formatDateRange = (supplement) => {
    if (!supplement.startDate && !supplement.endDate) return null;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const start = formatDate(supplement.startDate);
    const end = formatDate(supplement.endDate);

    if (start && end) {
      return `${start} - ${end}`;
    } else if (start) {
      return start;
    } else if (end) {
      return end;
    }
    return null;
  };

  const [calendarBump, setCalendarBump] = useState(0);

  useEffect(() => {
      const handleStorageChange = (e) => {
          if (e.key === 'tpprover_calendar_bump') {
              setCalendarBump(Date.now());
          }
      };
      
      const handleTaskCompletionChange = (e) => {
          setCalendarBump(Date.now());
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
      
      return () => {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
      };
  }, []);

  useEffect(() => {
    try {
        const raw = localStorage.getItem('tpprover_scheduled_buys');
        if (raw) {
            const buys = JSON.parse(raw);
            // Filter out mock scheduled buys if sample data was cleared
            const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
            const filteredBuys = sampleDataCleared 
              ? buys.filter(b => !b.isMock)
              : buys;
            const now = new Date();
            // Filter for buys that are still open or upcoming
            const upcoming = filteredBuys.filter(b => new Date(b.openDate) >= now || (new Date(b.closeDate) >= now && new Date(b.openDate) <= now));
            setUpcomingBuys(upcoming.map(b => ({
                id: b.id,
                item: b.item, // CRITICAL: Preserve the item field for display
                name: b.name || b.item, // Map for backward compatibility
                peptideName: b.peptideName || b.item, // Map for backward compatibility
                date: b.openDate, // Use openDate for display
                openDate: b.openDate,
                closeDate: b.closeDate,
                vendor: b.vendor,
                location: b.location,
                participants: b.participants,
                price: b.price,
                notes: b.notes,
                description: b.description,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            })));
        }
    } catch {}

    const handleStorageChange = (e) => {
        if (e.key === 'tpprover_orders_bump') {
             try {
                const raw = localStorage.getItem('tpprover_scheduled_buys');
                if (raw) {
                    const buys = JSON.parse(raw);
                    // Filter out mock scheduled buys if sample data was cleared
                    const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
                    const filteredBuys = sampleDataCleared 
                      ? buys.filter(b => !b.isMock)
                      : buys;
                    const now = new Date();
                    // Filter for buys that are still open or upcoming
                    const upcoming = filteredBuys.filter(b => new Date(b.openDate) >= now || (new Date(b.closeDate) >= now && new Date(b.openDate) <= now));
                    setUpcomingBuys(upcoming.map(b => ({
                        id: b.id,
                        item: b.item, // CRITICAL: Preserve the item field for display
                        name: b.name || b.item, // Map for backward compatibility
                        peptideName: b.peptideName || b.item, // Map for backward compatibility
                        date: b.openDate, // Use openDate for display
                        openDate: b.openDate,
                        closeDate: b.closeDate,
                        vendor: b.vendor,
                        location: b.location,
                        participants: b.participants,
                        price: b.price,
                        notes: b.notes,
                        description: b.description,
                        createdAt: b.createdAt,
                        updatedAt: b.updatedAt
                    })));
                }
            } catch {}
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    console.log('🔄 ===== DASHBOARD TASK GENERATION START =====');
    console.log('🔄 Dashboard useEffect running - generating tasks from Calendar logic');
    console.log('🔍 ===== DATE DEBUG START =====');
    console.log('⏰ Current time:', new Date().toLocaleString('en-US'));
    
    // CRITICAL: Use the EXACT same method Calendar uses to determine "today"
    // Calendar uses: toKey(new Date()) which extracts year/month/day from current date
    const now = new Date();
    console.log('📅 Raw new Date():', {
      iso: now.toISOString(),
      local: now.toLocaleString('en-US'),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hours: now.getHours(),
      timezoneOffset: now.getTimezoneOffset()
    });
    
    // CRITICAL: Use Calendar's EXACT date calculation method to ensure perfect sync
    // Calendar uses: toKey(new Date()) which extracts year/month/day from current date
    // We must use the exact same method to guarantee we're showing the same day
    const calendarRawDate = new Date();
    const finalToday = new Date(calendarRawDate.getFullYear(), calendarRawDate.getMonth(), calendarRawDate.getDate());
    finalToday.setHours(0, 0, 0, 0);
    
    console.log('📅 Dashboard: Date calculation for task generation', {
      rawDate: calendarRawDate.toISOString(),
      rawDateLocal: calendarRawDate.toLocaleString('en-US'),
      finalTodayISO: finalToday.toISOString(),
      finalTodayLocal: finalToday.toLocaleString('en-US'),
      finalTodayDateString: finalToday.toLocaleDateString('en-US'),
      finalTodayKey: toKey(finalToday),
      year: finalToday.getFullYear(),
      month: finalToday.getMonth() + 1,
      day: finalToday.getDate(),
      dayName: finalToday.toLocaleDateString('en-US', { weekday: 'long' }),
      timezoneOffset: calendarRawDate.getTimezoneOffset()
    });
    
    // CENTRALIZED: Use shared date utilities to ensure consistency
    // parseDateString is now imported from '../utils/date'

    // Use Calendar's shared logic to calculate today's scheduled tasks
    let peptideTasks = []
    let reminders = []
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const reconItems = JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]')
      
      console.log('📊 Dashboard: About to calculate tasks', {
        protocolCount: protocols.length,
        supplementCount: supplements.length,
        reconItemCount: reconItems.length,
        todayDate: today.toLocaleDateString('en-US'),
        todayKey: toKey(today)
      });
      
      // Get today's scheduled tasks using the same logic as Calendar
      // Use Calendar's exact date calculation to ensure perfect sync
      const scheduledData = calculateScheduledTasksForDate(finalToday, protocols, supplements, reconItems)
      
      // Get the date key for today to check completion status
      const todayKey = toKey(finalToday);
      
      console.log('📊 Dashboard: Received scheduled data', {
        timeSlots: Object.keys(scheduledData.bySlot || {}),
        totalPeptides: Object.values(scheduledData.bySlot || {}).reduce((sum, slot) => sum + (slot.peptides?.length || 0), 0),
        totalSupplements: Object.values(scheduledData.bySlot || {}).reduce((sum, slot) => sum + (slot.supplements?.length || 0), 0)
      });
      
      // Convert Calendar's scheduled data format to Dashboard task format
      // Process peptides from all time slots
      Object.keys(scheduledData.bySlot || {}).forEach(timeSlot => {
        const slot = scheduledData.bySlot[timeSlot];
        
        // Process peptides
        if (slot.peptides && Array.isArray(slot.peptides)) {
          slot.peptides.forEach(pep => {
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
              deliveryMethod: pep.deliveryMethod || pep.delivery || 'injection',
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
            peptideTasks.push(task);
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
            peptideTasks.push(task);
          });
        }
      })
      // Inject first-day Wash-Out reminders
      for (const p of protocols) {
        if (!p?.washout?.enabled || !p?.startDate) continue
        // compute end date from either endDate or duration
        let end = p.endDate ? parseDateString(p.endDate) : null
        if (!end && p.duration && p.duration.noEnd !== true && Number(p.duration.count) > 0) {
          end = parseDateString(p.startDate)
          const unit = String(p.duration.unit || 'week').toLowerCase()
          const count = Number(p.duration.count) || 0
          if (unit === 'day') end.setDate(end.getDate() + count - 1)
          else if (unit === 'week') end.setDate(end.getDate() + (count * 7) - 1)
          else if (unit === 'month') { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1) }
        }
        if (!end) continue
        const washStart = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
        let washEnd = null;
        const wUnit = String(p.washout.unit || 'week').toLowerCase()
        const wCount = Number(p.washout.count) || 0
        if (wCount > 0) {
          washEnd = new Date(washStart)
          if (wUnit === 'day') washEnd.setDate(washEnd.getDate() + wCount - 1)
          else if (wUnit === 'week') washEnd.setDate(washEnd.getDate() + (wCount * 7) - 1)
          else if (wUnit === 'month') { washEnd.setMonth(washEnd.getMonth() + wCount); washEnd.setDate(washEnd.getDate() - 1) }
        }

        if (washStart && washEnd) {
            const todayOnly = new Date(finalToday.getFullYear(), finalToday.getMonth(), finalToday.getDate());
            const washStartOnly = new Date(washStart.getFullYear(), washStart.getMonth(), washStart.getDate());
            const washEndOnly = new Date(washEnd.getFullYear(), washEnd.getMonth(), washEnd.getDate());

            if (todayOnly >= washStartOnly && todayOnly <= washEndOnly) {
                reminders.push({ id: `wash-${p.id}`, name: `Washout Period: ${p.protocolName || 'Protocol'}` });
            }
        }
      }
    } catch (error) {
      console.error('❌ Dashboard: Error generating tasks', error);
      console.error('Error stack:', error.stack);
    }

    // Supplements are already included in peptideTasks from the Calendar calculation above
    var combined = peptideTasks;
    combined.sort((a, b) => {
      // First, sort by completion status (unchecked first, then checked)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Then by type (peptides first)
      if (a.type === 'peptide' && b.type !== 'peptide') return -1
      if (a.type !== 'peptide' && b.type === 'peptide') return 1
      // Finally by name
      return a.name.localeCompare(b.name)
    })

    console.log('📋 Generated tasks:', combined.map(t => ({
      id: t.id,
      taskId: generateTaskId(t),
      name: t.name,
      completed: t.completed,
      type: t.type,
      deliveryMethod: t.deliveryMethod,
      penColor: t.penColor
    })));
    
    console.log('📋 Task sorting - unchecked first:', combined.filter(t => !t.completed).length, 'unchecked,', combined.filter(t => t.completed).length, 'checked');
    
    console.log('📋 TasksList will receive:', combined.length, 'tasks');
    setTodaysTasks(combined)
    setWashoutReminders(reminders);
    
    // Debug task completion data
    debugTaskCompletion();
  }, [peptideLog, supplements, calendarBump, protocolsFromContext])

  useEffect(() => {
    const handler = () => setShowImport(true)
    window.addEventListener('tpp:openImport', handler)
    return () => window.removeEventListener('tpp:openImport', handler)
  }, [])


  const toggleTask = (id) => {
    setTodaysTasks(ts => ts.map(t => {
      if (t.id === id) {
        // Check if this is a syringe or pen delivery method
        const deliveryMethod = t.deliveryMethod || t.delivery;
        const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
        
        // Injection confirmation is now handled inline in the task components
        
        // Handle tasks with multiple scheduled times
        if (t.scheduledTimes && t.scheduledTimes.length > 1) {
          // For multi-time tasks, toggle all scheduled times
          const newCompleted = !t.completed;
          console.log('🔄 Dashboard: Toggling multi-time task', {
            taskName: t.name,
            originalId: id,
            scheduledTimes: t.scheduledTimes,
            newCompleted
          });
          
          // Toggle completion for all scheduled times
          t.scheduledTimes.forEach(timeSlot => {
            const taskId = generateTaskId({ ...t, time: timeSlot });
            toggleTaskCompletion(taskId, newCompleted, undefined, timeSlot);
          });
          
          // Trigger calendar sync by updating calendarBump
          setCalendarBump(Date.now());
          
          return { ...t, completed: newCompleted };
        } else {
          // Handle single-time tasks (original logic)
          const taskId = t.stableTaskId || generateTaskId(t);
          const currentlyCompleted = isTaskCompleted(taskId, undefined, t.time);
          const newCompleted = !currentlyCompleted;
          console.log('🔄 Dashboard: Toggling single-time task', {
            taskName: t.name,
            originalId: id,
            stableTaskId: taskId,
            newCompleted
          });
          toggleTaskCompletion(taskId, newCompleted, undefined, t.time);
          
          // Trigger calendar sync by updating calendarBump
          setCalendarBump(Date.now());
          
          return { ...t, completed: newCompleted };
        }
      }
      return t;
    }));
  }

  React.useEffect(() => {
    const onOpenRecon = (e) => {
      try { setReconPrefill(e.detail || JSON.parse(localStorage.getItem('tpprover_recon_prefill')||'{}')) } catch {}
      setShowRecon(true)
    }
    // Listen for both event name formats for compatibility
    window.addEventListener('tpp:openRecon', onOpenRecon)
    window.addEventListener('tpp:open_recon', onOpenRecon)
    return () => {
      window.removeEventListener('tpp:openRecon', onOpenRecon)
      window.removeEventListener('tpp:open_recon', onOpenRecon)
    }
  }, [])


  return (
    <div className="space-y-0.5 md:space-y-4" data-tour="dashboard-welcome" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <ViewContainer theme={theme} transparent noMinHeight>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-1 md:gap-2 mb-0 items-start">
          {/* Today's Research taking up 3/4 of the space */}
          <div className="lg:col-span-3 p-2 rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }} data-tour-id="today-research">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Today's Research</h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                detail: { 
                                    message: '🧪 Test toast notification!', 
                                    type: 'success' 
                                } 
                            }));
                        }}
                        className="px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5" 
                        style={{ backgroundColor: theme.accent, color: theme.primaryDark }}
                        title="Test Toast"
                    >
                        <TestTube size={12}/>
                        <span>Test Toast</span>
                    </button>
                    <button 
                        onClick={() => navigate('/app/calendar')}
                        className="px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5" 
                        style={{ backgroundColor: theme.accent, color: theme.primaryDark }}
                    >
                        <Calendar size={12}/>
                        <span>View Schedule</span>
                    </button>
                </div>
            </div>
            <hr className="mb-2" style={{ borderColor: theme.border }} />
            <div className="max-h-48 overflow-y-auto pr-2">
                <TasksList tasks={todaysTasks} theme={theme} onToggle={toggleTask} />
            </div>
            {washoutReminders.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
                    {washoutReminders.map(r => (
                        <div key={r.id} className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: theme.secondary }}>
                            <Info size={16} style={{ color: theme.primary }} />
                            <p className="text-xs" style={{ color: theme.text }}>{r.name}</p>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Side column for Supplements and Goals */}
          <div className="lg:col-span-1 space-y-0.5 md:space-y-3" data-tour-id="supplements-goals">
            {/* Supplements Panel */}
            <div className="rounded border p-2 md:p-3 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5"><Pill className="h-4 w-4" /><span className="font-semibold text-sm">Supplements</span></div>
                  <button 
                    onClick={() => { 
                      if (isReadOnly) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      setEditingSupplement(null); 
                      setShowAddSupplement(true);
                    }} 
                    className="p-1 rounded hover:opacity-80"
                  >
                    <PlusCircle className="h-4 w-4"/>
                  </button>
              </div>
              <hr className="mb-2" style={{ borderColor: theme.border }} />
              {supplements.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: theme.textLight }}>No supplements yet.</p>
              ) : (
                  <ul className="space-y-1.5">
                  {supplements.slice(0, 5).map(v => (
                      <li key={v.id} className="flex items-center justify-between p-1.5 rounded" style={{ backgroundColor: theme.secondary }}>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {getDeliveryIcon(v.delivery)}
                          <div className="flex-1 min-w-0">
                            {/* Name */}
                            <div className="font-medium text-xs mb-1">{v.name}</div>
                            
                            {/* Two column layout */}
                            <div className="grid grid-cols-2 gap-2">
                              {/* Left column: Dosage and Date */}
                              <div>
                                <div className="text-xs" style={{ color: theme.textLight }}>
                                  {v.dose}
                                </div>
                                {formatDateRange(v) && (
                                  <div className="text-xs mt-0.5" style={{ color: theme.textLight, opacity: 0.8 }}>
                                    {formatDateRange(v)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Right column: AM/PM chips and schedule */}
                              <div>
                                {/* AM/PM chips */}
                                <div className="flex gap-1 mb-0.5">
                                  {Array.isArray(v.schedule) && v.schedule.includes('AM') && (
                                    <div className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ 
                                      backgroundColor: theme.primary, 
                                      color: '#ffffff',
                                      fontSize: '10px'
                                    }}>
                                      AM
                                    </div>
                                  )}
                                  {Array.isArray(v.schedule) && v.schedule.includes('PM') && (
                                    <div className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ 
                                      backgroundColor: theme.primary, 
                                      color: '#ffffff',
                                      fontSize: '10px'
                                    }}>
                                      PM
                                    </div>
                                  )}
                                </div>
                                {/* Schedule text (Daily or specific days) */}
                                <div className="text-xs" style={{ color: theme.textLight, fontSize: '10px' }}>
                                  {v.days && v.days.length > 0 && v.days.length < 7 
                                    ? v.days.join(', ')
                                    : 'Daily'}
                                </div>
                              </div>
                            </div>
                          </div>
                      </div>
                      <button 
                        className="p-0.5 rounded hover:opacity-80 flex-shrink-0" 
                        onClick={() => { 
                          if (isReadOnly) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          setEditingSupplement(v); 
                          setShowAddSupplement(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      </li>
                  ))}
                  </ul>
              )}
            </div>

            {/* Goals Panel */}
            <div className="rounded border p-2 md:p-3 content-card flex flex-col" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5"><Target className="h-4 w-4" /><span className="font-semibold text-sm">Goals</span></div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate('/app/goals')} className="px-2 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.primaryDark }}>View All</button>
                      <button 
                        onClick={() => { 
                          if (isReadOnly) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          setEditingGoal(null); 
                          setShowGoal(true);
                        }} 
                        className="px-2 py-1 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1"
                        style={{ 
                          backgroundColor: theme.primary, 
                          color: theme.textOnPrimary || '#ffffff',
                          boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title="New Goal"
                      >
                        <PlusCircle className="h-3 w-3"/>
                        Add
                      </button>
                    </div>
                </div>
                <hr className="mb-2" style={{ borderColor: theme.border }} />
                {goals.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: theme.textLight }}>No goals yet.</p>
                ) : (
                    <>
                    <ul className="space-y-1.5 flex-grow">
                        {goals.slice(0, 3).map(g => (
                        <li key={g.id} className="flex items-start justify-between p-1 rounded">
                            <div className="flex items-start gap-2">
                            <button 
                                onClick={() => {
                                  if (isReadOnly) {
                                    setShowUpgradeModal(true);
                                    return;
                                  }
                                  setGoals(prev => prev.map(x => x.id === g.id ? { ...x, completed: !x.completed } : x));
                                }}
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5`}
                                style={{borderColor: g.completed ? theme.success : theme.border, backgroundColor: g.completed ? theme.success : 'transparent'}}
                            >
                                {g.completed && <Check size={10} className="text-white" />}
                            </button>
                            <div className={g.completed ? 'line-through' : ''} style={{ color: g.completed ? theme.textLight : theme.text }}>
                                <div className="font-medium text-xs">{g.text}</div>
                                {g.dueDate && !g.completed &&
                                    (() => {
                                        const dueDate = new Date(g.dueDate);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
                                        dueDate.setHours(0, 0, 0, 0);
                                        const diffTime = dueDate.getTime() - today.getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        let color = theme.info;
                                        let countdownText = '';
                                        
                                        if (diffDays < 0) {
                                            color = theme.error;
                                            countdownText = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
                                        } else if (diffDays === 0) {
                                            color = theme.warning;
                                            countdownText = 'Due today';
                                        } else if (diffDays <= 7) {
                                            color = theme.warning;
                                            countdownText = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
                                        } else {
                                            countdownText = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
                                        }
                                        
                                        return (
                                            <div className="mt-1 flex flex-col gap-1">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color: color }}>
                                                    {countdownText}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.secondary, color: theme.textLight }}>
                                                    {formatMMDDYYYY(dueDate)}
                                                </span>
                                            </div>
                                        );
                                    })()
                                }
                            </div>
                            </div>
                            <button 
                              className="p-1 rounded hover:bg-gray-100" 
                              onClick={() => { 
                                if (isReadOnly) {
                                  setShowUpgradeModal(true);
                                  return;
                                }
                                setEditingGoal(g); 
                                setShowGoal(true);
                              }}
                            >
                              <Edit size={12} />
                            </button>
                        </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>

            {/* Conversion Widget - UNREMOVABLE, UNMOVEABLE, HIDDEN FROM SETTINGS - Shows only for trial/inactive users */}
            <ConversionWidget theme={theme} subscription={subscription} />
          </div>
        </div>
      </ViewContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 md:gap-2">
        <div className="flex flex-col gap-0 md:gap-4">
            <div className="grid grid-cols-2 gap-1 md:gap-2" data-tour-id="action-buttons">
                <ActionButton 
                  onClick={() => { 
                    if (isReadOnly) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    setShowNewOrder(true);
                  }} 
                  icon={<ShoppingCart />} 
                  label="New Order" 
                  theme={theme} 
                />
                <ActionButton 
                  onClick={() => { 
                    if (isReadOnly) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    setEditingVendor(null); 
                    setShowNewVendor(true); 
                  }} 
                  icon={<Users />} 
                  label="New Vendor" 
                  theme={theme} 
                />
                <ActionButton 
                  onClick={() => { 
                    if (isReadOnly) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    setShowRecon(true);
                  }} 
                  icon={<Droplet />} 
                  label="Recon Calculator" 
                  theme={theme} 
                />
                <ActionButton 
                  onClick={() => { 
                    if (isReadOnly) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    setShowNewProtocol(true);
                  }} 
                  icon={<Plus />} 
                  label="New Protocol" 
                  theme={theme} 
                />
                <ActionButton 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('tpp:toast', { 
                      detail: { 
                        message: '🧪 Test toast notification!', 
                        type: 'success' 
                      } 
                    }));
                  }} 
                  icon={<TestTube />} 
                  label="Test Toast" 
                  theme={theme} 
                />
            </div>
            {/* Bio-Metrics Panel */}
            <div className="rounded border p-2 md:p-3 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} data-tour-id="body-metrics">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-sm">Bio-Metrics</div>
                    <button 
                      onClick={() => { 
                        if (isReadOnly) {
                          setShowUpgradeModal(true);
                          return;
                        }
                        setEditingMetric(null); 
                        setShowMetrics(true);
                      }} 
                      className="px-2 py-1 rounded-md text-xs font-semibold" 
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                      <PlusCircle className="h-3 w-3 inline mr-1"/>Add
                    </button>
                </div>
                <hr className="mb-2" style={{ borderColor: theme.border }} />

                {metrics.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: theme.textLight }}>No metrics logged yet.</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                        <LatestMetrics metrics={metrics} theme={theme} />
                        <h3 className="text-xs font-semibold mt-3 mb-1.5" style={{color: theme.text}}>History</h3>
                        <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                        {[...metrics].sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => (
                            <li key={m.id} className="p-1.5 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-xs">{formatMMDDYYYY(new Date(m.date))}</div>
                                <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: theme.infoBg, color: theme.info }}>{m.weight || '-'} lbs</span>
                                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: theme.successBg, color: theme.success }}>{m.bodyfat || '-'}%</span>
                                <button 
                                  className="p-1 rounded hover:opacity-80" 
                                  onClick={() => { 
                                    if (isReadOnly) {
                                      setShowUpgradeModal(true);
                                      return;
                                    }
                                    setEditingMetric(m); 
                                    setShowMetrics(true);
                                  }}
                                >
                                  <Edit size={14} />
                                </button>
                                </div>
                            </div>
                            </li>
                        ))}
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <div>
                        <div className="text-xs mb-0.5" style={{ color: theme.textLight }}>Weight trend</div>
                        <MiniLineChart theme={theme} data={metrics.filter(m => !!m.weight).sort((a,b) => new Date(a.date) - new Date(b.date)).map(m => ({ x: m.date, y: parseFloat(String(m.weight).replace(/[^0-9.]/g,'')) }))} color={theme.info} />
                        </div>
                        <div>
                        <div className="text-xs mb-0.5" style={{ color: theme.textLight }}>Body fat % trend</div>
                        <MiniLineChart theme={theme} data={metrics.filter(m => !!m.bodyfat).sort((a,b) => new Date(a.date) - new Date(b.date)).map(m => ({ x: m.date, y: parseFloat(String(m.bodyfat).replace(/[^0-9.]/g,'')) }))} color={theme.success} />
                        </div>
                    </div>
                    </div>
                )}
            </div>
        </div>
        <div className="flex flex-col gap-0 md:gap-4" data-tour-id="incoming">
            <UpcomingOrderCard 
                theme={theme}
                orders={Array.isArray(incomingOrders) ? incomingOrders : []}
                onNewOrder={() => {
                  if (isReadOnly) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  setShowNewOrder(true);
                }}
            />
            <UpcomingBuys 
              buys={upcomingBuys} 
              theme={theme} 
              onAdd={() => {
                if (isReadOnly) {
                  setShowUpgradeModal(true);
                  return;
                }
                setShowAddBuyModal(true);
              }} 
            />
            <DontForgetWidget
                theme={theme}
                vendors={vendors}
                onCompleteVendor={(vendor) => {
                    if (isReadOnly) {
                        setShowUpgradeModal(true);
                        return;
                    }
                    setEditingVendor(vendor);
                    setShowNewVendor(true);
                }}
                onViewAllVendors={() => navigate('/app/vendors')}
                isReadOnly={isReadOnly}
                onUpgrade={() => setShowUpgradeModal(true)}
            />
        </div>
      </div>

    <div className="grid grid-cols-1 gap-1 md:gap-2">
        <div className="rounded-lg border p-2 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} data-tour-id="analytics">
            <AnalyticsDashboard theme={theme} />
        </div>
    </div>

    <div className="rounded-lg border p-2 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} data-tour-id="badges">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-base font-semibold" style={{ color: theme.text }}>Your Badges</h2>
                <p className="text-xs text-gray-500">You've earned {earnedCount} of {totalBadges} badges.</p>
            </div>
            <button 
                onClick={() => navigate('/app/badges')}
                className="px-3 py-1.5 rounded-md text-xs font-semibold" 
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
                View Badges
            </button>
        </div>
        <div className="mt-2">
            <div className="h-2 w-full bg-gray-200 rounded-full">
                <div className="h-2 rounded-full" style={{ width: `${progressPercentage}%`, backgroundColor: theme.primary }}></div>
            </div>
        </div>
    </div>

    <OCRImportModal open={showImport} onClose={() => setShowImport(false)} theme={theme} onImport={() => {}} />

    <VendorDetailsModal
        open={!!editingVendor || showNewVendor}
        onClose={() => { setEditingVendor(null); setShowNewVendor(false); }}
        theme={theme}
        vendor={editingVendor}
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
        onSave={(o) => {
          // Ensure category is set, default to 'domestic' if not specified
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

      <ProtocolEditorModal
        open={!!showNewProtocol}
        onClose={() => setShowNewProtocol(false)}
        theme={theme}
        onSave={(data) => {
          const now = new Date().toISOString();
          const newProtocol = { 
            id: generateId(), 
            ...data, 
            active: false, 
            startDate: data.startDate || '',
            createdAt: now,
            updatedAt: now
          };
          setProtocols(prev => [newProtocol, ...prev]);
          
          // bump calendar
          const calendarBump = String(Date.now())
          localStorage.setItem('tpprover_calendar_bump', calendarBump)
          window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: calendarBump }))

          setShowNewProtocol(false)
        }}
      />

    <ReconCalculatorModal open={showRecon} onClose={() => setShowRecon(false)} theme={theme} onTransfer={(data) => { setShowRecon(false); }} prefill={reconPrefill || undefined} />

    <BodyMetricsModal
        open={showMetrics}
        onClose={() => setShowMetrics(false)}
        theme={theme}
        metric={editingMetric}
        onDelete={async (metricData) => {
            if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
            }
            if (editingMetric?.id) {
                const metricToDelete = editingMetric;
                console.log('🗑️ Deleting metric:', metricToDelete.name || 'Unknown');
                
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
                            protocols: protocolsFromContext || [],
                            reconItems: reconItems || [],
                            reconHistory: reconHistory || [],
                            supplements: supplements || [],
                            orders: orders || [],
                            metrics: updatedMetrics, // Use updated metrics with deletion
                            vendors: vendors || [],
                            calendarNotes: calendarNotes || {},
                            stockpile: stockpile || [],
                            scheduledBuys: []
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
            }
        }}
        onSave={(data) => {
            if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
            }
            
            const now = new Date().toISOString();
            setMetrics(prev => {
                if (data.id) return prev.map(x => x.id === data.id ? { 
                    ...x, 
                    ...data, 
                    updatedAt: now 
                } : x)
                return [{ 
                    id: generateId(), 
                    ...data, 
                    createdAt: now, 
                    updatedAt: now 
                }, ...prev]
            })
            setShowMetrics(false)
            setEditingMetric(null)
        }}
    />
    <GoalModal
        open={showGoal}
        onClose={() => setShowGoal(false)}
        theme={theme}
        goal={editingGoal}
        onSave={(form) => {
        setGoals(prev => {
            if (form.id) return prev.map(g => g.id === form.id ? { ...g, text: form.text, dueDate: form.dueDate } : g)
            return [{ id: generateId(), text: form.text, dueDate: form.dueDate, completed: false }, ...prev]
        })
        setShowGoal(false)
        setEditingGoal(null)
        }}
        onDelete={(form) => { setGoals(prev => prev.filter(g => g.id !== form.id)); setShowGoal(false); setEditingGoal(null) }}
    />

    <SupplementEditorModal
        open={showAddSupplement}
        onClose={() => setShowAddSupplement(false)}
        theme={theme}
        supplement={editingSupplement}
        onSave={async (data) => {
          if (isReadOnly) {
            setShowUpgradeModal(true);
            return;
          }
          
          // Handle delete case directly
          if (data._delete && data.id) {
            await deleteSupplement(data.id);
            setShowAddSupplement(false);
            setEditingSupplement(null);
            
            const deleteBumpTime = String(Date.now())
            localStorage.setItem('tpprover_calendar_bump', deleteBumpTime)
            window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: deleteBumpTime }))
            return;
          }
          
          // Handle save/update
          if (editingSupplement) {
            await updateSupplement(data);
          } else {
            addSupplement(data);
          }
          setShowAddSupplement(false)
          setEditingSupplement(null)
          
          const saveBumpTime = String(Date.now())
          localStorage.setItem('tpprover_calendar_bump', saveBumpTime)
          window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: saveBumpTime }))
        }}
      />
      <BadgesModal open={showBadges} onClose={() => setShowBadges(false)} theme={theme} />
      <AddScheduledBuyModal
        open={showAddBuyModal}
        onClose={() => setShowAddBuyModal(false)}
        theme={theme}
        buy={null}
        onSave={(buy) => {
            if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
            }
            
            // ✅ Remove client-side timestamp - will be set by Firestore serverTimestamp during sync
            const newBuy = { 
                ...buy, 
                id: buy.id || generateId(), 
                createdAt: buy.createdAt || new Date().toISOString(), // Keep createdAt for initial tracking
                // updatedAt will be set by Firestore serverTimestamp during sync
                name: buy.item,
                peptideName: buy.item
            };
            
            setScheduledBuys(prev => {
                const isEdit = buy.id && prev.some(b => b.id === buy.id);
                let updated;
                if (isEdit) {
                    updated = prev.map(b => b.id === buy.id ? { ...b, ...newBuy } : b);
                } else {
                    updated = [...prev, newBuy];
                }
                
                // Save to localStorage immediately
                try {
                    localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updated));
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
            
            // Update local upcomingBuys state immediately
            const currentDate = new Date();
            if (new Date(newBuy.openDate) >= currentDate || (new Date(newBuy.closeDate) >= currentDate && new Date(newBuy.openDate) <= currentDate)) {
                setUpcomingBuys(prev => {
                    const isEdit = buy.id && prev.some(b => b.id === buy.id);
                    if (isEdit) {
                        return prev.map(b => b.id === buy.id ? {
                            id: newBuy.id,
                            name: newBuy.item,
                            peptideName: newBuy.item,
                            date: newBuy.openDate,
                            vendor: newBuy.vendor,
                            location: newBuy.location,
                            participants: newBuy.participants,
                            price: newBuy.price,
                            openDate: newBuy.openDate,
                            closeDate: newBuy.closeDate,
                            description: newBuy.notes,
                            notes: newBuy.notes
                        } : b);
                    }
                    return [...prev, {
                        id: newBuy.id,
                        name: newBuy.item,
                        peptideName: newBuy.item,
                        date: newBuy.openDate,
                        vendor: newBuy.vendor,
                        location: newBuy.location,
                        participants: newBuy.participants,
                        price: newBuy.price,
                        openDate: newBuy.openDate,
                        closeDate: newBuy.closeDate,
                        description: newBuy.notes,
                        notes: newBuy.notes
                    }];
                });
            }
            
            setShowAddBuyModal(false);
        }}
        onDelete={(buyId) => {
            if (isReadOnly) {
                setShowUpgradeModal(true);
                return;
            }
            
            // Record deletion with item snapshot for restore functionality
            const buyToDelete = scheduledBuys.find(b => b.id === buyId);
            if (buyToDelete) {
                recordDeletion('scheduledBuys', String(buyId), buyToDelete);
            } else {
                recordDeletion('scheduledBuys', String(buyId));
            }
            
            setScheduledBuys(prev => {
                const updated = prev.filter(b => b.id !== buyId);
                
                try {
                    localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updated));
                    localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()));
                } catch (e) {
                    console.error('Failed to save scheduled buys to localStorage:', e);
                }
                
                window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
                    detail: { scheduledBuys: updated }
                }));
                
                return updated;
            });
            
            setUpcomingBuys(prev => prev.filter(b => b.id !== buyId));
            setShowAddBuyModal(false);
        }}
      />

    <UpgradeModal 
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      actionAttempted="add or modify data"
      theme={theme}
    />

    </div>
  )
}

function ActionButton({ icon, label, theme, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-200 hover:shadow-lg w-full"
      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
    >
      {React.cloneElement(icon, { size: 16 })}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  )
}

function QuickCard({ icon, label, theme, onClick }) {
  const isMauve = theme.name === 'Mauve';
  const bgColor = isMauve ? theme.primaryDark : theme.cardBackground;
  const textColor = isMauve ? theme.textOnPrimary : theme.primaryDark;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {React.cloneElement(icon, { style: { color: textColor } })}
      <span className="font-semibold mt-2">{label}</span>
    </button>
  )
}

function LatestMetrics({ metrics, theme }) {
    const sorted = metrics.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];
    const previous = sorted[1];

    const weightDiff = previous?.weight ? parseFloat(latest.weight) - parseFloat(previous.weight) : null;
    const fatDiff = previous?.bodyfat ? parseFloat(latest.bodyfat) - parseFloat(previous.bodyfat) : null;

    return (
        <div>
            <h3 className="text-xs font-semibold mb-1.5" style={{color: theme.text}}>Latest</h3>
            <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded-lg bg-gray-50 border" style={{borderColor: theme.border}}>
                    <div className="text-xs text-gray-500">Weight</div>
                    <div className="text-sm font-bold" style={{color: theme.text}}>{latest.weight || '-'} lbs</div>
                    {weightDiff !== null && (
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 ${weightDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {weightDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {weightDiff.toFixed(1)} lbs
                        </span>
                    )}
                </div>
                <div className="p-2 rounded-lg bg-gray-50 border" style={{borderColor: theme.border}}>
                    <div className="text-xs text-gray-500">Body Fat</div>
                    <div className="text-sm font-bold" style={{color: theme.text}}>{latest.bodyfat || '-'}%</div>
                        {fatDiff !== null && (
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 ${fatDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {fatDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {fatDiff.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5 text-center">
                <MetricDisplay icon={<Bed size={14}/>} value={latest.sleep} label="Sleep" theme={theme} />
                <MetricDisplay icon={<Zap size={14}/>} value={latest.energy} label="Energy" theme={theme} />
                <MetricDisplay icon={<Smile size={14}/>} value={latest.mood} label="Mood" theme={theme} />
                <MetricDisplay icon={<ShieldAlert size={14}/>} value={latest.pain} label="Pain" theme={theme} />
            </div>
        </div>
    );
}

const MetricDisplay = ({ icon, value, label, theme }) => (
    <div className="p-1.5 rounded-lg bg-gray-50 border" style={{borderColor: theme.border}}>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-semibold text-xs" style={{color: theme.text}}>{value || '-'}</div>
    </div>
);

function MiniLineChart({ data = [], color = '#3B82F6', theme }) {
  if (!data || data.length === 0) return <div className="text-xs text-gray-500">No data</div>
  const vw = 100; const vh = 40; const padding = 2
  const ys = data.map(d => d.y).filter(n => typeof n === 'number' && !isNaN(n))
  const minY = Math.min(...ys); const maxY = Math.max(...ys)
  const yRange = maxY - minY || 1
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (vw - padding*2)
    const y = padding + (1 - (d.y - minY) / yRange) * (vh - padding*2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${vw} ${vh}`} className="rounded border" style={{ borderColor: theme?.border, backgroundColor: theme.cardBackground }}>
      <polyline fill="none" stroke={color} strokeWidth="0.5" points={points} />
    </svg>
  )
}
