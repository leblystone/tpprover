// Beta User Lifetime Access Management
// Ensures beta testers get lifetime access and are never prompted for subscriptions

/**
 * Check if user has beta lifetime access
 * @param {Object} user - User object with email, uid, createdAt
 * @returns {boolean} - Whether user has beta lifetime access
 */
export function hasBetaLifetimeAccess(user) {
  if (!user) return false;
  
  // Check multiple beta indicators
  const indicators = [
    // 1. Legacy beta tester flag (already set)
    checkLegacyBetaTester(),
    
    // 2. Beta feedback completion flag
    checkBetaFeedbackCompleted(user),
    
    // 3. Founder status (first 100 users)
    checkFounderStatus(),
    
    // 4. Manual beta lifetime grant
    checkManualBetaGrant(user),
    
    // 5. Signed up during beta period
    checkBetaPeriodSignup(user)
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
    const betaEndDate = new Date('2024-12-31');   // Adjust to your beta end
    
    return userDate >= betaStartDate && userDate <= betaEndDate;
  } catch {
    return false;
  }
}

/**
 * Grant beta lifetime access to a user
 * @param {Object} user - User object
 * @param {string} reason - Reason for granting access
 */
export function grantBetaLifetimeAccess(user, reason = 'Beta feedback completed') {
  if (!user) return false;
  
  try {
    // Add to manual grant list
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
export function markBetaFeedbackCompleted(user) {
  if (!user) return false;
  
  try {
    const completedUsers = JSON.parse(localStorage.getItem('tpprover_beta_feedback_completed') || '[]');
    const identifier = user.email?.toLowerCase() || user.uid;
    
    if (!completedUsers.includes(identifier)) {
      completedUsers.push(identifier);
      localStorage.setItem('tpprover_beta_feedback_completed', JSON.stringify(completedUsers));
      
      // Automatically grant lifetime access
      grantBetaLifetimeAccess(user, 'Beta feedback form completed');
      
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
    grantedAt: now.toISOString(),
    grantReason: 'Beta tester lifetime access'
  };
}

/**
 * Check if subscription should be hidden for this user
 * @param {Object} user - User object
 * @returns {boolean} - Whether to hide subscription prompts
 */
export function shouldHideSubscription(user) {
  return hasBetaLifetimeAccess(user);
}

/**
 * Get beta access status for user
 * @param {Object} user - User object
 * @returns {Object} - Beta access status details
 */
export function getBetaAccessStatus(user) {
  const hasAccess = hasBetaLifetimeAccess(user);
  const indicators = {
    legacyTester: checkLegacyBetaTester(),
    feedbackCompleted: checkBetaFeedbackCompleted(user),
    founder: checkFounderStatus(),
    manualGrant: checkManualBetaGrant(user),
    betaPeriodSignup: checkBetaPeriodSignup(user)
  };
  
  return {
    hasLifetimeAccess: hasAccess,
    indicators,
    activeReasons: Object.entries(indicators)
      .filter(([key, value]) => value)
      .map(([key]) => key)
  };
}
