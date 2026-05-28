import React, { useMemo } from 'react';
import {
  Loader2, Send, CheckCircle2, MessageSquare, Search, Plus, GitCommit,
  ChevronDown, ChevronUp, User, ShieldCheck, X, ExternalLink, Wrench,
} from 'lucide-react';
import CustomDropdown from '../common/inputs/CustomDropdown';

export const TYPE_PILL = {
  Bug: { bg: '#FEE2E2', color: '#DC2626' },
  Suggestion: { bg: '#D1FAE5', color: '#065F46' },
  Support: { bg: '#DBEAFE', color: '#1D4ED8' },
  Deletion: { bg: '#FFEDD5', color: '#C2410C' },
};

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'bug', label: 'Bugs' },
  { id: 'suggestion', label: 'Suggestions' },
  { id: 'support', label: 'Support' },
  { id: 'deletion', label: 'Deletions' },
];

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
      {loading && <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
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
  isFeedback,
  conversationEndRef,
  plainStatusLabel,
}) {
  const itemKey = (item) =>
    item.kind === 'feedback' ? `fb-${item.raw?.id}` : `sq-${item.raw?.logId}`;

  const selectedKey = selectedQueueItem ? itemKey(selectedQueueItem) : null;

  // ── Helpers mirrored from SupportChatModal ──────────────────────────────────
  const tsToMs = (ts) => {
    if (!ts) return 0;
    if (typeof ts?.toMillis === 'function') return ts.toMillis();
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
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
  const userGroups = useMemo(() => {
    const groups = new Map();
    for (const item of (filteredItems || [])) {
      const email = item.email?.trim().toLowerCase() || 'unknown';
      if (!groups.has(email)) {
        groups.set(email, { email: item.email || email, items: [], lastActivity: 0, hasNew: false });
      }
      const g = groups.get(email);
      g.items.push(item);
      if (item.dateMs > g.lastActivity) g.lastActivity = item.dateMs;
      if (!item.adminStatus) g.hasNew = true;
    }
    return [...groups.values()].sort((a, b) => b.lastActivity - a.lastActivity);
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

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 95px)',
        border: 0,
        borderTop: `1px solid ${t.border}`,
        overflow: 'hidden',
        backgroundColor: t.cardBackground || '#fff',
      }}
    >
      {/* ═══ COL 1 — User List ═══════════════════════════════════════════════ */}
      <div
        style={{
          width: '260px',
          flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: t.background || '#F9FAFB',
        }}
      >
        {/* Filter header */}
        <div style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: t.text, marginBottom: '10px' }}>User Reports</div>
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
          <div style={{ display: 'flex', gap: '6px' }}>
            <ChipButton active={!showHistory} onClick={() => setShowHistory(false)} variant="primary" style={{ flex: 1, justifyContent: 'center', fontSize: '11px' }}>
              <MessageSquare size={12} /> Open ({openCount})
            </ChipButton>
            <ChipButton active={showHistory} onClick={() => setShowHistory(true)} variant="primary" style={{ flex: 1, justifyContent: 'center', fontSize: '11px' }}>
              <CheckCircle2 size={12} /> Closed ({closedCount})
            </ChipButton>
          </div>
        </div>

        {/* User rows — one per unique email */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
                  onClick={() => onSelectUser(group.email)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 14px',
                    border: 'none',
                    borderBottom: `1px solid ${t.border}`,
                    borderLeft: isSelected ? `3px solid ${t.primary}` : '3px solid transparent',
                    backgroundColor: isSelected ? (t.primary + '12') : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {group.email}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      {group.hasNew && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: t.primary, display: 'inline-block' }} />
                      )}
                      <span style={{ fontSize: '10px', color: t.textLight }}>
                        {formatRelativeTime(group.lastActivity)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: t.textLight }}>
                      {group.items.length} report{group.items.length !== 1 ? 's' : ''}
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
          width: '300px',
          flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: t.background || '#F9FAFB',
        }}
      >
        {/* Tools toggle + Close chip */}
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChipButton active={showTools} onClick={() => setShowTools((v) => !v)} style={{ fontSize: '11px' }}>
            <Wrench size={12} /> Tools {showTools ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </ChipButton>
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
        </div>
        {showTools && (
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, maxHeight: '35vh', overflowY: 'auto', backgroundColor: t.background }}>
            {toolsContent}
          </div>
        )}
        {reopenedBanner}

        {!selectedUserEmail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.textLight, padding: '24px' }}>
            <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, textAlign: 'center' }}>Select a user to view their reports</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* User header */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                {selectedGroup?.email || selectedUserEmail}
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

            {/* Scrollable section: ticket cards + action controls */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Ticket cards */}
              <div style={{ borderBottom: `1px solid ${t.border}` }}>
                {(selectedGroup?.items || []).map((item) => {
                  const key = itemKey(item);
                  const isSelected = key === selectedKey;
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
                        backgroundColor: isSelected ? (t.primary + '12') : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <TypePill typeLabel={item.typeLabel} />
                        {item.ticketNumber && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: t.textLight }}>#{item.ticketNumber}</span>
                        )}
                        <span style={{ fontSize: '10px', color: t.textLight, marginLeft: 'auto' }}>
                          {formatRelativeTime(item.dateMs)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: t.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.message}
                      </p>
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
                  {!isFeedback && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: t.textLight, display: 'block', marginBottom: '5px' }}>Status</label>
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
                  )}

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

                  {!isFeedback && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: t.textLight, display: 'block', marginBottom: '5px' }}>Admin notes</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                        placeholder="Internal notes…"
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
                          <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
                        </span>
                      )}
                    </div>
                  )}

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
          </div>
        )}
      </div>

      {/* ═══ COL 3 — Conversation + Reply ════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: t.cardBackground }}>
        {!selectedUserEmail ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.textLight, padding: '40px' }}>
            <MessageSquare size={44} style={{ opacity: 0.18, marginBottom: '14px' }} />
            <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>Select a user to view the conversation</p>
          </div>
        ) : (
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

              {/* Full merged thread */}
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
              ) : selectedQueueItem ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '13px', color: t.textLight, textAlign: 'center', lineHeight: 1.6 }}>
                    {selectedQueueItem.typeLabel === 'Bug' || selectedQueueItem.typeLabel === 'Suggestion'
                      ? 'Feedback reports don\'t have a live thread.\nUse Send Reply below to respond — it appears on the user\'s dashboard.'
                      : 'No conversation yet.'}
                  </p>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '13px', color: t.textLight }}>Select a report from the middle panel to focus it.</p>
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
                  <Send size={14} /> Send Reply
                </ChipButton>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
