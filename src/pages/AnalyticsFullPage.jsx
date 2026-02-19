import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

export default function AnalyticsFullPage() {
  const navigate = useNavigate();
  const { theme } = useOutletContext() || { theme: {} };

  return (
    <div className="min-h-full pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="p-2 rounded-lg border transition-colors hover:opacity-90"
          style={{ borderColor: theme?.border, color: theme?.text }}
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: theme?.text }}>
          Analytics
          <TrendingUp size={20} style={{ color: theme?.primary }} />
        </h1>
      </div>
      <div
        className="rounded-xl border content-card shadow-sm"
        style={{
          borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : theme?.border,
          backgroundColor: theme?.isDark ? theme?.cardBackground : '#ffffff'
        }}
      >
        <AnalyticsDashboard theme={theme} showFullScreenLink={false} />
      </div>
    </div>
  );
}
