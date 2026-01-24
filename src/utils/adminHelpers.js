/**
 * Admin panel helpers – analytics calculations and feedback analysis.
 * Extracted from Admin.jsx for use across route-based admin pages.
 */

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
