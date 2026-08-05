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
  Eye,
  Funnel,
} from '@phosphor-icons/react';
import CustomDropdown from '../common/inputs/CustomDropdown';

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
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const INITIAL_VISIBLE = 6;

export default function PushDeliveryTracker({ theme, embedded = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [searchUid, setSearchUid] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPref, setFilterPref] = useState('all');
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

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

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [searchUid, filterStatus, filterPref, filterTrigger]);

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

  const visibleRows = filtered.slice(0, visibleCount);
  const remainingCount = Math.max(0, filtered.length - visibleCount);

  const statusOptions = [
    {
      value: 'all',
      label: 'All Statuses',
      icon: <Funnel size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    {
      value: 'sent',
      label: 'Sent',
      icon: <CheckCircle size={18} weight="duotone" style={{ color: '#10b981' }} />,
    },
    {
      value: 'failed',
      label: 'Failed',
      icon: <XCircle size={18} weight="duotone" style={{ color: '#ef4444' }} />,
    },
    {
      value: 'skipped',
      label: 'Skipped',
      icon: <WarningCircle size={18} weight="duotone" style={{ color: '#f59e0b' }} />,
    },
  ];

  const typeOptions = [
    {
      value: 'all',
      label: 'All Types',
      icon: <Funnel size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    ...uniquePrefs.map((p) => {
      const PrefIcon = PREF_ICONS[p] || Bell;
      const color = PREF_COLORS[p] || theme.primary;
      return {
        value: p,
        label: PREF_LABELS[p] || p,
        icon: <PrefIcon size={18} weight="duotone" style={{ color }} />,
      };
    }),
  ];

  const triggerOptions = [
    {
      value: 'all',
      label: 'All Triggers',
      icon: <Lightning size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    ...uniqueTriggers.map((t) => ({
      value: t,
      label: t,
      icon: <Lightning size={18} weight="duotone" style={{ color: theme.primary }} />,
    })),
  ];

  const pillShadow = theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)';

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            <Bell size={20} weight="duotone" style={{ color: theme.primary }} />
            Notification Tracker
          </h2>
          <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
            Live push delivery log — type, trigger, UID, and status. No message contents.
          </p>
        </div>
      )}

      {/* Filters — matches Email History controls */}
      <section className="space-y-3">
        <div className="relative">
          <MagnifyingGlass
            size={18}
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: theme.textLight }}
          />
          <input
            type="text"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value)}
            placeholder="Search by UID…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.cardBackground || theme.surface,
              color: theme.text,
              boxShadow: theme.isDark ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
            }}
          />
        </div>

        <div className="flex flex-nowrap items-center gap-2">
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              theme={theme}
              outlined
              customShadow
              placeholder="Status…"
            />
          </div>
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={filterPref}
              onChange={setFilterPref}
              options={typeOptions}
              theme={theme}
              outlined
              customShadow
              placeholder="Type…"
            />
          </div>
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={filterTrigger}
              onChange={setFilterTrigger}
              options={triggerOptions}
              theme={theme}
              outlined
              customShadow
              placeholder="Trigger…"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-3 py-2 rounded-full text-sm font-semibold tracking-wide transition-all hover:brightness-105 active:scale-[0.97] shrink-0 whitespace-nowrap"
            style={{
              backgroundColor: theme.cardBackground || theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              boxShadow: pillShadow,
            }}
            title={showAll ? 'Show 100' : 'Show 300'}
          >
            {showAll ? '300' : '100'}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-full transition-all hover:brightness-105 active:scale-[0.97] shrink-0 disabled:opacity-50"
            style={{
              backgroundColor: theme.cardBackground || theme.surface,
              color: theme.primary,
              border: `1px solid ${theme.border}`,
              boxShadow: pillShadow,
            }}
            title="Refresh log"
          >
            <ArrowsClockwise size={18} weight="duotone" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Visible', value: stats.total, color: theme.primary, Icon: Eye },
          { label: 'Sent', value: stats.sent, color: '#10b981', Icon: CheckCircle },
          { label: 'Failed', value: stats.failed, color: '#ef4444', Icon: XCircle },
          { label: 'Skipped', value: stats.skipped, color: '#f59e0b', Icon: WarningCircle },
        ].map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="rounded-2xl border px-3 py-3 flex items-center gap-3"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.cardBackground || theme.surface,
              boxShadow: theme.isDark
                ? '0 4px 16px rgba(0,0,0,0.2)'
                : '0 4px 16px rgba(47,59,58,0.05)',
            }}
          >
            <div
              className="flex-shrink-0 p-2 rounded-xl"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={18} weight="duotone" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: theme.textLight }}
              >
                {label}
              </div>
              <div
                className="text-lg font-bold tabular-nums leading-tight mt-0.5"
                style={{ color: theme.text }}
              >
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: '#ef444455', backgroundColor: '#ef444411', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2
          className="text-sm font-bold flex items-center gap-2 pb-1 border-b"
          style={{ color: theme.text, borderColor: theme.border }}
        >
          <Bell size={16} weight="duotone" style={{ color: theme.primary }} />
          Delivery Log
          <span className="font-normal text-[11px]" style={{ color: theme.textLight }}>
            {filtered.length === 0
              ? '0 results'
              : `Showing ${visibleRows.length} of ${filtered.length}`}
          </span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowsClockwise className="animate-spin" size={24} weight="duotone" style={{ color: theme.primary }} />
            <span className="ml-3 text-sm" style={{ color: theme.textLight }}>Loading delivery log…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-12 rounded-2xl border"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground || theme.surface }}
          >
            <Bell size={48} weight="duotone" className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>
              {entries.length === 0 ? 'No push deliveries yet' : 'No deliveries match your filters'}
            </p>
            <p className="text-xs" style={{ color: theme.textLight }}>
              {entries.length === 0
                ? 'New sends will appear here automatically'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRows.map((row) => {
              const status = STATUS_META[row.status] || STATUS_META.failed;
              const StatusIcon = status.Icon;
              const PrefIcon = PREF_ICONS[row.prefType] || Bell;
              const prefColor = PREF_COLORS[row.prefType] || theme.primary;
              const title =
                PREF_LABELS[row.prefType] || row.templateType || row.prefType || 'Push notification';
              const isFailed = row.status === 'failed';

              return (
                <div
                  key={row.id}
                  className="rounded-2xl border overflow-hidden transition-all"
                  style={{
                    borderColor: isFailed ? '#ef4444' : theme.border,
                    backgroundColor: theme.cardBackground || theme.surface,
                    boxShadow: theme.isDark
                      ? '0 4px 16px rgba(0,0,0,0.2)'
                      : '0 4px 16px rgba(47,59,58,0.05)',
                  }}
                  title={row.error || undefined}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 p-2.5 rounded-xl"
                        style={{ backgroundColor: `${prefColor}18` }}
                      >
                        <PrefIcon size={20} weight="duotone" style={{ color: prefColor }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm truncate" style={{ color: theme.text }}>
                          {title}
                        </h4>
                        <p className="text-xs mt-0.5 truncate font-mono" style={{ color: theme.textLight }} title={row.userId}>
                          {row.userId || '—'}
                        </p>
                        {row.error && (
                          <p className="text-[11px] mt-1 truncate" style={{ color: '#ef4444' }} title={row.error}>
                            {row.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{ backgroundColor: `${prefColor}18`, color: prefColor }}
                      >
                        <PrefIcon size={14} weight="duotone" />
                        {PREF_LABELS[row.prefType] || row.prefType || row.templateType || 'Unknown'}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{ backgroundColor: `${status.color}22`, color: status.color }}
                      >
                        <StatusIcon size={14} weight="duotone" />
                        {status.label}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                          color: theme.text,
                        }}
                      >
                        <Clock size={14} weight="duotone" style={{ color: theme.primary }} />
                        {formatWhen(row.sentAt)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                          color: theme.textLight,
                        }}
                        title={row.trigger}
                      >
                        <Lightning size={14} weight="duotone" style={{ color: theme.primary }} />
                        {formatTrigger(row.trigger)}
                      </span>
                      {row.slot && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                          style={{
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                            color: theme.textLight,
                          }}
                        >
                          <Clock size={14} weight="duotone" style={{ color: theme.primary }} />
                          {row.slot}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {remainingCount > 0 && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-105 active:scale-[0.99]"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                  color: theme.primary,
                  border: `1px dashed ${theme.border}`,
                }}
              >
                + Show more ({remainingCount} left)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
