import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Users, Plus, ShoppingCart, Droplet, Edit, Trash2, Pill, Syringe, TestTube, Info, Target, PlusCircle, Award, Check, CheckCircle, Clock, TrendingUp, TrendingDown, Bed, Zap, Smile, ShieldAlert, Beaker, Calendar } from 'lucide-react'
import BadgeImage from '../components/badges/BadgeImage'
import { themes, defaultThemeName } from '../theme/themes'
import ViewContainer from '../components/ui/ViewContainer'
import TasksList from '../components/dashboard/TasksList'
import UpcomingOrderCard from '../components/dashboard/UpcomingOrderCard'
import ReconCalculatorModal from '../components/recon/ReconCalculatorModal'
import UpcomingBuys from '../components/dashboard/UpcomingBuys'
import { ToastContainer, Toast } from '../components/ui/Toast'
import OCRImportModal from '../components/import/OCRImportModal'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import { calculateRecon } from '../utils/recon'
import useLocalStorage from '../utils/hooks'
import { formatMMDDYYYY } from '../utils/date'
import GoalModal from '../components/research/GoalModal'
import BodyMetricsModal from '../components/research/BodyMetricsModal'
import SupplementEditorModal from '../components/research/SupplementEditorModal'
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard'
import BadgesModal from '../components/badges/BadgesModal'
import AddScheduledBuyModal from '../components/orders/AddScheduledBuyModal'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'
import { useBadgeStats } from '../utils/badges'

export default function Dashboard() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { totalBadges, earnedCount, progressPercentage } = useBadgeStats();
  const { setScheduledBuys, orders } = useAppContext();
  
  // Mock minimal data to render the dashboard without external deps
  const [vitamins, setVitamins] = useState([
    { id: 1, name: 'Vitamin D3', dose: '5000 IU', schedule: 'AM' },
    { id: 2, name: 'Magnesium', dose: '200 mg', schedule: 'PM' },
  ])

  // Derive today's peptide tasks from active protocols
  const peptideLog = useMemo(() => {
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const out = {}
      // Minimal structure to keep downstream usage intact
      return out
    } catch { return {} }
  }, [])

  const incomingOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    const placedOrders = orders.filter(o => o.status === 'Order Placed');
    if (placedOrders.length === 0) return null;
    placedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = placedOrders[0];
    return {
        peptide: latest.items?.[0]?.name || 'Unknown Item',
        mg: latest.items?.[0]?.mg || 'N/A',
        vendor: latest.vendorName || 'Unknown Vendor',
        shipDate: latest.date
    };
  }, [orders]);

  const pendingVendors = useMemo(() => ([
    { id: 1001, name: 'Vendor X', notes: 'Auto-created from reconstitution' },
    { id: 1002, name: 'Vendor Y', notes: 'Auto-created from orders' },
  ]), [])

  const [supplements, setSupplements] = useState([]);

  useEffect(() => {
      try {
          const raw = localStorage.getItem('tpprover_supplements');
          if(raw) {
              setSupplements(JSON.parse(raw));
          }
      } catch {}
  }, []);

  const [todaysTasks, setTodaysTasks] = useState([])
  const [washoutReminders, setWashoutReminders] = useState([])
  const [showRecon, setShowRecon] = useState(false)
  const [reconPrefill, setReconPrefill] = useState(null)
  const [upcomingBuys, setUpcomingBuys] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showNewProtocol, setShowNewProtocol] = useState(false)
  const [vendorNames, setVendorNames] = useState(() => { try { return JSON.parse(localStorage.getItem('tpprover_vendors')||'[]') } catch { return [] } })
  const [toasts, setToasts] = useState([])
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


  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

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

    if (days.length > 0 && days.length < 7) {
      return `${scheduleText} (${days.join(', ')})`;
    }
    return scheduleText;
  };

  const getDeliveryIcon = (delivery) => {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Syringe size={16} className="text-gray-500" />;
        case 'powder': return <Beaker size={16} className="text-gray-500" />;
        case 'pill':
        default: return <Pill size={16} className="text-gray-500" />;
    }
  };

  const [calendarBump, setCalendarBump] = useState(0);

  useEffect(() => {
      const handleStorageChange = (e) => {
          if (e.key === 'tpprover_calendar_bump') {
              setCalendarBump(Date.now());
          }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    try {
        const raw = localStorage.getItem('tpprover_scheduled_buys');
        if (raw) {
            const buys = JSON.parse(raw);
            const now = new Date();
            // Filter for buys that are still open or upcoming
            const upcoming = buys.filter(b => new Date(b.openDate) >= now || (new Date(b.closeDate) >= now && new Date(b.openDate) <= now));
            setUpcomingBuys(upcoming.map(b => ({
                id: b.id,
                name: b.item,
                date: b.openDate, // Use openDate for display
                vendor: b.vendor,
            })));
        }
    } catch {}

    const handleStorageChange = (e) => {
        if (e.key === 'tpprover_orders_bump') {
             try {
                const raw = localStorage.getItem('tpprover_scheduled_buys');
                if (raw) {
                    const buys = JSON.parse(raw);
                    const now = new Date();
                    // Filter for buys that are still open or upcoming
                    const upcoming = buys.filter(b => new Date(b.openDate) >= now || (new Date(b.closeDate) >= now && new Date(b.openDate) <= now));
                    setUpcomingBuys(upcoming.map(b => ({
                        id: b.id,
                        name: b.item,
                        date: b.openDate, // Use openDate for display
                        vendor: b.vendor,
                    })));
                }
            } catch {}
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const getWeekOfMonth = (date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
      return Math.ceil((date.getDate() + firstDay) / 7)
    }
    const weekId = `${today.getFullYear()}-${today.getMonth() + 1}-week-${getWeekOfMonth(today)}`

    // Build peptide tasks from active (legacy-compatible) protocols for today
    let peptideTasks = []
    let reminders = []
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const reconItems = JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]')
      
      const normalizePeptides = (p) => {
        const base = (Array.isArray(p.peptides) && p.peptides.length > 0) ? p.peptides : [{ name: p.name || p.peptide, dosage: p.dosage, frequency: p.frequency }]
        return base.map(pep => {
          const f = pep?.frequency || {}
          const type = f.type || 'daily'
          const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['Morning']
          return { ...pep, frequency: { ...f, type, time } }
        })
      }
      const isTodayInRange = (p) => {
        if (!p?.startDate) return false
        const s = new Date(p.startDate)
        const startOnly = new Date(s.getFullYear(), s.getMonth(), s.getDate())
        const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        if (tOnly < startOnly) return false
        if (p.endDate) {
          const e = new Date(p.endDate)
          const endOnly = new Date(e.getFullYear(), e.getMonth(), e.getDate())
          if (tOnly > endOnly) return false
        } else if (p.duration && p.duration.noEnd !== true && Number(p.duration.count) > 0) {
          const e = new Date(s)
          const unit = String(p.duration.unit || 'week').toLowerCase()
          const count = Number(p.duration.count) || 0
          if (unit === 'day') e.setDate(e.getDate() + count - 1)
          else if (unit === 'week') e.setDate(e.getDate() + (count * 7) - 1)
          else if (unit === 'month') { e.setMonth(e.getMonth() + count); e.setDate(e.getDate() - 1) }
          const endOnly = new Date(e.getFullYear(), e.getMonth(), e.getDate())
          if (tOnly > endOnly) return false
        }
        return p.active !== false
      }
      const shortDay = today.toLocaleDateString('en-US', { weekday: 'short' })
      protocols.forEach(p => {
        if (!isTodayInRange(p)) return

        const isBlended = p.blendMode === 'blended' && Array.isArray(p.peptides) && p.peptides.length > 1;
        
        // Find matching recon item to calculate units
        const reconItem = reconItems.find(r => r.name && r.name.startsWith(p.protocolName));
        
        if (isBlended) {
            const blendName = p.protocolName || 'Blended Protocol';
            const doseParts = [];
            let isScheduledToday = false;
            const times = new Set();

            normalizePeptides(p).forEach(pep => {
                const freq = pep.frequency || {};
                let scheduled = false;
                switch (freq.type) {
                    case 'daily': scheduled = true; break;
                    case 'weekly': if (freq.days?.includes(shortDay)) scheduled = true; break;
                    case 'cycle':
                        const on = Number(freq.onDays) || 0;
                        const off = Number(freq.offDays) || 0;
                        if (on > 0) {
                            const cycleLen = on + off;
                            const ps = new Date(p.startDate);
                            const dayDiff = Math.floor((today - ps) / (1000 * 60 * 60 * 24));
                            if (dayDiff >= 0 && (dayDiff % cycleLen) < on) scheduled = true;
                        }
                        break;
                }
                if (scheduled) {
                    isScheduledToday = true;
                    doseParts.push(`${pep.name} ${pep.dosage?.amount || ''} ${pep.dosage?.unit || 'mcg'}`);
                    (pep.frequency.time || ['Morning']).forEach(t => times.add(t));
                }
            });

            if (isScheduledToday) {
                let doseDisplay = doseParts.join(' + ');
                if (reconItem) {
                    const totalDoseInMcg = reconItem.peptides.reduce((sum, pep) => {
                        const dose = Number(pep.dose) || 0;
                        return pep.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                    }, 0);
                    const totalMg = reconItem.peptides.reduce((sum, pep) => sum + (Number(pep.mg) || 0), 0);
                    const calc = calculateRecon({ ...reconItem, mg: totalMg, dose: totalDoseInMcg });
                    if (calc.unitsPerDose > 0) {
                        doseDisplay = `${calc.unitsPerDose.toFixed(0)} units`;
                    }
                }

                times.forEach(t => {
                    peptideTasks.push({
                        id: `${p.id}-${blendName}-${t}`,
                        type: 'peptide',
                        name: blendName,
                        dose: doseDisplay,
                        unit: '', // Unit is part of the doseDisplay string
                        time: t === 'Morning' ? 'AM' : 'PM',
                        completed: false,
                        deliveryMethod: reconItem?.deliveryMethod,
                        penColor: reconItem?.penColor
                    });
                });
            }
        } else {
            // Existing logic for separate peptides
            normalizePeptides(p).forEach(pep => {
              const freq = pep.frequency || {}
              let isScheduledToday = false
              switch (freq.type) {
                case 'daily':
                  isScheduledToday = true
                  break
                case 'weekly':
                  if (freq.days?.includes(shortDay)) isScheduledToday = true
                  break
                case 'cycle':
                  const on = Number(freq.onDays) || 0
                  const off = Number(freq.offDays) || 0
                  if (on > 0) {
                    const cycleLen = on + off
                    const ps = new Date(p.startDate)
                    const dayDiff = Math.floor((today - ps) / (1000 * 60 * 60 * 24))
                    if (dayDiff >= 0) {
                      const dayInCycle = dayDiff % cycleLen
                      if (dayInCycle < on) isScheduledToday = true
                    }
                  }
                  break
                default:
                  break
              }
              if (!isScheduledToday) return
              
              let dose = pep.dosage?.amount || '';
              let unit = pep.dosage?.unit || '';
              
              if (reconItem) {
                const calc = calculateRecon({ 
                    mg: reconItem.mg, 
                    water: reconItem.water, 
                    dose: pep.dosage?.unit === 'mg' ? (pep.dosage?.amount || 0) * 1000 : pep.dosage?.amount 
                });
                 if (calc.unitsPerDose > 0) {
                    dose = calc.unitsPerDose.toFixed(0);
                    unit = 'units';
                }
              }

              pep.frequency.time.forEach(t => {
                peptideTasks.push({
                  id: `${p.id}-${pep.name || 'Peptide'}-${t}`,
                  type: 'peptide',
                  name: pep.name || 'Peptide',
                  dose: dose,
                  unit: unit,
                  time: t === 'Morning' ? 'AM' : 'PM',
                  completed: false,
                  deliveryMethod: reconItem?.deliveryMethod,
                  penColor: reconItem?.penColor
                })
              })
            })
        }
      })
      // Inject first-day Wash-Out reminders
      for (const p of protocols) {
        if (!p?.washout?.enabled || !p?.startDate) continue
        // compute end date from either endDate or duration
        let end = p.endDate ? new Date(p.endDate) : null
        if (!end && p.duration && p.duration.noEnd !== true && Number(p.duration.count) > 0) {
          end = new Date(p.startDate)
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
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const washStartOnly = new Date(washStart.getFullYear(), washStart.getMonth(), washStart.getDate());
            const washEndOnly = new Date(washEnd.getFullYear(), washEnd.getMonth(), washEnd.getDate());

            if (todayOnly >= washStartOnly && todayOnly <= washEndOnly) {
                reminders.push({ id: `wash-${p.id}`, name: `Washout Period: ${p.protocolName || 'Protocol'}` });
            }
        }
      }
    } catch {}

    const todayShortDay = today.toLocaleDateString('en-US', { weekday: 'short' });
    const supplementTasks = supplements
      .filter(s => (!s.days || s.days.length === 0 || s.days.includes(todayShortDay)))
      .flatMap(s => {
        const tasks = [];
        const slots = Array.isArray(s.schedule) ? s.schedule : (s.schedule === 'PM' ? ['PM'] : s.schedule === 'AM' ? ['AM'] : ['AM','PM'])
        if (slots.includes('AM')) {
          tasks.push({
            id: `${s.id}-AM`,
            type: 'supplement',
            name: s.name,
            dose: s.dose,
            unit: '',
            delivery: s.delivery,
            time: 'AM',
            completed: false,
          });
        }
        if (slots.includes('PM')) {
          tasks.push({
            id: `${s.id}-PM`,
            type: 'supplement',
            name: s.name,
            dose: s.dose,
            unit: '',
            delivery: s.delivery,
            time: 'PM',
            completed: false,
          });
        }
        return tasks;
      });

    var combined = [...peptideTasks, ...supplementTasks];
    combined.sort((a, b) => {
      if (a.type === 'peptide' && b.type !== 'peptide') return -1
      if (a.type !== 'peptide' && b.type === 'peptide') return 1
      return a.name.localeCompare(b.name)
    })

    setTodaysTasks(combined)
    setWashoutReminders(reminders);
  }, [peptideLog, supplements, calendarBump])

  useEffect(() => {
    const handler = () => setShowImport(true)
    window.addEventListener('tpp:openImport', handler)
    return () => window.removeEventListener('tpp:openImport', handler)
  }, [])

  const toggleTask = (id) => setTodaysTasks(ts => ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

  React.useEffect(() => {
    const onOpenRecon = (e) => {
      try { setReconPrefill(e.detail || JSON.parse(localStorage.getItem('tpprover_recon_prefill')||'{}')) } catch {}
      setShowRecon(true)
    }
    window.addEventListener('tpp:open_recon', onOpenRecon)
    return () => window.removeEventListener('tpp:open_recon', onOpenRecon)
  }, [])

  React.useEffect(() => {
    const onToast = (e) => {
      try {
        const { message, type } = e.detail || {}
        if (!message) return
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type: type || 'success' }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
      } catch {}
    }
    window.addEventListener('tpp:toast', onToast)
    return () => window.removeEventListener('tpp:toast', onToast)
  }, [])

  return (
    <div className="space-y-8" data-tour="dashboard-welcome">
      <ViewContainer theme={theme} transparent noMinHeight>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-0 items-start">
          {/* Today's Research taking up 3/4 of the space */}
          <div className="lg:col-span-3 p-8 rounded-xl content-card h-full flex flex-col" style={{ backgroundColor: theme.cardBackground }} data-tour-id="today-research">
            <div className="flex justify-between items-center mb-1">
                <h3 className="h3" style={{ color: theme.primaryDark }}>Today's Research</h3>
                <button 
                    onClick={() => navigate('/calendar')}
                    className="px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2" 
                    style={{ backgroundColor: theme.accent, color: theme.primaryDark }}
                >
                    <Calendar size={14}/>
                    <span>View Schedule</span>
                </button>
            </div>
            <hr className="mb-4" style={{ borderColor: theme.border }} />
            <div className="flex-1">
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
          <div className="lg:col-span-1 space-y-4" data-tour-id="supplements-goals">
            {/* Supplements Panel */}
            <div className="rounded border p-4 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Pill className="h-5 w-5" /><span className="font-semibold">Supplements</span></div>
                  <button onClick={() => { setEditingSupplement(null); setShowAddSupplement(true) }} className="p-1 rounded hover:opacity-80"><PlusCircle className="h-5 w-5"/></button>
              </div>
              <hr className="mb-3" style={{ borderColor: theme.border }} />
              {supplements.length === 0 ? (
                  <p className="text-sm" style={{ color: theme.textLight }}>No supplements yet.</p>
              ) : (
                  <ul className="space-y-2">
                  {supplements.slice(0, 5).map(v => (
                      <li key={v.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme.secondary }}>
                      <div className="flex items-center gap-2">
                          {getDeliveryIcon(v.delivery)}
                          <div>
                            <div className="font-medium text-sm">{v.name}</div>
                            <div className="text-xs" style={{ color: theme.textLight }}>{v.dose}</div>
                          </div>
                      </div>
                      <button className="p-1 rounded hover:opacity-80" onClick={() => { setEditingSupplement(v); setShowAddSupplement(true) }}><Edit className="h-4 w-4" /></button>
                      </li>
                  ))}
                  </ul>
              )}
            </div>

            {/* Goals Panel */}
            <div className="rounded border p-4 content-card flex flex-col" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Target className="h-5 w-5" /><span className="font-semibold">Goals</span></div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate('/goals')} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.primaryDark }}>View All</button>
                      <button onClick={() => { setEditingGoal(null); setShowGoal(true) }} className="p-1 rounded hover:opacity-80" title="New Goal"><PlusCircle className="h-5 w-5"/></button>
                    </div>
                </div>
                <hr className="mb-3" style={{ borderColor: theme.border }} />
                {goals.length === 0 ? (
                    <p className="text-sm text-center py-2" style={{ color: theme.textLight }}>No goals yet.</p>
                ) : (
                    <>
                    <ul className="space-y-2 mt-1 flex-grow">
                        {goals.slice(0, 3).map(g => (
                        <li key={g.id} className="flex items-start justify-between p-1 rounded">
                            <div className="flex items-start gap-2">
                            <button 
                                onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, completed: !x.completed } : x))}
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
                                        const diffTime = dueDate.getTime() - today.getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        let color = theme.info;
                                        if (diffDays < 0) color = theme.error;
                                        else if (diffDays <= 7) color = theme.warning;
                                        return (
                                            <div className="mt-1">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color: color }}>
                                                    {formatMMDDYYYY(dueDate)}
                                                </span>
                                            </div>
                                        );
                                    })()
                                }
                            </div>
                            </div>
                            <button className="p-1 rounded hover:bg-gray-100" onClick={() => { setEditingGoal(g); setShowGoal(true) }}><Edit size={12} /></button>
                        </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>
          </div>
        </div>
      </ViewContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6" data-tour-id="action-buttons">
                <ActionButton onClick={() => { setShowNewOrder(true) }} icon={<ShoppingCart />} label="New Order" theme={theme} />
                <ActionButton onClick={() => { setEditingVendor({ id: Date.now(), name: '', notes: '' }) }} icon={<Users />} label="New Vendor" theme={theme} />
                <ActionButton onClick={() => { setShowRecon(true) }} icon={<Droplet />} label="Recon Calculator" theme={theme} />
                <ActionButton onClick={() => { setShowNewProtocol(true) }} icon={<Plus />} label="New Protocol" theme={theme} />
            </div>
            {/* Body Metrics Panel */}
            <div className="rounded border p-4 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} data-tour-id="body-metrics">
                <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Body Metrics</div>
                    <button onClick={() => { setEditingMetric(null); setShowMetrics(true) }} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}><PlusCircle className="h-4 w-4 inline mr-1"/>Add</button>
                </div>
                <hr className="mb-3" style={{ borderColor: theme.border }} />

                {metrics.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: theme.textLight }}>No metrics logged yet.</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <LatestMetrics metrics={metrics} theme={theme} />
                        <h3 className="text-sm font-semibold mt-4 mb-2" style={{color: theme.text}}>History</h3>
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {metrics.map(m => (
                            <li key={m.id} className="p-2 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{formatMMDDYYYY(new Date(m.date))}</div>
                                <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: theme.infoBg, color: theme.info }}>{m.weight || '-'} lbs</span>
                                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: theme.successBg, color: theme.success }}>{m.bodyfat || '-'}%</span>
                                <button className="p-1 rounded hover:opacity-80" onClick={() => { setEditingMetric(m); setShowMetrics(true) }}><Edit size={14} /></button>
                                </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs border-t pt-2" style={{borderColor: theme.border, color: theme.textLight}}>
                                <span className="flex items-center gap-1"><Bed size={12}/> {m.sleep || '-'}</span>
                                <span className="flex items-center gap-1"><Zap size={12}/> {m.energy || '-'}</span>
                                <span className="flex items-center gap-1"><Smile size={12}/> {m.mood || '-'}</span>
                                <span className="flex items-center gap-1"><ShieldAlert size={12}/> {m.pain || '-'}</span>
                            </div>
                            </li>
                        ))}
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <div>
                        <div className="text-xs mb-1" style={{ color: theme.textLight }}>Weight trend</div>
                        <MiniLineChart theme={theme} data={metrics.filter(m => !!m.weight).sort((a,b) => new Date(a.date) - new Date(b.date)).map(m => ({ x: m.date, y: parseFloat(String(m.weight).replace(/[^0-9.]/g,'')) }))} color={theme.info} />
                        </div>
                        <div>
                        <div className="text-xs mb-1" style={{ color: theme.textLight }}>Body fat % trend</div>
                        <MiniLineChart theme={theme} data={metrics.filter(m => !!m.bodyfat).sort((a,b) => new Date(a.date) - new Date(b.date)).map(m => ({ x: m.date, y: parseFloat(String(m.bodyfat).replace(/[^0-9.]/g,'')) }))} color={theme.success} />
                        </div>
                    </div>
                    </div>
                )}
            </div>
        </div>
        <div className="flex flex-col gap-6" data-tour-id="incoming">
            <UpcomingOrderCard 
                theme={theme}
                order={incomingOrder}
                onNewOrder={() => setShowNewOrder(true)}
            />
            <UpcomingBuys buys={upcomingBuys} theme={theme} onAdd={() => setShowAddBuyModal(true)} />
        </div>
      </div>

    <div className="grid grid-cols-1 gap-6">
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} data-tour-id="analytics">
            <AnalyticsDashboard theme={theme} />
        </div>
    </div>

    <div className="grid grid-cols-1 gap-6">
    </div>

    <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }} data-tour-id="badges">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-semibold" style={{ color: theme.text }}>Your Badges</h2>
                <p className="text-sm text-gray-500">You've earned {earnedCount} of {totalBadges} badges.</p>
            </div>
            <button 
                onClick={() => navigate('/badges')}
                className="px-4 py-2 rounded-md text-sm font-semibold" 
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
                View Badges
            </button>
        </div>
        <div className="mt-4">
            <div className="h-2 w-full bg-gray-200 rounded-full">
                <div className="h-2 rounded-full" style={{ width: `${progressPercentage}%`, backgroundColor: theme.primary }}></div>
            </div>
        </div>
    </div>

    <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    <OCRImportModal open={showImport} onClose={() => setShowImport(false)} theme={theme} onImport={() => addToast('Import saved', 'success')} />

    <VendorDetailsModal
        open={!!editingVendor}
        onClose={() => setEditingVendor(null)}
        theme={theme}
        vendor={editingVendor}
        onSave={(v) => {
          // Save vendor name for suggestions
          try {
            const set = new Set([...(JSON.parse(localStorage.getItem('tpprover_vendors')||'[]')||[]), v.name].filter(Boolean))
            const arr = Array.from(set)
            localStorage.setItem('tpprover_vendors', JSON.stringify(arr))
            setVendorNames(arr)
          } catch {}
          setEditingVendor(null)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Vendor saved', type: 'success' } }))
        }}
      />

      <OrderDetailsModal
        open={!!showNewOrder}
        onClose={() => setShowNewOrder(false)}
        order={{}}
        theme={theme}
        vendorList={vendorNames}
        onSave={(o) => {
          try {
            const raw = localStorage.getItem('tpprover_orders')
            const all = raw ? JSON.parse(raw) : []
            const id = o.id || Date.now()
            all.unshift({ ...o, id })
            localStorage.setItem('tpprover_orders', JSON.stringify(all))
            // add vendor name
            if (o.vendor) {
              const set = new Set([...(JSON.parse(localStorage.getItem('tpprover_vendors')||'[]')||[]), o.vendor])
              const arr = Array.from(set)
              localStorage.setItem('tpprover_vendors', JSON.stringify(arr))
              setVendorNames(arr)
            }
          } catch {}
          setShowNewOrder(false)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Order added', type: 'success' } }))
        }}
        onDelete={() => setShowNewOrder(false)}
      />

      <ProtocolEditorModal
        open={!!showNewProtocol}
        onClose={() => setShowNewProtocol(false)}
        theme={theme}
        onSave={(data) => {
          try {
            const raw = localStorage.getItem('tpprover_protocols')
            const arr = raw ? JSON.parse(raw) : []
            arr.unshift({ id: Date.now(), ...data })
            localStorage.setItem('tpprover_protocols', JSON.stringify(arr))
            // bump calendar
            const now = String(Date.now())
            localStorage.setItem('tpprover_calendar_bump', now)
            window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: now }))
          } catch {}
          setShowNewProtocol(false)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol created', type: 'success' } }))
        }}
      />

    <ReconCalculatorModal open={showRecon} onClose={() => setShowRecon(false)} theme={theme} onTransfer={(data) => { setShowRecon(false); }} prefill={reconPrefill || undefined} />

    <BodyMetricsModal
        open={showMetrics}
        onClose={() => setShowMetrics(false)}
        theme={theme}
        metric={editingMetric}
        onSave={(data) => {
        setMetrics(prev => {
            if (data.id) return prev.map(x => x.id === data.id ? { ...x, ...data } : x)
            return [{ id: Date.now(), ...data }, ...prev]
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
            return [{ id: Date.now(), text: form.text, dueDate: form.dueDate, completed: false }, ...prev]
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
        onSave={(data) => {
          setSupplements(prev => {
            if (editingSupplement) {
              return prev.map(v => v.id === editingSupplement.id ? { ...v, ...data } : v)
            }
            return [{ id: Date.now(), ...data }, ...prev]
          })
          setShowAddSupplement(false)
          setEditingSupplement(null)
          bumpCalendar()
        }}
      />
      <BadgesModal open={showBadges} onClose={() => setShowBadges(false)} theme={theme} />
      <AddScheduledBuyModal
        open={showAddBuyModal}
        onClose={() => setShowAddBuyModal(false)}
        theme={theme}
        onSave={(buy) => {
            setScheduledBuys(prev => [...prev, { ...buy, id: generateId() }]);
            setShowAddBuyModal(false);
        }}
      />
    </div>
  )
}

function ActionButton({ icon, label, theme, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200 hover:shadow-lg w-full"
      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="font-semibold">{label}</span>
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
            <h3 className="text-sm font-semibold mb-2" style={{color: theme.text}}>Latest</h3>
            <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-gray-50 border" style={{borderColor: theme.border}}>
                    <div className="text-xs text-gray-500">Weight</div>
                    <div className="text-base font-bold" style={{color: theme.text}}>{latest.weight || '-'} lbs</div>
                    {weightDiff !== null && (
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 ${weightDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {weightDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {weightDiff.toFixed(1)} lbs
                        </span>
                    )}
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border" style={{borderColor: theme.border}}>
                    <div className="text-xs text-gray-500">Body Fat</div>
                    <div className="text-base font-bold" style={{color: theme.text}}>{latest.bodyfat || '-'}%</div>
                        {fatDiff !== null && (
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 ${fatDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {fatDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {fatDiff.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                <MetricDisplay icon={<Bed size={14}/>} value={latest.sleep} label="Sleep" theme={theme} />
                <MetricDisplay icon={<Zap size={14}/>} value={latest.energy} label="Energy" theme={theme} />
                <MetricDisplay icon={<Smile size={14}/>} value={latest.mood} label="Mood" theme={theme} />
                <MetricDisplay icon={<ShieldAlert size={14}/>} value={latest.pain} label="Pain" theme={theme} />
            </div>
        </div>
    );
}

const MetricDisplay = ({ icon, value, label, theme }) => (
    <div className="p-2 rounded-lg bg-gray-50 border" style={{borderColor: theme.border}}>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-semibold text-sm" style={{color: theme.text}}>{value || '-'}</div>
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
