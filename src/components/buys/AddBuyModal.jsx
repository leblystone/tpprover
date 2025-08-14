 import React, { useState, useEffect } from 'react'
 import Modal from '../common/Modal'
 import TextInput from '../common/inputs/TextInput'

export default function AddBuyModal({ open, onClose, onSave, theme }) {
  const [form, setForm] = useState({ name: '', vendor: '', date: '' })
  useEffect(() => {
    if (open) {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      setForm({ name: '', vendor: '', date: d.toISOString().slice(0,10) })
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Schedule Upcoming Buy" theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.(form)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-3">
        <TextInput label="Item" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157 10mg" theme={theme} />
        <TextInput label="Vendor (optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor name" theme={theme} />
        <TextInput label="Target Date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
      </div>
    </Modal>
  )
}


