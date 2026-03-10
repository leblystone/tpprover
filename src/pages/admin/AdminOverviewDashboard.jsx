import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Bug,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Trash2,
  Send,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import WorkQueue from '../../components/admin/WorkQueue';

const STATUS_FILTERS = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
];

export default function AdminOverviewDashboard() {
  const { theme } = useOutletContext();
  const {
    feedback,
    tickets,
    loading,
    loadFeedback,
    loadTickets,
    handleUpdateFeedback,
    handleDeleteFeedback,
    handleUpdateTicketStatus,
    handleRespondToFeedback,
  } = useAdmin();
  const [statusFilter, setStatusFilter] = useState('new');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const handleRefresh = async () => {
    await Promise.all([loadFeedback(), loadTickets()]);
  };

  // Feedback & Bugs: only from feedback collection (suggestions + bug reports). Support tickets are separate (Open/Closed Tickets).
  const toDate = (v) => {
    if (!v) return null;
    if (v?.toDate?.()) return v.toDate();
    if (typeof v?.toMillis === 'function') return new Date(v.toMillis());
    if (typeof v === 'number' && v > 0) return new Date(v);
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
    return null;
  };
  const feedbackWithType = (feedback || []).map((f) => {
    const d = toDate(f.submittedAt) || toDate(f.createdAt) || toDate(f.timestamp);
    return {
      ...f,
      _type: f.type || 'suggestion', // 'bug' | 'suggestion' for display
      _id: `feedback-${f.id}`,
      _date: d || new Date(),
      _status: f.status || 'new',
      _email: f.userEmail || 'Unknown',
      _preview: f.message || f.feedback || 'No message',
    };
  });
  const combined = [...feedbackWithType].sort((a, b) => b._date - a._date);
  const filtered =
    statusFilter === 'all'
      ? combined
      : combined.filter((item) => item._status === statusFilter);

  const handleMarkReviewed = async (item) => {
    setUpdatingId(item._id);
    await handleUpdateFeedback(item.id, { status: 'reviewed' });
    setUpdatingId(null);
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Marked as reviewed', type: 'success' } }));
  };

  const handleMarkResolved = async (item) => {
    setUpdatingId(item._id);
    await handleUpdateFeedback(item.id, { status: 'resolved' });
    setUpdatingId(null);
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Marked as resolved', type: 'success' } }));
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this feedback?')) return;
    setUpdatingId(item._id);
    await handleDeleteFeedback(item.id);
    setUpdatingId(null);
    setExpandedId(null);
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Feedback deleted', type: 'success' } }));
  };

  const handleReply = async (item) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await handleRespondToFeedback(item, replyText.trim());
      setReplyingToId(null);
      setReplyText('');
      await loadFeedback();
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Message sent! User will see it as "From the Team".', type: 'success' } }));
    } catch (err) {
      console.error('Reply failed:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: err.message || 'Failed to send message', type: 'error' } }));
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.text }}>
            <LayoutDashboard size={24} />
            Overview Dashboard
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading.feedback}
          className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: theme.primary + '15',
            border: `1px solid ${theme.primary}30`,
            color: theme.primary,
          }}
        >
          <RefreshCw size={16} className={loading.feedback ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Work Queue — front and center */}
      <section
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: theme.cardBackground || theme.white,
          borderColor: theme.border,
        }}
        aria-label="Work Queue"
      >
        <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
          <ClipboardList size={18} style={{ color: theme.primary }} />
          <h2 className="text-lg font-semibold" style={{ color: theme.text }}>
            Work Queue
          </h2>
        </div>
        <div className="min-h-[280px]">
          <WorkQueue theme={theme} />
        </div>
      </section>

      {/* Feedback & Bugs section */}
      <section
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: theme.cardBackground || theme.white,
          borderColor: theme.border,
        }}
        aria-label="Feedback & Bugs"
      >
        <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
          <MessageSquare size={18} style={{ color: theme.primary }} />
          <h2 className="text-lg font-semibold" style={{ color: theme.text }}>
            Feedback & Bugs
          </h2>
        </div>
        <div className="p-4">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: statusFilter === f.id ? theme.primary + '20' : 'transparent',
                  border: `1px solid ${statusFilter === f.id ? theme.primary + '50' : theme.border}`,
                  color: statusFilter === f.id ? theme.primary : theme.textLight,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: theme.textLight }}>
              No items in this filter
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => {
                const isExpanded = expandedId === item._id;
                const isUpdating = updatingId === item._id;
                return (
                  <div
                    key={item._id}
                    className="rounded-lg border overflow-hidden"
                    style={{
                      backgroundColor: item._status === 'new' ? (item._type === 'bug' ? '#ef444410' : '#3b82f610') : 'transparent',
                      borderColor: theme.border,
                    }}
                  >
                    <div
                      className="p-3 flex items-start gap-2 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : item._id)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isExpanded ? (
                          <ChevronDown size={16} style={{ color: theme.textLight }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: theme.textLight }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: item._type === 'bug' ? '#ef444420' : theme.primary + '20',
                              color: item._type === 'bug' ? '#ef4444' : theme.primary,
                            }}
                          >
                            {item._type === 'bug' ? <Bug size={12} /> : <Lightbulb size={12} />}
                            {item._type === 'bug' ? 'Bug' : 'Feedback'}
                          </span>
                          {item._status === 'new' && (
                            <AlertCircle size={12} style={{ color: theme.primary }} title="New" />
                          )}
                          <span className="text-xs" style={{ color: theme.textLight }}>
                            {item._date.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm font-medium truncate mt-1" style={{ color: theme.text }}>
                          {item._email}
                        </div>
                        <div className="text-xs mt-0.5 line-clamp-2" style={{ color: theme.textLight }}>
                          {item._preview}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: theme.border }}>
                        <div className="pt-2 text-sm whitespace-pre-wrap" style={{ color: theme.text }}>
                          {item.message || item.feedback || 'No message'}
                        </div>
                        {/* Reply form (one-way "From the Team" message) */}
                        {replyingToId === item._id ? (
                          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                            <p className="text-xs mb-2" style={{ color: theme.textLight }}>
                              Reply will appear as &quot;From the Team&quot; on the user&apos;s dashboard.
                            </p>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your message..."
                              rows={3}
                              className="w-full rounded-lg border p-2 text-sm resize-y focus:outline-none focus:ring-2"
                              style={{
                                borderColor: theme.border,
                                backgroundColor: theme.cardBackground || theme.background,
                                color: theme.text,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReply(item);
                                }}
                                disabled={sendingReply || !replyText.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                style={{ backgroundColor: theme.primary, color: '#fff' }}
                              >
                                {sendingReply ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                {sendingReply ? 'Sending…' : 'Send'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingToId(null);
                                  setReplyText('');
                                }}
                                disabled={sendingReply}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50"
                                style={{ borderColor: theme.border, color: theme.text }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2 mt-3 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingToId(replyingToId === item._id ? null : item._id);
                              setReplyText('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border-2"
                            style={{
                              borderColor: theme.primary,
                              backgroundColor: theme.primary + '18',
                              color: theme.primary,
                            }}
                          >
                            <Send size={14} />
                            Reply (From the Team)
                          </button>
                          {item._status === 'new' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkReviewed(item);
                              }}
                              disabled={isUpdating}
                              className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
                            >
                              <CheckCircle size={12} />
                              Mark reviewed
                            </button>
                          )}
                          {item._status !== 'resolved' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkResolved(item);
                              }}
                              disabled={isUpdating}
                              className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              style={{ backgroundColor: theme.success + '20', color: theme.success || '#10b981' }}
                            >
                              <CheckCircle size={12} />
                              Mark resolved
                            </button>
                          )}
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                              disabled={isUpdating}
                              className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              style={{ backgroundColor: (theme.error || '#ef4444') + '20', color: theme.error || '#ef4444' }}
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
