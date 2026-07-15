import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, getDocs, getDoc, doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
import { db, functions, auth } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  CircleNotch, Package, Printer, Truck, X,
  Plus, Trash, PaperPlaneTilt, Download, MagnifyingGlass, DotsThree, Check,
} from '@phosphor-icons/react';
import { fetchAllShopProducts } from '../../config/plannerProducts';
import ShippingLabelModal from '../../components/admin/ShippingLabelModal';
import AdminShopOrderDetail from '../../components/admin/AdminShopOrderDetail';
import {
  fulfillShippingLabelDownload,
  formatLabelPurchaseConfirmation,
  downloadLabelPdf,
} from '../../utils/shippingLabelDownload';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Canceled' },
];

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'cancelled', label: 'Canceled' },
];

const ORDERS_PAGE_SIZE = 25;

function isOrderCancelled(status) {
  const s = (status || '').toLowerCase();
  return s === 'cancelled' || s === 'canceled';
}

function OrderSelectCheckbox({ checked, onClick, theme, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`w-5 h-5 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${className}`}
      style={{
        borderColor: checked
          ? (theme.primaryDark || theme.primary)
          : `${theme.primaryLight || theme.primary}60`,
        backgroundColor: checked ? theme.primary : 'transparent',
        borderRadius: 4,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {checked && (
        <Check
          size={14}
          weight="bold"
          className="absolute text-white order-check-pop"
          style={{
            strokeWidth: 2.5,
            top: -3,
            right: -3,
          }}
        />
      )}
    </button>
  );
}

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

async function logOrderActivity(orderId, entry) {
  const activity = {
    id: crypto.randomUUID(),
    createdAt: Timestamp.now(),
    ...entry,
  };
  await updateDoc(doc(db, 'physicalOrders', orderId), {
    activityLog: arrayUnion(activity),
    updatedAt: serverTimestamp(),
  });
  return activity;
}

function patchOrderActivityInState(setOrders, setSelectedOrder, orderId, activity) {
  setOrders((prev) =>
    prev.map((o) => (o.id === orderId ? { ...o, activityLog: [...(o.activityLog || []), activity] } : o))
  );
  setSelectedOrder((prev) =>
    (prev?.id === orderId ? { ...prev, activityLog: [...(prev.activityLog || []), activity] } : prev)
  );
}

function formatDate(ts) {
  if (!ts) return '\u2014';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDateShort(ts) {
  if (!ts) return '\u2014';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function orderDisplayId(order) {
  if (order?.shopOrderNumber) return `#${order.shopOrderNumber}`;
  const num = order.squarespaceOrderNumber || order.squarespaceOrderId;
  if (num) return `#${String(num).replace(/^#/, '')}`;
  return `#${String(order.id).slice(-8)}`;
}

function fulfillmentDisplay(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'pending') return { label: 'Pending', tone: 'pending' };
  if (isOrderCancelled(s)) return { label: 'Canceled', tone: 'cancelled' };
  if (s === 'shipped') return { label: 'Shipped', tone: 'muted' };
  if (s === 'delivered') return { label: 'Fulfilled', tone: 'muted' };
  return { label: 'Fulfilled', tone: 'muted' };
}

function fulfillmentBadgeStyle(tone) {
  if (tone === 'pending') return { backgroundColor: '#fef9e7', color: '#6b5a2a' };
  if (tone === 'cancelled') return { backgroundColor: '#F5E6DF', color: '#8B5A42' };
  return { backgroundColor: '#f3f4f6', color: '#374151' };
}

function paymentDisplay(order) {
  const fs = (order.financialStatus || 'PAID').toUpperCase();
  if (fs === 'PAID') return 'Paid';
  if (fs === 'REFUNDED') return 'Refunded';
  if (fs === 'PENDING') return 'Pending';
  return fs.charAt(0) + fs.slice(1).toLowerCase();
}

function itemSummary(order) {
  const items = order.items || [];
  if (!items.length) return '\u2014';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} +${items.length - 1}`;
}

function matchesFilter(order, filterId) {
  const s = (order.status || 'pending').toLowerCase();
  if (filterId === 'all') return true;
  if (filterId === 'pending') return s === 'pending';
  if (filterId === 'fulfilled') return s === 'shipped' || s === 'delivered';
  if (filterId === 'cancelled') return isOrderCancelled(s);
  return true;
}

function orderHasDigital(order, products) {
  if (order.hasDigitalItems) return true;
  if (!products?.length) return false;
  const byPrice = new Map();
  const byId = new Map();
  products.forEach((p) => {
    byId.set(p.id, p);
    if (p.stripePriceId) byPrice.set(p.stripePriceId, p);
  });
  return (order.items || []).some((item) => {
    const p = (item.priceId && byPrice.get(item.priceId)) || (item.productId && byId.get(item.productId));
    return p?.category === 'digital';
  });
}

const SOURCES = [
  { value: 'in-person', label: 'In-Person' },
  { value: 'phone', label: 'Phone' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'etsy', label: 'Etsy (manual)' },
  { value: 'tiktok', label: 'TikTok (manual)' },
  { value: 'other', label: 'Other' },
];

const EMPTY_ITEM = { productId: '', name: '', price: '', quantity: 1 };

function ManualOrderModal({ open, theme, onClose, onCreated }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [source, setSource] = useState('in-person');
  const [notes, setNotes] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAllShopProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const setItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'productId') {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[index].name = product.name;
          next[index].price = product.price ?? '';
        }
      }
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.quantity, 10) || 0;
    return sum + price * qty;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const createOrder = httpsCallable(functions, 'createManualOrder');
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity, 10) || 1,
        })),
        customerName,
        customerEmail,
        customerPhone,
        shippingName: customerName,
        shippingAddress: address.line1 ? address : null,
        source,
        notes,
        sendConfirmation: sendConfirmation && !!customerEmail,
      };
      const { data } = await createOrder(payload);
      toast('success', `Order created — $${(data.amountTotal / 100).toFixed(2)}`);
      onCreated();
      onClose();
    } catch (err) {
      toast('error', err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm';
  const inputStyle = { borderColor: theme.border, backgroundColor: theme.background, color: theme.text };
  const labelStyle = { color: theme.textLight };

  return (
    <AdminBottomSheet
      open={open}
      onClose={onClose}
      title="New Manual Order"
      theme={theme}
      wide
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: theme.textLight }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="admin-manual-order-form"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{
              background: submitting ? theme.secondary : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5"><CircleNotch size={14} className="animate-spin" /> Creating…</span>
            ) : (
              `Create Order — $${total.toFixed(2)}`
            )}
          </button>
        </>
      )}
    >
        <form id="admin-manual-order-form" onSubmit={handleSubmit} className="px-4 sm:px-5 space-y-5 pb-2">
          {/* Source */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Order Source</label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSource(s.value)}
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: source === s.value ? theme.primary : `${theme.text}08`,
                    color: source === s.value ? '#fff' : theme.textLight,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Items</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    {loadingProducts ? (
                      <div className={inputClass} style={inputStyle}>Loading products…</div>
                    ) : (
                      <select
                        value={item.productId}
                        onChange={(e) => setItem(i, 'productId', e.target.value)}
                        required
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.stock != null ? `(${p.stock} left)` : ''} — ${Number(p.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => setItem(i, 'quantity', e.target.value)}
                    placeholder="Qty"
                    required
                    className="w-16 px-2 py-2 rounded-lg border text-sm text-center"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => setItem(i, 'price', e.target.value)}
                    placeholder="Price"
                    required
                    className="w-24 px-2 py-2 rounded-lg border text-sm"
                    style={inputStyle}
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 rounded-lg hover:bg-red-50">
                      <Trash size={14} style={{ color: '#ef4444' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 flex items-center gap-1 text-xs font-semibold"
              style={{ color: theme.primary }}
            >
              <Plus size={12} /> Add item
            </button>
            <p className="mt-2 text-sm font-bold text-right" style={{ color: theme.text }}>
              Total: ${total.toFixed(2)}
            </p>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold" style={labelStyle}>Customer</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name *"
              required
              className={inputClass}
              style={inputStyle}
            />
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email (optional)"
              className={inputClass}
              style={inputStyle}
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (optional)"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Shipping address */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold" style={labelStyle}>Shipping Address (optional)</label>
            <input type="text" value={address.line1} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} placeholder="Street address" className={inputClass} style={inputStyle} />
            <input type="text" value={address.line2} onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))} placeholder="Apt, suite, etc." className={inputClass} style={inputStyle} />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City" className={inputClass} style={inputStyle} />
              <input type="text" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State" className={inputClass} style={inputStyle} />
              <input type="text" value={address.postal_code} onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))} placeholder="ZIP" className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>Internal Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gift message, special instructions, etc."
              rows={2}
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </div>

          {/* Send confirmation */}
          {customerEmail && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendConfirmation}
                onChange={(e) => setSendConfirmation(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: theme.text }}>
                <PaperPlaneTilt size={12} className="inline mr-1" />
                Send order confirmation email to {customerEmail}
              </span>
            </label>
          )}

        </form>
    </AdminBottomSheet>
  );
}

function BulkLabelModal({ open, theme, orders, onClose, onConfirm }) {
  const [carrier, setCarrier] = useState('');
  const carriers = ['Any (cheapest)', 'USPS', 'UPS', 'FedEx'];

  return (
    <AdminBottomSheet
      open={open}
      onClose={onClose}
      title="Buy Labels in Bulk"
      theme={theme}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-black/5"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(carrier)}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            Buy {orders.length} label{orders.length !== 1 ? 's' : ''}
          </button>
        </>
      )}
    >
        <div className="px-4 sm:px-5 space-y-4 pb-2">
          <p className="text-sm" style={{ color: theme.textLight }}>
            Auto-buy the cheapest rate for <strong style={{ color: theme.text }}>{orders.length} pending order{orders.length !== 1 ? 's' : ''}</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textLight }}>Carrier preference</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
            >
              {carriers.map((c) => (
                <option key={c} value={c === 'Any (cheapest)' ? '' : c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="rounded-lg p-3 text-xs space-y-0.5" style={{ backgroundColor: `${theme.text}06`, color: theme.textLight }}>
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="truncate">
                {o.squarespaceOrderNumber ? `#${o.squarespaceOrderNumber}` : o.id.slice(-8).toUpperCase()} — {o.shippingName || o.customerName || 'Guest'}
              </div>
            ))}
            {orders.length > 8 && <div>…and {orders.length - 8} more</div>}
          </div>
          <p className="text-xs" style={{ color: theme.textLight }}>
            Addresses will be used as-is. Labels are purchased immediately and cannot be undone.
          </p>
        </div>
    </AdminBottomSheet>
  );
}

function OrdersMoreMenu({
  theme,
  importing,
  onApiImport,
  viewMode,
  pendingCount,
  onToggleViewMode,
  forceReimport,
  onForceReimportChange,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const menuBtn = (label, onClick, { disabled = false } = {}) => (
    <button
      key={label}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setOpen(false);
        onClick();
      }}
      className="w-full text-left px-3 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5"
      style={{ color: theme.text }}
    >
      {label}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full transition-colors hover:bg-black/5"
        aria-label="More order actions"
        aria-expanded={open}
        style={{ color: theme.textLight }}
      >
        <DotsThree size={22} weight="bold" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[220px] rounded-lg border py-1 shadow-lg"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          {menuBtn(importing ? 'API importing…' : 'Squarespace API import', onApiImport, { disabled: importing })}
          {menuBtn(
            viewMode === 'queue' ? 'All orders' : `Queue (${pendingCount} pending)`,
            onToggleViewMode
          )}
          <label
            className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-black/5"
            style={{ color: theme.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={forceReimport}
              onChange={(e) => onForceReimportChange(e.target.checked)}
            />
            Overwrite on re-import
          </label>
        </div>
      )}
    </div>
  );
}

function OrdersPagination({ theme, page, totalPages, totalCount, pageSize, onPageChange }) {
  if (totalCount <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t text-sm"
      style={{ borderColor: theme.border, color: theme.textLight }}
    >
      <span>
        Showing {start}–{end} of {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded border text-xs font-medium transition-colors disabled:opacity-40 hover:bg-black/[0.03]"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          Previous
        </button>
        <span className="text-xs tabular-nums px-1">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded border text-xs font-medium transition-colors disabled:opacity-40 hover:bg-black/[0.03]"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminShopOrders() {
  const { theme } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [ordersPage, setOrdersPage] = useState(1);
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [skipAppSubscriptions, setSkipAppSubscriptions] = useState(true);
  const [forceReimport, setForceReimport] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [shopProducts, setShopProducts] = useState([]);
  const [resendingDownload, setResendingDownload] = useState(null);
  // Bulk selection
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkLabeling, setBulkLabeling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total, results }
  const [showBulkLabelModal, setShowBulkLabelModal] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [savingNoteOrderId, setSavingNoteOrderId] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    setOrderActionLoading(false);
  }, [selectedOrder?.id]);

  useEffect(() => {
    fetchAllShopProducts().then(setShopProducts).catch(() => {});
  }, []);

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCsvImporting(true);
    try {
      const csvContent = await file.text();
      const importCsv = httpsCallable(functions, 'importOrdersFromCsv');
      const { data } = await importCsv({
        csvContent,
        overwrite: forceReimport,
        includeDigital: false,
        includeSubscriptions: false,
      });
      await loadOrders();
      const reasons = Object.entries(data.skipReasons || {})
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(', ');
      toast('success', `CSV import done: ${data.imported} orders imported (${data.totalOrders} in file)${reasons ? ` — skipped: ${reasons}` : ''}`);
    } catch (err) {
      console.error('CSV import error:', err);
      const msg = err.details || err.message || 'CSV import failed';
      toast('error', typeof msg === 'string' ? msg : 'CSV import failed — try deploying importOrdersFromCsv');
    } finally {
      setCsvImporting(false);
    }
  };

  const runSquarespaceImport = async (reset = false) => {
    setImporting(true);
    setImportProgress({ imported: 0, skipped: 0, errors: 0, batches: 0 });
    try {
      if (reset) {
        const resetFn = httpsCallable(functions, 'resetSquarespaceImport');
        await resetFn();
      }
      const importFn = httpsCallable(functions, 'importSquarespacePhysicalOrders');
      let done = false;
      let totals = { imported: 0, skipped: 0, errors: 0, batches: 0, skipReasons: {} };

      while (!done) {
        const { data } = await importFn({
          maxOrders: 50,
          skipSubscriptionOnly: skipAppSubscriptions,
          forceReimport,
        });
        totals.imported += data.imported || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;
        totals.batches += 1;
        if (data.skipReasons) {
          Object.entries(data.skipReasons).forEach(([k, v]) => {
            totals.skipReasons[k] = (totals.skipReasons[k] || 0) + v;
          });
        }
        setImportProgress({ ...totals, message: data.message });
        if (data.imported > 0) await loadOrders();
        done = data.done === true;
        if (!done && totals.batches > 500) {
          toast('info', 'Import paused after 500 batches — run again to continue');
          break;
        }
      }

      await loadOrders();
      const reasonText = Object.entries(totals.skipReasons)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(', ');
      toast('success', `Import done: ${totals.imported} imported, ${totals.skipped} skipped${reasonText ? ` (${reasonText})` : ''}`);
    } catch (err) {
      console.error('Squarespace import error:', err);
      toast('error', err.message || 'Import failed — check SQUARESPACE_API_KEY is set');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

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

  const patchOrderInState = (orderId, patch) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, ...patch } : prev));
  };

  const refreshOrderInState = async (orderId) => {
    const snap = await getDoc(doc(db, 'physicalOrders', orderId));
    if (!snap.exists()) return null;
    const fresh = { id: snap.id, ...snap.data() };
    setOrders((prev) => prev.map((o) => (o.id === orderId ? fresh : o)));
    setSelectedOrder((prev) => (prev?.id === orderId ? fresh : prev));
    return fresh;
  };

  const handleLabelPurchased = useCallback(async (orderId, data) => {
    const patch = {
      status: 'shipped',
      trackingNumber: data.trackingNumber,
      labelUrl: data.labelUrl,
      labelCarrier: data.carrier,
      labelCost: data.labelCost ?? null,
      shippingName: data.shippingName,
      shippingAddress: data.shippingAddress,
      ...(data.easypostTrackerId ? {
        easypostTrackerId: data.easypostTrackerId,
        easypostRegisteredAt: Timestamp.now(),
      } : {}),
    };
    patchOrderInState(orderId, patch);
    try {
      const activity = await logOrderActivity(orderId, {
        type: 'label_created',
        title: 'Shipping label purchased (EasyPost)',
        detail: [data.carrier, data.trackingNumber, data.labelCost != null ? `$${Number(data.labelCost).toFixed(2)}` : null]
          .filter(Boolean)
          .join(' · '),
        actor: 'admin',
        actorEmail: auth.currentUser?.email || null,
      });
      patchOrderActivityInState(setOrders, setSelectedOrder, orderId, activity);
    } catch (err) {
      console.warn('Failed to log label activity:', err);
    }
    toast('success', data.confirmationMessage || formatLabelPurchaseConfirmation(data));
  }, []);

  const handleEasyPostRegistered = useCallback((orderId, patch) => {
    patchOrderInState(orderId, patch);
    toast('success', patch.easypostTrackerId ? 'EasyPost tracking enabled' : 'EasyPost updated');
  }, []);

  const handleDetailStatusChange = async (orderId, newStatus) => {
    try {
      const patch = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'delivered') patch.fulfilledAt = serverTimestamp();
      if (newStatus === 'pending') patch.fulfilledAt = null;
      await updateDoc(doc(db, 'physicalOrders', orderId), patch);
      patchOrderInState(orderId, {
        status: newStatus,
        ...(newStatus === 'pending' ? { fulfilledAt: null } : {}),
      });
      const activity = await logOrderActivity(orderId, {
        type: 'status_changed',
        title: newStatus === 'delivered' ? 'Marked as fulfilled' : 'Marked as unfulfilled',
        detail: null,
        actor: 'admin',
        actorEmail: auth.currentUser?.email || null,
      });
      patchOrderActivityInState(setOrders, setSelectedOrder, orderId, activity);
      toast('success', newStatus === 'delivered' ? 'Order marked as fulfilled' : 'Order marked as unfulfilled');
    } catch (err) {
      toast('error', 'Failed to update status');
    }
  };

  const runOrderAdminAction = async (fnName, orderId) => {
    setOrderActionLoading(true);
    try {
      const fn = httpsCallable(functions, fnName, { timeout: 60000 });
      const { data } = await fn({ orderId });
      return { ok: true, data };
    } catch (err) {
      console.error(`${fnName} failed:`, err);
      const msg = (err.message || 'Action failed').replace(/^FirebaseError:\s*/i, '');
      return { ok: false, message: msg };
    } finally {
      setOrderActionLoading(false);
    }
  };

  const handleCancelOrder = async (order) => {
    const result = await runOrderAdminAction('cancelShopOrder', order.id);
    if (result.ok) {
      await refreshOrderInState(order.id);
      toast('success', result.data?.stripeDetail || 'Order cancelled');
      return;
    }
    if (result.message?.toLowerCase().includes('already cancelled')) {
      await refreshOrderInState(order.id);
      toast('info', 'Order is already cancelled');
      return;
    }
    toast('error', result.message || 'Failed to cancel order');
  };

  const handleRefundOrder = async (order) => {
    if (!order.paymentIntentId) {
      toast('warning', 'This order has no Stripe payment to refund');
      return;
    }
    const result = await runOrderAdminAction('refundShopOrder', order.id);
    if (result.ok) {
      await refreshOrderInState(order.id);
      toast('success', 'Order refunded via Stripe');
      return;
    }
    toast('error', result.message || 'Failed to refund order');
  };

  const handleDeleteOrder = async (order) => {
    setDeletingOrderId(order.id);
    try {
      const fn = httpsCallable(functions, 'deleteShopOrder');
      await fn({ orderId: order.id });
      toast('success', 'Order deleted');
      setSelectedOrder(null);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err) {
      toast('error', err.message || 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleSyncFromStripe = async (order) => {
    setOrderActionLoading(true);
    try {
      const fn = httpsCallable(functions, 'syncShopOrderFromStripe', { timeout: 60000 });
      await fn({ orderId: order.id });
      await refreshOrderInState(order.id);
      toast('success', 'Customer & shipping details synced from Stripe');
    } catch (err) {
      toast('error', err.message || 'Failed to sync from Stripe');
    } finally {
      setOrderActionLoading(false);
    }
  };

  const handleAddOrderNote = async (orderId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSavingNoteOrderId(orderId);
    try {
      const note = {
        id: crypto.randomUUID(),
        text: trimmed,
        createdAt: Timestamp.now(),
        authorEmail: auth.currentUser?.email || 'admin',
      };
      await updateDoc(doc(db, 'physicalOrders', orderId), {
        adminNotes: arrayUnion(note),
        updatedAt: serverTimestamp(),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, adminNotes: [...(o.adminNotes || []), note] } : o))
      );
      setSelectedOrder((prev) =>
        (prev?.id === orderId ? { ...prev, adminNotes: [...(prev.adminNotes || []), note] } : prev)
      );
      toast('success', 'Note added');
    } catch (err) {
      toast('error', err.message || 'Failed to save note');
    } finally {
      setSavingNoteOrderId(null);
    }
  };

  // ── Bulk selection helpers ────────────────────────────────────────────────
  const toggleCheck = (e, id) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  const clearChecked = () => setCheckedIds(new Set());

  // ── Bulk print packing slips ──────────────────────────────────────────────
  const handleBulkPrintSlips = async () => {
    if (!checkedOrders.length) return;
    toast('info', `Generating ${checkedOrders.length} packing slip${checkedOrders.length > 1 ? 's' : ''}…`);
    try {
      const printSlip = httpsCallable(functions, 'printPackingSlip');
      const results = await Promise.all(checkedOrders.map((o) => printSlip({ orderId: o.id })));
      const extractSlip = (html) => {
        const slipMatch = html.match(/<div class="slip">[\s\S]*<\/footer>\s*<\/div>/i);
        if (slipMatch) return slipMatch[0];
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        return bodyMatch ? bodyMatch[1].replace(/<div class="no-print"[\s\S]*/i, '').trim() : html;
      };
      const slips = results.map((r) => extractSlip(r.data.html)).join('\n');
      const combined = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Packing Slips</title>
        <style>
          @page { size: 4in 6in; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
          .slip { width: 4in; height: 6in; padding: 0.12in 0.14in 0.1in; display: flex; flex-direction: column; page-break-after: always; }
          .slip:last-child { page-break-after: auto; }
          .logo-wrap { text-align: center; margin-bottom: 4px; }
          .logo { width: 0.78in; height: 0.78in; object-fit: contain; }
          .title-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 4px; }
          .doc-date { font-size: 9px; font-weight: 400; }
          .rule { border: none; border-top: 1px solid #111; margin-bottom: 5px; }
          .cols-3 { display: grid; grid-template-columns: 1fr 1fr 0.85fr; gap: 4px; margin-bottom: 6px; }
          .col-head { font-size: 8px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
          .addr-line { font-size: 8.5px; line-height: 1.35; }
          .addr-line:first-of-type { font-weight: 700; }
          .meta-row { display: flex; justify-content: space-between; font-size: 8px; line-height: 1.35; }
          .meta-val { font-weight: 700; text-align: right; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
          .items-table th { font-size: 8px; text-transform: uppercase; border-bottom: 1px solid #111; text-align: left; }
          .items-table th:last-child { text-align: right; width: 26px; }
          .items-table td { font-size: 9px; padding: 4px 0; border-bottom: 1px dotted #bbb; vertical-align: top; }
          .item-title { font-weight: 700; font-size: 9px; }
          .item-sub { font-size: 7.5px; color: #555; }
          .item-qty { text-align: right; font-weight: 700; font-size: 9px; }
          .notes-label { font-size: 8px; font-weight: 700; }
          .notes-body { font-size: 8.5px; line-height: 1.35; }
          .footer { margin-top: auto; text-align: center; padding-top: 4px; }
          .footer-thanks { font-size: 13px; font-weight: 800; }
          .footer-brand { font-size: 9px; font-weight: 700; }
          .footer-line { font-size: 8px; color: #444; }
          .footer-url { font-size: 8px; color: #666; margin-top: 2px; }
        </style>
      </head><body>${slips}</body></html>`;
      const win = window.open('', '_blank');
      win.document.write(combined);
      win.document.close();
      win.print();
    } catch (err) {
      console.error('Bulk print error:', err);
      toast('error', err.message || 'Failed to print slips');
    }
  };

  // ── Bulk buy labels ───────────────────────────────────────────────────────
  const handleBulkBuyLabels = async (carrierPreference) => {
    if (!checkedPending.length) return;
    setShowBulkLabelModal(false);
    setBulkLabeling(true);
    setBulkProgress({ done: 0, total: checkedPending.length, results: [] });
    try {
      const bulkFn = httpsCallable(functions, 'bulkCreateShippingLabels', { timeout: 540000 });
      const { data } = await bulkFn({
        orderIds: checkedPending.map((o) => o.id),
        carrierPreference: carrierPreference || '',
      });
      // Update local orders state
      setOrders((prev) => prev.map((o) => {
        const r = data.results.find((x) => x.orderId === o.id && x.success);
        return r ? {
          ...o,
          status: 'shipped',
          trackingNumber: r.trackingNumber,
          labelUrl: r.labelUrl,
          labelCarrier: r.carrier,
          labelCost: r.labelCost ?? null,
        } : o;
      }));
      const succeededResults = data.results.filter((r) => r.success);
      if (succeededResults.length === 1) {
        const r = succeededResults[0];
        try {
          await fulfillShippingLabelDownload({
            labelUrl: r.labelUrl,
            labelPdfUrl: r.labelPdfUrl,
            labelPdfBase64: r.labelPdfBase64,
            labelContentType: r.labelContentType,
            packingSlipHtml: r.packingSlipHtml,
            trackingNumber: r.trackingNumber,
          });
        } catch (downloadErr) {
          console.warn('Bulk label download failed for', r.orderId, downloadErr);
        }
      } else {
        for (const r of succeededResults) {
          try {
            await downloadLabelPdf(r.labelPdfUrl || r.labelUrl, r.trackingNumber, {
              labelPdfBase64: r.labelPdfBase64,
              labelContentType: r.labelContentType,
            });
          } catch (downloadErr) {
            console.warn('Bulk label PDF download failed for', r.orderId, downloadErr);
          }
        }
      }
      setBulkProgress({ done: data.succeeded, total: checkedPending.length, results: data.results });
      toast(
        data.failed === 0 ? 'success' : 'warning',
        data.failed === 0 && succeededResults.length === 1 && succeededResults[0].message
          ? succeededResults[0].message
          : `${data.succeeded} label${data.succeeded !== 1 ? 's' : ''} purchased via EasyPost${data.failed > 0 ? `, ${data.failed} failed` : ''}`
      );
      if (data.failed === 0) setCheckedIds(new Set());
    } catch (err) {
      console.error('Bulk labels error:', err);
      toast('error', err.message || 'Bulk label purchase failed');
    } finally {
      setBulkLabeling(false);
    }
  };

  // ── Bulk mark status ──────────────────────────────────────────────────────
  const handleBulkMarkStatus = async (newStatus) => {
    if (!checkedOrders.length) return;
    try {
      await Promise.all(checkedOrders.map((o) =>
        updateDoc(doc(db, 'physicalOrders', o.id), { status: newStatus, updatedAt: serverTimestamp() })
      ));
      setOrders((prev) => prev.map((o) => checkedIds.has(o.id) ? { ...o, status: newStatus } : o));
      toast('success', `${checkedOrders.length} order${checkedOrders.length > 1 ? 's' : ''} marked as ${newStatus}`);
      setCheckedIds(new Set());
    } catch (err) {
      toast('error', 'Failed to update status');
    }
  };

  // ── Bulk print labels (open all label URLs) ───────────────────────────────
  const handleBulkOpenLabels = () => {
    const withLabels = checkedOrders.filter((o) => o.labelUrl);
    if (!withLabels.length) { toast('warning', 'No purchased labels on selected orders'); return; }
    // Combine all label images into one print window
    const imgs = withLabels.map((o) =>
      `<div style="page-break-after:always;text-align:center;">
        <img src="${o.labelUrl}" style="max-width:100%;max-height:6in;" />
      </div>`
    ).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>@page{size:4in 6in;margin:0}body{margin:0}img{display:block;}</style>
    </head><body>${imgs}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleResendDownload = async (order) => {
    if (!order.customerEmail) {
      toast('warning', 'No customer email on this order');
      return;
    }
    if (!window.confirm(`Resend PDF download link(s) to ${order.customerEmail}?`)) return;

    setResendingDownload(order.id);
    try {
      const resendFn = httpsCallable(functions, 'adminResendDigitalDownload');
      const { data } = await resendFn({ orderId: order.id });
      toast('success', `Download email sent to ${data.sentTo} (${data.linkCount} link${data.linkCount !== 1 ? 's' : ''})`);
    } catch (err) {
      console.error('Resend download error:', err);
      toast('error', err.message || 'Failed to resend download email');
    } finally {
      setResendingDownload(null);
    }
  };

  const handlePrintSlip = useCallback(async (orderId) => {
    try {
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

  const filtered = (() => {
    let list = viewMode === 'queue'
      ? [...pendingOrders].sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return aTime - bTime;
        })
      : orders.filter((o) => matchesFilter(o, filterTab));

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const hay = [
          orderDisplayId(o),
          o.customerName,
          o.customerEmail,
          o.trackingNumber,
          itemSummary(o),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  })();

  useEffect(() => {
    setOrdersPage(1);
  }, [filterTab, searchQuery, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  const currentPage = Math.min(ordersPage, totalPages);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * ORDERS_PAGE_SIZE,
    currentPage * ORDERS_PAGE_SIZE
  );

  const checkedOrders = filtered.filter((o) => checkedIds.has(o.id));
  const checkedPending = checkedOrders.filter((o) => o.status === 'pending');

  const tabCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    fulfilled: orders.filter((o) => ['shipped', 'delivered'].includes(o.status)).length,
    cancelled: orders.filter((o) => isOrderCancelled(o.status)).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <style>{`
        @keyframes orderCheckPop {
          0% { transform: scale(0.35); opacity: 0; }
          70% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .order-check-pop { animation: orderCheckPop 0.22s ease-out; }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight" style={{ color: theme.text }}>Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManualOrder(true)}
            aria-label="New order"
            title="New order"
            className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-all hover:opacity-90 active:scale-95 shadow-md"
            style={{
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <Plus size={22} weight="bold" />
          </button>
          <label
            className={`px-4 py-2 text-sm rounded border cursor-pointer transition-colors hover:bg-black/[0.03] ${csvImporting ? 'opacity-50 pointer-events-none' : ''}`}
            style={{
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.cardBackground,
              boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {csvImporting ? 'Importing…' : 'Import CSV'}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} disabled={csvImporting} />
          </label>
          <OrdersMoreMenu
            theme={theme}
            importing={importing}
            onApiImport={() => runSquarespaceImport(false)}
            viewMode={viewMode}
            pendingCount={pendingOrders.length}
            onToggleViewMode={() => setViewMode(viewMode === 'queue' ? 'all' : 'queue')}
            forceReimport={forceReimport}
            onForceReimportChange={setForceReimport}
          />
        </div>
      </div>

      {importProgress && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: theme.border, backgroundColor: `${theme.primary}08` }}>
          <p style={{ color: theme.text }}>
            Importing Squarespace orders… batch {importProgress.batches} — {importProgress.imported} imported, {importProgress.skipped} skipped
            {importProgress.errors > 0 && `, ${importProgress.errors} errors`}
          </p>
          {importProgress.skipReasons && Object.keys(importProgress.skipReasons).length > 0 && (
            <p className="text-xs" style={{ color: theme.textLight }}>
              Skipped: {Object.entries(importProgress.skipReasons).map(([k, v]) => `${k.replace(/_/g, ' ')} (${v})`).join(' · ')}
            </p>
          )}
          {importProgress.message && <p className="text-xs mt-1" style={{ color: theme.textLight }}>{importProgress.message}</p>}
        </div>
      )}

      {viewMode === 'all' && (
        <div className="border-b flex flex-wrap items-center gap-6" style={{ borderColor: theme.border }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className="pb-3 text-sm border-b-2 -mb-px transition-colors"
              style={{
                color: filterTab === tab.id ? theme.text : theme.textLight,
                borderColor: filterTab === tab.id ? theme.text : 'transparent',
                fontWeight: filterTab === tab.id ? 500 : 400,
              }}
            >
              {tab.label}
              <span className="ml-1 opacity-60">({tabCounts[tab.id] ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {viewMode === 'all' && (
        <div className="relative max-w-xs">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textLight }} />
          <input
            type="search"
            placeholder="Search orders"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded border"
            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <CircleNotch size={24} className="animate-spin" style={{ color: theme.primary }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={32} className="mx-auto mb-3 opacity-20" style={{ color: theme.textLight }} />
          <p className="text-sm" style={{ color: theme.textLight }}>
            {viewMode === 'queue' ? 'No pending orders! All caught up.' : 'No orders found.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          {/* ── Bulk action bar ── */}
          {checkedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b text-sm" style={{ borderColor: theme.border, backgroundColor: `${theme.primary}08` }}>
              <span className="font-medium" style={{ color: theme.text }}>
                {checkedIds.size} selected
              </span>
              <div className="flex flex-wrap gap-2 ml-1">
                <button
                  type="button"
                  onClick={handleBulkPrintSlips}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors hover:bg-black/5"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  <Printer size={13} /> Print slips ({checkedIds.size})
                </button>
                {checkedOrders.some((o) => o.labelUrl) && (
                  <button
                    type="button"
                    onClick={handleBulkOpenLabels}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors hover:bg-black/5"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    <Printer size={13} /> Print labels ({checkedOrders.filter(o => o.labelUrl).length})
                  </button>
                )}
                {checkedPending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBulkLabelModal(true)}
                    disabled={bulkLabeling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {bulkLabeling ? <CircleNotch size={13} className="animate-spin" /> : <Truck size={13} />}
                    {bulkLabeling ? 'Buying labels…' : `Buy labels (${checkedPending.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleBulkMarkStatus('shipped')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors hover:bg-black/5"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Mark shipped
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkMarkStatus('delivered')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors hover:bg-black/5"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Mark fulfilled
                </button>
              </div>
              <button type="button" onClick={clearChecked} className="ml-auto p-1 rounded hover:bg-black/5" style={{ color: theme.textLight }}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* Bulk label progress results */}
          {bulkProgress && bulkProgress.results.length > 0 && (
            <div className="px-4 py-3 border-b text-xs space-y-1" style={{ borderColor: theme.border, backgroundColor: `${theme.text}04` }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: theme.text }}>
                  Label results: {bulkProgress.done}/{bulkProgress.total} purchased
                </span>
                <button type="button" onClick={() => setBulkProgress(null)} style={{ color: theme.textLight }}>
                  <X size={13} />
                </button>
              </div>
              {bulkProgress.results.filter(r => !r.success).map((r) => (
                <div key={r.orderId} style={{ color: '#ef4444' }}>
                  {r.orderId.slice(-8).toUpperCase()} — {r.error}
                </div>
              ))}
            </div>
          )}

          {/* Mobile card list */}
          <div className="block md:hidden divide-y" style={{ borderColor: theme.border }}>
            {paginatedOrders.map((order) => {
              const ff = fulfillmentDisplay(order.status);
              const pay = paymentDisplay(order);
              const summary = itemSummary(order);
              const totalFormatted = `$${((order.amountTotal || 0) / 100).toFixed(2)}`;
              const isChecked = checkedIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                  style={{ backgroundColor: isChecked ? `${theme.primary}0a` : undefined }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <OrderSelectCheckbox
                    checked={isChecked}
                    theme={theme}
                    className="mt-0.5"
                    onClick={(e) => toggleCheck(e, order.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: theme.text }}>{orderDisplayId(order)}</span>
                      <span className="text-sm font-medium tabular-nums" style={{ color: theme.text }}>{totalFormatted}</span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: theme.textLight }}>
                      {order.customerName || order.shippingName || 'Guest'} · {formatDateShort(order.createdAt)}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: theme.textLight }}>{summary}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className="inline-block px-2 py-0.5 text-xs rounded-full"
                        style={fulfillmentBadgeStyle(ff.tone)}
                      >
                        {ff.label}
                      </span>
                      <span className="text-xs" style={{ color: theme.textLight }}>{pay}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b text-left text-xs font-normal" style={{ borderColor: theme.border, color: theme.textLight }}>
                  <th className="py-3 pl-4 pr-1 w-8">
                    <OrderSelectCheckbox
                      checked={checkedIds.size > 0 && checkedIds.size === filtered.length}
                      theme={theme}
                      onClick={toggleAll}
                    />
                  </th>
                  <th className="py-3 pr-2 w-36">Order</th>
                  <th className="py-3 px-2 min-w-[140px]">Product</th>
                  <th className="py-3 px-2 min-w-[160px]">Name</th>
                  <th className="py-3 px-2 w-24 text-right">Total</th>
                  <th className="py-3 px-2 w-24">Payment</th>
                  <th className="py-3 pr-4 pl-2 w-28">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
          {paginatedOrders.map((order) => {
            const ff = fulfillmentDisplay(order.status);
            const pay = paymentDisplay(order);
            const summary = itemSummary(order);
            const totalFormatted = `$${((order.amountTotal || 0) / 100).toFixed(2)}`;
            const isSelected = selectedOrder?.id === order.id;

            const isChecked = checkedIds.has(order.id);
            return (
              <tr
                key={order.id}
                className="border-b cursor-pointer hover:bg-black/[0.02] transition-colors"
                style={{
                  borderColor: theme.border,
                  backgroundColor: isChecked ? `${theme.primary}0a` : isSelected ? `${theme.text}06` : undefined,
                }}
                onClick={() => setSelectedOrder(order)}
              >
                  <td className="py-4 pl-4 pr-1 align-top">
                    <OrderSelectCheckbox
                      checked={isChecked}
                      theme={theme}
                      onClick={(e) => toggleCheck(e, order.id)}
                    />
                  </td>
                  <td className="py-4 pr-2 align-top">
                    <div className="font-medium" style={{ color: theme.text }}>{orderDisplayId(order)}</div>
                    <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>{formatDateShort(order.createdAt)}</div>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <p className="text-sm leading-snug line-clamp-2" style={{ color: theme.text }} title={summary}>{summary}</p>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="font-medium truncate max-w-[200px]" style={{ color: theme.text }}>
                      {order.customerName || order.shippingName || 'Guest'}
                    </div>
                    <div className="text-xs truncate max-w-[200px] mt-0.5" style={{ color: theme.textLight }}>
                      {order.customerEmail || '\u2014'}
                    </div>
                  </td>
                  <td className="py-4 px-2 align-top text-right font-medium tabular-nums" style={{ color: theme.text }}>
                    {totalFormatted}
                  </td>
                  <td className="py-4 px-2 align-top" style={{ color: theme.text }}>{pay}</td>
                  <td className="py-4 pr-4 pl-2 align-top">
                    <span
                      className="inline-block px-2.5 py-0.5 text-xs rounded-full"
                      style={fulfillmentBadgeStyle(ff.tone)}
                    >
                      {ff.label}
                    </span>
                  </td>
                </tr>
            );
          })}
              </tbody>
            </table>
          </div>

          <OrdersPagination
            theme={theme}
            page={currentPage}
            totalPages={totalPages}
            totalCount={filtered.length}
            pageSize={ORDERS_PAGE_SIZE}
            onPageChange={setOrdersPage}
          />
        </div>
      )}

      {selectedOrder && (
        <AdminShopOrderDetail
          order={selectedOrder}
          shopProducts={shopProducts}
          theme={theme}
          onClose={() => {
            setOrderActionLoading(false);
            setSelectedOrder(null);
          }}
          onStatusChange={handleDetailStatusChange}
          onPrintSlip={handlePrintSlip}
          onCreateLabel={(o) => setShippingModalOrder(o)}
          onResendDownload={handleResendDownload}
          onCancelOrder={handleCancelOrder}
          onRefundOrder={handleRefundOrder}
          onDeleteOrder={handleDeleteOrder}
          onAddNote={(text) => handleAddOrderNote(selectedOrder.id, text)}
          onEasyPostRegistered={handleEasyPostRegistered}
          onSyncFromStripe={handleSyncFromStripe}
          resendingDownload={resendingDownload === selectedOrder.id}
          orderHasDigital={orderHasDigital}
          isDeleting={deletingOrderId === selectedOrder.id}
          isOrderActionLoading={orderActionLoading}
          isSavingNote={savingNoteOrderId === selectedOrder.id}
        />
      )}

      {shippingModalOrder && (
        <ShippingLabelModal
          order={shippingModalOrder}
          theme={theme}
          onClose={() => setShippingModalOrder(null)}
          onPurchased={handleLabelPurchased}
        />
      )}

      <ManualOrderModal
        open={showManualOrder}
        theme={theme}
        onClose={() => setShowManualOrder(false)}
        onCreated={loadOrders}
      />

      <BulkLabelModal
        open={showBulkLabelModal}
        theme={theme}
        orders={checkedPending}
        onClose={() => setShowBulkLabelModal(false)}
        onConfirm={(carrier) => handleBulkBuyLabels(carrier)}
      />
    </div>
  );
}
