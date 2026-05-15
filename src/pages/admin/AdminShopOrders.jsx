import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Loader, Package, ChevronDown, ChevronUp, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: '#f59e0b', icon: Clock },
  { value: 'shipped', label: 'Shipped', color: '#3b82f6', icon: Truck },
  { value: 'delivered', label: 'Delivered', color: '#22c55e', icon: CheckCircle },
];

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminShopOrders() {
  const { theme } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);
  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = orders.filter((o) => o.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Shop Orders</h1>
        <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>{orders.length} total orders</p>
      </div>

      {/* Status filter */}
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

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="animate-spin" style={{ color: theme.primary }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={32} className="mx-auto mb-3 opacity-20" style={{ color: theme.textLight }} />
          <p className="text-sm" style={{ color: theme.textLight }}>No orders found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const isExpanded = expanded === order.id;
            const statusInfo = STATUS_OPTIONS.find((s) => s.value === order.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusInfo.icon;
            const totalFormatted = `$${((order.amountTotal || 0) / 100).toFixed(2)}`;

            return (
              <div
                key={order.id}
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
              >
                {/* Header row */}
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
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: statusInfo.color }}
                      >
                        {statusInfo.label.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: theme.textLight }}>
                        {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: theme.primary }}>{totalFormatted}</span>
                      <span className="text-xs" style={{ color: theme.textLight }}>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: theme.textLight }} /> : <ChevronDown size={16} style={{ color: theme.textLight }} />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-4 border-t" style={{ borderColor: theme.border }}>
                    {/* Customer */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Customer</p>
                      <p className="text-sm" style={{ color: theme.text }}>{order.customerName || '—'}</p>
                      <p className="text-sm" style={{ color: theme.textLight }}>{order.customerEmail || '—'}</p>
                    </div>

                    {/* Items */}
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

                    {/* Shipping Address */}
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

                    {/* Status Actions */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.textLight }}>Update Status</p>
                      <div className="flex gap-2">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => handleStatusChange(order.id, s.value)}
                            disabled={order.status === s.value}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                            style={
                              order.status === s.value
                                ? { backgroundColor: s.color, color: '#fff' }
                                : { backgroundColor: `${theme.text}08`, color: theme.text }
                            }
                          >
                            <s.icon size={12} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Session ID */}
                    <p className="text-[10px] font-mono" style={{ color: theme.textLight, opacity: 0.5 }}>
                      Session: {order.sessionId || order.id}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
