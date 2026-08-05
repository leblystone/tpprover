import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  CircleNotch, PaperPlaneTilt, CheckCircle, ChatCircle, MagnifyingGlass, Plus, GitCommit,
  CaretDown, CaretUp, CaretLeft, CaretRight, User, ShieldCheck, X, ArrowSquareOut, Wrench, List,
} from '@phosphor-icons/react';
import CustomDropdown from '../common/inputs/CustomDropdown';
import { UserDetailPanel } from './UserDetailModal';
import { AdminSpinner } from './adminUi';

export const TYPE_PILL = {
  Bug: { bg: '#FEE2E2', color: '#DC2626' },
  Suggestion: { bg: '#D1FAE5', color: '#065F46' },
  Support: { bg: '#DBEAFE', color: '#1D4ED8' },
  Deletion: { bg: '#FFEDD5', color: '#C2410C' },
};

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'bug', label: 'Bugs' },
  { id: 'suggestion', label: 'Suggestions' },
  { id: 'support', label: 'Support' },
  { id: 'deletion', label: 'Deletions' },
];

const STATUS_PILL = {
  working: { label: 'Working on it', bg: '#FEF3C7', color: '#B45309' },
  'need-info': { label: 'Waiting for info', bg: '#E0E7FF', color: '#4338CA' },
  'known-issue': { label: 'Known issue', bg: '#FEE2E2', color: '#B91C1C' },
  resolved: { label: 'Resolved', bg: '#D1FAE5', color: '#047857' },
};

export function ChipButton({
  children,
  active,
  onClick,
  disabled,
  loading,
  variant = 'default',
  style = {},
  title,
}) {
  const t = style;
  const variants = {
    default: {
      bg: active ? '#4a7c5920' : 'transparent',
      color: active ? '#2d5a3a' : '#6B7280',
      border: active ? '1px solid #4a7c5960' : '1px solid #E5E7EB',
    },
    primary: {
      bg: active ? '#2d5a3a' : '#2d5a3a15',
      color: active ? '#fff' : '#2d5a3a',
      border: `1px solid ${active ? '#2d5a3a' : '#2d5a3a40'}`,
    },
    danger: {
      bg: active ? '#DC2626' : '#FEF2F2',
      color: active ? '#fff' : '#991B1B',
      border: `1px solid ${active ? '#DC2626' : '#FECACA'}`,
    },
    success: {
      bg: active ? '#0d9668' : '#F0FDF4',
      color: active ? '#fff' : '#166534',
      border: `1px solid ${active ? '#0d9668' : '#86EFAC'}`,
    },
    send: {
      bg: '#a0522d',
      color: '#fff',
      border: '1px solid #a0522d',
    },
  };
  const v = variants[variant] || variants.default;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        backgroundColor: v.bg,
        color: v.color,
        border: v.border,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        ...t,
      }}
    >
      {loading && <CircleNotch size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

/** Segmented Open / Closed toggle (replaces twin chip buttons) */
export function OpenClosedToggle({ showHistory, setShowHistory, openCount, closedCount, theme }) {
  const trackBg = theme.isDark ? 'rgba(210, 198, 182, 0.1)' : '#F2EFEA';
  const trackBorder = theme.isDark ? 'rgba(210, 198, 182, 0.18)' : '#E4DDD4';
  const trackInset = theme.isDark
    ? 'inset 0 2px 5px rgba(0,0,0,0.28), inset 0 1px 2px rgba(0,0,0,0.18)'
    : 'inset 0 2px 5px rgba(100, 85, 70, 0.07), inset 0 1px 2px rgba(0,0,0,0.05)';
  const activeBg = theme.primaryDark || theme.primary || '#2d5a3a';
  const inactiveColor = theme.textLight || '#8A8077';
  const activeShadow = theme.isDark
    ? '0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
    : '0 1px 3px rgba(80, 65, 50, 0.12), inset 0 1px 0 rgba(255,255,255,0.25)';
  const inactiveShadow = theme.isDark
    ? 'inset 0 1px 2px rgba(0,0,0,0.12)'
    : 'inset 0 1px 2px rgba(100, 85, 70, 0.06)';

  return (
    <div
      role="tablist"
      aria-label="Open or closed reports"
      style={{
        display: 'flex',
        padding: '3px',
        borderRadius: '10px',
        backgroundColor: trackBg,
        border: `1px solid ${trackBorder}`,
        boxShadow: trackInset,
        marginBottom: '10px',
        gap: '2px',
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={!showHistory}
        onClick={() => setShowHistory(false)}
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '7px 8px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
          backgroundColor: !showHistory ? activeBg : 'transparent',
          color: !showHistory ? theme.textOnPrimary || '#fff' : inactiveColor,
          boxShadow: !showHistory ? activeShadow : inactiveShadow,
        }}
      >
        <ChatCircle size={13} weight={!showHistory ? 'fill' : 'regular'} />
        <span>Open</span>
        <span style={{ fontSize: '10px', opacity: 0.92 }}>{openCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={showHistory}
        onClick={() => setShowHistory(true)}
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '7px 8px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
          backgroundColor: showHistory ? activeBg : 'transparent',
          color: showHistory ? theme.textOnPrimary || '#fff' : inactiveColor,
          boxShadow: showHistory ? activeShadow : inactiveShadow,
        }}
      >
        <CheckCircle size={13} weight={showHistory ? 'fill' : 'regular'} />
        <span>Closed</span>
        <span style={{ fontSize: '10px', opacity: 0.92 }}>{closedCount}</span>
      </button>
    </div>
  );
}

export function TypePill({ typeLabel }) {
  const pill = TYPE_PILL[typeLabel] || TYPE_PILL.Support;
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: '700',
        padding: '2px 8px',
        borderRadius: '999px',
        backgroundColor: pill.bg,
        color: pill.color,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {typeLabel}
    </span>
  );
}

export function ConfirmChip({ label, confirmLabel, armed, onArm, onConfirm, loading, variant = 'danger' }) {
  return (
    <ChipButton
      variant={armed ? variant : 'default'}
      active={armed}
      loading={loading}
      onClick={() => (armed ? onConfirm() : onArm())}
      style={armed ? {} : { color: '#991B1B', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
    >
      {armed ? confirmLabel : label}
    </ChipButton>
  );
}

export default function UserReportsInbox({
  theme: t,
  typeFilter,
  setTypeFilter,
  typeCounts,
  showHistory,
  setShowHistory,
  openCount,
  closedCount,
  filteredItems,
  selectedUserEmail,
  onSelectUser,
  selectedQueueItem,
  onSelectItem,
  selectedTicket,
  ticketMessages,
  fromTheTeamMessages = [],
  fromTheTeamLoading = false,
  formatRelativeTime,
  getTierBadge,
  showTools,
  setShowTools,
  toolsContent,
  reopenedBanner,
  adminStatus,
  adminStatusOptions,
  onStatusChange,
  quickResponses,
  onQuickResponse,
  customMessage,
  setCustomMessage,
  onSendReply,
  sending,
  adminNotes,
  setAdminNotes,
  savingNotes,
  onCloseTicket,
  closingTicket,
  closeArmed,
  setCloseArmed,
  deleteArmed,
  setDeleteArmed,
  onDelete,
  deleting,
  onMarkReviewed,
  markingReviewed,
  onMarkUnread,
  onMarkRead,
  selectedIsUnread,
  isFeedback,
  conversationEndRef,
  plainStatusLabel,
  selectedUser = null,
  hasSelectedUser = false,
  isLoadingUserDetails = false,
  userSelectionError = null,
  activeReportContext = null,
  onAccountClose,
  onExtendTrial,
  isExtendingTrial = false,
}) {
  const LEFT_PANEL_WIDTH = 260;
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // On narrow screens, Account needs the middle column — collapse user list automatically
  useEffect(() => {
    if (accountExpanded && isNarrow) setLeftPanelCollapsed(true);
  }, [accountExpanded, isNarrow]);

  const accountFocusMode = accountExpanded && isNarrow;

  const handleSelectUser = useCallback(
    (email) => {
      onSelectUser(email);
      setLeftPanelCollapsed(true);
    },
    [onSelectUser]
  );

  useEffect(() => {
    if (!selectedUserEmail) setLeftPanelCollapsed(false);
  }, [selectedUserEmail]);

  useEffect(() => {
    setAccountExpanded(false);
  }, [selectedUserEmail]);

  const itemKey = (item) =>
    item.kind === 'feedback' ? `fb-${item.raw?.id}` : `sq-${item.raw?.logId}`;

  const selectedKey = selectedQueueItem ? itemKey(selectedQueueItem) : null;

  // ── Helpers mirrored from SupportChatModal ──────────────────────────────────
  const tsToMs = (ts) => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts?.toMillis === 'function') return ts.toMillis();
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    const sec = ts.seconds ?? ts._seconds;
    if (typeof sec === 'number') {
      const nano = ts.nanoseconds ?? ts._nanoseconds ?? 0;
      return sec * 1000 + Math.floor(nano / 1e6);
    }
    return 0;
  };

  const msgTypeLabel = (type) => {
    if (type === 'bug') return 'Bug Report';
    if (type === 'suggestion') return 'Suggestion';
    return 'Support Request';
  };
  const msgTypeColor = (type) => {
    if (type === 'bug') return { bg: '#FEE2E2', color: '#DC2626' };
    if (type === 'suggestion') return { bg: '#D1FAE5', color: '#065F46' };
    return { bg: '#DBEAFE', color: '#1D4ED8' };
  };
  const formatMsgDate = (ts) => {
    const ms = tsToMs(ts);
    if (!ms) return '';
    const d = new Date(ms);
    const diffDays = Math.floor((Date.now() - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Admin replies for suggestion/bug: historical From the Team pushes + feedback-doc / optimistic
  const feedbackAdminReplies = useMemo(() => {
    if (!isFeedback || !selectedQueueItem) return [];

    const normalize = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const out = [];
    const usedLoose = []; // { text, ms }

    const pushUnique = (key, message, createdAt) => {
      const text = (message || '').trim();
      if (!text) return;
      const loose = normalize(text);
      const ms = tsToMs(createdAt) || 0;
      const dup = usedLoose.some((u) => {
        if (u.text !== loose) return false;
        if (!u.ms || !ms) return true;
        return Math.abs(u.ms - ms) < 120000;
      });
      if (dup) return;
      usedLoose.push({ text: loose, ms });
      out.push({ key, message: text, createdAt: createdAt || null });
    };

    for (const m of fromTheTeamMessages || []) {
      pushUnique(`ftt-${m.id || m.messageId || out.length}`, m.message || m.text, m.createdAt);
    }

    const fb = selectedQueueItem.raw?._rawFeedback || selectedQueueItem.raw || {};
    if (Array.isArray(fb.adminReplies)) {
      fb.adminReplies.forEach((r, i) => {
        pushUnique(`fb-reply-${i}`, r.message || r.text, r.createdAt || r.responseDate);
      });
    } else if (fb.adminResponse) {
      pushUnique('fb-reply-latest', fb.adminResponse, fb.responseDate);
    }

    out.sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
    return out;
  }, [isFeedback, selectedQueueItem, fromTheTeamMessages]);

  // Group filteredItems by user email for the left column
  const userGroups = useMemo(() => {
    const groups = new Map();
    for (const item of (filteredItems || [])) {
      const email = item.email?.trim().toLowerCase() || 'unknown';
      if (!groups.has(email)) {
        groups.set(email, {
          email: item.email || email,
          items: [],
          lastActivity: 0,
          hasUnread: false,
          unreadCount: 0,
        });
      }
      const g = groups.get(email);
      g.items.push(item);
      if (item.dateMs > g.lastActivity) g.lastActivity = item.dateMs;
      if (item.unread) {
        g.hasUnread = true;
        g.unreadCount += 1;
      }
    }
    return [...groups.values()].sort((a, b) => {
      // Unread users float above read ones (Gmail-ish), then by recency
      if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
      return b.lastActivity - a.lastActivity;
    });
  }, [filteredItems]);

  const selectedGroup = useMemo(
    () => userGroups.find((g) => g.email?.trim().toLowerCase() === selectedUserEmail) || null,
    [userGroups, selectedUserEmail]
  );

  // Build the render list — same algorithm as SupportChatModal
  const renderItems = useMemo(() => {
    const items = [];
    let lastTicketId = null;
    for (let i = 0; i < (ticketMessages || []).length; i++) {
      const msg = ticketMessages[i];
      if (msg._ticketId !== lastTicketId) {
        lastTicketId = msg._ticketId;
        const tc = msgTypeColor(msg._ticketType);
        const ticketMsgs = ticketMessages.filter((m) => m._ticketId === msg._ticketId);
        items.push({
          type: 'divider',
          key: `divider-${msg._ticketId || i}-${items.length}`,
          ticketNumber: msg._ticketNumber,
          ticketType: msg._ticketType,
          ticketStatus: msg._ticketStatus,
          tc,
          date: ticketMsgs[0]?.createdAt,
        });
      }
      items.push({ type: 'message', key: msg.id || `msg-${i}`, msg });
    }
    return items;
  }, [ticketMessages]);

  const showConversationPane = Boolean(selectedQueueItem);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        width: '100%',
        maxWidth: showConversationPane ? '100%' : 'min(100%, 920px)',
        height: 'calc(100vh - 95px)',
        border: 0,
        borderTop: `1px solid ${t.border}`,
        overflow: 'hidden',
        backgroundColor: t.cardBackground || '#fff',
      }}
    >
      {/* Expand rail — when user list is collapsed */}
      {leftPanelCollapsed && (
        <button
          type="button"
          onClick={() => setLeftPanelCollapsed(false)}
          title="Show all user reports"
          style={{
            width: '36px',
            flexShrink: 0,
            border: 'none',
            borderRight: `1px solid ${t.border}`,
            backgroundColor: t.background || '#F9FAFB',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: t.primary,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = t.primary + '12'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = t.background || '#F9FAFB'; }}
        >
          <CaretRight size={18} weight="bold" />
          <List size={16} />
        </button>
      )}

      {/* ═══ COL 1 — User List (collapsible) ═════════════════════════════════ */}
      <div
        style={{
          width: leftPanelCollapsed ? 0 : LEFT_PANEL_WIDTH,
          minWidth: leftPanelCollapsed ? 0 : LEFT_PANEL_WIDTH,
          flexShrink: 0,
          borderRight: leftPanelCollapsed ? 'none' : `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: t.background || '#F9FAFB',
          overflow: 'hidden',
          opacity: leftPanelCollapsed ? 0 : 1,
          pointerEvents: leftPanelCollapsed ? 'none' : 'auto',
          transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        }}
      >
        {/* Funnel header */}
        <div style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: t.text, flexShrink: 0 }}>User Reports</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <ChipButton
                active={showTools}
                onClick={() => setShowTools((v) => !v)}
                style={{ padding: '4px 10px', fontSize: '10px' }}
                title="Admin tools"
              >
                <Wrench size={12} /> Tools {showTools ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </ChipButton>
              {selectedUserEmail && (
                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed(true)}
                  title="Hide list and focus on this user"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.cardBackground,
                    color: t.textLight,
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <CaretLeft size={12} />
                  Hide
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {FILTER_TABS.map((tab) => (
              <ChipButton
                key={tab.id}
                active={typeFilter === tab.id}
                onClick={() => setTypeFilter(tab.id)}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                {tab.label}
                <span style={{ fontSize: '10px', opacity: 0.85, marginLeft: '2px' }}>
                  {typeCounts[tab.id] ?? 0}
                </span>
              </ChipButton>
            ))}
          </div>
          <OpenClosedToggle
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            openCount={openCount}
            closedCount={closedCount}
            theme={t}
          />
        </div>

        {showTools && (
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${t.border}`,
              maxHeight: '32vh',
              overflowY: 'auto',
              flexShrink: 0,
              backgroundColor: t.cardBackground,
            }}
          >
            {toolsContent}
          </div>
        )}

        {/* User rows — one per unique email */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {userGroups.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: t.textLight, fontSize: '13px' }}>
              {showHistory ? 'No closed reports.' : 'All caught up! 🎉'}
            </div>
          ) : (
            userGroups.map((group) => {
              const normalizedEmail = group.email?.trim().toLowerCase();
              const isSelected = normalizedEmail === selectedUserEmail;
              return (
                <button
                  key={group.email}
                  type="button"
                  onClick={() => handleSelectUser(group.email)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 14px',
                    border: 'none',
                    borderBottom: `1px solid ${t.border}`,
                    borderLeft: isSelected ? `3px solid ${t.primary}` : '3px solid transparent',
                    backgroundColor: isSelected
                      ? (t.primary + '12')
                      : group.hasUnread
                        ? (t.primary + '08')
                        : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '5px' }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: group.hasUnread ? '700' : '500',
                      color: t.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {group.email}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      {group.hasUnread && (
                        <span
                          title={`${group.unreadCount} unread`}
                          style={{
                            minWidth: '16px',
                            height: '16px',
                            padding: '0 4px',
                            borderRadius: '999px',
                            backgroundColor: t.primary,
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {group.unreadCount}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: t.textLight, fontWeight: group.hasUnread ? '600' : '400' }}>
                        {formatRelativeTime(group.lastActivity)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: t.textLight, fontWeight: group.hasUnread ? '600' : '400' }}>
                      {group.items.length} report{group.items.length !== 1 ? 's' : ''}
                      {group.hasUnread ? ` · ${group.unreadCount} unread` : ''}
                    </span>
                    <span style={{ fontSize: '10px', color: t.textLight, opacity: 0.5 }}>·</span>
                    {[...new Set(group.items.map((i) => i.typeLabel))].slice(0, 3).map((label) => (
                      <TypePill key={label} typeLabel={label} />
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ COL 2 — Ticket Cards + Actions ═════════════════════════════════ */}
      <div
        style={{
          flex: accountFocusMode ? '1 1 auto' : (showConversationPane ? '0 0 auto' : '1 1 0'),
          width: accountFocusMode
            ? '100%'
            : showConversationPane
              ? (accountExpanded ? 'min(420px, 40vw)' : 'min(280px, 28vw)')
              : undefined,
          minWidth: accountFocusMode ? 0 : (showConversationPane ? 260 : 280),
          maxWidth: accountFocusMode ? undefined : (showConversationPane ? 420 : undefined),
          flexShrink: showConversationPane && !accountFocusMode ? 0 : 1,
          borderRight: showConversationPane && !accountFocusMode ? `1px solid ${t.border}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: t.background || '#F9FAFB',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), flex 0.22s ease',
          minHeight: 0,
        }}
      >
        {/* Ticket actions */}
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {selectedQueueItem && !selectedTicket?.markedFixed && (
            <ConfirmChip
              label={isFeedback ? 'Mark resolved' : 'Close ticket'}
              confirmLabel={isFeedback ? 'Tap again to resolve' : 'Tap again to close'}
              armed={closeArmed}
              onArm={() => setCloseArmed(true)}
              onConfirm={onCloseTicket}
              loading={closingTicket}
              variant="success"
            />
          )}
          {selectedQueueItem && isFeedback && selectedQueueItem.feedbackStatus === 'new' && onMarkReviewed && (
            <ChipButton loading={markingReviewed} onClick={onMarkReviewed} style={{ fontSize: '11px' }}>
              Mark reviewed
            </ChipButton>
          )}
          {selectedQueueItem && selectedIsUnread && onMarkRead && (
            <ChipButton onClick={onMarkRead} style={{ fontSize: '11px' }} title="Mark as read">
              Mark read
            </ChipButton>
          )}
          {selectedQueueItem && !selectedIsUnread && onMarkUnread && (
            <ChipButton onClick={onMarkUnread} style={{ fontSize: '11px' }} title="Mark as unread">
              Mark unread
            </ChipButton>
          )}
        </div>
        {reopenedBanner}

        {!selectedUserEmail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.textLight, padding: '24px' }}>
            <ChatCircle size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, textAlign: 'center' }}>Select a user to view their reports</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* User header */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {leftPanelCollapsed && (
                  <button
                    type="button"
                    onClick={() => setLeftPanelCollapsed(false)}
                    title="Show all users"
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      backgroundColor: t.cardBackground,
                      color: t.primary,
                      cursor: 'pointer',
                    }}
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                )}
                <div style={{ fontSize: '13px', fontWeight: '700', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {selectedGroup?.email || selectedUserEmail}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {selectedQueueItem && (() => {
                  const badge = getTierBadge(selectedQueueItem.userAccountInfo);
                  return badge ? (
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', fontWeight: '600', backgroundColor: badge.bg, color: badge.fg }}>
                      {badge.label}
                    </span>
                  ) : null;
                })()}
                <span style={{ fontSize: '11px', color: t.textLight }}>
                  {selectedGroup?.items.length ?? 0} report{(selectedGroup?.items.length ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Account — collapsed by default; expands in place of report list */}
            <div
              style={{
                padding: '0 14px 10px',
                borderBottom: `1px solid ${t.border}`,
                flexShrink: 0,
              }}
            >
              <ChipButton
                active={accountExpanded}
                onClick={() => setAccountExpanded((v) => !v)}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  fontSize: '11px',
                }}
                title={accountExpanded ? 'Hide account tools and show reports' : 'Show account tools (sync, grants)'}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} weight={accountExpanded ? 'fill' : 'duotone'} />
                  Account
                </span>
                {accountExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </ChipButton>
              {accountExpanded && (
                <p style={{ margin: '6px 0 0', fontSize: '10px', color: t.textLight, lineHeight: 1.4 }}>
                  {accountFocusMode
                    ? 'Full-width for tools — tap below to return to the conversation'
                    : 'Auto-loaded from report — sync or grant here'}
                </p>
              )}
              {accountFocusMode && showConversationPane && (
                <ChipButton
                  active={false}
                  onClick={() => setAccountExpanded(false)}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                  }}
                  title="Return to conversation"
                >
                  <ChatCircle size={14} />
                  Back to conversation
                </ChipButton>
              )}
            </div>

            {accountExpanded ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                }}
              >
                {isLoadingUserDetails && !hasSelectedUser && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                    <AdminSpinner size={24} />
                  </div>
                )}
                {userSelectionError && !hasSelectedUser && (
                  <p style={{ padding: '12px 14px', fontSize: '12px', margin: 0, color: t.error || '#EF4444' }}>
                    {userSelectionError}
                  </p>
                )}
                {!hasSelectedUser && !isLoadingUserDetails && !userSelectionError && (
                  <p style={{ padding: '16px 14px', fontSize: '12px', textAlign: 'center', color: t.textLight, margin: 0 }}>
                    Select a report to load account tools
                  </p>
                )}
                {hasSelectedUser && selectedUser && (
                  <UserDetailPanel
                    user={selectedUser}
                    onClose={onAccountClose}
                    theme={t}
                    compact
                    reportContext={activeReportContext}
                    onExtendTrial={onExtendTrial}
                    isExtendingTrial={isExtendingTrial}
                    isLoadingDetails={isLoadingUserDetails}
                  />
                )}
              </div>
            ) : (
            /* Scrollable section: ticket cards + action controls */
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/* Ticket cards */}
              <div style={{ borderBottom: `1px solid ${t.border}` }}>
                {(selectedGroup?.items || []).map((item) => {
                  const key = itemKey(item);
                  const isSelected = key === selectedKey;
                  const statusPill = item.adminStatus ? STATUS_PILL[item.adminStatus] : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: `1px solid ${t.border}`,
                        borderLeft: isSelected ? `3px solid ${t.primary}` : '3px solid transparent',
                        backgroundColor: isSelected
                          ? (t.primary + '12')
                          : item.unread
                            ? (t.primary + '08')
                            : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {item.unread && (
                          <span
                            title="Unread"
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: t.primary,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <TypePill typeLabel={item.typeLabel} />
                        {item.ticketNumber && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: item.unread ? '800' : '700',
                            color: t.textLight,
                          }}>
                            #{item.ticketNumber}
                          </span>
                        )}
                        {statusPill && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            backgroundColor: statusPill.bg,
                            color: statusPill.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}>
                            {statusPill.label}
                          </span>
                        )}
                        <span style={{
                          fontSize: '10px',
                          color: t.textLight,
                          marginLeft: 'auto',
                          fontWeight: item.unread ? '700' : '400',
                        }}>
                          {formatRelativeTime(item.dateMs)}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: item.unread ? t.text : t.textLight,
                        fontWeight: item.unread ? '600' : '400',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.message}
                      </p>
                      {item.adminNotes ? (
                        <p style={{
                          margin: '4px 0 0',
                          fontSize: '10px',
                          color: t.textLight,
                          fontStyle: 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          Note: {item.adminNotes}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Action controls for selected ticket */}
              {!selectedQueueItem ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: t.textLight, fontSize: '12px' }}>
                  Select a report above to take action
                </div>
              ) : (
                <div style={{ padding: '14px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: t.textLight, display: 'block', marginBottom: '5px' }}>
                      Internal status
                    </label>
                    <CustomDropdown
                      value={adminStatus || ''}
                      onChange={(val) => onStatusChange(val || null)}
                      options={adminStatusOptions}
                      placeholder="Set status"
                      theme={t}
                      outlined
                      customShadow
                    />
                    <p style={{ margin: '6px 0 0', fontSize: '10px', color: t.textLight, lineHeight: 1.4 }}>
                      Working on it · Waiting for info · Known issue — just for you, not sent to the user
                    </p>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: t.textLight, display: 'block', marginBottom: '6px' }}>Quick replies</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {quickResponses.map((response) => (
                        <ChipButton
                          key={response.id}
                          active={(adminStatus || selectedTicket?.adminStatus) === response.id}
                          onClick={() => onQuickResponse(response)}
                          style={{ padding: '3px 9px', fontSize: '11px' }}
                        >
                          {response.label.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}
                        </ChipButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: t.textLight, display: 'block', marginBottom: '5px' }}>
                      Internal notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Where you left off, what you’re waiting on…"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: `1px solid ${t.border}`,
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: t.text,
                        backgroundColor: t.cardBackground,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                    {savingNotes && (
                      <span style={{ fontSize: '10px', color: t.primary, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CircleNotch size={10} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
                      </span>
                    )}
                  </div>

                  {onDelete && (
                    <div style={{ paddingTop: '12px', borderTop: `1px solid ${t.border}`, marginTop: '6px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#991B1B', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Danger zone
                      </div>
                      <ConfirmChip
                        label={selectedQueueItem.typeLabel === 'Deletion' ? 'Process deletion' : 'Delete report'}
                        confirmLabel="Tap again to delete"
                        armed={deleteArmed}
                        onArm={() => setDeleteArmed(true)}
                        onConfirm={onDelete}
                        loading={deleting}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ COL 3 — Conversation + Reply (hidden on narrow while Account is open) ═══ */}
      {showConversationPane && selectedUserEmail && !accountFocusMode && (
      <div
        style={{
          flex: '1 1 360px',
          minWidth: 280,
          maxWidth: 'min(520px, 48vw)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          backgroundColor: t.cardBackground,
        }}
      >
          <>
            {/* Scrollable conversation thread */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                backgroundColor: t.background,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Original report bubble — shown when a specific ticket is selected */}
              {selectedQueueItem && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      borderTopRightRadius: '3px',
                      backgroundColor: t.accent || (t.primary + '20'),
                      borderRight: `3px solid ${t.primary}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                      <User size={12} style={{ color: t.primary }} />
                      <span style={{ fontSize: '10px', fontWeight: '600', color: t.primary }}>User</span>
                      <TypePill typeLabel={selectedQueueItem.typeLabel} />
                      {selectedQueueItem.ticketNumber && (
                        <span style={{ fontSize: '10px', fontWeight: '700', color: t.textLight }}>
                          #{selectedQueueItem.ticketNumber}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: t.textLight, opacity: 0.6, marginLeft: '4px' }}>
                        {formatRelativeTime(selectedQueueItem.dateMs)}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: t.text }}>
                      {selectedQueueItem.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Full merged thread (support tickets) OR feedback admin replies */}
              {!isFeedback && selectedTicket?.ticketId ? (
                renderItems.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '13px', color: t.textLight, textAlign: 'center' }}>
                      No replies yet — send a reply on the right.
                    </p>
                  </div>
                ) : (
                  renderItems.map((item) => {
                    if (item.type === 'divider') {
                      return (
                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                          <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '999px', backgroundColor: item.tc.bg, color: item.tc.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              {msgTypeLabel(item.ticketType)}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: t.textLight }}>#{item.ticketNumber}</span>
                            {item.date && <span style={{ fontSize: '11px', color: t.textLight }}>· {formatMsgDate(item.date)}</span>}
                            {(item.ticketStatus === 'closed' || item.ticketStatus === 'resolved') && (
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', backgroundColor: t.isDark ? '#ffffff10' : '#00000010', color: t.textLight }}>
                                closed
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                        </div>
                      );
                    }
                    const { msg } = item;
                    const isAdmin =
                      msg.senderType === 'admin' || msg.senderType === 'ghost-worker' ||
                      msg.senderEmail?.includes('admin') || msg.senderEmail?.includes('thepepplanner.com');
                    const msgDate = formatMsgDate(msg.createdAt);
                    return (
                      <div key={item.key} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                        <div
                          style={{
                            maxWidth: '80%', padding: '10px 14px', borderRadius: '12px',
                            borderTopLeftRadius: isAdmin ? '3px' : '12px',
                            borderTopRightRadius: isAdmin ? '12px' : '3px',
                            backgroundColor: isAdmin ? (t.primary + '15') : (t.accent || t.primary + '20'),
                            borderLeft: isAdmin ? `3px solid ${t.primary}` : 'none',
                            borderRight: !isAdmin ? `3px solid ${t.primary}` : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                            {isAdmin ? <ShieldCheck size={12} style={{ color: t.primary }} /> : <User size={12} style={{ color: t.primary }} />}
                            <span style={{ fontSize: '10px', fontWeight: '600', color: t.primary }}>
                              {isAdmin ? 'The Pep Planner Team' : 'User'}
                            </span>
                            {msgDate && <span style={{ fontSize: '10px', color: t.textLight, opacity: 0.6, marginLeft: '4px' }}>{msgDate}</span>}
                          </div>
                          <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: t.text }}>
                            {msg.message || msg.text}
                          </p>
                          {msg.imageUrls?.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {msg.imageUrls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`Screenshot ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: `1px solid ${t.border}` }} loading="lazy" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : isFeedback ? (
                fromTheTeamLoading && feedbackAdminReplies.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '13px', color: t.textLight, textAlign: 'center', lineHeight: 1.6 }}>
                      Loading From the Team history…
                    </p>
                  </div>
                ) : feedbackAdminReplies.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '13px', color: t.textLight, textAlign: 'center', lineHeight: 1.6 }}>
                      No From the Team replies yet — your reply will show here and on their dashboard.
                    </p>
                  </div>
                ) : (
                  <>
                    {fromTheTeamMessages.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0 8px' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: t.textLight, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          From the Team · {feedbackAdminReplies.length}
                        </span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
                      </div>
                    )}
                    {feedbackAdminReplies.map((reply) => {
                      const msgDate = formatMsgDate(reply.createdAt);
                      return (
                        <div key={reply.key} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <div
                            style={{
                              maxWidth: '80%',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              borderTopLeftRadius: '3px',
                              backgroundColor: t.primary + '15',
                              borderLeft: `3px solid ${t.primary}`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                              <ShieldCheck size={12} style={{ color: t.primary }} />
                              <span style={{ fontSize: '10px', fontWeight: '600', color: t.primary }}>
                                The Pep Planner Team
                              </span>
                              {msgDate && (
                                <span style={{ fontSize: '10px', color: t.textLight, opacity: 0.6, marginLeft: '4px' }}>
                                  {msgDate}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: t.text }}>
                              {reply.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '13px', color: t.textLight, textAlign: 'center', lineHeight: 1.6 }}>
                    No conversation yet.
                  </p>
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>

            {/* Reply composer — pinned to bottom */}
            <div
              style={{
                borderTop: `1px solid ${t.border}`,
                padding: '12px 16px',
                flexShrink: 0,
                backgroundColor: t.cardBackground,
              }}
            >
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={isFeedback ? 'Reply appears as From the Team…' : selectedQueueItem ? `Reply to ${selectedQueueItem.email}…` : 'Select a report to reply…'}
                rows={3}
                disabled={!selectedQueueItem}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${t.border}`,
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: t.text,
                  backgroundColor: t.cardBackground,
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  opacity: selectedQueueItem ? 1 : 0.5,
                }}
              />
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <ChipButton
                  variant="send"
                  onClick={onSendReply}
                  disabled={!customMessage.trim() || !selectedQueueItem}
                  loading={sending}
                  style={{ padding: '7px 18px' }}
                >
                  <PaperPlaneTilt size={14} /> PaperPlaneTilt Reply
                </ChipButton>
              </div>
            </div>
          </>
      </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
