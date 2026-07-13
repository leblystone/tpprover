/**
 * Renewal Date Utilities
 * Handles renewal date display for subscriptions across all platforms
 */

function parseSubscriptionDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'object' && val.seconds != null) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Get formatted renewal date from subscription
 * @param {Object} subscription - Subscription object
 * @returns {Object} { date: Date|null, formattedDate: string|null, daysUntil: number|null }
 */
export function getRenewalDate(subscription) {
  if (!subscription) {
    return { date: null, formattedDate: null, daysUntil: null };
  }

  // Lifetime subscriptions don't have renewal dates
  if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime') {
    return { date: null, formattedDate: 'Never (Lifetime Access)', daysUntil: null };
  }

  // Check for subscription end date (all platforms use currentPeriodEnd)
  let renewalDate = null;

  // Try currentPeriodEnd first (standard field across all platforms)
  if (subscription.currentPeriodEnd) {
    renewalDate = parseSubscriptionDate(subscription.currentPeriodEnd);
  } else if (subscription.cancelAt) {
    renewalDate = parseSubscriptionDate(subscription.cancelAt);
  }

  // If no renewal date found, return null
  if (!renewalDate || isNaN(renewalDate.getTime())) {
    return { date: null, formattedDate: null, daysUntil: null };
  }

  // Calculate days until renewal
  const now = new Date();
  const timeDiff = renewalDate.getTime() - now.getTime();
  const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Format the date
  const formattedDate = renewalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    date: renewalDate,
    formattedDate,
    daysUntil
  };
}

function isCancelFlagTruthy(val) {
  return val === true || val === 'true' || val === 1;
}

/**
 * True when the user turned off auto-renew / scheduled cancel at period end (still may have access until then).
 */
export function isSubscriptionCancelingRenewal(subscription) {
  if (!subscription) return false;
  if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime') return false;

  if (
    isCancelFlagTruthy(subscription.cancelAtPeriodEnd) ||
    isCancelFlagTruthy(subscription.cancel_at_period_end)
  ) {
    return true;
  }
  if (subscription.status === 'canceling') return true;
  if (subscription.isAutoRenewing === false || subscription.autoRenewing === false) return true;

  const cancelAt = parseSubscriptionDate(subscription.cancelAt);
  const periodEnd = parseSubscriptionDate(subscription.currentPeriodEnd);
  if (cancelAt && cancelAt > new Date()) {
    if (!periodEnd || Math.abs(cancelAt.getTime() - periodEnd.getTime()) < 48 * 60 * 60 * 1000) {
      return true;
    }
  }

  if (subscription.status === 'canceled') {
    const { daysUntil } = getRenewalDate(subscription);
    return daysUntil !== null && daysUntil >= 0;
  }

  return false;
}

/**
 * Admin/user-detail copy for the period-end row (renew vs cancel-at-period-end).
 */
export function getAdminRenewalOutlook(subscription) {
  const canceling = isSubscriptionCancelingRenewal(subscription);
  const { formattedDate, daysUntil, date } = getRenewalDate(subscription);
  const shortDate =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : formattedDate || null;

  if (canceling) {
    const daysPhrase =
      daysUntil !== null && daysUntil >= 0
        ? daysUntil === 0
          ? 'ends today'
          : daysUntil === 1
            ? '1 day left'
            : `${daysUntil} days left`
        : null;
    return {
      canceling: true,
      rowLabel: 'Access ends',
      dateText: shortDate,
      detail: `Will not renew${daysPhrase ? ` · ${daysPhrase}` : ''}`,
      statusNote: 'Canceled next billing cycle',
    };
  }

  return {
    canceling: false,
    rowLabel: 'Next billing',
    dateText: shortDate,
    detail: null,
    statusNote: null,
  };
}

/**
 * Get renewal status message
 * @param {Object} subscription - Subscription object
 * @returns {string} Status message
 */
export function getRenewalStatusMessage(subscription) {
  if (!subscription) {
    return 'No active subscription';
  }

  // Lifetime subscriptions
  if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime') {
    return 'Lifetime access - no renewal needed';
  }

  const { daysUntil, formattedDate } = getRenewalDate(subscription);

  // No renewal date found
  if (daysUntil === null) {
    return 'Renewal date not available';
  }

  // Subscription expired
  if (daysUntil < 0) {
    return `Expired on ${formattedDate}`;
  }

  // Subscription ending today
  if (daysUntil === 0) {
    return `Renews today`;
  }

  // Subscription ending within 7 days
  if (daysUntil <= 7) {
    return `Renews in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  }

  // Normal renewal
  return `Renews on ${formattedDate}`;
}

/**
 * Check if subscription is about to renew (within 7 days)
 * @param {Object} subscription - Subscription object
 * @returns {boolean}
 */
export function isRenewalUpcoming(subscription) {
  const { daysUntil } = getRenewalDate(subscription);
  return daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;
}

/**
 * Check if subscription is expired
 * @param {Object} subscription - Subscription object
 * @returns {boolean}
 */
export function isSubscriptionExpired(subscription) {
  if (!subscription) return true;
  
  // Lifetime never expires
  if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime') {
    return false;
  }

  const { daysUntil } = getRenewalDate(subscription);
  return daysUntil !== null && daysUntil < 0;
}

/**
 * Format renewal date for display in UI
 * @param {Object} subscription - Subscription object
 * @param {Object} options - Display options
 * @returns {string} Formatted renewal display text
 */
export function formatRenewalDisplay(subscription, options = {}) {
  const {
    showDaysUntil = true,
    showFullDate = true,
    prefix = 'Next renewal'
  } = options;

  if (!subscription) {
    return 'No subscription';
  }

  // Lifetime subscriptions
  if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime') {
    return 'Lifetime Access';
  }

  const { formattedDate, daysUntil } = getRenewalDate(subscription);

  // No renewal date
  if (!formattedDate) {
    return 'Renewal date pending';
  }

  // Subscription expired
  if (daysUntil < 0) {
    return `Expired ${formattedDate}`;
  }

  // Cancelled subscription (will expire at period end)
  if (subscription.cancelAtPeriodEnd) {
    return `Access ends ${formattedDate}`;
  }

  // Build display text
  let displayText = prefix;
  
  if (showDaysUntil && daysUntil <= 30) {
    displayText += ` in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  }
  
  if (showFullDate) {
    displayText += ` (${formattedDate})`;
  } else if (!showDaysUntil || daysUntil > 30) {
    displayText += ` ${formattedDate}`;
  }

  return displayText;
}

/**
 * Get renewal date color based on status
 * @param {Object} subscription - Subscription object
 * @param {Object} theme - Theme object
 * @returns {string} Color value
 */
export function getRenewalDateColor(subscription, theme) {
  const { daysUntil } = getRenewalDate(subscription);

  if (daysUntil === null) {
    return theme.mutedText || '#999';
  }

  // Expired
  if (daysUntil < 0) {
    return '#EF4444'; // Red
  }

  // Expiring soon (7 days or less)
  if (daysUntil <= 7) {
    return '#F59E0B'; // Orange
  }

  // Active and healthy
  return theme.primary || '#2F3B3A';
}

export default {
  getRenewalDate,
  getRenewalStatusMessage,
  isRenewalUpcoming,
  isSubscriptionExpired,
  isSubscriptionCancelingRenewal,
  getAdminRenewalOutlook,
  formatRenewalDisplay,
  getRenewalDateColor
};







