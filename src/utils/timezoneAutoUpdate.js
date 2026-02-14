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
      
      // Skip if timezone hasn't changed from what we last knew
      if (lastKnownTimezone === currentTimezone) {
        return;
      }

      // On first run, check if stored settings timezone differs from browser timezone
      // This catches the case where user traveled and the app restarts in a new timezone
      if (lastKnownTimezone === null) {
        const settings = loadSettings();
        const storedTimezone = settings?.region?.timeZone;
        
        // If stored timezone matches browser timezone, just initialize and skip
        if (storedTimezone === currentTimezone) {
          lastKnownTimezone = currentTimezone;
          console.log(`⏰ Timezone initialized: ${currentTimezone}`);
          return;
        }
        
        // Stored timezone is stale or missing — fall through to update it
        console.log(`🌍 Timezone mismatch on init: stored=${storedTimezone || 'none'}, browser=${currentTimezone}`);
      } else {
        console.log(`🌍 Timezone changed: ${lastKnownTimezone} → ${currentTimezone}`);
      }

      // Update settings with current browser timezone
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
