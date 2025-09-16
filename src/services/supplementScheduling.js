/**
 * Centralized Supplement Scheduling Service
 * 
 * This service handles all supplement scheduling logic in one place,
 * eliminating duplication across Calendar.jsx, WeekView.jsx, etc.
 */

/**
 * Determines the time slots for a supplement based on its schedule
 * @param {Object} supplement - The supplement object
 * @returns {Array} - Array of time slots ['AM', 'PM', etc.]
 */
export function getSupplementTimeSlots(supplement) {
  if (!supplement) return ['AM']; // Default fallback

  const schedule = supplement.schedule;

  // Handle array schedules (explicit time selection)
  if (Array.isArray(schedule) && schedule.length > 0) {
    return schedule;
  }

  // Handle string schedules
  if (typeof schedule === 'string') {
    if (schedule === 'PM') return ['PM'];
    if (schedule === 'AM') return ['AM'];
  }

  // Default to AM only (prevents duplicate dosing)
  return ['AM'];
}

/**
 * Filters supplements for a specific date based on their day schedule
 * @param {Array} supplements - Array of supplements
 * @param {Date} date - The date to filter for
 * @returns {Array} - Supplements that should be taken on this date
 */
export function getSupplementsForDate(supplements, date) {
  if (!supplements || !Array.isArray(supplements)) return [];
  if (!date) return [];

  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[dayOfWeek];

  return supplements.filter(supplement => {
    // If no days specified, assume daily
    if (!supplement.days || !Array.isArray(supplement.days) || supplement.days.length === 0) {
      return true;
    }

    // Check if current day is in the supplement's schedule
    return supplement.days.some(day => {
      // Handle both full names and abbreviations
      const normalizedDay = day.toLowerCase();
      const normalizedCurrentDay = currentDayName.toLowerCase();
      
      return normalizedDay === normalizedCurrentDay || 
             normalizedDay === normalizedCurrentDay.substring(0, 3) || // Mon, Tue, etc.
             normalizedDay === normalizedCurrentDay.substring(0, 2);   // Mo, Tu, etc.
    });
  });
}

/**
 * Gets the appropriate icon for a supplement based on delivery method
 * @param {string} deliveryMethod - The delivery method
 * @param {number} size - Icon size (default: 16)
 * @param {string} color - Icon color (optional)
 * @returns {JSX.Element} - React icon component
 */
export function getSupplementIcon(deliveryMethod, size = 16, color = null) {
  // This will be imported where needed to avoid circular dependencies
  const iconProps = {
    size,
    ...(color && { style: { color } })
  };

  switch (String(deliveryMethod || '').toLowerCase()) {
    case 'injection':
    case 'syringe':
      // Return icon name for dynamic import
      return { type: 'Syringe', props: iconProps };
    case 'powder':
    case 'nasal':
      return { type: 'Beaker', props: iconProps };
    case 'pill':
    case 'oral':
    default:
      return { type: 'Pill', props: iconProps };
  }
}

/**
 * Processes supplements for calendar display
 * @param {Array} supplements - Array of supplements
 * @param {Date} startDate - Start date for processing
 * @param {number} dayCount - Number of days to process
 * @returns {Object} - Processed supplement data by date
 */
export function processSupplementsForCalendar(supplements, startDate, dayCount = 30) {
  const result = {};

  for (let i = 0; i < dayCount; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dateKey = formatDateKey(currentDate);
    const daySupplements = getSupplementsForDate(supplements, currentDate);
    
    // Group supplements by time slot
    const bySlot = {};
    
    daySupplements.forEach(supplement => {
      const slots = getSupplementTimeSlots(supplement);
      
      slots.forEach(slot => {
        if (!bySlot[slot]) {
          bySlot[slot] = {
            peptides: [], // For compatibility with existing code
            supplements: []
          };
        }
        
        bySlot[slot].supplements.push({
          name: supplement.name,
          delivery: supplement.delivery || 'oral',
          dose: supplement.dose,
          id: supplement.id
        });
      });
    });

    result[dateKey] = {
      supplements: daySupplements,
      bySlot,
      date: currentDate
    };
  }

  return result;
}

/**
 * Formats a date as a key for calendar data
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date key (YYYY-MM-DD)
 */
export function formatDateKey(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates supplement data
 * @param {Object} supplement - Supplement to validate
 * @returns {Object} - Validation result { isValid, errors }
 */
export function validateSupplement(supplement) {
  const errors = [];
  
  if (!supplement) {
    errors.push('Supplement data is required');
    return { isValid: false, errors };
  }

  if (!supplement.name || typeof supplement.name !== 'string' || supplement.name.trim().length === 0) {
    errors.push('Supplement name is required');
  }

  if (supplement.schedule && Array.isArray(supplement.schedule)) {
    const validSlots = ['AM', 'PM', 'Morning', 'Evening']; // Include legacy for compatibility
    const invalidSlots = supplement.schedule.filter(slot => !validSlots.includes(slot));
    if (invalidSlots.length > 0) {
      errors.push(`Invalid time slots: ${invalidSlots.join(', ')}`);
    }
  }

  if (supplement.days && Array.isArray(supplement.days)) {
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 
                      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const invalidDays = supplement.days.filter(day => 
      !validDays.some(validDay => validDay.toLowerCase() === day.toLowerCase())
    );
    if (invalidDays.length > 0) {
      errors.push(`Invalid days: ${invalidDays.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Migrates legacy supplement data to new format
 * @param {Object} supplement - Legacy supplement data
 * @returns {Object} - Migrated supplement data
 */
export function migrateLegacySupplement(supplement) {
  if (!supplement) return supplement;

  const migrated = { ...supplement };

  // Convert legacy Morning/Evening to AM/PM
  if (migrated.schedule && Array.isArray(migrated.schedule)) {
    migrated.schedule = migrated.schedule.map(slot => {
      if (slot === 'Morning') return 'AM';
      if (slot === 'Evening') return 'PM';
      return slot;
    });
  } else if (typeof migrated.schedule === 'string') {
    if (migrated.schedule === 'Morning') migrated.schedule = 'AM';
    if (migrated.schedule === 'Evening') migrated.schedule = 'PM';
  }

  // Ensure delivery method is set
  if (!migrated.delivery) {
    migrated.delivery = 'oral'; // Default
  }

  return migrated;
}

/**
 * Debug helper for supplement scheduling
 * @param {Object} supplement - Supplement to debug
 * @param {Date} date - Date context
 * @returns {Object} - Debug information
 */
export function debugSupplement(supplement, date = new Date()) {
  const slots = getSupplementTimeSlots(supplement);
  const validation = validateSupplement(supplement);
  const migrated = migrateLegacySupplement(supplement);
  
  return {
    original: supplement,
    migrated,
    slots,
    validation,
    dateInfo: {
      date: date.toDateString(),
      dayOfWeek: date.getDay(),
      isScheduledForToday: getSupplementsForDate([supplement], date).length > 0
    }
  };
}
