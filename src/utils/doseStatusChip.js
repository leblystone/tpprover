import { getLocalDateString, parseDateString } from './date';

/**
 * Human-friendly relative day label vs a reference date (usually today / view day).
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} [relativeToKey]
 * @returns {string}
 */
export function describeDateRelative(dateKey, relativeToKey = getLocalDateString()) {
  if (!dateKey) return '';
  const target = parseDateString(dateKey);
  const relative = parseDateString(relativeToKey) || new Date();
  if (!target || Number.isNaN(target.getTime())) return String(dateKey);

  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOf(target) - startOf(relative)) / 86400000);
  const shortDate = target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (diffDays === 0) return 'today';
  if (diffDays === -1) return 'yesterday';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays >= -7 && diffDays <= -2) return `last week (${shortDate})`;
  if (diffDays >= 2 && diffDays <= 7) return `${shortDate}`;

  return shortDate;
}

/**
 * Build label + explanation for schedule status chips.
 * @param {object} task
 * @param {{ viewDateKey?: string }} [opts]
 * @returns {{ label: string, explanation: string } | null}
 */
export function getDoseStatusChipInfo(task, opts = {}) {
  if (!task) return null;
  const viewDateKey = opts.viewDateKey || getLocalDateString();
  const isSkipped = !!(task._skipped || task.skipped);
  const isCatchUp = !!(task._extraSlot || task.isCatchUp);
  const isOneOff = !!(task.isOneOff || task._oneOff || task.type === 'oneOff' || task.type === 'one_off');
  const isSlotMove = !!task.movedFromProtocolSlot;
  const isRescheduled = !!(task._rescheduled || task.rescheduled || isSlotMove);

  if (isCatchUp) {
    const fromKey = task._fromDateKey || task.fromDateKey;
    const fromLabel = fromKey ? describeDateRelative(fromKey, viewDateKey) : null;
    return {
      label: 'Catch-up',
      explanation: fromLabel
        ? `Moved here from ${fromLabel}`
        : 'Extra dose added as a catch-up',
    };
  }

  if (isSkipped) {
    return {
      label: 'Skipped',
      explanation: 'This dose was skipped',
    };
  }

  if (isOneOff) {
    return {
      label: 'One-off',
      explanation: 'Logged as a one-off dose (not on your regular schedule)',
    };
  }

  if (isRescheduled) {
    const toKey = task._toDateKey || task.toDateKey;
    const toSlot = task._toSlot || task.toSlot;
    const fromSlot = task.movedFromProtocolSlot;

    if (toKey) {
      const toLabel = describeDateRelative(toKey, viewDateKey);
      const slotBit = toSlot ? ` (${toSlot})` : '';
      return {
        label: 'Rescheduled',
        explanation: `Rescheduled to ${toLabel}${slotBit}`,
      };
    }

    if (fromSlot) {
      const currentSlot = String(task.time || task.timeSlot || '').toUpperCase();
      return {
        label: 'Rescheduled',
        explanation: currentSlot
          ? `Moved from ${fromSlot} to ${currentSlot}`
          : `Moved from ${fromSlot}`,
      };
    }

    return {
      label: 'Rescheduled',
      explanation: 'This dose was moved to another time',
    };
  }

  return null;
}
