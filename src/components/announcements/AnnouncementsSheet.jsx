import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone, Sparkles, Bug, Rocket,
} from 'lucide-react';
import BottomSheet from '../common/BottomSheet';
import { formatMMDDYYYY } from '../../utils/date';

const getBody = (p) => p?.body || p?.message || p?.content || '';

// Admin-facing category labels (used for badge display on each post)
const ADMIN_CATEGORY_META = {
  'New Feature':  { color: '#6366f1' },
  'Improvement':  { color: '#22c55e' },
  'Patch Note':   { color: '#0ea5e9' },
  'In Progress':  { color: '#f59e0b' },
  'WIP Bug':      { color: '#f97316' },
  'Known Bug':    { color: '#ef4444' },
  'Community':    { color: '#8b5cf6' },
  'General':      { color: '#94a3b8' },
};

// User-facing tabs — each maps to one or more admin categories
const TABS = [
  {
    id: 'All',
    label: 'All',
    Icon: Megaphone,
    color: null,
    match: () => true,
  },
  {
    id: 'Upcoming',
    label: 'Upcoming',
    Icon: Rocket,
    color: '#6366f1',
    match: (cat) => ['New Feature', 'Improvement', 'Patch Note', 'In Progress'].includes(cat),
  },
  {
    id: 'Bugs',
    label: 'Bugs',
    Icon: Bug,
    color: '#ef4444',
    match: (cat) => ['Known Bug', 'WIP Bug'].includes(cat),
  },
];

const EMOJIS = ['👍', '🎉', '💡', '❗'];

function ChangelogEntry({ p, theme, reactions, onReact, isNew, isLast }) {
  const meta = ADMIN_CATEGORY_META[p.category] || ADMIN_CATEGORY_META['General'];
  const accentColor = meta.color || theme.textLight;
  const body = getBody(p);

  return (
    <div className={`py-8 ${!isLast ? 'border-b' : ''}`} style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
      {/* Header: Category & Date */}
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase"
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
          }}
        >
          {p.category}
        </span>
        <span className="text-xs font-medium" style={{ color: theme.textLight }}>
          {formatMMDDYYYY(p.date)}
        </span>
        {isNew && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
            style={{
              backgroundColor: `${theme.primary}20`,
              color: theme.primary,
            }}
          >
            New
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold mb-3 leading-tight" style={{ color: theme.text }}>
        {p.title}
      </h3>

      {/* Full Body Text (No truncation/dropdowns) */}
      {body && (
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap mb-5"
          style={{ color: theme.isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}
        >
          {body}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-2">
        {EMOJIS.map((e) => {
          const count = (reactions[p.id] || {})[e] || 0;
          const hasReacted = count > 0;
          return (
            <button
              key={e}
              type="button"
              onClick={() => onReact(p.id, e)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-all active:scale-95"
              style={{
                backgroundColor: hasReacted
                  ? (theme.isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}10`)
                  : (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                color: hasReacted ? theme.text : theme.textLight,
                border: `1px solid ${hasReacted ? (theme.isDark ? 'rgba(255,255,255,0.15)' : `${theme.primary}30`) : 'transparent'}`,
              }}
            >
              <span className="text-base leading-none">{e}</span>
              {count > 0 && <span className="text-xs">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AnnouncementsSheet({ open, onClose, theme }) {
  const [reactions, setReactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tpprover_ann_reactions') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'tpprover_ann_reactions') {
        try {
          setReactions(JSON.parse(localStorage.getItem('tpprover_ann_reactions') || '{}'));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('All');

  const filterRef = useRef(null);

  // Record the seenAt snapshot when the sheet first opens so "NEW" badges stay
  // accurate for the duration of the session (cleared only after next open).
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
        const { getAnnouncements } = await import('../../services/firebase');
        const list = await getAnnouncements();
        if (list?.length) {
          setPosts(list);
          try { localStorage.setItem('tpprover_announcements', JSON.stringify(list)); } catch { /* ignore */ }
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

  // If the active tab no longer has posts, fall back to All.
  useEffect(() => {
    if (filter !== 'All') {
      const tab = TABS.find((t) => t.id === filter);
      if (tab && !posts.some((p) => tab.match(p.category))) {
        setFilter('All');
      }
    }
  }, [posts, filter]);

  // Mark all as seen when opened (clears badges).
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

  const reactTo = (id, emoji) => {
    setReactions((prev) => {
      const next = {
        ...prev,
        [id]: { ...(prev[id] || {}), [emoji]: ((prev[id] || {})[emoji] || 0) + 1 },
      };
      try { localStorage.setItem('tpprover_ann_reactions', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const activeTab = TABS.find((t) => t.id === filter) || TABS[0];
  const filteredPosts = posts.filter((p) => activeTab.match(p.category));
  const seenAt = seenAtRef.current ?? 0;

  // Always show all 3 tabs regardless of whether they have posts
  const visibleTabs = TABS;

  // Scroll active filter tab into view when changed
  useEffect(() => {
    if (!filterRef.current) return;
    const active = filterRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [filter]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          What&rsquo;s New
          {posts.length > 0 && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                color: theme.textLight,
              }}
            >
              {posts.length}
            </span>
          )}
        </span>
      }
      theme={theme}
      maxHeight="min(92vh, 720px)"
    >
      <div className="px-4 pb-6" style={{ maxHeight: 'min(75vh, 600px)', overflowY: 'auto' }}>
        
        {/* Filters - Toggle Tabs */}
        <div className="relative border-b mb-4 -mx-4" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <div 
            ref={filterRef}
            className="flex items-center overflow-x-auto hide-scrollbar px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            {visibleTabs.map(({ id, label, Icon, color, match: _match }) => {
              const active = filter === id;
              const tabColor = color || theme.text;
              return (
                <button
                  key={id}
                  type="button"
                  data-active={active}
                  onClick={() => setFilter(id)}
                  className="relative inline-flex items-center justify-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold transition-colors whitespace-nowrap flex-shrink-0"
                  style={{
                    color: active ? (id === 'All' ? theme.primary : tabColor) : theme.textLight,
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <span 
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                      style={{ backgroundColor: id === 'All' ? theme.primary : tabColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feed */}
        <div className="pt-2">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}
              >
                <Megaphone size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: theme.text }}>
                {filter === 'All' ? 'No posts yet' : `No "${filter}" posts`}
              </p>
              <p className="text-sm" style={{ color: theme.textLight }}>
                {filter === 'All'
                  ? 'Team updates, new features, and fixes will appear here.'
                  : 'Try a different category or check back soon.'}
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
                  reactions={reactions}
                  onReact={reactTo}
                  isNew={isNew}
                  isLast={i === filteredPosts.length - 1}
                />
              );
            })
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
