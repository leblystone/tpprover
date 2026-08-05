import React, { useEffect, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Bell,
  ArrowsClockwise,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Clock,
  Flask,
  Package,
  CreditCard,
  UsersFour,
  Lightning,
  WarningCircle,
} from '@phosphor-icons/react';

const PREF_LABELS = {
  researchReminders: 'Research Reminders',
  lowStockAlerts: 'Low Stock',
  orderStatusUpdates: 'Order Status',
  washoutReminders: 'Washout',
  cycleReminders: 'Cycle',
  groupBuys: 'Group Buys',
  engagement: 'Engagement',
  subscription: 'Subscription',
  billing: 'Billing',
};

const PREF_COLORS = {
  researchReminders: '#3b82f6',
  lowStockAlerts: '#f59e0b',
  orderStatusUpdates: '#10b981',
  washoutReminders: '#8b5cf6',
  cycleReminders: '#06b6d4',
  groupBuys: '#ec4899',
  engagement: '#6366f1',
  subscription: '#14b8a6',
  billing: '#ef4444',
};

const PREF_ICONS = {
  researchReminders: Flask,
  lowStockAlerts: Package,
  orderStatusUpdates: Package,
  washoutReminders: Clock,
  cycleReminders: Clock,
  groupBuys: UsersFour,
  engagement: Lightning,
  subscription: CreditCard,
  billing: CreditCard,
};

const STATUS_META = {
  sent: { label: 'Sent', color: '#10b981', Icon: CheckCircle },
  failed: { label: 'Failed', color: '#ef4444', Icon: XCircle },
  skipped: { label: 'Skipped', color: '#f59e0b', Icon: WarningCircle },
};

function formatTrigger(trigger) {
  if (!trigger) return 'Unknown';
  if (trigger.startsWith('cron:')) return `Cron · ${trigger.slice(5)}`;
  if (trigger.startsWith('engine:')) return `Engine · ${trigger.slice(7)}`;
  if (trigger.startsWith('pref:')) return `Pref · ${trigger.slice(5)}`;
  if (trigger.startsWith('admin')) return `Admin · ${trigger}`;
  return trigger;
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function shortUid(uid) {
  if (!uid) return '—';
  if (uid.length <= 12) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

export default function PushDeliveryTracker({ theme, embedded = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [searchUid, setSearchUid] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPref, setFilterPref] = useState('all');
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'getPushDeliveryLog');
      const result = await fn({
        limit: showAll ? 300 : 100,
        status: filterStatus,
        prefType: filterPref,
        trigger: filterTrigger === 'all' ? null : filterTrigger,
        userId: searchUid.trim() || null,
      });
      setEntries(result.data?.entries || []);
    } catch (e) {
      console.error('Push delivery log load failed:', e);
      setError(e.message || 'Failed to load push delivery log');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  const uniquePrefs = useMemo(
    () => [...new Set(entries.map((e) => e.prefType).filter(Boolean))].sort(),
    [entries]
  );
  const uniqueTriggers = useMemo(() => {
    const roots = new Set();
    entries.forEach((e) => {
      const t = e.trigger || '';
      if (t.startsWith('cron:')) roots.add('cron');
      else if (t.startsWith('engine:')) roots.add('engine');
      else if (t.startsWith('admin')) roots.add('admin');
      else if (t) roots.add(t.split(':')[0] || t);
    });
    return [...roots].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const uidNeedle = searchUid.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterPref !== 'all' && e.prefType !== filterPref) return false;
      if (filterTrigger !== 'all' && !(e.trigger || '').includes(filterTrigger)) return false;
      if (uidNeedle && !(e.userId || '').toLowerCase().includes(uidNeedle)) return false;
      return true;
    });
  }, [entries, filterStatus, filterPref, filterTrigger, searchUid]);

  const stats = useMemo(() => {
    const sent = filtered.filter((e) => e.status === 'sent').length;
    const failed = filtered.filter((e) => e.status === 'failed').length;
    const skipped = filtered.filter((e) => e.status === 'skipped').length;
    return { total: filtered.length, sent, failed, skipped };
  }, [filtered]);

  const inputStyle = {
    borderColor: theme.border,
    backgroundColor: theme.inputBg || theme.surface || theme.cardBackground,
    color: theme.text,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!embedded ? (
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              <Bell size={20} style={{ color: theme.primary }} />
              Notification Tracker
            </h2>
            <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
              Live push delivery log — type, trigger, UID, and status. No message contents.
            </p>
          </div>
        ) : (
          <div className="text-sm" style={{ color: theme.textLight }}>
            Live delivery log
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border"
            style={inputStyle}
          >
            {showAll ? 'Showing 300' : 'Showing 100'}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
            style={{ backgroundColor: theme.primary, color: '#fff' }}
          >
            <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Visible', value: stats.total, color: theme.primary },
          { label: 'Sent', value: stats.sent, color: '#10b981' },
          { label: 'Failed', value: stats.failed, color: '#ef4444' },
          { label: 'Skipped', value: stats.skipped, color: '#f59e0b' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-3"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || theme.surface }}
          >
            <div className="text-[11px] uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
              {s.label}
            </div>
            <div className="text-xl font-semibold mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-3 flex flex-wrap gap-3 items-end"
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || theme.surface }}
      >
        <label className="flex flex-col gap-1 min-w-[180px] flex-1">
          <span className="text-[11px] font-medium" style={{ color: theme.textLight }}>
            Search UID
          </span>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50"
              style={{ color: theme.text }}
            />
            <input
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder="Paste or partial UID…"
              className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium" style={{ color: theme.textLight }}>
            Status
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium" style={{ color: theme.textLight }}>
            Type
          </span>
          <select
            value={filterPref}
            onChange={(e) => setFilterPref(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            <option value="all">All types</option>
            {uniquePrefs.map((p) => (
              <option key={p} value={p}>
                {PREF_LABELS[p] || p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium" style={{ color: theme.textLight }}>
            Trigger
          </span>
          <select
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            <option value="all">All triggers</option>
            {uniqueTriggers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          className="px-3 py-2 rounded-lg text-sm border"
          style={inputStyle}
        >
          Apply
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: '#ef444455', backgroundColor: '#ef444411', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || theme.surface }}
      >
        <div
          className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wide font-semibold border-b"
          style={{ color: theme.textLight, borderColor: theme.border }}
        >
          <div className="col-span-2">When</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-3">Triggered by</div>
          <div className="col-span-2">UID</div>
          <div className="col-span-1">Slot</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: theme.textLight }}>
            Loading delivery log…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: theme.textLight }}>
            No push deliveries logged yet. New sends will appear here automatically.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: theme.border }}>
            {filtered.map((row) => {
              const status = STATUS_META[row.status] || STATUS_META.failed;
              const StatusIcon = status.Icon;
              const PrefIcon = PREF_ICONS[row.prefType] || Bell;
              const prefColor = PREF_COLORS[row.prefType] || theme.primary;
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm items-center hover:opacity-90"
                  style={{ color: theme.text }}
                  title={row.error || undefined}
                >
                  <div className="col-span-2 text-xs opacity-80">{formatWhen(row.sentAt)}</div>
                  <div className="col-span-2">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${status.color}22`, color: status.color }}
                    >
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                    {row.error && (
                      <div className="text-[10px] mt-0.5 opacity-60 truncate" title={row.error}>
                        {row.error}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <PrefIcon size={14} style={{ color: prefColor }} />
                      {PREF_LABELS[row.prefType] || row.prefType || row.templateType || '—'}
                    </span>
                    {row.templateType && row.prefType && (
                      <div className="text-[10px] opacity-50 truncate">{row.templateType}</div>
                    )}
                  </div>
                  <div className="col-span-3 text-xs truncate" title={row.trigger}>
                    {formatTrigger(row.trigger)}
                  </div>
                  <div className="col-span-2 font-mono text-[11px]" title={row.userId}>
                    {shortUid(row.userId)}
                  </div>
                  <div className="col-span-1 text-[11px] opacity-70 truncate">
                    {row.slot || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
