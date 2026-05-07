import React, { useState, useEffect, useRef } from 'react'; // useRef kept for seenAtRef
import { Megaphone, Sparkles, Bug, Rocket, Users, ThumbsUp, Heart, Zap, CheckCheck } from 'lucide-react';
import { NewspaperClipping } from '@phosphor-icons/react';
import BottomSheet from '../common/BottomSheet';
import { formatMMDDYYYY } from '../../utils/date';

const getBody = (p) => p?.body || p?.message || p?.content || '';

// Softer, muted palette — readable but not harsh
const ADMIN_CATEGORY_META = {
  "What's New":   { color: '#818cf8' },   // indigo-400
  'Coming Up':    { color: '#fb923c' },   // orange-400
  'Known Bug':    { color: '#f87171' },   // red-400
  'Team Update':  { color: '#4ade80' },   // green-400
  // Legacy fallbacks
  'New Feature':  { color: '#818cf8' },
  'Improvement':  { color: '#818cf8' },
  'Patch Note':   { color: '#818cf8' },
  'In Progress':  { color: '#fb923c' },
  'WIP Bug':      { color: '#f87171' },
  'Community':    { color: '#4ade80' },
  'General':      { color: '#94a3b8' },
};

const TABS = [
  { id: "What's New",  label: "What's New",  Icon: Sparkles,  color: '#818cf8', match: (cat) => cat === "What's New" },
  { id: 'Coming Up',   label: 'Coming Up',   Icon: Rocket,    color: '#fb923c', match: (cat) => cat === 'Coming Up' },
  { id: 'Known Bug',   label: 'Known Bug',   Icon: Bug,       color: '#f87171', match: (cat) => cat === 'Known Bug' },
  { id: 'Team Update', label: 'Team Update', Icon: Users,     color: '#4ade80', match: (cat) => cat === 'Team Update' },
];

// Icon-based reactions — consistent with app design language, theme-aware
const REACTIONS = [
  { id: 'helpful',   Icon: ThumbsUp,   label: 'Helpful' },
  { id: 'love',      Icon: Heart,      label: 'Love it' },
  { id: 'exciting',  Icon: Zap,        label: 'Exciting' },
  { id: 'noted',     Icon: CheckCheck, label: 'Noted' },
];

function ChangelogEntry({ p, theme, globalCounts, myReactions, onReact, isNew, isLast, index }) {
  const meta = ADMIN_CATEGORY_META[p.category] ?? { color: '#94a3b8' };
  const accentColor = meta.color || theme.textLight;
  const body = getBody(p);

  // Newest posts (index 0, 1) get full opacity + slightly larger title; older ones fade slightly
  const isFresh = index < 2;

  return (
    <div
      className={`py-4 ${!isLast ? 'border-b' : ''}`}
      style={{
        borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        opacity: isFresh ? 1 : 0.72,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {p.category}
        </span>
        <span className="text-[11px] font-medium" style={{ color: theme.textLight }}>
          {formatMMDDYYYY(p.date)}
        </span>
        {isNew && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wider uppercase"
            style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
          >
            Unread
          </span>
        )}
      </div>

      {/* Title — larger for fresh posts */}
      <h3
        className={`font-bold leading-snug mb-2 ${isFresh ? 'text-xl' : 'text-base'}`}
        style={{ color: theme.text }}
      >
        {p.title}
      </h3>

      {body && (
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap mb-4"
          style={{ color: theme.isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}
        >
          {body}
        </div>
      )}

      {/* Reactions — counts are global across all users; highlight = this user reacted */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider mr-0.5" style={{ color: theme.textLight, opacity: 0.6 }}>React</span>
        {REACTIONS.map(({ id, Icon, label }) => {
          const count = (globalCounts[p.id] || {})[id] || 0;
          const hasReacted = (myReactions[p.id] || {})[id] === true;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onReact(p.id, id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 hover:opacity-90"
              style={{
                backgroundColor: hasReacted
                  ? (theme.isDark ? 'rgba(255,255,255,0.12)' : `${theme.primary}15`)
                  : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: hasReacted ? theme.primary : theme.textLight,
                border: `1px solid ${hasReacted ? (theme.isDark ? 'rgba(255,255,255,0.2)' : `${theme.primary}40`) : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
              }}
            >
              <Icon size={14} strokeWidth={hasReacted ? 2.5 : 1.8} />
              <span>{count > 0 ? count : label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AnnouncementsSheet({ open, onClose, theme }) {
  // globalCounts — { [postId]: { helpful: N, love: N, ... } } — from Firestore, visible to all users
  const [globalCounts, setGlobalCounts] = useState({});
  // myReactions — { [postId]: { helpful: true/false, ... } } — current user's choices from Firestore
  const [myReactions, setMyReactions] = useState({});

  const [posts, setPosts] = useState([]);
  // null = show all (default); string = filtered to one tab
  const [filter, setFilter] = useState(null);

  const seenAtRef = useRef(null);
  useEffect(() => {
    if (open) {
      try {
        const raw = localStorage.getItem('tpprover_announcements_last_seen');
        seenAtRef.current = raw ? Number(raw) : 0;
      } catch {
        seenAtRef.current = 0;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const saved = localStorage.getItem('tpprover_announcements');
        if (saved) setPosts(JSON.parse(saved));
        const { getAnnouncements, getAnnouncementReactionCounts, getMyAnnouncementReactions } = await import('../../services/firebase');
        const { auth } = await import('../../config/firebase');
        const list = await getAnnouncements();
        if (list?.length) {
          setPosts(list);
          try { localStorage.setItem('tpprover_announcements', JSON.stringify(list)); } catch { /* ignore */ }

          // Load global counts + this user's reactions in parallel
          const postIds = list.map((p) => p.id);
          const uid = auth.currentUser?.uid;
          const [counts, mine] = await Promise.all([
            getAnnouncementReactionCounts(postIds),
            uid ? getMyAnnouncementReactions(uid) : Promise.resolve({}),
          ]);
          setGlobalCounts(counts);
          setMyReactions(mine);
        }
      } catch {
        try {
          const saved = localStorage.getItem('tpprover_announcements');
          if (saved) setPosts(JSON.parse(saved));
        } catch { /* ignore */ }
      }
    };
    load();
  }, [open]);

  // If filtered tab loses all its posts, reset to all
  useEffect(() => {
    if (filter !== null) {
      const tab = TABS.find((t) => t.id === filter);
      if (tab && !posts.some((p) => tab.match(p.category))) {
        setFilter(null);
      }
    }
  }, [posts, filter]);

  // Mark all as seen when opened
  useEffect(() => {
    if (!open || !posts.length) return;
    try {
      const latest = posts
        .map((p) => (p?.date ? new Date(p.date).getTime() : 0))
        .filter((t) => t > 0)
        .sort((a, b) => b - a)[0];
      if (latest) {
        localStorage.setItem('tpprover_announcements_last_seen', String(latest));
        window.dispatchEvent(new CustomEvent('tpp:announcements-seen'));
      }
    } catch { /* ignore */ }
  }, [open, posts]);

  const reactTo = async (postId, reactionId) => {
    const { auth } = await import('../../config/firebase');
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const alreadyReacted = (myReactions[postId] || {})[reactionId] === true;
    const newState = !alreadyReacted;
    const delta = newState ? 1 : -1;

    // Optimistic update so the UI feels instant
    setMyReactions((prev) => ({
      ...prev,
      [postId]: { ...(prev[postId] || {}), [reactionId]: newState },
    }));
    setGlobalCounts((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {}),
        [reactionId]: Math.max(0, ((prev[postId] || {})[reactionId] || 0) + delta),
      },
    }));

    try {
      const { toggleAnnouncementReaction } = await import('../../services/firebase');
      await toggleAnnouncementReaction(postId, reactionId, uid);
    } catch {
      // Roll back optimistic update on failure
      setMyReactions((prev) => ({
        ...prev,
        [postId]: { ...(prev[postId] || {}), [reactionId]: alreadyReacted },
      }));
      setGlobalCounts((prev) => ({
        ...prev,
        [postId]: {
          ...(prev[postId] || {}),
          [reactionId]: Math.max(0, ((prev[postId] || {})[reactionId] || 0) - delta),
        },
      }));
    }
  };

  const seenAt = seenAtRef.current ?? 0;

  // Sort newest first, then filter by active tab (null = all)
  const sortedPosts = [...posts].sort((a, b) => {
    const da = a?.date ? new Date(a.date).getTime() : 0;
    const db = b?.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
  const activeTab = TABS.find((t) => t.id === filter) || null;
  const filteredPosts = activeTab ? sortedPosts.filter((p) => activeTab.match(p.category)) : sortedPosts;

  // Unread count for header badge
  const unreadCount = posts.filter((p) => {
    const d = p?.date ? new Date(p.date).getTime() : 0;
    return d > 0 && d > seenAt;
  }).length;


  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          Pep Planner News
          <NewspaperClipping weight="bold" className="h-5 w-5" style={{ color: theme.primary }} />
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: theme.primary, color: '#fff' }}
            >
              {unreadCount}
            </span>
          )}
        </span>
      }
      theme={theme}
      maxHeight="min(92vh, 720px)"
      contentStyle={{
        background: theme.isDark
          ? `linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 36%), rgba(24,28,36,0.98)`
          : `linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0) 36%), ${theme.cardBackground || '#ffffff'}`,
      }}
    >
      {/* Tab filters — equal width, always all visible */}
      <div className="relative border-b -mx-4 mb-0" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div className="flex w-full">
          {TABS.map(({ id, label, Icon, color, match: _match }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                data-active={active}
                onClick={() => setFilter(active ? null : id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
                style={{ color: active ? color : theme.textLight }}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold leading-none">{label}</span>
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className="pt-3">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              >
                <Megaphone size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: theme.text }}>
                {filter ? `No "${filter}" posts yet` : 'No posts yet'}
              </p>
              <p className="text-sm" style={{ color: theme.textLight }}>
                {filter ? 'Try a different filter or check back soon.' : 'Team updates, new features, and fixes will appear here.'}
              </p>
            </div>
          ) : (
            filteredPosts.map((p, i) => {
              const postDate = p?.date ? new Date(p.date).getTime() : 0;
              const isNew = postDate > 0 && postDate > seenAt;
              return (
                <ChangelogEntry
                  key={p.id}
                  p={p}
                  theme={theme}
                  globalCounts={globalCounts}
                  myReactions={myReactions}
                  onReact={reactTo}
                  isNew={isNew}
                  isLast={i === filteredPosts.length - 1}
                  index={i}
                />
              );
            })
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
