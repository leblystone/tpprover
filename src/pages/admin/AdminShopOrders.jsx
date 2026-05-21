import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Loader, Package, CheckSquare, Square, Printer, Truck, X,
  Plus, Trash2, Send, Download, Search,
} from 'lucide-react';
import { fetchAllShopProducts } from '../../config/plannerProducts';
import ShippingLabelModal from '../../components/admin/ShippingLabelModal';
import AdminShopOrderDetail from '../../components/admin/AdminShopOrderDetail';

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

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
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
  const num = order.squarespaceOrderNumber || order.squarespaceOrderId;
  if (num) return `#${String(num).replace(/^#/, '')}`;
  return `#${String(order.id).slice(-8)}`;
}

function fulfillmentDisplay(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'pending') return { label: 'Pending', tone: 'pending' };
  if (s === 'cancelled') return { label: 'Canceled', tone: 'muted' };
  if (s === 'shipped') return { label: 'Shipped', tone: 'muted' };
  if (s === 'delivered') return { label: 'Fulfilled', tone: 'muted' };
  return { label: 'Fulfilled', tone: 'muted' };
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
  if (filterId === 'cancelled') return s === 'cancelled';
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

function ManualOrderModal({ theme, onClose, onCreated }) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="rounded-xl border w-full max-w-xl" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-base font-bold" style={{ color: theme.text }}>New Manual Order</h3>
          <button type="button" onClick={onClose} className="text-sm px-2 py-1 rounded hover:bg-black/5" style={{ color: theme.textLight }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
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
                      <Trash2 size={14} style={{ color: '#ef4444' }} />
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
                <Send size={12} className="inline mr-1" />
                Send order confirmation email to {customerEmail}
              </span>
            </label>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: theme.primary }}
            >
              {submitting ? <Loader size={14} className="animate-spin inline mr-1" /> : null}
              {submitting ? 'Creating…' : `Create Order — $${total.toFixed(2)}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: `${theme.text}08`, color: theme.textLight }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkLabelModal({ theme, orders, onClose, onConfirm }) {
  const [carrier, setCarrier] = useState('');
  const carriers = ['Any (cheapest)', 'USPS', 'UPS', 'FedEx'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" style={{ backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: theme.border }}>
          <h2 className="font-semibold text-base" style={{ color: theme.text }}>Buy Labels in Bulk</h2>
          <button type="button" onClick={onClose} style={{ color: theme.textLight }}><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: theme.border }}>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border" style={{ borderColor: theme.border, color: theme.text }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(carrier)}
            className="px-4 py-2 text-sm rounded font-medium text-white"
            style={{ backgroundColor: theme.primary }}
          >
            Buy {orders.length} label{orders.length !== 1 ? 's' : ''}
          </button>
        </div>
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
  const [showImportOptions, setShowImportOptions] = useState(false);
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

  useEffect(() => { loadOrders(); }, []);

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

  const handleLabelPurchased = useCallback((orderId, data) => {
    const patch = {
      status: 'shipped',
      trackingNumber: data.trackingNumber,
      labelUrl: data.labelUrl,
      labelCarrier: data.carrier,
      shippingName: data.shippingName,
      shippingAddress: data.shippingAddress,
    };
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, ...patch } : prev));
    toast('success', `Label purchased! Tracking: ${data.trackingNumber}`);
  }, []);

  const handleDetailStatusChange = async (orderId, newStatus) => {
    await handleStatusChange(orderId, newStatus);
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));
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
      const fn = getFunctions();
      const printSlip = httpsCallable(fn, 'printPackingSlip');
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
      const fn = getFunctions();
      const bulkFn = httpsCallable(fn, 'bulkCreateShippingLabels', { timeout: 540000 });
      const { data } = await bulkFn({
        orderIds: checkedPending.map((o) => o.id),
        carrierPreference: carrierPreference || '',
      });
      // Update local orders state
      setOrders((prev) => prev.map((o) => {
        const r = data.results.find((x) => x.orderId === o.id && x.success);
        return r ? { ...o, status: 'shipped', trackingNumber: r.trackingNumber, labelUrl: r.labelUrl, labelCarrier: r.carrier } : o;
      }));
      setBulkProgress({ done: data.succeeded, total: checkedPending.length, results: data.results });
      toast(
        data.failed === 0 ? 'success' : 'warning',
        `${data.succeeded} label${data.succeeded !== 1 ? 's' : ''} purchased${data.failed > 0 ? `, ${data.failed} failed` : ''}`
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
      const fn = httpsCallable(getFunctions(), 'adminResendDigitalDownload');
      const { data } = await fn({ orderId: order.id });
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

  const checkedOrders = filtered.filter((o) => checkedIds.has(o.id));
  const checkedPending = checkedOrders.filter((o) => o.status === 'pending');

  const tabCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    fulfilled: orders.filter((o) => ['shipped', 'delivered'].includes(o.status)).length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight" style={{ color: theme.text }}>Orders</h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            {orders.length} orders · Showing {filtered.length}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowManualOrder(true)}
            className="px-4 py-2 text-sm rounded border transition-colors hover:bg-black/[0.03]"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            New order
          </button>
          <label
            className={`px-4 py-2 text-sm rounded border cursor-pointer transition-colors hover:bg-black/[0.03] ${csvImporting ? 'opacity-50 pointer-events-none' : ''}`}
            style={{ borderColor: theme.border, color: theme.text }}
          >
            {csvImporting ? 'Importing…' : 'Import CSV'}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} disabled={csvImporting} />
          </label>
          <button
            type="button"
            onClick={() => setShowImportOptions((v) => !v)}
            className="px-3 py-2 text-sm"
            style={{ color: theme.textLight }}
          >
            {showImportOptions ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {showImportOptions && (
        <div className="text-xs flex flex-wrap gap-4 pb-1" style={{ color: theme.textLight }}>
          <button type="button" onClick={() => runSquarespaceImport(false)} disabled={importing} className="underline disabled:opacity-50">
            {importing ? 'API importing…' : 'API import'}
          </button>
          <button type="button" onClick={() => setViewMode(viewMode === 'queue' ? 'all' : 'queue')} className="underline">
            {viewMode === 'queue' ? 'All orders' : `Queue (${pendingOrders.length} pending)`}
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={forceReimport} onChange={(e) => setForceReimport(e.target.checked)} />
            Overwrite on re-import
          </label>
        </div>
      )}

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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textLight }} />
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
                    {bulkLabeling ? <Loader size={13} className="animate-spin" /> : <Truck size={13} />}
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
            {filtered.map((order) => {
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
                  <button type="button" className="mt-0.5 flex-shrink-0" onClick={(e) => toggleCheck(e, order.id)}>
                    {isChecked
                      ? <CheckSquare size={16} style={{ color: theme.primary }} />
                      : <Square size={16} style={{ color: theme.textLight }} />}
                  </button>
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
                        style={ff.tone === 'pending' ? { backgroundColor: '#fef9e7', color: '#6b5a2a' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
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
                    <button type="button" onClick={toggleAll} className="flex items-center" style={{ color: theme.textLight }}>
                      {checkedIds.size > 0 && checkedIds.size === filtered.length
                        ? <CheckSquare size={15} style={{ color: theme.primary }} />
                        : <Square size={15} />}
                    </button>
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
          {filtered.map((order) => {
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
                  <td className="py-4 pl-4 pr-1 align-top" onClick={(e) => toggleCheck(e, order.id)}>
                    {isChecked
                      ? <CheckSquare size={15} style={{ color: theme.primary }} />
                      : <Square size={15} style={{ color: theme.textLight }} />}
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
                      style={
                        ff.tone === 'pending'
                          ? { backgroundColor: '#fef9e7', color: '#6b5a2a' }
                          : { backgroundColor: '#f3f4f6', color: '#374151' }
                      }
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
        </div>
      )}

      {selectedOrder && (
        <AdminShopOrderDetail
          order={selectedOrder}
          shopProducts={shopProducts}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleDetailStatusChange}
          onPrintSlip={handlePrintSlip}
          onCreateLabel={(o) => {
            setShippingModalOrder(o);
          }}
          onResendDownload={handleResendDownload}
          resendingDownload={resendingDownload === selectedOrder.id}
          orderHasDigital={orderHasDigital}
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

      {showManualOrder && (
        <ManualOrderModal
          theme={theme}
          onClose={() => setShowManualOrder(false)}
          onCreated={loadOrders}
        />
      )}

      {/* Bulk Label Purchase Modal */}
      {showBulkLabelModal && (
        <BulkLabelModal
          theme={theme}
          orders={checkedPending}
          onClose={() => setShowBulkLabelModal(false)}
          onConfirm={(carrier) => handleBulkBuyLabels(carrier)}
        />
      )}
    </div>
  );
}
