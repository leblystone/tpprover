import { getLocalTimezone, loadSettings, saveSettings, syncNotificationSettingsToFirestore } from './settingsHelpers';

/**
 * Auto-update user's timezone when it changes (e.g., traveling, daylight saving)
 * Runs periodically to detect timezone changes
 */
export function initTimezoneAutoUpdate() {
  let lastKnownTimezone = null;

  const checkAndUpdateTimezone = async () => {
    try {
      const currentTimezone = getLocalTimezone();
      
      // Skip if timezone hasn't changed
      if (lastKnownTimezone === currentTimezone) {
        return;
      }

      // Initialize on first run
      if (lastKnownTimezone === null) {
        lastKnownTimezone = currentTimezone;
        console.log(`⏰ Timezone initialized: ${currentTimezone}`);
        return;
      }

      // Timezone changed - update settings
      console.log(`🌍 Timezone changed: ${lastKnownTimezone} → ${currentTimezone}`);
      
      const settings = loadSettings();
      settings.region = settings.region || {};
      settings.region.timeZone = currentTimezone;
      
      saveSettings(settings);
      lastKnownTimezone = currentTimezone;

      // Sync to Firestore for scheduled notifications
      await syncNotificationSettingsToFirestore();

      // Show toast notification
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          type: 'info',
          message: `⏰ Timezone updated to ${currentTimezone}`,
          duration: 5000
        }
      }));

      console.log(`✅ Timezone updated to: ${currentTimezone}`);
    } catch (error) {
      console.error('❌ Error checking timezone:', error);
    }
  };

  // Check on init
  checkAndUpdateTimezone();

  // Check every 5 minutes (300000ms)
  const intervalId = setInterval(checkAndUpdateTimezone, 300000);

  // Check when app comes to foreground (user might have traveled)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkAndUpdateTimezone();
    }
  });

  // Cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.checkTimezone = () => {
    const currentTimezone = getLocalTimezone();
    console.log(`Current timezone: ${currentTimezone}`);
    return currentTimezone;
  };
}
