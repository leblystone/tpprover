 import React from 'react'

export default function UpcomingBuys({ items = [], theme, onAdd }) {
  return (
    <div className="p-6 rounded-xl content-card" style={{ backgroundColor: theme.white }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="h3" style={{ color: theme.primaryDark }}>Upcoming Buys</h3>
        <button onClick={onAdd} className="px-3 py-1.5 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}>Add</button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: theme.textLight }}>No planned purchases.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: theme.border }}>
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs" style={{ color: theme.textLight }}>{it.notes || ''}</div>
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>{it.date || ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


