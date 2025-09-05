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
import { calculateRecon } from '../utils/recon'
import { useAppContext } from '../context/AppContext'

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
                  endDt = new Date(startDt);
                  endDt.setDate(endDt.getDate() + totalDays - 1);
              }
          } else {
            // Fallback for non-cycle protocols
            endDt = new Date(startDt);
            const unit = String(p.duration.unit || 'week').toLowerCase();
            const count = Number(p.duration.count) || 0;
            if (unit.includes('day')) endDt.setDate(endDt.getDate() + count - 1);
            else if (unit.includes('week')) endDt.setDate(endDt.getDate() + (count * 7) - 1);
            else if (unit.includes('month')) { endDt.setMonth(endDt.getMonth() + count); endDt.setDate(endDt.getDate() - 1); }
          }
      }

      let washStart = null, washEnd = null
      if (p.washout?.enabled && endDt) {
        washStart = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate() + 1)
        washEnd = new Date(washStart)
        const wUnit = String(p.washout.unit || 'week').toLowerCase()
        const wCount = Number(p.washout.count) || 0
        if (wCount > 0) {
          if (wUnit === 'day') washEnd.setDate(washEnd.getDate() + wCount - 1)
          else if (wUnit === 'week') washEnd.setDate(washEnd.getDate() + (wCount * 7) - 1)
          else if (wUnit === 'month') { washEnd.setMonth(washEnd.getMonth() + wCount); washEnd.setDate(washEnd.getDate() - 1) }
        } else { washStart = null; washEnd = null }
      }
      return { start: startDt, end: endDt, washStart, washEnd }
    } catch { return { start: null, end: null, washStart: null, washEnd: null } }
}

export default function Calendar() {
  const { theme } = useOutletContext()
  const { protocols, reconItems, supplements, orders, metrics, calendarNotes, updateCalendarNote, scheduledBuys } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
  const [entries, setEntries] = useState({})
  const [activeDay, setActiveDay] = useState(null)
  const [editingNotesFor, setEditingNotesFor] = useState(null)
  // scheduled structure: { [dateKey]: { peptides: string[], supplements: string[], buys: number } }
  const [scheduled, setScheduled] = useState({})
  const [done, setDone] = useState({})
  const [protocolTimelines, setProtocolTimelines] = useState([]);
  // Load persisted notes (entries) and done slots
  useEffect(() => {
    try { const raw = localStorage.getItem('tpprover_calendar_notes'); if (raw) setEntries(JSON.parse(raw)) } catch {}
    try { const rawDone = localStorage.getItem('tpprover_calendar_done'); if (rawDone) setDone(JSON.parse(rawDone)) } catch {}
  }, [])

  useEffect(() => {
    // This effect will now handle reloading protocol and supplement data when the calendar bump event occurs.
    const loadData = () => {
        try {
          const supps = supplements
          // For the current month, mark days with supplement counts
          const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          const next = {}
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayKey = d.toLocaleDateString('en-US', { weekday: 'short' })
            const daySupps = supps.filter(s => !s.days || s.days.length === 0 || s.days.includes(dayKey))
            if (daySupps.length > 0) {
              const key = toKey(d)
              const bySlot = { ...(next[key]?.bySlot || {}) }
              for (const s of daySupps) {
                const slots = Array.isArray(s.schedule) ? s.schedule : (s.schedule === 'PM' ? ['Evening'] : s.schedule === 'AM' ? ['Morning'] : ['Morning','Evening'])
                for (const slot of slots) {
                  bySlot[slot] = {
                    peptides: bySlot[slot]?.peptides || [],
                    supplements: [...(bySlot[slot]?.supplements || []), s.name || 'Supplement'],
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
            if (od >= today && od <= horizon) {
              const key = toKey(od)
              const label = (o.group && o.group.title) ? o.group.title : (o.peptide || 'Buy')
              next[key] = {
                ...(next[key] || {}),
                buys: (next[key]?.buys || 0) + 1,
                buyDetails: [ ...(next[key]?.buyDetails || []), label ].slice(0, 3),
              }
            }
          }
          // Scheduled group buys: mark all days in [openDate, closeDate]
          const rawScheduled = localStorage.getItem('tpprover_scheduled_buys')
          const scheduledBuys = rawScheduled ? JSON.parse(rawScheduled) : []
          // Protocol indicators: count by time-of-day occurrences + wash-out chips
          const prots = protocols
          const metricsByKey = (metrics || []).reduce((map, m) => {
            try {
              const d = parseDateString(m.date)
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
              const time = Array.isArray(f.time) && f.time.length > 0 ? f.time : ['Morning']
              return { ...pep, frequency: { ...f, type, time } }
            })
          }

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = toKey(d)
            // Mark scheduled group buys covering this day
            for (const gb of scheduledBuys) {
              if (!gb?.openDate || !gb?.closeDate) continue
              const od = parseDateString(gb.openDate)
              const cd = parseDateString(gb.closeDate)
              const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
              if (dOnly >= new Date(od.getFullYear(), od.getMonth(), od.getDate()) && dOnly <= new Date(cd.getFullYear(), cd.getMonth(), cd.getDate())) {
                const label = gb.item || 'Group Buy'
                next[key] = {
                  ...(next[key] || {}),
                  groupBuys: [ ...(next[key]?.groupBuys || []), label ],
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

              let dailyDoses = 0;

              getNormalizedPeptides(p).forEach(pep => {
                  const freq = pep.frequency || {};
                  let isScheduledToday = false;
                  
                  // Adjust for timezone when comparing dates
                  const protocolStartDate = new Date(ps.getTime() + ps.getTimezoneOffset() * 60000);
                  const currentDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);

                  switch (freq.type) {
                      case 'daily':
                          isScheduledToday = true;
                          break;
                      case 'weekly':
                          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                          if (freq.days?.includes(dayName)) {
                              isScheduledToday = true;
                          }
                          break;
                      case 'cycle':
                          const on = Number(freq.onDays) || 0;
                          const off = Number(freq.offDays) || 0;
                          if (on > 0) {
                              const cycleLen = on + off;
                              const dayDiff = Math.floor((currentDate - protocolStartDate) / (1000 * 60 * 60 * 24));
                              if (dayDiff >= 0) {
                                  const dayInCycle = dayDiff % cycleLen;
                                  if (dayInCycle < on) {
                                      isScheduledToday = true;
                                  }
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
                    const times = new Set()
                    let doseDisplay = ""
                    
                    if (reconItem) {
                        const totalDoseInMcg = reconItem.peptides.reduce((sum, pep) => {
                            const dose = Number(pep.dose) || 0;
                            return pep.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                        }, 0);
                        const totalMg = reconItem.peptides.reduce((sum, pep) => sum + (Number(pep.mg) || 0), 0);
                        const calc = calculateRecon({ ...reconItem, mg: totalMg, dose: totalDoseInMcg });
                        if (calc.unitsPerDose > 0) {
                            doseDisplay = ` - ${calc.unitsPerDose.toFixed(0)} units`;
                        }
                    } else {
                        const doseParts = [];
                        getNormalizedPeptides(p).forEach(pep => { 
                            doseParts.push(`${pep.name} ${pep.dosage?.amount || ''} ${pep.dosage?.unit || 'mcg'}`);
                        })
                        doseDisplay = `: ${doseParts.join(' + ')}`;
                    }

                    getNormalizedPeptides(p).forEach(pep => { 
                        (pep.frequency?.time || ['Morning']).forEach(t => times.add(t));
                    })
                    
                    Array.from(times).forEach(t => {
                      const currentSlot = obj[t] || { peptides: [], supplements: [] }
                      let deliveryInfo = '';
                      if (reconItem?.deliveryMethod === 'pen') deliveryInfo = ' (Pen)';
                      if (reconItem?.deliveryMethod === 'syringe') deliveryInfo = ' (Syringe)';
                      const peptideName = `${p.protocolName || 'Blended Protocol'}${doseDisplay}${deliveryInfo}`;
                      const peptideData = {
                          name: `${p.protocolName || 'Blended Protocol'}${doseDisplay}`,
                          deliveryMethod: reconItem?.deliveryMethod,
                          penColor: reconItem?.penColor
                      };
                      if (!currentSlot.peptides.some(item => item.name === peptideData.name)) {
                        obj[t] = {
                          ...currentSlot,
                          peptides: [...currentSlot.peptides, peptideData],
                        }
                      }
                    })
                    return obj
                  }
                  getNormalizedPeptides(p).forEach(pep => {
                      const freq = pep.frequency || {};
                      let isScheduledToday = false;
                      
                      const protocolStartDate = new Date(ps.getTime() + ps.getTimezoneOffset() * 60000);
                      const currentDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);

                      switch (freq.type) {
                          case 'daily':
                              isScheduledToday = true;
                              break;
                          case 'weekly':
                              const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                              if (freq.days?.includes(dayName)) {
                                  isScheduledToday = true;
                              }
                              break;
                          case 'cycle':
                              const on = Number(freq.onDays) || 0;
                              const off = Number(freq.offDays) || 0;
                              if (on > 0) {
                                  const cycleLen = on + off;
                                  const dayDiff = Math.floor((currentDate - protocolStartDate) / (1000 * 60 * 60 * 24));
                                  if (dayDiff >= 0) {
                                      const dayInCycle = dayDiff % cycleLen;
                                      if (dayInCycle < on) {
                                          isScheduledToday = true;
                                      }
                                  }
                              }
                              break;
                          default:
                              break;
                      }

                      if (isScheduledToday) {
                          pep.frequency.time.forEach(t => {
                              const currentSlot = obj[t] || { peptides: [], supplements: [] };
                              let doseInfo = `${pep.dosage?.amount || ''} ${pep.dosage?.unit || 'mcg'}`;

                              if (reconItem) {
                                  const calc = calculateRecon({ 
                                      mg: reconItem.mg, 
                                      water: reconItem.water, 
                                      dose: pep.dosage?.unit === 'mg' ? (pep.dosage?.amount || 0) * 1000 : pep.dosage?.amount 
                                  });
                                  if (calc.unitsPerDose > 0) {
                                      doseInfo = `${calc.unitsPerDose.toFixed(0)} units`;
                                  }
                              }

                              let deliveryInfo = '';
                              if (reconItem?.deliveryMethod === 'pen') deliveryInfo = ' (Pen)';
                              if (reconItem?.deliveryMethod === 'syringe') deliveryInfo = ' (Syringe)';

                              const peptideName = `${pep.name || 'Peptide'} - ${doseInfo}${deliveryInfo}`;
                              const peptideData = {
                                  name: `${pep.name || 'Peptide'} - ${doseInfo}`,
                                  deliveryMethod: reconItem?.deliveryMethod,
                                  penColor: reconItem?.penColor
                              };
                              
                              if (!currentSlot.peptides.some(item => item.name === peptideData.name)) {
                                obj[t] = {
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
                  mergedBySlot[slot] = {
                      peptides: [...(mergedBySlot[slot]?.peptides || []), ...(bySlot[slot]?.peptides || [])],
                      supplements: [...(mergedBySlot[slot]?.supplements || []), ...(bySlot[slot]?.supplements || [])],
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
            // Scheduled Group Buys
            const dayBuys = (scheduledBuys || []).filter(b => {
                if (!b?.openDate || !b?.closeDate) return false;
                const open = parseDateString(b.openDate);
                const close = parseDateString(b.closeDate);
                const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                return dOnly >= open && dOnly <= close;
            });
            if (dayBuys.length > 0) {
                next[key] = { ...(next[key] || {}), groupBuys: [...(next[key]?.groupBuys || []), ...dayBuys.map(b => b.item)] };
            }
          }
          // Group buys: mark any order with .group that falls on this month (for subtle count in month header)
          for (const o of orders) {
            if (!o.group || !o.date) continue
            const od = parseDateString(o.date)
            if (od.getMonth() === currentDate.getMonth() && od.getFullYear() === currentDate.getFullYear()) {
              const key = toKey(od)
              next[key] = { ...(next[key] || {}), groupBuys: [ ...(next[key]?.groupBuys || []), (o.group.title || 'Group Buy') ] }
            }
          }
          // Attach metrics if present for each day key
          for (const k of Object.keys(next)) {
            if (metricsByKeyWithTrend[k]) {
              next[k] = { ...(next[k] || {}), metrics: metricsByKeyWithTrend[k] }
            }
          }

          setScheduled(prev => ({ ...prev, ...next }))
        } catch (e) {
          console.error('[Calendar Debug] Error in loadData:', e);
        }
    };

    loadData(); // Initial load
  }, [currentDate, done, protocols, reconItems, supplements, orders, metrics, theme, scheduledBuys]);

  // Seed a mock group buy once so visuals show up
  useEffect(() => {
    try {
      if (!localStorage.getItem('tpprover_seed_groupbuy')) {
        const raw = localStorage.getItem('tpprover_orders')
        const all = raw ? JSON.parse(raw) : []
        const hasGB = all.some(o => !!o.group)
        if (!hasGB) {
          const d = new Date()
          d.setDate(Math.min(28, d.getDate() + 3))
          const gb = { id: Date.now(), vendor: 'Community Round', peptide: 'BPC-157', mg: 10, cost: '200', status: 'Order Placed', date: d.toISOString().slice(0,10), group: { title: 'BPC-157 Round', participants: ['alice','bob'], notes: 'Mock preview' } }
          all.unshift(gb)
          localStorage.setItem('tpprover_orders', JSON.stringify(all))
        }
        localStorage.setItem('tpprover_seed_groupbuy', '1')
      }
    } catch {}
  }, [])

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
    const d = new Date(currentDate)
    const day = d.getDay() // 0=Sun..6=Sat
    const iso = (day + 6) % 7 // 0=Mon..6=Sun
    d.setDate(d.getDate() - iso)
    return d
  }, [currentDate])

  const handleSaveDay = (text) => {
    if (!activeDay) return
    setEntries(prev => ({ ...prev, [toKey(activeDay)]: text }))
    setActiveDay(null)
  }

  const handleSaveNotes = (text) => {
      if (!editingNotesFor) return;
      const key = toKey(editingNotesFor);
      setEntries(prev => ({ ...prev, [key]: text }));
  }

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  return (
    <section className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        weekStart={weekStart}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={() => setCurrentDate(new Date())}
        viewMode={viewMode}
        onChangeView={setViewMode}
        theme={theme}
      />
      <div className="rounded border p-4 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        {viewMode === 'month' ? (
          <MonthGrid
            date={currentDate}
            entries={entries}
            scheduled={scheduled}
            theme={theme}
            onDayClick={(d) => {
              if (!d) return
              setCurrentDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
              setViewMode('week')
            }}
          />
        ) : (
          <div className="space-y-2">
            <WeekView startDate={weekStart} entries={entries} scheduled={scheduled} theme={theme} onDayClick={setActiveDay} onNotesClick={setEditingNotesFor} />
          </div>
        )}
      </div>

      <NotesModal
          open={!!editingNotesFor}
          onClose={() => setEditingNotesFor(null)}
          theme={theme}
          notes={editingNotesFor ? entries[toKey(editingNotesFor)]?.text : ''}
          onSave={handleSaveNotes}
      />

      {/* Inline day edit could be implemented here in future. Modal temporarily disabled per request. */}
    </section>
  )
}


