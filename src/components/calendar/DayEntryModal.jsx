import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { formatMMDDYYYY } from '../../utils/date'

export default function DayEntryModal({ open, onClose, date, value, onSave, theme }) {
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value, date])
  const title = date ? `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${formatMMDDYYYY(date)}` : ''
  return (
    <Modal open={open} onClose={onClose} title={title} theme={theme} footer={(
      <div className="flex items-center w-full">
        <button onClick={onClose} className="text-sm font-medium" style={{ color: theme?.textLight || theme?.text, background: 'none', border: 'none', padding: 0 }}>Cancel</button>
        <button onClick={() => onSave?.(text)} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary || '#fff' }}>Save</button>
      </div>
    )}>
      <textarea className="w-full h-40 p-3 rounded-lg border text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add notes, research logs, etc." style={{ borderColor: theme?.border }} />
    </Modal>
  )
}


