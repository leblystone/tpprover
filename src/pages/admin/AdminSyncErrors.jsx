import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Globe,
  Apple,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collectionGroup, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';

const PLATFORM_ICON = {
  ios: Apple,
  android: Smartphone,
  web: Globe,
};

const ERROR_CODE_LABELS = {
  sync_failed: 'Sync Failed',
  merge_error: 'Merge Error',
  save_failed: 'Save Failed',
  load_failed: 'Load Failed',
  conflict: 'Conflict',
};

function toDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'number') return new Date(v);
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
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const TIME_FILTERS = [
  { id: '24h', label: 'Last 24h', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 168 },
  { id: '30d', label: 'Last 30 days', hours: 720 },
  { id: 'all', label: 'All time', hours: null },
];

export default function AdminSyncErrors() {
  const { theme } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('7d');
  const [expandedUser, setExpandedUser] = useState(null);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const eventsRef = collectionGroup(db, 'events');
      const selectedFilter = TIME_FILTERS.find((f) => f.id === timeFilter);

      let q;
      if (selectedFilter?.hours) {
        const since = Timestamp.fromDate(new Date(Date.now() - selectedFilter.hours * 3600000));
        q = query(eventsRef, where('timestamp', '>=', since), orderBy('timestamp', 'desc'), limit(500));
      } else {
        q = query(eventsRef, orderBy('timestamp', 'desc'), limit(500));
      }

      const snap = await getDocs(q);
      const raw = snap.docs.map((doc) => {
        // path: syncErrors/{userId}/events/{eventId}
        const pathParts = doc.ref.path.split('/');
        const userId = pathParts[1] || 'unknown';
        return { id: doc.id, userId, ...doc.data() };
      });

      // Only keep docs that are under syncErrors (collectionGroup 'events' may match others)
      const filtered = raw.filter((e) => e.code !== undefined);

      setEvents(filtered);
    } catch (err) {
      console.error('Failed to load sync errors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  // Group by userId
  const grouped = events.reduce((acc, e) => {
    if (!acc[e.userId]) acc[e.userId] = [];
    acc[e.userId].push(e);
    return acc;
  }, {});

  const userList = Object.entries(grouped)
    .map(([userId, errs]) => ({
      userId,
      count: errs.length,
      latest: errs[0],
      events: errs,
      platforms: [...new Set(errs.map((e) => e.platform).filter(Boolean))],
    }))
    .sort((a, b) => b.count - a.count);

  const totalErrors = events.length;
  const uniqueUsers = userList.length;
  const criticalUsers = userList.filter((u) => u.count >= 3).length;
  const platformCounts = events.reduce((acc, e) => {
    acc[e.platform || 'unknown'] = (acc[e.platform || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} style={{ color: theme.error }} />
          <h1 className="text-lg font-semibold" style={{ color: theme.text }}>
            Sync Error Monitor
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: timeFilter === f.id ? theme.primary : theme.background,
                color: timeFilter === f.id ? '#fff' : theme.textLight,
                border: `1px solid ${timeFilter === f.id ? theme.primary : theme.border}`,
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={loadErrors}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: theme.background,
              color: theme.textLight,
              border: `1px solid ${theme.border}`,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Errors', value: totalErrors, color: theme.error },
          { label: 'Affected Users', value: uniqueUsers, color: theme.primary },
          { label: 'Critical (3+)', value: criticalUsers, color: '#f59e0b' },
          {
            label: 'By Platform',
            value: Object.entries(platformCounts).map(([p, c]) => `${p}: ${c}`).join(' · ') || '—',
            color: theme.textLight,
            small: true,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
          >
            <p className="text-xs mb-1" style={{ color: theme.textLight }}>{stat.label}</p>
            <p
              className={stat.small ? 'text-xs font-medium leading-snug' : 'text-2xl font-bold'}
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm flex items-start gap-2"
          style={{ backgroundColor: theme.error + '15', color: theme.error, border: `1px solid ${theme.error}30` }}
        >
          <XCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Failed to load errors:</strong> {error}
            <br />
            <span className="text-xs opacity-80">Make sure the Firestore collectionGroup index for "events" is created.</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && userList.length === 0 && (
        <div
          className="rounded-xl p-10 text-center border"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: theme.primary }} />
          <p className="font-medium" style={{ color: theme.text }}>No sync errors found</p>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>All quiet for the selected time window.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{ backgroundColor: theme.border + '60' }}
            />
          ))}
        </div>
      )}

      {/* User error rows */}
      {!loading && userList.length > 0 && (
        <div className="space-y-2">
          {userList.map((user) => {
            const isExpanded = expandedUser === user.userId;
            const isCritical = user.count >= 3;
            const PlatformIcon = PLATFORM_ICON[user.platforms[0]] || Globe;
            const latestDate = toDate(user.latest?.timestamp);

            return (
              <div
                key={user.userId}
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: theme.cardBackground,
                  borderColor: isCritical ? theme.error + '50' : theme.border,
                  boxShadow: isCritical ? `0 0 0 1px ${theme.error}30` : 'none',
                }}
              >
                {/* Row header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                  onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isCritical ? theme.error + '20' : theme.primary + '20' }}
                  >
                    <User size={14} style={{ color: isCritical ? theme.error : theme.primary }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: theme.text }}>
                        {user.userId.slice(0, 20)}…
                      </span>
                      {isCritical && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: theme.error + '20', color: theme.error }}
                        >
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: theme.textLight }}>
                        Latest: {user.latest?.code ? (ERROR_CODE_LABELS[user.latest.code] || user.latest.code) : '—'}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: theme.textLight }}>
                        <Clock size={10} />
                        {timeAgo(latestDate)}
                      </span>
                      <PlatformIcon size={12} style={{ color: theme.textLight }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-sm font-bold px-2.5 py-1 rounded-lg"
                      style={{
                        backgroundColor: isCritical ? theme.error + '20' : theme.primary + '15',
                        color: isCritical ? theme.error : theme.primary,
                      }}
                    >
                      {user.count}
                    </span>
                    {isExpanded
                      ? <ChevronDown size={16} style={{ color: theme.textLight }} />
                      : <ChevronRight size={16} style={{ color: theme.textLight }} />
                    }
                  </div>
                </button>

                {/* Expanded events */}
                {isExpanded && (
                  <div
                    className="border-t divide-y"
                    style={{ borderColor: theme.border }}
                  >
                    {user.events.map((evt) => {
                      const evtDate = toDate(evt.timestamp);
                      const EvtPlatformIcon = PLATFORM_ICON[evt.platform] || Globe;
                      return (
                        <div
                          key={evt.id}
                          className="px-4 py-3 flex items-start gap-3"
                          style={{ borderColor: theme.border }}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <EvtPlatformIcon size={13} style={{ color: theme.textLight }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-xs font-semibold"
                                style={{ color: theme.text }}
                              >
                                {ERROR_CODE_LABELS[evt.code] || evt.code}
                              </span>
                              {evt.dataType && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: theme.background, color: theme.textLight }}
                                >
                                  {evt.dataType}
                                </span>
                              )}
                              {evt.skipMerge && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
                                >
                                  skip merge
                                </span>
                              )}
                            </div>
                            {evt.errorMessage && (
                              <p
                                className="text-xs mt-1 font-mono break-all"
                                style={{ color: theme.error }}
                              >
                                {evt.errorMessage}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs" style={{ color: theme.textLight }}>
                              {formatDate(evtDate)}
                            </p>
                            <p className="text-[10px] mt-0.5 capitalize" style={{ color: theme.textLight }}>
                              {evt.platform || 'unknown'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: theme.textLight }}>
        Showing up to 500 most recent events · Errors written by syncErrorReporting.js
      </p>
    </div>
  );
}
