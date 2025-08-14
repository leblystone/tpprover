import React from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { Pencil, ArrowRight } from 'lucide-react'

export default function OrderList({ orders = [], theme, onEdit, onAdvance }) {
  if (!orders.length) {
    return <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b" style={{ borderColor: theme?.border || '#eee' }}>
            <th className="py-2 pr-4">Vendor</th>
            <th className="py-2 pr-4">Peptide</th>
            <th className="py-2 pr-4">mg</th>
            <th className="py-2 pr-4">Cost</th>
            <th className="py-2 pr-4">Cost/mg</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-b" style={{ borderColor: theme?.border || '#eee' }}>
              <td className="py-2 pr-4 whitespace-nowrap">{o.vendor}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{o.peptide}</td>
              <td className="py-2 pr-4">{o.mg ? (<span className="status-info">{o.mg} mg</span>) : ''}</td>
              <td className="py-2 pr-4">{renderCost(o.cost)}</td>
              <td className="py-2 pr-4">{renderCostPerMg(o)}</td>
              <td className="py-2 pr-4">
                <span className="px-2 py-1 rounded-full text-xs font-semibold" style={statusStyle(o.status)}>
                  {displayStatus(o.status)}
                </span>
              </td>
              <td className="py-2 pr-4">{formatMMDDYYYY(o.date || o.placedDate || '') || '-'}</td>
              <td className="py-2 pr-0 text-right">
                <div className="inline-flex items-center gap-2">
                  <button aria-label="Next step" className="p-2 rounded-md border" style={{ borderColor: theme?.border || '#eee' }} onClick={() => onAdvance?.(o)}>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button aria-label="Edit" className="p-2 rounded-md border" style={{ borderColor: theme?.border || '#eee' }} onClick={() => onEdit(o)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function statusStyle(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return { backgroundColor: '#DCFCE7', color: '#166534' }
  if (s.includes('ship')) return { backgroundColor: '#FEF9C3', color: '#854D0E' }
  return { backgroundColor: '#E5E7EB', color: '#374151' }
}

function displayStatus(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return 'Delivered'
  if (s.includes('ship')) return 'In Transit'
  return 'Order Placed'
}

function renderCost(cost) {
  if (cost == null || cost === '') return '—'
  const n = Number(cost)
  if (!isNaN(n)) return `$${n.toFixed(2)}`
  return String(cost)
}

function renderCostPerMg(order) {
  const c = Number(order?.cost)
  const mgPerVial = Number(order?.mg)
  const qty = Math.max(1, Number(order?.quantity) || 1)
  const unitMult = String(order?.unit || 'vial').toLowerCase() === 'kit' ? 10 : 1
  const totalMg = (mgPerVial > 0 ? mgPerVial : NaN) * qty * unitMult
  if (isNaN(c) || isNaN(totalMg) || totalMg <= 0) return '—'
  return `$${(c / totalMg).toFixed(2)}`
}


