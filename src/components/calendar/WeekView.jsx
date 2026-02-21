import React, { useState, useEffect } from 'react'
import { toKey } from './MonthGrid'
import { Pill, Edit, PenTool, Beaker, Target, CheckCircle, Check, ShoppingCart, Pipette, ChevronDown, ChevronUp, Calendar, Building, MapPin, Users, DollarSign, FileText, Star, Sun, Moon, X } from 'lucide-react'
import { isTaskCompleted, generateTaskId, toggleTaskCompletion } from '../../utils/taskCompletion'
import TaskDisplay from './TaskDisplay'
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';
import { formatMMDDYYYY } from '../../utils/date';
import { useAppContext } from '../../context/AppContext';
import { areGroupBuysEnabled } from '../../utils/featureSettings';
import { getNotesForDate } from '../../utils/protocolHistory';
import { getCalendarNoteText, hasCalendarNotes as hasCalendarNotesUtil } from '../../utils/calendarNotesMigration';
import Modal from '../common/Modal';
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
  const { scheduledBuys, orders: ctxOrders } = useAppContext();
  const [forceRender, setForceRender] = useState(0);
  const [expandedGroupBuy, setExpandedGroupBuy] = useState(null); // Track which group buy is expanded (dayKey)
  const [expandedGroupBuyData, setExpandedGroupBuyData] = useState(null); // Full data for expanded group buy
  const [selectedNote, setSelectedNote] = useState(null); // Selected protocol note for modal display
  
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

  // Listen for protocol history updates to refresh protocol notes
  useEffect(() => {
    const handleProtocolHistoryUpdate = () => {
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener('tpp:protocol-history-updated', handleProtocolHistoryUpdate);
    
    return () => {
      window.removeEventListener('tpp:protocol-history-updated', handleProtocolHistoryUpdate);
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
    // Get note text from new ID-based structure
    const dayNotesText = entries[dayKey] ? getCalendarNoteText(entries, dayKey) : ''
    const dayScheduled = scheduled[dayKey]
    
    // Get protocol notes for this date
    const protocolNotes = getNotesForDate(dayKey)
    
    // Debug: Log notes for today
    if (isToday && protocolNotes.length > 0) {
      console.log('📝 WeekView: Found protocol notes for today:', protocolNotes);
    }
    
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
              time: timeSlot,
              protocolId: peptide?.protocolId,
              peptideId: peptide?.peptideId
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
        const orders = ctxOrders || [];
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
      <div key={date.toISOString()} data-day-key={dayKey} className="w-full rounded-2xl overflow-hidden"
        style={{
          background: isToday 
            ? (theme.isDark 
                ? `linear-gradient(135deg, rgba(62, 68, 80, 0.98), rgba(50, 56, 66, 0.99))`
                : `linear-gradient(180deg, ${theme.accent}F8 0%, rgba(255,255,255,0.97) 30%, rgba(255,255,255,0.95) 100%)`)
            : (theme.isDark 
                ? 'linear-gradient(135deg, rgba(50, 55, 65, 0.7), rgba(42, 47, 56, 0.75))'
                : `linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.55) 100%)`),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isToday 
            ? `1.5px solid ${theme.isDark ? theme.primary + '40' : theme.primary + '35'}`
            : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
          boxShadow: isToday 
            ? (theme.isDark 
                ? `0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px ${theme.primary}15` 
                : `0 4px 20px ${theme.primary}18, 0 0 0 1px ${theme.primary}10`)
            : (theme.isDark 
                ? '0 2px 8px rgba(0,0,0,0.15)' 
                : '0 2px 8px rgba(0,0,0,0.04)'),
          opacity: isToday ? 1 : 0.85,
        }}
      >
        {/* Header - gradient style matching DayModal */}
        <div className="px-3 py-2.5 flex-shrink-0" style={{ 
          borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : theme.primary + '15'}`,
          background: isToday 
            ? (theme.isDark 
                ? `linear-gradient(135deg, ${theme.primary}25, rgba(255,255,255,0.04))` 
                : `linear-gradient(135deg, ${theme.primary}28, ${theme.primaryLight}18, transparent)`)
            : (theme.isDark 
                ? `linear-gradient(135deg, rgba(255,255,255,0.03), transparent)` 
                : `linear-gradient(135deg, rgba(0,0,0,0.02), transparent)`),
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className={`tracking-tight ${isToday ? 'text-sm font-bold' : 'text-xs font-semibold'}`} style={{ color: isToday ? theme.text : theme.textLight }}>
                {isToday ? 'Today' : dayOfWeek}
              </h3>
              {allTasksCompleted && (
                <CheckCircle size={14} style={{ color: theme.success || '#4CAF50' }} strokeWidth={2.5} />
              )}
            </div>
            <span 
              className={`font-bold flex items-center justify-center rounded-full ${isToday ? 'text-sm w-7 h-7' : 'text-xs w-6 h-6'}`}
              style={{
                backgroundColor: isToday ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                color: isToday ? (theme.textOnPrimary || '#ffffff') : theme.textLight,
                boxShadow: isToday ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              {date.getDate()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-2.5 py-2 space-y-0.5">
          {/* AM Section */}
          <div>
            <div className="flex items-center justify-between mb-0.5 px-1">
              <div className="flex items-center gap-1.5">
                <Sun size={11} style={{ color: theme.isDark ? 'rgba(160, 180, 153, 0.6)' : theme.primary }} />
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: theme.textLight }}>Morning</span>
              </div>
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

          {/* Faded separator between AM/PM */}
          <div className="widget-separator" style={{ marginBottom: '0.15rem', paddingBottom: '0.1rem' }} />

          {/* PM Section */}
          <div>
            <div className="flex items-center justify-between mb-0.5 px-1">
              <div className="flex items-center gap-1.5">
                <Moon size={11} style={{ color: theme.isDark ? 'rgba(160, 180, 153, 0.85)' : theme.primaryDark }} />
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: theme.textLight }}>Evening</span>
              </div>
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

          {/* Goals Section */}
          {dayScheduled?.goals && dayScheduled.goals.length > 0 && (
            <>
              <div className="widget-separator" style={{ marginTop: '0.15rem', marginBottom: '0.15rem' }} />
              <div>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <Target size={12} style={{ color: theme.primary }} />
                  <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: theme.textLight }}>Goals</span>
                </div>
                <div className="space-y-1">
                  {dayScheduled.goals.map((g, i) => (
                    <div key={`goal-${i}`} className="flex items-center gap-2 text-xs py-1 px-2"
                      style={{
                        borderLeft: `3px solid ${g.completed ? (theme.success || '#4CAF50') + '60' : theme.primary + '40'}`,
                      }}
                    >
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
            </>
          )}

          {/* Notes Section */}
          <div className="widget-separator" style={{ marginTop: '0.15rem', marginBottom: '0.15rem' }} />
          <div>
            <div className="flex justify-between items-center mb-0.5 px-1">
              <div className="flex items-center gap-1.5">
                <FileText size={11} style={{ color: theme.primary }} />
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: theme.textLight }}>Notes</span>
              </div>
              <button onClick={() => onNotesClick(date)} className="p-1 rounded-lg transition-all" style={{ color: theme.textLight }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Edit size={13} />
              </button>
            </div>
            {dayNotesText && (
              <div 
                onClick={() => onNotesClick(date)}
                className="py-1.5 px-2.5 rounded-lg text-xs cursor-pointer hover:opacity-90"
                style={{ 
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderLeft: `3px solid ${theme.primary}40`,
                  color: theme.text
                }}
                title="View or edit notes"
              >
                {dayNotesText}
              </div>
            )}
            
            {/* Protocol Notes Chips */}
            {protocolNotes && protocolNotes.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {protocolNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg text-xs cursor-pointer hover:opacity-90 transition-all"
                    style={{
                      backgroundColor: note.type === 'follow_up' 
                        ? (theme.isDark ? 'rgba(60, 78, 58, 0.5)' : '#e6f7f0')
                        : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
                      border: `1px solid ${note.type === 'follow_up' ? theme.primary + '40' : theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                      color: theme.text
                    }}
                    title={`${note.protocolName || 'Protocol'} - ${note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : 'Note'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNote(note);
                    }}
                  >
                    <FileText size={12} style={{ color: note.type === 'follow_up' ? theme.primary : theme.textLight }} />
                    <span className="flex-1 truncate font-medium" style={{ color: note.type === 'follow_up' ? theme.primary : theme.text }}>
                      {note.protocolName ? (note.protocolName.length > 15 ? note.protocolName.substring(0, 15) + '...' : note.protocolName) : 'Protocol'}
                    </span>
                    {note.type === 'follow_up' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                        FOLLOW UP
                      </span>
                    )}
                    {note.type === 'during' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.border, color: theme.text }}>
                        MID-CYCLE NOTE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Group Buys - expandable chip */}
          {groupBuyInfo && groupBuysEnabled && (
            <div className="mt-1">
              <button
                className="w-full p-1.5 rounded-lg text-center hover:opacity-80 transition-all cursor-pointer"
                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const isExpanded = expandedGroupBuy === dayKey;
                  if (isExpanded) {
                    setExpandedGroupBuy(null);
                    setExpandedGroupBuyData(null);
                  } else {
                    let fullData = null;
                    
                    if (groupBuyInfo.item) {
                      fullData = (scheduledBuys || []).find(buy => {
                        const buyItem = buy.item || buy.name || '';
                        return buyItem === groupBuyInfo.item || buyItem.toLowerCase() === groupBuyInfo.item.toLowerCase();
                      });
                    }
                    
                    if (!fullData) {
                      try {
                        const orders = ctxOrders || [];
                        const orderMatch = orders.find(o => {
                          try {
                            const oDate = (o.date || '').slice(0, 10);
                            return oDate === dayKey && (!!o.group || o.category === 'groupbuy' || o.type === 'groupbuy');
                          } catch { return false; }
                        });
                        
                        if (orderMatch) {
                          fullData = {
                            item: (orderMatch.group && (orderMatch.group.title || orderMatch.group.name)) || orderMatch.peptide || orderMatch.item || 'Unknown Item',
                            vendor: orderMatch.vendor || '',
                            price: orderMatch.cost || orderMatch.price || '',
                            openDate: orderMatch.date || '',
                            closeDate: orderMatch.date || '',
                            location: orderMatch.location || '',
                            participants: orderMatch.group?.participants || '',
                            notes: orderMatch.group?.notes || orderMatch.notes || '',
                            ...orderMatch,
                            ...(orderMatch.group || {})
                          };
                        }
                      } catch (error) {
                        console.error('Error finding group buy in orders:', error);
                      }
                    }
                    
                    const groupBuyData = fullData ? { ...fullData } : {
                      item: groupBuyInfo.item || groupBuyInfo.name?.replace('Group Buy For: ', '') || 'Unknown Item',
                      vendor: groupBuyInfo.vendor || '',
                      price: groupBuyInfo.price || '',
                      openDate: groupBuyInfo.openDate || '',
                      closeDate: groupBuyInfo.closeDate || '',
                      location: groupBuyInfo.location || '',
                      participants: groupBuyInfo.participants || '',
                      notes: groupBuyInfo.notes || '',
                      ...groupBuyInfo
                    };
                    
                    setExpandedGroupBuy(dayKey);
                    setExpandedGroupBuyData(groupBuyData);
                  }
                }}
                title={expandedGroupBuy === dayKey ? "Collapse group buy details" : "Expand group buy details"}
              >
                <div className="flex items-center justify-center gap-1">
                  <ShoppingCart size={12} style={{ color: theme.textLight }} />
                  <span className="text-xs font-semibold" style={{ color: theme.textLight }}>
                    {groupBuyInfo.item && groupBuyInfo.item !== 'Available' 
                      ? (groupBuyInfo.vendor 
                          ? `${groupBuyInfo.item} with ${groupBuyInfo.vendor}`
                          : groupBuyInfo.item)
                      : (groupBuyInfo.vendor 
                          ? `Group Buy with ${groupBuyInfo.vendor}`
                          : 'Group Buy')}
                  </span>
                  {expandedGroupBuy === dayKey ? (
                    <ChevronUp size={12} style={{ color: theme.textLight }} />
                  ) : (
                    <ChevronDown size={12} style={{ color: theme.textLight }} />
                  )}
                </div>
              </button>
              
              {/* Expanded details */}
              <div 
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: expandedGroupBuy === dayKey && expandedGroupBuyData ? '500px' : '0',
                  opacity: expandedGroupBuy === dayKey && expandedGroupBuyData ? 1 : 0,
                  transform: expandedGroupBuy === dayKey && expandedGroupBuyData ? 'translateY(0)' : 'translateY(-10px)'
                }}
              >
                {expandedGroupBuy === dayKey && expandedGroupBuyData && (
                  <div className="mt-2 p-3 rounded-lg space-y-3" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
                  <div className="pb-2" style={{ borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <p className="font-semibold text-sm" style={{ color: theme.text }}>{expandedGroupBuyData.item || 'Unknown Item'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {expandedGroupBuyData.vendor && (
                      <div className="flex items-start gap-2">
                        <Building size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Host</div>
                          <div className="text-xs" style={{ color: theme.text }}>{expandedGroupBuyData.vendor}</div>
                        </div>
                      </div>
                    )}

                    {expandedGroupBuyData.price && (
                      <div className="flex items-start gap-2">
                        <DollarSign size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Price</div>
                          <div className="text-xs" style={{ color: theme.text }}>${String(expandedGroupBuyData.price).replace(/^\$/, '')}</div>
                        </div>
                      </div>
                    )}

                    {expandedGroupBuyData.openDate && (
                      <div className="flex items-start gap-2">
                        <Calendar size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Opens</div>
                          <div className="text-xs" style={{ color: theme.text }}>{formatMMDDYYYY(expandedGroupBuyData.openDate)}</div>
                        </div>
                      </div>
                    )}

                    {expandedGroupBuyData.closeDate && (
                      <div className="flex items-start gap-2">
                        <Calendar size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Closes</div>
                          <div className="text-xs" style={{ color: theme.text }}>{formatMMDDYYYY(expandedGroupBuyData.closeDate)}</div>
                        </div>
                      </div>
                    )}

                    {expandedGroupBuyData.location && (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} style={{ color: theme.textLight, marginTop: '2px', flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold mb-0.5" style={{ color: theme.textLight }}>Platform</div>
                          <div className="text-xs" style={{ color: theme.text }}>{expandedGroupBuyData.location}</div>
                        </div>
                      </div>
                    )}

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

                  <div className="pt-2" style={{ borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
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
            </div>
          )}
          
          {dayScheduled?.washout?.length > 0 && (
            <div className="space-y-1 mt-1">
              {dayScheduled.washout.map((w, wIdx) => {
                const isObj = typeof w === 'object' && w !== null;
                const name = isObj ? w.name : w;
                const hasHalfLife = isObj && w.halfLives && w.halfLives.length > 0;
                return (
                  <div key={wIdx} className="rounded-lg overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }}>
                    <div className="px-1.5 py-1 text-center">
                      <span className="text-[10px] font-semibold" style={{ color: theme.textLight }}>
                        W: {name}
                      </span>
                    </div>
                    {hasHalfLife && (
                      <div className="px-1.5 pb-1">
                        {w.halfLives.map((hl, hlIdx) => {
                          const hlHours = hl.unit === 'days' ? hl.value * 24 : hl.value;
                          const elapsedHours = w.dayIndex * 24;
                          const remaining = Math.pow(0.5, elapsedHours / hlHours);
                          const pct = Math.round(remaining * 100);
                          const barColor = theme.isDark ? 'rgba(200,122,92,0.7)' : '#c87a5c';
                          return (
                            <div key={hlIdx} className="h-1.5 rounded-full overflow-hidden mt-0.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                              <div className="h-full rounded-full" style={{
                                width: `${Math.max(2, pct)}%`,
                                background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}80 60%, ${barColor}30 100%)`
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const NOTE_TAGS = [
    { id: 'progress', label: 'Progress Update' },
    { id: 'side_effects', label: 'Side Effects' },
    { id: 'adjustment', label: 'Dosage Adjustment' },
    { id: 'observation', label: 'Observation' },
    { id: 'question', label: 'Question' }
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        {days.map(renderDay)}
      </div>
      
      {/* Protocol Note Detail Modal */}
      <Modal
        open={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        title={
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <span>{selectedNote?.type === 'follow_up' ? 'Protocol Follow-Up' : 'Protocol Note'}</span>
          </div>
        }
        theme={theme}
        variant="modern"
        maxWidth="max-w-2xl"
      >
        {selectedNote && (
          <div className="space-y-4">
            {/* Date Information */}
            <div className="flex items-center gap-4 text-xs" style={{ color: theme.textLight }}>
              {selectedNote.createdAt && (
                <span>Started: {formatMMDDYYYY(selectedNote.createdAt)}</span>
              )}
              {selectedNote.protocolName && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  For: {selectedNote.protocolName}
                </span>
              )}
            </div>

            {/* Note Content Box - Matching assessment modal style */}
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                border: `2px solid ${theme.primary}`,
                borderLeft: `4px solid ${theme.primary}`
              }}
            >
              {/* Rating (for follow-up notes) - displayed at top center */}
              {selectedNote.type === 'follow_up' && selectedNote.rating !== undefined && selectedNote.rating !== null && (
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="text-sm font-medium" style={{ color: theme.text }}>Protocol Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        size={18}
                        style={{
                          fill: selectedNote.rating >= n ? theme.primary : 'none',
                          color: selectedNote.rating >= n ? theme.primary : (theme.isDark ? '#4b5563' : theme.border),
                          strokeWidth: 1.5
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Note Content */}
              {selectedNote.content && (
                <p className="text-sm whitespace-pre-wrap mb-3" style={{ color: theme.text }}>
                  {selectedNote.content}
                </p>
              )}

              {/* Tags */}
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedNote.tags.map(tagId => {
                    const tag = NOTE_TAGS.find(t => t.id === tagId);
                    return (
                      <span
                        key={tagId}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: theme.primary + '20',
                          color: theme.primary
                        }}
                      >
                        {tag ? tag.label : tagId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
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
          time: slotKey,
          protocolId: peptide.protocolId,
          peptideId: peptide.peptideId
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
            time: slotKey,
            protocolId: peptide.protocolId,
            peptideId: peptide.peptideId
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
    const protocolId = typeof item === 'object' ? item.protocolId : undefined;
    const peptideId = typeof item === 'object' ? item.peptideId : undefined;
    
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
      protocolId,
      peptideId,
      stableTaskId: generateTaskId({
        name,
        dose,
        unit,
        type,
        time: timeSlot,
        protocolId,
        peptideId
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


