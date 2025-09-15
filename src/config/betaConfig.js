/**
 * Beta Testing Configuration
 * Centralized configuration for beta period and transitions
 */

// Beta end date: September 21st, 2024 at midnight (local time)
export const BETA_END_DATE = new Date('2024-09-21T00:00:00');

// Alternative: Use a specific timezone if needed
// export const BETA_END_DATE = new Date('2024-09-21T00:00:00-07:00'); // PDT
// export const BETA_END_DATE = new Date('2024-09-21T07:00:00Z'); // UTC for midnight PDT

/**
 * Check if beta period has ended
 * @returns {boolean} True if beta has ended
 */
export function isBetaEnded() {
  return new Date() >= BETA_END_DATE;
}

/**
 * Get days remaining in beta (can be negative if ended)
 * @returns {number} Days remaining (negative if ended)
 */
export function getDaysUntilBetaEnd() {
  const now = new Date();
  const diffTime = BETA_END_DATE.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get human-readable time until beta ends
 * @returns {string} Formatted time remaining
 */
export function getTimeUntilBetaEnd() {
  const now = new Date();
  const diffTime = BETA_END_DATE.getTime() - now.getTime();
  
  if (diffTime <= 0) {
    return 'Beta has ended';
  }
  
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Check if user should see beta ended messaging
 * @param {Object} user - User object
 * @returns {boolean} True if should show beta ended UI
 */
export function shouldShowBetaEndedUI(user) {
  // If beta hasn't ended yet, don't show ended UI
  if (!isBetaEnded()) {
    return false;
  }
  
  // If user already has lifetime access, don't show ended UI
  if (user?.subscription?.plan === 'lifetime' && user?.subscription?.status === 'active') {
    return false;
  }
  
  // Show ended UI for beta testers who haven't completed feedback
  return true;
}

/**
 * Get appropriate beta status message for user
 * @param {Object} user - User object
 * @returns {Object} Status object with message and type
 */
export function getBetaStatusMessage(user) {
  const daysLeft = getDaysUntilBetaEnd();
  const timeLeft = getTimeUntilBetaEnd();
  
  // Beta has ended
  if (isBetaEnded()) {
    // User has lifetime access
    if (user?.subscription?.plan === 'lifetime' && user?.subscription?.status === 'active') {
      return {
        type: 'success',
        title: '🎉 Beta Complete - Lifetime Access Active!',
        message: 'Thank you for being a beta tester! You now have permanent access to all features.'
      };
    }
    
    // User needs to complete survey
    return {
      type: 'urgent',
      title: '⏰ Beta Has Ended - Survey Required',
      message: 'Complete your feedback survey now to secure your lifetime access!'
    };
  }
  
  // Beta is ending soon (less than 3 days)
  if (daysLeft <= 3 && daysLeft > 0) {
    return {
      type: 'warning',
      title: `⚠️ Beta Ending Soon - ${timeLeft} Left`,
      message: 'Don\'t forget to complete your feedback survey before beta ends to secure lifetime access!'
    };
  }
  
  // Beta is active
  return {
    type: 'info',
    title: `🚀 Beta Active - ${timeLeft} Remaining`,
    message: 'You\'re part of our exclusive beta! Complete the feedback survey anytime to secure lifetime access.'
  };
}

export default {
  BETA_END_DATE,
  isBetaEnded,
  getDaysUntilBetaEnd,
  getTimeUntilBetaEnd,
  shouldShowBetaEndedUI,
  getBetaStatusMessage
};
