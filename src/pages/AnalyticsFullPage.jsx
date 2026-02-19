import React, { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

export default function AnalyticsFullPage() {
  const navigate = useNavigate();
  const { theme } = useOutletContext() || { theme: {} };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
      detail: {
        tabs: [{ value: 'analytics', label: 'Analytics' }],
        activeTab: 'analytics',
        onTabChange: () => {},
      }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
    };
  }, []);

  const borderStyle = theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <section className="page-bg px-2 sm:px-4 md:px-6 lg:px-8 pb-8">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="p-2 rounded-lg border text-sm transition-colors hover:opacity-90"
          style={{ borderColor: theme?.border, color: theme?.text }}
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme?.primaryDark }}>
          Analytics
          <TrendingUp size={22} style={{ color: theme?.primary }} />
        </h1>
      </div>

      {/* Main content in glass card */}
      <div
        className="content-section p-4 sm:p-6"
        style={{ border: `1px solid ${borderStyle}` }}
      >
        <AnalyticsDashboard theme={theme} showFullScreenLink={false} fullPage />
      </div>
    </section>
  );
}
