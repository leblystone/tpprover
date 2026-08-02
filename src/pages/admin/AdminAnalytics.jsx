import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Warning,
  Lightbulb,
  CircleNotch,
  Pulse,
  DeviceMobile,
  Desktop,
  ArrowLeft,
  Envelope,
  PaperPlaneTilt,
  Users,
  Fire,
  ThermometerCold,
  Lightning,
  CheckCircle,
  CalendarBlank,
  TrendUp,
  ArrowsClockwise,
  CurrencyDollar,
  Robot,
  ShareNetwork,
} from '@phosphor-icons/react';
import { useAdmin } from '../../context/AdminContext';
import {
  elegantPalette,
  filterUsersByDateRange,
  buildDailySignupSeries,
  calculateDeviceBreakdown,
  scaleFeatureUsage,
  chartSignupSlice,
  getPresetDateRange,
} from '../../utils/adminHelpers';
import AdminDateRangeFilter from '../../components/admin/AdminDateRangeFilter';
import AdminSignupBarChart from '../../components/admin/AdminSignupBarChart';
import {
  AdminAnimatedNumber,
  AdminDataRefresh,
  AdminMetricCard,
  AdminEmptyState,
  AdminButton,
  AdminShopAnalyticsSkeleton,
  ADMIN_ANALYTICS_MOTION_CSS,
} from '../../components/admin/adminUi';

const TRIAL_DAYS = 14;

const statusFilters = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All History' },
];

// Derive subscription status from user doc (mirrors AdminUsersSubscriptions logic)
function getUserSubscriptionStatus(user) {
  const subscription = user.subscription;
  const now = new Date();
  let trialEndDate = null;
  if (user.trialEndDate) {
    trialEndDate = user.trialEndDate?.toDate?.() || new Date(user.trialEndDate);
  } else if (user.createdAt) {
    const created = user.createdAt?.toDate?.() || new Date(user.createdAt);
    trialEndDate = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  }
  if (trialEndDate && trialEndDate > now && subscription?.status !== 'active') return 'trialing';
  if (subscription?.status === 'active') {
    const p = (subscription.plan || subscription.interval || '').toLowerCase();
    if (['lifetime', 'life', 'permanent'].some(t => p.includes(t)) || subscription.hasLifetimeAccess) return 'lifetime';
    if (['annual', 'year'].some(t => p.includes(t))) return 'annual';
    return 'monthly';
  }
  return 'trial-expired';
}

// Compute activation funnel from milestones on all users
function computeFunnel(users) {
  const total = users.length;
  if (total === 0) return [];
  const pct = (n) => Math.round((n / total) * 100);
  const converted = users.filter(u => {
    const s = u.subscription?.status;
    const i = (u.subscription?.interval || u.subscription?.plan || '').toLowerCase();
    return (s === 'active') || ['monthly', 'annual', 'lifetime'].includes(i);
  }).length;

  const returnedUsers = users.filter(u => (u.engagement?.loginCount ?? 0) > 1).length;

  return [
    { label: 'Came back (2+ logins)', count: returnedUsers, pct: pct(returnedUsers) },
    { label: 'Created 1 protocol', count: users.filter(u => u.milestones?.firstProtocolCreated).length, pct: pct(users.filter(u => u.milestones?.firstProtocolCreated).length) },
    { label: 'Added 1 order', count: users.filter(u => u.milestones?.firstOrderAdded).length, pct: pct(users.filter(u => u.milestones?.firstOrderAdded).length) },
    { label: '7-day streak', count: users.filter(u => u.milestones?.sevenDayStreak).length, pct: pct(users.filter(u => u.milestones?.sevenDayStreak).length) },
    { label: 'Converted to paid', count: converted, pct: pct(converted) },
  ];
}

// Compute user segments based on engagement data
function computeSegments(users) {
  const now = new Date();
  const nowKey = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const isTrialing = (u) => getUserSubscriptionStatus(u) === 'trialing';
  const lastActive = (u) => {
    const raw = u.engagement?.lastActiveDate || (u.lastActive?.toDate ? u.lastActive.toDate().toISOString().slice(0, 10) : null);
    return raw || null;
  };

  const newUsers = users.filter(u => {
    if (!u.createdAt) return false;
    const created = u.createdAt?.toDate ? u.createdAt.toDate().toISOString().slice(0, 10) : new Date(u.createdAt).toISOString().slice(0, 10);
    return created >= sevenDaysAgo;
  });

  const coldUsers = users.filter(u => {
    if (!isTrialing(u)) return false;
    const la = lastActive(u);
    return !la || la < fourDaysAgo;
  });

  const engagedUsers = users.filter(u => {
    const la = lastActive(u);
    if (!la) return false;
    // Active 3+ of last 7 days — use totalActiveDays as proxy if engagement object exists
    const streak = u.engagement?.currentStreak ?? 0;
    const totalActive = u.engagement?.totalActiveDays ?? 0;
    return la >= sevenDaysAgo && (streak >= 3 || totalActive >= 3);
  });

  const avidUsers = users.filter(u => {
    const streak = u.engagement?.currentStreak ?? 0;
    const totalActive = u.engagement?.totalActiveDays ?? 0;
    return streak >= 6 || totalActive >= 6;
  });

  return { newUsers, coldUsers, engagedUsers, avidUsers };
}

function formatRangeLabel(dateFrom, dateTo) {
  const fmt = (d) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
}

export default function AdminAnalytics() {
  const { theme } = useOutletContext();
  const {
    analytics,
    users,
    feedback,
    tickets,
    loading,
    loadRealAnalytics,
    loadFeedback,
    loadTickets,
    funnelEvents,
    loadFunnelEvents,
    getTicketWithMessages,
    subscribeToTicketMessages,
    handleTicketReply,
    handleUpdateTicketStatus,
    handleUpdateFeedback,
    handleDeleteFeedback,
    handleRespondToFeedback,
  } = useAdmin();
  const pal = elegantPalette;

  // Fetch on demand — cached by AdminContext after the first visit to this tab.
  // Force full feedback (not open-only) for analytics charts.
  useEffect(() => {
    loadRealAnalytics();
    loadFeedback(true, { openOnly: false });
    loadTickets();
    loadFunnelEvents();
  }, [loadRealAnalytics, loadFeedback, loadTickets, loadFunnelEvents]);

  // Date range filter state — defaults to last 30 days
  const defaultRange = getPresetDateRange('30d');
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [activePreset, setActivePreset] = useState('30d');

  const handleDateRangeChange = ({ dateFrom: from, dateTo: to, preset }) => {
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(preset);
  };

  const [feedbackView, setFeedbackView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('new');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketResponseText, setTicketResponseText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [loadingTicket, setLoadingTicket] = useState(false);
  const ticketUnsubRef = useRef(null);

  // Filtered users by signup date range
  const filteredUsers = useMemo(
    () => filterUsersByDateRange(users, dateFrom, dateTo),
    [users, dateFrom, dateTo]
  );

  // Daily signup series for the full selected range (not limited to last 30 days)
  const filteredGrowth = useMemo(
    () => buildDailySignupSeries(users, dateFrom, dateTo),
    [users, dateFrom, dateTo]
  );

  const chartGrowth = useMemo(
    () => chartSignupSlice(filteredGrowth),
    [filteredGrowth]
  );

  // Status counts within date range
  const statusCounts = useMemo(() => {
    const counts = { trialing: 0, 'trial-expired': 0, monthly: 0, annual: 0, lifetime: 0 };
    filteredUsers.forEach(u => {
      const s = getUserSubscriptionStatus(u);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [filteredUsers]);

  const funnel = useMemo(() => computeFunnel(filteredUsers), [filteredUsers]);
  const segments = useMemo(() => computeSegments(filteredUsers), [filteredUsers]);

  const filteredFeatureUsage = useMemo(() => {
    const total = users?.length || 0;
    const ratio = total > 0 ? filteredUsers.length / total : 0;
    return scaleFeatureUsage(analytics.featureUsage, ratio);
  }, [analytics.featureUsage, filteredUsers.length, users?.length]);

  const filteredDeviceBreakdown = useMemo(
    () => calculateDeviceBreakdown(filteredUsers),
    [filteredUsers]
  );

  const newFeedback = feedback.filter((f) => f.status === 'new');
  const newTickets = tickets.filter((t) => t.status === 'new' || t.status === 'in-progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const filteredFeedback = statusFilter === 'all'
    ? feedback
    : feedback.filter((f) => f.status === statusFilter);

  useEffect(() => {
    return () => {
      if (ticketUnsubRef.current) ticketUnsubRef.current();
    };
  }, []);

  const handleOpenFeedback = (item) => {
    setSelectedFeedback(item);
    setFeedbackView('feedback-detail');
    setResponseText('');
  };

  const handleOpenTicket = async (t) => {
    setLoadingTicket(true);
    setSelectedTicket(null);
    setTicketMessages([]);
    try {
      const ticket = await getTicketWithMessages(t.id);
      setSelectedTicket(ticket);
      setTicketMessages(ticket.messages || []);
      setFeedbackView('ticket-detail');
      ticketUnsubRef.current = subscribeToTicketMessages(t.id, (msgs) => setTicketMessages(msgs));
    } catch (err) {
      console.error('Error loading ticket:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Failed to load ticket', type: 'error' } }));
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleBackToList = () => {
    setFeedbackView('list');
    setSelectedFeedback(null);
    setSelectedTicket(null);
    setTicketMessages([]);
    setResponseText('');
    setTicketResponseText('');
    if (ticketUnsubRef.current) {
      ticketUnsubRef.current();
      ticketUnsubRef.current = null;
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedFeedback || !responseText.trim()) return;
    await handleRespondToFeedback(selectedFeedback, responseText);
    setResponseText('');
    setSelectedFeedback(null);
    setFeedbackView('list');
  };

  const handleSubmitTicketReply = async () => {
    if (!selectedTicket || !ticketResponseText.trim()) return;
    await handleTicketReply(selectedTicket.id, ticketResponseText);
    setTicketResponseText('');
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    await handleUpdateTicketStatus(ticketId, newStatus);
    if (selectedTicket?.id === ticketId) {
      try {
        const updated = await getTicketWithMessages(ticketId);
        setSelectedTicket(updated);
      } catch (_) {}
    }
  };

  const rangeKey = `${dateFrom}_${dateTo}`;
  const rangeLabel = formatRangeLabel(dateFrom, dateTo);
  const isLoading = loading.analytics && !users?.length;
  const hasNoUsersEver = !loading.analytics && !users?.length;
  const isRangeEmpty = filteredUsers.length === 0;

  const widenRangeAction = (preset, label) => (
    <AdminButton
      variant="secondary"
      theme={theme}
      onClick={() => handleDateRangeChange(getPresetDateRange(preset))}
      className="!text-xs"
    >
      {label}
    </AdminButton>
  );

  const rangeEmptyAction = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {widenRangeAction('30d', 'Last 30 days')}
      {widenRangeAction('all', 'All time')}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <style>{ADMIN_ANALYTICS_MOTION_CSS}</style>
        <AdminDateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          activePreset={activePreset}
          onChange={handleDateRangeChange}
          summaryCount={0}
        />
        <AdminShopAnalyticsSkeleton theme={theme} />
      </div>
    );
  }

  if (hasNoUsersEver) {
    return (
      <div className="space-y-3">
        <style>{ADMIN_ANALYTICS_MOTION_CSS}</style>
        <AdminDateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          activePreset={activePreset}
          onChange={handleDateRangeChange}
          summaryCount={0}
        />
        <AdminEmptyState
          theme={theme}
          icon={Users}
          title="No user data yet"
          description="Analytics will populate once users sign up and activity is recorded."
          action={
            <AdminButton variant="secondary" theme={theme} onClick={() => loadRealAnalytics(true)}>
              Refresh
            </AdminButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <style>{ADMIN_ANALYTICS_MOTION_CSS}</style>

      {/* Date Range Filter */}
      <AdminDateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        activePreset={activePreset}
        onChange={handleDateRangeChange}
        summaryCount={filteredUsers.length}
        footer={[
          { key: 'trialing', label: 'Trialing', color: '#F59E0B' },
          { key: 'trial-expired', label: 'Expired', color: '#DC2626' },
          { key: 'monthly', label: 'Monthly', color: '#7F9E95' },
          { key: 'annual', label: 'Annual', color: '#5F7F76' },
          { key: 'lifetime', label: 'Lifetime', color: '#1a1a1a' },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
            <AdminAnimatedNumber value={statusCounts[key]} className="text-xs font-semibold tabular-nums" style={{ color }} />
            <span className="text-xs" style={{ color: '#6a6a6a' }}>{label}</span>
          </div>
        ))}
      />

      <AdminDataRefresh refreshKey={rangeKey} className="space-y-3">
      {isRangeEmpty && (
        <AdminEmptyState
          theme={theme}
          icon={CalendarBlank}
          title="No signups in this period"
          description={`No users signed up between ${rangeLabel}. Try a wider date range to see growth and funnel data.`}
          action={rangeEmptyAction}
          compact
        />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'New Signups', value: filteredUsers.length, color: pal.gold.metallic },
          { label: 'Trialing', value: statusCounts.trialing, color: '#F59E0B' },
          { label: 'Paid', value: statusCounts.monthly + statusCounts.annual + statusCounts.lifetime, color: '#5FAF8B' },
          { label: 'Trial Expired', value: statusCounts['trial-expired'], color: '#DC2626' },
        ].map((stat, i) => (
          <AdminMetricCard key={stat.label} {...stat} delay={i * 60} />
        ))}
      </div>
      </AdminDataRefresh>

      {/* User Growth + Activation Funnel — outside fade wrapper so bar grow is visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AdminSignupBarChart
          key={rangeKey}
          chartGrowth={chartGrowth}
          totalNewUsers={filteredGrowth.reduce((s, d) => s + d.newUsers, 0)}
          isRangeEmpty={isRangeEmpty}
          theme={theme}
          rangeEmptyAction={rangeEmptyAction}
          palette={pal}
        />

        {/* Activation Funnel */}
        <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightning size={16} style={{ color: pal.gold.metallic }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Activation Funnel</h2>
          </div>
          <p className="text-[10px] mb-3" style={{ color: '#9a9a9a' }}>Users who signed up in selected range</p>
          {isRangeEmpty ? (
            <AdminEmptyState
              theme={theme}
              icon={Lightning}
              title="Nothing to measure yet"
              description="Activation milestones appear once users sign up in this range."
              compact
              className="!py-6"
            />
          ) : (
          <div className="space-y-2">
            {funnel.map((step, i) => (
              <div key={`${rangeKey}-${step.label}`} className="flex items-center gap-2">
                <div className="w-28 text-xs shrink-0" style={{ color: '#4a4a4a' }}>{step.label}</div>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: '#f0f0f0' }}>
                  <div
                    className="admin-funnel-fill h-4 rounded-full"
                    style={{
                      width: `${step.pct}%`,
                      background: i === funnel.length - 1
                        ? `linear-gradient(90deg, ${pal.gold.gradientStart}, ${pal.gold.gradientEnd})`
                        : `linear-gradient(90deg, ${pal.gold.gradientStart}99, ${pal.gold.gradientEnd}66)`,
                    }}
                  />
                </div>
                <div className="w-16 text-right text-xs shrink-0 tabular-nums">
                  {step.count > 0 || i === 0
                    ? <><AdminAnimatedNumber value={step.count} className="font-semibold inline" style={{ color: '#1a1a1a' }} /><span style={{ color: '#9a9a9a' }}> ({step.pct}%)</span></>
                    : <span style={{ color: '#c0c0c0' }}>—</span>
                  }
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <AdminDataRefresh refreshKey={rangeKey} className="space-y-3">
      {/* Feature Usage + User Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Feature Usage */}
        <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Pulse size={16} style={{ color: pal.gold.metallic }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Feature Usage (Estimated)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {isRangeEmpty ? (
              <div className="col-span-full">
                <AdminEmptyState
                  theme={theme}
                  icon={Pulse}
                  title="No usage in this range"
                  description="Estimated feature totals scale with signups in the selected period."
                  compact
                  className="!py-6"
                />
              </div>
            ) : (
            Object.entries(filteredFeatureUsage || {}).map(([feature, data]) => (
              <div key={feature} className="text-center p-2 rounded-lg transition-transform duration-200 hover:-translate-y-0.5" style={{ background: '#f5f5f5', border: '1px solid #d0d0d0' }}>
                <AdminAnimatedNumber value={(data && data.uses) ?? 0} className="block text-lg font-bold tabular-nums" style={{ color: '#1a1a1a' }} />
                <div className="text-[10px] font-medium capitalize" style={{ color: '#4a4a4a' }}>{feature}</div>
              </div>
            ))
            )}
          </div>
        </div>

        {/* User Segments */}
        <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} style={{ color: pal.gold.metallic }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>User Segments</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {isRangeEmpty ? (
              <div className="col-span-full">
                <AdminEmptyState
                  theme={theme}
                  icon={Users}
                  title="No segments to show"
                  description="Segments are calculated from users who signed up in the selected range."
                  compact
                  className="!py-6"
                />
              </div>
            ) : (
            [
              { label: 'New', sub: 'Signed up last 7 days', count: segments.newUsers.length, icon: <Users size={16} />, color: '#7F9E95' },
              { label: 'Cold', sub: 'Trialing, inactive 4+ days', count: segments.coldUsers.length, icon: <ThermometerCold size={16} />, color: '#94a3b8' },
              { label: 'Engaged', sub: '3+ active days of last 7', count: segments.engagedUsers.length, icon: <CheckCircle size={16} />, color: '#5FAF8B' },
              { label: 'Avid', sub: '6+ day streak or total', count: segments.avidUsers.length, icon: <Fire size={16} />, color: '#F59E0B' },
            ].map(seg => (
              <div key={seg.label} className="admin-metric-card p-2 rounded-lg text-center" style={{ background: '#f5f5f5', border: '1px solid #d0d0d0' }}>
                <div className="mb-0.5" style={{ color: seg.color }}>{seg.icon}</div>
                <AdminAnimatedNumber value={seg.count} className="block text-xl font-bold tabular-nums" style={{ color: '#1a1a1a' }} />
                <div className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>{seg.label}</div>
                <div className="text-[10px] mt-0.5 leading-tight" style={{ color: '#6a6a6a' }}>{seg.sub}</div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: theme.primary + '30',
          background: `linear-gradient(135deg, ${theme.primary}05 0%, ${theme.cardBackground} 100%)`,
        }}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: theme.primaryDark }}>Device Breakdown</h2>
        {!filteredDeviceBreakdown?.total ? (
          <AdminEmptyState
            theme={theme}
            icon={DeviceMobile}
            title="No device data in this range"
            description="Device mix appears when users with recorded device info sign up during the selected period."
            action={isRangeEmpty ? rangeEmptyAction : undefined}
            compact
            className="!bg-transparent !border-transparent"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {filteredDeviceBreakdown.mobile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DeviceMobile size={16} style={{ color: theme.info }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Mobile</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {filteredDeviceBreakdown.mobile.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="admin-funnel-fill h-2 rounded-full"
                    style={{ width: `${filteredDeviceBreakdown.mobile.percentage}%`, backgroundColor: theme.info }}
                  />
                </div>
              </div>
            )}
            {filteredDeviceBreakdown.tablet && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DeviceMobile size={16} style={{ color: theme.warning }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Tablet</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {filteredDeviceBreakdown.tablet.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="admin-funnel-fill h-2 rounded-full"
                    style={{ width: `${filteredDeviceBreakdown.tablet.percentage}%`, backgroundColor: theme.warning }}
                  />
                </div>
              </div>
            )}
            {filteredDeviceBreakdown.desktop && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Desktop size={16} style={{ color: theme.success }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Desktop</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {filteredDeviceBreakdown.desktop.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="admin-funnel-fill h-2 rounded-full"
                    style={{ width: `${filteredDeviceBreakdown.desktop.percentage}%`, backgroundColor: theme.success }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </AdminDataRefresh>

      {/* ── Conversion Events (Live) ─────────────────────────────────────────── */}
      <ConversionEventsPanel theme={theme} funnelEvents={funnelEvents} onRefresh={() => loadFunnelEvents(true)} />

    </div>
  );
}

// ── Conversion Events Panel ───────────────────────────────────────────────────
const FUNNEL_EVENT_GROUPS = [
  {
    label: 'Signup',
    icon: Users,
    color: '#7F9E95',
    events: [
      { key: 'signup_started',    label: 'Started' },
      { key: 'signup_completed',  label: 'Completed' },
      { key: 'trial_started',     label: 'Trial Started' },
      { key: 'trial_expired',     label: 'Trial Expired' },
      { key: 'downgraded_to_free',label: 'Downgraded' },
    ],
  },
  {
    label: 'Upgrade',
    icon: CurrencyDollar,
    color: '#B5A87A',
    events: [
      { key: 'upgrade_plan_viewed',           label: 'Plan Viewed' },
      { key: 'upgrade_cta_click',             label: 'CTA Clicked' },
      { key: 'upgrade_checkout_started',      label: 'Checkout Started' },
      { key: 'upgrade_checkout_completed',    label: 'Checkout Done' },
      { key: 'upgrade_checkout_abandoned',    label: 'Abandoned' },
    ],
  },
  {
    label: 'PiP / AI',
    icon: Robot,
    color: '#8BA4C0',
    events: [
      { key: 'ai_prompt_sent',    label: 'Prompt Sent' },
      { key: 'ai_quota_exhausted',label: 'Quota Hit' },
      { key: 'ai_library_saved',  label: 'Library Saved' },
      { key: 'feature_lock_hit',  label: 'Lock Hit' },
    ],
  },
  {
    label: 'Social',
    icon: ShareNetwork,
    color: '#8FAB8F',
    events: [
      { key: 'referral_link_copied', label: 'Referral Copied' },
      { key: 'referral_redeemed',    label: 'Referral Redeemed' },
      { key: 'buddy_invited',        label: 'Buddy Invited' },
      { key: 'community_added',      label: 'Community Added' },
    ],
  },
];

function ConversionEventsPanel({ theme, funnelEvents, onRefresh }) {
  const { byEvent = {}, totalEvents = 0, loadedAt } = funnelEvents || {};
  const isEmpty = totalEvents === 0 && !loadedAt;

  const fmt = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const convRate = useMemo(() => {
    const started = byEvent['signup_started']?.count || 0;
    const paid = byEvent['upgrade_checkout_completed']?.count || 0;
    if (!started) return null;
    return Math.round((paid / started) * 100);
  }, [byEvent]);

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendUp size={16} style={{ color: '#B5A87A' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Conversion Events</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f0f0f0', color: '#6a6a6a' }}>
            Live · 90 days
          </span>
          {convRate !== null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#5FAF8B22', color: '#5FAF8B' }}>
              {convRate}% signup→paid
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:opacity-70 transition-opacity"
          style={{ color: '#6a6a6a', border: '1px solid #e0e0e0' }}
          title={loadedAt ? `Last loaded at ${fmt(loadedAt)}` : 'Load events'}
        >
          <ArrowsClockwise size={11} />
          {loadedAt ? fmt(loadedAt) : 'Load'}
        </button>
      </div>
      <p className="text-[10px] mb-3" style={{ color: '#9a9a9a' }}>
        All events from the last 90 days written to Firestore <code>conversionFunnel</code>.
        {loadedAt && <span> Updated {fmt(loadedAt)}.</span>}
      </p>

      {isEmpty ? (
        <div className="py-6 text-center text-xs" style={{ color: '#9a9a9a' }}>
          No events yet — fire the refresh button once events have been recorded.
        </div>
      ) : (
        <div className="space-y-4">
          {FUNNEL_EVENT_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const groupTotal = group.events.reduce((s, e) => s + (byEvent[e.key]?.count || 0), 0);
            return (
              <div key={group.label}>
                <div className="flex items-center gap-1.5 mb-2">
                  <GroupIcon size={12} style={{ color: group.color }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                    {group.label}
                  </span>
                  <span className="text-[10px]" style={{ color: '#9a9a9a' }}>({groupTotal} total)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                  {group.events.map((ev) => {
                    const data = byEvent[ev.key] || { count: 0, last7d: 0 };
                    const isActive = data.count > 0;
                    return (
                      <div
                        key={ev.key}
                        className="rounded p-2 text-center"
                        style={{
                          background: isActive ? group.color + '12' : '#f8f8f8',
                          border: `1px solid ${isActive ? group.color + '40' : '#e8e8e8'}`,
                        }}
                      >
                        <div className="text-lg font-bold tabular-nums" style={{ color: isActive ? '#1a1a1a' : '#c0c0c0' }}>
                          {data.count.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-medium leading-tight" style={{ color: isActive ? '#4a4a4a' : '#b0b0b0' }}>
                          {ev.label}
                        </div>
                        {data.last7d > 0 && (
                          <div className="text-[9px] mt-0.5 font-medium" style={{ color: group.color }}>
                            +{data.last7d} this week
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackDetailView({
  theme,
  item,
  responseText,
  setResponseText,
  loading,
  onBack,
  onSubmitResponse,
  onUpdateFeedback,
  onDelete,
}) {
  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 text-sm flex items-center gap-2 hover:opacity-70"
        style={{ color: theme.primary }}
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="flex items-center gap-2 mb-2">
        {item.type === 'bug' && <Warning size={16} style={{ color: theme.error }} />}
        {item.type === 'suggestion' && <Lightbulb size={16} style={{ color: theme.warning }} />}
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
          {item.status}
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: theme.textLight }}>{item.userEmail}</p>
      <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: theme.text }}>{item.message}</p>
      <textarea
        value={responseText}
        onChange={(e) => setResponseText(e.target.value)}
        placeholder="Type your response…"
        rows={3}
        className="w-full p-2 rounded border text-sm mb-2"
        style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmitResponse}
          disabled={loading.submitting || !responseText.trim()}
          className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          <PaperPlaneTilt size={14} />
          Send
        </button>
        <button
          type="button"
          onClick={() => onUpdateFeedback(item.id, { status: item.status === 'reviewed' ? 'resolved' : 'reviewed' })}
          className="px-3 py-1.5 rounded border text-xs font-medium"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          {item.status === 'reviewed' ? 'Mark resolved' : 'Mark reviewed'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-1.5 rounded border text-xs font-medium"
          style={{ borderColor: theme.error, color: theme.error }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function TicketChatView({
  theme,
  selectedTicket,
  ticketMessages,
  ticketResponseText,
  setTicketResponseText,
  loading,
  loadingTicket,
  onBack,
  onUpdateStatus,
  onSendReply,
}) {
  const isClosed = selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed';

  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 text-sm flex items-center gap-2 hover:opacity-70"
        style={{ color: theme.primary }}
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="mb-2">
        <h2 className="text-sm font-semibold" style={{ color: theme.primaryDark }}>{selectedTicket?.subject}</h2>
        <p className="text-xs flex items-center gap-2 mt-1" style={{ color: theme.textLight }}>
          <Envelope size={12} />
          {selectedTicket?.userEmail}
        </p>
      </div>
      <div className="flex gap-1 mb-3">
        {['new', 'in-progress', 'resolved'].map((status) => {
          const active = status === 'new' ? selectedTicket?.status === 'new'
            : status === 'in-progress' ? selectedTicket?.status === 'in-progress'
            : selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed';
          const color = status === 'new' ? theme.success : status === 'in-progress' ? theme.warning : theme.error;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onUpdateStatus(selectedTicket?.id, status === 'resolved' ? 'resolved' : status)}
              disabled={loading.submitting}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: active ? color + '20' : theme.background,
                color,
                border: `1px solid ${active ? color : theme.border}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {status === 'resolved' ? 'Closed' : status}
            </button>
          );
        })}
      </div>
      <div className="space-y-1 mb-3 max-h-56 overflow-y-auto pr-2">
        {loadingTicket ? (
          <div className="text-center py-4">
            <CircleNotch size={16} className="animate-spin mx-auto" style={{ color: theme.primary }} />
          </div>
        ) : ticketMessages.length === 0 ? (
          <p className="text-center py-4 text-xs" style={{ color: theme.textLight }}>No messages yet</p>
        ) : (
          ticketMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'} mb-1`}
            >
              <div
                className="max-w-[80%] rounded p-2 text-xs"
                style={{
                  backgroundColor: msg.senderType === 'admin' ? theme.primary : theme.background,
                  color: msg.senderType === 'admin' ? theme.textOnPrimary : theme.text,
                  border: msg.senderType === 'user' ? `1px solid ${theme.primary}30` : 'none'
                }}
              >
                <div className="opacity-75 font-semibold mb-0.5">
                  {msg.senderType === 'user' ? '👤' : '🛡️'} {msg.senderName}
                </div>
                <div className="whitespace-pre-wrap">{msg.message || msg.text}</div>
              </div>
            </div>
          ))
        )}
      </div>
      {!isClosed && (
        <>
          <textarea
            value={ticketResponseText}
            onChange={(e) => setTicketResponseText(e.target.value)}
            placeholder="Type your response…"
            rows={2}
            className="w-full p-2 rounded border text-xs mb-2"
            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
          />
          <button
            type="button"
            onClick={onSendReply}
            disabled={loading.submitting || !ticketResponseText.trim()}
            className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <PaperPlaneTilt size={14} />
            Reply
          </button>
        </>
      )}
    </div>
  );
}
