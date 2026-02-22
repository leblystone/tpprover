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
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import GhostWorkerWorkQueue from '../../components/admin/GhostWorkerWorkQueue';

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
  } = useAdmin();
  const [statusFilter, setStatusFilter] = useState('new');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const handleRefresh = async () => {
    await Promise.all([loadFeedback(), loadTickets()]);
  };

  // Bug tickets only (from support modal)
  const bugTickets = tickets.filter((t) => t.type === 'bug');
  // Combined list: feedback items + bug tickets for display
  const feedbackWithType = (feedback || []).map((f) => ({
    ...f,
    _type: 'feedback',
    _id: `feedback-${f.id}`,
    _date: f.createdAt?.toDate?.() || new Date(f.createdAt || 0),
    _status: f.status || 'new',
    _email: f.userEmail || 'Unknown',
    _preview: f.message || f.feedback || 'No message',
  }));
  const bugsWithType = (bugTickets || []).map((t) => ({
    ...t,
    _type: 'bug',
    _id: `ticket-${t.id}`,
    _date: t.createdAt?.toDate?.() || new Date(t.createdAt || 0),
    _status: t.status === 'resolved' || t.status === 'closed' ? 'resolved' : t.status === 'in-progress' ? 'reviewed' : 'new',
    _email: t.userEmail || 'Unknown',
    _preview: t.subject || t.messages?.[0]?.message || 'No subject',
  }));
  const combined = [...feedbackWithType, ...bugsWithType].sort((a, b) => b._date - a._date);
  const filtered =
    statusFilter === 'all'
      ? combined
      : combined.filter((item) => item._status === statusFilter);

  const handleMarkReviewed = async (item) => {
    if (item._type === 'feedback') {
      setUpdatingId(item._id);
      await handleUpdateFeedback(item.id, { status: 'reviewed' });
      setUpdatingId(null);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Marked as reviewed', type: 'success' } }));
    } else {
      setUpdatingId(item._id);
      await handleUpdateTicketStatus(item.id, 'in-progress');
      setUpdatingId(null);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Ticket updated', type: 'success' } }));
    }
  };

  const handleMarkResolved = async (item) => {
    if (item._type === 'feedback') {
      setUpdatingId(item._id);
      await handleUpdateFeedback(item.id, { status: 'resolved' });
      setUpdatingId(null);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Marked as resolved', type: 'success' } }));
    } else {
      setUpdatingId(item._id);
      await handleUpdateTicketStatus(item.id, 'resolved');
      setUpdatingId(null);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Ticket closed', type: 'success' } }));
    }
  };

  const handleDelete = async (item) => {
    if (item._type !== 'feedback') return;
    if (!window.confirm('Delete this feedback?')) return;
    setUpdatingId(item._id);
    await handleDeleteFeedback(item.id);
    setUpdatingId(null);
    setExpandedId(null);
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Feedback deleted', type: 'success' } }));
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
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Work Queue and Feedback & Bugs
          </p>
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
          <GhostWorkerWorkQueue theme={theme} />
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
                          {item._type === 'feedback'
                            ? item.message || item.feedback || 'No message'
                            : [item.subject, item.messages?.[0]?.message].filter(Boolean).join('\n\n') || 'No content'}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
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
                          {item._type === 'feedback' && (
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
                          )}
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
