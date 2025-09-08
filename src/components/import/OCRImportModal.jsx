 import React, { useMemo, useState } from 'react'
 import Modal from '../common/Modal'
 import { generateId } from '../../utils/string'

export default function OCRImportModal({ open, onClose, theme, onImport }) {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [targetType, setTargetType] = useState('calendar')
  const [mappedFields, setMappedFields] = useState({})

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
    // Enhanced parser that tries to detect different data types
    const lines = t.split(/\r?\n/).filter(line => line.trim())
    let date = new Date().toISOString().slice(0,10)
    const tasks = []
    const notes = []
    const potentialOrders = []
    const potentialStock = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^date\s*:/i.test(trimmed)) {
        const m = trimmed.split(':')[1]
        if (m) date = m.trim()
      } else if (/^[-*]\s+/.test(trimmed)) {
        tasks.push(trimmed.replace(/^[-*]\s+/, '').trim())
      } else if (/vendor|peptide|mg|cost|\$/.test(trimmed.toLowerCase())) {
        // Looks like order data
        potentialOrders.push(trimmed)
      } else if (/stock|inventory|batch|quantity|qty/.test(trimmed.toLowerCase())) {
        // Looks like stockpile data  
        potentialStock.push(trimmed)
      } else if (trimmed) {
        notes.push(trimmed)
      }
    }
    
    // Auto-suggest target type based on content
    let suggestedType = 'calendar'
    if (potentialOrders.length > 0) suggestedType = 'orders'
    else if (potentialStock.length > 0) suggestedType = 'stockpile'
    
    setParsed({ 
      date, 
      tasks, 
      notes: notes.join(' '), 
      potentialOrders,
      potentialStock,
      suggestedType 
    })
    setTargetType(suggestedType)
  }

  const save = () => {
    const payload = { 
      id: generateId(), 
      ...(parsed || {}), 
      ...mappedFields,
      targetType,
      raw: text,
      status: 'Pending'
    }
    try {
      const raw = localStorage.getItem('tpprover_imports')
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(payload)
      localStorage.setItem('tpprover_imports', JSON.stringify(arr))
    } catch {}
    onImport?.(`Import saved for review`)
    resetModal()
    onClose()
    // Navigate to imports page for review
    window.history.pushState({}, '', '/imports')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const updateField = (field, value) => {
    setMappedFields(prev => ({ ...prev, [field]: value }))
  }

  const resetModal = () => {
    setFile(null)
    setText('')
    setParsed(null)
    setTargetType('calendar')
    setMappedFields({})
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import your pep data" theme={theme} footer={(
      <>
        <button className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }} onClick={handleClose}>Close</button>
        <button className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }} disabled={!parsed} onClick={save}>Save for Review</button>
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
          <div className="space-y-4">
            <div className="border-t pt-3" style={{ borderColor: theme?.border }}>
              <h4 className="font-semibold text-sm mb-2">Import Preview & Mapping</h4>
              
              {/* Target Type Selection */}
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1">Import to:</label>
                <select 
                  value={targetType} 
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full p-2 rounded border text-sm" 
                  style={{ borderColor: theme?.border }}
                >
                  <option value="orders">Orders</option>
                  <option value="stockpile">Stockpile</option>
                  <option value="calendar">Calendar Notes</option>
                </select>
                {parsed.suggestedType && parsed.suggestedType !== targetType && (
                  <p className="text-xs mt-1" style={{ color: theme?.info }}>
                    💡 Suggested: {parsed.suggestedType} (based on detected content)
                  </p>
                )}
              </div>

              {/* Field Mapping Based on Target Type */}
              {targetType === 'orders' && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium">Order Fields:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      placeholder="Vendor" 
                      value={mappedFields.vendor || ''} 
                      onChange={(e) => updateField('vendor', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                    <input 
                      placeholder="Peptide" 
                      value={mappedFields.peptide || ''} 
                      onChange={(e) => updateField('peptide', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                    <input 
                      placeholder="mg" 
                      value={mappedFields.mg || ''} 
                      onChange={(e) => updateField('mg', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                    <input 
                      placeholder="Cost" 
                      value={mappedFields.cost || ''} 
                      onChange={(e) => updateField('cost', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                  </div>
                </div>
              )}

              {targetType === 'stockpile' && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium">Stockpile Fields:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      placeholder="Peptide Name" 
                      value={mappedFields.name || ''} 
                      onChange={(e) => updateField('name', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                    <input 
                      placeholder="mg" 
                      value={mappedFields.mg || ''} 
                      onChange={(e) => updateField('mg', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                    <input 
                      placeholder="Quantity" 
                      value={mappedFields.quantity || '1'} 
                      onChange={(e) => updateField('quantity', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                    <input 
                      placeholder="Vendor" 
                      value={mappedFields.vendor || ''} 
                      onChange={(e) => updateField('vendor', e.target.value)}
                      className="p-2 rounded border text-xs" 
                      style={{ borderColor: theme?.border }} 
                    />
                  </div>
                </div>
              )}

              {targetType === 'calendar' && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium">Calendar Note:</h5>
                  <textarea 
                    placeholder="Notes for calendar entry" 
                    value={mappedFields.notes || parsed.notes || ''} 
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full p-2 rounded border text-xs h-20" 
                    style={{ borderColor: theme?.border }} 
                  />
                </div>
              )}

              {/* Date field for all types */}
              <div className="mt-2">
                <label className="block text-xs font-medium mb-1">Date:</label>
                <input 
                  type="date" 
                  value={mappedFields.date || parsed.date || ''} 
                  onChange={(e) => updateField('date', e.target.value)}
                  className="p-2 rounded border text-xs" 
                  style={{ borderColor: theme?.border }} 
                />
              </div>

              {/* Raw data detected */}
              {(parsed?.potentialOrders?.length > 0 || parsed?.potentialStock?.length > 0) && (
                <div className="mt-3 p-2 rounded" style={{ backgroundColor: theme?.secondary }}>
                  <h6 className="text-xs font-medium mb-1">Detected Data:</h6>
                  {parsed?.potentialOrders?.length > 0 && (
                    <div className="text-xs mb-1">
                      <span className="font-medium">Orders:</span> {parsed.potentialOrders.join('; ')}
                    </div>
                  )}
                  {parsed?.potentialStock?.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Stock:</span> {parsed.potentialStock.join('; ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}


