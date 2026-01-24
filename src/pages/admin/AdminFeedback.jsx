import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  MessageSquare,
  MessagesSquare,
  CheckCircle,
  Loader,
  AlertTriangle,
  Lightbulb,
  Send,
  ArrowLeft,
  Mail,
  Copy,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

const statusFilters = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All History' },
];

export default function AdminFeedback() {
  const { theme } = useOutletContext();
  const {
    feedback,
    tickets,
    loading,
    handleRespondToFeedback,
    handleUpdateFeedback,
    handleDeleteFeedback,
    getTicketWithMessages,
    subscribeToTicketMessages,
    handleTicketReply,
    handleUpdateTicketStatus,
  } = useAdmin();
  const [supportView, setSupportView] = useState('feedback');
  const [statusFilter, setStatusFilter] = useState('new');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [feedbackView, setFeedbackView] = useState('list');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [ticketView, setTicketView] = useState('list');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketResponseText, setTicketResponseText] = useState('');
  const [loadingTicket, setLoadingTicket] = useState(false);
  const ticketUnsubRef = useRef(null);

  const filteredFeedback = statusFilter === 'all'
    ? feedback
    : feedback.filter((f) => f.status === statusFilter);
  const openTickets = tickets.filter((t) => t.status === 'new' || t.status === 'in-progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

  useEffect(() => {
    return () => {
      if (ticketUnsubRef.current) ticketUnsubRef.current();
    };
  }, []);

  const handleOpenTicket = async (t) => {
    setLoadingTicket(true);
    setSelectedTicket(null);
    setTicketMessages([]);
    try {
      const ticket = await getTicketWithMessages(t.id);
      setSelectedTicket(ticket);
      setTicketMessages(ticket.messages || []);
      setTicketView('chat');
      ticketUnsubRef.current = subscribeToTicketMessages(t.id, (msgs) => setTicketMessages(msgs));
    } catch (err) {
      console.error('Error loading ticket:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Failed to load ticket', type: 'error' } }));
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleBackToTickets = () => {
    if (ticketUnsubRef.current) {
      ticketUnsubRef.current();
      ticketUnsubRef.current = null;
    }
    setTicketView('list');
    setSelectedTicket(null);
    setTicketMessages([]);
    setTicketResponseText('');
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

  const handleSubmitResponse = async () => {
    const target = selectedFeedback || respondingTo;
    if (!target || !responseText.trim()) return;
    await handleRespondToFeedback(target, responseText);
    setRespondingTo(null);
    setResponseText('');
    if (selectedFeedback) setResponseText('');
  };

  const handleOpenFeedback = (item) => {
    setSelectedFeedback(item);
    setFeedbackView('detail');
    setResponseText('');
    setRespondingTo(null);
  };

  const handleBackToFeedbackList = () => {
    setFeedbackView('list');
    setSelectedFeedback(null);
    setResponseText('');
    setRespondingTo(null);
  };

  const handleDeleteFeedbackAndBack = async (item) => {
    const deleted = await handleDeleteFeedback(item.id);
    if (deleted) handleBackToFeedbackList();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSupportView('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              supportView === 'feedback' ? '' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: supportView === 'feedback' ? theme.primary + '20' : 'transparent',
              color: supportView === 'feedback' ? theme.primary : theme.textLight,
              border: `2px solid ${supportView === 'feedback' ? theme.primary : theme.border}`,
            }}
          >
            <MessageSquare size={18} />
            Feedback
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: supportView === 'feedback' ? theme.primary : theme.textLight + '30', color: supportView === 'feedback' ? '#fff' : theme.textLight }}>
              {feedback.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSupportView('open-tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              supportView === 'open-tickets' ? '' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: supportView === 'open-tickets' ? theme.warning + '20' : 'transparent',
              color: supportView === 'open-tickets' ? theme.warning : theme.textLight,
              border: `2px solid ${supportView === 'open-tickets' ? theme.warning : theme.border}`,
            }}
          >
            <MessagesSquare size={18} />
            Open
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: supportView === 'open-tickets' ? theme.warning : theme.textLight + '30', color: supportView === 'open-tickets' ? '#fff' : theme.textLight }}>
              {openTickets.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSupportView('closed-tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              supportView === 'closed-tickets' ? '' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: supportView === 'closed-tickets' ? theme.success + '20' : 'transparent',
              color: supportView === 'closed-tickets' ? theme.success : theme.textLight,
              border: `2px solid ${supportView === 'closed-tickets' ? theme.success : theme.border}`,
            }}
          >
            <CheckCircle size={18} />
            Closed
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: supportView === 'closed-tickets' ? theme.success : theme.textLight + '30', color: supportView === 'closed-tickets' ? '#fff' : theme.textLight }}>
              {closedTickets.length}
            </span>
          </button>
        </div>
      </div>

      {supportView === 'feedback' && (
        feedbackView === 'detail' && selectedFeedback ? (
          <FeedbackDetailView
            theme={theme}
            item={selectedFeedback}
            responseText={responseText}
            setResponseText={setResponseText}
            loading={loading}
            onBack={handleBackToFeedbackList}
            onSubmitResponse={handleSubmitResponse}
            onUpdateFeedback={async (id, updates) => {
              await handleUpdateFeedback(id, updates);
              if (selectedFeedback?.id === id && updates.status) {
                setSelectedFeedback((prev) => (prev ? { ...prev, status: updates.status } : null));
              }
            }}
            onDelete={() => handleDeleteFeedbackAndBack(selectedFeedback)}
          />
        ) : (
          <>
            <div className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: theme.textLight }}>Filter by status</h3>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((f) => {
                  const count = f.id === 'all' ? feedback.length : feedback.filter((x) => x.status === f.id).length;
                  const isActive = statusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
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
            </div>

            <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-4 border-b" style={{ borderColor: theme.border }}>
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Feedback</h2>
                <p className="text-sm mt-1" style={{ color: theme.textLight }}>Click a feedback or bug report to view and respond</p>
              </div>
              <div className="p-4 space-y-3">
                {loading.feedback ? (
                  <div className="text-center py-8">
                    <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                  </div>
                ) : filteredFeedback.length === 0 ? (
                  <p className="text-center py-8" style={{ color: theme.textLight }}>No feedback in this filter.</p>
                ) : (
                  filteredFeedback.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenFeedback(item)}
                      className="w-full p-3 rounded-lg border text-left hover:opacity-90 transition-opacity flex items-start justify-between gap-2"
                      style={{ borderColor: theme.border, backgroundColor: theme.background }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'bug' && <AlertTriangle size={14} style={{ color: theme.error }} />}
                          {item.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                          <span className="text-xs font-medium" style={{ color: theme.textLight }}>{item.userEmail}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2" style={{ color: theme.text }}>{item.message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )
      )}

      {supportView === 'open-tickets' && (
        ticketView === 'chat' && selectedTicket ? (
          <TicketChatView
            theme={theme}
            selectedTicket={selectedTicket}
            ticketMessages={ticketMessages}
            ticketResponseText={ticketResponseText}
            setTicketResponseText={setTicketResponseText}
            loading={loading}
            loadingTicket={loadingTicket}
            onBack={handleBackToTickets}
            onUpdateStatus={handleStatusChange}
            onSendReply={handleSubmitTicketReply}
          />
        ) : (
          <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Open Tickets</h2>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>Click a ticket to view and respond</p>
            </div>
            <div className="p-4 space-y-3">
              {loading.feedback ? (
                <div className="text-center py-8">
                  <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                </div>
              ) : openTickets.length === 0 ? (
                <p className="text-center py-8" style={{ color: theme.textLight }}>No open tickets.</p>
              ) : (
                openTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleOpenTicket(t)}
                    disabled={loadingTicket}
                    className="w-full p-3 rounded-lg border flex items-center justify-between text-left hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: theme.text }}>{t.subject}</p>
                      <p className="text-xs" style={{ color: theme.textLight }}>{t.userEmail} · #{t.ticketNumber || t.id?.slice(0, 8)}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: t.status === 'new' ? theme.success + '20' : theme.warning + '20', color: t.status === 'new' ? theme.success : theme.warning }}>
                      {t.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )
      )}

      {supportView === 'closed-tickets' && (
        ticketView === 'chat' && selectedTicket ? (
          <TicketChatView
            theme={theme}
            selectedTicket={selectedTicket}
            ticketMessages={ticketMessages}
            ticketResponseText={ticketResponseText}
            setTicketResponseText={setTicketResponseText}
            loading={loading}
            loadingTicket={loadingTicket}
            onBack={handleBackToTickets}
            onUpdateStatus={handleStatusChange}
            onSendReply={handleSubmitTicketReply}
          />
        ) : (
          <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Closed Tickets</h2>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>Click a ticket to view conversation</p>
            </div>
            <div className="p-4 space-y-3">
              {loading.feedback ? (
                <div className="text-center py-8">
                  <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                </div>
              ) : closedTickets.length === 0 ? (
                <p className="text-center py-8" style={{ color: theme.textLight }}>No closed tickets.</p>
              ) : (
                closedTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleOpenTicket(t)}
                    disabled={loadingTicket}
                    className="w-full p-3 rounded-lg border flex items-center justify-between text-left hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  >
                    <div>
                      <p className="font-medium" style={{ color: theme.text }}>{t.subject}</p>
                      <p className="text-xs" style={{ color: theme.textLight }}>{t.userEmail} · #{t.ticketNumber || t.id?.slice(0, 8)}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
                      {t.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )
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
    <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="p-4 lg:p-6 border-b" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: theme.primary }}
        >
          <ArrowLeft size={16} />
          Back to Feedback
        </button>
        <div className="flex items-center gap-2 mb-2">
          {item.type === 'bug' && <AlertTriangle size={18} style={{ color: theme.error }} />}
          {item.type === 'suggestion' && <Lightbulb size={18} style={{ color: theme.warning }} />}
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
            {item.type === 'bug' ? 'Bug report' : 'Suggestion'}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
            {item.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm mb-3" style={{ color: theme.textLight }}>
          <Mail size={14} />
          {item.userEmail}
        </div>
        <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>{item.message}</p>
      </div>
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: theme.textLight }}>Your response</label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Type your response to the user…"
            rows={4}
            className="w-full p-3 rounded-lg border mb-2 text-sm"
            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSubmitResponse}
              disabled={loading.submitting || !responseText.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {loading.submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              Send response
            </button>
            <button
              type="button"
              onClick={() => onUpdateFeedback(item.id, { status: item.status === 'reviewed' ? 'resolved' : 'reviewed' })}
              disabled={loading.submitting}
              className="px-4 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              {item.status === 'reviewed' ? 'Mark resolved' : 'Mark reviewed'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={loading.submitting}
              className="px-4 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: theme.error, color: theme.error }}
            >
              Delete
            </button>
          </div>
        </div>
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
    <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="p-4 lg:p-6 border-b" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: theme.primary }}
        >
          <ArrowLeft size={16} />
          Back to Tickets
        </button>
        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
          {selectedTicket?.subject}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm mb-3" style={{ color: theme.textLight }}>
          <span className="flex items-center gap-1">
            <Mail size={14} />
            {selectedTicket?.userEmail}
          </span>
          <span>#{selectedTicket?.ticketNumber || selectedTicket?.id?.slice(0, 8)}</span>
          <span className="flex items-center gap-2 font-mono text-xs px-2 py-1 rounded border" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
            <span style={{ color: theme.primary }}>ID:</span>
            <span style={{ color: theme.text }}>{selectedTicket?.id?.slice(0, 12)}…</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(selectedTicket?.id || '');
                window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Ticket ID copied!', type: 'success' } }));
              }}
              className="p-1 rounded hover:opacity-80"
              style={{ color: theme.primary }}
              title="Copy document ID"
            >
              <Copy size={12} />
            </button>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold mr-1" style={{ color: theme.textLight }}>Status:</span>
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${active ? 'ring-2' : 'opacity-50 hover:opacity-75'}`}
                style={{
                  backgroundColor: active ? color + '20' : theme.background,
                  color,
                  ringColor: color,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {status === 'new' ? 'New' : status === 'in-progress' ? 'In Progress' : 'Closed'}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 lg:p-6">
        <div className="space-y-2 mb-4 max-h-[360px] overflow-y-auto pr-2">
          {loadingTicket ? (
            <div className="text-center py-8">
              <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
            </div>
          ) : ticketMessages.length === 0 ? (
            <p className="text-center py-8" style={{ color: theme.textLight }}>No messages yet.</p>
          ) : (
            ticketMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] rounded-lg p-3"
                  style={{
                    backgroundColor: msg.senderType === 'admin' ? theme.primary : theme.background,
                    color: msg.senderType === 'admin' ? theme.textOnPrimary : theme.text,
                    border: msg.senderType === 'user' ? `2px solid ${theme.primary}30` : 'none',
                  }}
                >
                  <div className="text-xs mb-1 opacity-80 font-semibold">
                    {msg.senderType === 'user' ? '👤 ' : '🛡️ '}
                    {msg.senderName} • {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Recently'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.message || msg.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
        {!isClosed && (
          <div className="border-t pt-4" style={{ borderColor: theme.border }}>
            <textarea
              value={ticketResponseText}
              onChange={(e) => setTicketResponseText(e.target.value)}
              placeholder="Type your response…"
              rows={4}
              className="w-full p-3 rounded-lg border mb-2 text-sm"
              style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
            />
            <button
              type="button"
              onClick={onSendReply}
              disabled={loading.submitting || !ticketResponseText.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {loading.submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              Send Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
