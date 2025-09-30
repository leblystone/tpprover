// Beta User Lifetime Access Management
// Ensures beta testers get lifetime access and are never prompted for subscriptions

import { isBetaEnded, shouldShowBetaEndedUI, getBetaStatusMessage } from '../config/betaConfig';
import { 
  checkLifetimeAccessFirestore, 
  grantLifetimeAccessFirestore 
} from '../services/firebase';

/**
 * Check if user has beta lifetime access (Firestore + localStorage fallback)
 * @param {Object} user - User object with email, uid, createdAt
 * @returns {Promise<boolean>} - Whether user has beta lifetime access
 */
export async function hasBetaLifetimeAccess(user) {
  if (!user) return false;
  
  try {
    // PRIORITY 1: Check Firestore (authoritative source)
    if (user.uid) {
      const firestoreAccess = await checkLifetimeAccessFirestore(user.uid);
      if (firestoreAccess && firestoreAccess.hasAccess) {
        console.log('✅ Lifetime access confirmed via Firestore:', user.email);
        return true;
      }
    }
    
    // PRIORITY 2: Check localStorage (legacy/fallback)
    const localStorageAccess = checkLocalStorageAccess(user);
    if (localStorageAccess) {
      console.log('⚠️ Lifetime access found in localStorage (needs migration):', user.email);
      
      // Auto-migrate to Firestore if we have user ID
      if (user.uid) {
        try {
          await grantLifetimeAccessFirestore(
            user.uid,
            user.email,
            'Beta tester - auto-migrated from localStorage',
            'auto-migration'
          );
          console.log('✅ Auto-migrated lifetime access to Firestore');
        } catch (error) {
          console.error('Failed to auto-migrate, but user still has access via localStorage:', error);
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking lifetime access:', error);
    // Fallback to localStorage on error
    return checkLocalStorageAccess(user);
  }
}

/**
 * Check localStorage for legacy lifetime access indicators
 * @param {Object} user - User object
 * @returns {boolean}
 */
function checkLocalStorageAccess(user) {
  const indicators = [
    checkBetaFeedbackCompleted(user),
    checkManualBetaGrant(user),
    checkFounderStatus(),
    checkLegacyBetaTester()
  ];
  
  return indicators.some(indicator => indicator === true);
}

/**
 * Check legacy beta tester flag
 */
function checkLegacyBetaTester() {
  try {
    const flag = localStorage.getItem('tpprover_is_tester');
    return flag === '1' || flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Check if user completed beta feedback form
 */
function checkBetaFeedbackCompleted(user) {
  try {
    const completedUsers = JSON.parse(localStorage.getItem('tpprover_beta_feedback_completed') || '[]');
    return completedUsers.includes(user.email?.toLowerCase()) || 
           completedUsers.includes(user.uid);
  } catch {
    return false;
  }
}

/**
 * Check founder status (first 100 users)
 */
function checkFounderStatus() {
  try {
    const flag = localStorage.getItem('tpprover_is_founder');
    return flag === '1' || flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Check manual beta lifetime grant
 */
function checkManualBetaGrant(user) {
  try {
    const grantedUsers = JSON.parse(localStorage.getItem('tpprover_beta_lifetime_granted') || '[]');
    return grantedUsers.includes(user.email?.toLowerCase()) || 
           grantedUsers.includes(user.uid);
  } catch {
    return false;
  }
}

/**
 * Check if user signed up during beta period
 */
function checkBetaPeriodSignup(user) {
  if (!user.createdAt) return false;
  
  try {
    const userDate = new Date(user.createdAt);
    const betaStartDate = new Date('2024-01-01'); // Adjust to your beta start
    const betaEndDate = new Date('2025-09-21');   // Beta ends Sept 21st at midnight
    
    return userDate >= betaStartDate && userDate <= betaEndDate;
  } catch {
    return false;
  }
}

/**
 * Grant beta lifetime access to a user (saves to Firestore + localStorage)
 * @param {Object} user - User object
 * @param {string} reason - Reason for granting access
 * @returns {Promise<boolean>}
 */
export async function grantBetaLifetimeAccess(user, reason = 'Beta feedback completed') {
  if (!user) return false;
  
  try {
    // Grant in Firestore (primary)
    if (user.uid) {
      await grantLifetimeAccessFirestore(
        user.uid,
        user.email,
        reason,
        'system'
      );
    }
    
    // Also save to localStorage for backwards compatibility
    const grantedUsers = JSON.parse(localStorage.getItem('tpprover_beta_lifetime_granted') || '[]');
    const identifier = user.email?.toLowerCase() || user.uid;
    
    if (!grantedUsers.includes(identifier)) {
      grantedUsers.push(identifier);
      localStorage.setItem('tpprover_beta_lifetime_granted', JSON.stringify(grantedUsers));
      
      // Log the grant
      console.log(`✅ Beta lifetime access granted to ${user.email} - ${reason}`);
      
      // Show success message
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            message: `🎉 Lifetime access activated! Thank you for being a beta tester.`, 
            type: 'success' 
          }
        }));
      }
      
      return true;
    }
  } catch (error) {
    console.error('Failed to grant beta lifetime access:', error);
  }
  
  return false;
}

/**
 * Mark beta feedback as completed for user
 * @param {Object} user - User object
 */
export async function markBetaFeedbackCompleted(user) {
  if (!user) return false;
  
  try {
    const completedUsers = JSON.parse(localStorage.getItem('tpprover_beta_feedback_completed') || '[]');
    const identifier = user.email?.toLowerCase() || user.uid;
    
    if (!completedUsers.includes(identifier)) {
      completedUsers.push(identifier);
      localStorage.setItem('tpprover_beta_feedback_completed', JSON.stringify(completedUsers));
      
      // Automatically grant lifetime access
      await grantBetaLifetimeAccess(user, 'Beta feedback form completed');
      
      return true;
    }
  } catch (error) {
    console.error('Failed to mark beta feedback completed:', error);
  }
  
  return false;
}

/**
 * Create a beta lifetime subscription record
 * @param {Object} user - User object
 * @returns {Object} - Subscription object for beta users
 */
export function createBetaLifetimeSubscription(user) {
  const now = new Date();
  const farFuture = new Date(now);
  farFuture.setFullYear(farFuture.getFullYear() + 100); // 100 years from now
  
  return {
    id: 'beta_lifetime_' + Date.now(),
    plan: 'Beta Lifetime Access',
    price: 0,
    interval: 'lifetime',
    currency: 'USD',
    status: 'active',
    startedAt: now.toISOString(),
    currentPeriodEnd: farFuture.toISOString(),
    paymentMethod: null,
    customerId: null,
    subscriptionId: 'beta_lifetime',
    isBetaLifetime: true,
    hasLifetimeAccess: true,
    grantedAt: now.toISOString(),
    grantReason: 'Beta tester lifetime access'
  };
}

/**
 * Check if user is a beta tester (but hasn't necessarily earned lifetime access)
 * @param {Object} user - User object
 * @returns {boolean} - Whether user is a beta tester
 */
export function isBetaTester(user) {
  if (!user) return false;
  
  const indicators = [
    // Legacy beta tester flag
    checkLegacyBetaTester(),
    
    // Signed up during beta period
    checkBetaPeriodSignup(user),
    
    // Has localStorage indicators (but use async hasBetaLifetimeAccess for actual check)
    checkLocalStorageAccess(user)
  ];
  
  return indicators.some(indicator => indicator === true);
}

/**
 * Check if subscription should be hidden for this user
 * @param {Object} user - User object
 * @returns {Promise<boolean>} - Whether to hide subscription prompts
 */
export async function shouldHideSubscription(user) {
  return await hasBetaLifetimeAccess(user);
}

/**
 * Get beta access status for user
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Beta access status details
 */
export async function getBetaAccessStatus(user) {
  const hasAccess = await hasBetaLifetimeAccess(user);
  
  // Check Firestore
  let firestoreData = null;
  if (user?.uid) {
    try {
      firestoreData = await checkLifetimeAccessFirestore(user.uid);
    } catch (error) {
      console.error('Error checking Firestore:', error);
    }
  }
  
  const indicators = {
    firestore: !!firestoreData,
    legacyTester: checkLegacyBetaTester(),
    feedbackCompleted: checkBetaFeedbackCompleted(user),
    founder: checkFounderStatus(),
    manualGrant: checkManualBetaGrant(user),
    betaPeriodSignup: checkBetaPeriodSignup(user)
  };
  
  return {
    hasLifetimeAccess: hasAccess,
    indicators,
    firestoreData,
    activeReasons: Object.entries(indicators)
      .filter(([key, value]) => value)
      .map(([key]) => key),
    needsMigration: hasAccess && !firestoreData
  };
}

/**
 * Check if user should see beta ended UI
 * @param {Object} user - User object
 * @returns {boolean} - Whether to show beta ended messaging
 */
export function shouldShowBetaEndedUIForUser(user) {
  return shouldShowBetaEndedUI(user);
}

/**
 * Get beta status message for user
 * @param {Object} user - User object
 * @returns {Object} - Status message object
 */
export function getBetaStatusForUser(user) {
  return getBetaStatusMessage(user);
}

/**
 * Check if beta period has ended
 * @returns {boolean} - Whether beta has ended
 */
export function isBetaPeriodEnded() {
  return isBetaEnded();
}

/**
 * Get all localStorage lifetime access data for migration
 * @returns {Array} - Array of users with lifetime access in localStorage
 */
export function getLocalStorageLifetimeUsers() {
  const users = [];
  
  try {
    // Get manually granted users
    const grantedUsers = JSON.parse(localStorage.getItem('tpprover_beta_lifetime_granted') || '[]');
    grantedUsers.forEach(identifier => {
      users.push({
        email: identifier,
        reason: 'Manual grant - localStorage'
      });
    });
    
    // Get feedback completed users
    const feedbackUsers = JSON.parse(localStorage.getItem('tpprover_beta_feedback_completed') || '[]');
    feedbackUsers.forEach(identifier => {
      if (!users.some(u => u.email === identifier)) {
        users.push({
          email: identifier,
          reason: 'Beta feedback completed'
        });
      }
    });
    
  } catch (error) {
    console.error('Error getting localStorage lifetime users:', error);
  }
  
  return users;
}
