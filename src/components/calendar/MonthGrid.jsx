import React, { useState, useEffect } from 'react'
import { formatMMDDYYYY } from '../../pages/../utils/date'
import { Droplet, Pill, ShoppingCart, Users, TrendingUp, TrendingDown, Syringe, Beaker, Target, CheckCircle, PenTool } from 'lucide-react'
import { isTaskCompleted, generateTaskId } from '../../utils/taskCompletion'
import { getChromeGradient } from '../../utils/recon'
import { penColors } from '../../utils/penColors'

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

// Helper function to get pen color
const getResolvedPenColor = (penColor) => {
  if (!penColor) return '#9ca3af';
  const raw = String(penColor).trim();
  const isHex = raw.startsWith('#');
  if (isHex) return raw;
  
  const foundColor = penColors.find(color => 
    color.name.toLowerCase() === raw.toLowerCase()
  );
  
  return foundColor ? foundColor.hex : '#9ca3af';
};

// Helper function to get delivery icon for peptides
function getPeptideDeliveryIcon(item, className = "h-3 w-3") {
    if (typeof item === 'object' && item.deliveryMethod) {
        switch (item.deliveryMethod) {
            case 'pen': return <PenTool className={className} />;
            case 'syringe': return <Syringe className={className} />;
            case 'nasal': return <Droplet className={className} />;
            default: return <Syringe className={className} />;
        }
    }
    return <Syringe className={className} />;
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

// Helper function to check if a peptide is completed
function isPeptideCompleted(peptide, date, timeSlot) {
  const task = {
    name: typeof peptide === 'object' ? peptide.name : peptide,
    dose: typeof peptide === 'object' ? peptide.dose : '',
    unit: typeof peptide === 'object' ? peptide.unit : '',
    type: 'peptide',
    time: timeSlot
  };
  const taskId = generateTaskId(task);
  const dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  return isTaskCompleted(taskId, dateKey, timeSlot);
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

export default function MonthGrid({ date, entries = {}, scheduled = {}, onDayClick, theme, protocolTimelines = [], calendarBump = 0 }) {
  const [forceRender, setForceRender] = useState(0);
  
  // Listen for task completion events to force re-render
  useEffect(() => {
    const handleTaskCompletionChange = (e) => {
      console.log('📡 MonthGrid received task completion event:', e.detail);
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    
    return () => {
      window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    };
  }, []);
  
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
                        <button key={i} className={`p-1 sm:p-2 md:p-3 rounded-lg border text-left hover:shadow-md transition-all duration-200 flex flex-col justify-between relative min-h-[60px] sm:min-h-[80px] md:min-h-[100px] ${sched.doneAll ? 'opacity-60' : ''}`} style={{ 
                            borderColor: sched.doneAll ? '#D1D5DB' : theme.border,
                            backgroundColor: d ? (
                                isToday ? theme.primary + '15' :
                                sched.doneAll ? '#F3F4F6' : 
                                hasActivity ? theme.primary + '05' :
                                theme.cardBackground
                            ) : 'transparent'
                        }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
                            {/* Mobile-first layout */}
                            <div className="flex flex-col h-full">
                                {/* Date and icons row */}
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm sm:text-base md:text-xl font-bold ${isToday ? 'bg-white rounded-full w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex justify-center items-center shadow-sm text-xs sm:text-sm md:text-xl' : ''}`} style={{ 
                                        backgroundColor: isToday ? theme.primary : 'transparent',
                                        color: isToday ? theme.textOnPrimary : (d ? theme.primaryDark : theme.textLight)
                                    }}>
                                        {d ? d.getDate() : ''}
                                    </span>
                                    
                                    {/* Single row with icons and completion dot */}
                                    {d && (
                                        <div className="flex items-center gap-1 sm:gap-1.5">
                                            {/* Protocols (Syringe) - Sage Grey */}
                                            {peptideCount > 0 && <Syringe size={12} className="sm:size-3 md:size-4" style={{ color: '#73796D' }} />}
                                            
                                            {/* Supplements (Pill) - Classic */}
                                            {suppCount > 0 && <Pill size={12} className="sm:size-3 md:size-4" style={{ color: '#A4A897' }} />}
                                            
                                            {/* Group Buys (Shopping cart) - Olive */}
                                            {buyCount > 0 && <ShoppingCart size={12} className="sm:size-3 md:size-4" style={{ color: '#9B9B7A' }} />}
                                            
                                            {/* Completion indicator - Upper right */}
                                            {hasActivity && (
                                                sched.doneAll ? (
                                                    <CheckCircle 
                                                        size={14} 
                                                        className="sm:size-4 md:size-5 flex-shrink-0" 
                                                        style={{ color: '#4CAF50' }}
                                                        strokeWidth={2.5}
                                                        title="All tasks completed"
                                                    />
                                                ) : (
                                                    <div 
                                                        className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0" 
                                                        style={{ backgroundColor: '#73796D' }}
                                                        title="Tasks pending"
                                                    />
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Desktop: Show protocol list */}
                                <div className="hidden md:block space-y-1">
                                    {peptides.slice(0, 2).map((p, idx) => {
                                        const peptideName = typeof p === 'object' ? p.name : p;
                                        const dose = typeof p === 'object' ? p.dose : '';
                                        const unit = typeof p === 'object' ? p.unit : '';
                                        const deliveryMethod = typeof p === 'object' ? p.deliveryMethod : 'syringe';
                                        const penColor = typeof p === 'object' ? p.penColor : undefined;
                                        const penType = typeof p === 'object' ? p.penType : undefined;
                                        const isCompleted = isPeptideCompleted(p, d, 'AM') || isPeptideCompleted(p, d, 'PM') || isPeptideCompleted(p, d, 'Morning') || isPeptideCompleted(p, d, 'Evening');
                                        
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] md:text-[11px] leading-tight ${isCompleted ? 'line-through opacity-60' : ''}`} 
                                                style={{ backgroundColor: theme.accent, color: theme.accentText }}
                                            >
                                                <span className="truncate flex-1">{peptideName}</span>
                                                {dose && <span className="opacity-75">{dose}{unit ? ` ${unit}` : ''}</span>}
                                                {deliveryMethod === 'pen' && penColor && (
                                                    <div 
                                                        className="w-2 h-2 rounded-full border border-gray-300 flex-shrink-0" 
                                                        style={{ 
                                                            background: getChromeGradient(getResolvedPenColor(penColor)),
                                                            opacity: isCompleted ? 0.5 : 1
                                                        }}
                                                        title={`${penColor}${penType ? ` ${penType}` : ''}`}
                                                    />
                                                )}
                                                <div className="flex-shrink-0">
                                                    {getPeptideDeliveryIcon(p, "h-2 w-2")}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {peptides.length > 2 && (
                                        <div className="px-1.5 py-0.5 rounded text-[10px] md:text-[11px]" style={{ backgroundColor: theme.secondary, color: theme.text }} title={`+${peptides.length - 2} more`}>+{peptides.length - 2}</div>
                                    )}
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


