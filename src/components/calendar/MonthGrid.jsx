import React from 'react'
import { formatMMDDYYYY } from '../../pages/../utils/date'
import { Droplet, Pill, ShoppingCart, Users, TrendingUp, TrendingDown, Syringe, Beaker, Target, CheckCircle } from 'lucide-react'

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, className = "h-3 w-3") {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Syringe className={className} />;
        case 'powder': return <Beaker className={className} />;
        case 'pill':
        case 'oral':
        default: return <Pill className={className} />;
    }
}

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
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 text-xs mb-2" style={{ color: theme.textLight }}>
        {weekdayHeaders.map(d => <div key={d} className="px-1 py-1 sm:px-2 text-center">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
        </div>)}
      </div>
      <div className="grid grid-cols-1 gap-1 sm:gap-2 flex-1">
        {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2 relative">
                

                {week.map((d, i) => {
                    const key = d ? toKey(d) : ''
                    const entryText = d && entries[key] ? entries[key].slice(0, 40) : ''
                    const sched = (d && scheduled[key]) || {}
                    const peptides = Array.from(new Set([
                        ...(sched.bySlot?.AM?.peptides || []), 
                        ...(sched.bySlot?.PM?.peptides || []),
                        // Legacy support
                        ...(sched.bySlot?.Morning?.peptides || []), 
                        ...(sched.bySlot?.Evening?.peptides || [])
                    ]))
                    const peptideCount = peptides.length
                    const suppCount = sched.supplements?.length || 0
                    // Get all supplements from bySlot to determine delivery methods
                    const allSupplements = [
                        ...(sched.bySlot?.AM?.supplements || []),
                        ...(sched.bySlot?.PM?.supplements || []),
                        // Legacy support
                        ...(sched.bySlot?.Morning?.supplements || []),
                        ...(sched.bySlot?.Evening?.supplements || [])
                    ];
                    // Get unique delivery methods for icon display
                    const deliveryMethods = [...new Set(allSupplements.map(s => typeof s === 'object' ? s.delivery : 'oral'))];
                    const primaryDelivery = deliveryMethods[0] || 'oral';
                    const buyCount = (sched.buys || 0) + (sched.groupBuys?.length || 0)
                    const dayGoals = sched.goals || []
                    const completedGoals = dayGoals.filter(g => g.completed).length
                    const totalGoals = dayGoals.length
                    
                    // Icons are now working correctly!
                    
                    const hasActivity = peptideCount > 0 || suppCount > 0 || buyCount > 0 || totalGoals > 0;
                    const isToday = d && new Date().toDateString() === d.toDateString();
                    
                    return (
                        <button key={i} className={`p-2 sm:p-3 rounded-lg border text-left hover:shadow-md transition-all duration-200 flex flex-col justify-between relative min-h-[80px] sm:min-h-[100px] ${sched.doneAll ? 'ring-2 ring-green-200' : ''}`} style={{ 
                            borderColor: hasActivity ? theme.primary : theme.border,
                            borderWidth: hasActivity ? '2px' : '1px',
                            backgroundColor: d ? (
                                isToday ? theme.primary + '15' :
                                sched.doneAll ? theme.success + '10' : 
                                hasActivity ? theme.primary + '05' :
                                theme.cardBackground
                            ) : 'transparent'
                        }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
                            <div>
                                <div className="text-sm sm:text-base font-bold mb-1 flex items-center justify-between" style={{ color: d ? (isToday ? theme.primary : theme.primaryDark) : theme.textLight }}>
                                    <span className={`flex items-center gap-1 text-lg sm:text-xl ${isToday ? 'bg-white rounded-full w-8 h-8 sm:w-10 sm:h-10 justify-center items-center shadow-sm' : ''}`} style={{ 
                                        backgroundColor: isToday ? theme.primary : 'transparent',
                                        color: isToday ? theme.textOnPrimary : 'inherit'
                                    }}>
                                        {d ? d.getDate() : ''}
                                    </span>
                                    {d && (
                                        <div className="flex items-center gap-0.5">
                                            {buyCount > 0 && <ShoppingCart size={16} style={{ color: theme.primary }} />}
                                            {/* Show goal indicators */}
                                            {totalGoals > 0 && (
                                                completedGoals === totalGoals ? 
                                                    <CheckCircle size={16} style={{ color: theme.success }} title={`${completedGoals}/${totalGoals} goals completed`} /> :
                                                    <Target size={16} style={{ color: completedGoals > 0 ? theme.warning : theme.error }} title={`${completedGoals}/${totalGoals} goals completed`} />
                                            )}
                                            {/* Show supplement delivery method icons */}
                                            {deliveryMethods.map((delivery, idx) => (
                                                <span key={idx}>{getSupplementIcon(delivery, "h-4 w-4")}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {d && (<div className="flex items-center gap-1">
                                            {sched.doneAll && <span title="All tasks done" className="text-green-500 text-base">✓</span>}
                                            <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textLight }}>
                                                {peptideCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5">
                                                    <span className="inline-flex relative">
                                                        <Droplet className="h-4 w-4" />
                                                        <Droplet className="h-4 w-4 -ml-1.5" />
                                                    </span>
                                                    {peptideCount}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}
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


