import React, { useMemo, useState } from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { renderCost as formatCurrency, renderCostPerMg as formatCostPerMg } from '../../utils/currencyUtils'
import { Pencil, Truck, Package, Beaker, DollarSign, Calendar, Info, Home, MoreVertical, Trash2, ShoppingBag, ClipboardList, ChevronDown } from 'lucide-react'

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
        const vendorName = o.vendorId ? vendorMap[o.vendorId] : o.vendor;

        return (
          <div 
            key={o.id} 
            className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-xl p-4" 
            style={{ 
              backgroundColor: theme.cardBackground,
              fontFamily: 'Poppins, sans-serif',
              border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
            }}
            onClick={() => onEdit?.(o)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate mb-1" style={{ color: theme.text }}>
                  {formatOrderTitle(o)}
                </h3>
                {vendorName && (
                  <div className="flex items-center gap-1.5 text-[12px] opacity-70" style={{ color: theme.text }}>
                    <Package size={12} style={{ color: '#8ca68c' }} />
                    {vendorName}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider shadow-sm"
                  style={statusStyle(o.status, theme)}
                >
                  {displayStatus(o.status)}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === o.id ? null : o.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    style={{ color: theme.textLight }}
                    title="More options"
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {openMenuId === o.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div 
                        className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border z-20 min-w-[140px] overflow-hidden"
                        style={{ 
                          borderColor: theme.border,
                          backgroundColor: theme.cardBackground 
                        }}
                      >
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              onDelete?.(o.id);
                            }}
                            className="w-full px-4 py-2.5 text-left text-[12px] flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            style={{ color: theme.error || '#ef4444' }}
                          >
                            <Trash2 size={14} />
                            Delete Order
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {nextStatusAction && (
                  <button 
                    aria-label={nextStatusAction.text} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95" 
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
                    <span>{nextStatusAction.text}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Content Area with Vertical Indicators */}
            <div className="space-y-3.5 mt-2">
              
              {/* Summary Stats with Vertical Line */}
              <div className="relative pl-3">
                <div 
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                  style={{ backgroundColor: '#8ca68c', opacity: 0.4 }}
                />
                
                {/* Section Divider/Header */}
                <div className="text-[10px] font-medium uppercase tracking-widest mb-2 opacity-60 flex items-center" style={{ color: theme.text }}>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ClipboardList size={10} style={{ color: '#8ca68c' }} />
                    Order Summary
                  </div>
                  <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: '#8ca68c' }} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                  <div className="flex items-center gap-2">
                    <Beaker size={12} style={{ color: '#8ca68c' }} />
                    <span style={{ color: theme.text }}>
                      Items: {formatTotalQuantity(o)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign size={12} style={{ color: '#8ca68c' }} />
                    <span className="font-semibold" style={{ color: theme.text }}>
                      Total: {formatTotalCost(o)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar size={12} style={{ color: '#8ca68c' }} />
                    <span style={{ color: theme.text }}>
                      Ordered: {formatMMDDYYYY(o.date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Truck size={12} style={{ color: '#8ca68c' }} />
                    <span style={{ color: theme.text }}>
                      {o.status === 'Delivered' 
                        ? `Delivered: ${formatMMDDYYYY(o.deliveryDate) || 'N/A'}`
                        : `Est: ${formatMMDDYYYY(o.deliveryDate) || 'Pending'}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Detail */}
              {o.items && o.items.length > 0 && (
                <div className="relative pl-3">
                  <div 
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ backgroundColor: '#8ca68c', opacity: 0.4 }}
                  />
                  
                  <div className="text-[10px] font-medium uppercase tracking-widest mb-2 opacity-60 flex items-center" style={{ color: theme.text }}>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ShoppingBag size={10} style={{ color: '#8ca68c' }} />
                      Contents
                    </div>
                    <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: '#8ca68c' }} />
                  </div>

                  <div className="space-y-1">
                    {o.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="truncate mr-2" style={{ color: theme.text }}>
                          {item.name} {item.mg ? `(${item.mg}mg)` : ''}
                        </span>
                        <span className="font-semibold opacity-60 flex-shrink-0" style={{ color: theme.text }}>
                          {item.quantity} {item.unit || 'vial'}{item.quantity !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {o.items.length > 3 && (
                    <div className="text-[9px] mt-1 italic opacity-50 text-center" style={{ color: theme.text }}>
                      + {o.items.length - 3} more items... Tap to view all
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {o.notes && (
                <div className="relative pl-3">
                  <div 
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ backgroundColor: '#8ca68c', opacity: 0.4 }}
                  />
                  
                  <div className="text-[10px] font-medium uppercase tracking-widest mb-1.5 opacity-60 flex items-center" style={{ color: theme.text }}>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Info size={10} style={{ color: '#8ca68c' }} />
                      Notes
                    </div>
                    <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: '#8ca68c' }} />
                  </div>

                  <div 
                    className="text-[11px] leading-relaxed italic opacity-70"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      color: theme.text
                    }}
                  >
                    {o.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="mt-4 pt-3 border-t flex items-center justify-center" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
              <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: theme.text }}>
                  View Order
                </span>
                <ChevronDown size={12} style={{ color: theme.primary }} strokeWidth={3} />
              </div>
            </div>
          </div>
        )})}
    </div>
  )
}

function statusStyle(status, theme) {
  const s = (status || '').toLowerCase()
  if (s.includes('deliver')) return { backgroundColor: theme.isDark ? 'rgba(87, 117, 87, 0.15)' : 'rgba(87, 117, 87, 0.12)', color: theme.isDark ? '#8ca68c' : '#557755' }
  if (s.includes('ship')) return { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)', color: theme.isDark ? '#60a5fa' : '#2563eb' }
  if (s.includes('delay')) return { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)', color: theme.isDark ? '#fca5a5' : '#ef4444' }
  return { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', color: theme.text }
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


