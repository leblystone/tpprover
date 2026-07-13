/**
 * Admin panel helpers – analytics calculations and feedback analysis.
 * Extracted from Admin.jsx for use across route-based admin pages.
 */

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function toDateKey(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : (val instanceof Date ? val : new Date(val));
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayDateKey() {
  return toDateKey(new Date());
}

export function getUserCreatedDateKey(user) {
  return toDateKey(user?.createdAt);
}

export function filterUsersByDateRange(users, dateFrom, dateTo) {
  if (!users?.length) return [];
  return users.filter((u) => {
    const created = getUserCreatedDateKey(u);
    if (!created) return false;
    return created >= dateFrom && created <= dateTo;
  });
}

/** Daily signup counts for every day in [dateFrom, dateTo]. */
export function buildDailySignupSeries(users, dateFrom, dateTo) {
  const daily = {};
  (users || []).forEach((u) => {
    const created = getUserCreatedDateKey(u);
    if (!created || created < dateFrom || created > dateTo) return;
    daily[created] = (daily[created] || 0) + 1;
  });

  const result = [];
  const cur = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo}T12:00:00`);
  let cumulative = 0;
  while (cur <= end) {
    const key = toDateKey(cur);
    const newUsers = daily[key] || 0;
    cumulative += newUsers;
    result.push({ date: key, newUsers, users: cumulative });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function getPresetDateRange(preset) {
  const now = new Date();
  const toStr = toDateKey(now);
  if (preset === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { dateFrom: toDateKey(d), dateTo: toStr, preset };
  }
  if (preset === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { dateFrom: toDateKey(d), dateTo: toStr, preset };
  }
  if (preset === 'thisYear') {
    return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: toStr, preset };
  }
  if (preset === 'lastYear') {
    const y = now.getFullYear() - 1;
    return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31`, preset };
  }
  if (preset === 'all') {
    return { dateFrom: '2020-01-01', dateTo: toStr, preset };
  }
  return { dateFrom: toStr, dateTo: toStr, preset: null };
}

export function scaleFeatureUsage(featureUsage, ratio) {
  const scaled = {};
  for (const [feature, data] of Object.entries(featureUsage || {})) {
    scaled[feature] = {
      ...data,
      uses: Math.round(((data?.uses) ?? 0) * ratio),
    };
  }
  return scaled;
}

/** Cap chart to at most maxBars days (most recent within range). */
export function chartSignupSlice(series, maxBars = 31) {
  if (!series?.length || series.length <= maxBars) return series || [];
  return series.slice(-maxBars);
}

export function calculateUserGrowth(users) {
  const now = new Date();
  const dailyRegistrations = {};
  let totalUsers = 0;
  let usersWithDates = 0;

  users.forEach((user) => {
    totalUsers++;
    if (user.createdAt && user.createdAt.toDate) {
      const date = user.createdAt.toDate().toISOString().split('T')[0];
      dailyRegistrations[date] = (dailyRegistrations[date] || 0) + 1;
      usersWithDates++;
    }
  });

  if (totalUsers > 0 && usersWithDates === 0) {
    const usersPerDay = Math.max(1, Math.ceil(totalUsers / 15));
    let remainingUsers = totalUsers;
    for (let i = 14; i >= 0 && remainingUsers > 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const usersThisDay = Math.min(usersPerDay, remainingUsers);
      dailyRegistrations[dateStr] = usersThisDay;
      remainingUsers -= usersThisDay;
    }
  }

  const growthData = [];
  let cumulativeUsers = 0;
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const newUsers = dailyRegistrations[dateStr] || 0;
    cumulativeUsers += newUsers;
    growthData.push({ date: dateStr, users: cumulativeUsers, newUsers });
  }
  return growthData;
}

export function calculateFeatureUsage(analyticsData) {
  const usage = analyticsData?.featureUsage || {};
  return {
    protocols: { uses: usage.protocolsCreated || 0, trend: 'up' },
    orders: { uses: usage.ordersTracked || 0, trend: 'up' },
    vendors: { uses: usage.vendorsAdded || 0, trend: 'up' },
    stockpile: { uses: usage.stockpileItems || 0, trend: 'up' },
    recon: { uses: usage.reconCalculations || 0, trend: 'up' },
    calendar: { uses: usage.calendarEntries || 0, trend: 'up' },
  };
}

export function calculateSessionData(users) {
  const now = new Date();
  const sessionData = [];
  for (let i = 7; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const activeThatDay = users.filter((user) => {
      if (!user.lastActive || !user.lastActive.toDate) return false;
      const lastActiveDate = user.lastActive.toDate().toISOString().split('T')[0];
      return lastActiveDate === dateStr;
    }).length;
    sessionData.push({
      date: dateStr,
      sessions: activeThatDay,
      avgDuration: activeThatDay > 0 ? 900 : 0,
    });
  }
  return sessionData;
}

export function calculateDeviceBreakdown(users) {
  const breakdown = {
    total: users.length,
    mobile: { count: 0, percentage: 0, byOS: { iOS: 0, Android: 0, Other: 0 } },
    tablet: { count: 0, percentage: 0 },
    desktop: { count: 0, percentage: 0 },
    browsers: {},
    usersWithDeviceInfo: 0,
    usersWithoutDeviceInfo: 0,
  };

  if (users.length === 0) return breakdown;

  users.forEach((user) => {
    const deviceInfo = user.deviceInfo || {};
    const hasDeviceInfo = !!(user.deviceInfo && user.deviceInfo.deviceType);
    if (hasDeviceInfo) breakdown.usersWithDeviceInfo++;
    else breakdown.usersWithoutDeviceInfo++;

    const deviceType = deviceInfo.deviceType || 'desktop';
    const mobileOS = deviceInfo.mobileOS;
    const browser = deviceInfo.browser || 'Other';

    if (deviceType === 'mobile') {
      breakdown.mobile.count++;
      if (mobileOS) breakdown.mobile.byOS[mobileOS] = (breakdown.mobile.byOS[mobileOS] || 0) + 1;
    } else if (deviceType === 'tablet') {
      breakdown.tablet.count++;
    } else {
      breakdown.desktop.count++;
    }
    if (hasDeviceInfo && browser) {
      breakdown.browsers[browser] = (breakdown.browsers[browser] || 0) + 1;
    }
  });

  breakdown.mobile.percentage = Math.round((breakdown.mobile.count / users.length) * 100);
  breakdown.tablet.percentage = Math.round((breakdown.tablet.count / users.length) * 100);
  breakdown.desktop.percentage = Math.round((breakdown.desktop.count / users.length) * 100);
  return breakdown;
}

export function analyzeFeedback(feedbackList) {
  const categories = {};
  const sentiment = { positive: 0, negative: 0, neutral: 0 };

  feedbackList.forEach((item) => {
    const message = (item.message || '').toLowerCase();
    if (message.includes('bug') || message.includes('error') || message.includes('broken')) {
      categories.bugs = (categories.bugs || 0) + 1;
    } else if (message.includes('feature') || message.includes('add') || message.includes('want')) {
      categories.features = (categories.features || 0) + 1;
    } else if (message.includes('love') || message.includes('great') || message.includes('awesome')) {
      categories.praise = (categories.praise || 0) + 1;
      sentiment.positive++;
    } else if (message.includes('hate') || message.includes('bad') || message.includes('terrible')) {
      sentiment.negative++;
    } else {
      sentiment.neutral++;
    }
  });

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  const thisWeekCount = feedbackList.filter((item) => {
    const d = item.submittedAt?.toDate ? item.submittedAt.toDate() : new Date(item.timestamp || item.submittedAt);
    return d >= oneWeekAgo;
  }).length;
  const lastWeekCount = feedbackList.filter((item) => {
    const d = item.submittedAt?.toDate ? item.submittedAt.toDate() : new Date(item.timestamp || item.submittedAt);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  }).length;
  const twoWeeksAgoCount = feedbackList.filter((item) => {
    const d = item.submittedAt?.toDate ? item.submittedAt.toDate() : new Date(item.timestamp || item.submittedAt);
    return d >= threeWeeksAgo && d < twoWeeksAgo;
  }).length;

  const thisWeekChange =
    lastWeekCount > 0
      ? `${thisWeekCount >= lastWeekCount ? '+' : ''}${Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)}%`
      : thisWeekCount > 0 ? '+100%' : '0%';
  const lastWeekChange =
    twoWeeksAgoCount > 0
      ? `${lastWeekCount >= twoWeeksAgoCount ? '+' : ''}${Math.round(((lastWeekCount - twoWeeksAgoCount) / twoWeeksAgoCount) * 100)}%`
      : lastWeekCount > 0 ? '+100%' : '0%';

  return {
    categories,
    sentiment,
    trends: [
      { week: 'This week', feedback: thisWeekCount, change: thisWeekChange },
      { week: 'Last week', feedback: lastWeekCount, change: lastWeekChange },
      { week: '2 weeks ago', feedback: twoWeeksAgoCount, change: '—' },
    ],
    autoResponses: [],
  };
}

/**
 * Infer where the user pays and which app surface they use (admin billing tab).
 * @returns {{
 *   store: 'stripe'|'apple'|'googleplay'|'squarespace'|'none'|'unknown',
 *   storeLabel: string,
 *   channel: 'web'|'ios_native'|'android_native'|'unknown',
 *   channelLabel: string,
 *   channelDetail: string,
 *   deviceLabel: string,
 *   showStripeTools: boolean,
 *   showAppleTools: boolean,
 *   showAndroidTools: boolean,
 * }}
 */
export function resolveAdminBillingContext(user) {
  const sub = user?.subscription || {};
  const device = user?.deviceInfo || {};

  let store = sub.paymentProvider || sub.source || null;
  if (store === 'google_play') store = 'googleplay';
  if (store === 'appstore') store = 'apple';

  if (!store) {
    if (sub.googlePlayPurchaseToken || sub.googlePlayProductId || sub.googlePlayOrderId) {
      store = 'googleplay';
    } else if (sub.appStoreTransactionId || sub.appStoreProductId) {
      store = 'apple';
    } else if (sub.squarespaceSubscriptionId || sub.squarespaceOrderId) {
      store = 'squarespace';
    } else if (sub.stripeCustomerId || sub.stripeSubscriptionId || sub.customerId) {
      store = 'stripe';
    } else if (sub.platform === 'apple') {
      store = 'apple';
    } else if (sub.platform === 'google-play' || sub.platform === 'googleplay') {
      store = 'googleplay';
    } else if (sub.platform === 'stripe' || sub.platform === 'squarespace') {
      store = sub.platform === 'squarespace' ? 'squarespace' : 'stripe';
    }
  }

  const hasSub =
    sub.status ||
    (Object.keys(sub).length > 0 && Object.values(sub).some((v) => v !== undefined && v !== null));
  if (!hasSub) store = 'none';

  const storeLabels = {
    stripe: 'Web — Stripe',
    apple: 'iOS — App Store',
    googleplay: 'Android — Google Play',
    squarespace: 'Web — Squarespace (legacy)',
    none: 'No subscription on file',
    unknown: 'Billing source unknown',
  };

  const ua = (device.userAgent || '').toLowerCase();
  const isCapacitorUa = /capacitor|com\.thepepplanner\.app/i.test(ua);
  const dt = (device.deviceType || '').toLowerCase();
  const os = device.mobileOS || '';

  let channel = 'unknown';
  let channelDetail = 'Check subscription fields or ask which store they used.';
  if (store === 'stripe' || store === 'squarespace') {
    channel = 'web';
    channelDetail = 'Paid on thepepplanner.app (browser checkout). Use Stripe sync/grant tools.';
  } else if (store === 'apple') {
    channel = 'ios_native';
    channelDetail = 'Paid through Apple In-App Purchase. Use the Apple manual grant — not Stripe.';
  } else if (store === 'googleplay') {
    channel = 'android_native';
    channelDetail = 'Paid through Google Play Billing. Use the Android manual grant — not Stripe.';
  } else if (store === 'none') {
    channelDetail = 'Trial or empty sub doc — ask if they paid on web, App Store, or Play Store.';
  }

  /** When billing store is unclear, infer likely app surface from last-seen device (not proof of purchase). */
  let likelySurface = null;
  let likelySurfaceDetail = null;
  if (channel === 'unknown') {
    if (isCapacitorUa || (os === 'iOS' && dt !== 'desktop' && !/safari/i.test(ua))) {
      likelySurface = 'ios_native';
      likelySurfaceDetail = 'Last login looks like the iOS app — confirm App Store if they say they paid in-app.';
    } else if (os === 'Android' && dt !== 'desktop' && isCapacitorUa) {
      likelySurface = 'android_native';
      likelySurfaceDetail = 'Last login looks like the Android app — confirm Play Store if they paid in-app.';
    } else if (os === 'iOS' && (dt === 'mobile' || dt === 'tablet')) {
      likelySurface = 'web';
      likelySurfaceDetail = 'Last seen on iPhone/iPad in a browser — often mobile web + Stripe, not App Store.';
    } else if (os === 'Android' && dt === 'mobile') {
      likelySurface = 'web';
      likelySurfaceDetail = 'Last seen on Android in a browser — often mobile web + Stripe, not Play.';
    } else if (dt === 'desktop' || dt === 'unknown' || !dt) {
      likelySurface = 'web';
      likelySurfaceDetail = 'Last seen on desktop browser — usually web checkout (Stripe).';
    }
  }

  const browser = device.browser || '';
  let deviceLabel = 'Device unknown';
  if (device.deviceType && dt !== 'unknown') {
    const typeName = dt.charAt(0).toUpperCase() + dt.slice(1);
    deviceLabel = os ? `${typeName} · ${os}` : browser ? `${typeName} · ${browser}` : typeName;
  }

  const channelLabels = {
    web: 'Web',
    ios_native: 'iOS native',
    android_native: 'Android native',
    unknown: 'Unknown',
  };

  const displayChannel = channel !== 'unknown' ? channel : likelySurface || channel;
  const displayChannelLabel =
    channel !== 'unknown'
      ? channelLabels[channel]
      : likelySurface
        ? `${channelLabels[likelySurface]} (likely)`
        : channelLabels.unknown;

  return {
    store: store || 'unknown',
    storeLabel: storeLabels[store] || storeLabels.unknown,
    channel,
    channelLabel: displayChannelLabel,
    channelDetail: channel !== 'unknown' ? channelDetail : likelySurfaceDetail || channelDetail,
    displayChannel,
    likelySurface,
    deviceLabel,
    showStripeTools: store === 'none' || store === 'unknown' || store === 'stripe' || store === 'squarespace',
    showAppleTools: store === 'none' || store === 'unknown' || store === 'apple',
    showAndroidTools: store === 'none' || store === 'unknown' || store === 'googleplay',
  };
}

/** Sage palette for admin UI (cards, gradients) */
export const elegantPalette = {
  dark: {
    wallpaper: '#EFF2EE',
    deep: '#DDE6DE',
    charcoal: '#A0B9B3',
    soft: '#B8C9C4',
    surface: '#FFFFFF',
  },
  taupe: { dark: '#5F7F76', main: '#7F9E95', metallic: '#7F9E95', muted: '#A0B9B3', light: '#DDE6DE' },
  black: { text: '#2F3B3A', textMuted: '#6B7D7A' },
  gold: {
    gradientStart: '#7F9E95',
    gradientMid: '#6B8E85',
    gradientEnd: '#5F7F76',
    metallic: '#7F9E95',
  },
  neutral: { white: '#FFFFFF', offWhite: '#F8FAF8' },
  functional: { success: '#5FAF8B', warning: '#F2C879', error: '#E58A7A', info: '#7CB8B2' },
};
