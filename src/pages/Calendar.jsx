import React, { useEffect, useMemo, useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'
import CalendarHeader from '../components/calendar/CalendarHeader'
import MonthGrid, { toKey } from '../components/calendar/MonthGrid'
import { formatMMDDYYYY } from '../utils/date'
import WeekView from '../components/calendar/WeekView'
// Removed notes-only modal to avoid overlap; using DayView for all edits
import DayView from '../components/calendar/DayView'

export default function Calendar() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
  const [entries, setEntries] = useState({})
  const [activeDay, setActiveDay] = useState(null)
  // scheduled structure: { [dateKey]: { peptides: string[], supplements: string[], buys: number } }
  const [scheduled, setScheduled] = useState({})
  const [done, setDone] = useState({})
  const [bump, setBump] = useState(() => { try { return localStorage.getItem('tpprover_calendar_bump') || '0' } catch { return '0' } })
  // Load persisted notes (entries) and done slots
  useEffect(() => {
    try { const raw = localStorage.getItem('tpprover_calendar_notes'); if (raw) setEntries(JSON.parse(raw)) } catch {}
    try { const rawDone = localStorage.getItem('tpprover_calendar_done'); if (rawDone) setDone(JSON.parse(rawDone)) } catch {}
  }, [])

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
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'tpprover_calendar_bump') setBump(e.newValue || String(Date.now()))
    }
    window.addEventListener('storage', onStorage)
    const iv = setInterval(() => {
      try { const v = localStorage.getItem('tpprover_calendar_bump'); if (v !== bump) setBump(v || '0') } catch {}
    }, 1500)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(iv) }
  }, [bump])

  useEffect(() => { try { localStorage.setItem('tpprover_calendar_notes', JSON.stringify(entries)) } catch {} }, [entries])
  useEffect(() => { try { localStorage.setItem('tpprover_calendar_done', JSON.stringify(done)) } catch {} }, [done])
  // seed buys from dashboard-like state (dummy). Integration will come later.
  // scheduled example usage: setScheduled(prev => ({ ...prev, [someKey]: { ...(prev[someKey]||{}), buys: 2 } }))

  // Auto indicators based on Supplements (Research) and Protocols (placeholder for now)
  // Read supplements saved in local storage by Research page (if any)
  useEffect(() => {
    try {
      const rawSupp = localStorage.getItem('tpprover_supplements')
      const supps = rawSupp ? JSON.parse(rawSupp) : []
      // For the current month, mark days with supplement counts
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const next = {}
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayKey = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        const count = supps.filter(s => s.days?.includes(dayKey)).length
        if (count > 0) {
          const key = toKey(d)
          next[key] = { ...(next[key] || {}), supplements: Array(count).fill('supp'), bySlot: { ...(next[key]?.bySlot||{}) } }
          // add names by slot
          for (const s of supps) {
            if (!s.days?.includes(dayKey)) continue
            const slot = s.schedule === 'PM' ? 'Evening' : 'Morning'
            next[key].bySlot[slot] = [...(next[key].bySlot[slot]||[]), s.name || 'Supplement']
          }
        }
      }
      // Upcoming buys badges from Orders: mark orders with status 'Order Placed' within next N days
      const rawOrders = localStorage.getItem('tpprover_orders')
      const orders = rawOrders ? JSON.parse(rawOrders) : []
      const N = 7
      const today = new Date()
      const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + N)
      for (const o of orders) {
        if ((o.status || '') !== 'Order Placed' || !o.date) continue
        const od = new Date(o.date)
        if (od >= today && od <= horizon) {
          const key = toKey(od)
          next[key] = { ...(next[key] || {}), buys: (next[key]?.buys || 0) + 1 }
        }
      }
      // Protocol indicators: count by time-of-day occurrences
      const rawProt = localStorage.getItem('tpprover_protocols')
      const prots = rawProt ? JSON.parse(rawProt) : []
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toKey(d)
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        // within date range and matches active day
        const count = prots.reduce((acc, p) => {
          const inRange = (!p.startDate || new Date(p.startDate) <= d) && (!p.endDate || new Date(p.endDate) >= d)
          const dayOk = !Array.isArray(p.activeDays) || p.activeDays.includes(weekday)
          const active = p.active !== false
          const times = Array.isArray(p.frequency?.time) ? p.frequency.time.length : 0
          return acc + (inRange && dayOk && active ? times : 0)
        }, 0)
        if (count > 0) {
          const times = prots.reduce((obj, p) => {
            const inRange = (!p.startDate || new Date(p.startDate) <= d) && (!p.endDate || new Date(p.endDate) >= d)
            const dayOk = !Array.isArray(p.activeDays) || p.activeDays.includes(weekday)
            const active = p.active !== false
            if (inRange && dayOk && active && Array.isArray(p.frequency?.time)) {
              for (const t of p.frequency.time) obj[t] = (obj[t] || 0) + 1
            }
            return obj
          }, {})
          // names by slot
          const bySlot = prots.reduce((obj, p) => {
            const inRange = (!p.startDate || new Date(p.startDate) <= d) && (!p.endDate || new Date(p.endDate) >= d)
            const dayOk = !Array.isArray(p.activeDays) || p.activeDays.includes(weekday)
            const active = p.active !== false
            if (inRange && dayOk && active && Array.isArray(p.frequency?.time)) {
              for (const t of p.frequency.time) {
                obj[t] = [...(obj[t]||[]), p.name || 'Protocol']
              }
            }
            return obj
          }, {})
          next[key] = { ...(next[key] || {}), times, bySlot: { ...(next[key]?.bySlot||{}), ...bySlot }, done: done[key] || {} }
        }
      }
      // Group buys: mark any order with .group that falls on this month
      for (const o of orders) {
        if (!o.group || !o.date) continue
        const od = new Date(o.date)
        if (od.getMonth() === currentDate.getMonth() && od.getFullYear() === currentDate.getFullYear()) {
          const key = toKey(od)
          next[key] = { ...(next[key] || {}), groupBuys: (next[key]?.groupBuys || 0) + 1 }
        }
      }
      setScheduled(prev => ({ ...prev, ...next }))
    } catch {}
  }, [currentDate, done, bump])

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

  return (
    <section className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        onPrev={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
        onNext={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
        viewMode={viewMode}
        onChangeView={setViewMode}
        theme={theme}
      />
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        {viewMode === 'month' ? (
          <MonthGrid date={currentDate} entries={entries} scheduled={scheduled} theme={theme} onDayClick={setActiveDay} />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button className="px-2 py-1 rounded border" style={{ borderColor: theme.border }} onClick={() => setActiveDay(new Date())}>Today</button>
              <button className="px-2 py-1 rounded border" style={{ borderColor: theme.border }} onClick={() => setActiveDay(weekStart)}>Open Day</button>
            </div>
            <WeekView startDate={weekStart} entries={entries} scheduled={scheduled} theme={theme} onDayClick={setActiveDay} />
          </div>
        )}
      </div>

      <DayView
        open={!!activeDay}
        onClose={() => setActiveDay(null)}
        date={activeDay}
        theme={theme}
        notes={activeDay ? entries[toKey(activeDay)] : ''}
        onSave={(text) => { if (!activeDay) return; setEntries(prev => ({ ...prev, [toKey(activeDay)]: text })); setActiveDay(null) }}
        scheduled={activeDay ? scheduled[toKey(activeDay)] : {}}
        done={done[activeDay ? toKey(activeDay) : ''] || {}}
        onToggleSlot={(slot) => toggleSlot(activeDay, slot)}
      />
    </section>
  )
}


