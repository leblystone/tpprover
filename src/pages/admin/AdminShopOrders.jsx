import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Loader, Package, ChevronDown, ChevronUp, Truck, CheckCircle, Clock,
  MapPin, Tag, Printer, ExternalLink, Gift, Phone, ListFilter, Layers,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: '#f59e0b', icon: Clock },
  { value: 'shipped', label: 'Shipped', color: '#3b82f6', icon: Truck },
  { value: 'delivered', label: 'Delivered', color: '#22c55e', icon: CheckCircle },
];

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

function formatDate(ts) {
  if (!ts) return '\u2014';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function RatePickerModal({ rates, onSelect, onCancel, theme, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="rounded-xl border p-5 max-w-md w-full mx-4 space-y-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <h3 className="text-base font-bold" style={{ color: theme.text }}>Choose Shipping Rate</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader size={24} className="animate-spin" style={{ color: theme.primary }} /></div>
        ) : rates.length === 0 ? (
          <p className="text-sm py-4" style={{ color: theme.textLight }}>No rates available. Check the shipping address.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rates.map((rate) => (
              <button
                key={rate.id}
                onClick={() => onSelect(rate)}
                className="w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm text-left"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: theme.text }}>{rate.carrier} — {rate.service}</p>
                  {rate.delivery_days && (
                    <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>{rate.delivery_days} business day{rate.delivery_days !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <span className="text-sm font-bold" style={{ color: theme.primary }}>${Number(rate.rate).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onCancel}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ color: theme.textLight }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminShopOrders() {
  const { theme } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all');
  const [rateModal, setRateModal] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rates, setRates] = useState([]);
  const [purchasingLabel, setPurchasingLabel] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'physicalOrders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading orders:', err);
      toast('error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'physicalOrders', orderId), { status: newStatus, updatedAt: serverTimestamp() });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      toast('success', `Order marked as ${newStatus}`);
    } catch (err) {
      toast('error', 'Failed to update status');
    }
  };

  const handleCreateLabel = useCallback(async (orderId) => {
    setRateModal(orderId);
    setRatesLoading(true);
    setRates([]);
    try {
      const functions = getFunctions();
      const createLabel = httpsCallable(functions, 'createShippingLabel');
      const { data } = await createLabel({ orderId });
      setRates(data.rates || []);
    } catch (err) {
      console.error('Create label error:', err);
      toast('error', err.message || 'Failed to get shipping rates');
      setRateModal(null);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const handlePurchaseLabel = useCallback(async (rate) => {
    const orderId = rateModal;
    setPurchasingLabel(orderId);
    setRateModal(null);
    try {
      const functions = getFunctions();
      const purchaseLabel = httpsCallable(functions, 'purchaseShippingLabel');
      const { data } = await purchaseLabel({ orderId, shipmentId: rate.shipmentId, rateId: rate.id });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? {
        ...o,
        status: 'shipped',
        trackingNumber: data.trackingNumber,
        labelUrl: data.labelUrl,
        labelCarrier: data.carrier,
      } : o)));
      toast('success', `Label purchased! Tracking: ${data.trackingNumber}`);
    } catch (err) {
      console.error('Purchase label error:', err);
      toast('error', err.message || 'Failed to purchase label');
    } finally {
      setPurchasingLabel(null);
    }
  }, [rateModal]);

  const handlePrintSlip = useCallback(async (orderId) => {
    try {
      const functions = getFunctions();
      const printSlip = httpsCallable(functions, 'printPackingSlip');
      const { data } = await printSlip({ orderId });
      if (data.html) {
        const win = window.open('', '_blank');
        win.document.write(data.html);
        win.document.close();
        win.print();
      }
    } catch (err) {
      console.error('Print slip error:', err);
      toast('error', 'Failed to generate packing slip');
    }
  }, []);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const filtered = viewMode === 'queue'
    ? [...pendingOrders].sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return aTime - bTime;
      })
    : statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = orders.filter((o) => o.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Shop Orders</h1>
          <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>{orders.length} total orders</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'all' ? 'text-white' : ''}`}
            style={viewMode === 'all' ? { backgroundColor: theme.primary } : { color: theme.textLight, backgroundColor: `${theme.text}08` }}
          >
            <Layers size={14} />
            All Orders
          </button>
          <button
            onClick={() => setViewMode('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'queue' ? 'text-white' : ''}`}
            style={viewMode === 'queue' ? { backgroundColor: '#f59e0b' } : { color: theme.textLight, backgroundColor: `${theme.text}08` }}
          >
            <ListFilter size={14} />
            Fulfillment Queue
            {pendingOrders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">{pendingOrders.length}</span>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'all' && (
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === 'all' ? 'text-white' : ''}`}
            style={statusFilter === 'all' ? { backgroundColor: theme.primary } : { color: theme.textLight, backgroundColor: `${theme.text}08` }}
          >
            All ({orders.length})
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === s.value ? 'text-white' : ''}`}
              style={statusFilter === s.value ? { backgroundColor: s.color } : { color: theme.textLight, backgroundColor: `${theme.text}08` }}
            >
              {s.label} ({statusCounts[s.value] || 0})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="animate-spin" style={{ color: theme.primary }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={32} className="mx-auto mb-3 opacity-20" style={{ color: theme.textLight }} />
          <p className="text-sm" style={{ color: theme.textLight }}>
            {viewMode === 'queue' ? 'No pending orders! All caught up.' : 'No orders found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const isExpanded = expanded === order.id;
            const statusInfo = STATUS_OPTIONS.find((s) => s.value === order.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusInfo.icon;
            const totalFormatted = `$${((order.amountTotal || 0) / 100).toFixed(2)}`;
            const isPurchasing = purchasingLabel === order.id;

            return (
              <div
                key={order.id}
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/[0.02] transition-colors"
                >
                  <StatusIcon size={18} style={{ color: statusInfo.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                        {order.customerName || order.customerEmail || 'Guest'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: statusInfo.color }}>
                        {statusInfo.label.toUpperCase()}
                      </span>
                      {order.source && order.source !== 'own-site' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          {order.source.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: theme.textLight }}>
                        {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: theme.primary }}>{totalFormatted}</span>
                      <span className="text-xs" style={{ color: theme.textLight }}>{formatDate(order.createdAt)}</span>
                      {order.trackingNumber && (
                        <span className="text-[10px] font-mono" style={{ color: theme.textLight }}>{order.trackingNumber}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: theme.textLight }} /> : <ChevronDown size={16} style={{ color: theme.textLight }} />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-4 border-t" style={{ borderColor: theme.border }}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Customer</p>
                      <p className="text-sm" style={{ color: theme.text }}>{order.customerName || '\u2014'}</p>
                      <p className="text-sm" style={{ color: theme.textLight }}>{order.customerEmail || '\u2014'}</p>
                      {order.customerPhone && (
                        <p className="text-sm flex items-center gap-1" style={{ color: theme.textLight }}>
                          <Phone size={12} />{order.customerPhone}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Items</p>
                      <div className="space-y-1">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span style={{ color: theme.text }}>{item.name} <span style={{ color: theme.textLight }}>x{item.quantity}</span></span>
                            <span className="font-semibold" style={{ color: theme.text }}>${((item.amountTotal || 0) / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.shippingAddress && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin size={12} style={{ color: theme.primary }} />
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>Ship To</p>
                        </div>
                        <div className="text-sm leading-relaxed" style={{ color: theme.text }}>
                          {order.shippingName && <>{order.shippingName}<br /></>}
                          {order.shippingAddress.line1}<br />
                          {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}<br />
                          {order.shippingAddress.country}
                        </div>
                      </div>
                    )}

                    {order.giftMessage && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Gift size={12} style={{ color: '#ec4899' }} />
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>Gift Message</p>
                        </div>
                        <p className="text-sm italic" style={{ color: theme.text }}>"{order.giftMessage}"</p>
                      </div>
                    )}

                    {order.trackingNumber && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Tag size={12} style={{ color: theme.primary }} />
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>Tracking</p>
                        </div>
                        <p className="text-sm font-mono" style={{ color: theme.text }}>{order.trackingNumber}</p>
                        <p className="text-xs" style={{ color: theme.textLight }}>{order.labelCarrier || 'Carrier'}</p>
                        {order.labelUrl && (
                          <a
                            href={order.labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-xs font-semibold"
                            style={{ color: theme.primary }}
                          >
                            <ExternalLink size={12} />Download Label
                          </a>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.textLight }}>Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleCreateLabel(order.id)}
                            disabled={isPurchasing}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                            style={{ backgroundColor: '#3b82f6' }}
                          >
                            {isPurchasing ? <Loader size={12} className="animate-spin" /> : <Truck size={12} />}
                            {isPurchasing ? 'Creating...' : 'Create Label'}
                          </button>
                        )}

                        <button
                          onClick={() => handlePrintSlip(order.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors hover:bg-black/5"
                          style={{ borderColor: theme.border, color: theme.text }}
                        >
                          <Printer size={12} />Print Packing Slip
                        </button>

                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => handleStatusChange(order.id, s.value)}
                            disabled={order.status === s.value}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
                            style={order.status === s.value ? { backgroundColor: s.color, color: '#fff' } : { backgroundColor: `${theme.text}08`, color: theme.text }}
                          >
                            <s.icon size={12} />{s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: theme.textLight, opacity: 0.5 }}>
                      <span>Session: {order.sessionId || order.id}</span>
                      {order.source && <span>Source: {order.source}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rateModal && (
        <RatePickerModal
          rates={rates}
          loading={ratesLoading}
          onSelect={handlePurchaseLabel}
          onCancel={() => setRateModal(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
