import React, { useMemo } from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { Pencil, Truck, Package, Beaker, DollarSign, Calendar, Info, Edit } from 'lucide-react'

export default function OrderList({ orders = [], theme, onEdit, onAdvance, vendors = [] }) {
  const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  if (!orders.length) {
    return <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
  }

  // Render one full-width card per order; assume orders already sorted chronologically
  return (
    <div className="space-y-3">
      {orders.map(o => (
        <div key={o.id} className="rounded-lg border p-4 shadow-sm content-card" style={{ borderColor: theme?.border || '#eee', backgroundColor: theme.cardBackground }}>
          <div className="grid grid-cols-12 gap-4 items-center">

            <div className="col-span-12 sm:col-span-4">
              <div className="font-semibold text-base" style={{ color: theme?.text }}>{formatOrderTitle(o)}</div>
              <div className="text-sm flex items-center gap-2 mt-1" style={{ color: theme.textLight }}>
                <Package size={14} /> {o.vendorId ? vendorMap[o.vendorId] : o.vendor}
              </div>
            </div>

            <div className="col-span-6 sm:col-span-2 text-sm" style={{ color: theme.textLight }}>
              <div className="flex items-center gap-2"><Beaker size={14} /> {formatTotalQuantity(o)}</div>
              <div className="flex items-center gap-2 mt-1"><DollarSign size={14} /> {formatTotalCost(o)}</div>
            </div>

            <div className="col-span-6 sm:col-span-3 text-sm" style={{ color: theme.textLight }}>
              <div className="flex items-center gap-2"><Calendar size={14} /> Ordered: {formatMMDDYYYY(o.date)}</div>
              <div className="flex items-center gap-2 mt-1">
                <Truck size={14} /> 
                {o.status === 'Delivered' 
                    ? `Delivered: ${formatMMDDYYYY(o.deliveryDate) || ''}`
                    : `Est. Delivery: ${formatMMDDYYYY(o.deliveryDate) || 'Pending'}`
                }
              </div>
            </div>

            <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-semibold" style={statusStyle(o.status, theme)}>
                {displayStatus(o.status)}
              </span>
              <button aria-label="Update shipping status" className="p-2 rounded-md hover:bg-gray-100" style={{ color: theme.primary }} onClick={() => onAdvance?.(o)}>
                <Truck className="h-4 w-4" />
              </button>
              <button aria-label="Edit" className="p-2 rounded-md hover:bg-gray-100" style={{ color: theme.primary }} onClick={() => onEdit(o)}>
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
          {o.notes && (
            <div className="mt-3 pt-3 border-t text-xs flex items-start gap-2" style={{ borderColor: theme.border, color: theme.textLight }}>
              <Info size={14} className="mt-0.5" />
              <p>{o.notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function statusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return { backgroundColor: theme.successBg, color: theme.success }
  if (s.includes('ship')) return { backgroundColor: theme.warningBg, color: theme.warning }
  return { backgroundColor: theme.secondary, color: theme.text }
}

function displayStatus(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return 'Delivered'
  if (s.includes('ship')) return 'In Transit'
  return 'Order Placed'
}

const formatOrderTitle = (order) => {
    const items = order.items || [];
    if (items.length === 0) {
        return order.peptide || 'Unknown Order'; // Fallback for old data structure
    }
    const names = items.map(item => item.name).filter(Boolean);
    if (names.length <= 2) {
        return names.join(' & ');
    }
    const remaining = names.length - 2;
    return `${names.slice(0, 2).join(', ')} +${remaining} more`;
};

const formatTotalQuantity = (order) => {
    const items = order.items || [];
    if (items.length === 0) {
        return `${order.mg || '-'} mg (${order.quantity || 1} ${order.unit || 'vial'})`; // Fallback
    }
    const totalVials = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const unit = totalVials === 1 ? 'item' : 'items';
    return `${totalVials} ${unit}`;
};

const formatTotalCost = (order) => {
    const items = order.items || [];
    if (items.length === 0) {
        return renderCost(order.cost); // Fallback
    }
    const total = items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        return sum + (price * quantity);
    }, 0);
    return `$${total.toFixed(2)}`;
};

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


