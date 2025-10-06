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
                    
                    // Calculate actual task completion status
                    let totalTasks = 0;
                    let completedTasks = 0;
                    
                    // Count tasks from bySlot structure
                    if (sched.bySlot) {
                        Object.keys(sched.bySlot).forEach(timeSlot => {
                            const slot = sched.bySlot[timeSlot];
                            if (slot.peptides) {
                                slot.peptides.forEach(peptide => {
                                    const task = {
                                        name: typeof peptide === 'object' ? peptide.name : peptide,
                                        dose: typeof peptide === 'object' ? peptide.dose : '',
                                        unit: typeof peptide === 'object' ? peptide.unit : '',
                                        type: 'peptide',
                                        time: timeSlot
                                    };
                                    const taskId = generateTaskId(task);
                                    const dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                    totalTasks++;
                                    if (isTaskCompleted(taskId, dateKey, timeSlot)) {
                                        completedTasks++;
                                    }
                                });
                            }
                            if (slot.supplements) {
                                slot.supplements.forEach(supplement => {
                                    const task = {
                                        name: typeof supplement === 'object' ? supplement.name : supplement,
                                        dose: typeof supplement === 'object' ? supplement.dose : '',
                                        unit: typeof supplement === 'object' ? supplement.unit : '',
                                        type: 'supplement',
                                        time: timeSlot
                                    };
                                    const taskId = generateTaskId(task);
                                    const dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                    totalTasks++;
                                    if (isTaskCompleted(taskId, dateKey, timeSlot)) {
                                        completedTasks++;
                                    }
                                });
                            }
                        });
                    }
                    
                    // Determine if all tasks are completed
                    const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
                    
                    const hasActivity = peptideCount > 0 || suppCount > 0 || buyCount > 0 || totalGoals > 0;
                    const isToday = d && new Date().toDateString() === d.toDateString();
                    
                    // Build icon elements for large screens (up to 4 slots)
                    const iconGridEls = [];
                    if (peptideCount > 0) iconGridEls.push(<Syringe key="i-pep" className="w-4 h-4" style={{ color: '#73796D' }} />);
                    if (suppCount > 0) iconGridEls.push(<Pill key="i-sup" className="w-4 h-4" style={{ color: '#A4A897' }} />);
                    if (buyCount > 0) iconGridEls.push(<ShoppingCart key="i-buy" className="w-4 h-4" style={{ color: '#9B9B7A' }} />);
                    while (iconGridEls.length < 4) iconGridEls.push(<span key={`i-empty-${iconGridEls.length}`} />);

                    // Build simple task name list (first 6), peptides + supplements
                    const peptideNames = peptides.map(p => typeof p === 'object' ? (p.name || '') : p).filter(Boolean);
                    const supplementNames = allSupplements.map(s => typeof s === 'object' ? (s.name || '') : s).filter(Boolean);
                    const simpleTaskNames = [...peptideNames, ...supplementNames].slice(0, 6);

                    return (
                        <button key={i} className={`p-1 sm:p-2 md:p-3 rounded-lg border text-left hover:shadow-md transition-all duration-200 flex flex-col justify-between relative min-h-[60px] sm:min-h-[80px] md:min-h-[100px] ${allTasksCompleted ? 'opacity-60' : ''}`} style={{ 
                            borderColor: allTasksCompleted ? '#D1D5DB' : theme.border,
                            backgroundColor: d ? (
                                isToday ? theme.primary + '15' :
                                allTasksCompleted ? '#F3F4F6' : 
                                hasActivity ? theme.primary + '05' :
                                theme.cardBackground
                            ) : 'transparent'
                        }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
                            {/* Mobile-first layout */}
                            <div className="flex flex-col h-full relative">
                                {/* Date row */}
                                <div className="flex items-start justify-between mb-1">
                                    <span className={`text-sm sm:text-base md:text-xl font-bold ${isToday ? 'bg-white rounded-full w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex justify-center items-center shadow-sm text-xs sm:text-sm md:text-xl' : ''}`} style={{ 
                                        backgroundColor: isToday ? theme.primary : 'transparent',
                                        color: isToday ? theme.textOnPrimary : (d ? theme.primaryDark : theme.textLight)
                                    }}>
                                        {d ? d.getDate() : ''}
                                    </span>
                                </div>

                                {/* Completion indicator in upper-right */}
                                {d && hasActivity && (
                                    <div className="absolute top-1 right-1">
                                        {allTasksCompleted ? (
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
                                                title={`${completedTasks}/${totalTasks} tasks completed`}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Icons under the number */}
                                {d && (
                                    <>
                                        {/* Mobile: 2x2 grid under the number */}
                                        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-8 h-8 sm:hidden mx-auto">
                                            {peptideCount > 0 && (
                                                <div className="flex items-center justify-center">
                                                    <Syringe size={12} style={{ color: '#73796D' }} />
                                                </div>
                                            )}
                                            {suppCount > 0 && (
                                                <div className="flex items-center justify-center">
                                                    <Pill size={12} style={{ color: '#A4A897' }} />
                                                </div>
                                            )}
                                            {buyCount > 0 && (
                                                <div className="flex items-center justify-center">
                                                    <ShoppingCart size={12} style={{ color: '#9B9B7A' }} />
                                                </div>
                                            )}
                                        </div>
                                        {/* Tablet/Desktop: single row (sm/md) and 4-col line on lg+ */}
                                        <div className="hidden sm:flex justify-center lg:hidden items-center gap-1 sm:gap-1.5">
                                            {peptideCount > 0 && <Syringe className="w-3 h-3" style={{ color: '#73796D' }} />}
                                            {suppCount > 0 && <Pill className="w-3 h-3" style={{ color: '#A4A897' }} />}
                                            {buyCount > 0 && <ShoppingCart className="w-3 h-3" style={{ color: '#9B9B7A' }} />}
                                        </div>
                                        <div className="hidden lg:grid grid-cols-4 gap-1 w-full justify-items-center">
                                            {iconGridEls}
                                        </div>
                                    </>
                                )}

                                {/* Full screen only: simple task list (names only), two columns, first 6 */}
                                <div className="hidden lg:block mt-1">
                                    <div className="grid grid-cols-2 gap-1">
                                        {simpleTaskNames.map((name, idx) => (
                                            <div key={`name-${idx}`} className="px-1 py-0.5 rounded text-[10px] truncate" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                {name}
                                            </div>
                                        ))}
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


