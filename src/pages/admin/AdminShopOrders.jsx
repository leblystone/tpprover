import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Loader, Package, ChevronDown, ChevronUp, Truck, CheckCircle, Clock,
  MapPin, Tag, Printer, ExternalLink, Gift, Phone, ListFilter, Layers,
  Plus, Trash2, Send, Download, RotateCcw,
} from 'lucide-react';
import { fetchAllShopProducts } from '../../config/plannerProducts';

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
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [skipAppSubscriptions, setSkipAppSubscriptions] = useState(true);
  const [forceReimport, setForceReimport] = useState(false);
  const [shopProducts, setShopProducts] = useState([]);
  const [resendingDownload, setResendingDownload] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    fetchAllShopProducts().then(setShopProducts).catch(() => {});
  }, []);

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
            onClick={() => setShowManualOrder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: theme.primary }}
          >
            <Plus size={14} />
            New Order
          </button>
          <button
            type="button"
            onClick={() => runSquarespaceImport(false)}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: `${theme.text}08`, color: theme.text, border: `1px solid ${theme.border}` }}
            title="Import all Squarespace physical orders into this list"
          >
            {importing ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            {importing ? 'Importing…' : 'Import Squarespace'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset import progress and re-import from scratch? Existing imported orders are skipped by ID.')) {
                runSquarespaceImport(true);
              }
            }}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ color: theme.textLight, backgroundColor: `${theme.text}05` }}
            title="Reset cursor and run full import again"
          >
            <RotateCcw size={14} />
          </button>
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

      <div className="flex flex-col gap-2 text-xs max-w-2xl" style={{ color: theme.textLight }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipAppSubscriptions}
            onChange={(e) => setSkipAppSubscriptions(e.target.checked)}
            disabled={importing}
            className="rounded"
          />
          Skip app-only orders (monthly/annual/lifetime SKUs) — leave checked; you only have ~3 of these
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={forceReimport}
            onChange={(e) => setForceReimport(e.target.checked)}
            disabled={importing}
            className="rounded"
          />
          Overwrite already-imported Squarespace orders (use after a bad import)
        </label>
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
            const isResendingDownload = resendingDownload === order.id;
            const showResendDownload = orderHasDigital(order, shopProducts);

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
                          {(order.source === 'squarespace' ? 'SQSP' : order.source).toUpperCase()}
                        </span>
                      )}
                      {order.isImported && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          IMPORTED
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
                        {order.trackingUrl && (
                          <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs font-semibold" style={{ color: theme.primary }}>
                            <ExternalLink size={12} />Track package
                          </a>
                        )}
                        {order.labelUrl && (
                          <a href={order.labelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs font-semibold" style={{ color: theme.primary }}>
                            <ExternalLink size={12} />Download Label
                          </a>
                        )}
                      </div>
                    )}
                    {order.squarespaceOrderNumber && (
                      <p className="text-xs" style={{ color: theme.textLight }}>Squarespace #{order.squarespaceOrderNumber}</p>
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

                        {showResendDownload && (
                          <button
                            type="button"
                            onClick={() => handleResendDownload(order)}
                            disabled={isResendingDownload || !order.customerEmail}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                            style={{ backgroundColor: '#6366f1' }}
                            title={order.customerEmail ? 'Email PDF download link(s) again' : 'No email on order'}
                          >
                            {isResendingDownload ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            {isResendingDownload ? 'Sending…' : 'Resend Download'}
                          </button>
                        )}

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

      {showManualOrder && (
        <ManualOrderModal
          theme={theme}
          onClose={() => setShowManualOrder(false)}
          onCreated={loadOrders}
        />
      )}
    </div>
  );
}
