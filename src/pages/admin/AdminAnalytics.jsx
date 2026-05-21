import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  ArrowLeft,
  Mail,
  Copy,
  Send,
  Filter,
  Users,
  Flame,
  ThermometerSnowflake,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { elegantPalette } from '../../utils/adminHelpers';

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

export default function AdminAnalytics() {
  const { theme } = useOutletContext();
  const {
    analytics,
    users,
    feedback,
    tickets,
    loading,
    loadRealAnalytics,
    loadUserData,
    getTicketWithMessages,
    subscribeToTicketMessages,
    handleTicketReply,
    handleUpdateTicketStatus,
    handleUpdateFeedback,
    handleDeleteFeedback,
    handleRespondToFeedback,
  } = useAdmin();
  const pal = elegantPalette;

  // Date range filter state — defaults to last 30 days
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => today);
  const [activePreset, setActivePreset] = useState('30d');

  const applyPreset = (preset) => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    let fromStr;
    if (preset === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      fromStr = d.toISOString().slice(0, 10);
    } else if (preset === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      fromStr = d.toISOString().slice(0, 10);
    } else if (preset === 'thisYear') {
      fromStr = `${now.getFullYear()}-01-01`;
    } else if (preset === 'lastYear') {
      const y = now.getFullYear() - 1;
      fromStr = `${y}-01-01`;
      setDateTo(`${y}-12-31`);
      setDateFrom(fromStr);
      setActivePreset(preset);
      return;
    } else if (preset === 'all') {
      fromStr = '2020-01-01';
    }
    setDateFrom(fromStr);
    setDateTo(toStr);
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

  // Filtered users by date range
  const filteredUsers = useMemo(() => {
    if (!users?.length) return [];
    return users.filter(u => {
      if (!u.createdAt) return true;
      const created = u.createdAt?.toDate ? u.createdAt.toDate().toISOString().slice(0, 10) : new Date(u.createdAt).toISOString().slice(0, 10);
      return created >= dateFrom && created <= dateTo;
    });
  }, [users, dateFrom, dateTo]);

  // Filtered growth chart
  const filteredGrowth = useMemo(() => {
    return (analytics.userGrowth || []).filter(d => d.date >= dateFrom && d.date <= dateTo);
  }, [analytics.userGrowth, dateFrom, dateTo]);

  // Status counts within date range
  const statusCounts = useMemo(() => {
    const counts = { trialing: 0, 'trial-expired': 0, monthly: 0, annual: 0, lifetime: 0 };
    filteredUsers.forEach(u => {
      const s = getUserSubscriptionStatus(u);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [filteredUsers]);

  const funnel = useMemo(() => computeFunnel(users || []), [users]);
  const segments = useMemo(() => computeSegments(users || []), [users]);

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

  return (
    <div className="space-y-3">

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
        <Filter size={14} style={{ color: pal.gold.metallic }} />
        <span className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>Date Range</span>

        {/* Preset buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: 'thisYear', label: 'This Year' },
            { id: 'lastYear', label: 'Last Year' },
            { id: 'all', label: 'All Time' },
          ].map(({ id, label }) => {
            const isActive = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive ? pal.gold.metallic : '#f0f0f0',
                  color: isActive ? '#ffffff' : '#4a4a4a',
                  border: `1px solid ${isActive ? pal.gold.metallic : '#d0d0d0'}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Custom date pickers */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => { setDateFrom(e.target.value); setActivePreset(null); }}
            className="text-xs border rounded px-1.5 py-0.5"
            style={{ borderColor: '#d0d0d0', color: '#1a1a1a', backgroundColor: '#f9f9f9' }}
          />
          <span className="text-xs" style={{ color: '#6a6a6a' }}>—</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => { setDateTo(e.target.value); setActivePreset(null); }}
            className="text-xs border rounded px-1.5 py-0.5"
            style={{ borderColor: '#d0d0d0', color: '#1a1a1a', backgroundColor: '#f9f9f9' }}
          />
        </div>

        <span className="text-xs ml-auto" style={{ color: '#6a6a6a' }}>
          {filteredUsers.length} users in range
        </span>
        {/* Status counts within range */}
        <div className="w-full flex flex-wrap gap-2 pt-1 border-t mt-1" style={{ borderColor: '#eee' }}>
          {[
            { key: 'trialing', label: 'Trialing', color: '#F59E0B' },
            { key: 'trial-expired', label: 'Expired', color: '#DC2626' },
            { key: 'monthly', label: 'Monthly', color: '#7F9E95' },
            { key: 'annual', label: 'Annual', color: '#5F7F76' },
            { key: 'lifetime', label: 'Lifetime', color: '#1a1a1a' },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold" style={{ color }}>{statusCounts[key]}</span>
              <span className="text-xs" style={{ color: '#6a6a6a' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: analytics.totalUsers, color: pal.gold.metallic },
          { label: 'Trialing', value: statusCounts.trialing, color: '#F59E0B' },
          { label: 'Paid', value: statusCounts.monthly + statusCounts.annual + statusCounts.lifetime, color: '#5FAF8B' },
          { label: 'Trial Expired', value: statusCounts['trial-expired'], color: '#DC2626' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#d0d0d0' }}>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-sm font-medium" style={{ color: '#4a4a4a' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* User Growth + Activation Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* User Growth */}
        <div className="lg:col-span-2 rounded-lg border p-2" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1a1a1a' }}>
                <TrendingUp size={16} style={{ color: pal.gold.metallic }} />
                User Growth
              </h2>
              <p className="text-xs" style={{ color: '#4a4a4a' }}>Daily registration &amp; activity</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>Daily New Signups</h3>
              <span className="text-xs" style={{ color: '#4a4a4a' }}>
                Total: {filteredGrowth.reduce((s, d) => s + d.newUsers, 0)} new users
              </span>
            </div>
            <div
              className="h-32 flex items-end justify-between gap-1 p-2 rounded-lg"
              style={{ background: '#ffffff', border: '1px solid #e0e0e0' }}
            >
              {filteredGrowth.slice(-30).map((day) => {
                const maxNew = Math.max(...filteredGrowth.slice(-30).map((d) => d.newUsers), 1);
                const hasNew = day.newUsers > 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="rounded-t-lg w-full"
                      style={{
                        background: hasNew
                          ? `linear-gradient(180deg, ${pal.gold.gradientStart} 0%, ${pal.gold.gradientEnd} 100%)`
                          : '#e0e0e0',
                        height: hasNew ? `${(day.newUsers / maxNew) * 80}px` : '2px',
                        minHeight: '2px',
                      }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: hasNew ? '#1a1a1a' : '#666666' }}>
                      {new Date(day.date + 'T12:00:00').getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activation Funnel */}
        <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} style={{ color: pal.gold.metallic }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Activation Funnel</h2>
          </div>
          <p className="text-[10px] mb-3" style={{ color: '#9a9a9a' }}>All users · milestone data grows over time</p>
          <div className="space-y-2">
            {funnel.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="w-28 text-xs shrink-0" style={{ color: '#4a4a4a' }}>{step.label}</div>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: '#f0f0f0' }}>
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{
                      width: `${step.pct}%`,
                      background: i === funnel.length - 1
                        ? `linear-gradient(90deg, ${pal.gold.gradientStart}, ${pal.gold.gradientEnd})`
                        : `linear-gradient(90deg, ${pal.gold.gradientStart}99, ${pal.gold.gradientEnd}66)`,
                    }}
                  />
                </div>
                <div className="w-16 text-right text-xs shrink-0">
                  {step.count > 0 || i === 0
                    ? <><span className="font-semibold" style={{ color: '#1a1a1a' }}>{step.count}</span><span style={{ color: '#9a9a9a' }}> ({step.pct}%)</span></>
                    : <span style={{ color: '#c0c0c0' }}>—</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Usage + User Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Feature Usage */}
        <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} style={{ color: pal.gold.metallic }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Feature Usage (Estimated)</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(analytics.featureUsage || {}).map(([feature, data]) => (
              <div key={feature} className="text-center p-2 rounded-lg" style={{ background: '#f5f5f5', border: '1px solid #d0d0d0' }}>
                <div className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{(data && data.uses) ?? 0}</div>
                <div className="text-[10px] font-medium capitalize" style={{ color: '#4a4a4a' }}>{feature}</div>
              </div>
            ))}
          </div>
        </div>

        {/* User Segments */}
        <div className="rounded-lg border p-3" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} style={{ color: pal.gold.metallic }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>User Segments</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New', sub: 'Signed up last 7 days', count: segments.newUsers.length, icon: <Users size={16} />, color: '#7F9E95' },
              { label: 'Cold', sub: 'Trialing, inactive 4+ days', count: segments.coldUsers.length, icon: <ThermometerSnowflake size={16} />, color: '#94a3b8' },
              { label: 'Engaged', sub: '3+ active days of last 7', count: segments.engagedUsers.length, icon: <CheckCircle2 size={16} />, color: '#5FAF8B' },
              { label: 'Avid', sub: '6+ day streak or total', count: segments.avidUsers.length, icon: <Flame size={16} />, color: '#F59E0B' },
            ].map(seg => (
              <div key={seg.label} className="p-2 rounded-lg text-center" style={{ background: '#f5f5f5', border: '1px solid #d0d0d0' }}>
                <div className="mb-0.5" style={{ color: seg.color }}>{seg.icon}</div>
                <div className="text-xl font-bold" style={{ color: '#1a1a1a' }}>{seg.count}</div>
                <div className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>{seg.label}</div>
                <div className="text-[10px] mt-0.5 leading-tight" style={{ color: '#6a6a6a' }}>{seg.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      {analytics.deviceBreakdown && analytics.deviceBreakdown.total > 0 && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: theme.primary + '30',
            background: `linear-gradient(135deg, ${theme.primary}05 0%, ${theme.cardBackground} 100%)`,
          }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: theme.primaryDark }}>Device Breakdown</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {analytics.deviceBreakdown.mobile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} style={{ color: theme.info }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>Mobile</span>
                  </div>
                  <span className="text-sm" style={{ color: theme.textLight }}>
                    {analytics.deviceBreakdown.mobile.percentage}%
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
                    {analytics.deviceBreakdown.tablet.percentage}%
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
                    {analytics.deviceBreakdown.desktop.percentage}%
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
        {item.type === 'bug' && <AlertTriangle size={16} style={{ color: theme.error }} />}
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
          <Send size={14} />
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
          <Mail size={12} />
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
            <Loader size={16} className="animate-spin mx-auto" style={{ color: theme.primary }} />
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
            <Send size={14} />
            Reply
          </button>
        </>
      )}
    </div>
  );
}
