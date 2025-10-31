/**
 * US Holiday Theme Detection for Admin Panel
 * Detects current US holidays and provides theme colors/decorations
 */

export function getCurrentHolidayTheme() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  // New Year's (Jan 1)
  if (month === 1 && day === 1) {
    return {
      name: 'New Year',
      accent: '#FFD700', // Gold
      secondary: '#FF6B6B', // Red
      gradient: 'linear-gradient(135deg, #FFD700 0%, #FF6B6B 100%)',
      emoji: '🎉',
      icon: 'sparkles'
    };
  }

  // Valentine's Day (Feb 14)
  if (month === 2 && day === 14) {
    return {
      name: 'Valentine\'s Day',
      accent: '#FF69B4', // Hot Pink
      secondary: '#FF1493', // Deep Pink
      gradient: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)',
      emoji: '💝',
      icon: 'heart'
    };
  }

  // St. Patrick's Day (Mar 17)
  if (month === 3 && day === 17) {
    return {
      name: 'St. Patrick\'s Day',
      accent: '#32CD32', // Lime Green
      secondary: '#228B22', // Forest Green
      gradient: 'linear-gradient(135deg, #32CD32 0%, #228B22 100%)',
      emoji: '☘️',
      icon: 'clover'
    };
  }

  // Easter (calculated - simple approximation for April)
  const easterDate = getEasterDate(year);
  if (month === easterDate.month && day === easterDate.day) {
    return {
      name: 'Easter',
      accent: '#FFB6C1', // Light Pink
      secondary: '#87CEEB', // Sky Blue
      gradient: 'linear-gradient(135deg, #FFB6C1 0%, #87CEEB 100%)',
      emoji: '🐰',
      icon: 'egg'
    };
  }

  // Memorial Day (last Monday of May)
  const memorialDay = getLastMondayOfMay(year);
  if (month === 5 && day === memorialDay) {
    return {
      name: 'Memorial Day',
      accent: '#000080', // Navy
      secondary: '#FF0000', // Red
      gradient: 'linear-gradient(135deg, #000080 0%, #FF0000 100%)',
      emoji: '🇺🇸',
      icon: 'flag'
    };
  }

  // Independence Day (July 4)
  if (month === 7 && day === 4) {
    return {
      name: 'Independence Day',
      accent: '#FF0000', // Red
      secondary: '#0000FF', // Blue
      gradient: 'linear-gradient(135deg, #FF0000 0%, #0000FF 100%)',
      emoji: '🇺🇸',
      icon: 'fireworks'
    };
  }

  // Halloween (Oct 31)
  if (month === 10 && day === 31) {
    return {
      name: 'Halloween',
      accent: '#FF8C00', // Dark Orange
      secondary: '#800080', // Purple
      gradient: 'linear-gradient(135deg, #FF8C00 0%, #800080 100%)',
      emoji: '🎃',
      icon: 'pumpkin'
    };
  }

  // Thanksgiving (4th Thursday of November)
  const thanksgiving = getThanksgivingDate(year);
  if (month === 11 && day === thanksgiving) {
    return {
      name: 'Thanksgiving',
      accent: '#D2691E', // Chocolate
      secondary: '#FF8C00', // Dark Orange
      gradient: 'linear-gradient(135deg, #D2691E 0%, #FF8C00 100%)',
      emoji: '🦃',
      icon: 'cornucopia'
    };
  }

  // Christmas (Dec 25)
  if (month === 12 && day === 25) {
    return {
      name: 'Christmas',
      accent: '#228B22', // Forest Green
      secondary: '#FF0000', // Red
      gradient: 'linear-gradient(135deg, #228B22 0%, #FF0000 100%)',
      emoji: '🎄',
      icon: 'tree'
    };
  }

  // Holiday season (Dec 1-31, but not Christmas)
  if (month === 12 && day >= 1 && day <= 31 && day !== 25) {
    return {
      name: 'Holiday Season',
      accent: '#228B22', // Forest Green
      secondary: '#FF0000', // Red
      gradient: 'linear-gradient(135deg, #228B22 0%, #FF0000 100%)',
      emoji: '❄️',
      icon: 'snowflake'
    };
  }

  // Default - no holiday
  return null;
}

// Helper functions for holiday calculations
function getEasterDate(year) {
  // Simplified Easter calculation (Meeus/Jones/Butcher algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function getLastMondayOfMay(year) {
  const lastDay = new Date(year, 4, 31); // May 31
  const dayOfWeek = lastDay.getDay();
  const lastMonday = 31 - (dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  return lastMonday;
}

function getThanksgivingDate(year) {
  const nov1 = new Date(year, 10, 1); // November 1
  const dayOfWeek = nov1.getDay();
  const firstThursday = dayOfWeek === 4 ? 1 : (4 - dayOfWeek + 7) % 7 + 1;
  return firstThursday + 21; // 4th Thursday
}

/**
 * Get periwinkle color palette with variations
 */
export const periwinkleTheme = {
  primary: '#CCCCFF', // Classic Periwinkle
  primaryDark: '#9999CC', // Darker periwinkle
  primaryLight: '#E6E6FF', // Lighter periwinkle
  secondary: '#D4AF37', // Gold accent (coffee/cafe vibes)
  accent: '#8B7355', // Coffee brown
  background: '#F5F5FF', // Very light periwinkle background
  cardBackground: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E0FF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3'
};

