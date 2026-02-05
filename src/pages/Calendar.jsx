import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import CalendarHeader from '../components/calendar/CalendarHeader'
import MonthGrid, { toKey } from '../components/calendar/MonthGrid'
import { formatMMDDYYYY } from '../utils/date'
import WeekView from '../components/calendar/WeekView'
// Removed notes-only modal to avoid overlap; using DayView for all edits
import DayView from '../components/calendar/DayView'
import NotesModal from '../components/calendar/NotesModal'
import CalendarIconKey from '../components/calendar/CalendarIconKey'
import CalendarQuickEdit from '../components/calendar/CalendarQuickEdit'
import DayModal from '../components/calendar/DayModal'
import { calculateRecon } from '../utils/recon'
import { useAppContext } from '../context/AppContext'
import { getCalendarDone, toggleTaskCompletion, generateTaskId, isTaskCompleted } from '../utils/taskCompletion'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import { useFirebase } from '../context/FirebaseContext'
import { safeLocalStorageGet } from '../utils/dataBleedDiagnostic'
import InjectionSiteSelector from '../components/common/InjectionSiteSelector'
import { isInjectionSiteTrackingEnabled } from '../utils/injectionSiteSettings'
import { useHorizontalSwipe } from '../utils/useSwipeGesture'
import { 
  migrateCalendarNotesToIdBased, 
  getCalendarNoteText, 
  hasCalendarNotes as hasCalendarNotesUtil 
} from '../utils/calendarNotesMigration'

const protocolColors = ['info', 'success', 'primaryLight', 'warning'];
let colorIndex = 0;
const protocolColorMap = {};

function getProtocolColor(protocolName, theme) {
    if (!protocolColorMap[protocolName]) {
        protocolColorMap[protocolName] = theme[protocolColors[colorIndex % protocolColors.length]];
        colorIndex++;
    }
    return protocolColorMap[protocolName];
}

// Helper to safely parse YYYY-MM-DD strings into local time dates
function parseDateString(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(dateString); // Fallback for other formats
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
}

// Helper to normalize a date to midnight in local time for accurate day difference calculations
function normalizeToMidnight(date) {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Helper to calculate day difference between two dates (normalized to midnight)
function getDayDifference(date1, date2) {
    const normalized1 = normalizeToMidnight(date1);
    const normalized2 = normalizeToMidnight(date2);
    if (!normalized1 || !normalized2) return null;
    return Math.floor((normalized2 - normalized1) / (1000 * 60 * 60 * 24));
}

// Helper to normalize day names to short format (Mon, Tue, etc.)
// This ensures compatibility between stored day names (which may be full or short format)
// and the short format returned by toLocaleDateString
function normalizeDayName(day) {
    if (!day) return day;
    const dayMap = {
        'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu',
        'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun',
        'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed', 'thursday': 'Thu',
        'friday': 'Fri', 'saturday': 'Sat', 'sunday': 'Sun'
    };
    return dayMap[day] || day;
}

function getWindows(p) {
    try {
      if (!p?.startDate) return { start: null, end: null, washStart: null, washEnd: null }
      const startDt = parseDateString(p.startDate)
      let endDt = null;
      if (p.endDate) {
        endDt = parseDateString(p.endDate);
      } else if (p.duration && p.duration.noEnd !== true && Number(p.duration.count) > 0) {
          const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
          
          if (cyclePeptide) {
              const onDays = Number(cyclePeptide.frequency.onDays) || 0;
              const offDays = Number(cyclePeptide.frequency.offDays) || 0;
              if (onDays > 0) {
                  const durationInDays = (() => {
                      const count = Number(p.duration.count);
                      const unit = p.duration.unit.toLowerCase();
                      if (unit.includes('day')) return count;
                      if (unit.includes('week')) return count * 7;
                      if (unit.includes('month')) return count * 30;
                      return 0;
                  })();
                  const fullCycles = Math.floor(durationInDays / onDays);
                  const remainingOnDays = durationInDays % onDays;
                  let totalDays = fullCycles * (onDays + offDays);
                  if (remainingOnDays > 0) {
                      totalDays += remainingOnDays;
                  } else if (fullCycles > 0) {
                      totalDays -= offDays;
                  }
                  if (startDt) {
                    endDt = new Date(startDt);
                    endDt.setDate(endDt.getDate() + totalDays - 1);
                  }
              }
          } else {
            // Fallback for non-cycle protocols
            if (startDt) {
              endDt = new Date(startDt);
              const unit = String(p.duration.unit || 'week').toLowerCase();
              const count = Number(p.duration.count) || 0;
              if (unit.includes('day')) endDt.setDate(endDt.getDate() + count - 1);
              else if (unit.includes('week')) endDt.setDate(endDt.getDate() + (count * 7) - 1);
              else if (unit.includes('month')) { endDt.setMonth(endDt.getMonth() + count); endDt.setDate(endDt.getDate() - 1); }
            }
          }
      }

      let washStart = null, washEnd = null
      if (p.washout?.enabled && endDt) {
        try {
          washStart = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate() + 1)
          washEnd = new Date(washStart)
          const wUnit = String(p.washout.unit || 'week').toLowerCase()
          const wCount = Number(p.washout.count) || 0
          if (wCount > 0) {
            if (wUnit === 'day') washEnd.setDate(washEnd.getDate() + wCount - 1)
            else if (wUnit === 'week') washEnd.setDate(washEnd.getDate() + (wCount * 7) - 1)
            else if (wUnit === 'month') { washEnd.setMonth(washEnd.getMonth() + wCount); washEnd.setDate(washEnd.getDate() - 1) }
          } else { washStart = null; washEnd = null }
        } catch (e) {
          // If endDt is invalid, skip washout calculation
          washStart = null;
          washEnd = null;
        }
      }
      return { start: startDt, end: endDt, washStart, washEnd }
    } catch { return { start: null, end: null, washStart: null, washEnd: null } }
}

export default function Calendar() {
  const { theme } = useOutletContext()
  const { protocols, reconItems, supplements, orders, metrics, calendarNotes, updateCalendarNote, scheduledBuys } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const { firebaseUser } = useFirebase();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [goals, setGoals] = useState([]);
  
  // Load goals from localStorage with user validation
  useEffect(() => {
    if (!firebaseUser?.email) return;
    try {
      const savedGoals = safeLocalStorageGet('tpprover_goals', firebaseUser.email);
      if (savedGoals) {
        setGoals(savedGoals);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, [firebaseUser?.email]);
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState(() => {
    // Load default view from settings (settings are shared across accounts, so no validation needed)
    try {
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return settings.calendar?.defaultView || 'month';
    } catch {
      return 'month';
    }
  }) // 'month' | 'week'
  const [entries, setEntries] = useState({})
  const [activeDay, setActiveDay] = useState(null)
  const [editingNotesFor, setEditingNotesFor] = useState(null)
  const [dayModalDate, setDayModalDate] = useState(null) // For day modal in monthly view
  // scheduled structure: { [dateKey]: { peptides: string[], supplements: string[], buys: number } }
  const [scheduled, setScheduled] = useState({})
  const [done, setDone] = useState({})
  const [protocolTimelines, setProtocolTimelines] = useState([]);
  const [calendarBump, setCalendarBump] = useState(0);
  
  // Listen for task completion events to sync calendar views
  useEffect(() => {
    const handleTaskCompletionChange = (e) => {
      setCalendarBump(Date.now());
    };
    
    const handleCalendarSync = (e) => {
      setCalendarBump(Date.now());
    };
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    window.addEventListener('tpp:calendar-sync', handleCalendarSync);
    
    return () => {
      window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
      window.removeEventListener('tpp:calendar-sync', handleCalendarSync);
    };
  }, []);
  const [showIconKey, setShowIconKey] = useState(false);
  const [quickEditDate, setQuickEditDate] = useState(null);
  const [quickEditData, setQuickEditData] = useState(null);
  const [todayPulse, setTodayPulse] = useState(false);
  // Injection site tracking state for week view mark all done
  const [injectionTask, setInjectionTask] = useState(null);
  const [pendingInjectionTasks, setPendingInjectionTasks] = useState([]);
  const [pendingMarkAllContext, setPendingMarkAllContext] = useState(null); // { date, timeSlot, slotKey, allTaskIds }
  // Load persisted notes (entries) and done slots
  useEffect(() => {
    try { 
      const raw = localStorage.getItem('tpprover_calendar_notes'); 
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate to new ID-based format
        const migrated = migrateCalendarNotesToIdBased(parsed);
        setEntries(migrated);
        // Save migrated format back to localStorage
        localStorage.setItem('tpprover_calendar_notes', JSON.stringify(migrated));
      }
    } catch {}
    // Load done data from unified completion system
    setDone(getCalendarDone());
  }, [])

  // Define loadData function outside useEffect so it can be referenced elsewhere
  const loadData = React.useCallback(() => {
        try {
          // Debug logging for Android builds - log data availability
          const dataCheck = {
            protocols: protocols?.length || 0,
            supplements: supplements?.length || 0,
            reconItems: reconItems?.length || 0,
            scheduledBuys: scheduledBuys?.length || 0
          };
          
          
          const supps = supplements
          // Calculate date range based on view mode
          // For week view, include the full week (may span across months)
          // For month view, use the current month
          let start, end;
          if (viewMode === 'week') {
            // Calculate week start based on settings
            const weekStartsOn = (() => {
              try {
                const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
                return settings.region?.weekStartsOn || 'monday';
              } catch {
                return 'monday';
              }
            })();
            const d = new Date(currentDate);
            const day = d.getDay(); // 0=Sun..6=Sat
            if (weekStartsOn === 'sunday') {
              d.setDate(d.getDate() - day);
            } else {
              const iso = (day + 6) % 7; // 0=Mon..6=Sun
              d.setDate(d.getDate() - iso);
            }
            d.setHours(0, 0, 0, 0);
            start = new Date(d);
            end = new Date(d);
            end.setDate(end.getDate() + 6); // 7 days total (0-6)
          } else {
            // Month view: use full month range
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          }
          const next = {}
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayKey = d.toLocaleDateString('en-US', { weekday: 'short' })
            const daySupps = supps.filter(s => !s.days || s.days.length === 0 || s.days.includes(dayKey))
            
            // Debug logging removed - was causing excessive console output
            // Uncomment below for debugging if needed:
            // if (daySupps.length > 0) {
            //   console.log(`📅 Day ${d.getDate()} (${dayKey}): ${daySupps.length} supplements`);
            // }
            if (daySupps.length > 0) {
              const key = toKey(d)
              const bySlot = { ...(next[key]?.bySlot || {}) }
              for (const s of daySupps) {
                const slots = Array.isArray(s.schedule) && s.schedule.length > 0 ? s.schedule : (s.schedule === 'PM' ? ['PM'] : s.schedule === 'AM' ? ['AM'] : ['AM'])
                for (const slot of slots) {
                  bySlot[slot] = {
                    peptides: bySlot[slot]?.peptides || [],
                    supplements: [...(bySlot[slot]?.supplements || []), {
                      name: s.name || 'Supplement',
                      delivery: s.delivery || 'oral',
                      deliveryMethod: s.deliveryMethod || s.delivery || 'oral', // Match Dashboard structure
                      dose: s.dose
                    }],
                  }
                }
              }
              next[key] = {
                ...(next[key] || {}),
                supplements: Array(daySupps.length).fill('supp'),
                bySlot,
              }
            }
          }
          // Upcoming buys badges from Orders: mark orders with status 'Order Placed' within next N days
          const N = 7
          const today = new Date()
          const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + N)
          for (const o of orders) {
            if ((o.status || '') !== 'Order Placed' || !o.date) continue
            const od = parseDateString(o.date)
            // Add null check to prevent getTime() errors on Android
            if (!od) continue
            if (od >= today && od <= horizon) {
              const key = toKey(od)
              const label = (o.group && o.group.title) ? o.group.title : (o.peptide || 'Buy')
              next[key] = {
                ...(next[key] || {}),
                buys: (next[key]?.buys || 0) + 1,
                buyDetails: [ ...(Array.isArray(next[key]?.buyDetails) ? next[key].buyDetails : []), label ].slice(0, 3),
              }
            }
          }
          // Scheduled group buys: mark all days in [openDate, closeDate]
          // Use scheduledBuys from context instead of reading directly from localStorage
          // Additional safety filter: remove mock data if sample data was cleared
          const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
          const contextScheduledBuys = (scheduledBuys || []).filter(buy => {
            if (!sampleDataCleared) return true;
            // Filter by isMock flag
            if (buy.isMock) return false;
            // Filter by known mock vendors
            const mockVendors = ['BioTech Solutions', 'Peptide Research Co', 'Research Labs Pro'];
            if (mockVendors.includes(buy.vendor)) return false;
            // Filter by known mock IDs
            if (buy.id === 201 || buy.id === 202 || buy.id === 203) return false;
            // Filter by known mock item names
            const mockItems = ['Tirzepatide Bulk Order', 'BPC-157 Research Batch', 'Epithalon + Thymalin Stack'];
            if (mockItems.includes(buy.item)) return false;
            return true;
          });
          // Protocol indicators: count by time-of-day occurrences + wash-out chips
          const prots = protocols
          const metricsByKey = (metrics || []).reduce((map, m) => {
            try {
              const d = parseDateString(m.date)
              // Add null check to prevent getTime() errors on Android
              if (!d) return map
              const key = toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
              map[key] = m
            } catch {}
            return map
          }, {})

          const sortedMetrics = (metrics || []).sort((a, b) => new Date(a.date) - new Date(b.date));
          const metricsWithTrend = sortedMetrics.map((metric, index) => {
              if (index === 0) return { ...metric, weightTrend: 'none', bodyfatTrend: 'none' };
              const prev = sortedMetrics[index - 1];
              const weightTrend = parseFloat(metric.weight) > parseFloat(prev.weight) ? 'up' : parseFloat(metric.weight) < parseFloat(prev.weight) ? 'down' : 'none';
              const bodyfatTrend = parseFloat(metric.bodyfat) > parseFloat(prev.bodyfat) ? 'up' : parseFloat(metric.bodyfat) < parseFloat(prev.bodyfat) ? 'down' : 'none';
              return { ...metric, weightTrend, bodyfatTrend };
          });

          const metricsByKeyWithTrend = metricsWithTrend.reduce((map, m) => {
              try {
                  const d = new Date(m.date);
                  const key = toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                  map[key] = m;
              } catch {}
              return map;
          }, {});

          const timelines = prots.map(p => {
            const windows = getWindows(p);
            return {
                ...windows,
                id: p.id,
                name: p.protocolName || 'Unnamed Protocol',
                color: getProtocolColor(p.protocolName, theme),
            };
          }).filter(t => t.start);
          setProtocolTimelines(timelines);

          const getNormalizedPeptides = (p) => {
            const basePeptides = (Array.isArray(p.peptides) && p.peptides.length > 0)
              ? p.peptides
              : [{ name: p.name || p.peptide, dosage: p.dosage, frequency: p.frequency }]
            return basePeptides.map(pep => {
              const f = pep?.frequency || {}
              const type = f.type || 'daily'
              const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['AM']
              return { ...pep, frequency: { ...f, type, time } }
            })
          }

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = toKey(d)
            // Mark scheduled group buys covering this day
            for (const gb of contextScheduledBuys) {
              if (!gb?.openDate || !gb?.closeDate) continue
              const od = parseDateString(gb.openDate)
              const cd = parseDateString(gb.closeDate)
              // Add null checks to prevent getTime() errors on Android
              if (!od || !cd) continue
              const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
              if (dOnly >= new Date(od.getFullYear(), od.getMonth(), od.getDate()) && dOnly <= new Date(cd.getFullYear(), cd.getMonth(), cd.getDate())) {
                // Store full group buy object instead of just label to preserve vendor and other details
                next[key] = {
                  ...(next[key] || {}),
                  groupBuys: [ ...(next[key]?.groupBuys || []), gb ],
                }
              }
            }
            const activeProtoNames = new Set()
            const count = prots.reduce((acc, p) => {
              const { start: ps, end: pe } = getWindows(p)
              const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
              const psOnly = ps ? new Date(ps.getFullYear(), ps.getMonth(), ps.getDate()) : null
              const peOnly = pe ? new Date(pe.getFullYear(), pe.getMonth(), pe.getDate()) : null
              const inRange = (!psOnly || psOnly <= dOnly) && (!peOnly || peOnly >= dOnly)
              const active = p.active !== false
              
              if (!inRange || !active) return acc;
              if (p.protocolName) activeProtoNames.add(p.protocolName)

              const isBlended = (p.blendMode || '').toLowerCase() === 'blended' && Array.isArray(p.peptides) && p.peptides.length > 1;
              let dailyDoses = 0;

              if (isBlended) {
                  // For blended protocols, count as one task with shared frequency
                  const peptides = getNormalizedPeptides(p);
                  if (peptides.length > 0) {
                      const freq = peptides[0].frequency || {};
                      let isScheduledToday = false;
                      
                      // Skip if protocol start date is null
                      if (!ps) return acc;
                      const protocolStartDate = normalizeToMidnight(ps);
                      const currentDate = normalizeToMidnight(d);
                      // Add null checks to prevent getTime() errors on Android
                      if (!protocolStartDate || !currentDate) return acc;

                      switch (freq.type) {
                          case 'daily':
                              isScheduledToday = true;
                              break;
                          case 'weekly':
                              const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                              // Normalize stored days to short format for comparison
                              const normalizedDays = freq.days?.map(d => normalizeDayName(d)) || [];
                              if (normalizedDays.includes(dayName)) {
                                  isScheduledToday = true;
                              }
                              break;
                          case 'cycle':
                              // Parse onDays and offDays, handling both string and number formats
                              const on = Math.max(0, parseInt(String(freq.onDays || '0'), 10) || 0);
                              const off = Math.max(0, parseInt(String(freq.offDays || '0'), 10) || 0);
                              if (on > 0 && off >= 0) {
                                  const cycleLen = on + off;
                                  if (cycleLen > 0) {
                                      // CRITICAL: Calculate day difference using normalized dates
                                      // dayDiff = 0 means it's the start day (first "on" day)
                                      const dayDiff = getDayDifference(protocolStartDate, currentDate);
                                      if (dayDiff !== null && dayDiff >= 0) {
                                          // dayInCycle ranges from 0 to (cycleLen - 1)
                                          // 0 to (on-1) are "on" days, on to (cycleLen-1) are "off" days
                                          const dayInCycle = dayDiff % cycleLen;
                                          if (dayInCycle < on) {
                                              isScheduledToday = true;
                                          }
                                      }
                                  }
                              }
                              break;
                          case 'custom':
                              const customDays = Number(freq.customDays) || 1;
                              if (customDays > 0) {
                                  const dayDiff = getDayDifference(protocolStartDate, currentDate);
                                  if (dayDiff !== null && dayDiff >= 0 && dayDiff % customDays === 0) {
                                      isScheduledToday = true;
                                  }
                              }
                              break;
                          default:
                              break;
                      }

                      if (isScheduledToday) {
                          dailyDoses = (freq.time?.length || 1);
                      }
                  }
              } else {
                  // For separate protocols, count each peptide individually
                  getNormalizedPeptides(p).forEach(pep => {
                      const freq = pep.frequency || {};
                      let isScheduledToday = false;
                      
                      // Skip if protocol start date is null
                      if (!ps) return;
                      const protocolStartDate = normalizeToMidnight(ps);
                      const currentDate = normalizeToMidnight(d);
                      // Add null checks to prevent getTime() errors on Android
                      if (!protocolStartDate || !currentDate) return;

                      switch (freq.type) {
                          case 'daily':
                              isScheduledToday = true;
                              break;
                          case 'weekly':
                              const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                              // Normalize stored days to short format for comparison
                              const normalizedDays = freq.days?.map(d => normalizeDayName(d)) || [];
                              if (normalizedDays.includes(dayName)) {
                                  isScheduledToday = true;
                              }
                              break;
                          case 'cycle':
                              // Parse onDays and offDays, handling both string and number formats
                              const on = Math.max(0, parseInt(String(freq.onDays || '0'), 10) || 0);
                              const off = Math.max(0, parseInt(String(freq.offDays || '0'), 10) || 0);
                              if (on > 0 && off >= 0) {
                                  const cycleLen = on + off;
                                  if (cycleLen > 0) {
                                      // CRITICAL: Calculate day difference using normalized dates
                                      // dayDiff = 0 means it's the start day (first "on" day)
                                      const dayDiff = getDayDifference(protocolStartDate, currentDate);
                                      if (dayDiff !== null && dayDiff >= 0) {
                                          // dayInCycle ranges from 0 to (cycleLen - 1)
                                          // 0 to (on-1) are "on" days, on to (cycleLen-1) are "off" days
                                          const dayInCycle = dayDiff % cycleLen;
                                          if (dayInCycle < on) {
                                              isScheduledToday = true;
                                          }
                                      }
                                  }
                              }
                              break;
                          case 'custom':
                              const customDays = Number(freq.customDays) || 1;
                              if (customDays > 0) {
                                  const dayDiff = getDayDifference(protocolStartDate, currentDate);
                                  if (dayDiff !== null && dayDiff >= 0 && dayDiff % customDays === 0) {
                                      isScheduledToday = true;
                                  }
                              }
                              break;
                          default:
                              break;
                      }

                      if (isScheduledToday) {
                          dailyDoses += (pep.frequency?.time?.length || 1);
                      }
                  });
              }

              return acc + dailyDoses;
            }, 0)
            if (count > 0) {
              const bySlot = prots.reduce((obj, p) => {
                const { start: ps, end: pe } = getWindows(p)
                const dOnly2 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
                const psOnly2 = ps ? new Date(ps.getFullYear(), ps.getMonth(), ps.getDate()) : null
                const peOnly2 = pe ? new Date(pe.getFullYear(), pe.getMonth(), pe.getDate()) : null
                const inRange = (!psOnly2 || psOnly2 <= dOnly2) && (!peOnly2 || peOnly2 >= dOnly2)
                const active = p.active !== false
                if (inRange && active) {
                  const isBlended = (p.blendMode || '').toLowerCase() === 'blended' && Array.isArray(p.peptides) && p.peptides.length > 1
                  
                  const protocolPeptideNames = getNormalizedPeptides(p).map(p => (p.name || '').toLowerCase().trim()).sort();
                  const reconItem = reconItems.find(r => {
                      if (!r.peptides || r.peptides.length === 0) return false;
                      const reconPeptideNames = r.peptides.map(p => (p.name || '').toLowerCase().trim()).sort();
                      if (protocolPeptideNames.length === 0 || reconPeptideNames.length === 0) return false;
                      return protocolPeptideNames.length === reconPeptideNames.length && protocolPeptideNames.every((val, index) => val === reconPeptideNames[index]);
                  });

                  if (isBlended) {
                    const peptides = getNormalizedPeptides(p);
                    // Check if any peptide has unitValue (manual override)
                    const additionalUnits = peptides.find(pep => pep.unitValue)?.unitValue || '';
                    
                    // Build dose display from all peptides in the blend
                    const doseParts = peptides.map(pep => 
                        `${pep.name} ${pep.dosage?.amount || ''} ${pep.dosage?.unit || 'mcg'}`
                    );
                    
                    // For blended protocols, build dose display
                    const firstPeptide = peptides[0];
                    const baseDose = firstPeptide?.dosage?.amount || '';
                    const baseUnit = firstPeptide?.dosage?.unit || 'mcg';
                    
                    let dose = '';
                    let unit = '';
                    
                    // Priority: Protocol Manual unitValue > Recon Manual units > Calculated > Default dose/unit
                    if (additionalUnits && additionalUnits.trim() !== '') {
                        // User manually entered units in protocol - HIGHEST priority
                        dose = `${additionalUnits} units`;
                        unit = '';
                    } else if (reconItem) {
                        // Check for manual units in recon item first
                        if (reconItem.units && reconItem.units.trim() !== '') {
                            // User manually entered units in recon modal - SECOND priority
                            dose = `${reconItem.units} units`;
                            unit = '';
                        } else {
                            // No manual override, use calculated units if available
                            const totalDoseInMcg = reconItem.peptides.reduce((sum, pep) => {
                                const dose = Number(pep.dose) || 0;
                                return pep.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                            }, 0);
                            const totalMg = reconItem.peptides.reduce((sum, pep) => sum + (Number(pep.mg) || 0), 0);
                            const calc = calculateRecon({ ...reconItem, mg: totalMg, dose: totalDoseInMcg });
                            if (calc.unitsPerDose > 0) {
                                dose = `${calc.unitsPerDose.toFixed(0)} units`;
                                unit = '';
                            } else {
                                dose = `${baseDose} ${baseUnit}`;
                                unit = '';
                            }
                        }
                    } else {
                        dose = `${baseDose} ${baseUnit}`;
                        unit = '';
                    }

                    // For blended protocols, all peptides share the same frequency
                    // Get times from the first peptide only
                    const times = peptides.length > 0 ? (peptides[0].frequency?.time || ['AM']) : ['AM'];
                    
                    Array.from(times).forEach(t => {
                      // Use AM/PM format directly
                      const normalizedTimeSlot = t;
                      const currentSlot = obj[normalizedTimeSlot] || { peptides: [], supplements: [] }
                      let deliveryInfo = '';
                      if (reconItem?.deliveryMethod === 'pen') deliveryInfo = ' (Pen)';
                      if (reconItem?.deliveryMethod === 'syringe' || reconItem?.deliveryMethod === 'pipette') deliveryInfo = ' (Syringe)';
                      const peptideName = `${p.protocolName || 'Blended Protocol'} - ${dose}${deliveryInfo}`;

                      const peptideData = {
                          name: p.protocolName || 'Blended Protocol',
                          dose: dose,
                          unit: unit,
                          deliveryMethod: reconItem?.deliveryMethod || firstPeptide?.deliveryMethod || firstPeptide?.delivery || 'injection',
                          delivery: firstPeptide?.delivery || 'injection', // Also include delivery field for fallback
                          penColor: reconItem?.penColor || firstPeptide?.penColor,
                          penType: reconItem?.penType || firstPeptide?.penType,
                          protocolId: p.id,
                          peptideId: `${p.id}-blended`
                      };
                      if (!currentSlot.peptides.some(item => 
                          item.name === peptideData.name && 
                          item.protocolId === peptideData.protocolId &&
                          item.peptideId === peptideData.peptideId
                      )) {
                        obj[normalizedTimeSlot] = {
                          ...currentSlot,
                          peptides: [...currentSlot.peptides, peptideData],
                        }
                      }
                    })
                    return obj
                  }
                  getNormalizedPeptides(p).forEach((pep, pepIndex) => {
                      const freq = pep.frequency || {};
                      let isScheduledToday = false;
                      
                      // Skip if protocol start date is null
                      if (!ps) return;
                      const protocolStartDate = normalizeToMidnight(ps);
                      const currentDate = normalizeToMidnight(d);
                      // Add null checks to prevent getTime() errors on Android
                      if (!protocolStartDate || !currentDate) return;

                      switch (freq.type) {
                          case 'daily':
                              isScheduledToday = true;
                              break;
                          case 'weekly':
                              const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                              // Normalize stored days to short format for comparison
                              const normalizedDays = freq.days?.map(d => normalizeDayName(d)) || [];
                              if (normalizedDays.includes(dayName)) {
                                  isScheduledToday = true;
                              }
                              break;
                          case 'cycle':
                              // Parse onDays and offDays, handling both string and number formats
                              const on = Math.max(0, parseInt(String(freq.onDays || '0'), 10) || 0);
                              const off = Math.max(0, parseInt(String(freq.offDays || '0'), 10) || 0);
                              if (on > 0 && off >= 0) {
                                  const cycleLen = on + off;
                                  if (cycleLen > 0) {
                                      // CRITICAL: Calculate day difference using normalized dates
                                      // dayDiff = 0 means it's the start day (first "on" day)
                                      const dayDiff = getDayDifference(protocolStartDate, currentDate);
                                      if (dayDiff !== null && dayDiff >= 0) {
                                          // dayInCycle ranges from 0 to (cycleLen - 1)
                                          // 0 to (on-1) are "on" days, on to (cycleLen-1) are "off" days
                                          const dayInCycle = dayDiff % cycleLen;
                                          if (dayInCycle < on) {
                                              isScheduledToday = true;
                                          }
                                      }
                                  }
                              }
                              break;
                          case 'custom':
                              const customDays = Number(freq.customDays) || 1;
                              if (customDays > 0) {
                                  const dayDiff = getDayDifference(protocolStartDate, currentDate);
                                  if (dayDiff !== null && dayDiff >= 0 && dayDiff % customDays === 0) {
                                      isScheduledToday = true;
                                  }
                              }
                              break;
                          default:
                              break;
                      }

                      if (isScheduledToday) {
                          pep.frequency.time.forEach(t => {
                              // Use AM/PM format directly
                              const normalizedTimeSlot = t;
                              const currentSlot = obj[normalizedTimeSlot] || { peptides: [], supplements: [] };
                              
                              let dose = pep.dosage?.amount || '';
                              let unit = pep.dosage?.unit || '';
                              let additionalUnits = pep.unitValue || ''; // Get manual units value from peptide

                              // Priority: Protocol Manual unitValue > Recon Manual units > Calculated > Default dose/unit
                              if (additionalUnits && additionalUnits.trim() !== '') {
                                  // User manually entered units in protocol - HIGHEST priority
                                  dose = `${additionalUnits} units`;
                                  unit = '';
                              } else if (reconItem) {
                                  // Check for manual units in recon item first
                                  if (reconItem.units && reconItem.units.trim() !== '') {
                                      // User manually entered units in recon modal - SECOND priority
                                      dose = `${reconItem.units} units`;
                                      unit = '';
                                  } else {
                                      // No manual override, use calculated units if available
                                      const calc = calculateRecon({ 
                                          mg: reconItem.mg, 
                                          water: reconItem.water, 
                                          dose: pep.dosage?.unit === 'mg' ? (pep.dosage?.amount || 0) * 1000 : pep.dosage?.amount 
                                      });
                                      if (calc.unitsPerDose > 0) {
                                          dose = `${calc.unitsPerDose.toFixed(0)} units`;
                                          unit = '';
                                      } else {
                                          dose = `${dose} ${unit}`;
                                          unit = '';
                                      }
                                  }
                              } else {
                                  // No recon item, use default dose/unit
                                  dose = `${dose} ${unit}`;
                                  unit = '';
                              }

                              let deliveryInfo = '';
                              if (reconItem?.deliveryMethod === 'pen') deliveryInfo = ' (Pen)';
                              if (reconItem?.deliveryMethod === 'syringe' || reconItem?.deliveryMethod === 'pipette') deliveryInfo = ' (Syringe)';

                              const peptideName = `${pep.name || 'Peptide'} - ${dose}${deliveryInfo}`;

                              const peptideData = {
                                  name: pep.name || 'Peptide',
                                  dose: dose,
                                  unit: unit,
                                  deliveryMethod: reconItem?.deliveryMethod || pep.deliveryMethod || pep.delivery || 'injection',
                                  delivery: pep.delivery || 'injection', // Also include delivery field for fallback
                                  penColor: reconItem?.penColor || pep.penColor,
                                  penType: reconItem?.penType || pep.penType,
                                  protocolId: p.id,
                                  peptideId: pep.id || `peptide-${pepIndex}` // Match calendarTasks.js for same task IDs as Today's Research
                              };
                              
                              if (!currentSlot.peptides.some(item => 
                                  item.name === peptideData.name && 
                                  item.protocolId === peptideData.protocolId &&
                                  item.peptideId === peptideData.peptideId
                              )) {
                                obj[normalizedTimeSlot] = {
                                    ...currentSlot,
                                    peptides: [...currentSlot.peptides, peptideData],
                                };
                              }
                          });
                      }
                  });
                }
                return obj
              }, (next[key]?.bySlot || {}))

              const times = Object.keys(bySlot).reduce((acc, slot) => {
                acc[slot] = (bySlot[slot]?.peptides?.length || 0)
                return acc
              }, {})

              // compute day completion (all scheduled done)
              const doneForDay = done[key] || {}
              const maxTotal = Object.values(times).reduce((a, b) => a + (b || 0), 0)
              const doneTotal = Object.values(doneForDay).reduce((a, b) => a + (b || 0), 0)
              const doneAll = maxTotal > 0 && doneTotal >= maxTotal

              // Merge bySlot data carefully instead of overwriting
              const existingBySlot = next[key]?.bySlot || {};
              const mergedBySlot = { ...existingBySlot };
              for (const slot in bySlot) {
                  const existingPeptides = mergedBySlot[slot]?.peptides || [];
                  const newPeptides = bySlot[slot]?.peptides || [];
                  const existingSupplements = mergedBySlot[slot]?.supplements || [];
                  const newSupplements = bySlot[slot]?.supplements || [];
                  
                  // Remove duplicates by checking name property
                  const uniquePeptides = [...existingPeptides];
                  newPeptides.forEach(newPep => {
                      if (!uniquePeptides.some(existing => existing.name === newPep.name)) {
                          uniquePeptides.push(newPep);
                      }
                  });
                  
                  const uniqueSupplements = [...existingSupplements];
                  newSupplements.forEach(newSup => {
                      if (!uniqueSupplements.some(existing => existing.name === newSup.name)) {
                          uniqueSupplements.push(newSup);
                      }
                  });
                  
                  mergedBySlot[slot] = {
                      peptides: uniquePeptides,
                      supplements: uniqueSupplements,
                  };
              }

              next[key] = { ...(next[key] || {}), times, bySlot: mergedBySlot, done: doneForDay, doneAll, protocols: Array.from(activeProtoNames) }
            }
            // Ensure supplement data is preserved even if there are no protocols for a day
            if (!next[key]?.supplements && scheduled[key]?.supplements) {
                next[key] = { ...next[key], supplements: scheduled[key].supplements };
            }
            
            // Wash-out chips
            for (const p of prots) {
              const { washStart, washEnd } = getWindows(p)
              if (washStart && washEnd) {
                const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
                if (dOnly >= new Date(washStart.getFullYear(), washStart.getMonth(), washStart.getDate()) && dOnly <= new Date(washEnd.getFullYear(), washEnd.getMonth(), washEnd.getDate())) {
                  next[key] = { ...(next[key] || {}), washout: [ ...(next[key]?.washout || []), (p.protocolName || 'Protocol') ] }
                }
              }
            }
            // Scheduled Group Buys (duplicate check - already handled above, but keeping for compatibility)
            const dayBuys = contextScheduledBuys.filter(b => {
                if (!b?.openDate || !b?.closeDate) return false;
                const open = parseDateString(b.openDate);
                const close = parseDateString(b.closeDate);
                // Add null checks to prevent getTime() errors on Android
                if (!open || !close) return false;
                const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                return dOnly >= open && dOnly <= close;
            });
            if (dayBuys.length > 0) {
                // Store full group buy objects instead of just item names
                const existingGroupBuys = next[key]?.groupBuys || [];
                const existingIds = new Set(existingGroupBuys.map(gb => typeof gb === 'object' ? gb.id : null).filter(Boolean));
                const newBuys = dayBuys.filter(b => !existingIds.has(b.id));
                if (newBuys.length > 0) {
                    next[key] = { ...(next[key] || {}), groupBuys: [...existingGroupBuys, ...newBuys] };
                }
            }
          }
          // Group buys: mark any order with .group that falls on this month (for subtle count in month header)
          for (const o of orders) {
            if (!o.group || !o.date) continue
            const od = parseDateString(o.date)
            // Add null check to prevent getTime() errors on Android
            if (!od) continue
            if (od.getMonth() === currentDate.getMonth() && od.getFullYear() === currentDate.getFullYear()) {
              const key = toKey(od)
              // Store order object with group buy info to preserve vendor and other details
              const groupBuyObj = {
                item: (o.group && (o.group.title || o.group.name)) || o.peptide || o.item || 'Group Buy',
                vendor: o.vendor || o.seller || o.source || '',
                price: o.cost ?? o.price ?? o.amount ?? '',
                openDate: o.date,
                closeDate: o.date,
                location: o.location,
                participants: o.group?.participants,
                notes: o.group?.notes || o.notes,
                source: 'orders',
                orderId: o.id
              };
              // Check if this group buy already exists (avoid duplicates)
              const existingGroupBuys = next[key]?.groupBuys || [];
              const isDuplicate = existingGroupBuys.some(gb => 
                typeof gb === 'object' && gb.orderId === o.id
              );
              if (!isDuplicate) {
                next[key] = { ...(next[key] || {}), groupBuys: [ ...existingGroupBuys, groupBuyObj ] };
              }
            }
          }
          // Attach metrics if present for each day key
          for (const k of Object.keys(next)) {
            if (metricsByKeyWithTrend[k]) {
              next[k] = { ...(next[k] || {}), metrics: metricsByKeyWithTrend[k] }
            }
          }

          // Add goals to calendar data
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = toKey(d);
            const dayGoals = goals.filter(goal => {
              if (!goal.dueDate) return false;
              const goalDate = new Date(goal.dueDate);
              return goalDate.getFullYear() === d.getFullYear() && 
                     goalDate.getMonth() === d.getMonth() && 
                     goalDate.getDate() === d.getDate();
            });
            
            if (dayGoals.length > 0) {
              next[key] = {
                ...(next[key] || {}),
                goals: dayGoals
              };
            }
          }

          // Force complete refresh instead of merging to prevent stale data
          // Debug logging to help diagnose missing scheduled tasks
          const scheduledKeys = Object.keys(next);
          const keysWithTasks = scheduledKeys.filter(k => {
            const dayData = next[k];
            return (dayData?.bySlot && Object.keys(dayData.bySlot).length > 0) || 
                   (dayData?.peptides && dayData.peptides.length > 0) ||
                   (dayData?.supplements && dayData.supplements.length > 0);
          });
          if (keysWithTasks.length > 0) {
          }
          setScheduled(next)
        } catch (e) {
          console.error('[Calendar Debug] Error in loadData:', e);
          console.error('Error stack:', e.stack);
        }
  }, [currentDate, done, protocols, reconItems, supplements, orders, metrics, theme, scheduledBuys, calendarBump, goals, viewMode]);

  useEffect(() => {
    loadData(); // Initial load
  }, [loadData]);

  // Debug: Monitor data availability and log when it changes
  useEffect(() => {
    const dataStatus = {
      protocols: protocols?.length || 0,
      supplements: supplements?.length || 0,
      reconItems: reconItems?.length || 0,
      scheduledBuys: scheduledBuys?.length || 0,
      scheduledKeys: Object.keys(scheduled || {}).length
    };
    
    // Log when data becomes available (especially useful for Android debugging)
    if (dataStatus.protocols > 0 || dataStatus.supplements > 0) {
      // Data is available - calendar should render properly
    }
  }, [protocols, supplements, reconItems, scheduledBuys, scheduled]);

  // Force calendar refresh when data becomes available (Android fix)
  useEffect(() => {
    // If we have protocols or supplements but no scheduled data, force a refresh
    const hasData = (protocols?.length > 0 || supplements?.length > 0);
    const hasScheduled = Object.keys(scheduled).length > 0;
    
    if (hasData && !hasScheduled) {
      setCalendarBump(prev => prev + 1);
      // Also trigger loadData directly
      setTimeout(() => {
        loadData();
      }, 100);
    }
  }, [protocols?.length, supplements?.length, scheduled]);

  // Task completion handler - unified with Dashboard

  const handleTaskToggle = React.useCallback((task, date = new Date()) => {
    // Check if this is a syringe or pen delivery method
    const deliveryMethod = task.deliveryMethod || task.delivery;
    const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
    
        // Injection confirmation is now handled inline in the task components
    
    const dateKey = toKey(date);
    const taskId = task.stableTaskId || generateTaskId(task);
    // Always check actual completion status from localStorage
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
    
    // Refresh calendar data to reflect changes
    setDone(getCalendarDone());
    setCalendarBump(Date.now());
  }, []);

  // Handle marking all tasks as done for a time slot in week view
  const handleMarkAllDone = React.useCallback((date, timeSlot, scheduled) => {
    const dateKey = toKey(date);
    const slotKey = timeSlot === 'AM' ? 'AM' : 'PM';
    const taskIds = [];

    // Collect all task IDs for this slot
    if (scheduled.peptides) {
      scheduled.peptides.forEach(peptide => {
        const task = {
          type: 'peptide',
          name: peptide.name,
          dose: peptide.dose || '',
          unit: peptide.unit || '',
          time: slotKey,
          protocolId: peptide.protocolId,
          peptideId: peptide.peptideId
        };
        taskIds.push(generateTaskId(task));
      });
    }

    if (scheduled.supplements) {
      scheduled.supplements.forEach(supplement => {
        const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
        const task = {
          type: 'supplement',
          name: suppData.name,
          dose: suppData.dose || '',
          unit: '',
          time: slotKey
        };
        taskIds.push(generateTaskId(task));
      });
    }

    // Check for injection tasks
    const injectionTasks = [];
    
    if (scheduled.peptides) {
      scheduled.peptides.forEach(peptide => {
        const deliveryMethod = peptide.deliveryMethod || peptide.delivery;
        const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
        if (isInjection) {
          injectionTasks.push({ ...peptide, time: slotKey, type: 'peptide' });
        }
      });
    }
    
    if (scheduled.supplements) {
      scheduled.supplements.forEach(supplement => {
        const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
        const deliveryMethod = suppData.deliveryMethod || suppData.delivery;
        const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
        if (isInjection) {
          injectionTasks.push({ ...suppData, time: slotKey, type: 'supplement' });
        }
      });
    }

    // If there are injection tasks and tracking is enabled, show injection site selector for each one
    if (injectionTasks.length > 0 && isInjectionSiteTrackingEnabled()) {
      // Store context for completing all tasks after injection flow
      setPendingMarkAllContext({ date, timeSlot, slotKey, allTaskIds: taskIds });
      setPendingInjectionTasks(injectionTasks);
      setInjectionTask(injectionTasks[0]); // Start with first injection task
      return; // Don't complete tasks yet, wait for injection site selection
    }

    // Mark all tasks as completed (no injection tasks or tracking disabled)
    taskIds.forEach(taskId => {
      toggleTaskCompletion(taskId, true, dateKey, slotKey);
    });

    // CRITICAL: Update protection timestamp to prevent listener from overwriting
    try {
      const now = Date.now();
      localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
    } catch (e) {
      console.warn('⚠️ Failed to save task toggle protection timestamp:', e);
    }

    // Refresh calendar data
    setDone(getCalendarDone());
    setCalendarBump(Date.now());
  }, []);

  // Handle injection site confirmation for week view mark all done
  const handleInjectionConfirm = React.useCallback((injectionSite) => {
    if (injectionSite && injectionSite.trim()) {
      // Injection site recorded (handled by InjectionSiteSelector)
    }
    
    // Complete the current injection task
    if (injectionTask && pendingMarkAllContext) {
      const { date, slotKey } = pendingMarkAllContext;
      const dateKey = toKey(date);
      
      // Build proper task object for taskId generation (MUST include protocolId/peptideId for correct matching)
      const task = {
        type: injectionTask.type || (injectionTask.deliveryMethod ? 'peptide' : 'supplement'),
        name: injectionTask.name,
        dose: injectionTask.dose || '',
        unit: injectionTask.unit || '',
        time: slotKey,
        protocolId: injectionTask.protocolId,
        peptideId: injectionTask.peptideId
      };
      
      const taskId = generateTaskId(task);
      
      // Mark this injection task as completed
      toggleTaskCompletion(taskId, true, dateKey, slotKey);
      
      // CRITICAL: Update protection timestamp
      try {
        const now = Date.now();
        localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
      } catch (e) {
        console.warn('⚠️ Failed to save task toggle protection timestamp:', e);
      }
    }
    
    // Move to next injection task or finish
    if (Array.isArray(pendingInjectionTasks) && pendingInjectionTasks.length > 1) {
      const remainingTasks = pendingInjectionTasks.slice(1);
      setPendingInjectionTasks(remainingTasks);
      setInjectionTask(remainingTasks[0]);
    } else {
      // All injection tasks completed - now complete ALL remaining tasks
      const context = pendingMarkAllContext;
      if (context) {
        const dateKey = toKey(context.date);
        
        // Complete all tasks (both injection and non-injection)
        context.allTaskIds.forEach(taskId => {
          // Check if already completed (injection tasks were already done)
          const isCompleted = isTaskCompleted(taskId, dateKey, context.slotKey);
          if (!isCompleted) {
            toggleTaskCompletion(taskId, true, dateKey, context.slotKey);
          }
        });
        
        // CRITICAL: Update protection timestamp
        try {
          const now = Date.now();
          localStorage.setItem('tpprover_protocols_lastUpdate', String(now));
        } catch (e) {
          console.warn('⚠️ Failed to save task toggle protection timestamp:', e);
        }
        
        setPendingMarkAllContext(null);
      }
      
      // Clean up injection state
      setInjectionTask(null);
      setPendingInjectionTasks([]);
      
      // Refresh calendar data
      setDone(getCalendarDone());
      setCalendarBump(Date.now());
    }
  }, [injectionTask, pendingInjectionTasks, pendingMarkAllContext]);

  // Handle injection site cancellation for week view
  const handleInjectionCancel = React.useCallback(() => {
    // Cancel doesn't complete tasks - just clear the injection flow
    setInjectionTask(null);
    setPendingInjectionTasks([]);
    setPendingMarkAllContext(null);
  }, []);


  // Listen for task completion changes from other views
  useEffect(() => {
    const handleTaskCompletionChange = (event) => {
      const { taskId, completed, date, timeSlot } = event.detail;
      
      // Refresh calendar data to reflect changes from other views
      setDone(getCalendarDone());
      setCalendarBump(Date.now());
    };

    // Event listeners are handled in the earlier useEffect
  }, []);

  // Expose refresh function globally for debugging
  useEffect(() => {
    window.refreshCalendar = loadData;
    window.debugSupplements = () => {
      const supps = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]');
      return { localStorage: supps, state: supplements, scheduled: Object.keys(scheduled || {}).length };
    };
    return () => { 
      delete window.refreshCalendar; 
      delete window.debugSupplements;
    };
  }, [supplements, scheduled]);

  // Listen for calendar bump events from other components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tpprover_calendar_bump') {
        setCalendarBump(Date.now());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  useEffect(() => { try { localStorage.setItem('tpprover_calendar_notes', JSON.stringify(entries)) } catch {} }, [entries])
  useEffect(() => { try { localStorage.setItem('tpprover_calendar_done', JSON.stringify(done)) } catch {} }, [done])
  // seed buys from dashboard-like state (dummy). Integration will come later.
  // scheduled example usage: setScheduled(prev => ({ ...prev, [someKey]: { ...(prev[someKey]||{}), buys: 2 } }))

  // Auto indicators based on Supplements (Research) and Protocols (placeholder for now)
  // Read supplements saved in local storage by Research page (if any)
  

  const toggleSlot = (dateObj, slot) => {
    const key = toKey(dateObj)
    const times = scheduled[key]?.times || {}
    const max = times[slot] || 0
    if (max === 0) return
    setDone(prev => {
      const current = prev[key]?.[slot] || 0
      const nextVal = current + 1 > max ? 0 : current + 1
      return { ...prev, [key]: { ...(prev[key] || {}), [slot]: nextVal } }
    })
  }

  const weekStart = useMemo(() => {
    // Get week starts on setting
    const weekStartsOn = (() => {
      try {
        const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
        return settings.region?.weekStartsOn || 'monday';
      } catch {
        return 'monday';
      }
    })();
    
    const d = new Date(currentDate);
    const day = d.getDay(); // 0=Sun..6=Sat
    
    if (weekStartsOn === 'sunday') {
      // Sunday is day 0, subtract to get to this Sunday
      d.setDate(d.getDate() - day);
    } else {
      // Monday is day 1, iso = (day + 6) % 7 converts 0=Sun..6=Sat to 0=Mon..6=Sun
      const iso = (day + 6) % 7; // 0=Mon..6=Sun
      d.setDate(d.getDate() - iso);
    }
    
    return d;
  }, [currentDate])

  const handleSaveDay = (text) => {
    if (!activeDay) return
    const key = toKey(activeDay);
    // Use updateCalendarNote from context which now handles ID-based structure
    updateCalendarNote(key, text);
    setActiveDay(null)
  }

  const handleSaveNotes = (text) => {
      if (isReadOnly) {
        setShowUpgradeModal(true);
        return;
      }
      if (!editingNotesFor) return;
      const key = toKey(editingNotesFor);
      // Use updateCalendarNote from context which now handles ID-based structure
      updateCalendarNote(key, text);
  }

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      // Navigate to same day in previous month (or last day if that day doesn't exist)
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
      setCurrentDate(prevMonth);
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      // Navigate to same day in next month (or last day if that day doesn't exist)
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
      setCurrentDate(nextMonth);
    }
  };

  // Safety check - don't render if theme is not available (after all hooks)
  if (!theme) {
    return null;
  }

  // Swipe gesture handlers for calendar navigation
  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    minSwipeDistance: 60,
    maxSwipeTime: 400
  });

  return (
    <section className="flex flex-col h-full">
      <CalendarHeader
        currentDate={currentDate}
        weekStart={weekStart}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={() => {
          setCurrentDate(new Date());
          setTodayPulse(true);
          // Reset pulse after animation
          setTimeout(() => setTodayPulse(false), 2000);
        }}
        viewMode={viewMode}
        onChangeView={setViewMode}
        onShowIconKey={() => setShowIconKey(true)}
        theme={theme}
      />
      <div 
        className="rounded p-4 content-card flex-1" 
        style={{ 
          border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
          backgroundColor: theme.cardBackground 
        }}
        {...swipeHandlers}
      >
        {viewMode === 'month' ? (
          <MonthGrid
            date={currentDate}
            entries={entries}
            scheduled={scheduled}
            theme={theme}
            calendarBump={calendarBump}
            todayPulse={todayPulse}
            onDayClick={(d) => {
              if (!d) return
              // Open day modal to show all details like weekly view
              setDayModalDate(d)
            }}
          />
        ) : (
          <div className="space-y-2">
            <WeekView 
              startDate={weekStart} 
              entries={entries} 
              scheduled={scheduled} 
              theme={theme} 
              calendarBump={calendarBump}
              onDayClick={(date) => {
                // Check if the day has scheduled tasks - if so, open quick edit
                const dayKey = toKey(date);
                const dayScheduled = scheduled[dayKey];
                if (dayScheduled && dayScheduled.bySlot && Object.keys(dayScheduled.bySlot).length > 0) {
                  setQuickEditDate(dayKey);
                  setQuickEditData(dayScheduled);
                } else {
                  setActiveDay(date);
                }
              }} 
              onNotesClick={setEditingNotesFor}
              onTaskToggle={handleTaskToggle}
              onMarkAllDone={handleMarkAllDone}
            />
          </div>
        )}
      </div>

      <NotesModal
          open={!!editingNotesFor}
          onClose={() => setEditingNotesFor(null)}
          theme={theme}
          notes={editingNotesFor ? getCalendarNoteText(entries, toKey(editingNotesFor)) : ''}
          onSave={handleSaveNotes}
      />

      {/* Calendar Quick Edit Modal */}
      {quickEditDate && quickEditData && (
        <CalendarQuickEdit
          date={quickEditDate}
          scheduledData={quickEditData}
          theme={theme}
          onClose={() => {
            setQuickEditDate(null);
            setQuickEditData(null);
          }}
          onTasksUpdated={() => {
            // Refresh calendar data when tasks are updated
            setDone(getCalendarDone());
            setCalendarBump(Date.now());
          }}
        />
      )}
      
      <CalendarIconKey 
        theme={theme}
        isVisible={showIconKey}
        onClose={() => setShowIconKey(false)}
      />

      {/* Day Modal for monthly view */}
      {dayModalDate && (
        <DayModal
          date={dayModalDate}
          entries={entries}
          scheduled={scheduled}
          theme={theme}
          onClose={() => setDayModalDate(null)}
          onNotesClick={setEditingNotesFor}
          onTaskToggle={handleTaskToggle}
          onMarkAllDone={handleMarkAllDone}
          calendarBump={calendarBump}
        />
      )}

      {/* Injection Site Selector for week view mark all done */}
      <InjectionSiteSelector
        taskName={injectionTask?.name}
        task={injectionTask}
        onConfirm={handleInjectionConfirm}
        onCancel={handleInjectionCancel}
        theme={theme}
        isVisible={!!injectionTask}
      />

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        actionAttempted="add notes to calendar"
        theme={theme}
      />
    </section>
  )
}


