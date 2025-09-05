import React, { useMemo, useState, useEffect } from 'react'
import { themes, defaultThemeName } from '../theme/themes'
import { toKey } from '../components/calendar/MonthGrid'

export default function Day() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [date, setDate] = useState(() => new Date())
  const [text, setText] = useState('')
  const key = useMemo(() => toKey(date), [date])
  useEffect(() => { 
    try { 
      const raw = localStorage.getItem('tpprover_calendar_notes'); 
      const obj = raw ? JSON.parse(raw) : {}; 
      setText(obj[key]?.text || '') 
    } catch {} 
  }, [key])
  
  const save = () => { 
    try { 
      const raw = localStorage.getItem('tpprover_calendar_notes'); 
      const obj = raw ? JSON.parse(raw) : {}; 
      // Preserve the isMock flag if it exists, otherwise set it to false
      const isMock = obj[key]?.isMock || false;
      obj[key] = { text, isMock }; 
      localStorage.setItem('tpprover_calendar_notes', JSON.stringify(obj)) 
    } catch {} 
  }

  const title = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input type="date" className="p-2 rounded border" value={key} onChange={e => setDate(new Date(e.target.value))} style={{ borderColor: theme.border }} />
          <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={save}>Save</button>
        </div>
      </div>
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        <textarea className="w-full h-80 p-3 rounded-lg border text-sm" value={text} onChange={e => setText(e.target.value)} placeholder="Add daily notes, outcomes, etc." style={{ borderColor: theme.border }} />
      </div>
    </section>
  )
}


