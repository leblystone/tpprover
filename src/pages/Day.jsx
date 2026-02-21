import React, { useMemo, useState, useEffect } from 'react'
import { themes, defaultThemeName } from '../theme/themes'
import { toKey } from '../components/calendar/MonthGrid'
import { Calendar, Save } from 'lucide-react'

export default function Day() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [date, setDate] = useState(() => new Date())
  const [text, setText] = useState('')
  const key = useMemo(() => toKey(date), [date])
  const loadNote = () => {
    try { 
      const raw = localStorage.getItem('tpprover_calendar_notes'); 
      const obj = raw ? JSON.parse(raw) : {}; 
      setText(obj[key]?.text || '') 
    } catch {} 
  };
  useEffect(() => { loadNote() }, [key])

  useEffect(() => {
    const reload = () => { loadNote(); };
    window.addEventListener('tpp:cloud-data-loaded', reload);
    return () => window.removeEventListener('tpp:cloud-data-loaded', reload);
  }, [key])
  
  const save = () => { 
    try { 
      const raw = localStorage.getItem('tpprover_calendar_notes'); 
      const obj = raw ? JSON.parse(raw) : {}; 
      obj[key] = { text }; 
      localStorage.setItem('tpprover_calendar_notes', JSON.stringify(obj)) 
    } catch {} 
  }

  const title = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <section className="page-bg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: theme.primary }} />
          <input type="date" className="p-2 rounded border text-sm" value={key} onChange={e => setDate(new Date(e.target.value))} style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', backgroundColor: theme.cardBackground, color: theme.text }} />
          <button className="px-3 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 btn-primary-inset" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || theme.white }} onClick={save}>
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
      <div className="content-section rounded-xl p-4" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <textarea className="w-full h-80 p-3 rounded-lg border text-sm" value={text} onChange={e => setText(e.target.value)} placeholder="Add daily notes, outcomes, etc." style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: theme.text }} />
      </div>
    </section>
  )
}


