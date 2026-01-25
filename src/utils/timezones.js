/**
 * Comprehensive timezone list for The Pep Planner
 * Organized by region for better user experience
 */

// Major timezone groups
const TIMEZONE_GROUPS = {
  'Popular': [
    'America/New_York',    // Eastern Time
    'America/Chicago',     // Central Time  
    'America/Denver',      // Mountain Time
    'America/Los_Angeles', // Pacific Time
    'America/Anchorage',   // Alaska Time
    'Pacific/Honolulu',    // Hawaii Time
    'Europe/London',       // GMT/BST
    'Europe/Paris',        // Central European Time
    'Asia/Tokyo',          // Japan Standard Time
    'Australia/Sydney',    // Australian Eastern Time
  ],
  
  'North America': [
    'America/St_Johns',           // Newfoundland Time
    'America/Halifax',            // Atlantic Time
    'America/New_York',           // Eastern Time
    'America/Toronto',            // Eastern Time
    'America/Chicago',            // Central Time
    'America/Winnipeg',           // Central Time
    'America/Denver',             // Mountain Time
    'America/Edmonton',           // Mountain Time
    'America/Los_Angeles',        // Pacific Time
    'America/Vancouver',          // Pacific Time
    'America/Anchorage',          // Alaska Time
    'Pacific/Honolulu',           // Hawaii Time
  ],
  
  'Europe': [
    'Europe/London',              // GMT/BST
    'Europe/Dublin',              // GMT/IST
    'Europe/Paris',               // Central European Time
    'Europe/Berlin',              // Central European Time
    'Europe/Amsterdam',           // Central European Time
    'Europe/Rome',                // Central European Time
    'Europe/Madrid',              // Central European Time
    'Europe/Brussels',            // Central European Time
    'Europe/Vienna',              // Central European Time
    'Europe/Warsaw',              // Central European Time
    'Europe/Prague',              // Central European Time
    'Europe/Stockholm',           // Central European Time
    'Europe/Helsinki',            // Eastern European Time
    'Europe/Athens',              // Eastern European Time
    'Europe/Istanbul',            // Turkey Time
    'Europe/Moscow',              // Moscow Standard Time
    'UTC',                        // Coordinated Universal Time (for advanced users)
  ],
  
  'Asia': [
    'Asia/Dubai',                 // Gulf Standard Time
    'Asia/Kolkata',               // India Standard Time
    'Asia/Dhaka',                 // Bangladesh Standard Time
    'Asia/Kathmandu',             // Nepal Time
    'Asia/Bangkok',               // Indochina Time
    'Asia/Jakarta',               // Western Indonesia Time
    'Asia/Shanghai',              // China Standard Time
    'Asia/Hong_Kong',             // Hong Kong Time
    'Asia/Taipei',                // Taipei Time
    'Asia/Singapore',             // Singapore Standard Time
    'Asia/Manila',                // Philippine Standard Time
    'Asia/Seoul',                 // Korea Standard Time
    'Asia/Tokyo',                 // Japan Standard Time
  ],
  
  'Australia & Pacific': [
    'Pacific/Auckland',           // New Zealand Standard Time
    'Australia/Sydney',           // Australian Eastern Standard Time
    'Australia/Melbourne',        // Australian Eastern Standard Time
    'Australia/Brisbane',         // Australian Eastern Standard Time
    'Australia/Adelaide',         // Australian Central Standard Time
    'Australia/Darwin',           // Australian Central Standard Time
    'Australia/Perth',            // Australian Western Standard Time
    'Pacific/Fiji',               // Fiji Time
    'Pacific/Guam',               // Chamorro Standard Time
  ],
  
  'South America': [
    'America/Sao_Paulo',          // Brasília Time
    'America/Argentina/Buenos_Aires', // Argentina Time
    'America/Lima',               // Peru Time
    'America/Santiago',           // Chile Standard Time
    'America/Bogota',             // Colombia Time
    'America/Caracas',            // Venezuela Time
  ],
  
  'Africa': [
    'Africa/Cairo',               // Eastern European Time
    'Africa/Johannesburg',        // South Africa Standard Time
    'Africa/Lagos',               // West Africa Time
    'Africa/Nairobi',             // East Africa Time
    'Africa/Casablanca',          // Western European Time
  ],
  
  'Middle East': [
    'Asia/Jerusalem',             // Israel Standard Time
    'Asia/Riyadh',                // Arabia Standard Time
    'Asia/Tehran',                // Iran Standard Time
    'Asia/Baghdad',               // Arabia Standard Time
  ]
};

/**
 * Get all available timezones as a flat list
 */
export function getAllTimezones() {
  const allZones = new Set();
  Object.values(TIMEZONE_GROUPS).forEach(group => {
    group.forEach(tz => allZones.add(tz));
  });
  return Array.from(allZones).sort();
}

/**
 * Get timezones organized by region
 */
export function getTimezoneGroups() {
  return TIMEZONE_GROUPS;
}

/**
 * Get a smart timezone list that includes user's current timezone plus popular ones
 * This is backwards compatible with the existing Settings.jsx implementation
 */
export function getTimezoneList(currentUserTimezone = null) {
  const popular = TIMEZONE_GROUPS['Popular'];
  const all = new Set([currentUserTimezone, ...popular].filter(Boolean));
  return Array.from(all);
}

/**
 * Get timezone display name with offset
 */
export function getTimezoneDisplayName(timezone) {
  try {
    // Map of timezone IDs to friendly names
    const friendlyNames = {
      // United States
      'America/New_York': 'United States - New York (Eastern)',
      'America/Chicago': 'United States - Chicago (Central)',
      'America/Denver': 'United States - Denver (Mountain)',
      'America/Los_Angeles': 'United States - Los Angeles (Pacific)',
      'America/Anchorage': 'United States - Anchorage (Alaska)',
      'Pacific/Honolulu': 'United States - Honolulu (Hawaii)',
      
      // Canada
      'America/St_Johns': 'Canada - St. Johns (Newfoundland)',
      'America/Halifax': 'Canada - Halifax (Atlantic)',
      'America/Toronto': 'Canada - Toronto (Eastern)',
      'America/Winnipeg': 'Canada - Winnipeg (Central)',
      'America/Edmonton': 'Canada - Edmonton (Mountain)',
      'America/Vancouver': 'Canada - Vancouver (Pacific)',
      
      // Europe
      'UTC': 'UTC - Coordinated Universal Time',
      'Europe/London': 'United Kingdom - London (GMT)',
      'Europe/Dublin': 'Ireland - Dublin (GMT)',
      'Europe/Paris': 'France - Paris (CET)',
      'Europe/Berlin': 'Germany - Berlin (CET)',
      'Europe/Amsterdam': 'Netherlands - Amsterdam (CET)',
      'Europe/Rome': 'Italy - Rome (CET)',
      'Europe/Madrid': 'Spain - Madrid (CET)',
      'Europe/Brussels': 'Belgium - Brussels (CET)',
      'Europe/Vienna': 'Austria - Vienna (CET)',
      'Europe/Warsaw': 'Poland - Warsaw (CET)',
      'Europe/Prague': 'Czech Republic - Prague (CET)',
      'Europe/Stockholm': 'Sweden - Stockholm (CET)',
      'Europe/Helsinki': 'Finland - Helsinki (EET)',
      'Europe/Athens': 'Greece - Athens (EET)',
      'Europe/Istanbul': 'Turkey - Istanbul',
      'Europe/Moscow': 'Russia - Moscow (MSK)',
      
      // Asia
      'Asia/Dubai': 'United Arab Emirates - Dubai',
      'Asia/Kolkata': 'India - Kolkata',
      'Asia/Dhaka': 'Bangladesh - Dhaka',
      'Asia/Kathmandu': 'Nepal - Kathmandu',
      'Asia/Bangkok': 'Thailand - Bangkok',
      'Asia/Jakarta': 'Indonesia - Jakarta',
      'Asia/Shanghai': 'China - Shanghai',
      'Asia/Hong_Kong': 'Hong Kong',
      'Asia/Taipei': 'Taiwan - Taipei',
      'Asia/Singapore': 'Singapore',
      'Asia/Manila': 'Philippines - Manila',
      'Asia/Seoul': 'South Korea - Seoul',
      'Asia/Tokyo': 'Japan - Tokyo',
      
      // Australia & Pacific
      'Pacific/Auckland': 'New Zealand - Auckland',
      'Australia/Sydney': 'Australia - Sydney',
      'Australia/Melbourne': 'Australia - Melbourne',
      'Australia/Brisbane': 'Australia - Brisbane',
      'Australia/Adelaide': 'Australia - Adelaide',
      'Australia/Darwin': 'Australia - Darwin',
      'Australia/Perth': 'Australia - Perth',
      'Pacific/Fiji': 'Fiji',
      'Pacific/Guam': 'Guam',
      
      // South America
      'America/Sao_Paulo': 'Brazil - São Paulo',
      'America/Argentina/Buenos_Aires': 'Argentina - Buenos Aires',
      'America/Lima': 'Peru - Lima',
      'America/Santiago': 'Chile - Santiago',
      'America/Bogota': 'Colombia - Bogotá',
      'America/Caracas': 'Venezuela - Caracas',
      
      // Africa
      'Africa/Cairo': 'Egypt - Cairo',
      'Africa/Johannesburg': 'South Africa - Johannesburg',
      'Africa/Lagos': 'Nigeria - Lagos',
      'Africa/Nairobi': 'Kenya - Nairobi',
      'Africa/Casablanca': 'Morocco - Casablanca',
      
      // Middle East
      'Asia/Jerusalem': 'Israel - Jerusalem',
      'Asia/Riyadh': 'Saudi Arabia - Riyadh',
      'Asia/Tehran': 'Iran - Tehran',
      'Asia/Baghdad': 'Iraq - Baghdad',
    };
    
    if (friendlyNames[timezone]) {
      const offset = getTimezoneOffset(timezone);
      const offsetStr = formatOffset(offset);
      return `${friendlyNames[timezone]} ${offsetStr ? `(UTC${offsetStr})` : ''}`.trim();
    }
    
    // Fallback for unmapped timezones
    const offset = getTimezoneOffset(timezone);
    const offsetStr = formatOffset(offset);
    return `${timezone.replace(/_/g, ' ')} (UTC${offsetStr})`;
  } catch (error) {
    return timezone;
  }
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone) {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (target.getTime() - utc.getTime()) / (1000 * 60);
  } catch (error) {
    return 0;
  }
}

/**
 * Format offset for display
 */
function formatOffset(offsetMinutes) {
  if (offsetMinutes === 0) return '';
  
  const sign = offsetMinutes > 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  
  if (minutes === 0) {
    return `${sign}${hours}`;
  } else {
    return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}

/**
 * Check if changing timezone will affect active protocols
 */
export function checkTimezoneChangeImpact(protocols = [], oldTimezone, newTimezone) {
  if (!protocols || protocols.length === 0) return { hasImpact: false };
  
  const activeProtocols = protocols.filter(p => p.active);
  if (activeProtocols.length === 0) return { hasImpact: false };
  
  const oldOffset = getTimezoneOffset(oldTimezone);
  const newOffset = getTimezoneOffset(newTimezone);
  const hoursDiff = Math.abs(oldOffset - newOffset) / 60;
  
  return {
    hasImpact: hoursDiff > 0,
    hoursDifference: hoursDiff,
    affectedProtocols: activeProtocols.length,
    protocolNames: activeProtocols.map(p => p.protocolName || 'Unnamed Protocol')
  };
}
