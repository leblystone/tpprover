// src/utils/featureSettings.js
import { loadSettings } from '../pages/Settings'; // Assuming loadSettings is exported from Settings.jsx

/**
 * Check if group buy features are enabled
 */
export function areGroupBuysEnabled() {
  try {
    const settings = loadSettings();
    // Default to true if the setting is not explicitly set
    return settings?.features?.groupBuys !== false;
  } catch (error) {
    console.error('Failed to read group buy setting:', error);
    return true; // Default to enabled in case of error
  }
}

/**
 * Check if analytics features are enabled
 */
export function areAnalyticsEnabled() {
  try {
    const settings = loadSettings();
    return settings?.features?.analytics !== false;
  } catch (error) {
    console.error('Failed to read analytics setting:', error);
    return true; // Default to enabled in case of error
  }
}

/**
 * Check if dosage warnings are enabled
 */
export function areDosageWarningsEnabled() {
  try {
    const settings = loadSettings();
    return settings?.research?.showDosageWarnings !== false;
  } catch (error) {
    console.error('Failed to read dosage warnings setting:', error);
    return true; // Default to enabled in case of error
  }
}

/**
 * Check if auto stockpile updates are enabled
 */
export function areAutoStockpileUpdatesEnabled() {
  try {
    const settings = loadSettings();
    return settings?.orders?.autoStockpileUpdate !== false;
  } catch (error) {
    console.error('Failed to read auto stockpile updates setting:', error);
    return true; // Default to enabled in case of error
  }
}

/**
 * Check if low stock alerts are enabled
 */
export function areLowStockAlertsEnabled() {
  try {
    const settings = loadSettings();
    return settings?.orders?.lowStockAlerts !== false;
  } catch (error) {
    console.error('Failed to read low stock alerts setting:', error);
    return true; // Default to enabled in case of error
  }
}

/**
 * Get calendar preferences
 */
export function getCalendarPreferences() {
  try {
    const settings = loadSettings();
    return {
      defaultView: settings?.calendar?.defaultView || 'month',
      showWeekends: settings?.calendar?.showWeekends !== false,
      timeFormat: settings?.calendar?.timeFormat || '12h',
      reminderTime: settings?.calendar?.reminderTime || 30,
    };
  } catch (error) {
    console.error('Failed to read calendar preferences:', error);
    return {
      defaultView: 'month',
      showWeekends: true,
      timeFormat: '12h',
      reminderTime: 30,
    };
  }
}

/**
 * Get research preferences
 */
export function getResearchPreferences() {
  try {
    const settings = loadSettings();
    return {
      autoCompleteTasks: settings?.research?.autoCompleteTasks === true,
      showDosageWarnings: settings?.research?.showDosageWarnings !== false,
      protocolReminders: settings?.research?.protocolReminders !== false,
      washoutReminders: settings?.research?.washoutReminders !== false,
    };
  } catch (error) {
    console.error('Failed to read research preferences:', error);
    return {
      autoCompleteTasks: false,
      showDosageWarnings: true,
      protocolReminders: true,
      washoutReminders: true,
    };
  }
}
