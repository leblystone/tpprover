import React from 'react'
import { formatMMDDYYYY } from '../../pages/../utils/date'
import { Droplet, Pill, ShoppingCart, Users } from 'lucide-react'

function getMonthDays(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const days = []
  const firstWeekday = start.getDay() // 0-6
  for (let i = 0; i < firstWeekday; i++) days.push(null)
  for (let d = 1; d <= end.getDate(); d++) days.push(new Date(date.getFullYear(), date.getMonth(), d))
  return days
}

export default function MonthGrid({ date, entries = {}, scheduled = {}, onDayClick, theme }) {
  const days = getMonthDays(date)
  const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <div>
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {weekdayHeaders.map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const key = d ? toKey(d) : ''
          const entryText = d && entries[key] ? entries[key].slice(0, 40) : ''
          const sched = (d && scheduled[key]) || { times: {}, supplements: [], buys: 0 }
          const peptideCount = Object.values(sched.times || {}).reduce((a, b) => a + (b || 0), 0)
          const suppCount = sched.supplements?.length || 0
          const buyCount = (sched.buys || 0) + (sched.groupBuys || 0)
          return (
            <button key={i} className="p-2 rounded border text-left h-24 hover:bg-gray-50" style={{ borderColor: theme.border }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
              <div className="text-xs font-semibold mb-1 flex items-center justify-between" style={{ color: theme.text }}>
                <span>{d ? d.getDate() : ''}</span>
                {d && (peptideCount || suppCount || buyCount) ? (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textLight }}>
                    {peptideCount > 0 && (<span className="inline-flex items-center gap-0.5"><Droplet className="h-3 w-3" />{peptideCount}</span>)}
                    {suppCount > 0 && (<span className="inline-flex items-center gap-0.5"><Pill className="h-3 w-3" />{suppCount}</span>)}
                    {buyCount > 0 && (<span className="inline-flex items-center gap-0.5"><ShoppingCart className="h-3 w-3" />{buyCount}</span>)}
                  </span>
                ) : null}
              </div>
              <div className="text-[10px] leading-tight" style={{ color: theme.textLight, wordBreak: 'break-word' }}>
                {entryText}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}


