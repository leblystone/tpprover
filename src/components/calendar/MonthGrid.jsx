import React from 'react'
import { formatMMDDYYYY } from '../../pages/../utils/date'
import { Droplet, Pill, ShoppingCart, Users, TrendingUp, TrendingDown } from 'lucide-react'

function getMonthDays(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const days = []
  const firstWeekday = start.getDay() // 0-6
  for (let i = 0; i < firstWeekday; i++) days.push(null)
  for (let d = 1; d <= end.getDate(); d++) days.push(new Date(date.getFullYear(), date.getMonth(), d))
  return days
}

function MetricIndicator({ metric, theme }) {
    const indicatorColor = {
        'Good': theme.success,
        'High': theme.error,
        'Great': theme.success,
        'Bad': theme.error,
        'Low': theme.warning,
    }[metric.value] || theme.textLight;

    return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: indicatorColor }} title={`${metric.type}: ${metric.value}`} />;
}

export default function MonthGrid({ date, entries = {}, scheduled = {}, onDayClick, theme, protocolTimelines = [] }) {
  const days = getMonthDays(date)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
  }

  const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <div>
      <div className="grid grid-cols-7 text-xs mb-2" style={{ color: theme.textLight }}>
        {weekdayHeaders.map(d => <div key={d} className="px-1 py-1 sm:px-2 text-center">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
        </div>)}
      </div>
      <div className="grid grid-cols-1 gap-1 sm:gap-2">
        {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2 relative">
                

                {week.map((d, i) => {
                    const key = d ? toKey(d) : ''
                    const entryText = d && entries[key] ? entries[key].slice(0, 40) : ''
                    const sched = (d && scheduled[key]) || {}
                    const peptides = Array.from(new Set([...(sched.bySlot?.Morning?.peptides || []), ...(sched.bySlot?.Evening?.peptides || [])]))
                    const peptideCount = peptides.length
                    const suppCount = sched.supplements?.length || 0
                    const buyCount = (sched.buys || 0) + (sched.groupBuys || 0)
                    
                    return (
                        <button key={i} className={`p-1 sm:p-2 rounded border text-left aspect-square hover:bg-gray-50 flex flex-col justify-between relative ${sched.doneAll ? 'bg-green-50' : ''}`} style={{ borderColor: theme.border }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
                            <div>
                                <div className="text-xs font-semibold mb-1 flex items-center justify-between" style={{ color: theme.text }}>
                                    <span className="flex items-center gap-1">
                                        {d ? d.getDate() : ''}
                                    </span>
                                    {d && (
                                        <div className="flex items-center gap-1">
                                            {sched.doneAll && <span title="All tasks done" className="text-green-500 text-base">✓</span>}
                                            <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textLight }}>
                                                {peptideCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5">
                                                    <span className="inline-flex relative">
                                                        <Droplet className="h-3 w-3" />
                                                        <Droplet className="h-3 w-3 -ml-1" />
                                                    </span>
                                                    {peptideCount}
                                                    </span>
                                                )}
                                                {suppCount > 0 && (<span className="inline-flex items-center gap-0.5" title={`${suppCount} supplement(s)`}><Pill className="h-3 w-3" /></span>)}
                                                {buyCount > 0 && (<span className="inline-flex items-center gap-0.5"><ShoppingCart className="h-3 w-3" />{buyCount}</span>)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="sm:hidden space-y-1">
                                        {peptides.slice(0, 2).map((p, idx) => (
                                            <div key={idx} className="px-1.5 py-0.5 rounded text-[10px] leading-tight truncate" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{p.name}</div>
                                        ))}
                                        {peptides.length > 2 && (
                                            <div className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: theme.secondary, color: theme.text }} title={`+${peptides.length - 2} more`}>+</div>
                                        )}
                                    </div>
                                    <div className="hidden sm:block space-y-1">
                                        {peptides.slice(0, 3).map((p, idx) => (
                                            <div key={idx} className="px-1.5 py-0.5 rounded text-[10px] leading-tight truncate" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{p.name}</div>
                                        ))}
                                        {peptides.length > 3 && (
                                            <div className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: theme.secondary, color: theme.text }} title={`+${peptides.length - 3} more`}>+</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] leading-tight mt-auto" style={{ color: theme.textLight, wordBreak: 'break-word' }}>
                                {entryText}
                            </div>
                            {sched.washout && sched.washout.length > 0 && (
                                <div className="mt-1">
                                    <span className="px-1.5 py-0.5 text-[9px] rounded" style={{backgroundColor: theme.secondary, color: theme.textLight}} title={`Washout: ${sched.washout.join(', ')}`}>
                                        Washout
                                    </span>
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        ))}
        </div>
    </div>
  )
}

export function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}


