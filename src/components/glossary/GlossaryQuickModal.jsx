import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'

export default function GlossaryQuickModal({ open, onClose, theme }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  useEffect(() => { try { const raw = localStorage.getItem('tpprover_glossary'); setItems(raw ? JSON.parse(raw) : []) } catch {} }, [open])
  const filtered = useMemo(() => items.filter(i => (i.name||'').toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <Modal open={open} onClose={onClose} title="Peptide Glossary" theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Close</button>
      </>
    )}>
      <div className="space-y-3">
        <TextInput label="Search" value={q} onChange={setQ} placeholder="BPC-157" theme={theme} />
        <div className="text-xs p-2 rounded border" style={{ borderColor: theme?.border, color: theme?.text }}>
          Disclaimer: Information is provided for research and educational purposes only. Not medical advice.
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-500">No glossary entries yet.</div>
        ) : (
          <ul className="space-y-2">
            {filtered.map(i => (
              <li key={i.id} className="p-2 rounded border" style={{ borderColor: theme?.border }}>
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-gray-500">{i.category}</div>
                <div className="text-sm mt-1">{i.notes}</div>
                <AIInfo name={i.name} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function AIInfo({ name }) {
  // Placeholder: offline environment. Show a stub response and an action to copy
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      setText(`AI summary for ${name}: typical research contexts, dosing ranges reported anecdotally, and safety considerations. [Offline stub]`)
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [name])
  return (
    <div className="mt-2 text-xs p-2 rounded bg-gray-50">
      {loading ? 'Loading info…' : text}
    </div>
  )
}


