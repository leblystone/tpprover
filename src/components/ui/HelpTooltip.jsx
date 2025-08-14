 import React, { useState } from 'react'
 import { Info } from 'lucide-react'

export default function HelpTooltip({ text, theme }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        className="p-1 rounded-full hover:bg-black/5"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Help"
      >
        <Info size={16} style={{ color: theme?.textLight || '#555' }} />
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-md shadow text-xs z-50"
             style={{ backgroundColor: theme?.white || '#fff', color: theme?.text || '#111', border: `1px solid ${theme?.border || '#eee'}` }}>
          {text}
        </div>
      )}
    </div>
  )
}


