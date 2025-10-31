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

  // Martin Luther King Jr. Day (3rd Monday of January)
  const mlkDay = getThirdMondayOfMonth(year, 1);
  if (month === 1 && day === mlkDay) {
    return {
      name: 'MLK Day',
      accent: '#4A90E2', // Blue
      secondary: '#FFD700', // Gold
      gradient: 'linear-gradient(135deg, #4A90E2 0%, #FFD700 100%)',
      emoji: '✊',
      icon: 'peace'
    };
  }

  // Groundhog Day (Feb 2)
  if (month === 2 && day === 2) {
    return {
      name: 'Groundhog Day',
      accent: '#8B7355', // Brown
      secondary: '#228B22', // Green
      gradient: 'linear-gradient(135deg, #8B7355 0%, #228B22 100%)',
      emoji: '🦫',
      icon: 'groundhog'
    };
  }

  // Chinese New Year (approximate - varies by year, but typically late Jan to late Feb)
  // Using simplified approximation
  if (month === 2 && (day >= 10 && day <= 25)) {
    return {
      name: 'Chinese New Year',
      accent: '#FF0000', // Red
      secondary: '#FFD700', // Gold
      gradient: 'linear-gradient(135deg, #FF0000 0%, #FFD700 100%)',
      emoji: '🐉',
      icon: 'dragon'
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

  // April Fools' Day (Apr 1)
  if (month === 4 && day === 1) {
    return {
      name: 'April Fools\' Day',
      accent: '#9370DB', // Purple
      secondary: '#FF69B4', // Pink
      gradient: 'linear-gradient(135deg, #9370DB 0%, #FF69B4 100%)',
      emoji: '🤡',
      icon: 'jester'
    };
  }

  // Earth Day (Apr 22)
  if (month === 4 && day === 22) {
    return {
      name: 'Earth Day',
      accent: '#228B22', // Green
      secondary: '#87CEEB', // Sky Blue
      gradient: 'linear-gradient(135deg, #228B22 0%, #87CEEB 100%)',
      emoji: '🌍',
      icon: 'earth'
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

  // Mother's Day (2nd Sunday of May)
  const mothersDay = getSecondSundayOfMonth(year, 5);
  if (month === 5 && day === mothersDay) {
    return {
      name: 'Mother\'s Day',
      accent: '#FF69B4', // Pink
      secondary: '#FFB6C1', // Light Pink
      gradient: 'linear-gradient(135deg, #FF69B4 0%, #FFB6C1 100%)',
      emoji: '💐',
      icon: 'roses'
    };
  }

  // Father's Day (3rd Sunday of June)
  const fathersDay = getThirdSundayOfMonth(year, 6);
  if (month === 6 && day === fathersDay) {
    return {
      name: 'Father\'s Day',
      accent: '#4169E1', // Blue
      secondary: '#00008B', // Dark Blue
      gradient: 'linear-gradient(135deg, #4169E1 0%, #00008B 100%)',
      emoji: '👔',
      icon: 'tie'
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

  // Labor Day (1st Monday of September)
  const laborDay = getFirstMondayOfMonth(year, 9);
  if (month === 9 && day === laborDay) {
    return {
      name: 'Labor Day',
      accent: '#FF4500', // Orange
      secondary: '#FFD700', // Gold
      gradient: 'linear-gradient(135deg, #FF4500 0%, #FFD700 100%)',
      emoji: '👷',
      icon: 'hardhat'
    };
  }

  // Columbus Day (2nd Monday of October)
  const columbusDay = getSecondMondayOfMonth(year, 10);
  if (month === 10 && day === columbusDay) {
    return {
      name: 'Columbus Day',
      accent: '#FF6347', // Tomato
      secondary: '#228B22', // Green
      gradient: 'linear-gradient(135deg, #FF6347 0%, #228B22 100%)',
      emoji: '⚓',
      icon: 'ship'
    };
  }

  // Veterans Day (Nov 11)
  if (month === 11 && day === 11) {
    return {
      name: 'Veterans Day',
      accent: '#000080', // Navy
      secondary: '#FF0000', // Red
      gradient: 'linear-gradient(135deg, #000080 0%, #FF0000 100%)',
      emoji: '🎖️',
      icon: 'medal'
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

  // Monthly general themes when no specific holiday
  const monthlyThemes = {
    1: { name: 'Winter Wonderland', accent: '#87CEEB', secondary: '#E0F6FF', gradient: 'linear-gradient(135deg, #87CEEB 0%, #E0F6FF 100%)', emoji: '❄️', icon: 'snow' },
    2: { name: 'Valentine\'s Month', accent: '#FFB6C1', secondary: '#FF69B4', gradient: 'linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%)', emoji: '💝', icon: 'hearts' },
    3: { name: 'Spring Awakening', accent: '#98FB98', secondary: '#32CD32', gradient: 'linear-gradient(135deg, #98FB98 0%, #32CD32 100%)', emoji: '🌸', icon: 'flower' },
    4: { name: 'April Showers', accent: '#B0E0E6', secondary: '#4682B4', gradient: 'linear-gradient(135deg, #B0E0E6 0%, #4682B4 100%)', emoji: '🌧️', icon: 'umbrella' },
    5: { name: 'May Flowers', accent: '#FF69B4', secondary: '#FFC0CB', gradient: 'linear-gradient(135deg, #FF69B4 0%, #FFC0CB 100%)', emoji: '🌺', icon: 'blossom' },
    6: { name: 'Summer Begins', accent: '#FFD700', secondary: '#FFA500', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', emoji: '☀️', icon: 'sun' },
    7: { name: 'Summer Peak', accent: '#FF6347', secondary: '#FFD700', gradient: 'linear-gradient(135deg, #FF6347 0%, #FFD700 100%)', emoji: '🏖️', icon: 'beach' },
    8: { name: 'Lazy Summer', accent: '#FF8C00', secondary: '#F0E68C', gradient: 'linear-gradient(135deg, #FF8C00 0%, #F0E68C 100%)', emoji: '🌴', icon: 'palm' },
    9: { name: 'Back to School', accent: '#9370DB', secondary: '#4169E1', gradient: 'linear-gradient(135deg, #9370DB 0%, #4169E1 100%)', emoji: '📚', icon: 'book' },
    10: { name: 'Fall Colors', accent: '#FF8C00', secondary: '#D2691E', gradient: 'linear-gradient(135deg, #FF8C00 0%, #D2691E 100%)', emoji: '🍂', icon: 'leaves' },
    11: { name: 'Thankful November', accent: '#A0522D', secondary: '#DEB887', gradient: 'linear-gradient(135deg, #A0522D 0%, #DEB887 100%)', emoji: '🦃', icon: 'pumpkin' },
    12: { name: 'Holiday Cheer', accent: '#228B22', secondary: '#FF0000', gradient: 'linear-gradient(135deg, #228B22 0%, #FF0000 100%)', emoji: '🎁', icon: 'gift' }
  };

  // Return monthly theme if no specific holiday
  return monthlyThemes[month] || null;
}

// Helper functions for holiday calculations
function getThirdMondayOfMonth(year, month) {
  // month is 1-indexed (1=Jan, 2=Feb, etc.)
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  // Calculate how many days to add to get to the first Monday
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  const firstMonday = 1 + daysToFirstMonday;
  // Add 14 days to get to the third Monday
  return firstMonday + 14;
}

function getSecondMondayOfMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  const firstMonday = 1 + daysToFirstMonday;
  return firstMonday + 7; // Add 7 days to get to the second Monday
}

function getFirstMondayOfMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  return 1 + daysToFirstMonday;
}

function getThirdSundayOfMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToFirstSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
  const firstSunday = 1 + daysToFirstSunday;
  return firstSunday + 14; // Add 14 days to get to the third Sunday
}

function getSecondSundayOfMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToFirstSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
  const firstSunday = 1 + daysToFirstSunday;
  return firstSunday + 7; // Add 7 days to get to the second Sunday
}

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

