import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, Sparkles, Bug, Rocket, Users } from 'lucide-react';
import { NewspaperClipping, Fire, ThumbsUp, Heart, SealCheck } from '@phosphor-icons/react';
import BottomSheet from '../common/BottomSheet';
import BadgeBump from '../ui/BadgeBump';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import { formatMMDDYYYY } from '../../utils/date';
import { hapticsLight } from '../../utils/haptics';
import {
  announcementDateMs,
  countUnseenAnnouncements,
  getAnnouncementsLastSeenMs,
  markAnnouncementsSeen,
} from '../../utils/announcementSeen';
import '../../styles/announcement-reactions.css';

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
// Duotone icons — color drives the outline; fill stays at Phosphor's default 20% tint
const HELPFUL_ICON = { size: 22, weight: 'duotone', color: '#1D434E' };
const LOVE_ICON = { size: 22, weight: 'duotone', color: '#BE123C' };
const FIRE_ICON = { size: 22, weight: 'duotone', color: '#C2410C' };
const NOTED_ICON = { size: 22, weight: 'duotone', color: '#065F46' };

const REACTIONS = [
  { id: 'helpful',   Icon: ThumbsUp,   label: 'Helpful', phosphor: true, ...HELPFUL_ICON },
  { id: 'love',      Icon: Heart,      label: 'Love it', phosphor: true, ...LOVE_ICON },
  { id: 'exciting',  Icon: Fire,       label: 'Exciting', phosphor: true, ...FIRE_ICON },
  { id: 'noted',     Icon: SealCheck,  label: 'Noted', phosphor: true, ...NOTED_ICON },
];

// ── Per-reaction portal effects ──────────────────────────────────────────────

const HEART_CONFIGS = [
  { dx: -14, dy:  0, scale: 0.85, rotate: -12, delay: 0,    duration: 0.82 },
  { dx:   0, dy:  4, scale: 1.05, rotate:   4, delay: 0.07, duration: 0.9  },
  { dx:  14, dy:  0, scale: 0.75, rotate:  14, delay: 0.14, duration: 0.78 },
  { dx:  -6, dy:  8, scale: 0.6,  rotate:  -6, delay: 0.22, duration: 0.72 },
];

// Ticker tape strips for Noted — flutter down from the button
const TICKER_CONFIGS = [
  { dx: -18, width: 18, color: '#065F46', tx: -12, ty: 52, rot: -15,  rot2:  35, delay: 0,    dur: 0.72 },
  { dx:  -8, width: 12, color: '#047857', tx:  -4, ty: 60, rot:  20,  rot2: -40, delay: 0.05, dur: 0.78 },
  { dx:   0, width: 20, color: '#065F46', tx:   2, ty: 48, rot:  -8,  rot2:  50, delay: 0.02, dur: 0.68 },
  { dx:   8, width: 14, color: '#059669', tx:   8, ty: 58, rot:  25,  rot2: -30, delay: 0.08, dur: 0.80 },
  { dx:  16, width: 16, color: '#047857', tx:  14, ty: 44, rot: -20,  rot2:  60, delay: 0.04, dur: 0.74 },
  { dx:  -4, width: 10, color: '#10B981', tx:  -8, ty: 66, rot:  10,  rot2: -55, delay: 0.11, dur: 0.82 },
  { dx:  12, width: 22, color: '#065F46', tx:  18, ty: 56, rot: -30,  rot2:  25, delay: 0.06, dur: 0.70 },
];

// 8 dots fired in evenly-spaced directions, each with a slight random offset
const CONFETTI_COLORS = ['#1D434E', '#2563EB', '#059669', '#7C3AED', '#BE123C', '#EA580C', '#0891B2', '#65A30D'];
const CONFETTI_CONFIGS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * 2 * Math.PI;
  const dist = 32 + (i % 3) * 10;
  return {
    cx: Math.round(Math.cos(angle) * dist),
    cy: Math.round(Math.sin(angle) * dist),
    color: CONFETTI_COLORS[i],
    rot: Math.round(angle * (180 / Math.PI) * 2),
    delay: i * 0.03,
    duration: 0.55 + (i % 3) * 0.08,
  };
});

function spawnPortalEffect(setFn, item, ttl = 1200) {
  setFn((prev) => [...prev, item]);
  setTimeout(() => setFn((prev) => prev.filter((x) => x.id !== item.id)), ttl);
}

function ReactionPortalEffects({ id, items }) {
  if (!items.length) return null;
  return createPortal(
    <>
      {items.map(({ id: itemId, x, y }) => {
        if (id === 'love') {
          return HEART_CONFIGS.map((cfg, i) => (
            <span
              key={`${itemId}-${i}`}
              className="tpp-floating-heart"
              style={{
                left: x + cfg.dx,
                top:  y + cfg.dy,
                '--hd': `${cfg.duration}s`,
                '--hs': cfg.scale,
                '--hr': `${cfg.rotate}deg`,
                animationDelay: `${cfg.delay}s`,
              }}
            >
              <Heart size={16} weight="fill" color="#BE123C" aria-hidden />
            </span>
          ));
        }
        if (id === 'helpful') {
          return CONFETTI_CONFIGS.map((cfg, i) => (
            <span
              key={`${itemId}-c${i}`}
              className="tpp-confetti-dot"
              style={{
                left: x + 8,
                top: y + 8,
                backgroundColor: cfg.color,
                '--cx': `${cfg.cx}px`,
                '--cy': `${cfg.cy}px`,
                '--crot': `${cfg.rot}deg`,
                '--cd': `${cfg.duration}s`,
                animationDelay: `${cfg.delay}s`,
              }}
            />
          ));
        }
        if (id === 'noted') {
          return TICKER_CONFIGS.map((cfg, i) => (
            <span
              key={`${itemId}-t${i}`}
              className="tpp-ticker-strip"
              style={{
                left: x + cfg.dx,
                top: y,
                width: cfg.width,
                backgroundColor: cfg.color,
                '--tx': `${cfg.tx}px`,
                '--ty': `${cfg.ty}px`,
                '--tr': `${cfg.rot}deg`,
                '--tr2': `${cfg.rot2}deg`,
                '--td': `${cfg.dur}s`,
                animationDelay: `${cfg.delay}s`,
              }}
            />
          ));
        }
        return null;
      })}
    </>,
    document.body,
  );
}

function ReactionButton({
  id, Icon, label, phosphor, size, weight, color,
  count, hasReacted, theme, postId, onReact,
}) {
  const [animKey, setAnimKey] = useState(0);
  const [pop, setPop] = useState(false);
  const [onFire, setOnFire] = useState(false);
  const [countBump, setCountBump] = useState(false);
  const [portalItems, setPortalItems] = useState([]);
  const btnRef = useRef(null);
  const popTimerRef = useRef(null);
  const bumpTimerRef = useRef(null);
  const fireTimerRef = useRef(null);

  useEffect(() => () => {
    [popTimerRef, bumpTimerRef, fireTimerRef].forEach((r) => {
      if (r.current) clearTimeout(r.current);
    });
  }, []);

  const handleClick = () => {
    hapticsLight();
    const adding = !hasReacted;

    setAnimKey((k) => k + 1);

    // Button pop
    setPop(false);
    if (popTimerRef.current) clearTimeout(popTimerRef.current);
    requestAnimationFrame(() => {
      setPop(true);
      popTimerRef.current = setTimeout(() => setPop(false), 500);
    });

    if (adding) {
      setCountBump(true);
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
      bumpTimerRef.current = setTimeout(() => setCountBump(false), 420);

      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - 8;
        const cy = rect.top - 4;

        if (id === 'exciting') {
          // On-fire glow effect on the button itself
          setOnFire(false);
          if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
          requestAnimationFrame(() => {
            setOnFire(true);
            fireTimerRef.current = setTimeout(() => setOnFire(false), 800);
          });
        } else {
          // Portal floating effect for love, helpful, noted
          spawnPortalEffect(setPortalItems, { id: Date.now(), x: cx, y: cy }, 1000);
        }
      }
    }

    onReact(postId, id);
  };

  const hasPortalEffect = id === 'love' || id === 'helpful' || id === 'noted';

  return (
    <>
      {hasPortalEffect && <ReactionPortalEffects id={id} items={portalItems} />}
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className={[
          'tpp-reaction-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 overflow-visible',
          pop ? 'is-popping' : '',
          onFire ? 'is-on-fire' : '',
        ].join(' ')}
        style={{
          backgroundColor: hasReacted
            ? (theme.isDark ? 'rgba(255,255,255,0.12)' : `${theme.primary}15`)
            : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
          color: hasReacted ? theme.primary : theme.textLight,
          border: `1px solid ${hasReacted ? (theme.isDark ? 'rgba(255,255,255,0.2)' : `${theme.primary}40`) : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
        }}
      >
        <span
          key={`${id}-${animKey}`}
          className={`tpp-reaction-icon-wrap tpp-reaction-icon-wrap--${id}`}
        >
          {phosphor ? (
            <Icon
              size={size ?? 14}
              weight={weight ?? 'duotone'}
              color={color ?? 'currentColor'}
              aria-hidden
              className="flex-shrink-0"
            />
          ) : (
            <Icon size={14} strokeWidth={hasReacted ? 2.5 : 1.8} />
          )}
        </span>
        {countBump ? (
          <span key={`count-${animKey}`} className="tpp-reaction-count-bump">
            {count > 0 ? count : label}
          </span>
        ) : (
          <span>{count > 0 ? count : label}</span>
        )}
      </button>
    </>
  );
}

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
      <div className="flex items-center gap-2 pt-1 overflow-visible">
        <span className="text-[10px] font-semibold uppercase tracking-wider mr-0.5" style={{ color: theme.textLight, opacity: 0.6 }}>React</span>
        {REACTIONS.map(({ id, Icon, label, phosphor, size, weight, color }) => {
          const count = (globalCounts[p.id] || {})[id] || 0;
          const hasReacted = (myReactions[p.id] || {})[id] === true;
          return (
            <ReactionButton
              key={id}
              id={id}
              Icon={Icon}
              label={label}
              phosphor={phosphor}
              size={size}
              weight={weight}
              color={color}
              count={count}
              hasReacted={hasReacted}
              theme={theme}
              postId={p.id}
              onReact={onReact}
            />
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

  // Frozen at open — drives "NEW" chips for this viewing session only
  const [seenAtSnapshot, setSeenAtSnapshot] = useState(0);
  // Live last-seen — drives header badge (clears once marked)
  const [seenAtLive, setSeenAtLive] = useState(() => getAnnouncementsLastSeenMs());
  const wasOpenRef = useRef(false);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const tabRefs = useRef({});
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, color: '#818cf8' });

  const persistSeen = useCallback((list) => {
    if (!list?.length) return getAnnouncementsLastSeenMs();
    const next = markAnnouncementsSeen(list);
    setSeenAtLive(next);
    try {
      import('../../config/firebase').then(({ auth, db }) => {
        import('firebase/firestore').then(({ doc, setDoc, serverTimestamp }) => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          setDoc(
            doc(db, 'users', uid),
            {
              engagement: {
                announcementsLastSeenAt: serverTimestamp(),
                announcementsLastSeenMs: next,
              },
            },
            { merge: true }
          ).catch(() => {});
        });
      });
    } catch {
      /* ignore */
    }
    return next;
  }, []);

  useEffect(() => {
    if (open) {
      // Snapshot once when opening so NEW chips stay visible during this session
      if (!wasOpenRef.current) {
        setSeenAtSnapshot(getAnnouncementsLastSeenMs());
      }
      wasOpenRef.current = true;
      try {
        sessionStorage.setItem('tpp_announcements_sheet_open', '1');
      } catch {
        /* ignore */
      }
      return undefined;
    }

    // On close: always bump last-seen from whatever we loaded, then notify
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      persistSeen(postsRef.current);
      try {
        sessionStorage.removeItem('tpp_announcements_sheet_open');
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent('tpp:announcements-sheet-closed'));
    }
    return undefined;
  }, [open, persistSeen]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const saved = localStorage.getItem('tpprover_announcements');
        if (saved) {
          const cached = JSON.parse(saved);
          if (cached?.length) {
            setPosts(cached);
            // Mark early from cache so nav badge clears while content is on screen
            persistSeen(cached);
          }
        }
        const { getAnnouncements, getAnnouncementReactionCounts, getMyAnnouncementReactions } = await import('../../services/firebase');
        const { auth } = await import('../../config/firebase');
        const list = await getAnnouncements();
        if (list?.length) {
          setPosts(list);
          try { localStorage.setItem('tpprover_announcements', JSON.stringify(list)); } catch { /* ignore */ }
          // Re-mark with fresh network list (fixes stale-cache race)
          persistSeen(list);

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
  }, [open, persistSeen]);

  // If filtered tab loses all its posts, reset to all
  useEffect(() => {
    if (filter !== null) {
      const tab = TABS.find((t) => t.id === filter);
      if (tab && !posts.some((p) => tab.match(p.category))) {
        setFilter(null);
      }
    }
  }, [posts, filter]);

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

  const seenAt = seenAtSnapshot;

  // Sort newest first, then filter by active tab (null = all)
  const sortedPosts = [...posts].sort((a, b) => {
    const da = announcementDateMs(a?.date);
    const db = announcementDateMs(b?.date);
    return db - da;
  });
  const activeTab = TABS.find((t) => t.id === filter) || null;
  const filteredPosts = activeTab ? sortedPosts.filter((p) => activeTab.match(p.category)) : sortedPosts;

  // Header badge uses live last-seen so it clears as soon as we mark viewed
  const unreadCount = countUnseenAnnouncements(posts, seenAtLive);

  useLayoutEffect(() => {
    if (!open || filter === null) {
      setTabIndicator((prev) => ({ ...prev, width: 0 }));
      return;
    }
    const el = tabRefs.current[filter];
    const tab = TABS.find((t) => t.id === filter);
    if (el && tab) {
      setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth, color: tab.color });
    }
  }, [open, filter, posts.length]);


  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          Pep Planner News
          <NewspaperClipping weight="bold" className="h-5 w-5" style={{ color: theme.primary }} />
          {unreadCount > 0 && (
            <BadgeBump
              count={unreadCount}
              pulse
              className="text-white"
              style={{ backgroundColor: theme.primary }}
            />
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
        <span
          className="tpp-tab-indicator absolute bottom-0 h-[2px] rounded-t-full pointer-events-none"
          style={{
            left: tabIndicator.left,
            width: tabIndicator.width,
            backgroundColor: tabIndicator.color,
            opacity: filter ? 1 : 0,
          }}
        />
        <div className="flex w-full">
          {TABS.map(({ id, label, Icon, color, match: _match }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                ref={(el) => { tabRefs.current[id] = el; }}
                data-active={active}
                onClick={() => setFilter(active ? null : id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
                style={{ color: active ? color : theme.textLight }}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={filter ?? 'all'} className="tpp-tab-content-enter px-4 pb-6">
        <div className="pt-3">
          {filteredPosts.length === 0 ? (
            <AnimatedEmptyState
              icon={Megaphone}
              theme={theme}
              title={filter ? `No "${filter}" posts yet` : 'No posts yet'}
              description={filter ? 'Try a different filter or check back soon.' : 'Team updates, new features, and fixes will appear here.'}
            />
          ) : (
            filteredPosts.map((p, i) => {
              const postDate = announcementDateMs(p?.date);
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
