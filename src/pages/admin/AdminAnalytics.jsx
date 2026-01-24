import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Mail,
  Copy,
  Send,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { elegantPalette } from '../../utils/adminHelpers';

const statusFilters = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All History' },
];

export default function AdminAnalytics() {
  const { theme } = useOutletContext();
  const {
    analytics,
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

  const [feedbackView, setFeedbackView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('new');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketResponseText, setTicketResponseText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [loadingTicket, setLoadingTicket] = useState(false);
  const ticketUnsubRef = useRef(null);

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
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left column: User Growth & Analytics */}
        <div className="lg:col-span-2 space-y-3">
          {/* User Growth */}
          <div
            className="rounded-lg border p-2"
            style={{
              borderColor: '#d0d0d0',
              backgroundColor: '#ffffff',
            }}
          >
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
                <h3 className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>Daily New Signups (Last 14 Days)</h3>
                <span className="text-xs" style={{ color: '#4a4a4a' }}>
                  Total: {analytics.userGrowth.slice(-14).reduce((s, d) => s + d.newUsers, 0)} new users
                </span>
              </div>
              <div
                className="h-32 flex items-end justify-between gap-1 p-2 rounded-lg"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e0e0e0',
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
                            : '#e0e0e0',
                          height: hasNew ? `${(day.newUsers / maxNew) * 80}px` : '2px',
                          minHeight: '2px',
                        }}
                      />
                      <span className="text-[10px] font-semibold" style={{ color: hasNew ? '#1a1a1a' : '#666666' }}>
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feature Usage */}
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: '#d0d0d0',
              backgroundColor: '#ffffff',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} style={{ color: pal.gold.metallic }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Feature Usage (Estimated)</h2>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.entries(analytics.featureUsage || {}).map(([feature, data]) => (
                <div key={feature} className="text-center p-2 rounded-lg" style={{ background: '#f5f5f5', border: `1px solid #d0d0d0` }}>
                  <div className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{(data && data.uses) ?? 0}</div>
                  <div className="text-[10px] font-medium capitalize" style={{ color: '#4a4a4a' }}>{feature}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Key metrics */}
        <div className="space-y-3">
          <div className="p-4 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#d0d0d0' }}>
            <div className="text-2xl font-bold" style={{ color: pal.gold.metallic }}>{analytics.totalUsers}</div>
            <div className="text-sm font-medium" style={{ color: '#4a4a4a' }}>Total Users</div>
          </div>
          <div className="p-4 rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: '#d0d0d0' }}>
            <div className="text-2xl font-bold" style={{ color: pal.gold.metallic }}>{analytics.userGrowth.reduce((s, d) => s + d.newUsers, 0)}</div>
            <div className="text-sm font-medium" style={{ color: '#4a4a4a' }}>New This Month</div>
          </div>
        </div>
      </div>

      {/* Feedback Management Section */}
      <div
        className="rounded-lg border p-3"
        style={{ borderColor: pal.taupe.light, backgroundColor: pal.neutral.white }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: pal.black.text }}>
            <MessagesSquare size={16} style={{ color: pal.taupe.main }} />
            🚨 Support &amp; Feedback Management
          </h2>
        </div>

        {feedbackView === 'list' ? (
          <>
            {/* Priority Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setStatusFilter('new'); }}
                className="p-3 rounded-lg border-2 hover:shadow-lg transition-all text-left"
                style={{
                  borderColor: theme.error,
                  backgroundColor: theme.error + '08',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} style={{ color: theme.error }} />
                    <div>
                      <div className="text-sm font-semibold" style={{ color: theme.error }}>Bug Reports</div>
                      <div className="text-xs" style={{ color: theme.textLight }}>Click to review</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: theme.error }}>
                    {feedback.filter((f) => f.type === 'bug' && f.status === 'new').length}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setStatusFilter('new'); }}
                className="p-3 rounded-lg border-2 hover:shadow-lg transition-all text-left"
                style={{
                  borderColor: theme.warning,
                  backgroundColor: theme.warning + '08',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessagesSquare size={18} style={{ color: theme.warning }} />
                    <div>
                      <div className="text-sm font-semibold" style={{ color: theme.warning }}>Support Tickets</div>
                      <div className="text-xs" style={{ color: theme.textLight }}>Open & in-progress</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: theme.warning }}>
                    {newTickets.length}
                  </div>
                </div>
              </button>
            </div>

            {/* Status filters & tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Feedback column */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: pal.black.text }}>Feedback</h3>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {statusFilters.map((f) => {
                    const count = f.id === 'all' ? feedback.length : feedback.filter((x) => x.status === f.id).length;
                    const isActive = statusFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        className="px-3 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: isActive ? theme.primary + '20' : theme.background,
                          color: isActive ? theme.primary : theme.text,
                          border: `1px solid ${isActive ? theme.primary : theme.border}`,
                        }}
                      >
                        {f.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading.feedback ? (
                    <div className="text-center py-4">
                      <Loader size={20} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                    </div>
                  ) : filteredFeedback.length === 0 ? (
                    <p className="text-center py-4 text-sm" style={{ color: theme.textLight }}>No feedback in this filter</p>
                  ) : (
                    filteredFeedback.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpenFeedback(item)}
                        className="w-full p-2 rounded border text-left hover:bg-gray-50 transition-colors"
                        style={{ borderColor: theme.border, backgroundColor: theme.background }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {item.type === 'bug' && <AlertTriangle size={12} style={{ color: theme.error, flexShrink: 0 }} />}
                            {item.type === 'suggestion' && <Lightbulb size={12} style={{ color: theme.warning, flexShrink: 0 }} />}
                            <span className="text-xs font-medium truncate" style={{ color: theme.textLight }}>{item.userEmail}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.id);
                                alert('Feedback ID copied!');
                              }}
                              className="p-1.5 rounded hover:bg-gray-300 transition-colors"
                              style={{
                                backgroundColor: theme.primary + '15',
                                color: theme.primary
                              }}
                              title="Copy Feedback ID"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: theme.text }}>{item.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Tickets column */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: pal.black.text }}>Support Tickets</h3>
                <div className="flex gap-1 mb-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: theme.warning + '20',
                      color: theme.warning,
                      border: `1px solid ${theme.warning}40`,
                    }}
                  >
                    Open ({newTickets.length})
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: theme.success + '20',
                      color: theme.success,
                      border: `1px solid ${theme.success}40`,
                    }}
                  >
                    Closed ({closedTickets.length})
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading.feedback ? (
                    <div className="text-center py-4">
                      <Loader size={20} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                    </div>
                  ) : newTickets.length === 0 ? (
                    <p className="text-center py-4 text-sm" style={{ color: theme.textLight }}>No open tickets</p>
                  ) : (
                    newTickets.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleOpenTicket(t)}
                        disabled={loadingTicket}
                        className="w-full p-2 rounded border text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                        style={{ borderColor: theme.border, backgroundColor: theme.background }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: theme.text }}>{t.subject}</p>
                            <p className="text-xs truncate" style={{ color: theme.textLight }}>{t.userEmail}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.id);
                                // Optional: show a toast notification
                                alert('Ticket ID copied!');
                              }}
                              className="p-1.5 rounded hover:bg-gray-300 transition-colors"
                              style={{
                                backgroundColor: theme.primary + '15',
                                color: theme.primary
                              }}
                              title="Copy Ticket ID for Ghosty testing"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                              backgroundColor: t.status === 'new' ? theme.success + '20' : theme.warning + '20',
                              color: t.status === 'new' ? theme.success : theme.warning
                            }}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : feedbackView === 'feedback-detail' && selectedFeedback ? (
          <FeedbackDetailView
            theme={theme}
            item={selectedFeedback}
            responseText={responseText}
            setResponseText={setResponseText}
            loading={loading}
            onBack={handleBackToList}
            onSubmitResponse={handleSubmitResponse}
            onUpdateFeedback={handleUpdateFeedback}
            onDelete={async () => {
              const deleted = await handleDeleteFeedback(selectedFeedback.id);
              if (deleted) handleBackToList();
            }}
          />
        ) : feedbackView === 'ticket-detail' && selectedTicket ? (
          <TicketChatView
            theme={theme}
            selectedTicket={selectedTicket}
            ticketMessages={ticketMessages}
            ticketResponseText={ticketResponseText}
            setTicketResponseText={setTicketResponseText}
            loading={loading}
            loadingTicket={loadingTicket}
            onBack={handleBackToList}
            onUpdateStatus={handleStatusChange}
            onSendReply={handleSubmitTicketReply}
          />
        ) : null}
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
