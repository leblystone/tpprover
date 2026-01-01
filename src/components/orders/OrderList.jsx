import React, { useMemo, useState } from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { renderCost as formatCurrency, renderCostPerMg as formatCostPerMg } from '../../utils/currencyUtils'
import { Pencil, Truck, Package, Beaker, DollarSign, Calendar, Info, Edit, Home, MoreVertical, Trash2 } from 'lucide-react'

const getNextStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('ship')) {
    return { text: 'Mark as Delivered', icon: <Home className="h-4 w-4" /> };
  }
  if (s.includes('deliver')) {
    return null; // This is the final status, no next action
  }
  // Default to 'Order Placed'
  return { text: 'Mark as Shipped', icon: <Truck className="h-4 w-4" /> };
};

export default function OrderList({ orders = [], theme, onEdit, onAdvance, onDelete, vendors = [] }) {
  const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  const [openMenuId, setOpenMenuId] = useState(null);

  if (!orders.length) {
    return <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
  }

  // Render one full-width card per order; assume orders already sorted chronologically
  return (
    <div className="space-y-4">
      {orders.map(o => {
        const nextStatusAction = getNextStatus(o.status);
        return (
          <div 
            key={o.id} 
            className="rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer relative" 
            style={{ backgroundColor: theme.cardBackground }}
            onClick={() => onEdit?.(o)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1" style={{ color: theme.primaryDark }}>
                  {formatOrderTitle(o)}
                </h3>
                {o.vendorId || o.vendor ? (
                  <p className="text-sm flex items-center gap-2" style={{ color: theme.textLight }}>
                    <Package size={14} />
                    from {o.vendorId ? vendorMap[o.vendorId] : o.vendor}
                  </p>
                ) : null}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={statusStyle(o.status, theme)}>
                  {displayStatus(o.status)}
                </span>
                {nextStatusAction && (
                  <button 
                    aria-label={nextStatusAction.text} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0" 
                    style={{ 
                      backgroundColor: theme.primary,
                      color: theme.textOnPrimary 
                    }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvance?.(o);
                    }}
                  >
                    {nextStatusAction.icon}
                    <span className="hidden sm:inline">{nextStatusAction.text}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Beaker size={14} style={{ color: theme.textLight }} />
                <span style={{ color: theme.text }}>
                  Quantity: {formatTotalQuantity(o)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign size={14} style={{ color: theme.textLight }} />
                <span style={{ color: theme.text }}>
                  Total: {formatTotalCost(o)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: theme.textLight }} />
                <span style={{ color: theme.text }}>
                  Ordered: {formatMMDDYYYY(o.date)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Truck size={14} style={{ color: theme.textLight }} />
                <span style={{ color: theme.text }}>
                  {o.status === 'Delivered' 
                    ? `Delivered: ${formatMMDDYYYY(o.deliveryDate) || 'N/A'}`
                    : `Est. Delivery: ${formatMMDDYYYY(o.deliveryDate) || 'Pending'}`
                  }
                </span>
              </div>
            </div>

            {/* Notes */}
            {o.notes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
                <div className="flex items-start gap-2">
                  <Info size={14} style={{ color: theme.textLight }} className="mt-0.5" />
                  <span className="text-sm" style={{ color: theme.text }}>
                    {o.notes}
                  </span>
                </div>
              </div>
            )}

            {/* 3-dot menu in bottom right */}
            <div className="absolute bottom-3 right-3" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === o.id ? null : o.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: theme.textLight }}
                  title="More options"
                >
                  <MoreVertical size={16} />
                </button>
                
                {openMenuId === o.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div 
                      className="absolute bottom-8 right-0 bg-white rounded-lg shadow-lg border z-20 min-w-[140px]"
                      style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground 
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          onEdit?.(o);
                        }}
                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors rounded-t-lg"
                        style={{ color: theme.text }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            onDelete?.(o.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors rounded-b-lg"
                          style={{ color: theme.error || '#ef4444' }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )})}
    </div>
  )
}

function statusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return { backgroundColor: theme.successBg, color: theme.success }
  if (s.includes('ship')) return { backgroundColor: theme.infoBg, color: theme.info }
  if (s.includes('delay')) return { backgroundColor: theme.warningBg, color: theme.warning }
  return { backgroundColor: theme.secondary, color: theme.text }
}

function displayStatus(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return 'Delivered'
  if (s.includes('ship')) return 'In Transit'
  if (s.includes('delay')) return 'Delayed'
  return 'Order Placed'
}

const formatOrderTitle = (order) => {
    const items = order.items || [];
    const baseTitle = (() => {
        if (items.length === 0) {
            return order.peptide || 'Unknown Order'; // Fallback for old data structure
        }
        const names = items.map(item => item.name).filter(Boolean);
        if (names.length <= 2) {
            return names.join(' & ');
        }
        const remaining = names.length - 2;
        return `${names.slice(0, 2).join(', ')} +${remaining} more`;
    })();
    const number = Number.parseInt(order?.publicOrderNumber, 10);
    if (Number.isFinite(number) && number > 0) {
        return `Order #${number} · ${baseTitle}`;
    }
    return baseTitle;
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
    const itemsTotal = items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity, 10) || 1;
        return sum + (price * quantity);
    }, 0);
    const shippingCost = parseFloat(order.shippingCost) || 0;
    const total = itemsTotal + shippingCost;
    return formatCurrency(total);
};

function renderCost(cost) {
  return formatCurrency(cost)
}

function renderCostPerMg(order) {
  return formatCostPerMg(order)
}


