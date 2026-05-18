import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CheckCircle, Circle, Package, Truck, MapPin, Loader } from 'lucide-react';
import ShopHeader from '../components/shop/ShopHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';

const CARRIER_URLS = {
  USPS: (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`,
  UPS: (t) => `https://www.ups.com/track?tracknum=${t}`,
  FEDEX: (t) => `https://www.fedex.com/fedextrack/?trknbr=${t}`,
  DHL: (t) => `https://www.dhl.com/en/express/tracking.html?AWB=${t}`,
};

function getTrackingUrl(trackingNumber, carrier) {
  const key = (carrier || 'USPS').toUpperCase();
  const builder = CARRIER_URLS[key] || CARRIER_URLS.USPS;
  return builder(trackingNumber);
}

const STEPS = [
  { key: 'received', label: 'Order Received', icon: Package },
  { key: 'prepping', label: 'Being Prepped', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

function isStepComplete(stepKey, status) {
  const rank = { pending: 1, shipped: 2, delivered: 3 };
  const current = rank[status] || 0;
  const required = { received: 0, prepping: 1, shipped: 2, delivered: 3 };
  return current >= required[stepKey];
}

function formatDate(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatCurrency(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function TimelineStep({ step, isComplete, isLast, detail, theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
      {/* Circle + connecting line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isComplete ? theme.success : 'transparent',
            border: isComplete ? 'none' : `2px solid ${theme.border}`,
            transition: 'all 0.3s ease',
          }}
        >
          {isComplete ? (
            <CheckCircle size={18} color="#fff" />
          ) : (
            <Circle size={18} color={theme.textLight} />
          )}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flexGrow: 1,
              minHeight: 40,
              background: isComplete ? theme.success : theme.border,
              transition: 'background 0.3s ease',
            }}
          />
        )}
      </div>

      {/* Label + detail */}
      <div style={{ marginLeft: 14, paddingBottom: isLast ? 0 : 24 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 15,
            color: isComplete ? theme.text : theme.textLight,
            lineHeight: '32px',
          }}
        >
          {step.label}
        </p>
        {detail && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.textLight }}>{detail}</p>
        )}
      </div>
    </div>
  );
}

export default function OrderStatus() {
  const { sessionId } = useParams();
  const theme = themes[defaultThemeName];
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sessionId) { setNotFound(true); setLoading(false); return; }

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'physicalOrders', sessionId));
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const stepDetail = (stepKey) => {
    if (!order) return null;
    if (stepKey === 'received') return formatDate(order.createdAt);
    if (stepKey === 'shipped' && order.trackingNumber) {
      const url = getTrackingUrl(order.trackingNumber, order.labelCarrier);
      return (
        <span>
          {formatDate(order.shippedAt)}
          {order.shippedAt && ' · '}
          Tracking:{' '}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.primary, textDecoration: 'underline' }}
          >
            {order.trackingNumber}
          </a>
        </span>
      );
    }
    if (stepKey === 'delivered') return formatDate(order.deliveredAt);
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.background }}>
      <ShopHeader />

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <Loader size={32} color={theme.primary} className="animate-spin" />
              <p style={{ color: theme.textLight, marginTop: 12 }}>Loading order...</p>
            </div>
          )}

          {/* Not found */}
          {!loading && notFound && (
            <div
              style={{
                textAlign: 'center',
                paddingTop: 80,
                background: theme.cardBackground,
                borderRadius: 16,
                padding: '48px 24px',
                border: `1px solid ${theme.border}`,
              }}
            >
              <Package size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
              <h2 style={{ color: theme.text, fontSize: 20, margin: '0 0 8px' }}>Order not found</h2>
              <p style={{ color: theme.textLight, margin: 0, fontSize: 14 }}>
                We couldn't find an order with that ID. Please check the link and try again.
              </p>
            </div>
          )}

          {/* Order content */}
          {!loading && order && (
            <>
              {/* Order header */}
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: theme.text, margin: '0 0 6px' }}>
                  Order Status
                </h1>
                <p style={{ margin: 0, color: theme.textLight, fontSize: 14 }}>
                  {formatDate(order.createdAt)}
                  {order.customerName && ` · ${order.customerName}`}
                </p>
              </div>

              {/* Visual timeline */}
              <div
                style={{
                  background: theme.cardBackground,
                  borderRadius: 16,
                  padding: '28px 24px',
                  border: `1px solid ${theme.border}`,
                  marginBottom: 24,
                }}
              >
                {STEPS.map((step, i) => (
                  <TimelineStep
                    key={step.key}
                    step={step}
                    isComplete={isStepComplete(step.key, order.status)}
                    isLast={i === STEPS.length - 1}
                    detail={stepDetail(step.key)}
                    theme={theme}
                  />
                ))}
              </div>

              {/* Track package CTA */}
              {order.trackingNumber && (
                <a
                  href={getTrackingUrl(order.trackingNumber, order.labelCarrier)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: theme.primary,
                    color: theme.textOnPrimary,
                    fontWeight: 600,
                    fontSize: 15,
                    padding: '14px 24px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    marginBottom: 24,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Track Your Package
                </a>
              )}

              {/* Order details */}
              {order.items?.length > 0 && (
                <div
                  style={{
                    background: theme.cardBackground,
                    borderRadius: 16,
                    padding: '24px',
                    border: `1px solid ${theme.border}`,
                    marginBottom: 24,
                  }}
                >
                  <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: theme.text }}>
                    Order Details
                  </h3>
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: i < order.items.length - 1 ? `1px solid ${theme.border}` : 'none',
                      }}
                    >
                      <span style={{ color: theme.text, fontSize: 14 }}>
                        {item.name}
                        {item.quantity > 1 && (
                          <span style={{ color: theme.textLight }}> × {item.quantity}</span>
                        )}
                      </span>
                      {item.amountTotal != null && (
                        <span style={{ color: theme.text, fontSize: 14, fontWeight: 500 }}>
                          {formatCurrency(item.amountTotal, order.currency)}
                        </span>
                      )}
                    </div>
                  ))}
                  {order.amountTotal != null && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 14,
                        marginTop: 8,
                        borderTop: `2px solid ${theme.border}`,
                      }}
                    >
                      <span style={{ color: theme.text, fontSize: 15, fontWeight: 600 }}>Total</span>
                      <span style={{ color: theme.text, fontSize: 15, fontWeight: 600 }}>
                        {formatCurrency(order.amountTotal, order.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Shipping address */}
              {order.shippingAddress && (
                <div
                  style={{
                    background: theme.cardBackground,
                    borderRadius: 16,
                    padding: '24px',
                    border: `1px solid ${theme.border}`,
                    marginBottom: 24,
                  }}
                >
                  <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: theme.text }}>
                    Shipping Address
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, color: theme.textLight, lineHeight: 1.6 }}>
                    {order.shippingName && <>{order.shippingName}<br /></>}
                    {order.shippingAddress.line1}
                    {order.shippingAddress.line2 && <><br />{order.shippingAddress.line2}</>}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}
                    <br />
                    {order.shippingAddress.country}
                  </p>
                </div>
              )}

              {/* Gift message */}
              {order.giftMessage && (
                <div
                  style={{
                    background: theme.cardBackground,
                    borderRadius: 16,
                    padding: '24px',
                    border: `1px solid ${theme.border}`,
                    marginBottom: 24,
                  }}
                >
                  <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: theme.text }}>
                    Gift Message
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: theme.textLight,
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                    }}
                  >
                    "{order.giftMessage}"
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
