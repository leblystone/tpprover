import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, Users, TrendingUp, TrendingDown, RefreshCw, CreditCard, Smartphone, Apple } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export default function AdminRevenue() {
  const { theme } = useOutletContext();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(getApp());
      const getRevenue = httpsCallable(functions, 'getRevenueMetrics');
      const result = await getRevenue();
      setMetrics(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const cardStyle = {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    borderRadius: '16px',
    padding: '20px',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin" size={24} style={{ color: theme.primary }} />
        <span className="ml-3 text-sm" style={{ color: theme.textLight }}>Loading revenue data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm" style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchMetrics} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: theme.primary, color: '#fff' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const statCards = [
    { label: 'MRR', value: `$${metrics.mrr.toFixed(2)}`, icon: DollarSign, color: '#10B981' },
    { label: 'Active Subscribers', value: metrics.totalActive, icon: Users, color: theme.primary },
    { label: 'Conversion Rate', value: `${metrics.conversionRate}%`, icon: TrendingUp, color: '#3B82F6' },
    { label: 'Churn Rate', value: `${metrics.churnRate}%`, icon: TrendingDown, color: '#EF4444' },
  ];

  const breakdownCards = [
    { label: 'Monthly', value: metrics.activeMonthly, color: '#8B5CF6' },
    { label: 'Annual', value: metrics.activeAnnual, color: '#F59E0B' },
    { label: 'Lifetime', value: metrics.activeLifetime, color: '#10B981' },
    { label: 'Trialing', value: metrics.trialing, color: '#6366F1' },
    { label: 'Canceled', value: metrics.canceled, color: '#EF4444' },
    { label: 'Expired', value: metrics.expired, color: '#9CA3AF' },
  ];

  const providers = [
    { label: 'Stripe', value: metrics.providerBreakdown?.stripe || 0, icon: CreditCard },
    { label: 'Google Play', value: metrics.providerBreakdown?.googleplay || 0, icon: Smartphone },
    { label: 'App Store', value: metrics.providerBreakdown?.apple || 0, icon: Apple },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: theme.text }}>Revenue Dashboard</h2>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-xs font-medium" style={{ color: theme.textLight }}>{card.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: theme.text }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Subscription Breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>Subscription Breakdown</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {breakdownCards.map(card => (
            <div key={card.label} style={cardStyle} className="text-center">
              <p className="text-xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
              <p className="text-xs" style={{ color: theme.textLight }}>{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Provider Breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>Payment Providers</h3>
        <div className="grid grid-cols-3 gap-3">
          {providers.map(p => (
            <div key={p.label} style={cardStyle} className="flex items-center gap-3">
              <p.icon size={20} style={{ color: theme.primary }} />
              <div>
                <p className="text-lg font-bold" style={{ color: theme.text }}>{p.value}</p>
                <p className="text-xs" style={{ color: theme.textLight }}>{p.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: theme.textLight, opacity: 0.5 }}>
        Total tracked users: {metrics.totalUsers}
      </p>
    </div>
  );
}
