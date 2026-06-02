import React, { useState } from 'react';
import { Copy, CircleNotch, Truck, ArrowsCounterClockwise } from '@phosphor-icons/react';
import { AdminSlideOver, AdminButton } from './adminUi';

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
  const num = order.squarespaceOrderNumber || order.squarespaceOrderId;
  if (num) return `#${String(num).replace(/^#/, '')}`;
  return `#${String(order.id).slice(-8)}`;
}

function fulfillmentLabel(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'cancelled') return 'Canceled';
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

function Label({ children }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#888' }}>
      {children}
    </p>
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

export default function AdminShopOrderDetail({
  order,
  shopProducts,
  onClose,
  onStatusChange,
  onPrintSlip,
  onCreateLabel,
  onResendDownload,
  resendingDownload,
  orderHasDigital,
}) {
  const [tab, setTab] = useState('summary');
  const [copied, setCopied] = useState(false);

  const ff = fulfillmentLabel(order.status);
  const pay = paymentLabel(order);
  const currency = order.currency || 'usd';
  const subtotal = order.subtotalCents ?? order.items?.reduce((s, i) => s + (i.amountTotal || 0), 0) ?? 0;
  const shipping = order.shippingCents ?? 0;
  const tax = order.taxCents ?? 0;
  const total = order.amountTotal ?? subtotal + shipping + tax;
  const showResend = orderHasDigital(order, shopProducts);

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

  const theme = { primary: '#5F7F76', border: '#eee', text: '#333', textLight: '#888' };

  return (
    <AdminSlideOver
      open
      onClose={onClose}
      panelClassName="w-full"
      panelStyle={{ backgroundColor: '#fff' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: '#eee' }}>
        <AdminButton variant="ghost" theme={theme} onClick={onClose} className="!px-3 !py-2 !text-xs !font-semibold !tracking-wide">
          CLOSE
        </AdminButton>
        <div className="flex items-center gap-4">
          <AdminButton
            variant="ghost"
            theme={theme}
            onClick={() => onPrintSlip(order.id)}
            className="!px-3 !py-2 !text-xs !font-semibold !tracking-wide"
          >
            PRINT RECEIPT
          </AdminButton>
        </div>
      </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-normal tracking-tight" style={{ color: '#111' }}>
              {orderDisplayId(order)}
            </h1>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              {ff}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: '#888' }}>{formatOrderDate(order.createdAt)}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-6 border-b" style={{ borderColor: '#eee' }}>
          {['summary', 'note', 'activity'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="pb-3 text-sm capitalize border-b-2 -mb-px transition-colors"
              style={{
                color: tab === id ? '#111' : '#888',
                borderColor: tab === id ? '#111' : 'transparent',
                fontWeight: tab === id ? 500 : 400,
              }}
            >
              {id}
            </button>
          ))}
        </div>

        <div className="flex-1 px-6 py-6">
          {tab === 'summary' && (
            <div className="space-y-8">
              {/* Shipping card */}
              <section>
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#111' }}>Shipping</h2>
                <div className="border rounded-sm" style={{ borderColor: '#e5e5e5' }}>
                  {order.trackingNumber ? (
                    <Row
                      label="Tracking number"
                      action={
                        <div className="flex items-center gap-3 shrink-0">
                          {order.labelUrl && (
                            <a
                              href={order.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold tracking-wide hover:underline"
                              style={{ color: '#111' }}
                            >
                              PRINT LABEL
                            </a>
                          )}
                        </div>
                      }
                    >
                      <p className="text-xs mb-0.5" style={{ color: '#888' }}>SHIPS VIA {carrier}</p>
                      <div className="flex items-center gap-2">
                        {trackUrl ? (
                          <a
                            href={trackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline"
                            style={{ color: '#111' }}
                          >
                            {order.trackingNumber}
                          </a>
                        ) : (
                          <span className="text-sm font-mono" style={{ color: '#111' }}>{order.trackingNumber}</span>
                        )}
                        <button type="button" onClick={copyTracking} className="p-1 rounded hover:bg-black/5" title="Copy">
                          <Copy size={14} style={{ color: '#888' }} />
                        </button>
                        {copied && <span className="text-xs" style={{ color: '#888' }}>Copied</span>}
                      </div>
                    </Row>
                  ) : order.status === 'pending' ? (
                    <div className="p-4">
                      <Label>Tracking number</Label>
                      <button
                        type="button"
                        onClick={() => onCreateLabel(order)}
                        className="text-sm underline"
                        style={{ color: '#111' }}
                      >
                        Create shipping label
                      </button>
                    </div>
                  ) : null}

                  <div className="px-4">
                    <Row label="Customer">
                      <p className="text-sm font-medium" style={{ color: '#111' }}>{order.customerName || order.shippingName || '\u2014'}</p>
                      <p className="text-sm" style={{ color: '#666' }}>{order.customerEmail || '\u2014'}</p>
                    </Row>

                    {addressLines.length > 0 && (
                      <Row label="Ships to">
                        <div className="text-sm leading-relaxed" style={{ color: '#111' }}>
                          {addressLines.map((line) => <div key={line}>{line}</div>)}
                        </div>
                      </Row>
                    )}

                    <Row label="Payment method">
                      <p className="text-sm" style={{ color: '#111' }}>
                        {order.paymentMethod || 'Card'}
                      </p>
                    </Row>

                    <Row label="Payment status">
                      <p className="text-sm font-medium" style={{ color: pay === 'Paid' ? '#2e7d32' : '#111' }}>
                        {pay}
                      </p>
                    </Row>
                  </div>
                </div>
              </section>

              {/* Order summary */}
              <section>
                <h2 className="text-sm font-semibold mb-4" style={{ color: '#111' }}>Order summary</h2>
                <div className="space-y-4">
                  {(order.items || []).map((item, i) => {
                    const product = findProduct(item, shopProducts);
                    const img = product?.image || product?.images?.[0];
                    return (
                      <div key={i} className="flex gap-4">
                        <div
                          className="w-14 h-14 shrink-0 rounded border overflow-hidden bg-gray-50 flex items-center justify-center"
                          style={{ borderColor: '#eee' }}
                        >
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <PackagePlaceholder />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: '#111' }}>{item.name}</p>
                          {item.sku && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{item.sku}</p>}
                          <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                            Qty: {item.quantity || 1}
                            {item.variant && ` · ${item.variant}`}
                          </p>
                        </div>
                        <p className="text-sm font-medium tabular-nums shrink-0" style={{ color: '#111' }}>
                          {formatMoney(item.amountTotal || 0, currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2 text-sm border-t pt-4" style={{ borderColor: '#eee' }}>
                  <div className="flex justify-between" style={{ color: '#666' }}>
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
                  </div>
                  {shipping > 0 && (
                    <div className="flex justify-between" style={{ color: '#666' }}>
                      <span>Shipping</span>
                      <span className="tabular-nums">{formatMoney(shipping, currency)}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between" style={{ color: '#666' }}>
                      <span>Tax</span>
                      <span className="tabular-nums">{formatMoney(tax, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 text-base font-semibold">
                    <span style={{ color: '#111' }}>Total</span>
                    <span className="tabular-nums" style={{ color: '#2e7d32' }}>{formatMoney(total, currency)}</span>
                  </div>
                </div>
              </section>

              {order.giftMessage && (
                <section className="text-sm italic p-4 rounded border" style={{ borderColor: '#eee', color: '#444' }}>
                  Gift message: &ldquo;{order.giftMessage}&rdquo;
                </section>
              )}
            </div>
          )}

          {tab === 'note' && (
            <div className="text-sm space-y-3">
              <Label>Private notes</Label>
              <p style={{ color: '#333' }}>{order.privateNotes || order.notes || 'No notes on this order.'}</p>
              {order.discountCode && (
                <>
                  <Label>Discount code</Label>
                  <p style={{ color: '#333' }}>{order.discountCode}</p>
                </>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="text-sm space-y-4" style={{ color: '#444' }}>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#888' }}>Created</p>
                <p>{formatOrderDate(order.createdAt)}</p>
              </div>
              {order.paidAt && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#888' }}>Paid</p>
                  <p>{formatOrderDate(order.paidAt)}</p>
                </div>
              )}
              {order.fulfilledAt && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#888' }}>Fulfilled</p>
                  <p>{formatOrderDate(order.fulfilledAt)}</p>
                </div>
              )}
              {order.shippedAt && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#888' }}>Shipped</p>
                  <p>{formatOrderDate(order.shippedAt)}</p>
                </div>
              )}
              {order.source && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#888' }}>Source</p>
                  <p>{order.source === 'squarespace' ? 'Squarespace' : order.source}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-6 py-4 border-t flex items-center justify-between gap-4"
          style={{ borderColor: '#eee', backgroundColor: '#fafafa' }}
        >
          <div className="flex flex-wrap gap-3">
            {order.labelUrl && (
              <a
                href={order.labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold tracking-wide hover:underline"
                style={{ color: '#111' }}
              >
                REVIEW LABEL
              </a>
            )}
            {showResend && (
              <button
                type="button"
                onClick={() => onResendDownload(order)}
                disabled={resendingDownload}
                className="text-xs font-semibold tracking-wide hover:underline disabled:opacity-50 flex items-center gap-1"
                style={{ color: '#111' }}
              >
                {resendingDownload ? <CircleNotch size={12} className="animate-spin" /> : <ArrowsCounterClockwise size={12} />}
                RESEND DOWNLOAD
              </button>
            )}
          </div>
          {order.status !== 'pending' && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, 'pending')}
              className="px-5 py-2.5 text-xs font-semibold tracking-wide text-white"
              style={{ backgroundColor: '#111' }}
            >
              MARK AS PENDING
            </button>
          )}
          {order.status === 'pending' && (
            <button
              type="button"
              onClick={() => onCreateLabel(order)}
              className="px-5 py-2.5 text-xs font-semibold tracking-wide text-white flex items-center gap-2"
              style={{ backgroundColor: '#111' }}
            >
              <Truck size={14} /> CREATE LABEL
            </button>
          )}
        </div>
    </AdminSlideOver>
  );
}

function PackagePlaceholder() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

