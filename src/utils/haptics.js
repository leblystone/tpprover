/**
 * Haptic Feedback Utility for Mobile Interactions
 * Provides tactile feedback on supported devices (iOS, Android via Capacitor)
 * Gracefully degrades if Capacitor Haptics is not installed
 */

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;
let isHapticsAvailable = false;
let initializationAttempted = false;

// Build import path dynamically to avoid Vite static analysis
const getHapticsImportPath = () => {
  const parts = ['@capacitor', '/', 'haptics'];
  return parts.join('');
};

// Initialize Haptics dynamically (only if Capacitor is available)
const initHaptics = async () => {
  if (initializationAttempted) return;
  initializationAttempted = true;

  try {
    // Check if Capacitor is available first
    const { Capacitor } = await import('@capacitor/core').catch(() => ({ Capacitor: null }));
    
    if (!Capacitor || !Capacitor.isNativePlatform) {
      // Web platform - haptics disabled, use browser vibrate as fallback
      return;
    }
    
    if (Capacitor.isNativePlatform()) {
      // Try to import haptics plugin using dynamic import with constructed path
      const importPath = getHapticsImportPath();
      const HapticsModule = await import(/* @vite-ignore */ importPath).catch(() => null);
      
      if (HapticsModule && HapticsModule.Haptics) {
        Haptics = HapticsModule.Haptics;
        ImpactStyle = HapticsModule.ImpactStyle;
        NotificationType = HapticsModule.NotificationType;
        isHapticsAvailable = true;
        console.log('✨ Haptics enabled');
      } else {
        console.log('📱 Haptics plugin not installed - haptics disabled');
        console.log('💡 To enable haptics, run: npm install @capacitor/haptics');
      }
    }
  } catch (error) {
    // Silently fail - haptics not available
  }
};

// Initialize on module load
initHaptics();

/**
 * Light haptic feedback - for subtle interactions
 * Use for: button taps, toggle switches, minor actions
 */
export const hapticsLight = async () => {
  if (!isHapticsAvailable || !Haptics || !ImpactStyle) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: card selections, menu selections, form submissions
 */
export const hapticsMedium = async () => {
  if (!isHapticsAvailable || !Haptics || !ImpactStyle) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Heavy haptic feedback - for important interactions
 * Use for: confirmations, deletions, major state changes
 */
export const hapticsHeavy = async () => {
  if (!isHapticsAvailable || !Haptics || !ImpactStyle) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Success haptic feedback - for positive outcomes
 * Use for: successful saves, completed actions, achievements
 */
export const hapticsSuccess = async () => {
  if (!isHapticsAvailable || !Haptics || !NotificationType) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Warning haptic feedback - for cautionary actions
 * Use for: warnings, confirmations needed, attention required
 */
export const hapticsWarning = async () => {
  if (!isHapticsAvailable || !Haptics || !NotificationType) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Error haptic feedback - for errors and failures
 * Use for: failed actions, validation errors, critical issues
 */
export const hapticsError = async () => {
  if (!isHapticsAvailable || !Haptics || !NotificationType) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (error) {
    // Silently fail
  }
};

/**
 * Selection haptic feedback - for UI selections
 * Use for: picker scrolling, slider changes, calendar date selection
 */
export const hapticsSelection = async () => {
  if (!isHapticsAvailable || !Haptics) return;
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch (error) {
    // Silently fail
  }
};

/**
 * Vibrate for a specific pattern (fallback for web)
 * @param {number|number[]} pattern - Duration in ms or pattern array
 */
export const vibrate = (pattern = 50) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * Check if haptics are available on the current device
 * @returns {boolean}
 */
export const areHapticsAvailable = () => isHapticsAvailable;

export default {
  light: hapticsLight,
  medium: hapticsMedium,
  heavy: hapticsHeavy,
  success: hapticsSuccess,
  warning: hapticsWarning,
  error: hapticsError,
  selection: hapticsSelection,
  vibrate,
  isAvailable: areHapticsAvailable
};
