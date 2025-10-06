import React, { useState, useEffect } from 'react'
import { toKey } from './MonthGrid'
import { Droplet, Pill, Edit, Syringe, PenTool, Beaker, Target, CheckCircle, Check, ShoppingCart } from 'lucide-react'
import { isTaskCompleted, generateTaskId } from '../../utils/taskCompletion'
import TaskDisplay from './TaskDisplay'
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
const colorMap = penColors.reduce((acc, c) => ({ ...acc, [c.hex.toLowerCase()]: c.name }), {});

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, size = 12, color) {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Syringe size={size} style={{ color }} />;
        case 'powder': return <Beaker size={size} style={{ color }} />;
        case 'pill':
        case 'oral':
        default: return <Pill size={size} style={{ color }} />;
    }
}

function DeliveryIndicator({ item, theme }) {
    const size = 18;
    if (item.deliveryMethod === 'pen') {
        const hex = item.penColor || '#9ca3af';
        const colorName = colorMap[hex.toLowerCase()] || hex;
        const textColor = isColorDark(hex) ? 'white' : theme.text;
        return (
            <div 
                className="w-5 h-5 rounded-md flex items-center justify-center" 
                style={{ background: getChromeGradient(hex) }}
                title={`${colorName} Pen`}
            >
                <PenTool size={12} style={{ color: textColor }} />
            </div>
        );
    }
    if (item.deliveryMethod === 'syringe') {
        return (
            <div 
                className="w-5 h-5 rounded-md flex items-center justify-center" 
                style={{ backgroundColor: theme.secondary }}
                title="Syringe"
            >
                <Syringe size={12} style={{ color: theme.textLight }} />
            </div>
        );
    }
    return <Droplet size={12} style={{ color: theme.primary }} />;
}

export default function WeekView({ startDate, entries, scheduled, theme, onDayClick, onNotesClick, onTaskToggle, calendarBump }) {
  const [forceRender, setForceRender] = useState(0);
  
  // Force re-render when calendarBump changes (task completion sync)
  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [calendarBump]);
  
  // Listen for task completion events to sync with dashboard
  useEffect(() => {
    const handleTaskCompletionChange = (e) => {
      console.log('📡 WeekView received task completion event:', e.detail);
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    
    return () => {
      window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    };
  }, []);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })

  const renderDay = (date) => {
    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' })
    const isToday = toKey(date) === toKey(new Date())
    const dayKey = toKey(date)
    const dayNotes = entries[dayKey]
    const dayScheduled = scheduled[dayKey]
    
    // Calculate actual task completion status
    let totalTasks = 0;
    let completedTasks = 0;
    
    if (dayScheduled?.bySlot) {
      Object.keys(dayScheduled.bySlot).forEach(timeSlot => {
        const slot = dayScheduled.bySlot[timeSlot];
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
            const dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
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
            const dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            totalTasks++;
            if (isTaskCompleted(taskId, dateKey, timeSlot)) {
              completedTasks++;
            }
          });
        }
      });
    }
    
    // Count group buys as tasks (they don't have completion status, so they're always "completed")
    if (dayScheduled?.groupBuys && dayScheduled.groupBuys.length > 0) {
      totalTasks += dayScheduled.groupBuys.length;
      completedTasks += dayScheduled.groupBuys.length; // Group buys are always considered "completed" for display purposes
    }
    
    const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;

    // Resolve Group Buy display info (name, vendor, price) from multiple sources
    let groupBuyInfo = null;
    try {
      // Check if this day has a group buy scheduled
      if (dayScheduled?.groupBuys && dayScheduled.groupBuys.length > 0) {
        const gb = dayScheduled.groupBuys[0];
        
        if (gb && typeof gb === 'object') {
          // Robust name/vendor/price extraction with multiple fallbacks
          const name = `Group Buy For: ${gb.title || gb.name || gb.item || gb.peptide || gb.peptideName || (gb.group && gb.group.title) || 'Unknown Item'}`;
          const vendor = gb.vendor || gb.seller || gb.source || (gb.group && (gb.group.vendor || gb.group.name)) || '';
          const rawPrice = gb.cost ?? gb.price ?? gb.amount ?? '';
          const price = rawPrice !== '' ? `$${String(rawPrice).toString().replace(/^\$/,'')}` : '';
          groupBuyInfo = { name, vendor, price, source: 'scheduled' };
        } else if (gb) {
          // Group buy is just a string like "Group Buy"
          // For now, we'll show a more descriptive fallback since we don't have detailed data
          groupBuyInfo = { 
            name: String(gb) === 'Group Buy' ? 'Group Buy For: Available' : `Group Buy For: ${String(gb)}`, 
            vendor: '', 
            price: '', 
            source: 'scheduled' 
          };
        }
      }
      
      // Also check orders for this specific day as a fallback
      if (!groupBuyInfo) {
        const rawOrders = localStorage.getItem('tpprover_orders');
        const orders = rawOrders ? JSON.parse(rawOrders) : [];
        const orderMatch = orders.find(o => {
          try {
            const d = (o.date || '').slice(0,10);
            return d === dayKey && (!!o.group || !!o.vendor || !!o.cost || !!o.price);
          } catch { return false; }
        });
        if (orderMatch) {
          const name = `Group Buy For: ${(orderMatch.group && (orderMatch.group.title || orderMatch.group.name)) || orderMatch.peptide || orderMatch.item || 'Unknown Item'}`;
          const vendor = orderMatch.vendor || orderMatch.seller || orderMatch.source || '';
          const rawPrice = orderMatch.cost ?? orderMatch.price ?? orderMatch.amount ?? '';
          const price = rawPrice !== '' ? `$${String(rawPrice).toString().replace(/^\$/,'')}` : '';
          groupBuyInfo = { name, vendor, price, source: 'orders' };
        }
      }
    } catch (error) {
      console.error('WeekView - Error processing group buy:', error);
    }

    return (
      <div key={date.toISOString()} className="w-full rounded border" style={{ borderColor: theme.border }}>
        <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: theme.border, backgroundColor: isToday ? theme.primary : theme.accent }}>
          <span className="font-semibold text-sm flex items-center gap-1" style={{ color: isToday ? theme.textOnPrimary : theme.primaryDark }}>{isToday ? 'Today' : dayOfWeek}{allTasksCompleted && <span title="All tasks done">✓</span>}</span>
          <span 
            className={`font-bold text-lg flex items-center justify-center rounded-full w-8 h-8`}
            style={{
                backgroundColor: isToday ? 'rgba(255,255,255,0.2)' : theme.secondary,
                color: isToday ? theme.textOnPrimary: theme.primaryDark,
            }}
          >
            {date.getDate()}
          </span>
        </div>
        <div className="p-2 space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-2">
                {/* AM Slot */}
                <div className="rounded p-1 min-h-[60px]" style={{ backgroundColor: theme.cardBackground }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: theme.textLight }}>AM</div>
                    <SlotContent 
                        scheduled={dayScheduled?.bySlot?.AM || dayScheduled?.bySlot?.Morning} 
                        theme={theme} 
                        date={date}
                        timeSlot="AM"
                        onTaskToggle={onTaskToggle}
                    />
                </div>

                {/* Separator and PM Slot */}
                <div className="mt-2 border-t pt-2 sm:mt-0 sm:border-t-0 sm:border-l sm:pl-2" style={{ borderColor: theme.border }}>
                    <div className="rounded p-1 min-h-[60px]" style={{ backgroundColor: theme.cardBackground }}>
                        <div className="text-xs font-semibold mb-1" style={{ color: theme.textLight }}>PM</div>
                        <SlotContent 
                            scheduled={dayScheduled?.bySlot?.PM || dayScheduled?.bySlot?.Evening} 
                            theme={theme} 
                            date={date}
                            timeSlot="PM"
                            onTaskToggle={onTaskToggle}
                        />
                    </div>
                </div>
            </div>

            {/* Group Buys - subtle single-line chip with link */}
            {groupBuyInfo && (
                <div className="mt-2">
                    <button
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs max-w-full"
                        style={{ backgroundColor: theme.secondary, color: theme.text }}
                        onClick={() => {
                            if (typeof window?.showGroupBuyDetails === 'function') {
                                window.showGroupBuyDetails(groupBuyInfo);
                            }
                        }}
                        title="View group buy details"
                    >
                        <ShoppingCart size={12} style={{ color: '#9B9B7A' }} />
                        <span className="truncate max-w-[260px]">
                            {groupBuyInfo.name}
                            {(groupBuyInfo.vendor || groupBuyInfo.price) && (
                                <span className="text-[10px] opacity-70"> {` — ${groupBuyInfo.vendor || ''}${groupBuyInfo.vendor && groupBuyInfo.price ? ' • ' : ''}${groupBuyInfo.price || ''}`}</span>
                            )}
                        </span>
                    </button>
                </div>
            )}

            {/* Goals Section */}
            {dayScheduled?.goals && dayScheduled.goals.length > 0 && (
                <div className="mt-2 p-2 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.secondary + '40' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: theme.text }}>Goals</div>
                    <div className="space-y-1">
                        {dayScheduled.goals.map((g, i) => (
                            <div key={`goal-${i}`} className="flex items-center gap-2 text-xs">
                                {g.completed ? 
                                    <CheckCircle size={12} style={{ color: theme.success }} /> :
                                    <Target size={12} style={{ color: theme.warning }} />
                                }
                                <span className={`flex-1 truncate ${g.completed ? 'line-through' : ''}`} 
                                      style={{ color: g.completed ? theme.textLight : theme.text }}>
                                    {g.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

          <div className="mt-1">
            <div className="flex justify-end items-center text-xs font-semibold">
              <button onClick={() => onNotesClick(date)} className="p-1 hover:bg-gray-100 rounded">
                <Edit size={14} />
              </button>
            </div>
            {dayNotes && (
              <div 
                onClick={() => onNotesClick(date)}
                className="p-2 rounded-md border text-xs cursor-pointer mt-1 hover:opacity-90"
                style={{ 
                  backgroundColor: theme.secondary,
                  borderColor: theme.border,
                  color: theme.text
                }}
                title="View or edit notes"
              >
                {dayNotes}
              </div>
            )}
          </div>
            {dayScheduled?.washout?.length > 0 && (
                <div className="p-1 rounded text-center mt-2" style={{ backgroundColor: theme.secondary }}>
                    <span className="text-xs font-semibold" style={{ color: theme.textLight }}>
                        Washout: {dayScheduled.washout.join(', ')}
                    </span>
                </div>
            )}
            {/* Removed duplicate footer group buy banner */}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {days.map(renderDay)}
    </div>
  )
}

function SlotContent({ scheduled, theme, date, timeSlot, onTaskToggle }) {
  if (!scheduled || (!scheduled.peptides?.length && !scheduled.supplements?.length)) {
    return <div className="text-xs text-center pt-4" style={{ color: theme.textLight }}>-</div>
  }

  const dateKey = toKey(date);

  const createTaskFromItem = (item, type) => {
    const name = typeof item === 'object' ? item.name : item;
    const dose = typeof item === 'object' ? item.dose : '';
    const unit = typeof item === 'object' ? item.unit : '';
    const delivery = typeof item === 'object' ? item.delivery : (type === 'peptide' ? 'injection' : 'oral');
    const deliveryMethod = typeof item === 'object' ? item.deliveryMethod : delivery;
    const penColor = typeof item === 'object' ? item.penColor : undefined;
    const penType = typeof item === 'object' ? item.penType : undefined;
    
    return {
      id: `${type}-${name}-${dose}-${unit}-${timeSlot}`.toLowerCase().replace(/\s+/g, '-'),
      name,
      dose,
      unit,
      type,
      time: timeSlot,
      delivery,
      deliveryMethod,
      penColor,
      penType,
      stableTaskId: generateTaskId({
        name,
        dose,
        unit,
        type,
        time: timeSlot
      })
    };
  };

  return (
    <div className="space-y-1">
      {scheduled.peptides?.map((p, i) => {
        const task = createTaskFromItem(p, 'peptide');
        return (
          <TaskDisplay
            key={`p-${i}`}
            task={task}
            theme={theme}
            date={date}
            timeSlot={timeSlot}
            onToggle={onTaskToggle}
            size="compact"
          />
        );
      })}
      {scheduled.supplements?.map((s, i) => {
        const task = createTaskFromItem(s, 'supplement');
        return (
          <TaskDisplay
            key={`s-${i}`}
            task={task}
            theme={theme}
            date={date}
            timeSlot={timeSlot}
            onToggle={onTaskToggle}
            size="compact"
          />
        );
      })}
    </div>
  )
}


