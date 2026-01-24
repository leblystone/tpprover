import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  MessageSquare,
  MessagesSquare,
  CheckCircle,
  Loader,
  AlertTriangle,
  Lightbulb,
  Send,
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
  } = useAdmin();
  const [supportView, setSupportView] = useState('feedback');
  const [statusFilter, setStatusFilter] = useState('new');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  const filteredFeedback = statusFilter === 'all'
    ? feedback
    : feedback.filter((f) => f.status === statusFilter);
  const openTickets = tickets.filter((t) => t.status === 'new' || t.status === 'in-progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

  const handleSubmitResponse = async () => {
    if (!respondingTo || !responseText.trim()) return;
    await handleRespondToFeedback(respondingTo, responseText);
    setRespondingTo(null);
    setResponseText('');
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
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>User feedback with respond capability</p>
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
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'bug' && <AlertTriangle size={14} style={{ color: theme.error }} />}
                        {item.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                        <span className="text-xs font-medium" style={{ color: theme.textLight }}>{item.userEmail}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: theme.text }}>{item.message}</p>
                    <div className="flex items-center gap-2">
                      {respondingTo?.id === item.id ? (
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Type your response…"
                            rows={3}
                            className="w-full p-2 rounded border"
                            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSubmitResponse}
                              disabled={loading.submitting || !responseText.trim()}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                              <Send size={14} />
                              Send
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRespondingTo(null); setResponseText(''); }}
                              className="px-3 py-1.5 rounded-lg border text-sm"
                              style={{ borderColor: theme.border, color: theme.text }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setRespondingTo(item)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium"
                            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                          >
                            Respond
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedback(item.id, { status: item.status === 'reviewed' ? 'resolved' : 'reviewed' })}
                            className="px-3 py-1.5 rounded-lg border text-sm"
                            style={{ borderColor: theme.border, color: theme.text }}
                          >
                            {item.status === 'reviewed' ? 'Mark resolved' : 'Mark reviewed'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFeedback(item.id)}
                            className="px-3 py-1.5 rounded-lg border text-sm"
                            style={{ borderColor: theme.error, color: theme.error }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {supportView === 'open-tickets' && (
        <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Open Tickets</h2>
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
                <div
                  key={t.id}
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  <div>
                    <p className="font-medium" style={{ color: theme.text }}>{t.subject}</p>
                    <p className="text-xs" style={{ color: theme.textLight }}>{t.userEmail} · #{t.ticketNumber || t.id?.slice(0, 8)}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: t.status === 'new' ? theme.success + '20' : theme.warning + '20', color: t.status === 'new' ? theme.success : theme.warning }}>
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {supportView === 'closed-tickets' && (
        <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Closed Tickets</h2>
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
                <div
                  key={t.id}
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  <div>
                    <p className="font-medium" style={{ color: theme.text }}>{t.subject}</p>
                    <p className="text-xs" style={{ color: theme.textLight }}>{t.userEmail} · #{t.ticketNumber || t.id?.slice(0, 8)}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
