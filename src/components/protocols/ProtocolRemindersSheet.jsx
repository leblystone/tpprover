import React, { useMemo, useState, useEffect } from 'react';
import { Bell, CaretRight, CheckCircle, LinkSimple } from '@phosphor-icons/react';
import { SunDim, SunMedium, Sun, Sunset, MoonStar, ClockPlus } from 'lucide-react';
import BottomSheet from '../common/BottomSheet';
import Modal from '../common/Modal';
import TimePicker15Min from '../common/inputs/TimePicker15Min';
import { prepareItemForSave } from '../../utils/userDataSave';

function formatTimeLabel(hhmm) {
  if (!hhmm || !String(hhmm).includes(':')) return hhmm || '—';
  const [hStr, mStr] = String(hhmm).split(':');
  let h = Number(hStr);
  const m = mStr || '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

function scheduleLabel(times) {
  const t = Array.isArray(times) ? times : [];
  if (t.length === 0) return 'Unscheduled';
  return t.join(' · ');
}

/**
 * FAB entry for research reminders: global AM/PM nudges + per-peptide
 * custom times pulled from active protocols (all / some / one).
 */
export default function ProtocolRemindersSheet({
  open,
  onClose,
  theme,
  protocols = [],
  updateProtocol,
  reminderSettings,
  updateReminderSetting,
  pushNotificationStatus,
  navigate,
}) {
  const [scope, setScope] = useState('all'); // 'all' | 'some' | 'one'
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [oneIndex, setOneIndex] = useState(0);
  const [timeModal, setTimeModal] = useState(null); // 'am' | 'pm' | 'peptide' | null
  const [customTime, setCustomTime] = useState('08:00');
  const [busy, setBusy] = useState(false);

  const peptideRows = useMemo(() => {
    const rows = [];
    (protocols || []).forEach((p) => {
      if (!p) return;
      const protocolName = p.protocolName || p.name || 'Protocol';
      (p.peptides || []).forEach((pep, idx) => {
        if (!pep) return;
        if (pep.frequency?.type === 'as_needed') return;
        const peptideId = pep.id || `idx-${idx}`;
        rows.push({
          key: `${p.id}:${peptideId}`,
          protocolId: p.id,
          protocolName,
          peptideId,
          peptideName: pep.name || pep.peptideName || 'Peptide',
          schedule: pep.frequency?.time || [],
          customReminder: !!pep.frequency?.customReminder,
          reminderTime: pep.frequency?.reminderTime || null,
          peptideIndex: idx,
        });
      });
    });
    return rows;
  }, [protocols]);

  const unsetRows = useMemo(
    () => peptideRows.filter((r) => !r.customReminder),
    [peptideRows]
  );

  // Prefer unset peptides when walking one-at-a-time
  const oneQueue = unsetRows.length > 0 ? unsetRows : peptideRows;
  const oneCurrent = oneQueue[Math.min(oneIndex, Math.max(0, oneQueue.length - 1))] || null;

  useEffect(() => {
    if (!open) return;
    setScope('all');
    setSelectedKeys(new Set(peptideRows.map((r) => r.key)));
    setOneIndex(0);
  }, [open, peptideRows]);

  const toggleKey = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const targetsForApply = () => {
    if (scope === 'all') return peptideRows;
    if (scope === 'some') return peptideRows.filter((r) => selectedKeys.has(r.key));
    if (scope === 'one' && oneCurrent) return [oneCurrent];
    return [];
  };

  const patchPeptides = (keys, patchFn) => {
    if (!updateProtocol || keys.length === 0) return 0;
    const byProtocol = new Map();
    keys.forEach((row) => {
      if (!byProtocol.has(row.protocolId)) byProtocol.set(row.protocolId, []);
      byProtocol.get(row.protocolId).push(row);
    });
    let count = 0;
    byProtocol.forEach((rows, protocolId) => {
      const protocol = protocols.find((p) => p.id === protocolId);
      if (!protocol) return;
      const peptides = (protocol.peptides || []).map((pep, idx) => {
        const match = rows.find(
          (r) => r.peptideIndex === idx || (pep.id && r.peptideId === pep.id)
        );
        if (!match) return pep;
        count += 1;
        const frequency = { ...(pep.frequency || {}) };
        patchFn(frequency, match);
        return { ...pep, frequency };
      });
      updateProtocol(prepareItemForSave({ ...protocol, peptides }));
    });
    return count;
  };

  const applyUseGlobal = () => {
    const targets = targetsForApply();
    if (targets.length === 0) return;
    setBusy(true);
    try {
      patchPeptides(targets, (frequency) => {
        frequency.customReminder = false;
        delete frequency.reminderTime;
      });
      if (scope === 'one') {
        setOneIndex((i) => Math.min(i + 1, Math.max(0, oneQueue.length - 1)));
      }
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: 'Using global AM/PM times', type: 'success' },
        })
      );
    } finally {
      setBusy(false);
    }
  };

  const openPeptideTimePicker = () => {
    const targets = targetsForApply();
    if (targets.length === 0) return;
    const first = targets[0];
    const isAM = (first.schedule || []).includes('AM') && !(first.schedule || []).includes('PM');
    setCustomTime(first.reminderTime || (isAM ? reminderSettings?.amTime || '08:00' : reminderSettings?.pmTime || '18:00'));
    setTimeModal('peptide');
  };

  const applyCustomTime = (time) => {
    const targets = targetsForApply();
    if (targets.length === 0 || !time) return;
    setBusy(true);
    try {
      patchPeptides(targets, (frequency) => {
        frequency.customReminder = true;
        frequency.reminderTime = time;
      });
      setTimeModal(null);
      if (scope === 'one') {
        setOneIndex((i) => Math.min(i + 1, Math.max(0, oneQueue.length - 1)));
      }
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: `Custom reminder set to ${formatTimeLabel(time)}`,
            type: 'success',
          },
        })
      );
    } finally {
      setBusy(false);
    }
  };

  const pushOk = pushNotificationStatus?.enabled;
  const pushLoading = pushNotificationStatus?.loading;
  const pushSupported = pushNotificationStatus?.supported !== false;

  const scopeOptions = [
    { value: 'all', label: 'All' },
    { value: 'some', label: 'Some' },
    { value: 'one', label: 'One' },
  ];
  const scopeIndex = Math.max(0, scopeOptions.findIndex((o) => o.value === scope));

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Reminders"
        theme={theme}
        maxHeight="90vh"
        maxWidthClass="md:max-w-lg"
      >
        <div className="space-y-5 pb-2">
          {/* Global AM / PM */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-0.5">
              <Bell size={14} weight="duotone" style={{ color: theme.primary }} />
              <h3
                className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: theme.textLight }}
              >
                Daily research nudges
              </h3>
            </div>
            <p className="text-xs leading-snug px-0.5" style={{ color: theme.textLight }}>
              Morning & evening alerts when you have research tasks. Same controls live in Settings → Notifications.
            </p>

            {[
              { key: 'am', enabledKey: 'amEnabled', timeKey: 'amTime', label: 'Morning (AM)', hint: 'If you have AM tasks scheduled' },
              { key: 'pm', enabledKey: 'pmEnabled', timeKey: 'pmTime', label: 'Evening (PM)', hint: 'If you have PM tasks scheduled' },
            ].map((slot) => {
              const enabled = reminderSettings?.[slot.enabledKey] && pushOk;
              const time = reminderSettings?.[slot.timeKey];
              return (
                <div
                  key={slot.key}
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>{slot.label}</div>
                      <div className="text-[11px]" style={{ color: theme.textLight }}>{slot.hint}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!enabled}
                        disabled={pushLoading || !pushSupported}
                        onChange={(e) => updateReminderSetting?.(slot.enabledKey, e.target.checked)}
                      />
                      <div
                        className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={{
                          backgroundColor: enabled ? theme.primary : '#d1d5db',
                          opacity: pushLoading || !pushSupported ? 0.5 : 1,
                        }}
                      />
                    </label>
                  </div>
                  {enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTime(time || (slot.key === 'am' ? '08:00' : '18:00'));
                        setTimeModal(slot.key);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)',
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <span>{formatTimeLabel(time)}</span>
                      <span className="text-xs font-semibold" style={{ color: theme.primary }}>Edit</span>
                    </button>
                  )}
                </div>
              );
            })}

            {navigate && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  navigate('/app/settings/notifications');
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 px-0.5"
                style={{ color: theme.primary }}
              >
                <LinkSimple size={12} weight="bold" />
                Open in Settings
              </button>
            )}
          </section>

          {/* Per-peptide from active protocols */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-0.5">
              <CheckCircle size={14} weight="duotone" style={{ color: theme.primary }} />
              <h3
                className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: theme.textLight }}
              >
                Active protocol times
              </h3>
            </div>
            <p className="text-xs leading-snug px-0.5" style={{ color: theme.textLight }}>
              Pulls schedule slots from your active protocols so you can set custom dose reminders without re-entering everything.
            </p>

            {peptideRows.length === 0 ? (
              <div
                className="rounded-xl p-4 text-center text-sm"
                style={{ color: theme.textLight, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              >
                No active protocols with scheduled peptides yet.
              </div>
            ) : (
              <>
                {/* Scope segmented control */}
                <div
                  role="group"
                  aria-label="Reminder scope"
                  className="relative grid p-1 rounded-full"
                  style={{
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(47,59,58,0.09)',
                    boxShadow: theme.isDark
                      ? 'inset 0 2px 4px rgba(0,0,0,0.35)'
                      : 'inset 0 2px 5px rgba(47,59,58,0.14), 0 1px 0 rgba(255,255,255,0.7)',
                  }}
                >
                  <div
                    className="absolute top-1 bottom-1 left-1 rounded-full pointer-events-none"
                    style={{
                      width: 'calc((100% - 8px) / 3)',
                      transform: `translateX(calc(${scopeIndex} * 100%))`,
                      transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                      backgroundColor: theme.primary || '#7F9E95',
                    }}
                    aria-hidden
                  />
                  {scopeOptions.map((o) => {
                    const active = scope === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setScope(o.value)}
                        className="relative z-[1] py-2 rounded-full text-xs font-semibold transition-colors"
                        style={{
                          color: active
                            ? (theme.textOnPrimary || '#fff')
                            : theme.isDark
                              ? 'rgba(255,255,255,0.45)'
                              : 'rgba(47,59,58,0.45)',
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] px-0.5" style={{ color: theme.textLight }}>
                  {scope === 'all' && `Apply to all ${peptideRows.length} scheduled peptide${peptideRows.length !== 1 ? 's' : ''}.`}
                  {scope === 'some' && 'Select which peptides to update.'}
                  {scope === 'one' && (
                    unsetRows.length > 0
                      ? `Walk through peptides without a custom time (${unsetRows.length} left).`
                      : 'All peptides already have custom times — edit one at a time.'
                  )}
                </p>

                {/* List */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-0.5">
                  {(scope === 'one' ? (oneCurrent ? [oneCurrent] : []) : peptideRows).map((row) => {
                    const checked = scope === 'all' || (scope === 'some' && selectedKeys.has(row.key)) || scope === 'one';
                    const dimmed = scope === 'some' && !selectedKeys.has(row.key);
                    return (
                      <button
                        key={row.key}
                        type="button"
                        disabled={scope === 'all' || scope === 'one'}
                        onClick={() => scope === 'some' && toggleKey(row.key)}
                        className="w-full text-left rounded-xl p-3 transition-opacity"
                        style={{
                          opacity: dimmed ? 0.45 : 1,
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${checked && scope === 'some' ? `${theme.primary}55` : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                              {row.peptideName}
                            </div>
                            <div className="text-[11px] truncate" style={{ color: theme.textLight }}>
                              {row.protocolName} · {scheduleLabel(row.schedule)}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div
                              className="text-[11px] font-semibold"
                              style={{ color: row.customReminder ? theme.primary : theme.textLight }}
                            >
                              {row.customReminder ? formatTimeLabel(row.reminderTime) : 'Global'}
                            </div>
                            {scope === 'some' && (
                              <div
                                className="mt-1 ml-auto w-4 h-4 rounded border flex items-center justify-center"
                                style={{
                                  borderColor: checked ? theme.primary : theme.border,
                                  backgroundColor: checked ? theme.primary : 'transparent',
                                }}
                              >
                                {checked && <span className="text-white text-[10px] leading-none">✓</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || targetsForApply().length === 0}
                    onClick={applyUseGlobal}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }}
                  >
                    Use global AM/PM
                  </button>
                  <button
                    type="button"
                    disabled={busy || targetsForApply().length === 0}
                    onClick={openPeptideTimePicker}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Set custom time
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>
                {scope === 'one' && oneQueue.length > 1 && (
                  <div className="flex items-center justify-between text-[11px] px-0.5" style={{ color: theme.textLight }}>
                    <button
                      type="button"
                      className="font-semibold disabled:opacity-40"
                      style={{ color: theme.primary }}
                      disabled={oneIndex <= 0}
                      onClick={() => setOneIndex((i) => Math.max(0, i - 1))}
                    >
                      Previous
                    </button>
                    <span>
                      {Math.min(oneIndex + 1, oneQueue.length)} of {oneQueue.length}
                    </span>
                    <button
                      type="button"
                      className="font-semibold disabled:opacity-40"
                      style={{ color: theme.primary }}
                      disabled={oneIndex >= oneQueue.length - 1}
                      onClick={() => setOneIndex((i) => Math.min(oneQueue.length - 1, i + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </BottomSheet>

      {/* Global AM time */}
      <Modal
        open={timeModal === 'am'}
        onClose={() => setTimeModal(null)}
        title="Schedule Reminder (AM)"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <TimeSuggestPick
          theme={theme}
          suggestions={[
            { icon: SunDim, time: '07:00', label: '7:00 AM' },
            { icon: SunMedium, time: '09:30', label: '9:30 AM' },
            { icon: Sun, time: '11:00', label: '11:00 AM' },
          ]}
          selected={reminderSettings?.amTime}
          customValue={customTime}
          onCustomChange={setCustomTime}
          timeRange="am"
          onPick={(t) => {
            updateReminderSetting?.('amTime', t);
            setTimeModal(null);
          }}
        />
      </Modal>

      {/* Global PM time */}
      <Modal
        open={timeModal === 'pm'}
        onClose={() => setTimeModal(null)}
        title="Schedule Reminder (PM)"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <TimeSuggestPick
          theme={theme}
          suggestions={[
            { icon: Sun, time: '13:00', label: '1:00 PM' },
            { icon: Sunset, time: '17:30', label: '5:30 PM' },
            { icon: MoonStar, time: '20:00', label: '8:00 PM' },
          ]}
          selected={reminderSettings?.pmTime}
          customValue={customTime}
          onCustomChange={setCustomTime}
          timeRange="pm"
          onPick={(t) => {
            updateReminderSetting?.('pmTime', t);
            setTimeModal(null);
          }}
        />
      </Modal>

      {/* Peptide custom time */}
      <Modal
        open={timeModal === 'peptide'}
        onClose={() => setTimeModal(null)}
        title="Custom peptide reminder"
        theme={theme}
        variant="modern"
        maxWidth="max-w-md"
      >
        <TimeSuggestPick
          theme={theme}
          suggestions={[
            { icon: SunDim, time: '07:00', label: '7:00 AM' },
            { icon: SunMedium, time: '09:30', label: '9:30 AM' },
            { icon: Sunset, time: '17:30', label: '5:30 PM' },
            { icon: MoonStar, time: '20:00', label: '8:00 PM' },
          ]}
          selected={customTime}
          customValue={customTime}
          onCustomChange={setCustomTime}
          timeRange={undefined}
          onPick={applyCustomTime}
        />
      </Modal>
    </>
  );
}

function TimeSuggestPick({
  theme,
  suggestions,
  selected,
  customValue,
  onCustomChange,
  timeRange,
  onPick,
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {suggestions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.time;
          return (
            <button
              key={option.time}
              type="button"
              onClick={() => onPick(option.time)}
              className="w-full px-4 py-3 rounded-lg text-left transition-all flex items-center gap-3 active:scale-[0.98]"
              style={{
                border: isSelected ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                backgroundColor: isSelected ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                color: isSelected ? '#fff' : theme.text,
                boxShadow: isSelected
                  ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)'
                  : 'inset 0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <Icon size={20} style={{ color: isSelected ? '#fff' : theme.textLight }} />
              <span className="flex-1 font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
      <div className="border-t my-2" style={{ borderColor: theme.border }} />
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: theme.text }}>
          <ClockPlus size={16} />
          Custom time (15 min)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TimePicker15Min
              value={customValue}
              onChange={onCustomChange}
              theme={theme}
              timeRange={timeRange}
            />
          </div>
          <button
            type="button"
            onClick={() => customValue && onPick(customValue)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: theme.primary }}
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
