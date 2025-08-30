 import React from 'react'
 import { CheckCircle, Clock, Truck } from 'lucide-react'
 import { useNavigate } from 'react-router-dom'

export default function UpcomingOrderCard({ order, theme }) {
  const navigate = useNavigate()
  if (!order) return (
    <div className="p-8 rounded-xl content-card w-full" style={{ backgroundColor: theme.cardBackground }}>
      <h3 className="h3 mb-6 border-b pb-3" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <p>No active orders.</p>
    </div>
  )

  const steps = [
    { status: 'received', icon: <Clock size={24} color={theme.primary} />, label: 'Order Placed' },
    { status: 'shipped', icon: <Truck size={24} color={theme.primary} />, label: 'Shipped' },
    { status: 'delivered', icon: <CheckCircle size={24} color={theme.primary} />, label: 'Delivered' },
  ]
  let current = 0
  if (order.deliveryDate) current = 2
  else if (order.shipDate) current = 1

  return (
    <div className="p-8 rounded-xl content-card w-full h-full flex flex-col items-center transition-opacity" style={{ backgroundColor: theme.cardBackground }}>
      <h3 className="h3 mb-4 border-b pb-2 text-center" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <div className="w-full flex flex-col items-center mb-6">
        <div className="text-xl font-bold mb-0" style={{ color: theme.primary }}>{order.peptide} {order.mg}mg</div>
        <div className="text-base mb-2" style={{ color: theme.textLight }}>
          <span style={{ fontWeight: 500, color: theme.text }}>From:</span> {order.vendor}
        </div>
      </div>
      <div className="w-full flex items-center justify-between relative mb-8 px-4">
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1" 
            style={{ 
              width: '100%',
              backgroundColor: theme.secondary 
            }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1" 
            style={{ 
              width: `${(current / (steps.length - 1)) * 100}%`,
              backgroundColor: theme.primary,
              transition: 'width 0.3s ease-in-out'
            }}
          />
          {steps.map((s, idx) => (
            <div key={s.status} className="flex flex-col items-center z-10">
              <div
                className="rounded-full p-3 border-4"
                style={{ 
                  backgroundColor: idx <= current ? theme.primary : theme.cardBackground,
                  borderColor: idx <= current ? theme.primary : theme.secondary
                }}
              >
                {React.cloneElement(s.icon, { color: idx <= current ? theme.textOnPrimary : theme.textLight })}
              </div>
            </div>
          ))}
      </div>

      <div className="w-full flex justify-between px-4">
        {steps.map((s, idx) => (
            <span
              key={s.status}
              className="text-xs text-center"
              style={{ color: idx <= current ? theme.primaryDark : theme.textLight, fontWeight: idx <= current ? '600' : '400' }}
            >
              {s.label}
            </span>
        ))}
      </div>
      
      <button
        className="mt-8 px-6 py-3 rounded-lg font-semibold transition-all duration-200 w-full"
        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        onClick={() => navigate('/orders')}
      >
        View Orders
      </button>
    </div>
  )
}


