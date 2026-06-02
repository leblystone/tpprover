import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowsClockwise,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
  Trash,
  Database,
  ListBullets,
  Clock,
  XCircle,
} from '@phosphor-icons/react';
import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  limit,
  query,
} from 'firebase/firestore';
import pipAvatar from '../../assets/PiP.png';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TIME_FILTERS = [
  { id: '24h', label: 'Last 24h', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 168 },
  { id: '30d', label: 'Last 30 days', hours: 720 },
  { id: 'all', label: 'All time', hours: null },
];

function toDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') return new Date(v);
  return null;
}

function timeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(date) {
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysUntilExpiry(lastVerified) {
  if (!lastVerified) return null;
  const expiresAt = lastVerified.getTime() + CACHE_TTL_MS;
  const days = Math.ceil((expiresAt - Date.now()) / 86400000);
  return days;
}

export default function AdminPipInsights() {
  const { theme } = useOutletContext();
  const [activeTab, setActiveTab] = useState('queries');
  const [queryLog, setQueryLog] = useState([]);
  const [cacheEntries, setCacheEntries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [loadingCache, setLoadingCache] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('7d');
  const [searchText, setSearchText] = useState('');
  const [expandedCacheId, setExpandedCacheId] = useState(null);
  const [expandedContent, setExpandedContent] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadQueryLog = useCallback(async () => {
    setLoadingQueries(true);
    setError(null);
    try {
      const q = query(collection(db, 'pip_query_log'), limit(500));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const da = toDate(a.timestamp);
        const db_ = toDate(b.timestamp);
        return (db_?.getTime() ?? 0) - (da?.getTime() ?? 0);
      });
      setQueryLog(rows);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load PiP query log:', err);
      setError(err.message);
    } finally {
      setLoadingQueries(false);
    }
  }, []);

  const loadCache = useCallback(async () => {
    setLoadingCache(true);
    try {
      const snap = await getDocs(collection(db, 'pip_research_cache'));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const da = toDate(a.lastVerified);
        const db_ = toDate(b.lastVerified);
        return (db_?.getTime() ?? 0) - (da?.getTime() ?? 0);
      });
      setCacheEntries(rows);
    } catch (err) {
      console.error('Failed to load PiP cache:', err);
      setError(err.message);
    } finally {
      setLoadingCache(false);
    }
  }, []);

  useEffect(() => {
    loadQueryLog();
    loadCache();
  }, [loadQueryLog, loadCache]);

  const refreshAll = () => {
    loadQueryLog();
    loadCache();
  };

  const filteredQueries = useMemo(() => {
    const selectedFilter = TIME_FILTERS.find((f) => f.id === timeFilter);
    const cutoff = selectedFilter?.hours
      ? Date.now() - selectedFilter.hours * 3600000
      : null;

    return queryLog.filter((row) => {
      if (cutoff) {
        const d = toDate(row.timestamp);
        if (!d || d.getTime() < cutoff) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!String(row.query || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [queryLog, timeFilter, searchText]);

  const stats = useMemo(() => {
    const now = Date.now();
    const todayCutoff = now - 24 * 3600000;
    const weekCutoff = now - 7 * 24 * 3600000;

    const todayQueries = queryLog.filter((r) => {
      const d = toDate(r.timestamp);
      return d && d.getTime() >= todayCutoff;
    });
    const weekQueries = queryLog.filter((r) => {
      const d = toDate(r.timestamp);
      return d && d.getTime() >= weekCutoff;
    });

    const weekCacheHits = weekQueries.filter((r) => r.fromCache).length;
    const hitRate = weekQueries.length
      ? Math.round((weekCacheHits / weekQueries.length) * 100)
      : 0;

    const uniqueUsers = new Set(weekQueries.map((r) => r.uidHash).filter(Boolean)).size;

    return {
      today: todayQueries.length,
      week: weekQueries.length,
      hitRate,
      uniqueUsers,
    };
  }, [queryLog]);

  const filteredCache = useMemo(() => {
    if (!searchText.trim()) return cacheEntries;
    const q = searchText.toLowerCase();
    return cacheEntries.filter((row) =>
      String(row.query || row.id || '').toLowerCase().includes(q)
      || String(row.content || '').toLowerCase().includes(q)
    );
  }, [cacheEntries, searchText]);

  const handleDeleteCache = async (cacheId) => {
    if (!window.confirm('Delete this cached answer? The next user asking this question will trigger a fresh Gemini search.')) {
      return;
    }
    setDeletingId(cacheId);
    try {
      await deleteDoc(doc(db, 'pip_research_cache', cacheId));
      setCacheEntries((prev) => prev.filter((e) => e.id !== cacheId));
      if (expandedCacheId === cacheId) setExpandedCacheId(null);
    } catch (err) {
      console.error('Failed to delete cache entry:', err);
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const loading = activeTab === 'queries' ? loadingQueries : loadingCache;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img
            src={pipAvatar}
            alt="PiP"
            className="w-10 h-10 rounded-xl object-cover"
            style={{ border: `1px solid ${theme.border}` }}
          />
          <div>
            <h1 className="text-lg font-semibold" style={{ color: theme.text }}>
              PiP Insights
            </h1>
            <p className="text-[11px]" style={{ color: theme.textLight }}>
              Research queries, cache hits, and cached answers
              {lastRefreshed && (
                <span> · refreshed {lastRefreshed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={loadingQueries || loadingCache}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: theme.background,
            color: theme.textLight,
            border: `1px solid ${theme.border}`,
          }}
        >
          <ArrowsClockwise size={13} className={loadingQueries || loadingCache ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Queries today', value: stats.today, color: theme.primary },
          { label: 'Queries (7d)', value: stats.week, color: theme.text },
          { label: 'Cache hit rate (7d)', value: `${stats.hitRate}%`, color: '#059669' },
          { label: 'Unique users (7d)', value: stats.uniqueUsers, color: theme.text },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
          >
            <p className="text-xs mb-1" style={{ color: theme.textLight }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'queries', label: 'Query Log', Icon: ListBullets },
          { id: 'cache', label: 'Cache Manager', Icon: Database },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: activeTab === id ? theme.primary : theme.background,
              color: activeTab === id ? '#fff' : theme.textLight,
              border: `1px solid ${activeTab === id ? theme.primary : theme.border}`,
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Search + time filters (query log) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 min-w-[200px] max-w-md"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <MagnifyingGlass size={14} style={{ color: theme.textLight }} />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search queries or cache…"
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: theme.text }}
          />
        </div>
        {activeTab === 'queries' && TIME_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTimeFilter(f.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: timeFilter === f.id ? theme.primary : theme.background,
              color: timeFilter === f.id ? '#fff' : theme.textLight,
              border: `1px solid ${timeFilter === f.id ? theme.primary : theme.border}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="p-4 rounded-xl text-sm flex items-start gap-2"
          style={{ backgroundColor: theme.error + '15', color: theme.error, border: `1px solid ${theme.error}30` }}
        >
          <XCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Query Log tab */}
      {activeTab === 'queries' && (
        <>
          {loadingQueries && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: theme.border + '60' }} />
              ))}
            </div>
          )}

          {!loadingQueries && filteredQueries.length === 0 && (
            <div
              className="rounded-xl p-10 text-center border"
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
            >
              <ListBullets size={32} className="mx-auto mb-3" style={{ color: theme.textLight }} />
              <p className="font-medium" style={{ color: theme.text }}>No queries in this window</p>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                PiP research queries appear here after users ask compound questions.
              </p>
            </div>
          )}

          {!loadingQueries && filteredQueries.length > 0 && (
            <div className="space-y-2">
              {filteredQueries.map((row) => {
                const ts = toDate(row.timestamp);
                const isCache = row.fromCache || row.provider === 'cache';
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border px-4 py-3 flex items-start gap-3"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words" style={{ color: theme.text }}>
                        {row.query || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isCache ? '#05966920' : theme.primary + '20',
                            color: isCache ? '#059669' : theme.primary,
                          }}
                        >
                          {isCache ? 'cache' : 'gemini'}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: theme.textLight }}>
                          user {row.uidHash || 'anon'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs flex items-center gap-1 justify-end" style={{ color: theme.textLight }}>
                        <Clock size={10} />
                        {timeAgo(ts)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                        {formatDate(ts)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-center" style={{ color: theme.textLight }}>
            Showing up to 500 most recent research queries · uid stored as hash only
          </p>
        </>
      )}

      {/* Cache Manager tab */}
      {activeTab === 'cache' && (
        <>
          {loadingCache && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: theme.border + '60' }} />
              ))}
            </div>
          )}

          {!loadingCache && filteredCache.length === 0 && (
            <div
              className="rounded-xl p-10 text-center border"
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
            >
              <Database size={32} className="mx-auto mb-3" style={{ color: theme.textLight }} />
              <p className="font-medium" style={{ color: theme.text }}>No cached answers yet</p>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                Entries are created automatically when Gemini answers a research question.
              </p>
            </div>
          )}

          {!loadingCache && filteredCache.length > 0 && (
            <div className="space-y-2">
              {filteredCache.map((row) => {
                const lastVerified = toDate(row.lastVerified);
                const expiresIn = daysUntilExpiry(lastVerified);
                const isExpanded = expandedCacheId === row.id;
                const showFull = expandedContent[row.id];
                const preview = String(row.content || '').slice(0, showFull ? undefined : 400);
                const hasMore = String(row.content || '').length > 400;

                return (
                  <div
                    key={row.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                      onClick={() => setExpandedCacheId(isExpanded ? null : row.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: theme.text }}>
                          {row.query || row.id}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs" style={{ color: theme.textLight }}>
                          <span>{row.hitCount ?? 0} hits</span>
                          <span>Verified {timeAgo(lastVerified)}</span>
                          {expiresIn != null && (
                            <span style={{ color: expiresIn <= 3 ? theme.error : theme.textLight }}>
                              {expiresIn <= 0 ? 'Expired' : `Expires in ${expiresIn}d`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCache(row.id);
                        }}
                        disabled={deletingId === row.id}
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ color: theme.error }}
                        title="Delete cache entry — forces fresh search on next ask"
                      >
                        <Trash size={16} />
                      </button>
                      {isExpanded
                        ? <CaretDown size={16} style={{ color: theme.textLight }} />
                        : <CaretRight size={16} style={{ color: theme.textLight }} />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: theme.border }}>
                        <p className="text-[10px] uppercase tracking-wider font-semibold mt-3 mb-2" style={{ color: theme.textLight }}>
                          Cached answer
                        </p>
                        <p
                          className="text-xs whitespace-pre-wrap break-words leading-relaxed"
                          style={{ color: theme.text }}
                        >
                          {preview}
                          {!showFull && hasMore && '…'}
                        </p>
                        {hasMore && (
                          <button
                            type="button"
                            onClick={() => setExpandedContent((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                            className="text-xs mt-2 font-medium"
                            style={{ color: theme.primary }}
                          >
                            {showFull ? 'Show less' : 'Show more'}
                          </button>
                        )}
                        <p className="text-[10px] mt-2" style={{ color: theme.textLight }}>
                          Doc ID: {row.id} · Last verified {formatDate(lastVerified)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-center" style={{ color: theme.textLight }}>
            {filteredCache.length} cached answer{filteredCache.length !== 1 ? 's' : ''} · TTL 30 days · delete to force refresh
          </p>
        </>
      )}
    </div>
  );
}
