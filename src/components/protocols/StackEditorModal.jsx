import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'

export default function StackEditorModal({ open, onClose, theme, protocols = [], onSave }) {
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [manualItems, setManualItems] = useState([]) // hidden, auto-filled when no protocol matches
  const [mixType, setMixType] = useState('separate') // 'separate' | 'blended'
  const [query, setQuery] = useState('')
  const suggestions = useMemo(() => {
    const q = (query || '').toLowerCase().trim()
    if (!q) return []
    return protocols.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 6)
  }, [query, protocols])

  useEffect(() => {
    if (open) { setName(''); setSelectedIds([]); setManualItems([]); setQuery(''); setMixType('separate') }
  }, [open])

  const addEntryFromQuery = (text) => {
    const exact = protocols.find(p => (p.name || '').toLowerCase() === (text || '').toLowerCase())
    if (exact) {
      if (!selectedIds.includes(exact.id)) setSelectedIds(prev => [...prev, exact.id])
    } else {
      const trimmed = (text || '').trim()
      if (trimmed) setManualItems(prev => [...prev, { id: Date.now(), name: trimmed, time: 'Morning' }])
    }
    setQuery('')
  }

  const removeChip = (chip) => {
    if (chip.type === 'protocol') setSelectedIds(prev => prev.filter(id => id !== chip.id))
    else setManualItems(prev => prev.filter(m => m.id !== chip.id))
  }

  const chips = [
    ...protocols.filter(p => selectedIds.includes(p.id)).map(p => ({ type: 'protocol', id: p.id, label: p.name })),
    ...manualItems.map(m => ({ type: 'manual', id: m.id, label: m.name }))
  ]

  const collectItems = () => {
    const fromProtocols = protocols
      .filter(p => selectedIds.includes(p.id))
      .flatMap(p => (p.frequency?.time || []).map(t => ({ name: p.name, time: t })))
    const manual = manualItems.filter(it => (it.name || '').trim())
    return [...fromProtocols, ...manual]
  }

  return (
    <Modal open={open} onClose={onClose} title="New Stack" theme={theme} maxWidth="max-w-2xl" footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.({ name, protocolIds: selectedIds, items: collectItems(), mixType })} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-4">
        <TextInput label="Stack Name" value={name} onChange={setName} placeholder="e.g., Morning Boost" theme={theme} />

        <div>
          <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Include Peptides</div>
          <div className="mb-2 flex flex-wrap gap-2">
            {chips.map(c => (
              <span key={`${c.type}-${c.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: theme?.white, border: `1px solid ${theme?.border}` }}>
                {c.label}
                <button className="text-gray-500 hover:text-gray-700" onClick={() => removeChip(c)}>×</button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              className="w-full p-2 rounded border text-sm"
              style={{ borderColor: theme?.border }}
              placeholder="Type a protocol name or peptide..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntryFromQuery(query) } }}
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md border shadow" style={{ borderColor: theme?.border }}>
                {suggestions.map(p => (
                  <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => addEntryFromQuery(p.name)}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Mixing</div>
          <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
            {['separate','blended'].map(opt => (
              <button key={opt} type="button" onClick={() => setMixType(opt)} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${mixType === opt ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={mixType === opt ? { backgroundColor: theme?.primary } : {}}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}


