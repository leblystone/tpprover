import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  CircleNotch, PaperPlaneTilt, CheckCircle, ChatCircle, MagnifyingGlass, Plus, GitCommit,
  CaretDown, CaretUp, CaretLeft, CaretRight, User, ShieldCheck, X, ArrowSquareOut, Wrench, List,
  EnvelopeSimple, Bug, Lightbulb, Lifebuoy, Trash, ArrowLeft, Smiley, Clock,
} from '@phosphor-icons/react';
import CustomDropdown from '../common/inputs/CustomDropdown';
import { UserDetailPanel } from './UserDetailModal';
import { AdminSpinner } from './adminUi';

export const TYPE_PILL = {
  Bug: { bg: '#FEE2E2', color: '#DC2626', icon: Bug },
  Suggestion: { bg: '#D1FAE5', color: '#065F46', icon: Lightbulb },
  Support: { bg: '#DBEAFE', color: '#1D4ED8', icon: Lifebuoy },
  Deletion: { bg: '#FFEDD5', color: '#C2410C', icon: Trash },
};

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

/** Segmented Open / Closed — matches Notifications Tracking / Templates control */
export function OpenClosedToggle({ showHistory, setShowHistory, openCount, closedCount, theme }) {
  const trackBg = theme.isDark ? 'rgba(255,255,255,0.06)' : '#e8eaed';
  const inactiveColor = theme.text || '#374151';

  return (
    <div
      role="tablist"
      aria-label="Open or closed reports"
      style={{
        display: 'flex',
        width: '100%',
        padding: '4px',
        borderRadius: '12px',
        backgroundColor: trackBg,
        border: `1px solid ${theme.border}`,
        gap: '4px',
      }}
    >
      {[
        { id: 'open', label: 'Open', count: openCount, active: !showHistory, Icon: ChatCircle, onClick: () => setShowHistory(false) },
        { id: 'closed', label: 'Closed', count: closedCount, active: showHistory, Icon: CheckCircle, onClick: () => setShowHistory(true) },
      ].map(({ id, label, count, active, Icon, onClick }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={onClick}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            backgroundColor: active ? (theme.primary || '#2d5a3a') : 'transparent',
            color: active ? '#fff' : inactiveColor,
          }}
        >
          <Icon size={16} weight={active ? 'fill' : 'regular'} />
          <span>{label}</span>
          <span style={{ fontSize: '11px', opacity: active ? 0.9 : 0.65, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        </button>
      ))}
    </div>
  );
}

export function TypePill({ typeLabel }) {
  const pill = TYPE_PILL[typeLabel] || TYPE_PILL.Support;
  const Icon = pill.icon || Lifebuoy;
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
      }}
    >
      <Icon size={10} weight="bold" />
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
  typeCounts: _typeCounts,
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
  const LEFT_PANEL_WIDTH = 280;
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [listSearch, setListSearch] = useState('');
  /** Quick filter from summary cards: all | unread | bug | support | recent7 */
  const [quickFilter, setQuickFilter] = useState('all');
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Desktop only: Account expand can collapse the list to free space
  useEffect(() => {
    if (accountExpanded && !isNarrow) setLeftPanelCollapsed(true);
  }, [accountExpanded, isNarrow]);

  const accountFocusMode = accountExpanded && isNarrow;
  const showListPane = !isNarrow || !selectedUserEmail;
  const showDetailPane = !isNarrow || Boolean(selectedUserEmail);

  const handleSelectUser = useCallback(
    (email) => {
      onSelectUser(email);
      // Desktop: collapse list to focus the conversation; narrow uses full drill-down
      if (!isNarrow) setLeftPanelCollapsed(true);
    },
    [onSelectUser, isNarrow]
  );

  const handleBackToList = useCallback(() => {
    if (typeof onAccountClose === 'function') onAccountClose();
    onSelectUser(null);
    setLeftPanelCollapsed(false);
    setAccountExpanded(false);
    setMobileToolsOpen(false);
  }, [onAccountClose, onSelectUser]);

  useEffect(() => {
    if (!selectedUserEmail) setLeftPanelCollapsed(false);
  }, [selectedUserEmail]);

  useEffect(() => {
    setAccountExpanded(false);
    setMobileToolsOpen(false);
  }, [selectedUserEmail]);

  // Reset desktop collapse when switching to narrow drill-down
  useEffect(() => {
    if (isNarrow) setLeftPanelCollapsed(false);
  }, [isNarrow]);

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

  // Group filteredItems by user email for the left column
  const poolItems = useMemo(() => filteredItems || [], [filteredItems]);

  const sevenDaysAgoMs = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const quickCounts = useMemo(() => {
    let unread = 0;
    let bug = 0;
    let support = 0;
    let recent7 = 0;
    for (const item of poolItems) {
      if (item.unread) unread += 1;
      if (item.typeCategory === 'bug') bug += 1;
      if (item.typeCategory === 'support') support += 1;
      if ((item.dateMs || 0) >= sevenDaysAgoMs) recent7 += 1;
    }
    return {
      all: poolItems.length,
      unread,
      bug,
      support,
      recent7,
    };
  }, [poolItems, sevenDaysAgoMs]);

  const scopedItems = useMemo(() => {
    if (quickFilter === 'unread') return poolItems.filter((item) => item.unread);
    if (quickFilter === 'bug') return poolItems.filter((item) => item.typeCategory === 'bug');
    if (quickFilter === 'support') return poolItems.filter((item) => item.typeCategory === 'support');
    if (quickFilter === 'recent7') return poolItems.filter((item) => (item.dateMs || 0) >= sevenDaysAgoMs);
    return poolItems;
  }, [poolItems, quickFilter, sevenDaysAgoMs]);

  const userGroups = useMemo(() => {
    const groups = new Map();
    for (const item of scopedItems) {
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
  }, [scopedItems]);

  const selectedGroup = useMemo(
    () => userGroups.find((g) => g.email?.trim().toLowerCase() === selectedUserEmail) || null,
    [userGroups, selectedUserEmail]
  );

  const visibleUserGroups = useMemo(() => {
    const needle = listSearch.trim().toLowerCase();
    if (!needle) return userGroups;
    return userGroups.filter((g) => (g.email || '').toLowerCase().includes(needle));
  }, [userGroups, listSearch]);

  const applyQuickFilter = useCallback(
    (next) => {
      if (next === 'all') {
        setQuickFilter('all');
        if (showHistory) setShowHistory(false);
        return;
      }
      setQuickFilter((prev) => (prev === next ? 'all' : next));
    },
    [showHistory, setShowHistory]
  );

  // Auto-select newest unread (else newest) report so actions/reply always have context
  useEffect(() => {
    if (!selectedUserEmail || !selectedGroup?.items?.length) return;
    const stillValid = selectedQueueItem && selectedGroup.items.some((i) => itemKey(i) === itemKey(selectedQueueItem));
    if (stillValid) return;
    const pick = selectedGroup.items.find((i) => i.unread) || selectedGroup.items[0];
    if (pick) onSelectItem(pick);
  }, [selectedUserEmail, selectedGroup, selectedQueueItem, onSelectItem]);

  // One blended timeline: all ticket messages + openers for feedback not yet linked to a ticket
  const renderItems = useMemo(() => {
    const items = [];
    let lastTicketId = null;
    const coveredTicketIds = new Set();
    const coveredFeedbackIds = new Set();

    for (let i = 0; i < (ticketMessages || []).length; i++) {
      const msg = ticketMessages[i];
      if (msg._ticketId !== lastTicketId) {
        lastTicketId = msg._ticketId;
        coveredTicketIds.add(msg._ticketId);
        if (msg._feedbackId) coveredFeedbackIds.add(msg._feedbackId);
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

    // Unlinked feedback still needs to appear in the blend
    for (const item of selectedGroup?.items || []) {
      if (item.kind !== 'feedback') continue;
      const fbId = item.raw?.id || item.raw?._rawFeedback?.id;
      const linked = item.raw?._rawFeedback?.linkedTicketId || item.raw?.ticketId;
      if (linked && coveredTicketIds.has(linked)) continue;
      if (fbId && coveredFeedbackIds.has(fbId)) continue;
      const typeKey = (item.typeCategory === 'suggestion' ? 'suggestion' : 'bug');
      const tc = msgTypeColor(typeKey);
      items.push({
        type: 'divider',
        key: `divider-fb-${fbId || item.dateMs}`,
        ticketNumber: item.ticketNumber || null,
        ticketType: typeKey,
        ticketStatus: item.feedbackStatus || 'new',
        tc,
        date: item.dateMs ? new Date(item.dateMs) : null,
      });
      items.push({
        type: 'message',
        key: `synth-fb-${fbId || item.dateMs}`,
        msg: {
          message: item.message,
          text: item.message,
          senderType: 'user',
          createdAt: item.dateMs ? new Date(item.dateMs) : null,
          _ticketType: typeKey,
          _synthetic: true,
          _queueKey: itemKey(item),
        },
      });
    }

    items.sort((a, b) => {
      const ta = a.type === 'divider'
        ? tsToMs(a.date)
        : tsToMs(a.msg?.createdAt);
      const tb = b.type === 'divider'
        ? tsToMs(b.date)
        : tsToMs(b.msg?.createdAt);
      if (ta !== tb) return ta - tb;
      if (a.type === 'divider' && b.type !== 'divider') return -1;
      if (b.type === 'divider' && a.type !== 'divider') return 1;
      return 0;
    });

    return items;
  }, [ticketMessages, selectedGroup]);

  const showConversationPane = Boolean(selectedUserEmail);
  const stackDetailPanes = isNarrow && showDetailPane;
  const listOnlyDesktop = !isNarrow && !showConversationPane;
  const listOnlyLayout = !showConversationPane;
  const panelShadow = t.isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(47,59,58,0.05)';
  const panelCardStyle = {
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    boxShadow: panelShadow,
    overflow: 'hidden',
    backgroundColor: t.cardBackground || t.surface || '#fff',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: stackDetailPanes ? 'column' : 'row',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        width: '100%',
        maxWidth: 'none',
        flex: 1,
        margin: 0,
        padding: '8px',
        gap: '8px',
        boxSizing: 'border-box',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        border: 0,
        overflow: 'hidden',
        backgroundColor: t.background || '#F9FAFB',
      }}
    >
      {/* Expand rail — desktop only when user list is collapsed */}
      {!isNarrow && leftPanelCollapsed && (
        <button
          type="button"
          onClick={() => setLeftPanelCollapsed(false)}
          title="Show all user reports"
          style={{
            width: '36px',
            flexShrink: 0,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            backgroundColor: t.cardBackground || '#fff',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: t.primary,
            transition: 'background 0.15s',
            boxShadow: panelShadow,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = t.primary + '12'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = t.cardBackground || '#fff'; }}
        >
          <CaretRight size={18} weight="bold" />
          <List size={16} />
        </button>
      )}

      {/* ═══ COL 1 — User List ═══════════════════════════════════════════════ */}
      {showListPane && (
      <div
        style={{
          width: isNarrow || listOnlyLayout
            ? '100%'
            : (leftPanelCollapsed ? 0 : Math.max(LEFT_PANEL_WIDTH, 300)),
          minWidth: isNarrow || listOnlyLayout
            ? 0
            : (leftPanelCollapsed ? 0 : Math.max(LEFT_PANEL_WIDTH, 300)),
          flex: isNarrow || listOnlyLayout ? '1 1 auto' : undefined,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          opacity: (!isNarrow && leftPanelCollapsed) ? 0 : 1,
          pointerEvents: (!isNarrow && leftPanelCollapsed) ? 'none' : 'auto',
          transition: isNarrow
            ? 'none'
            : 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          ...panelCardStyle,
        }}
      >
        {/* Funnel header — Notifications tracker language */}
        <div
          style={{
            padding: '14px',
            borderBottom: `1px solid ${t.border}`,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: t.cardBackground || t.surface || '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '7px',
                  borderRadius: '12px',
                  backgroundColor: `${t.primary || '#2d5a3a'}18`,
                  flexShrink: 0,
                }}
              >
                <Lifebuoy size={18} weight="regular" style={{ color: t.primary }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: t.text, lineHeight: 1.2 }}>User Reports</div>
                <div style={{ fontSize: '11px', color: t.textLight, marginTop: '2px' }}>
                  {visibleUserGroups.length} user{visibleUserGroups.length !== 1 ? 's' : ''}
                  {listSearch.trim() ? ' match' : ''}
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0, maxWidth: listOnlyLayout ? '480px' : '280px' }}>
              <MagnifyingGlass
                size={15}
                weight="regular"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: t.textLight,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search by email…"
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '999px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                  color: t.text,
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: t.isDark ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <ChipButton
                active={showTools}
                onClick={() => setShowTools((v) => !v)}
                style={{
                  padding: '7px 12px',
                  fontSize: '11px',
                  borderRadius: '999px',
                  boxShadow: t.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)',
                }}
                title="Admin tools"
              >
                <Wrench size={13} weight="regular" /> Tools {showTools ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </ChipButton>
              {!isNarrow && selectedUserEmail && (
                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed(true)}
                  title="Hide list and focus on this user"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 10px',
                    borderRadius: '999px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.cardBackground,
                    color: t.textLight,
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: t.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <CaretLeft size={12} />
                  Hide
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: listOnlyLayout
                ? 'repeat(auto-fit, minmax(140px, 1fr))'
                : '1fr 1fr',
              gap: '8px',
            }}
          >
            {[
              {
                key: 'all',
                label: 'Open',
                value: openCount,
                color: t.primary || '#2d5a3a',
                Icon: ChatCircle,
                active: quickFilter === 'all' && !showHistory,
              },
              {
                key: 'unread',
                label: 'Unread',
                value: quickCounts.unread,
                color: '#3b82f6',
                Icon: EnvelopeSimple,
                active: quickFilter === 'unread',
              },
              {
                key: 'bug',
                label: 'Bugs',
                value: quickCounts.bug,
                color: '#ef4444',
                Icon: Bug,
                active: quickFilter === 'bug',
              },
              {
                key: 'support',
                label: 'Support',
                value: quickCounts.support,
                color: '#1D4ED8',
                Icon: Lifebuoy,
                active: quickFilter === 'support',
              },
              {
                key: 'recent7',
                label: 'Last 7d',
                value: quickCounts.recent7,
                color: '#0d9488',
                Icon: Clock,
                active: quickFilter === 'recent7',
              },
            ].map(({ key, label, value, color, Icon, active }) => (
              <button
                key={key}
                type="button"
                onClick={() => applyQuickFilter(key)}
                aria-pressed={active}
                title={
                  key === 'all'
                    ? 'Show all open reports'
                    : key === 'recent7'
                      ? 'Show reports from the last 7 days'
                      : `Filter to ${label.toLowerCase()} reports`
                }
                style={{
                  borderRadius: '16px',
                  border: active ? `1.5px solid ${color}` : `1px solid ${t.border}`,
                  backgroundColor: active
                    ? `${color}14`
                    : t.isDark
                      ? 'rgba(255,255,255,0.03)'
                      : '#fff',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: t.isDark
                    ? '0 4px 16px rgba(0,0,0,0.2)'
                    : '0 4px 16px rgba(47,59,58,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  width: '100%',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    padding: '7px',
                    borderRadius: '12px',
                    backgroundColor: `${color}18`,
                    display: 'flex',
                  }}
                >
                  <Icon size={16} weight={active ? 'fill' : 'regular'} style={{ color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: active ? color : t.textLight,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      fontVariantNumeric: 'tabular-nums',
                      color: t.text,
                      lineHeight: 1.15,
                      marginTop: '2px',
                    }}
                  >
                    {value}
                  </div>
                </div>
              </button>
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
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visibleUserGroups.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: t.textLight, fontSize: '13px' }}>
              {listSearch.trim() ? (
                <p style={{ margin: 0 }}>No users match “{listSearch.trim()}”.</p>
              ) : showHistory ? (
                <p style={{ margin: 0 }}>No closed reports.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Smiley size={28} weight="regular" style={{ color: t.primary, opacity: 0.45 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>All caught up</p>
                </div>
              )}
            </div>
          ) : (
            visibleUserGroups.map((group) => {
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
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: `1px solid ${isSelected ? (t.primary || '#2d5a3a') : t.border}`,
                    backgroundColor: isSelected
                      ? `${t.primary}12`
                      : (t.cardBackground || t.surface || '#fff'),
                    cursor: 'pointer',
                    transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
                    boxShadow: t.isDark
                      ? '0 4px 16px rgba(0,0,0,0.2)'
                      : '0 4px 16px rgba(47,59,58,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: group.hasUnread ? '700' : '600',
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
                            minWidth: '18px',
                            height: '18px',
                            padding: '0 5px',
                            borderRadius: '999px',
                            backgroundColor: t.primary,
                            color: '#fff',
                            fontSize: '10px',
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
      )}

      {/* ═══ COL 2 — Ticket Cards + Actions (compact header on mobile) ═══ */}
      {showDetailPane && !listOnlyDesktop && (
      <div
        style={{
          flex: stackDetailPanes
            ? '0 0 auto'
            : accountFocusMode
              ? '1 1 auto'
              : '0 0 320px',
          width: stackDetailPanes
            ? '100%'
            : accountFocusMode
              ? '100%'
              : (accountExpanded ? 'min(380px, 36vw)' : '320px'),
          minWidth: stackDetailPanes || accountFocusMode ? 0 : 280,
          maxWidth: stackDetailPanes
            ? '100%'
            : accountFocusMode
              ? undefined
              : 380,
          flexShrink: stackDetailPanes ? 0 : 0,
          display: 'flex',
          flexDirection: 'column',
          transition: stackDetailPanes ? 'none' : 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), flex 0.22s ease',
          minHeight: 0,
          maxHeight: stackDetailPanes && !accountExpanded ? 'none' : undefined,
          position: stackDetailPanes ? 'relative' : undefined,
          zIndex: stackDetailPanes ? 2 : undefined,
          ...panelCardStyle,
          backgroundColor: t.background || '#F9FAFB',
        }}
      >
        {/* Ticket actions — compact on mobile, full toolbar on desktop */}
        {isNarrow && selectedUserEmail ? (
          <div
            style={{
              padding: '8px 10px',
              borderBottom: `1px solid ${t.border}`,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: t.cardBackground || '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleBackToList}
                title="Back to user list"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.background || '#F9FAFB',
                  color: t.text,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={16} weight="bold" />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedGroup?.email || selectedUserEmail}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {selectedQueueItem && (() => {
                    const badge = getTierBadge(selectedQueueItem.userAccountInfo);
                    return badge ? (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, fontWeight: 600, backgroundColor: badge.bg, color: badge.fg }}>
                        {badge.label}
                      </span>
                    ) : null;
                  })()}
                  <span style={{ fontSize: 11, color: t.textLight }}>
                    {selectedGroup?.items.length ?? 0} report{(selectedGroup?.items.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <ChipButton
                active={mobileToolsOpen}
                onClick={() => {
                  setAccountExpanded(false);
                  setMobileToolsOpen((v) => !v);
                }}
                style={{ padding: '8px 10px', fontSize: 11, flexShrink: 0 }}
                title="Admin tools"
              >
                <Wrench size={14} />
                Tools
              </ChipButton>
              <ChipButton
                active={accountExpanded}
                onClick={() => {
                  setMobileToolsOpen(false);
                  setAccountExpanded((v) => !v);
                }}
                style={{ padding: '8px 10px', fontSize: 11, flexShrink: 0 }}
                title="Account tools"
              >
                <User size={14} weight={accountExpanded ? 'fill' : 'duotone'} />
              </ChipButton>
            </div>
            {!accountExpanded && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: 2,
                }}
              >
                {(selectedGroup?.items || []).map((item) => {
                  const key = itemKey(item);
                  const isSelected = key === selectedKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      title={item.message}
                      style={{
                        flex: '0 0 auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 9px',
                        borderRadius: 999,
                        border: `1px solid ${isSelected ? t.primary : t.border}`,
                        backgroundColor: isSelected ? `${t.primary}18` : t.background || '#F9FAFB',
                        cursor: 'pointer',
                      }}
                    >
                      {item.unread && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.primary, flexShrink: 0 }} />
                      )}
                      <TypePill typeLabel={item.typeLabel} />
                      {item.ticketNumber && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: t.textLight }}>#{item.ticketNumber}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {reopenedBanner}
          </div>
        ) : (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {selectedQueueItem && !selectedTicket?.markedFixed && (
              <ConfirmChip
                label="Close all"
                confirmLabel="Tap again to close all reports"
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
        )}
        {!isNarrow && reopenedBanner}

        {!selectedUserEmail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.textLight, padding: '24px' }}>
            <ChatCircle size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, textAlign: 'center' }}>Select a user to view their reports</p>
          </div>
        ) : isNarrow ? (
          /* Mobile: chat-first — account tools expand here; admin tools open as a sheet */
          accountExpanded ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                maxHeight: '100%',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>
                <ChipButton
                  active={false}
                  onClick={() => setAccountExpanded(false)}
                  style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: 12 }}
                  title="Return to conversation"
                >
                  <ChatCircle size={14} />
                  Back to conversation
                </ChipButton>
              </div>
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
          ) : null
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
                  Auto-loaded from report — sync or grant here
                </p>
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
            /* Compact report chips + action controls (chat is the blended timeline) */
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '10px 14px',
                  borderBottom: `1px solid ${t.border}`,
                  overflowX: 'auto',
                  flexShrink: 0,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {(selectedGroup?.items || []).map((item) => {
                  const key = itemKey(item);
                  const isSelected = key === selectedKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      title={item.message}
                      style={{
                        flex: '0 0 auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '999px',
                        border: `1px solid ${isSelected ? t.primary : t.border}`,
                        backgroundColor: isSelected ? `${t.primary}18` : t.cardBackground,
                        cursor: 'pointer',
                        maxWidth: '220px',
                      }}
                    >
                      {item.unread && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.primary, flexShrink: 0 }} />
                      )}
                      <TypePill typeLabel={item.typeLabel} />
                      {item.ticketNumber && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: t.textLight }}>#{item.ticketNumber}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action controls for selected report context */}
              {!selectedQueueItem ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: t.textLight, fontSize: '12px' }}>
                  Loading reports…
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

        {/* Mobile admin tools sheet — keeps chat viewport clean */}
        {isNarrow && selectedUserEmail && mobileToolsOpen && !accountExpanded && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 80,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
            onClick={() => setMobileToolsOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-label="Admin tools"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxHeight: '78vh',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                backgroundColor: t.cardBackground || '#fff',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: '12px 14px calc(16px + env(safe-area-inset-bottom, 0px))',
                boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Admin tools</div>
                <button
                  type="button"
                  onClick={() => setMobileToolsOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.background || '#F9FAFB',
                    color: t.textLight,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Close tools"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {selectedQueueItem && !selectedTicket?.markedFixed && (
                  <ConfirmChip
                    label="Close all"
                    confirmLabel="Tap again to close all reports"
                    armed={closeArmed}
                    onArm={() => setCloseArmed(true)}
                    onConfirm={onCloseTicket}
                    loading={closingTicket}
                    variant="success"
                  />
                )}
                {selectedQueueItem && isFeedback && selectedQueueItem.feedbackStatus === 'new' && onMarkReviewed && (
                  <ChipButton loading={markingReviewed} onClick={onMarkReviewed} style={{ fontSize: 11 }}>
                    Mark reviewed
                  </ChipButton>
                )}
                {selectedQueueItem && selectedIsUnread && onMarkRead && (
                  <ChipButton onClick={onMarkRead} style={{ fontSize: 11 }}>
                    Mark read
                  </ChipButton>
                )}
                {selectedQueueItem && !selectedIsUnread && onMarkUnread && (
                  <ChipButton onClick={onMarkUnread} style={{ fontSize: 11 }}>
                    Mark unread
                  </ChipButton>
                )}
              </div>

              {!selectedQueueItem ? (
                <p style={{ fontSize: 12, color: t.textLight, margin: 0 }}>Select a report first.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textLight, display: 'block', marginBottom: 5 }}>
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
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textLight, display: 'block', marginBottom: 6 }}>
                      Quick replies
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {quickResponses.map((response) => (
                        <ChipButton
                          key={response.id}
                          active={(adminStatus || selectedTicket?.adminStatus) === response.id}
                          onClick={() => onQuickResponse(response)}
                          style={{ padding: '5px 10px', fontSize: 11 }}
                        >
                          {response.label.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}
                        </ChipButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textLight, display: 'block', marginBottom: 5 }}>
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
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: t.text,
                        backgroundColor: t.background || '#F9FAFB',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                    {savingNotes && (
                      <span style={{ fontSize: 10, color: t.primary, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CircleNotch size={10} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
                      </span>
                    )}
                  </div>

                  {onDelete && (
                    <div style={{ paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#991B1B', marginBottom: 8, textTransform: 'uppercase' }}>
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ═══ COL 3 — Conversation + Reply (chat-first on narrow) ═══ */}
      {showDetailPane && showConversationPane && selectedUserEmail && !accountFocusMode && (
      <div
        style={{
          flex: stackDetailPanes ? '1 1 auto' : '1 1 0',
          minWidth: stackDetailPanes ? 0 : 320,
          maxWidth: '100%',
          width: stackDetailPanes ? '100%' : undefined,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...panelCardStyle,
        }}
      >
          <>
            {/* Scrollable conversation thread */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: isNarrow ? '12px 14px' : '14px 16px',
                backgroundColor: t.background || '#F9FAFB',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* One blended inbox for this user */}
              {renderItems.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '13px', color: t.textLight, textAlign: 'center' }}>
                    {fromTheTeamLoading ? 'Loading conversation…' : 'No messages yet — reply below to start their Support inbox thread.'}
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
                          {item.ticketNumber && (
                            <span style={{ fontSize: '11px', fontWeight: '600', color: t.textLight }}>#{item.ticketNumber}</span>
                          )}
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
                    <div key={item.key} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '80%', padding: '10px 14px', borderRadius: '12px',
                          borderTopLeftRadius: isAdmin ? '12px' : '3px',
                          borderTopRightRadius: isAdmin ? '3px' : '12px',
                          backgroundColor: isAdmin ? (t.primary + '15') : (t.accent || t.primary + '20'),
                          borderLeft: !isAdmin ? `3px solid ${t.primary}` : 'none',
                          borderRight: isAdmin ? `3px solid ${t.primary}` : 'none',
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
              )}
              <div ref={conversationEndRef} />
            </div>

            {/* Reply composer — pinned to bottom */}
            <div
              style={{
                borderTop: `1px solid ${t.border}`,
                padding: isNarrow ? '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))' : '12px 16px',
                flexShrink: 0,
                backgroundColor: t.cardBackground,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.cardBackground,
                  opacity: selectedQueueItem ? 1 : 0.5,
                }}
              >
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={selectedQueueItem ? `Reply to ${selectedQueueItem.email}…` : 'Select a user to reply…'}
                  rows={isNarrow ? 2 : 3}
                  disabled={!selectedQueueItem}
                  style={{
                    width: '100%',
                    padding: isNarrow ? '10px 12px 44px' : '12px 14px 48px',
                    borderRadius: '12px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: t.text,
                    backgroundColor: 'transparent',
                    resize: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                  }}
                >
                  <ChipButton
                    variant="send"
                    onClick={onSendReply}
                    disabled={!customMessage.trim() || !selectedQueueItem}
                    loading={sending}
                    style={{ padding: '7px 16px' }}
                  >
                    <PaperPlaneTilt size={14} /> Reply
                  </ChipButton>
                </div>
              </div>
            </div>
          </>
      </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
