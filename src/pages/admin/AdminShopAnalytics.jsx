import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChartBar,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  ArrowsClockwise,
  Package,
} from '@phosphor-icons/react';
import { AdminButton, AdminShopAnalyticsSkeleton } from '../../components/admin/adminUi';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { EVENTS } from '../../services/shopAnalytics';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function rangeDayLabel(rangeKey) {
  const days = RANGE_DAYS[rangeKey] ?? 30;
  return `${days} day`;
}
const EVENT_FETCH_LIMIT = 8000;

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  return new Date(val);
}

function aggregateEvents(events, rangeStart) {
  const counts = {
    pageViews: 0,
    productViews: 0,
    addToCart: 0,
    removeFromCart: 0,
    checkoutStarted: 0,
    checkoutSessionCreated: 0,
    purchaseSuccess: 0,
  };
  const pageBreakdown = {};
  const productViews = {};
  const productCart = {};
  const pageViewSessions = new Set();

  for (const ev of events) {
    const created = toDate(ev.createdAt);
    if (!created || created < rangeStart) continue;

    const name = ev.eventName;
    const p = ev.params || {};

    if (name === EVENTS.PAGE_VIEW) {
      counts.pageViews += 1;
      const page = p.page || p.path || 'unknown';
      pageBreakdown[page] = (pageBreakdown[page] || 0) + 1;
      if (ev.sessionId) pageViewSessions.add(`${ev.sessionId}:${page}`);
    } else if (name === EVENTS.PRODUCT_VIEW) {
      counts.productViews += 1;
      const key = p.slug || p.productId || p.name || 'unknown';
      productViews[key] = (productViews[key] || 0) + 1;
    } else if (name === EVENTS.ADD_TO_CART) {
      counts.addToCart += 1;
      const key = p.slug || p.productId || p.name || 'unknown';
      productCart[key] = (productCart[key] || 0) + 1;
    } else if (name === EVENTS.REMOVE_FROM_CART) {
      counts.removeFromCart += 1;
    } else if (name === EVENTS.CHECKOUT_STARTED) {
      counts.checkoutStarted += 1;
    } else if (name === EVENTS.CHECKOUT_SESSION_CREATED) {
      counts.checkoutSessionCreated += 1;
    } else if (name === EVENTS.PURCHASE_SUCCESS) {
      counts.purchaseSuccess += 1;
    }
  }

  const uniquePageViews = pageViewSessions.size || counts.pageViews;
  const checkoutTotal = counts.checkoutStarted + counts.checkoutSessionCreated;
  const conversionRate =
    uniquePageViews > 0
      ? ((counts.purchaseSuccess / uniquePageViews) * 100).toFixed(1)
      : '0.0';

  const topProducts = Object.entries(productViews)
    .map(([key, views]) => ({
      key,
      views,
      cartAdds: productCart[key] || 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  const topPages = Object.entries(pageBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return {
    counts,
    uniquePageViews,
    checkoutTotal,
    conversionRate,
    topProducts,
    topPages,
  };
}

/** Stripe / shop orders store money in cents on amountTotal (see AdminShopOrders). */
function orderAmountDollars(order) {
  if (typeof order.amountTotal === 'number' && !Number.isNaN(order.amountTotal)) {
    return order.amountTotal / 100;
  }
  if (typeof order.amountSubtotal === 'number') {
    const shipping = Number(order.amountShipping) || 0;
    const tax = Number(order.amountTax) || 0;
    const discount = Number(order.amountDiscount) || 0;
    return (order.amountSubtotal + shipping + tax - discount) / 100;
  }
  if (typeof order.total === 'number' && !Number.isNaN(order.total)) {
    // Integer totals from Stripe are cents; fractional values are already dollars
    return Number.isInteger(order.total) && order.total >= 100 ? order.total / 100 : order.total;
  }
  if (typeof order.orderTotal === 'string') {
    const m = order.orderTotal.match(/[\d,.]+/);
    if (m) return parseFloat(m[0].replace(/,/g, '')) || 0;
  }
  return 0;
}

const ORDER_PLATFORMS = [
  { id: 'tpp', label: 'TPP', sublabel: 'thepepplanner.app & manual' },
  { id: 'etsy', label: 'Etsy', sublabel: 'Marketplace sync' },
  { id: 'tiktok', label: 'TikTok', sublabel: 'Marketplace sync' },
];

function orderPlatform(order) {
  const src = (order.source || '').toLowerCase();
  if (src === 'etsy') return 'etsy';
  if (src === 'tiktok') return 'tiktok';
  return 'tpp';
}

function orderInRange(order, rangeStart) {
  const created = toDate(order.createdAt) || toDate(order.paidAt) || toDate(order.processedAt);
  return created && created >= rangeStart;
}

function aggregateOrders(orders, rangeStart) {
  const empty = () => ({ count: 0, revenue: 0 });
  const byPlatform = { tpp: empty(), etsy: empty(), tiktok: empty() };

  for (const o of orders) {
    if (!orderInRange(o, rangeStart)) continue;
    const platform = orderPlatform(o);
    const dollars = orderAmountDollars(o);
    byPlatform[platform].count += 1;
    byPlatform[platform].revenue += dollars;
  }

  const orderCount = byPlatform.tpp.count + byPlatform.etsy.count + byPlatform.tiktok.count;
  const orderRevenue =
    byPlatform.tpp.revenue + byPlatform.etsy.revenue + byPlatform.tiktok.revenue;

  return { orderCount, orderRevenue, byPlatform };
}

function StatCard({ label, value, sub, icon: Icon, theme }) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || '#fff' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>
          {label}
        </span>
        {Icon && <Icon size={18} style={{ color: theme.primary }} />}
      </div>
      <span className="text-2xl font-bold" style={{ color: theme.text }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: theme.textLight }}>
          {sub}
        </span>
      )}
    </div>
  );
}

export default function AdminShopAnalytics() {
  const { theme } = useOutletContext();
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [range]);

  const load = async () => {
    setLoading(true);
    try {
      const [eventsSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'shopEvents'), orderBy('createdAt', 'desc'), limit(EVENT_FETCH_LIMIT))),
        getDocs(query(collection(db, 'physicalOrders'), orderBy('createdAt', 'desc'), limit(2000))),
      ]);
      setEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load shop analytics:', err);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: 'Could not load shop analytics' },
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => aggregateEvents(events, rangeStart),
    [events, rangeStart]
  );
  const orderStats = useMemo(
    () => aggregateOrders(orders, rangeStart),
    [orders, rangeStart]
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
            <ChartBar size={22} style={{ color: theme.primary }} />
            Shop Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Funnel from page views through checkout. Est. conversion uses unique session+page views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(RANGE_DAYS).map((key) => (
            <AdminButton
              key={key}
              variant="secondary"
              theme={theme}
              disabled={loading}
              onClick={() => setRange(key)}
              className="!min-h-[36px]"
              style={{
                borderColor: range === key ? theme.primary : theme.border,
                backgroundColor: range === key ? `${theme.primary}18` : 'transparent',
                color: range === key ? theme.primary : theme.text,
              }}
            >
              {key}
            </AdminButton>
          ))}
          <AdminButton
            variant="icon"
            theme={theme}
            onClick={load}
            loading={loading}
            title="Refresh"
            aria-label="Refresh analytics"
          >
            {!loading && <ArrowsClockwise size={18} />}
          </AdminButton>
        </div>
      </div>

      {loading ? (
        <AdminShopAnalyticsSkeleton theme={theme} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard
              label="Page views"
              value={stats.counts.pageViews}
              sub={`${stats.uniquePageViews} unique (session+page)`}
              icon={Eye}
              theme={theme}
            />
            <StatCard
              label="Product views"
              value={stats.counts.productViews}
              icon={Package}
              theme={theme}
            />
            <StatCard
              label="Add to cart"
              value={stats.counts.addToCart}
              sub={`${stats.counts.removeFromCart} removals`}
              icon={ShoppingCart}
              theme={theme}
            />
            <StatCard
              label="Checkout started"
              value={stats.checkoutTotal}
              sub={`${stats.counts.checkoutStarted} client · ${stats.counts.checkoutSessionCreated} server`}
              icon={CreditCard}
              theme={theme}
            />
            <StatCard
              label="Purchase success"
              value={stats.counts.purchaseSuccess}
              icon={CheckCircle}
              theme={theme}
            />
            <StatCard
              label="Est. conversion"
              value={`${stats.conversionRate}%`}
              sub="purchases ÷ unique page views"
              icon={ChartBar}
              theme={theme}
            />
          </div>

          <div
            className="rounded-xl border p-4 space-y-4"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || '#fff' }}
          >
            <h2 className="text-sm font-bold" style={{ color: theme.text }}>
              Cross Platform ({rangeDayLabel(range)})
            </h2>

            <div
              className="flex flex-wrap items-baseline gap-x-8 gap-y-3 px-5 py-4 rounded-xl border"
              style={{
                background: `linear-gradient(145deg, ${theme.primary}28 0%, ${theme.primary}18 48%, ${theme.primary}22 100%)`,
                borderColor: `${theme.primary}55`,
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.45) inset, 0 4px 14px rgba(47,59,58,0.12), 0 1px 3px rgba(47,59,58,0.08)',
              }}
            >
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: theme.text, opacity: 0.65 }}
                >
                  Total
                </span>
                <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: theme.text }}>
                  {orderStats.orderCount} orders
                </p>
              </div>
              <div
                className="hidden sm:block w-px self-stretch min-h-[2.5rem]"
                style={{ backgroundColor: `${theme.primary}40` }}
                aria-hidden
              />
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: theme.text, opacity: 0.65 }}
                >
                  Revenue
                </span>
                <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: theme.primaryDark || theme.primary }}>
                  ${orderStats.orderRevenue.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ORDER_PLATFORMS.map(({ id, label, sublabel }) => {
                const row = orderStats.byPlatform[id];
                return (
                  <div
                    key={id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: theme.border }}
                  >
                    <p className="text-sm font-bold" style={{ color: theme.text }}>
                      {label}
                    </p>
                    <p className="text-[11px] mb-2" style={{ color: theme.textLight }}>
                      {sublabel}
                    </p>
                    <p className="text-xl font-bold" style={{ color: theme.text }}>
                      {row.count}
                      <span className="text-xs font-normal ml-1" style={{ color: theme.textLight }}>
                        orders
                      </span>
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: theme.primary }}>
                      ${row.revenue.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || '#fff' }}
            >
              <h2 className="text-sm font-bold px-4 py-3 border-b" style={{ color: theme.text, borderColor: theme.border }}>
                Top pages
              </h2>
              {stats.topPages.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: theme.textLight }}>
                  No page views in this range yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: theme.border }}>
                      <th className="text-left px-4 py-2 font-semibold" style={{ color: theme.textLight }}>
                        Page
                      </th>
                      <th className="text-right px-4 py-2 font-semibold" style={{ color: theme.textLight }}>
                        Views
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPages.map(([page, count]) => (
                      <tr key={page} className="border-b" style={{ borderColor: `${theme.border}80` }}>
                        <td className="px-4 py-2" style={{ color: theme.text }}>
                          {page}
                        </td>
                        <td className="px-4 py-2 text-right font-medium" style={{ color: theme.text }}>
                          {count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || '#fff' }}
            >
              <h2 className="text-sm font-bold px-4 py-3 border-b" style={{ color: theme.text, borderColor: theme.border }}>
                Top products
              </h2>
              {stats.topProducts.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: theme.textLight }}>
                  No product views in this range yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: theme.border }}>
                      <th className="text-left px-4 py-2 font-semibold" style={{ color: theme.textLight }}>
                        Product
                      </th>
                      <th className="text-right px-4 py-2 font-semibold" style={{ color: theme.textLight }}>
                        Views
                      </th>
                      <th className="text-right px-4 py-2 font-semibold" style={{ color: theme.textLight }}>
                        Cart
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProducts.map((row) => (
                      <tr key={row.key} className="border-b" style={{ borderColor: `${theme.border}80` }}>
                        <td className="px-4 py-2 truncate max-w-[200px]" style={{ color: theme.text }} title={row.key}>
                          {row.key}
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: theme.text }}>
                          {row.views}
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: theme.text }}>
                          {row.cartAdds}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p className="text-xs" style={{ color: theme.textLight }}>
            Based on the most recent {EVENT_FETCH_LIMIT.toLocaleString()} shop events in the selected period.
          </p>
        </>
      )}
    </div>
  );
}
