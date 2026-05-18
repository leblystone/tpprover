import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Loader, Store, ShoppingBag, RefreshCw, AlertTriangle,
  Link as LinkIcon, Unlink, CheckCircle, Globe, Wifi, WifiOff,
} from 'lucide-react';
import { fetchAllShopProducts } from '../../config/plannerProducts';

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { type, message } }));
}

const PLATFORMS = [
  { id: 'own-site', name: 'Own Site', emoji: '🌐', color: '#4A7C6F', alwaysConnected: true },
  { id: 'etsy', name: 'Etsy', emoji: '🧡', color: '#F1641E', alwaysConnected: false },
  { id: 'tiktok', name: 'TikTok Shop', emoji: '🎵', color: '#1a1a2e', alwaysConnected: false },
];

function stockBadgeStyle(stock) {
  if (stock === 0 || stock == null) return { bg: '#fee2e2', text: '#dc2626' };
  if (stock <= 5) return { bg: '#fff7ed', text: '#ea580c' };
  return { bg: '#dcfce7', text: '#16a34a' };
}

export default function AdminMarketplaces() {
  const { theme } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [tokens, setTokens] = useState({});
  const [revenue, setRevenue] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProducts(), loadTokens(), loadRevenue()]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await fetchAllShopProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
      toast('error', 'Failed to load products');
    }
  };

  const loadTokens = async () => {
    try {
      const snap = await getDoc(doc(db, '_config', 'marketplaceTokens'));
      if (snap.exists()) setTokens(snap.data());
    } catch (err) {
      console.error('Error loading marketplace tokens:', err);
    }
  };

  const loadRevenue = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const q = query(
        collection(db, 'physicalOrders'),
        where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
      );
      const snap = await getDocs(q);
      const grouped = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const source = data.source || 'own-site';
        const total = Number(data.totalAmount || data.amount || 0);
        grouped[source] = (grouped[source] || 0) + total;
      });
      setRevenue(grouped);
    } catch (err) {
      console.error('Error loading revenue:', err);
    }
  };

  const lowStockProducts = useMemo(
    () => products.filter((p) => (p.stock ?? 0) <= 5),
    [products],
  );

  const maxRevenue = useMemo(
    () => Math.max(...Object.values(revenue), 1),
    [revenue],
  );

  const isPlatformConnected = (platformId) => {
    if (platformId === 'own-site') return true;
    return !!tokens[platformId];
  };

  const handleConnect = (platform) => {
    toast('info', `OAuth flow for ${platform.name} coming soon`);
  };

  const handleDisconnect = (platform) => {
    toast('info', `Disconnect ${platform.name} — not yet implemented`);
  };

  const handleSyncAll = () => {
    toast('info', 'Syncing stock to all platforms...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader size={24} className="animate-spin" style={{ color: theme.primary }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: theme.text }}>Marketplaces &amp; Inventory</h1>
        <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
          Manage platform connections and monitor stock across channels
        </p>
      </div>

      {/* Platform Connection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((platform) => {
          const connected = isPlatformConnected(platform.id);
          return (
            <div
              key={platform.id}
              className="rounded-xl border p-4 space-y-3"
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{platform.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{platform.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {connected ? (
                      <>
                        <Wifi size={12} style={{ color: '#16a34a' }} />
                        <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                          {platform.alwaysConnected ? 'Active' : 'Connected'}
                        </span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={12} style={{ color: theme.textLight }} />
                        <span className="text-xs font-semibold" style={{ color: theme.textLight }}>Not Connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!platform.alwaysConnected && (
                <button
                  onClick={() => connected ? handleDisconnect(platform) : handleConnect(platform)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={connected
                    ? { backgroundColor: `${theme.text}08`, color: theme.textLight, border: `1px solid ${theme.border}` }
                    : { backgroundColor: platform.color, color: '#fff' }
                  }
                >
                  {connected ? <><Unlink size={12} /> Disconnect</> : <><LinkIcon size={12} /> Connect</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: '#d97706' }} />
            <span className="text-sm font-bold" style={{ color: '#92400e' }}>
              Low Stock Alerts ({lowStockProducts.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: (p.stock ?? 0) === 0 ? '#fee2e2' : '#fff7ed',
                  color: (p.stock ?? 0) === 0 ? '#dc2626' : '#ea580c',
                }}
              >
                {p.name} — {p.stock ?? 0} left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Overview Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} style={{ color: theme.primary }} />
            <h2 className="text-sm font-bold" style={{ color: theme.text }}>Inventory Overview</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}>
              {products.length} products
            </span>
          </div>
          <button
            onClick={handleSyncAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: theme.primary }}
          >
            <RefreshCw size={12} />
            Sync All Now
          </button>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: theme.textLight }}>No products yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: `${theme.text}04` }}>
                  {['Product', 'SKU', 'Price', 'Stock', 'Etsy ID', 'TikTok ID', 'Sync Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: theme.textLight }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = p.stock ?? 0;
                  const badge = stockBadgeStyle(stock);
                  const etsyId = p.platformIds?.etsy || null;
                  const tiktokId = p.platformIds?.tiktok || null;
                  const isSynced = etsyId || tiktokId;

                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: theme.border }}>
                      <td className="px-4 py-2.5 font-semibold max-w-[200px] truncate" style={{ color: theme.text }}>
                        {p.name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: theme.textLight }}>
                        {p.sku || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: theme.primary }}>
                        ${Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: etsyId ? theme.text : theme.textLight }}>
                        {etsyId || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: tiktokId ? theme.text : theme.textLight }}>
                        {tiktokId || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {isSynced ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                            <CheckCircle size={12} /> Synced
                          </span>
                        ) : (
                          <span className="text-xs font-semibold" style={{ color: theme.textLight }}>Not linked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue by Platform */}
      <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <div className="flex items-center gap-2">
          <Store size={16} style={{ color: theme.primary }} />
          <h2 className="text-sm font-bold" style={{ color: theme.text }}>
            Revenue by Platform
          </h2>
          <span className="text-xs" style={{ color: theme.textLight }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {Object.keys(revenue).length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: theme.textLight }}>No revenue data yet</p>
        ) : (
          <div className="space-y-3">
            {PLATFORMS.map((platform) => {
              const amount = revenue[platform.id] || 0;
              const pct = maxRevenue > 0 ? (amount / maxRevenue) * 100 : 0;
              return (
                <div key={platform.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{platform.emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: theme.text }}>{platform.name}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      ${amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.text}08` }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, amount > 0 ? 2 : 0)}%`, backgroundColor: platform.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
