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
      if (trimmed) setManualItems(prev => [...prev, { id: Date.now(), name: trimmed, time: 'AM' }])
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
      <div className="flex items-center w-full">
        <button onClick={onClose} className="text-sm font-medium" style={{ color: theme?.textLight || theme?.text, background: 'none', border: 'none', padding: 0 }}>Cancel</button>
        <button onClick={() => onSave?.({ name, protocolIds: selectedIds, items: collectItems(), mixType })} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary || '#fff' }}>Save</button>
      </div>
    )}>
      <div className="space-y-4">
        <TextInput label="Stack Name" value={name} onChange={setName} placeholder="e.g., AM Boost" theme={theme} />

        <div>
          <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Include Peptides</div>
          <div className="mb-2 flex flex-wrap gap-2">
            {chips.map(c => (
              <span key={`${c.type}-${c.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : theme?.cardBackground, border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, color: theme?.text }}>
                {c.label}
                <button className="hover:opacity-70" style={{ color: theme?.textLight }} onClick={() => removeChip(c)}>×</button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              className="w-full p-2 rounded border text-sm"
              style={{ borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', backgroundColor: 'transparent', color: theme?.text }}
              placeholder="Type a protocol name or peptide..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntryFromQuery(query) } }}
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border shadow" style={{ borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', backgroundColor: theme?.isDark ? 'rgba(30,30,40,0.95)' : '#ffffff' }}>
                {suggestions.map(p => (
                  <button key={p.id} type="button" className="w-full text-left px-3 py-2 transition-colors" style={{ color: theme?.text }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => addEntryFromQuery(p.name)}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Mixing</div>
          <div className="inline-flex rounded-full p-1 shadow-inner" style={{ backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            {['separate','blended'].map(opt => (
              <button key={opt} type="button" onClick={() => setMixType(opt)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors`} style={mixType === opt ? { backgroundColor: theme?.primary, color: '#ffffff' } : { color: theme?.textLight }}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}


