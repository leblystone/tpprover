import React, { useMemo, useEffect, useState } from 'react'
import { formatMMDDYYYY } from '../../utils/date'
import { renderCost as formatCurrency, renderCostPerMg as formatCostPerMg } from '../../utils/currencyUtils'
import { getCachedTrackingInfo, detectCarrier } from '../../services/tracking'
import { Pencil, Truck, Package, DollarSign, Calendar, Info, Home, ShoppingBag, ClipboardList, ChevronDown, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import ImagePreviewModal from '../common/ImagePreviewModal'

const getNextStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('ship')) {
    return { text: 'Mark as Delivered', icon: <Home className="h-3 w-3" /> };
  }
  if (s.includes('deliver')) {
    return null; // This is the final status, no next action
  }
  // Default to 'Order Placed'
  return { text: 'Mark as Shipped', icon: <Truck className="h-3 w-3" /> };
};

export default function OrderList({ orders = [], theme, onEdit, onAdvance, onDelete, vendors = [] }) {
  const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  const [liveStatusByOrderId, setLiveStatusByOrderId] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch live carrier status only for orders in live-tracking mode (has tracking + not manual)
  useEffect(() => {
    if (!orders?.length) return;
    let cancelled = false;
    const withTracking = orders.filter((o) => o.tracking && String(o.tracking).trim() && !o.manualTracking);
    if (!withTracking.length) return;
    (async () => {
      const next = {};
      for (const o of withTracking) {
        if (cancelled) return;
        try {
          const carrier = detectCarrier(o.tracking);
          const info = await getCachedTrackingInfo(o.tracking, carrier);
          if (!cancelled && info && !info.hasError && info.status) next[o.id] = info.status;
        } catch (_) { /* ignore */ }
      }
      if (!cancelled) setLiveStatusByOrderId((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
  }, [orders?.length, orders?.filter((o) => o.tracking && !o.manualTracking).map((o) => o.id).join(',')]);

  if (!orders.length) {
    return <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
  }

  // Render one full-width card per order; assume orders already sorted chronologically
  return (
    <>
    <div className="space-y-4">
      {orders.map((o, index) => {
        const isLiveTracking = o.tracking && String(o.tracking).trim() && !o.manualTracking;
        // Manual tracking (with or without tracking #): chip shows saved status until user marks delivered
        const statusToShow = isLiveTracking && liveStatusByOrderId[o.id] != null
          ? liveStatusByOrderId[o.id]
          : (o.status || 'Order Placed');
        const nextStatusAction = isLiveTracking ? null : getNextStatus(o.status);
        const vendorName = o.vendorId ? vendorMap[o.vendorId] : o.vendor;

        return (
          <div 
            key={o.id} 
            className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-xl p-4 glass-panel-minimal" 
            style={{ 
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
                {(o.items || []).length > 1 && (
                <div className="flex items-center gap-1.5 text-[12px] opacity-70" style={{ color: theme.text }}>
                  <span className="flex-shrink-0" style={{ color: theme.textLight || '#6b7d7a' }}>
                    +{(o.items || []).length - 1} more in this order
                  </span>
                </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Live tracking: status chip with ETA/Delivered under it */}
                {isLiveTracking && (
                <div className="flex flex-col items-end gap-0.5">
                  <div
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider shadow-sm"
                    style={statusStyle(statusToShow, theme)}
                  >
                    {displayStatus(statusToShow)}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <Truck size={10} style={{ color: '#8ca68c' }} />
                    <span style={{ color: theme.textLight || 'rgba(0,0,0,0.5)' }}>
                      {(statusToShow || '').toLowerCase().includes('deliver') ? 'Delivered:' : 'ETA:'}
                    </span>
                    <span className="font-medium" style={{ color: theme.text }}>
                      {(statusToShow || '').toLowerCase().includes('deliver')
                        ? (formatMMDDYYYY(o.deliveryDate) || 'N/A')
                        : 'Pending'}
                    </span>
                  </div>
                </div>
                )}
                {/* Manual tracking: action button (when not yet delivered) */}
                {nextStatusAction && (
                <button
                  aria-label={nextStatusAction.text}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.textOnPrimary,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)'
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
                {/* Manual tracking: show Delivered + date only once actually delivered */}
                {!isLiveTracking && (o.status || '').toLowerCase().includes('deliver') && (
                <div className="flex items-center gap-2 text-[10px]">
                  <Truck size={10} style={{ color: '#8ca68c' }} />
                  <span style={{ color: theme.textLight || 'rgba(0,0,0,0.5)' }}>Delivered:</span>
                  <span className="font-medium" style={{ color: theme.text }}>
                    {formatMMDDYYYY(o.deliveryDate) || 'N/A'}
                  </span>
                </div>
                )}
              </div>
            </div>

            {/* Main Content Area with Vertical Indicators */}
            <div className="space-y-3.5 mt-2">
              
              {/* Items Detail (Contents) — above Order Summary */}
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
                    {o.items.slice(0, 3).map((item, idx) => {
                      const amountUnit = item.mgUnit || 'mg';
                      const amountLabel = item.mg != null && item.mg !== '' ? `(${item.mg}${amountUnit})` : '';
                      const containerUnit = item.unit || 'vial';
                      const plural = Number(item.quantity) !== 1 && !containerUnit.endsWith('s') ? 's' : '';
                      const containerLabel = `${item.quantity} ${containerUnit}${plural}`;
                      return (
                        <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                          <span className="truncate mr-2" style={{ color: theme.text }}>
                            {item.name} {amountLabel}
                          </span>
                          <span className="font-semibold opacity-60 flex-shrink-0" style={{ color: theme.text }}>
                            {containerLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {o.items.length > 3 && (
                    <div className="text-[9px] mt-1 italic opacity-50 text-center" style={{ color: theme.text }}>
                      + {o.items.length - 3} more items... Tap to view all
                    </div>
                  )}
                </div>
              )}

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
                    Summary
                  </div>
                  <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: '#8ca68c' }} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar size={12} style={{ color: '#8ca68c', flexShrink: 0 }} />
                      <span style={{ color: theme.textLight || 'rgba(0,0,0,0.5)' }}>Ordered:</span>
                      <span className="font-medium truncate" style={{ color: theme.text }}>{formatMMDDYYYY(o.date)}</span>
                    </div>
                    {(o.attachments || []).filter((d) => d.type === 'image').length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {(o.attachments || []).filter((d) => d.type === 'image').map((doc) => {
                          const name = doc.title?.trim() || 'Image';
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(doc);
                              }}
                              className="inline-flex items-center gap-1 font-medium truncate max-w-[180px] opacity-90 hover:opacity-100 text-left"
                              style={{ color: theme.text }}
                            >
                              <ImageIcon size={14} style={{ color: '#8ca68c', flexShrink: 0 }} />
                              <span className="truncate">{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    {vendorName && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Package size={12} style={{ color: '#8ca68c', flexShrink: 0 }} />
                        <span style={{ color: theme.textLight || 'rgba(0,0,0,0.5)' }}>Vendor:</span>
                        <span className="font-medium truncate" style={{ color: theme.text }}>{vendorName}</span>
                      </div>
                    )}
                    {(o.attachments || []).filter((d) => d.type === 'link' && d.url).length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {(o.attachments || []).filter((d) => d.type === 'link' && d.url).map((doc) => {
                          const name = doc.title?.trim() || 'Link';
                          return (
                            <a
                              key={doc.id}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 font-medium truncate max-w-[180px] hover:underline"
                              style={{ color: theme.primary || '#557755' }}
                            >
                              <LinkIcon size={14} style={{ color: '#8ca68c', flexShrink: 0 }} />
                              <span className="truncate">{name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {o.notes && (
                  <p
                    className="text-[11px] leading-relaxed italic mt-1 text-center"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      color: theme.textLight || 'rgba(0,0,0,0.55)'
                    }}
                  >
                    {o.notes}
                  </p>
                )}

                <div className="flex items-baseline justify-center gap-1.5 mt-2">
                  <span className="text-[11px]" style={{ color: theme.textLight || 'rgba(0,0,0,0.45)' }}>Total Spent</span>
                  <span className="text-base font-bold" style={{ color: theme.text }}>{formatTotalCost(o)}</span>
                </div>
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
          </div>
        )})}
    </div>
    <ImagePreviewModal
      image={previewImage}
      open={!!previewImage}
      onClose={() => setPreviewImage(null)}
      theme={theme}
      readonly={true}
    />
    </>
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
  if (items.length === 0) return order.peptide || 'Unknown Order';
  return items[0]?.name || 'Unknown';
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


