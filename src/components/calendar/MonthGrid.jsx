import React, { useState, useEffect } from 'react'
import { formatMMDDYYYY } from '../../pages/../utils/date'
import { Pill, ShoppingCart, Users, TrendingUp, TrendingDown, Beaker, Target, CheckCircle, PenTool, Pipette } from 'lucide-react'
import { isTaskCompleted, generateTaskId } from '../../utils/taskCompletion'
import { getChromeGradient } from '../../utils/recon'
import { penColors } from '../../utils/penColors'
import { areWashoutIconsEnabled, areGroupBuysEnabled } from '../../utils/featureSettings'
import { getNotesForDate } from '../../utils/protocolHistory'
import { getCalendarNoteText } from '../../utils/calendarNotesMigration'

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, className = "h-3 w-3") {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Pipette className={className} />;
        case 'powder': return <Beaker className={className} />;
        case 'pill':
        case 'oral':
        default: return <Pill className={className} />;
    }
}

// Helper function to get pen color
const getResolvedPenColor = (penColor) => {
  if (!penColor) return '#9ca3af';
  const raw = String(penColor || '').trim();
  // Type safety: ensure raw is a string before calling startsWith
  if (typeof raw !== 'string' || !raw) return '#9ca3af';
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
            case 'syringe':
            case 'pipette': return <Pipette className={className} />;
            case 'nasal': return <Pipette className={className} />;
            default: return <Pipette className={className} />;
        }
    }
    return <Pipette className={className} />;
}

function getMonthDays(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const days = []
  
  // Get week starts on setting
  const weekStartsOn = (() => {
    try {
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return settings.region?.weekStartsOn || 'monday';
    } catch {
      return 'monday';
    }
  })();
  
  const firstWeekday = start.getDay() // 0-6 (0=Sunday, 6=Saturday)
  
  // Calculate padding days before the first day
  let paddingDays = 0;
  if (weekStartsOn === 'sunday') {
    // No padding if Sunday start (day 0)
    paddingDays = firstWeekday;
  } else {
    // Monday start: Sunday (0) needs 1 day of padding
    // Monday (1) needs 0 days of padding
    // Tuesday (2) needs 1 day of padding, etc.
    paddingDays = (firstWeekday + 6) % 7;
  }
  
  for (let i = 0; i < paddingDays; i++) days.push(null)
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

export default function MonthGrid({ date, entries = {}, scheduled = {}, onDayClick, theme, protocolTimelines = [], calendarBump = 0, todayPulse = false }) {
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
  
  const days = Array.isArray(getMonthDays(date)) ? getMonthDays(date) : [];
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
  }

  // Get week starts on setting and build appropriate headers
  const weekStartsOn = (() => {
    try {
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return settings.region?.weekStartsOn || 'monday';
    } catch {
      return 'monday';
    }
  })();
  
  const weekdayHeaders = weekStartsOn === 'sunday' 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Check if washout icons should be shown
  const showWashoutIcons = areWashoutIconsEnabled();
  // Check if group buys are enabled
  const groupBuysEnabled = areGroupBuysEnabled();
  
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
                    const entryText = d && entries[key] ? 
                        getCalendarNoteText(entries, key).slice(0, 40) : ''
                    const sched = (d && scheduled[key]) || {}
                    const peptides = Array.from(new Set([
                        ...(sched.bySlot?.AM?.peptides || []), 
                        ...(sched.bySlot?.PM?.peptides || [])
                    ]))
                    const peptideCount = peptides.length
                    const suppCount = sched.supplements?.length || 0
                    // Get all supplements from bySlot to determine delivery methods
                    const allSupplements = [
                        ...(sched.bySlot?.AM?.supplements || []),
                        ...(sched.bySlot?.PM?.supplements || [])
                    ];
                    // Get unique delivery methods for icon display
                    const deliveryMethods = [...new Set(allSupplements.map(s => typeof s === 'object' ? s.delivery : 'oral'))];
                    const primaryDelivery = deliveryMethods[0] || 'oral';
                    // Count regular orders and group buys (if enabled)
                    const regularBuys = sched.buys || 0;
                    const groupBuysCount = groupBuysEnabled ? (sched.groupBuys?.length || 0) : 0;
                    const buyCount = regularBuys + groupBuysCount;
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
                    const iconColor = theme.isDark ? '#a8b5a0' : '#73796D';
                    const iconGridEls = [];
                    if (peptideCount > 0) iconGridEls.push(<Pipette key="i-pep" className="w-4 h-4" style={{ color: iconColor }} />);
                    if (suppCount > 0) iconGridEls.push(<Pill key="i-sup" className="w-4 h-4" style={{ color: iconColor }} />);
                    if (buyCount > 0 && groupBuysEnabled) iconGridEls.push(<ShoppingCart key="i-buy" className="w-4 h-4" style={{ color: iconColor }} />);
                    while (iconGridEls.length < 4) iconGridEls.push(<span key={`i-empty-${iconGridEls.length}`} />);

                    // Build simple task name list (first 6), peptides + supplements
                    const peptideNames = peptides.map(p => typeof p === 'object' ? (p.name || '') : p).filter(Boolean);
                    const supplementNames = allSupplements.map(s => typeof s === 'object' ? (s.name || '') : s).filter(Boolean);
                    const simpleTaskNames = [...peptideNames, ...supplementNames].slice(0, 6);

                    return (
                        <button key={i} className={`p-1 sm:p-2 md:p-3 rounded-lg border text-left hover:shadow-md transition-all duration-200 flex flex-col justify-between relative min-h-[60px] sm:min-h-[80px] md:min-h-[100px] ${allTasksCompleted ? 'opacity-60' : ''} ${isToday && todayPulse ? 'animate-pulse' : ''}`} style={{ 
                            borderColor: allTasksCompleted ? (theme.isDark ? '#4b5563' : '#D1D5DB') : (isToday && todayPulse ? theme.primary : theme.border),
                            backgroundColor: d ? (
                                isToday ? theme.primary + '15' :
                                allTasksCompleted ? (theme.isDark ? '#1f2937' : '#F3F4F6') : 
                                hasActivity ? (theme.isDark ? '#1f2937' : theme.primary + '05') :
                                theme.isDark ? '#111827' : theme.cardBackground
                            ) : 'transparent',
                            boxShadow: isToday && todayPulse ? `0 0 0 3px ${theme.primary}40` : 'none'
                        }} onClick={() => d && onDayClick?.(d)} disabled={!d}>
                            {/* Mobile-first layout */}
                            <div className="flex flex-col h-full relative">
                                {/* Date row */}
                                <div className="flex items-start justify-between mb-1">
                                    <span className={`text-sm sm:text-base md:text-xl font-bold ${isToday ? 'bg-white rounded-full w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 flex justify-center items-center shadow-sm text-xs sm:text-sm md:text-xl' : ''}`} style={{ 
                                        backgroundColor: isToday ? theme.primary : 'transparent',
                                        color: isToday ? theme.textOnPrimary : (d ? (theme.isDark ? theme.text : theme.primaryDark) : theme.textLight)
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
                                                    <Pipette size={12} style={{ color: iconColor }} />
                                                </div>
                                            )}
                                            {suppCount > 0 && (
                                                <div className="flex items-center justify-center">
                                                    <Pill size={12} style={{ color: iconColor }} />
                                                </div>
                                            )}
                                            {buyCount > 0 && groupBuysEnabled && (
                                                <div className="flex items-center justify-center">
                                                    <ShoppingCart size={12} style={{ color: iconColor }} />
                                                </div>
                                            )}
                                        </div>
                                        {/* Tablet/Desktop: single row (sm/md) and 4-col line on lg+ */}
                                        <div className="hidden sm:flex justify-center lg:hidden items-center gap-1 sm:gap-1.5">
                                            {peptideCount > 0 && <Pipette className="w-3 h-3" style={{ color: iconColor }} />}
                                            {suppCount > 0 && <Pill className="w-3 h-3" style={{ color: iconColor }} />}
                                            {buyCount > 0 && groupBuysEnabled && <ShoppingCart className="w-3 h-3" style={{ color: iconColor }} />}
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

                                {/* Washout indicator - only show if enabled in settings */}
                                {showWashoutIcons && sched.washout && sched.washout.length > 0 && (
                                    <div className="mt-1">
                                        <span className="px-1 py-0.5 text-[8px] sm:text-[9px] rounded border border-gray-300 text-gray-800 bg-gray-200 font-bold" title={`Washout: ${sched.washout.join(', ')}`}>
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


