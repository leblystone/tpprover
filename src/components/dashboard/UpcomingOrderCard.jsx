 import React from 'react'
 import { CheckCircle, Clock, Truck } from 'lucide-react'
 import { useNavigate } from 'react-router-dom'

export default function UpcomingOrderCard({ order, theme }) {
  const navigate = useNavigate()
  if (!order) return (
    <div className="p-8 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
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
    <div className="p-8 rounded-xl content-card w-full h-full flex flex-col items-center" style={{ backgroundColor: theme.white }}>
      <h3 className="h3 mb-4 border-b pb-2 text-center" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <div className="w-full flex flex-col items-center mb-6">
        <div className="text-xl font-bold mb-0" style={{ color: theme.primary }}>{order.peptide} {order.mg}mg</div>
        <div className="text-base mb-2" style={{ color: theme.textLight }}>
          <span style={{ fontWeight: 500, color: theme.text }}>From:</span> {order.vendor}
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 mb-6">
        {steps.map((s, idx) => (
          <div key={s.status} className="flex flex-col items-center">
            <div className={`rounded-full p-3 ${idx <= current ? 'bg-green-100' : 'bg-gray-100'}`}>{s.icon}</div>
            <span className={`text-xs mt-2 ${idx <= current ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mb-4">
        {current === 1 && <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">In Transit</span>}
        {current === 2 && <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Delivered</span>}
      </div>
      <button className="mt-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 w-full" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => navigate('/orders')}>
        View Orders
      </button>
    </div>
  )
}


