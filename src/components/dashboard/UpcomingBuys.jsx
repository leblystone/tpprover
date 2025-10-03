import React, { useState } from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { ShoppingCart, Plus, X, Calendar, MapPin, Users, DollarSign } from 'lucide-react'
import Modal from '../common/Modal'

export default function UpcomingBuys({ items = [], buys, theme, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const list = Array.isArray(buys) ? buys : items
  
  const handleViewAll = () => {
    setShowModal(true);
  }

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowModal(true);
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
      
      {/* Upcoming Buys Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedItem(null);
        }}
        title="Upcoming Group Buys"
        theme={theme}
        maxWidth="max-w-4xl"
        variant="modern"
      >
        <div className="space-y-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
                <ShoppingCart size={32} style={{ color: theme.primary }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Upcoming Buys</h3>
              <p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
                You don't have any scheduled group buys yet. Group buys are a great way to save money on bulk peptide orders.
              </p>
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Plus size={18} />
                Schedule a Group Buy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer"
                  style={{ 
                    borderColor: theme.border, 
                    backgroundColor: theme.cardBackground,
                    ...(selectedItem?.id === item.id && {
                      borderColor: theme.primary,
                      backgroundColor: `${theme.primary}05`
                    })
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1" style={{ color: theme.text }}>
                        {item.name || item.peptideName}
                      </h4>
                      <div className="flex items-center gap-2 text-sm mb-2" style={{ color: theme.textLight }}>
                        <Calendar size={14} />
                        {item.openDate ? formatMMDDYYYY(item.openDate) : (item.date ? formatMMDDYYYY(item.date) : 'TBD')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShoppingCart size={16} style={{ color: theme.primary }} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {item.vendor && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                        <span className="font-medium" style={{ color: theme.text }}>Vendor:</span>
                        {item.vendor}
                      </div>
                    )}
                    
                    {item.location && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                        <MapPin size={14} />
                        {item.location}
                      </div>
                    )}
                    
                    {item.participants && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                        <Users size={14} />
                        {item.participants} participants
                      </div>
                    )}
                    
                    {item.price && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: theme.textLight }}>
                        <DollarSign size={14} />
                        ${item.price} per unit
                      </div>
                    )}
                  </div>
                  
                  {item.description && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                      <p className="text-sm" style={{ color: theme.textLight }}>
                        {item.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {list.length > 0 && (
            <div className="flex justify-center pt-4 border-t" style={{ borderColor: theme.border }}>
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Plus size={18} />
                Schedule New Group Buy
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}


