import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Copy, CircleNotch, Truck, ArrowsCounterClockwise, DotsThree, Trash, Plus,
} from '@phosphor-icons/react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../config/firebase';
import { AdminBottomSheet } from './adminUi';
import {
  buildOrderActivityTimeline,
  actorLabel,
} from '../../utils/orderActivityTimeline';
import { formatShopOrderNumberLabel } from '../../utils/orderNumbers';

function formatMoney(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format((cents || 0) / 100);
}

function formatOrderDate(ts) {
  if (!ts) return '\u2014';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function orderDisplayId(order) {
  const shopLabel = formatShopOrderNumberLabel(order?.shopOrderNumber);
  if (shopLabel) return shopLabel;
  const num = order.squarespaceOrderNumber || order.squarespaceOrderId;
  if (num) {
    const sq = formatShopOrderNumberLabel(num);
    return sq || `#${String(num).replace(/^#/, '')}`;
  }
  return `#${String(order.id).slice(-8)}`;
}

function isOrderCancelledStatus(status) {
  const s = (status || '').toLowerCase();
  return s === 'cancelled' || s === 'canceled';
}

function fulfillmentLabel(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'pending') return 'Pending';
  if (isOrderCancelledStatus(s)) return 'Canceled';
  if (s === 'shipped') return 'Shipped';
  if (s === 'delivered') return 'Fulfilled';
  return 'Fulfilled';
}

function paymentLabel(order) {
  const fs = (order.financialStatus || 'PAID').toUpperCase();
  if (fs === 'PAID') return 'Paid';
  if (fs === 'REFUNDED') return 'Refunded';
  if (fs === 'PENDING') return 'Pending';
  return fs.charAt(0) + fs.slice(1).toLowerCase();
}

function isFulfilledOrder(order) {
  const s = (order.status || 'pending').toLowerCase();
  return s === 'shipped' || s === 'delivered';
}

function trackingUrlFor(order) {
  if (order.trackingUrl) return order.trackingUrl;
  const t = order.trackingNumber;
  if (!t) return null;
  const c = (order.labelCarrier || 'USPS').toUpperCase();
  if (c.includes('UPS')) return `https://www.ups.com/track?tracknum=${t}`;
  if (c.includes('FEDEX')) return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
}

function findProduct(item, products) {
  if (!products?.length) return null;
  if (item.productId) return products.find((p) => p.id === item.productId);
  if (item.sku) return products.find((p) => p.sku === item.sku);
  return null;
}

function noteTimestamp(note) {
  if (!note?.createdAt) return 0;
  if (note.createdAt?.toDate) return note.createdAt.toDate().getTime();
  return new Date(note.createdAt).getTime();
}

function getOrderNotes(order) {
  const list = Array.isArray(order.adminNotes) ? [...order.adminNotes] : [];
  const legacy = order.privateNotes || order.notes;
  if (legacy?.trim() && !list.some((n) => n.id === 'legacy-import')) {
    list.push({
      id: 'legacy-import',
      text: legacy.trim(),
      createdAt: order.createdAt || null,
      authorEmail: 'Imported',
      legacy: true,
    });
  }
  return list.sort((a, b) => noteTimestamp(b) - noteTimestamp(a));
}

function OrderActivityPanel({ order, theme }) {
  const [shopEvents, setShopEvents] = useState([]);
  const [trackingDetails, setTrackingDetails] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const isWebsiteOrder = order.source === 'own-site' || String(order.id || '').startsWith('cs_');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingExtras(true);
      setTrackingError(null);
      const events = [];

      try {
        if (isWebsiteOrder && order.id && !(order.activityLog || []).some((e) => (
          ['add_to_cart', 'checkout_started', 'checkout_session', 'checkout_completed'].includes(e.type)
        ))) {
          const snap = await getDocs(
            query(
              collection(db, 'shopEvents'),
              where('params.sessionId', '==', order.id),
              limit(50)
            )
          );
          snap.forEach((d) => events.push({ id: d.id, ...d.data() }));

          const checkoutEv = events.find((e) => e.eventName === 'shop_checkout_session_created');
          if (checkoutEv?.sessionId) {
            const funnelSnap = await getDocs(
              query(
                collection(db, 'shopEvents'),
                where('sessionId', '==', checkoutEv.sessionId),
                limit(100)
              )
            );
            funnelSnap.forEach((d) => {
              if (!events.some((e) => e.id === d.id)) {
                events.push({ id: d.id, ...d.data() });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load shop funnel events:', err);
      }

      let scans = [];
      if (order.trackingNumber) {
        try {
          const fn = httpsCallable(getFunctions(), 'getEasyPostTrackerStatus');
          const res = await fn({ trackingNumber: order.trackingNumber });
          if (res.data?.success && res.data?.data?.tracking_details) {
            scans = res.data.data.tracking_details;
          } else if (res.data?.error) {
            setTrackingError(res.data.error);
          }
        } catch (err) {
          setTrackingError(err.message || 'Could not load carrier tracking');
        }
      }

      if (!cancelled) {
        setShopEvents(events);
        setTrackingDetails(scans);
        setLoadingExtras(false);
      }
    })();

    return () => { cancelled = true; };
  }, [order.id, order.trackingNumber, isWebsiteOrder]);

  const timeline = useMemo(
    () => buildOrderActivityTimeline(order, { shopEvents, trackingDetails }),
    [order, shopEvents, trackingDetails]
  );

  const actorColor = (actor) => {
    if (actor === 'customer') return theme.primary;
    if (actor === 'admin') return '#C67A5C';
    return theme.textLight;
  };

  return (
    <div>
      {loadingExtras && (
        <p className="text-xs flex items-center gap-1.5 mb-3" style={{ color: theme.textLight }}>
          <CircleNotch size={12} className="animate-spin" />
          Loading funnel &amp; carrier data…
        </p>
      )}
      {trackingError && order.trackingNumber && (
        <p className="text-xs mb-3 rounded-lg px-3 py-2 border" style={{ borderColor: theme.border, color: theme.textLight }}>
          Carrier tracking unavailable: {trackingError}
        </p>
      )}
      {timeline.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: theme.textLight }}>No activity recorded yet.</p>
      ) : (
        <ul className="relative space-y-0">
          {timeline.map((entry, i) => (
            <li key={entry.id || i} className="flex gap-3 pb-5 last:pb-0">
              <div className="flex flex-col items-center shrink-0 w-3 pt-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: actorColor(entry.actor) }}
                />
                {i < timeline.length - 1 && (
                  <div className="w-px flex-1 mt-1 min-h-[20px]" style={{ backgroundColor: theme.border }} />
                )}
              </div>
              <div className="min-w-0 flex-1 -mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-medium" style={{ color: theme.text }}>{entry.title}</p>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${actorColor(entry.actor)}18`, color: actorColor(entry.actor) }}
                  >
                    {actorLabel(entry.actor)}
                  </span>
                </div>
                {entry.detail && (
                  <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>{entry.detail}</p>
                )}
                <p className="text-[11px] mt-1 flex flex-wrap gap-x-2" style={{ color: theme.textLight }}>
                  <span>{formatOrderDate(entry.createdAt)}</span>
                  {entry.actorEmail && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{entry.actorEmail}</span>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderNotesPanel({ order, theme, onAddNote, isSavingNote }) {
  const [draft, setDraft] = useState('');
  const notes = getOrderNotes(order);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSavingNote) return;
    await onAddNote(text);
    setDraft('');
  };

  const fieldStyle = {
    borderColor: theme.border,
    backgroundColor: theme.cardBackground,
    color: theme.text,
    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Label>Private notes</Label>
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an internal note about this order…"
            rows={3}
            className="w-full px-3 py-2.5 pr-14 rounded-lg border text-sm resize-none outline-none"
            style={fieldStyle}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSavingNote}
            aria-label={isSavingNote ? 'Saving note' : 'Add note'}
            title={isSavingNote ? 'Saving…' : 'Add note'}
            className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-9 h-9 rounded-full text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 shadow-md"
            style={{
              background: isSavingNote
                ? theme.secondary
                : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            {isSavingNote ? (
              <CircleNotch size={18} className="animate-spin" />
            ) : (
              <Plus size={20} weight="bold" />
            )}
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: theme.textLight }}>No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border px-3 py-2.5"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
              }}
            >
              <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>{note.text}</p>
              <p className="text-[11px] mt-2 flex flex-wrap gap-x-2 gap-y-0.5" style={{ color: theme.textLight }}>
                <span>{formatOrderDate(note.createdAt)}</span>
                {note.authorEmail && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{note.authorEmail}</span>
                  </>
                )}
                {note.legacy && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="italic">Imported note</span>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      {order.discountCode && (
        <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
          <Label>Discount code</Label>
          <p className="text-sm" style={{ color: theme.text }}>{order.discountCode}</p>
        </div>
      )}
    </div>
  );
}

function Label({ children }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#888' }}>
      {children}
    </p>
  );
}

function TrackViaEasyPostButton({ order, theme, onRegistered }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isRegistered = Boolean(order.easypostTrackerId || order.easypostRegisteredAt);

  if (!order.trackingNumber?.trim()) return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctions(), 'registerShopOrderEasyPostTracker');
      const res = await fn({ orderId: order.id });
      if (res.data?.success) {
        onRegistered?.({
          easypostTrackerId: res.data.trackerId,
          easypostRegisteredAt: new Date(),
          easypostStatus: res.data.status || null,
        });
      } else {
        setError('Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Could not register with EasyPost');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <span
        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}
      >
        EasyPost active
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs font-semibold tracking-wide whitespace-nowrap hover:underline disabled:opacity-50"
        style={{ color: theme.primary }}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <CircleNotch size={12} className="animate-spin" />
            Registering…
          </span>
        ) : (
          'Track via EasyPost'
        )}
      </button>
      {error && (
        <span className="text-[10px] max-w-[160px] leading-tight" style={{ color: theme.error || '#DC2626' }}>
          {error}
        </span>
      )}
    </span>
  );
}

function Row({ label, children, action }) {
  return (
    <div className="py-4 border-b last:border-b-0" style={{ borderColor: '#eee' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Label>{label}</Label>
          {children}
        </div>
        {action}
      </div>
    </div>
  );
}

function OrderActionsMenu({
  order,
  onPrintSlip,
  onCreateLabel,
  onCancelOrder,
  onRefundOrder,
  theme,
  actionLoading = false,
}) {
  const [open, setOpen] = useState(false);
  const [pendingDanger, setPendingDanger] = useState(null);
  const menuRef = useRef(null);
  const fulfilled = isFulfilledOrder(order);
  const hasLabel = Boolean(order.labelUrl);
  const isCancelled = isOrderCancelledStatus(order.status);
  const isRefunded = (order.financialStatus || '').toUpperCase() === 'REFUNDED';
  const canStripe = Boolean(order.paymentIntentId);

  useEffect(() => {
    if (!open) {
      setPendingDanger(null);
      return undefined;
    }
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    setPendingDanger(null);
    fn?.();
  };

  const menuBtn = (label, onClick, { disabled = false, danger = false } = {}) => (
    <button
      key={label}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && run(onClick)}
      className="w-full text-left px-3 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5"
      style={{ color: danger ? '#C67A5C' : theme.text }}
    >
      {label}
    </button>
  );

  const dangerBtn = (key, label, onClick, { disabled = false } = {}) => {
    const isPending = pendingDanger === key;
    const blocked = disabled || actionLoading;
    return (
      <button
        key={key}
        type="button"
        disabled={blocked}
        onClick={() => {
          if (blocked) return;
          if (!isPending) {
            setPendingDanger(key);
            return;
          }
          setOpen(false);
          setPendingDanger(null);
          onClick?.();
        }}
        className={`w-full text-left px-3 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 ${isPending ? 'tap-confirm-pop' : ''}`}
        style={{ color: '#C67A5C' }}
      >
        {isPending ? 'Tap again to confirm' : actionLoading ? 'Working…' : label}
      </button>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <style>{`
        @keyframes tapConfirmPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .tap-confirm-pop { animation: tapConfirmPop 0.45s ease-out 2; }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full transition-colors hover:bg-black/5"
        aria-label="Order actions"
        style={{ color: theme.textLight }}
      >
        <DotsThree size={22} weight="bold" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[210px] rounded-lg border py-1 shadow-lg"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          {fulfilled ? (
            <>
              {menuBtn('Print Receipt', () => onPrintSlip(order.id))}
              {menuBtn('Reprint Label', () => window.open(order.labelUrl, '_blank'), { disabled: !hasLabel })}
              {menuBtn('Create New Label', () => onCreateLabel(order))}
              {menuBtn('Label Receipt', () => window.open(order.labelUrl, '_blank'), { disabled: !hasLabel })}
              {dangerBtn('cancel', 'Cancel', () => onCancelOrder(order), { disabled: isCancelled })}
              {dangerBtn('refund', 'Refund', () => onRefundOrder(order), { disabled: isRefunded || !canStripe })}
            </>
          ) : (
            <>
              {menuBtn('Create Label', () => onCreateLabel(order), { disabled: isCancelled })}
              {menuBtn('Print Receipt', () => onPrintSlip(order.id))}
              {dangerBtn('cancel', 'Cancel', () => onCancelOrder(order), { disabled: isCancelled })}
              {dangerBtn('refund', 'Refund', () => onRefundOrder(order), { disabled: isRefunded || !canStripe })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminShopOrderDetail({
  order,
  shopProducts,
  theme,
  onClose,
  onStatusChange,
  onPrintSlip,
  onCreateLabel,
  onResendDownload,
  onCancelOrder,
  onRefundOrder,
  onDeleteOrder,
  onAddNote,
  onEasyPostRegistered,
  onSyncFromStripe,
  resendingDownload,
  orderHasDigital,
  isDeleting,
  isOrderActionLoading,
  isSavingNote,
}) {
  const [tab, setTab] = useState('summary');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncingStripe, setSyncingStripe] = useState(false);

  const ff = fulfillmentLabel(order.status);
  const pay = paymentLabel(order);
  const currency = order.currency || 'usd';
  const subtotal = order.subtotalCents ?? order.items?.reduce((s, i) => s + (i.amountTotal || 0), 0) ?? 0;
  const shipping = order.shippingCents ?? 0;
  const tax = order.taxCents ?? 0;
  const total = order.amountTotal ?? subtotal + shipping + tax;
  const showResend = orderHasDigital(order, shopProducts);
  const fulfilled = isFulfilledOrder(order);
  const cancelled = isOrderCancelledStatus(order.status);
  const customerLabel = order.customerName || order.shippingName || 'Guest';
  const isRefunded = (order.financialStatus || '').toUpperCase() === 'REFUNDED';
  const showRefundHint = cancelled && pay === 'Paid' && !isRefunded;

  const addr = order.shippingAddress || {};
  const addressLines = [
    order.shippingName || order.customerName,
    addr.line1 || addr.street1,
    addr.line2 || addr.street2,
    [addr.city, addr.state, addr.postal_code || addr.zip].filter(Boolean).join(', '),
    addr.country && addr.country !== 'US' ? addr.country : null,
  ].filter(Boolean);

  const copyTracking = async () => {
    if (!order.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const carrier = (order.labelCarrier || 'USPS').toUpperCase();
  const trackUrl = trackingUrlFor(order);
  const isWebsiteOrder = order.source === 'own-site' || String(order.id || '').startsWith('cs_');
  const missingShipAddress = addressLines.length === 0;

  const handleSyncStripe = async () => {
    if (!onSyncFromStripe || syncingStripe) return;
    setSyncingStripe(true);
    try {
      await onSyncFromStripe(order);
    } finally {
      setSyncingStripe(false);
    }
  };

  return (
    <AdminBottomSheet
      open
      onClose={onClose}
      title={orderDisplayId(order)}
      titleSuffix={customerLabel}
      theme={theme}
      wide
      titleExtra={(
        <OrderActionsMenu
          order={order}
          theme={theme}
          onPrintSlip={onPrintSlip}
          onCreateLabel={onCreateLabel}
          onCancelOrder={onCancelOrder}
          onRefundOrder={onRefundOrder}
          actionLoading={isOrderActionLoading}
        />
      )}
      footer={(
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center flex-1 justify-start min-w-0">
            <style>{`
              @keyframes tapConfirmPop {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
              }
              .tap-confirm-pop { animation: tapConfirmPop 0.45s ease-out 2; }
            `}</style>
            <button
              type="button"
              onClick={() => {
                if (confirmDelete) {
                  onDeleteOrder(order);
                } else {
                  setConfirmDelete(true);
                }
              }}
              disabled={isDeleting || isOrderActionLoading}
              className={`inline-flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-50 ${confirmDelete ? 'tap-confirm-pop' : ''}`}
              style={{ color: confirmDelete ? '#8B5335' : '#C67A5C' }}
            >
              <Trash size={15} weight={confirmDelete ? 'fill' : 'regular'} />
              {isDeleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm' : 'Delete'}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {fulfilled ? (
              <button
                type="button"
                disabled={isOrderActionLoading || isDeleting}
                onClick={() => onStatusChange(order.id, 'pending')}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide border transition-colors disabled:opacity-50"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                Mark Unfulfilled
              </button>
            ) : (
              <button
                type="button"
                disabled={isOrderActionLoading || isDeleting}
                onClick={() => onStatusChange(order.id, 'delivered')}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide text-white transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
                }}
              >
                Mark Fulfilled
              </button>
            )}
          </div>
        </div>
      )}
    >
      <div className="px-4 sm:px-5 pb-2">
        {cancelled && (
          <div
            className="mb-3 px-3 py-2.5 rounded-lg text-sm leading-snug"
            style={{ backgroundColor: '#C67A5C18', color: '#8B5A42' }}
          >
            Order cancelled
            {showRefundHint ? ' — payment is still captured. Use Refund in the menu to return funds.' : '.'}
          </div>
        )}
        {isOrderActionLoading && (
          <div className="mb-3 flex items-center gap-2 text-xs font-medium" style={{ color: theme.primary }}>
            <CircleNotch size={14} className="animate-spin" />
            Updating order…
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <span
            className="text-xs px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${theme.text}08`, color: theme.text }}
          >
            {ff}
          </span>
          <span className="text-xs" style={{ color: theme.textLight }}>{formatOrderDate(order.createdAt)}</span>
        </div>

        <div className="flex gap-6 border-b mb-4" style={{ borderColor: theme.border }}>
          {['summary', 'note', 'activity'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="pb-3 text-sm capitalize border-b-2 -mb-px transition-colors"
              style={{
                color: tab === id ? theme.text : theme.textLight,
                borderColor: tab === id ? theme.primary : 'transparent',
                fontWeight: tab === id ? 600 : 400,
              }}
            >
              {id}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>Shipping</h2>
              <div className="border rounded-lg" style={{ borderColor: theme.border }}>
                {order.trackingNumber ? (
                  <Row
                    label="Tracking number"
                    action={
                      order.labelUrl ? (
                        <a
                          href={order.labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold tracking-wide hover:underline shrink-0"
                          style={{ color: theme.text }}
                        >
                          PRINT LABEL
                        </a>
                      ) : null
                    }
                  >
                    <p className="text-xs mb-0.5" style={{ color: theme.textLight }}>SHIPS VIA {carrier}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {trackUrl ? (
                        <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: theme.text }}>
                          {order.trackingNumber}
                        </a>
                      ) : (
                        <span className="text-sm font-mono" style={{ color: theme.text }}>{order.trackingNumber}</span>
                      )}
                      <button type="button" onClick={copyTracking} className="p-1 rounded hover:bg-black/5" title="Copy">
                        <Copy size={14} style={{ color: theme.textLight }} />
                      </button>
                      {copied && <span className="text-xs" style={{ color: theme.textLight }}>Copied</span>}
                      <TrackViaEasyPostButton
                        order={order}
                        theme={theme}
                        onRegistered={(patch) => onEasyPostRegistered?.(order.id, patch)}
                      />
                    </div>
                  </Row>
                ) : (
                  <div className="p-4">
                    <Label>Tracking number</Label>
                    <button
                      type="button"
                      onClick={() => onCreateLabel(order)}
                      className="text-sm underline"
                      style={{ color: theme.text }}
                    >
                      Create shipping label
                    </button>
                  </div>
                )}

                <div className="px-4">
                  <Row label="Customer">
                    <p className="text-sm font-medium" style={{ color: theme.text }}>{order.customerName || order.shippingName || '\u2014'}</p>
                    <p className="text-sm" style={{ color: theme.textLight }}>{order.customerEmail || '\u2014'}</p>
                  </Row>
                  {addressLines.length > 0 ? (
                    <Row label="Ships to">
                      <div className="text-sm leading-relaxed" style={{ color: theme.text }}>
                        {addressLines.map((line) => <div key={line}>{line}</div>)}
                      </div>
                    </Row>
                  ) : isWebsiteOrder ? (
                    <Row label="Ships to">
                      <p className="text-sm mb-2" style={{ color: theme.textLight }}>
                        No shipping address on file — sync from Stripe checkout.
                      </p>
                      <button
                        type="button"
                        onClick={handleSyncStripe}
                        disabled={syncingStripe}
                        className="text-sm font-semibold underline disabled:opacity-50"
                        style={{ color: theme.primary }}
                      >
                        {syncingStripe ? 'Syncing from Stripe…' : 'Sync address from Stripe'}
                      </button>
                    </Row>
                  ) : null}
                  <Row label="Payment method">
                    <p className="text-sm" style={{ color: theme.text }}>{order.paymentMethod || 'Card'}</p>
                  </Row>
                  <Row label="Payment status">
                    <p className="text-sm font-medium" style={{ color: pay === 'Paid' ? '#2e7d32' : theme.text }}>{pay}</p>
                  </Row>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>Order summary</h2>
              <div className="space-y-4">
                {(order.items || []).map((item, i) => {
                  const product = findProduct(item, shopProducts);
                  const img = product?.image || product?.images?.[0];
                  return (
                    <div key={i} className="flex gap-4">
                      <div
                        className="w-14 h-14 shrink-0 rounded border overflow-hidden bg-gray-50 flex items-center justify-center"
                        style={{ borderColor: theme.border }}
                      >
                        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <PackagePlaceholder />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: theme.text }}>{item.name}</p>
                        {item.sku && <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>{item.sku}</p>}
                        <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                          Qty: {item.quantity || 1}
                          {item.variant && ` · ${item.variant}`}
                        </p>
                      </div>
                      <p className="text-sm font-medium tabular-nums shrink-0" style={{ color: theme.text }}>
                        {formatMoney(item.amountTotal || 0, currency)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 space-y-2 text-sm border-t pt-4" style={{ borderColor: theme.border }}>
                <div className="flex justify-between" style={{ color: theme.textLight }}>
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
                </div>
                {shipping > 0 && (
                  <div className="flex justify-between" style={{ color: theme.textLight }}>
                    <span>Shipping</span>
                    <span className="tabular-nums">{formatMoney(shipping, currency)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between" style={{ color: theme.textLight }}>
                    <span>Tax</span>
                    <span className="tabular-nums">{formatMoney(tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-base font-semibold">
                  <span style={{ color: theme.text }}>Total</span>
                  <span className="tabular-nums" style={{ color: '#2e7d32' }}>{formatMoney(total, currency)}</span>
                </div>
              </div>
              {showResend && (
                <button
                  type="button"
                  onClick={() => onResendDownload(order)}
                  disabled={resendingDownload}
                  className="mt-4 text-xs font-semibold tracking-wide hover:underline disabled:opacity-50 flex items-center gap-1"
                  style={{ color: theme.text }}
                >
                  {resendingDownload ? <CircleNotch size={12} className="animate-spin" /> : <ArrowsCounterClockwise size={12} />}
                  Resend digital download
                </button>
              )}
            </section>

            {order.giftMessage && (
              <section className="text-sm italic p-4 rounded-lg border" style={{ borderColor: theme.border, color: theme.textLight }}>
                Gift message: &ldquo;{order.giftMessage}&rdquo;
              </section>
            )}
          </div>
        )}

        {tab === 'note' && (
          <OrderNotesPanel
            order={order}
            theme={theme}
            onAddNote={onAddNote}
            isSavingNote={isSavingNote}
          />
        )}

        {tab === 'activity' && (
          <OrderActivityPanel order={order} theme={theme} />
        )}
      </div>
    </AdminBottomSheet>
  );
}

function PackagePlaceholder() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}
