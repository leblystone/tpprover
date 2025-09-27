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
        {weekdayHeaders.map(d => <div key={d} className="px-1 py-1 sm:px-1.5 md:px-2 text-center">
            <span className="hidden sm:inline text-xs md:text-sm">{d}</span>
            <span className="sm:hidden text-xs">{d.charAt(0)}</span>
        </div>)}
      </div>
      <div className="grid grid-cols-1 gap-1 sm:gap-1.5 md:gap-2 flex-1">
        {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 relative">
                

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
                        <button key={i} className={`p-1 sm:p-2 md:p-3 rounded-lg border text-left hover:shadow-md transition-all duration-200 flex flex-col justify-between relative min-h-[60px] sm:min-h-[80px] md:min-h-[100px] ${sched.doneAll ? 'ring-2 ring-green-200' : ''}`} style={{ 
                            borderColor: theme.border,
                            backgroundColor: d ? (
                                isToday ? theme.primary + '15' :
                                sched.doneAll ? theme.success + '10' : 
                                hasActivity ? theme.primary + '05' :
                                theme.cardBackground
                            ) : 'transparent'
                        }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
                            {/* Mobile-first layout */}
                            <div className="flex flex-col h-full">
                                {/* Date and primary icons row */}
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm sm:text-base md:text-xl font-bold ${isToday ? 'bg-white rounded-full w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex justify-center items-center shadow-sm text-xs sm:text-sm md:text-xl' : ''}`} style={{ 
                                        backgroundColor: isToday ? theme.primary : 'transparent',
                                        color: isToday ? theme.textOnPrimary : (d ? theme.primaryDark : theme.textLight)
                                    }}>
                                        {d ? d.getDate() : ''}
                                    </span>
                                    
                                    {/* Mobile: Show only essential icons in a compact row */}
                                    {d && (
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                            {/* Task completion indicator - grey when partial, filled when complete */}
                                            {hasActivity && (
                                                <div className="w-3 h-3 rounded-full border flex items-center justify-center">
                                                    {sched.doneAll ? (
                                                        <CheckCircle size={8} style={{ color: theme.success }} />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.textLight }} />
                                                    )}
                                                </div>
                                            )}
                                            {buyCount > 0 && <ShoppingCart size={12} className="sm:size-3 md:size-4" style={{ color: theme.primary }} />}
                                            {totalGoals > 0 && (
                                                completedGoals === totalGoals ? 
                                                    <CheckCircle size={12} className="hidden md:inline md:size-4" style={{ color: theme.success }} /> :
                                                    <Target size={12} className="sm:size-3 md:size-4" style={{ color: completedGoals > 0 ? theme.warning : theme.error }} />
                                            )}
                                            {/* Mobile & Medium: Show only first delivery method */}
                                            {deliveryMethods.slice(0, 1).map((delivery, idx) => (
                                                <span key={idx} className="md:hidden">{getSupplementIcon(delivery, "h-3 w-3")}</span>
                                            ))}
                                            {/* Desktop: Show all delivery methods */}
                                            <div className="hidden md:flex md:gap-0.5">
                                                {deliveryMethods.map((delivery, idx) => (
                                                    <span key={idx}>{getSupplementIcon(delivery, "h-4 w-4")}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile & Medium: Compact activity indicators */}
                                <div className="md:hidden">
                                    {d && (
                                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]" style={{ color: theme.textLight }}>
                                            {peptideCount > 0 && (
                                                <div className="flex items-center gap-0.5">
                                                    <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                    <span>{peptideCount}</span>
                                                </div>
                                            )}
                                            {suppCount > 0 && (
                                                <div className="flex items-center gap-0.5">
                                                    {getSupplementIcon(primaryDelivery, "h-2.5 w-2.5 sm:h-3 sm:w-3")}
                                                    <span>{suppCount}</span>
                                                </div>
                                            )}
                                            {totalGoals > 0 && (
                                                <div className="flex items-center gap-0.5">
                                                    <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                    <span>{completedGoals}/{totalGoals}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Desktop: Full layout */}
                                <div className="hidden md:block">
                                    {d && (
                                        <div className="flex items-center gap-1 mb-2">
                                            {/* Task completion indicator - grey when partial, filled when complete */}
                                            {hasActivity && (
                                                <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                                                    {sched.doneAll ? (
                                                        <CheckCircle size={10} style={{ color: theme.success }} />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.textLight }} />
                                                    )}
                                                </div>
                                            )}
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
                                    
                                    {/* Desktop peptide list */}
                                    <div className="space-y-1">
                                        {peptides.slice(0, 3).map((p, idx) => (
                                            <div key={idx} className="px-1.5 py-0.5 rounded text-[10px] md:text-[11px] leading-tight truncate" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{p.name}</div>
                                        ))}
                                        {peptides.length > 3 && (
                                            <div className="px-1.5 py-0.5 rounded text-[10px] md:text-[11px]" style={{ backgroundColor: theme.secondary, color: theme.text }} title={`+${peptides.length - 3} more`}>+{peptides.length - 3}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes - simplified for mobile */}
                                <div className="text-[9px] sm:text-[10px] md:text-[11px] leading-tight mt-auto truncate sm:whitespace-normal" style={{ color: theme.textLight }}>
                                    {entryText}
                                </div>

                                {/* Washout indicator */}
                                {sched.washout && sched.washout.length > 0 && (
                                    <div className="mt-1">
                                        <span className="px-1 py-0.5 text-[8px] sm:text-[9px] rounded" style={{backgroundColor: theme.secondary, color: theme.textLight}} title={`Washout: ${sched.washout.join(', ')}`}>
                                            W
                                        </span>
                                    </div>
                                )}
                            </div>
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


