import React, { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import { formatMMDDYYYY } from '../../utils/date'
import TaskDisplay from './TaskDisplay'

export default function DayView({ open, onClose, date, theme, notes, onSave, scheduled = {}, done = {}, onToggleSlot }) {
  const [text, setText] = useState(notes || '')
  useEffect(() => { setText(notes || '') }, [notes, date])
  const title = date ? `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${formatMMDDYYYY(date)}` : ''
  const times = scheduled.times || {}
  const [dayDetails, setDayDetails] = useState({ protocols: [], supplements: [], buys: [] })
  useEffect(() => {
    if (!date) { setDayDetails({ protocols: [], supplements: [], buys: [] }); return }
    try {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const iso = date.toISOString().slice(0,10)
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const supplements = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]')
      const orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]')
      const protoItems = []
      for (const p of protocols) {
        const active = p?.active !== false
        const inRange = !date || ((!p.startDate || new Date(p.startDate) <= date) && (!p.endDate || new Date(p.endDate) >= date))
        const dayOk = !Array.isArray(p.activeDays) || p.activeDays.includes(weekday)
        if (!active || !inRange || !dayOk) continue
        if (Array.isArray(p?.frequency?.time)) {
          for (const t of p.frequency.time) protoItems.push({ name: p.name || 'Protocol', time: t })
        }
      }
      const suppItems = []
      for (const s of supplements) {
        // Include supplement if no specific days are set, or if the current weekday is included
        const shouldInclude = !Array.isArray(s?.days) || s.days.length === 0 || s.days.includes(weekday);
        if (!shouldInclude) continue;
        
        // Handle both array format ['AM', 'PM'] and legacy string format
        const schedule = Array.isArray(s.schedule) ? s.schedule : [s.schedule];
        
        for (const time of schedule) {
          if (time === 'AM') suppItems.push({ name: s.name || 'Supplement', time: 'AM' })
          else if (time === 'PM') suppItems.push({ name: s.name || 'Supplement', time: 'PM' })
        }
        
        // Handle legacy 'BOTH' format
        if (s.schedule === 'BOTH') {
          suppItems.push({ name: s.name || 'Supplement', time: 'AM' });
          suppItems.push({ name: s.name || 'Supplement', time: 'PM' });
        }
      }
      const buyItems = orders.filter(o => (o.date || '').slice(0,10) === iso).map(o => ({
        vendor: o.vendor || 'Vendor', peptide: o.peptide || '', mg: o.mg, group: !!o.group, status: o.status || 'Order Placed'
      }))
      setDayDetails({ protocols: protoItems, supplements: suppItems, buys: buyItems })
    } catch { setDayDetails({ protocols: [], supplements: [], buys: [] }) }
  }, [date])
  const classifyTime = (label) => {
    const s = String(label || '').toLowerCase()
    if (s.includes('pm') || s.includes('evening') || s.includes('night') || s.includes('afternoon')) return 'evening'
    return 'morning'
  }
  const morningItems = []
  const eveningItems = []
  for (const p of dayDetails.protocols) (classifyTime(p.time) === 'morning' ? morningItems : eveningItems).push({ type: 'protocol', name: p.name, time: p.time })
  for (const s of dayDetails.supplements) (classifyTime(s.time) === 'morning' ? morningItems : eveningItems).push({ type: 'supplement', name: s.name, time: s.time })

  return (
    <Modal open={open} onClose={onClose} title={`Day • ${title}`} theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.(text)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-4">
        
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: theme?.text }}>Today's Research</div>
          <div className="space-y-3">
            {/* AM Tasks */}
            {scheduled.bySlot?.AM && (scheduled.bySlot.AM.peptides?.length > 0 || scheduled.bySlot.AM.supplements?.length > 0) && (
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: theme?.textLight }}>AM</div>
                <div className="space-y-1">
                  {scheduled.bySlot.AM.peptides?.map((p, i) => {
                    const task = {
                      name: typeof p === 'object' ? p.name : p,
                      dose: typeof p === 'object' ? p.dose : '',
                      unit: typeof p === 'object' ? p.unit : '',
                      type: 'peptide',
                      time: 'AM',
                      delivery: typeof p === 'object' ? p.delivery : 'injection',
                      deliveryMethod: typeof p === 'object' ? p.deliveryMethod : 'injection',
                      penColor: typeof p === 'object' ? p.penColor : undefined,
                      penType: typeof p === 'object' ? p.penType : undefined
                    };
                    return (
                      <TaskDisplay
                        key={`am-p-${i}`}
                        task={task}
                        theme={theme}
                        date={date}
                        timeSlot="AM"
                        onToggle={onToggleSlot}
                        size="normal"
                      />
                    );
                  })}
                  {scheduled.bySlot.AM.supplements?.map((s, i) => {
                    const task = {
                      name: typeof s === 'object' ? s.name : s,
                      dose: typeof s === 'object' ? s.dose : '',
                      unit: typeof s === 'object' ? s.unit : '',
                      type: 'supplement',
                      time: 'AM',
                      delivery: typeof s === 'object' ? s.delivery : 'oral'
                    };
                    return (
                      <TaskDisplay
                        key={`am-s-${i}`}
                        task={task}
                        theme={theme}
                        date={date}
                        timeSlot="AM"
                        onToggle={onToggleSlot}
                        size="normal"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* PM Tasks */}
            {scheduled.bySlot?.PM && (scheduled.bySlot.PM.peptides?.length > 0 || scheduled.bySlot.PM.supplements?.length > 0) && (
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: theme?.textLight }}>PM</div>
                <div className="space-y-1">
                  {scheduled.bySlot.PM.peptides?.map((p, i) => {
                    const task = {
                      name: typeof p === 'object' ? p.name : p,
                      dose: typeof p === 'object' ? p.dose : '',
                      unit: typeof p === 'object' ? p.unit : '',
                      type: 'peptide',
                      time: 'PM',
                      delivery: typeof p === 'object' ? p.delivery : 'injection',
                      deliveryMethod: typeof p === 'object' ? p.deliveryMethod : 'injection',
                      penColor: typeof p === 'object' ? p.penColor : undefined,
                      penType: typeof p === 'object' ? p.penType : undefined
                    };
                    return (
                      <TaskDisplay
                        key={`pm-p-${i}`}
                        task={task}
                        theme={theme}
                        date={date}
                        timeSlot="PM"
                        onToggle={onToggleSlot}
                        size="normal"
                      />
                    );
                  })}
                  {scheduled.bySlot.PM.supplements?.map((s, i) => {
                    const task = {
                      name: typeof s === 'object' ? s.name : s,
                      dose: typeof s === 'object' ? s.dose : '',
                      unit: typeof s === 'object' ? s.unit : '',
                      type: 'supplement',
                      time: 'PM',
                      delivery: typeof s === 'object' ? s.delivery : 'oral'
                    };
                    return (
                      <TaskDisplay
                        key={`pm-s-${i}`}
                        task={task}
                        theme={theme}
                        date={date}
                        timeSlot="PM"
                        onToggle={onToggleSlot}
                        size="normal"
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {dayDetails.buys.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: theme?.text }}>Buys</div>
                <ul className="text-xs space-y-1">
                  {dayDetails.buys.map((b, idx) => (
                    <li key={`b-${idx}`} className="flex items-center justify-between rounded border px-2 py-1" style={{ borderColor: theme?.border }}>
                      <span>{b.peptide} {b.mg ? `(${b.mg} mg)` : ''} • {b.vendor}</span>
                      <span className="status-inactive">{b.group ? 'Group Buy' : b.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dayDetails.protocols.length === 0 && dayDetails.supplements.length === 0 && dayDetails.buys.length === 0 && (
              <div className="text-xs text-gray-500">Nothing scheduled.</div>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: theme?.textLight }}>Notes</div>
          <textarea className="w-full h-24 p-3 rounded-lg border text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add daily notes, outcomes, etc." style={{ borderColor: theme?.border }} />
        </div>
      </div>
    </Modal>
  )
}


