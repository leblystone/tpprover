import React from 'react'
import { toKey } from './MonthGrid'
import { Droplet, Pill, ShoppingCart, Target, Users } from 'lucide-react'

export default function WeekView({ startDate, entries = {}, scheduled = {}, onDayClick, onToggleSlot, theme }) {
  const days = Array.from({ length: 7 }).map((_, i) => new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i))
  const hours = Array.from({ length: 17 }).map((_, i) => 6 + i) // 6..22
  const hourToSlot = (h) => {
    if (h >= 6 && h <= 11) return 'Morning'
    if (h >= 12 && h <= 17) return 'Afternoon'
    if (h >= 18 && h <= 20) return 'Evening'
    return 'Night'
  }
  // Two-row layout: Mon-Fri on first row, Sat-Sun on second row
  const firstRow = days.slice(0, 5)
  const secondRow = days.slice(5)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {firstRow.map(renderDay)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {secondRow.map(renderDay)}
      </div>
    </div>
  )

  function renderDay(d) {
    const key = toKey(d)
    const entryText = entries[key] ? entries[key].slice(0, 80) : ''
    const sched = scheduled[key] || { times: {}, supplements: [], buys: 0, groupBuys: 0 }
    const peptideCount = Object.values(sched.times || {}).reduce((a, b) => a + (b || 0), 0)
    const suppCount = sched.supplements?.length || 0
    const buyCount = (sched.buys || 0) + (sched.groupBuys || 0)
    return (
      <button key={d.toISOString()} className="p-3 rounded border text-left hover:bg-gray-50" style={{ borderColor: theme.border }} onClick={() => onDayClick?.(d)}>
        <div className="text-xs font-semibold mb-1 flex items-center justify-between" style={{ color: theme.text }}>
          <span>{d.toLocaleDateString('en-US', { weekday: 'short' })} {d.getDate()}</span>
          {(peptideCount || suppCount || buyCount) ? (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textLight }}>
              {peptideCount > 0 && (<span className="inline-flex items-center gap-0.5"><Droplet className="h-3 w-3" />{peptideCount}</span>)}
              {suppCount > 0 && (<span className="inline-flex items-center gap-0.5"><Pill className="h-3 w-3" />{suppCount}</span>)}
              {buyCount > 0 && (<span className="inline-flex items-center gap-0.5"><ShoppingCart className="h-3 w-3" />{buyCount}</span>)}
            </span>
          ) : null}
        </div>
        <div className="text-[10px] text-gray-500 line-clamp-2 min-h-[1.2em]">
          {entryText}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1"><Droplet className="h-3 w-3" /> {Object.keys(sched.times||{}).length ? `${Object.values(sched.times).reduce((a,b)=>a+(b||0),0)} protocol slots` : 'No peptides'}</div>
          <div className="flex items-center gap-1"><Pill className="h-3 w-3" /> {suppCount} supplements</div>
          <div className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {buyCount} buys</div>
        </div>
        <div className="mt-1 grid grid-rows-2 gap-1">
          {['Morning','Evening'].map(slot => (
            <div key={slot} className="rounded border p-1 text-[10px]" style={{ borderColor: theme.border }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-1" style={{ color: theme.textLight }}>{slot}</div>
              <div className="flex flex-wrap gap-1">
                {(sched.bySlot?.[slot] || []).map((name, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-100">{name}</span>
                ))}
                {(!sched.bySlot || !sched.bySlot[slot] || sched.bySlot[slot].length === 0) && (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </button>
    )
  }
}


