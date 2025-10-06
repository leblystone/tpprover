/**
 * Injection Site Tracking Settings Utility
 * Manages user preferences for injection site tracking
 */

/**
 * Check if injection site tracking is enabled
 * @returns {boolean} True if injection site tracking is enabled
 */
export function isInjectionSiteTrackingEnabled() {
  try {
    const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
    return settings.tracking?.injectionSites !== false; // Default to true if not set
  } catch (error) {
    console.warn('Failed to check injection site tracking setting:', error);
    return true; // Default to enabled if there's an error
  }
}

/**
 * Get injection site tracking setting with fallback
 * @returns {boolean} True if injection site tracking is enabled
 */
export function getInjectionSiteTrackingSetting() {
  return isInjectionSiteTrackingEnabled();
}

/**
 * Update injection site tracking setting
 * @param {boolean} enabled - Whether injection site tracking should be enabled
 */
export function setInjectionSiteTrackingSetting(enabled) {
  try {
    const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
    if (!settings.tracking) {
      settings.tracking = {};
    }
    settings.tracking.injectionSites = enabled;
    localStorage.setItem('tpprover_settings', JSON.stringify(settings));
    
    // Dispatch event to notify components of setting change
    window.dispatchEvent(new CustomEvent('injection-site-tracking-changed', { 
      detail: { enabled } 
    }));
  } catch (error) {
    console.error('Failed to update injection site tracking setting:', error);
  }
}
