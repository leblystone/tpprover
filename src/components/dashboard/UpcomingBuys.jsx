 import React from 'react'
import { useNavigate } from 'react-router-dom';
import { formatMMDDYYYY } from '../../utils/date'

export default function UpcomingBuys({ items = [], buys, theme, onAdd }) {
  const navigate = useNavigate();
  const list = Array.isArray(buys) ? buys : items
  
  const handleViewAll = () => {
    navigate('/orders', { state: { activeTab: 'groupbuy' } });
  }

  return (
    <div className="p-6 rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="h3" style={{ color: theme.primaryDark }}>Upcoming Buys</h3>
        <div className="flex items-center gap-2">
            <button onClick={handleViewAll} className="px-3 py-1.5 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.accent, color: theme.primaryDark }}>View All</button>
            <button onClick={onAdd} className="px-3 py-1.5 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Add</button>
        </div>
      </div>
      <hr className="mb-4" style={{ borderColor: theme.border }} />
      {list.length === 0 ? (
        <p className="text-sm" style={{ color: theme.textLight }}>No planned purchases.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((it) => (
            <li key={it.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: theme.border }}>
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  {it.openDate && it.closeDate ? `${formatMMDDYYYY(it.openDate)} - ${formatMMDDYYYY(it.closeDate)}` : (it.date ? formatMMDDYYYY(it.date) : '')}
                  {it.vendor ? ` • ${it.vendor}` : ''}
                </div>
                {it.notes && <div className="text-xs" style={{ color: theme.textLight }}>{it.notes}</div>}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


