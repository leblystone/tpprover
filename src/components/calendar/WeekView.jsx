import React from 'react'
import { toKey } from './MonthGrid'
import { Droplet, Pill, Edit, Syringe, PenTool } from 'lucide-react'
import { getChromeGradient, isColorDark } from '../../utils/recon';

const penColors = [
    { name: 'Gold', hex: '#DAA520' }, { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Black', hex: '#000000' }, { name: 'White', hex: '#FFFFFF' },
    { name: 'Hot Pink', hex: '#FF69B4' }, { name: 'Light Pink', hex: '#FFB6C1' },
    { name: 'Dark Blue', hex: '#00008B' }, { name: 'Light Blue', hex: '#ADD8E6' },
    { name: 'Teal', hex: '#008080' }, { name: 'Lime Green', hex: '#32CD32' },
    { name: 'Brown', hex: '#8B4513' }, { name: 'Red', hex: '#CC0000' },
    { name: 'Burgundy', hex: '#800000' }, { name: 'Purple', hex: '#800080' },
];
const colorMap = penColors.reduce((acc, c) => ({ ...acc, [c.hex.toLowerCase()]: c.name }), {});

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

export default function WeekView({ startDate, entries, scheduled, theme, onDayClick, onNotesClick }) {
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

    return (
      <div key={date.toISOString()} className="w-full rounded border" style={{ borderColor: theme.border }}>
        <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: theme.border, backgroundColor: isToday ? theme.primary : theme.accent }}>
          <span className="font-semibold text-sm flex items-center gap-1" style={{ color: isToday ? theme.textOnPrimary : theme.primaryDark }}>{isToday ? 'Today' : dayOfWeek}{dayScheduled?.doneAll && <span title="All tasks done">✓</span>}</span>
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
                    <SlotContent scheduled={dayScheduled?.bySlot?.Morning} theme={theme} />
                </div>

                {/* Separator and PM Slot */}
                <div className="mt-2 border-t pt-2 sm:mt-0 sm:border-t-0 sm:border-l sm:pl-2" style={{ borderColor: theme.border }}>
                    <div className="rounded p-1 min-h-[60px]" style={{ backgroundColor: theme.cardBackground }}>
                        <div className="text-xs font-semibold mb-1" style={{ color: theme.textLight }}>PM</div>
                        <SlotContent scheduled={dayScheduled?.bySlot?.Evening} theme={theme} />
                    </div>
                </div>
            </div>

          <div className="mt-1">
            <div className="flex justify-end items-center text-xs font-semibold">
              <button onClick={() => onNotesClick(date)} className="p-1 hover:bg-gray-100 rounded">
                <Edit size={14} />
              </button>
            </div>
            {dayNotes && (
              <div 
                onClick={() => onNotesClick(date)}
                className="p-1 rounded text-xs cursor-pointer hover:bg-gray-50 mt-1" 
                style={{ backgroundColor: theme.cardBackground, color: dayNotes ? theme.text : theme.textLight }}
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
            {dayScheduled?.groupBuys?.length > 0 && (
                <div className="p-1 rounded text-center mt-1" style={{ backgroundColor: theme.secondary }}>
                    <span className="text-xs font-semibold flex items-center justify-center gap-1" style={{ color: theme.textLight }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        Group Buy: {dayScheduled.groupBuys.join(', ')}
                    </span>
                </div>
            )}
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

function SlotContent({ scheduled, theme }) {
  if (!scheduled || (!scheduled.peptides?.length && !scheduled.supplements?.length)) {
    return <div className="text-xs text-center pt-4" style={{ color: theme.textLight }}>-</div>
  }
  return (
    <div className="space-y-1">
      {scheduled.peptides?.map((p, i) => (
        <div key={`p-${i}`} className="flex items-center gap-2 text-xs p-1 rounded" style={{ backgroundColor: theme.primary + '20' }}>
          <DeliveryIndicator item={p} theme={theme} />
          <span className="flex-1 truncate">{p.name}</span>
        </div>
      ))}
      {scheduled.supplements?.map((s, i) => (
        <div key={`s-${i}`} className="flex items-center gap-2 text-xs p-1 rounded" style={{ backgroundColor: theme.secondary }}>
          <Pill size={12} style={{ color: theme.textLight }} />
          <span className="flex-1 truncate">{s}</span>
        </div>
      ))}
    </div>
  )
}


