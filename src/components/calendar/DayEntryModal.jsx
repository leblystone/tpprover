import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { formatMMDDYYYY } from '../../utils/date'

export default function DayEntryModal({ open, onClose, date, value, onSave, theme }) {
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value, date])
  const title = date ? `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${formatMMDDYYYY(date)}` : ''
  return (
    <Modal open={open} onClose={onClose} title={title} theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.(text)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <textarea className="w-full h-40 p-3 rounded-lg border text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add notes, research logs, etc." style={{ borderColor: theme?.border }} />
    </Modal>
  )
}


