import React, { useState, useEffect } from 'react'
import { toKey } from './MonthGrid'
import { Pill, Edit, PenTool, Beaker, Target, CheckCircle, Check, ShoppingCart, Pipette, ChevronDown, ChevronUp, Calendar, Building, MapPin, Users, DollarSign, FileText } from 'lucide-react'
import { isTaskCompleted, generateTaskId, toggleTaskCompletion } from '../../utils/taskCompletion'
import TaskDisplay from './TaskDisplay'
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';
import { formatMMDDYYYY } from '../../utils/date';
import { useAppContext } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';
import { safeLocalStorageGet } from '../../utils/dataBleedDiagnostic';
import { areGroupBuysEnabled } from '../../utils/featureSettings';
const colorMap = penColors.reduce((acc, c) => ({ ...acc, [c.hex.toLowerCase()]: c.name }), {});

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, size = 12, color) {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Pipette size={size} style={{ color }} />;
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
    if (item.deliveryMethod === 'syringe' || item.deliveryMethod === 'pipette') {
        return (
            <div 
                className="w-5 h-5 rounded-md flex items-center justify-center" 
                style={{ backgroundColor: theme.secondary }}
                title="Syringe"
            >
                <Pipette size={12} style={{ color: theme.textLight }} />
            </div>
        );
    }
      return <Pipette size={12} style={{ color: theme.primary }} />;
}

export default function WeekView({ startDate, entries, scheduled, theme, onDayClick, onNotesClick, onTaskToggle, calendarBump, onMarkAllDone }) {
  const { scheduledBuys } = useAppContext();
  const { firebaseUser } = useFirebase();
  const [forceRender, setForceRender] = useState(0);
  const [expandedGroupBuy, setExpandedGroupBuy] = useState(null); // Track which group buy is expanded (dayKey)
  const [expandedGroupBuyData, setExpandedGroupBuyData] = useState(null); // Full data for expanded group buy
  
  // Check if group buys are enabled
  const groupBuysEnabled = areGroupBuysEnabled();
  
  // Reset expanded state on refresh/calendar bump
  useEffect(() => {
    setExpandedGroupBuy(null);
    setExpandedGroupBuyData(null);
  }, [calendarBump, startDate]);
  
  // Force re-render when calendarBump changes (task completion sync)
  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [calendarBump]);

  // Force re-render when startDate changes (Today button navigation)
  useEffect(() => {
    setForceRender(prev => prev + 1);
    
    // Scroll to today's day when startDate changes (Today button clicked)
    const today = new Date();
    const todayKey = toKey(today);
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
    
    // Check if today is in this week
    const isTodayInWeek = weekDays.some(day => toKey(day) === todayKey);
    
    if (isTodayInWeek) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const todayElement = document.querySelector(`[data-day-key="${todayKey}"]`);
        if (todayElement) {
          todayElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [startDate]);
  
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
          const item = gb.item || gb.title || gb.name || gb.peptide || gb.peptideName || (gb.group && gb.group.title) || 'Unknown Item';
          const name = `Group Buy For: ${item}`;
          const vendor = gb.vendor || gb.seller || gb.source || (gb.group && (gb.group.vendor || gb.group.name)) || '';
          const rawPrice = gb.cost ?? gb.price ?? gb.amount ?? '';
          const price = rawPrice !== '' ? `$${String(rawPrice).toString().replace(/^\$/,'')}` : '';
          groupBuyInfo = { name, item, vendor, price, source: 'scheduled', openDate: gb.openDate, closeDate: gb.closeDate, location: gb.location, participants: gb.participants, notes: gb.notes };
        } else if (gb) {
          // Group buy is just a string like "Group Buy"
          const item = String(gb) === 'Group Buy' ? 'Available' : String(gb);
          groupBuyInfo = { 
            name: `Group Buy For: ${item}`, 
            item,
            vendor: '', 
            price: '', 
            source: 'scheduled' 
          };
        }
      }
      
      // Also check orders for this specific day as a fallback
      if (!groupBuyInfo) {
        // Use safe localStorage getter to prevent data bleed
        const orders = firebaseUser?.email 
          ? (safeLocalStorageGet('tpprover_orders', firebaseUser.email) || [])
          : [];
        const orderMatch = orders.find(o => {
          try {
            const d = (o.date || '').slice(0,10);
            return d === dayKey && (!!o.group || !!o.vendor || !!o.cost || !!o.price);
          } catch { return false; }
        });
        if (orderMatch) {
          const item = (orderMatch.group && (orderMatch.group.title || orderMatch.group.name)) || orderMatch.peptide || orderMatch.item || 'Unknown Item';
          const name = `Group Buy For: ${item}`;
          const vendor = orderMatch.vendor || orderMatch.seller || orderMatch.source || '';
          const rawPrice = orderMatch.cost ?? orderMatch.price ?? orderMatch.amount ?? '';
          const price = rawPrice !== '' ? `$${String(rawPrice).toString().replace(/^\$/,'')}` : '';
          groupBuyInfo = { 
            name, 
            item,
            vendor, 
            price, 
            source: 'orders',
            openDate: orderMatch.date,
            closeDate: orderMatch.date,
            location: orderMatch.location,
            participants: orderMatch.group?.participants,
            notes: orderMatch.group?.notes || orderMatch.notes
          };
        }
      }
    } catch (error) {
      console.error('WeekView - Error processing group buy:', error);
    }

    return (
      <div key={date.toISOString()} data-day-key={dayKey} className="w-full rounded border" style={{ borderColor: isToday ? theme.primary : theme.accent }}>
        <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: isToday ? theme.primary : theme.accent, backgroundColor: isToday ? theme.primary : theme.accent }}>
          <span className="font-semibold text-sm flex items-center gap-1" style={{ color: isToday ? theme.textOnPrimary : (theme.isDark ? '#29303b' : theme.primaryDark) }}>{isToday ? 'Today' : dayOfWeek}{allTasksCompleted && <span title="All tasks done">✓</span>}</span>
          <span 
            className={`font-bold text-lg flex items-center justify-center rounded-full w-8 h-8`}
            style={{
                backgroundColor: isToday ? 'rgba(255,255,255,0.2)' : (theme.isDark ? '#1f2937' : theme.secondary),
                color: isToday ? theme.textOnPrimary : (theme.isDark ? theme.text : theme.primaryDark),
            }}
          >
            {date.getDate()}
          </span>
        </div>
        <div className="p-2 space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-2">
                {/* AM Slot */}
                <div className="rounded p-1 min-h-[60px]" style={{ backgroundColor: theme.cardBackground }}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-semibold" style={{ color: theme.textLight }}>AM</div>
                        {dayScheduled?.bySlot?.AM && (dayScheduled.bySlot.AM.peptides?.length > 0 || dayScheduled.bySlot.AM.supplements?.length > 0) && (
                            <MarkAllButton
                                date={date}
                                timeSlot="AM"
                                scheduled={dayScheduled.bySlot.AM}
                                theme={theme}
                                onMarkAllDone={onMarkAllDone}
                                calendarBump={calendarBump}
                            />
                        )}
                    </div>
                    <SlotContent 
                        scheduled={dayScheduled?.bySlot?.AM} 
                        theme={theme} 
                        date={date}
                        timeSlot="AM"
                        onTaskToggle={onTaskToggle}
                    />
                </div>

                {/* Separator and PM Slot */}
                <div className="mt-2 border-t pt-2 sm:mt-0 sm:border-t-0 sm:border-l sm:pl-2" style={{ borderColor: theme.border }}>
                    <div className="rounded p-1 min-h-[60px]" style={{ backgroundColor: theme.cardBackground }}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold" style={{ color: theme.textLight }}>PM</div>
                            {dayScheduled?.bySlot?.PM && (dayScheduled.bySlot.PM.peptides?.length > 0 || dayScheduled.bySlot.PM.supplements?.length > 0) && (
                                <MarkAllButton
                                    date={date}
                                    timeSlot="PM"
                                    scheduled={dayScheduled.bySlot.PM}
                                    theme={theme}
                                    onMarkAllDone={onMarkAllDone}
                                    calendarBump={calendarBump}
                                />
                            )}
                        </div>
                        <SlotContent 
                            scheduled={dayScheduled?.bySlot?.PM} 
                            theme={theme} 
                            date={date}
                            timeSlot="PM"
                            onTaskToggle={onTaskToggle}
                        />
                    </div>
                </div>
            </div>

            {/* Group Buys - expandable chip */}
            {groupBuyInfo && groupBuysEnabled && (
                <div className="mt-2">
                    <button
                        className="w-full inline-flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-all cursor-pointer"
                        style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary, color: theme.text }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const isExpanded = expandedGroupBuy === dayKey;
                            if (isExpanded) {
                                setExpandedGroupBuy(null);
                                setExpandedGroupBuyData(null);
                            } else {
                                // Find full group buy data
                                let fullData = null;
                                
                                // Try to find in scheduledBuys
                                if (groupBuyInfo.item) {
                                    fullData = (scheduledBuys || []).find(buy => {
                                        const buyItem = buy.item || buy.name || '';
                                        return buyItem === groupBuyInfo.item || buyItem.toLowerCase() === groupBuyInfo.item.toLowerCase();
                                    });
                                }
                                
                                // If not found, check orders
                                if (!fullData) {
                                    try {
                                        const rawOrders = localStorage.getItem('tpprover_orders');
                                        const orders = rawOrders ? JSON.parse(rawOrders) : [];
                                        const orderMatch = orders.find(o => {
                                            try {
                                                const oDate = (o.date || '').slice(0, 10);
                                                return oDate === dayKey && (!!o.group || o.category === 'groupbuy' || o.type === 'groupbuy');
                                            } catch { return false; }
                                        });
                                        
                                        if (orderMatch) {
                                            // Include all fields from the order, preserving everything
                                            fullData = {
                                                item: (orderMatch.group && (orderMatch.group.title || orderMatch.group.name)) || orderMatch.peptide || orderMatch.item || 'Unknown Item',
                                                vendor: orderMatch.vendor || '',
                                                price: orderMatch.cost || orderMatch.price || '',
                                                openDate: orderMatch.date || '',
                                                closeDate: orderMatch.date || '',
                                                location: orderMatch.location || '',
                                                participants: orderMatch.group?.participants || '',
                                                notes: orderMatch.group?.notes || orderMatch.notes || '',
                                                // Include any other fields from the order
                                                ...orderMatch,
                                                // Override with group-specific data if available
                                                ...(orderMatch.group || {})
                                            };
                                        }
                                    } catch (error) {
                                        console.error('Error finding group buy in orders:', error);
                                    }
                                }
                                
                                // Use full data if found, otherwise use the basic info
                                // Spread all properties to ensure we don't miss any fields
                                const groupBuyData = fullData ? { ...fullData } : {
                                    item: groupBuyInfo.item || groupBuyInfo.name?.replace('Group Buy For: ', '') || 'Unknown Item',
                                    vendor: groupBuyInfo.vendor || '',
                                    price: groupBuyInfo.price || '',
                                    openDate: groupBuyInfo.openDate || '',
                                    closeDate: groupBuyInfo.closeDate || '',
                                    location: groupBuyInfo.location || '',
                                    participants: groupBuyInfo.participants || '',
                                    notes: groupBuyInfo.notes || '',
                                    // Include any other fields from groupBuyInfo
                                    ...groupBuyInfo
                                };
                                
                                setExpandedGroupBuy(dayKey);
                                setExpandedGroupBuyData(groupBuyData);
                            }
                        }}
                        title={expandedGroupBuy === dayKey ? "Collapse group buy details" : "Expand group buy details"}
                    >
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                            <ShoppingCart size={12} style={{ color: '#9B9B7A' }} />
                            <span className="truncate">
                                {groupBuyInfo.name}
                                {(groupBuyInfo.vendor || groupBuyInfo.price) && (
                                    <span className="text-[10px] opacity-70"> {` — ${groupBuyInfo.vendor || ''}${groupBuyInfo.vendor && groupBuyInfo.price ? ' • ' : ''}${groupBuyInfo.price || ''}`}</span>
                                )}
                            </span>
                        </div>
                        {expandedGroupBuy === dayKey ? (
                            <ChevronUp size={14} style={{ color: theme.textLight }} />
                        ) : (
                            <ChevronDown size={14} style={{ color: theme.textLight }} />
                        )}
                    </button>
                    
                    {/* Expanded details */}
                    {expandedGroupBuy === dayKey && expandedGroupBuyData && (
                        <div className="mt-2 p-3 rounded-lg space-y-3" style={{ backgroundColor: theme.isDark ? '#111827' : theme.cardBackground, border: `1px solid ${theme.border}` }}>
                            {/* Item Name */}
                            <div className="pb-2 border-b" style={{ borderColor: theme.border }}>
                                <p className="font-semibold text-sm" style={{ color: theme.text }}>{expandedGroupBuyData.item || 'Unknown Item'}</p>
                            </div>
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Host */}
                                {expandedGroupBuyData.vendor && (
                                    <div className="flex items-start gap-2">
                                        <Building size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Host</div>
                                            <div className="text-xs" style={{ color: theme.text }}>{expandedGroupBuyData.vendor}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Price */}
                                {expandedGroupBuyData.price && (
                                    <div className="flex items-start gap-2">
                                        <DollarSign size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Price</div>
                                            <div className="text-xs" style={{ color: theme.text }}>${String(expandedGroupBuyData.price).replace(/^\$/, '')}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Open Date */}
                                {expandedGroupBuyData.openDate && (
                                    <div className="flex items-start gap-2">
                                        <Calendar size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Opens</div>
                                            <div className="text-xs" style={{ color: theme.text }}>{formatMMDDYYYY(expandedGroupBuyData.openDate)}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Close Date */}
                                {expandedGroupBuyData.closeDate && (
                                    <div className="flex items-start gap-2">
                                        <Calendar size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Closes</div>
                                            <div className="text-xs" style={{ color: theme.text }}>{formatMMDDYYYY(expandedGroupBuyData.closeDate)}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Platform */}
                                {expandedGroupBuyData.location && (
                                    <div className="flex items-start gap-2">
                                        <MapPin size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Platform</div>
                                            <div className="text-xs" style={{ color: theme.text }}>{expandedGroupBuyData.location}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Participants */}
                                {expandedGroupBuyData.participants && (
                                    <div className="flex items-start gap-2">
                                        <Users size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Participants</div>
                                            <div className="text-xs" style={{ color: theme.text }}>{expandedGroupBuyData.participants}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes - Always show section, even if empty */}
                            <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText size={14} style={{ color: theme.textLight }} />
                                    <div className="text-[10px] font-semibold" style={{ color: theme.textLight }}>Notes</div>
                                </div>
                                <p className="text-xs whitespace-pre-wrap" style={{ color: expandedGroupBuyData.notes ? theme.text : theme.textLight }}>
                                    {expandedGroupBuyData.notes || 'No notes available'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Goals Section */}
            {dayScheduled?.goals && dayScheduled.goals.length > 0 && (
                <div className="mt-2 p-2 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1f2937' : theme.secondary + '40' }}>
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
              <button onClick={() => onNotesClick(date)} className="p-1 rounded transition-all" style={{ color: theme.textLight }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Edit size={14} />
              </button>
            </div>
            {dayNotes && (
              <div 
                onClick={() => onNotesClick(date)}
                className="p-2 rounded-md border text-xs cursor-pointer mt-1 hover:opacity-90"
                style={{ 
                  backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                  borderColor: theme.border,
                  color: theme.text
                }}
                title="View or edit notes"
              >
                {typeof dayNotes === 'string' ? dayNotes : 
                 typeof dayNotes === 'object' && dayNotes.text ? dayNotes.text : 
                 String(dayNotes)}
              </div>
            )}
          </div>
            {dayScheduled?.washout?.length > 0 && (
                <div className="p-1 rounded text-center mt-2" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}>
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

// Subtle Mark All button component
function MarkAllButton({ date, timeSlot, scheduled, theme, onMarkAllDone, calendarBump }) {
  const dateKey = toKey(date);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  
  // Calculate completion status
  useEffect(() => {
    let total = 0;
    let completed = 0;
    
    const slotKey = timeSlot === 'AM' ? 'AM' : 'PM';
    
    // Count peptides
    if (scheduled.peptides) {
      scheduled.peptides.forEach(peptide => {
        total++;
        const task = {
          type: 'peptide',
          name: peptide.name,
          dose: peptide.dose || '',
          unit: peptide.unit || '',
          time: slotKey
        };
        const taskId = generateTaskId(task);
        if (isTaskCompleted(taskId, dateKey, slotKey)) {
          completed++;
        }
      });
    }
    
    // Count supplements
    if (scheduled.supplements) {
      scheduled.supplements.forEach(supplement => {
        total++;
        const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
        const task = {
          type: 'supplement',
          name: suppData.name,
          dose: suppData.dose || '',
          unit: '',
          time: slotKey
        };
        const taskId = generateTaskId(task);
        if (isTaskCompleted(taskId, dateKey, slotKey)) {
          completed++;
        }
      });
    }
    
    setTotalTasks(total);
    setCompletedCount(completed);
  }, [dateKey, timeSlot, scheduled, calendarBump]);
  
  // Listen for completion changes
  useEffect(() => {
    const handleTaskCompletionChange = () => {
      let total = 0;
      let completed = 0;
      const slotKey = timeSlot === 'AM' ? 'AM' : 'PM';
      
      if (scheduled.peptides) {
        scheduled.peptides.forEach(peptide => {
          total++;
          const task = {
            type: 'peptide',
            name: peptide.name,
            dose: peptide.dose || '',
            unit: peptide.unit || '',
            time: slotKey
          };
          const taskId = generateTaskId(task);
          if (isTaskCompleted(taskId, dateKey, slotKey)) {
            completed++;
          }
        });
      }
      
      if (scheduled.supplements) {
        scheduled.supplements.forEach(supplement => {
          total++;
          const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
          const task = {
            type: 'supplement',
            name: suppData.name,
            dose: suppData.dose || '',
            unit: '',
            time: slotKey
          };
          const taskId = generateTaskId(task);
          if (isTaskCompleted(taskId, dateKey, slotKey)) {
            completed++;
          }
        });
      }
      
      setTotalTasks(total);
      setCompletedCount(completed);
    };
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    return () => window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
  }, [dateKey, timeSlot, scheduled]);
  
  if (totalTasks === 0) return null;
  if (completedCount === totalTasks) {
    return (
      <div className="flex items-center gap-1" style={{ color: theme.success }}>
        <Check size={10} />
        <span className="text-[9px] font-medium">Done</span>
      </div>
    );
  }
  
  return (
    <button
      onClick={() => onMarkAllDone && onMarkAllDone(date, timeSlot, scheduled)}
      className="text-[9px] font-medium px-1.5 py-0.5 rounded transition-all hover:opacity-80"
      style={{
        backgroundColor: theme.primary + (theme.isDark ? '30' : '20'),
        color: theme.primary
      }}
      title={`Check all ${timeSlot} tasks as done`}
    >
      Check All
    </button>
  );
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


