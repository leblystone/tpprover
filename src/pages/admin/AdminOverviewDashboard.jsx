import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, RefreshCw } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import WorkQueue from '../../components/admin/WorkQueue';

export default function AdminOverviewDashboard() {
  const { theme } = useOutletContext();
  const {
    feedback,
    loading,
    loadFeedback,
    loadTickets,
    handleUpdateFeedback,
    handleDeleteFeedback,
    handleRespondToFeedback,
  } = useAdmin();

  const handleRefresh = async () => {
    await Promise.all([loadFeedback(), loadTickets()]);
  };

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
      _type: f.type || 'suggestion',
      _id: `feedback-${f.id}`,
      _date: d || new Date(),
      _status: f.status || 'new',
      _email: f.userEmail || 'Unknown',
      _preview: f.message || f.feedback || 'No message',
    };
  });

  const handleMarkReviewed = async (item) => {
    await handleUpdateFeedback(item.id, { status: 'reviewed' });
    await loadFeedback();
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Marked as reviewed', type: 'success' } }));
  };

  const handleMarkResolved = async (item) => {
    await handleUpdateFeedback(item.id, { status: 'resolved' });
    await loadFeedback();
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: '✓ Resolved — removed from queue', type: 'success' } }));
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this feedback?')) return;
    await handleDeleteFeedback(item.id);
    await loadFeedback();
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Feedback deleted', type: 'success' } }));
  };

  const handleReply = async (item, replyText) => {
    await handleRespondToFeedback(item, replyText);
    await loadFeedback();
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

      {/* Unified Work Queue — support tickets + bugs + feedback all in one */}
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
          <WorkQueue
            theme={theme}
            feedbackItems={feedbackWithType}
            onFeedbackMarkReviewed={handleMarkReviewed}
            onFeedbackMarkResolved={handleMarkResolved}
            onFeedbackDelete={handleDelete}
            onFeedbackReply={handleReply}
          />
        </div>
      </section>
    </div>
  );
}
