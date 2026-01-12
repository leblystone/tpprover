import React, { useState, useEffect } from 'react'
import { toKey } from './MonthGrid'
import { Pill, Edit, PenTool, Beaker, Target, CheckCircle, Check, ShoppingCart, Pipette, ChevronDown, ChevronUp, Calendar, Building, MapPin, Users, DollarSign, FileText, Star, X } from 'lucide-react'
import { isTaskCompleted, generateTaskId, toggleTaskCompletion } from '../../utils/taskCompletion'
import TaskDisplay from './TaskDisplay'
import { getChromeGradient, isColorDark } from '../../utils/recon'
import { penColors } from '../../utils/penColors'
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings'
import { formatMMDDYYYY } from '../../utils/date'
import { useAppContext } from '../../context/AppContext'
import { useFirebase } from '../../context/FirebaseContext'
import { safeLocalStorageGet } from '../../utils/dataBleedDiagnostic'
import { areGroupBuysEnabled } from '../../utils/featureSettings'
import { getNotesForDate } from '../../utils/protocolHistory'
import Modal from '../common/Modal'
import { getCalendarNoteText, hasCalendarNotes as hasCalendarNotesUtil } from '../../utils/calendarNotesMigration'

const colorMap = penColors.reduce((acc, c) => ({ ...acc, [c.hex.toLowerCase()]: c.name }), {})

function DeliveryIndicator({ item, theme }) {
  const size = 18
  if (item.deliveryMethod === 'pen') {
    const hex = item.penColor || '#9ca3af'
    const colorName = colorMap[hex.toLowerCase()] || hex
    const textColor = isColorDark(hex) ? 'white' : theme.text
    return (
      <div 
        className="w-5 h-5 rounded-md flex items-center justify-center" 
        style={{ background: getChromeGradient(hex) }}
        title={`${colorName} Pen`}
      >
        <PenTool size={12} style={{ color: textColor }} />
      </div>
    )
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
    )
  }
  return <Pipette size={12} style={{ color: theme.primary }} />
}

function MarkAllButton({ date, timeSlot, scheduled, theme, onMarkAllDone, calendarBump }) {
  const dateKey = toKey(date)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  
  // Calculate completion status
  useEffect(() => {
    let total = 0
    let completed = 0
    
    const slotKey = timeSlot === 'AM' ? 'AM' : 'PM'
    
    // Count peptides
    if (scheduled.peptides) {
      scheduled.peptides.forEach(peptide => {
        total++
        const task = {
          type: 'peptide',
          name: peptide.name,
          dose: peptide.dose || '',
          unit: peptide.unit || '',
          time: slotKey
        }
        const taskId = generateTaskId(task)
        if (isTaskCompleted(taskId, dateKey, slotKey)) {
          completed++
        }
      })
    }
    
    // Count supplements
    if (scheduled.supplements) {
      scheduled.supplements.forEach(supplement => {
        total++
        const suppData = typeof supplement === 'object' ? supplement : { name: supplement }
        const task = {
          type: 'supplement',
          name: suppData.name,
          dose: suppData.dose || '',
          unit: '',
          time: slotKey
        }
        const taskId = generateTaskId(task)
        if (isTaskCompleted(taskId, dateKey, slotKey)) {
          completed++
        }
      })
    }
    
    setTotalTasks(total)
    setCompletedCount(completed)
  }, [dateKey, timeSlot, scheduled, calendarBump])
  
  // Listen for completion changes
  useEffect(() => {
    const handleTaskCompletionChange = () => {
      let total = 0
      let completed = 0
      const slotKey = timeSlot === 'AM' ? 'AM' : 'PM'
      
      if (scheduled.peptides) {
        scheduled.peptides.forEach(peptide => {
          total++
          const task = {
            type: 'peptide',
            name: peptide.name,
            dose: peptide.dose || '',
            unit: peptide.unit || '',
            time: slotKey
          }
          const taskId = generateTaskId(task)
          if (isTaskCompleted(taskId, dateKey, slotKey)) {
            completed++
          }
        })
      }
      
      if (scheduled.supplements) {
        scheduled.supplements.forEach(supplement => {
          total++
          const suppData = typeof supplement === 'object' ? supplement : { name: supplement }
          const task = {
            type: 'supplement',
            name: suppData.name,
            dose: suppData.dose || '',
            unit: '',
            time: slotKey
          }
          const taskId = generateTaskId(task)
          if (isTaskCompleted(taskId, dateKey, slotKey)) {
            completed++
          }
        })
      }
      
      setTotalTasks(total)
      setCompletedCount(completed)
    }
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange)
    return () => window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange)
  }, [dateKey, timeSlot, scheduled])
  
  if (totalTasks === 0) return null
  if (completedCount === totalTasks) {
    return (
      <div className="flex items-center gap-1" style={{ color: theme.success }}>
        <Check size={10} />
        <span className="text-[9px] font-medium">Done</span>
      </div>
    )
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
  )
}

function SlotContent({ scheduled, theme, date, timeSlot, onTaskToggle }) {
  if (!scheduled || (!scheduled.peptides?.length && !scheduled.supplements?.length)) {
    return <div className="text-xs text-center pt-4" style={{ color: theme.textLight }}>-</div>
  }

  const dateKey = toKey(date)

  const createTaskFromItem = (item, type) => {
    const name = typeof item === 'object' ? item.name : item
    const dose = typeof item === 'object' ? item.dose : ''
    const unit = typeof item === 'object' ? item.unit : ''
    const delivery = typeof item === 'object' ? item.delivery : (type === 'peptide' ? 'injection' : 'oral')
    const deliveryMethod = typeof item === 'object' ? item.deliveryMethod : delivery
    const penColor = typeof item === 'object' ? item.penColor : undefined
    const penType = typeof item === 'object' ? item.penType : undefined
    
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
    }
  }

  return (
    <div className="space-y-1">
      {scheduled.peptides?.map((p, i) => {
        const task = createTaskFromItem(p, 'peptide')
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
        )
      })}
      {scheduled.supplements?.map((s, i) => {
        const task = createTaskFromItem(s, 'supplement')
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
        )
      })}
    </div>
  )
}

export default function DayModal({ date, entries, scheduled, theme, onClose, onNotesClick, onTaskToggle, onMarkAllDone, calendarBump }) {
  const { scheduledBuys } = useAppContext()
  const { firebaseUser } = useFirebase()
  const [forceRender, setForceRender] = useState(0)
  const [expandedGroupBuy, setExpandedGroupBuy] = useState(null)
  const [expandedGroupBuyData, setExpandedGroupBuyData] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  
  // Check if group buys are enabled
  const groupBuysEnabled = areGroupBuysEnabled()
  
  // Reset expanded state when date changes
  useEffect(() => {
    setExpandedGroupBuy(null)
    setExpandedGroupBuyData(null)
  }, [date])
  
  // Force re-render when calendarBump changes
  useEffect(() => {
    setForceRender(prev => prev + 1)
  }, [calendarBump])
  
  // Listen for task completion events
  useEffect(() => {
    const handleTaskCompletionChange = (e) => {
      console.log('📡 DayModal received task completion event:', e.detail)
      setForceRender(prev => prev + 1)
    }
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange)
    
    return () => {
      window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange)
    }
  }, [])

  // Listen for protocol history updates
  useEffect(() => {
    const handleProtocolHistoryUpdate = () => {
      setForceRender(prev => prev + 1)
    }
    
    window.addEventListener('tpp:protocol-history-updated', handleProtocolHistoryUpdate)
    
    return () => {
      window.removeEventListener('tpp:protocol-history-updated', handleProtocolHistoryUpdate)
    }
  }, [])

  if (!date) return null

  const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' })
  const isToday = toKey(date) === toKey(new Date())
  const dayKey = toKey(date)
  // Get note text from new ID-based structure
  const dayNotesText = entries[dayKey] ? getCalendarNoteText(entries, dayKey) : ''
  const dayScheduled = scheduled[dayKey]
  
  // Get protocol notes for this date
  const protocolNotes = getNotesForDate(dayKey)
  
  // Calculate actual task completion status
  let totalTasks = 0
  let completedTasks = 0
  
  if (dayScheduled?.bySlot) {
    Object.keys(dayScheduled.bySlot).forEach(timeSlot => {
      const slot = dayScheduled.bySlot[timeSlot]
      if (slot.peptides) {
        slot.peptides.forEach(peptide => {
          const task = {
            name: typeof peptide === 'object' ? peptide.name : peptide,
            dose: typeof peptide === 'object' ? peptide.dose : '',
            unit: typeof peptide === 'object' ? peptide.unit : '',
            type: 'peptide',
            time: timeSlot
          }
          const taskId = generateTaskId(task)
          const dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
          totalTasks++
          if (isTaskCompleted(taskId, dateKey, timeSlot)) {
            completedTasks++
          }
        })
      }
      if (slot.supplements) {
        slot.supplements.forEach(supplement => {
          const task = {
            name: typeof supplement === 'object' ? supplement.name : supplement,
            dose: typeof supplement === 'object' ? supplement.dose : '',
            unit: typeof supplement === 'object' ? supplement.unit : '',
            type: 'supplement',
            time: timeSlot
          }
          const taskId = generateTaskId(task)
          const dateKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
          totalTasks++
          if (isTaskCompleted(taskId, dateKey, timeSlot)) {
            completedTasks++
          }
        })
      }
    })
  }
  
  // Count group buys as tasks
  if (dayScheduled?.groupBuys && dayScheduled.groupBuys.length > 0) {
    totalTasks += dayScheduled.groupBuys.length
    completedTasks += dayScheduled.groupBuys.length
  }
  
  const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks

  // Resolve Group Buy display info
  let groupBuyInfo = null
  try {
    if (dayScheduled?.groupBuys && dayScheduled.groupBuys.length > 0) {
      const gb = dayScheduled.groupBuys[0]
      
      if (gb && typeof gb === 'object') {
        const item = gb.item || gb.title || gb.name || gb.peptide || gb.peptideName || (gb.group && gb.group.title) || 'Unknown Item'
        const name = `Group Buy For: ${item}`
        const vendor = gb.vendor || gb.seller || gb.source || (gb.group && (gb.group.vendor || gb.group.name)) || ''
        const rawPrice = gb.cost ?? gb.price ?? gb.amount ?? ''
        const price = rawPrice !== '' ? `$${String(rawPrice).toString().replace(/^\$/,'')}` : ''
        groupBuyInfo = { name, item, vendor, price, source: 'scheduled', openDate: gb.openDate, closeDate: gb.closeDate, location: gb.location, participants: gb.participants, notes: gb.notes }
      } else if (gb) {
        const item = String(gb) === 'Group Buy' ? 'Available' : String(gb)
        groupBuyInfo = { 
          name: `Group Buy For: ${item}`, 
          item,
          vendor: '', 
          price: '', 
          source: 'scheduled' 
        }
      }
    }
    
    if (!groupBuyInfo) {
      const orders = firebaseUser?.email 
        ? (safeLocalStorageGet('tpprover_orders', firebaseUser.email) || [])
        : []
      const orderMatch = orders.find(o => {
        try {
          const d = (o.date || '').slice(0,10)
          return d === dayKey && (!!o.group || !!o.vendor || !!o.cost || !!o.price)
        } catch { return false }
      })
      if (orderMatch) {
        const item = (orderMatch.group && (orderMatch.group.title || orderMatch.group.name)) || orderMatch.peptide || orderMatch.item || 'Unknown Item'
        const name = `Group Buy For: ${item}`
        const vendor = orderMatch.vendor || orderMatch.seller || orderMatch.source || ''
        const rawPrice = orderMatch.cost ?? orderMatch.price ?? orderMatch.amount ?? ''
        const price = rawPrice !== '' ? `$${String(rawPrice).toString().replace(/^\$/,'')}` : ''
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
        }
      }
    }
  } catch (error) {
    console.error('DayModal - Error processing group buy:', error)
  }

  const NOTE_TAGS = [
    { id: 'progress', label: 'Progress Update' },
    { id: 'side_effects', label: 'Side Effects' },
    { id: 'adjustment', label: 'Dosage Adjustment' },
    { id: 'observation', label: 'Observation' },
    { id: 'question', label: 'Question' }
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
             style={{ backgroundColor: theme.cardBackground }}>
          
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: isToday ? theme.primary : theme.accent, backgroundColor: isToday ? theme.primary : theme.accent }}>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg flex items-center gap-2" style={{ color: isToday ? theme.textOnPrimary : (theme.isDark ? '#29303b' : theme.primaryDark) }}>
                {isToday ? 'Today' : dayOfWeek}
                {allTasksCompleted && <span title="All tasks done">✓</span>}
              </span>
              <span 
                className={`font-bold text-2xl flex items-center justify-center rounded-full w-12 h-12`}
                style={{
                  backgroundColor: isToday ? 'rgba(255,255,255,0.2)' : (theme.isDark ? '#1f2937' : theme.secondary),
                  color: isToday ? theme.textOnPrimary : (theme.isDark ? theme.text : theme.primaryDark),
                }}
              >
                {date.getDate()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:opacity-70 transition-all"
              style={{ 
                color: isToday ? theme.textOnPrimary : (theme.isDark ? '#29303b' : theme.primaryDark),
                backgroundColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
            {/* AM/PM Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4">
              {/* AM Slot */}
              <div className="rounded p-2" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold" style={{ color: theme.textLight }}>AM</div>
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

              {/* PM Slot */}
              <div className="rounded p-2 mt-4 sm:mt-0" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold" style={{ color: theme.textLight }}>PM</div>
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

            {/* Goals Section */}
            {dayScheduled?.goals && dayScheduled.goals.length > 0 && (
              <div className="p-3 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1f2937' : theme.secondary + '40' }}>
                <div className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Goals</div>
                <div className="space-y-1.5">
                  {dayScheduled.goals.map((g, i) => (
                    <div key={`goal-${i}`} className="flex items-center gap-2 text-sm">
                      {g.completed ? 
                        <CheckCircle size={14} style={{ color: theme.success }} /> :
                        <Target size={14} style={{ color: theme.warning }} />
                      }
                      <span className={`flex-1 ${g.completed ? 'line-through' : ''}`} 
                            style={{ color: g.completed ? theme.textLight : theme.text }}>
                        {g.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-semibold" style={{ color: theme.text }}>Notes</div>
                <button onClick={() => onNotesClick(date)} className="p-1.5 rounded transition-all" style={{ color: theme.textLight }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Edit size={16} />
                </button>
              </div>
              {dayNotesText ? (
                <div 
                  onClick={() => onNotesClick(date)}
                  className="p-3 rounded-md border text-sm cursor-pointer hover:opacity-90"
                  style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  title="View or edit notes"
                >
                  {dayNotesText}
                </div>
              ) : (
                <div 
                  onClick={() => onNotesClick(date)}
                  className="p-3 rounded-md border text-sm cursor-pointer hover:opacity-90 text-center"
                  style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    borderColor: theme.border,
                    color: theme.textLight
                  }}
                >
                  Click to add notes
                </div>
              )}
            </div>
            
            {/* Protocol Notes Chips */}
            {protocolNotes && protocolNotes.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold" style={{ color: theme.text }}>Protocol Notes</div>
                {protocolNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:opacity-90 transition-all"
                    style={{
                      backgroundColor: note.type === 'follow_up' 
                        ? (theme.isDark ? '#3c4e3a' : '#e6f7f0')
                        : (theme.isDark ? '#374151' : '#f3f4f6'),
                      border: `1px solid ${note.type === 'follow_up' ? theme.primary : theme.border}`,
                      color: theme.text
                    }}
                    title={`${note.protocolName || 'Protocol'} - ${note.content ? note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '') : 'Note'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNote(note)
                    }}
                  >
                    <FileText size={14} style={{ color: note.type === 'follow_up' ? theme.primary : theme.textLight }} />
                    <span className="flex-1 font-medium" style={{ color: note.type === 'follow_up' ? theme.primary : theme.text }}>
                      {note.protocolName || 'Protocol'}
                    </span>
                    {note.type === 'follow_up' && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                        FOLLOW UP
                      </span>
                    )}
                    {note.type === 'during' && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.border, color: theme.text }}>
                        MID-CYCLE NOTE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Group Buys */}
            {groupBuyInfo && groupBuysEnabled && (
              <div>
                <button
                  className="w-full p-2 rounded text-center hover:opacity-80 transition-all cursor-pointer"
                  style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const isExpanded = expandedGroupBuy === dayKey
                    if (isExpanded) {
                      setExpandedGroupBuy(null)
                      setExpandedGroupBuyData(null)
                    } else {
                      let fullData = null
                      
                      if (groupBuyInfo.item) {
                        fullData = (scheduledBuys || []).find(buy => {
                          const buyItem = buy.item || buy.name || ''
                          return buyItem === groupBuyInfo.item || buyItem.toLowerCase() === groupBuyInfo.item.toLowerCase()
                        })
                      }
                      
                      if (!fullData) {
                        try {
                          const rawOrders = localStorage.getItem('tpprover_orders')
                          const orders = rawOrders ? JSON.parse(rawOrders) : []
                          const orderMatch = orders.find(o => {
                            try {
                              const oDate = (o.date || '').slice(0, 10)
                              return oDate === dayKey && (!!o.group || o.category === 'groupbuy' || o.type === 'groupbuy')
                            } catch { return false }
                          })
                          
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
                            }
                          }
                        } catch (error) {
                          console.error('Error finding group buy in orders:', error)
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
                      }
                      
                      setExpandedGroupBuy(dayKey)
                      setExpandedGroupBuyData(groupBuyData)
                    }
                  }}
                  title={expandedGroupBuy === dayKey ? "Collapse group buy details" : "Expand group buy details"}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ShoppingCart size={14} style={{ color: theme.textLight }} />
                    <span className="text-sm font-semibold" style={{ color: theme.textLight }}>
                      {groupBuyInfo.item && groupBuyInfo.item !== 'Available' 
                        ? (groupBuyInfo.vendor 
                            ? `${groupBuyInfo.item} with ${groupBuyInfo.vendor}`
                            : groupBuyInfo.item)
                        : (groupBuyInfo.vendor 
                            ? `Group Buy with ${groupBuyInfo.vendor}`
                            : 'Group Buy')}
                    </span>
                    {expandedGroupBuy === dayKey ? (
                      <ChevronUp size={14} style={{ color: theme.textLight }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: theme.textLight }} />
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
                    <div className="mt-2 p-3 rounded-lg space-y-3" style={{ backgroundColor: theme.isDark ? '#111827' : theme.cardBackground, border: `1px solid ${theme.border}` }}>
                    <div className="pb-2 border-b" style={{ borderColor: theme.border }}>
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
              </div>
            )}
            
            {/* Washout indicator */}
            {dayScheduled?.washout?.length > 0 && (
              <div className="p-2 rounded text-center" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}>
                <span className="text-sm font-semibold" style={{ color: theme.textLight }}>
                  Washout: {dayScheduled.washout.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
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

            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                border: `2px solid ${theme.primary}`,
                borderLeft: `4px solid ${theme.primary}`
              }}
            >
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

              {selectedNote.content && (
                <p className="text-sm whitespace-pre-wrap mb-3" style={{ color: theme.text }}>
                  {selectedNote.content}
                </p>
              )}

              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedNote.tags.map(tagId => {
                    const tag = NOTE_TAGS.find(t => t.id === tagId)
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
                    )
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

