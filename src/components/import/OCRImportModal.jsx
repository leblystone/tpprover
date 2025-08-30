 import React, { useMemo, useState } from 'react'
 import Modal from '../common/Modal'
 import { generateId } from '../../utils/string'

export default function OCRImportModal({ open, onClose, theme, onImport }) {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (f.type === 'text/plain') {
      const t = await f.text()
      setText(t)
      parseText(t)
    } else {
      // Stub: image/PDF OCR not implemented yet
      setText('')
      setParsed({ date: new Date().toISOString().slice(0,10), tasks: [], notes: 'OCR not implemented yet. Please upload a .txt for demo.' })
    }
  }

  const parseText = (t) => {
    // Very simple stub: lines starting with - are tasks; a line starting with Date: sets date
    const lines = t.split(/\r?\n/)
    let date = new Date().toISOString().slice(0,10)
    const tasks = []
    const notes = []
    for (const line of lines) {
      if (/^date\s*:/i.test(line)) {
        const m = line.split(':')[1]
        if (m) date = m.trim()
      } else if (/^[-*]\s+/.test(line)) {
        tasks.push(line.replace(/^[-*]\s+/, '').trim())
      } else if (line.trim()) {
        notes.push(line.trim())
      }
    }
    setParsed({ date, tasks, notes: notes.join(' ') })
  }

  const save = () => {
    const payload = { id: generateId(), ...(parsed || {}), raw: text }
    try {
      const raw = localStorage.getItem('tpprover_imports')
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(payload)
      localStorage.setItem('tpprover_imports', JSON.stringify(arr))
    } catch {}
    onImport?.(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Import your pep data" theme={theme} footer={(
      <>
        <button className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }} onClick={onClose}>Close</button>
        <button className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }} disabled={!parsed} onClick={save}>Save Import</button>
      </>
    )}>
      <div className="space-y-3">
        <div className="text-sm" style={{ color: theme?.text }}>
          Bring existing data into your planner. Supported inputs:
          <ul className="list-disc ml-5 mt-1 text-xs">
            <li>Orders: vendor, peptide, mg, cost, placed/shipped/delivered dates</li>
            <li>Stockpile: peptide name, mg, quantity, vendor, batch</li>
            <li>Notes: daily notes for the calendar</li>
          </ul>
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer" style={{ backgroundColor: theme?.accent, color: theme?.accentText }}>
          <input className="hidden" type="file" accept="image/*,application/pdf,text/plain,.csv" onChange={handleFile} />
          <span>{file ? file.name : 'Choose file'}</span>
        </label>
        {text && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Preview (.txt)</div>
            <pre className="p-2 rounded border overflow-auto max-h-40 text-xs" style={{ borderColor: theme?.border }}>{text}</pre>
          </div>
        )}
        <p className="text-xs" style={{ color: theme?.textLight }}>
          Note: Image/PDF OCR and AI-assisted mapping will auto-suggest destinations (orders, stockpile, notes). You can review and make light edits before saving.
        </p>
        {parsed && (
          <div className="text-sm">
            <div><span className="font-semibold">Date:</span> {parsed.date}</div>
            <div className="mt-1"><span className="font-semibold">Tasks:</span> {parsed.tasks.join(', ') || '-'}</div>
            <div className="mt-1"><span className="font-semibold">Notes:</span> {parsed.notes || '-'}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}


