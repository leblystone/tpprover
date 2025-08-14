import React from 'react'
import TextInput from '../common/inputs/TextInput'

export default function VendorSuggestInput({ label = 'Vendor', value, onChange, placeholder = 'Vendor', theme }) {
  const [q, setQ] = React.useState(value || '')
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => { setQ(value || '') }, [value])

  let vendors = []
  try { vendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]') } catch {}
  const list = React.useMemo(() => {
    const s = (q || '').toLowerCase()
    if (!s) return []
    const uniq = Array.from(new Set(vendors))
    return uniq.filter(v => v.toLowerCase().includes(s)).slice(0, 6)
  }, [q])

  return (
    <div className="relative">
      <TextInput label={label} value={q} onChange={(v) => { setQ(v); onChange?.(v); setOpen(true) }} placeholder={placeholder} theme={theme} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} />
      {open && list.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md border shadow" style={{ borderColor: theme?.border }}>
          {list.map(v => (
            <button key={v} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { onChange?.(v); setQ(v); setOpen(false) }}>
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


