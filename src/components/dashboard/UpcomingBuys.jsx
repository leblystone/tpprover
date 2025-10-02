import React from 'react'
import { useNavigate } from 'react-router-dom';
import { formatMMDDYYYY } from '../../utils/date'
import { ShoppingCart, Plus } from 'lucide-react'

export default function UpcomingBuys({ items = [], buys, theme, onAdd }) {
  const navigate = useNavigate();
  const list = Array.isArray(buys) ? buys : items
  
  const handleViewAll = () => {
    navigate('/orders', { state: { activeTab: 'groupbuy' } });
  }

  const handleItemClick = (item) => {
    // Navigate to the specific scheduled buy details
    navigate('/orders', { state: { activeTab: 'groupbuy', selectedItem: item.id } });
  }

  return (
    <div className="rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: theme.text }}>
            Upcoming Buys
          </h3>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onAdd} 
              className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:opacity-80 border-2" 
              style={{ 
                borderColor: '#8F9B75', 
                color: '#8F9B75',
                backgroundColor: 'transparent'
              }}
            >
              <Plus size={10} strokeWidth={2} />
            </button>
            <ShoppingCart size={16} style={{ color: theme.primary }} />
          </div>
        </div>
      </div>
      
      <div className="p-3">
        {list.length === 0 ? (
          <p className="text-xs py-2" style={{ color: theme.textLight }}>No planned purchases.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((it) => (
              <li 
                key={it.id} 
                onClick={() => handleItemClick(it)}
                className="flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50" 
              >
                <div>
                  <div className="font-medium text-xs">{it.name || it.peptideName}</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>
                    {it.vendor && `${it.vendor} • `}
                    {it.openDate ? formatMMDDYYYY(it.openDate) : (it.date ? formatMMDDYYYY(it.date) : '')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {list.length > 0 && (
          <div className="mt-2 pt-2 border-t flex justify-center" style={{ borderColor: theme.border }}>
            <button 
              onClick={handleViewAll} 
              className="px-2 py-0.5 rounded text-xs font-medium border transition-colors opacity-70 hover:opacity-100" 
              style={{ 
                borderColor: theme.border, 
                color: theme.textLight,
                backgroundColor: 'transparent'
              }}
            >
              View All
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


