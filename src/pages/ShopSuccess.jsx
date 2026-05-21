import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Download, ArrowLeft, Loader2 } from 'lucide-react';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCart } from '../context/CartContext';

export default function ShopSuccess() {
  usePageSEO({ noindex: true });
  const theme = themes[defaultThemeName];
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();

  const [order, setOrder] = useState(null);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState(null);

  useEffect(() => {
    clearCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const functions = getFunctions();
        const getSession = httpsCallable(functions, 'getPhysicalOrderSession');
        const getDownloads = httpsCallable(functions, 'getSessionDigitalDownloads');
        const [sessionRes, downloadsRes] = await Promise.all([
          getSession({ sessionId }),
          getDownloads({ sessionId }).catch(() => ({ data: { downloads: [] } })),
        ]);
        if (!cancelled) {
          setOrder(sessionRes.data);
          setDownloads(downloadsRes.data?.downloads || []);
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
        if (!cancelled) setError('We confirmed your payment, but couldn\u2019t load order details. Check your email for a confirmation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primary }} />
              <p className="text-sm" style={{ color: theme.textLight }}>Loading your order...</p>
            </div>
          ) : (
            <>
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
                style={{ backgroundColor: '#22c55e20' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#22c55e' }} />
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: theme.primaryDark }}>
                Order Confirmed!
              </h1>

              {error ? (
                <p className="text-sm mb-6" style={{ color: theme.textLight }}>{error}</p>
              ) : order ? (
                <div className="text-left mt-8 space-y-5">
                  <p className="text-center text-sm" style={{ color: theme.textLight }}>
                    Thanks{order.customerName ? `, ${order.customerName}` : ''}! A confirmation email is on its way to <strong>{order.customerEmail}</strong>.
                  </p>

                  {/* Items */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.text}05` }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textLight }}>
                      Items Ordered
                    </h3>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span style={{ color: theme.text }}>
                            {item.name} <span style={{ color: theme.textLight }}>×{item.quantity}</span>
                          </span>
                          <span className="font-semibold" style={{ color: theme.text }}>
                            ${(item.amountTotal / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: `${theme.text}10` }}>
                      <span className="text-sm font-semibold" style={{ color: theme.text }}>Total</span>
                      <span className="text-lg font-bold" style={{ color: theme.primary }}>
                        ${(order.amountTotal / 100).toFixed(2)} {(order.currency || 'usd').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Digital downloads */}
                  {downloads.length > 0 && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.text}05` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Download className="w-4 h-4" style={{ color: theme.primary }} />
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>
                          Your Downloads
                        </h3>
                      </div>
                      <p className="text-xs mb-3" style={{ color: theme.textLight }}>
                        We also emailed these links. Each link works for 90 days.
                      </p>
                      <div className="space-y-2">
                        {downloads.map((d) => (
                          <a
                            key={d.token}
                            href={d.downloadPageUrl}
                            className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                            style={{ backgroundColor: theme.primary, color: '#fff' }}
                          >
                            <span className="truncate">{d.productName}</span>
                            <Download className="w-4 h-4 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shipping */}
                  {order.shipping?.address && (
                    <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.text}05` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4" style={{ color: theme.primary }} />
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>
                          Shipping To
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
                        {order.shipping.name && <>{order.shipping.name}<br /></>}
                        {order.shipping.address.line1}<br />
                        {order.shipping.address.line2 && <>{order.shipping.address.line2}<br /></>}
                        {order.shipping.address.city}, {order.shipping.address.state} {order.shipping.address.postal_code}<br />
                        {order.shipping.address.country}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm mb-6" style={{ color: theme.textLight }}>
                  Your payment was successful. Check your email for order details.
                </p>
              )}

              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ color: theme.primary, backgroundColor: `${theme.primary}10` }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Shop
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-md"
                  style={{ backgroundColor: theme.primary }}
                >
                  Go to Homepage
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

