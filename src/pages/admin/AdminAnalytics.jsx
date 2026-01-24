import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  MessagesSquare,
  AlertTriangle,
  Lightbulb,
  Loader,
  TrendingUp,
  Activity,
  Smartphone,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { elegantPalette } from '../../utils/adminHelpers';

export default function AdminAnalytics() {
  const { theme } = useOutletContext();
  const {
    analytics,
    feedback,
    tickets,
    loading,
    loadRealAnalytics,
    loadUserData,
  } = useAdmin();
  const pal = elegantPalette;

  const newFeedback = feedback.filter((f) => f.status === 'new');
  const newTickets = tickets.filter((t) => t.status === 'new' || t.status === 'in-progress');

  return (
    <div className="space-y-3">
      {/* Welcome */}
      <div
        className="rounded-lg p-3 flex items-center gap-3 border"
        style={{
          background: `linear-gradient(135deg, ${pal.neutral.white} 0%, ${pal.dark.wallpaper} 100%)`,
          borderColor: pal.taupe.light,
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${pal.gold.gradientStart} 0%, ${pal.gold.gradientEnd} 100%)`,
          }}
        >
          <LayoutDashboard size={20} style={{ color: '#FFF' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base" style={{ color: pal.black.text }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
          </h3>
          <p className="text-xs" style={{ color: pal.black.textMuted }}>
            Admin Panel
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadRealAnalytics();
            loadUserData();
          }}
          disabled={loading.analytics || loading.subscriptions}
          className="p-2 rounded-lg flex items-center justify-center hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: pal.taupe.light + '40',
            border: `1px solid ${pal.taupe.light}`,
            color: pal.taupe.dark,
          }}
          title="Refresh"
        >
          <RefreshCw size={18} className={loading.analytics ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Support & Feedback */}
      <div
        className="rounded-lg border p-3"
        style={{ borderColor: pal.taupe.light, backgroundColor: pal.neutral.white }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessagesSquare size={16} style={{ color: pal.taupe.main }} />
            <h2 className="text-sm font-semibold" style={{ color: pal.black.text }}>
              Support &amp; Feedback
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: newFeedback.length > 0 ? theme.warning + '20' : theme.success + '20',
                color: newFeedback.length > 0 ? theme.warning : theme.success,
              }}
            >
              {newFeedback.length} new
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: newTickets.length > 0 ? theme.warning + '20' : theme.success + '20',
                color: newTickets.length > 0 ? theme.warning : theme.success,
              }}
            >
              {newTickets.length} tickets
            </span>
            <Link
              to="/admin/feedback"
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={{
                background: `linear-gradient(135deg, ${pal.gold.gradientStart} 0%, ${pal.gold.gradientEnd} 100%)`,
                color: '#FFF',
              }}
            >
              View
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded border text-center" style={{ borderColor: pal.taupe.light, backgroundColor: pal.dark.wallpaper }}>
            <div className="text-lg font-bold" style={{ color: pal.taupe.dark }}>{feedback.length}</div>
            <div className="text-[10px]" style={{ color: theme.textLight }}>Feedback</div>
          </div>
          <div className="p-2 rounded border text-center" style={{ borderColor: pal.taupe.light, backgroundColor: pal.dark.wallpaper }}>
            <div className="text-lg font-bold" style={{ color: pal.functional.warning }}>{newFeedback.length}</div>
            <div className="text-[10px]" style={{ color: theme.textLight }}>New</div>
          </div>
          <div className="p-2 rounded border text-center" style={{ borderColor: pal.taupe.light, backgroundColor: pal.dark.wallpaper }}>
            <div className="text-lg font-bold" style={{ color: pal.taupe.dark }}>{tickets.length}</div>
            <div className="text-[10px]" style={{ color: theme.textLight }}>Tickets</div>
          </div>
          <div className="p-2 rounded border text-center" style={{ borderColor: pal.taupe.light, backgroundColor: pal.dark.wallpaper }}>
            <div className="text-lg font-bold" style={{ color: pal.functional.warning }}>{newTickets.length}</div>
            <div className="text-[10px]" style={{ color: theme.textLight }}>Open</div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold" style={{ color: pal.black.text }}>Recent Feedback</h3>
          {loading.feedback ? (
            <div className="text-center py-2">
              <Loader size={20} className="animate-spin mx-auto" style={{ color: theme.primary }} />
            </div>
          ) : newFeedback.length === 0 ? (
            <p className="text-center py-2 text-sm" style={{ color: theme.textLight }}>No feedback yet</p>
          ) : (
            <div className="space-y-2">
              {newFeedback.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  to="/admin/feedback"
                  className="block p-3 rounded-lg border hover:shadow-md transition-all"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {item.type === 'bug' && <AlertTriangle size={14} style={{ color: theme.error }} />}
                      {item.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                      <span className="text-xs font-medium" style={{ color: theme.textLight }}>{item.userEmail}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: theme.text }}>{item.message}</p>
                </Link>
              ))}
              {newFeedback.length > 3 && (
                <Link
                  to="/admin/feedback"
                  className="block w-full py-2 text-sm font-medium rounded-lg border text-center"
                  style={{ borderColor: theme.primary, color: theme.primary, backgroundColor: 'transparent' }}
                >
                  View {newFeedback.length - 3} more…
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Growth */}
      <div
        className="rounded-lg border-2 p-3"
        style={{
          borderColor: pal.gold.metallic + '40',
          backgroundColor: pal.dark.surface,
          boxShadow: `0 4px 12px ${pal.dark.deep}40`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: pal.black.text }}>
              <TrendingUp size={20} style={{ color: pal.gold.metallic }} />
              User Growth
            </h2>
            <p className="text-sm mt-1" style={{ color: theme.textLight }}>Daily registration &amp; activity</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold" style={{ color: theme.primaryDark }}>Daily New Signups (Last 14 Days)</h3>
                <span className="text-xs" style={{ color: theme.textLight }}>
                  Total: {analytics.userGrowth.slice(-14).reduce((s, d) => s + d.newUsers, 0)} new users
                </span>
              </div>
              <div
                className="h-56 flex items-end justify-between gap-1 p-4 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${pal.dark.charcoal} 0%, ${pal.dark.surface} 100%)`,
                  boxShadow: `inset 0 2px 15px ${pal.dark.deep}80`,
                }}
              >
                {analytics.userGrowth.slice(-14).map((day) => {
                  const maxNew = Math.max(...analytics.userGrowth.slice(-14).map((d) => d.newUsers), 1);
                  const hasNew = day.newUsers > 0;
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="rounded-t-lg w-full"
                        style={{
                          background: hasNew
                            ? `linear-gradient(180deg, ${pal.gold.gradientStart} 0%, ${pal.gold.gradientEnd} 100%)`
                            : theme.border,
                          height: hasNew ? `${(day.newUsers / maxNew) * 180}px` : '2px',
                          minHeight: '2px',
                        }}
                      />
                      <span className="text-xs font-medium" style={{ color: hasNew ? theme.text : theme.textLight }}>
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border-2" style={{ background: `linear-gradient(135deg, ${pal.dark.charcoal} 0%, ${pal.dark.surface} 100%)`, borderColor: pal.gold.metallic + '30' }}>
              <div className="text-lg font-bold" style={{ color: pal.gold.metallic }}>{analytics.totalUsers}</div>
              <div className="text-sm font-medium" style={{ color: theme.textLight }}>Total Users</div>
            </div>
            <div className="p-4 rounded-lg border-2" style={{ background: `linear-gradient(135deg, ${pal.dark.surface} 0%, ${pal.dark.charcoal} 100%)`, borderColor: pal.taupe.dark + '40' }}>
              <div className="text-lg font-bold" style={{ color: pal.taupe.light }}>{analytics.userGrowth.reduce((s, d) => s + d.newUsers, 0)}</div>
              <div className="text-sm font-medium" style={{ color: theme.textLight }}>New This Month</div>
            </div>
            <div className="p-4 rounded-lg border-2" style={{ background: `linear-gradient(135deg, ${pal.dark.charcoal} 0%, ${pal.dark.surface} 100%)`, borderColor: pal.functional.success + '50' }}>
              <div className="text-lg font-bold" style={{ color: pal.functional.success }}>{analytics.activeUsers}</div>
              <div className="text-sm font-medium" style={{ color: theme.textLight }}>Active Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: pal.dark.soft + '50',
          background: `linear-gradient(135deg, ${pal.dark.charcoal} 0%, ${pal.dark.surface} 100%)`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} style={{ color: pal.gold.metallic }} />
          <h2 className="text-sm font-semibold" style={{ color: pal.black.text }}>Feature Usage (Estimated)</h2>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(analytics.featureUsage || {}).map(([feature, data]) => (
            <div key={feature} className="text-center p-2 rounded-lg" style={{ background: '#FFF', border: `1px solid ${pal.dark.soft}` }}>
              <div className="text-lg font-bold" style={{ color: pal.taupe.light }}>{(data && data.uses) ?? 0}</div>
              <div className="text-[10px] font-medium capitalize" style={{ color: theme.textLight }}>{feature}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Device Breakdown */}
      {analytics.deviceBreakdown && analytics.deviceBreakdown.total > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: theme.primary + '30',
            background: `linear-gradient(135deg, ${theme.primary}05 0%, ${theme.cardBackground} 100%)`,
          }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: theme.primaryDark }}>Device Breakdown</h2>
          <div className="space-y-2">
            {analytics.deviceBreakdown.mobile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} style={{ color: theme.info }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Mobile</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {analytics.deviceBreakdown.mobile.count} ({analytics.deviceBreakdown.mobile.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${analytics.deviceBreakdown.mobile.percentage}%`, backgroundColor: theme.info }} />
                </div>
              </div>
            )}
            {analytics.deviceBreakdown.tablet && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} style={{ color: theme.warning }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Tablet</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {analytics.deviceBreakdown.tablet.count} ({analytics.deviceBreakdown.tablet.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${analytics.deviceBreakdown.tablet.percentage}%`, backgroundColor: theme.warning }} />
                </div>
              </div>
            )}
            {analytics.deviceBreakdown.desktop && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor size={16} style={{ color: theme.success }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Desktop</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {analytics.deviceBreakdown.desktop.count} ({analytics.deviceBreakdown.desktop.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${analytics.deviceBreakdown.desktop.percentage}%`, backgroundColor: theme.success }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
