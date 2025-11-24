/**
 * Data Bleed Diagnostic Tool
 * Helps identify sources of data bleeding between accounts
 */

/**
 * Check for potential data bleed issues
 * @returns {Object} Diagnostic report
 */
export function diagnoseDataBleed() {
  const report = {
    timestamp: new Date().toISOString(),
    issues: [],
    warnings: [],
    info: [],
    recommendations: []
  };

  // Check localStorage state
  const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
  const currentUser = localStorage.getItem('tpprover_user');
  const authToken = localStorage.getItem('tpprover_auth_token');
  
  let parsedUser = null;
  if (currentUser) {
    try {
      parsedUser = JSON.parse(currentUser);
    } catch (e) {
      report.warnings.push('Failed to parse tpprover_user from localStorage');
    }
  }

  // Check for email mismatch (potential data bleed indicator)
  if (lastUserEmail && parsedUser?.email) {
    if (lastUserEmail.toLowerCase() !== parsedUser.email.toLowerCase()) {
      report.issues.push({
        severity: 'CRITICAL',
        type: 'email_mismatch',
        message: 'Last user email does not match current user email',
        details: {
          lastUserEmail,
          currentUserEmail: parsedUser.email
        }
      });
    }
  }

  // Check for stale data keys
  const userDataKeys = [
    'tpprover_protocols',
    'tpprover_recon_items',
    'tpprover_recon_history',
    'tpprover_supplements',
    'tpprover_orders',
    'tpprover_metrics',
    'tpprover_vendors',
    'tpprover_calendar_notes',
    'tpprover_stockpile',
    'tpprover_scheduled_buys',
    'tpprover_task_completion',
    'tpprover_calendar_done'
  ];

  const existingDataKeys = userDataKeys.filter(key => {
    const value = localStorage.getItem(key);
    return value && value !== '[]' && value !== '{}' && value !== 'null';
  });

  if (existingDataKeys.length > 0 && (!lastUserEmail || !parsedUser)) {
    report.warnings.push({
      type: 'orphaned_data',
      message: 'Found user data in localStorage without user tracking',
      details: {
        dataKeys: existingDataKeys,
        hasLastUserEmail: !!lastUserEmail,
        hasCurrentUser: !!parsedUser
      }
    });
  }

  // Check for data without user context
  if (existingDataKeys.length > 0) {
    report.info.push({
      type: 'localStorage_data',
      message: `Found ${existingDataKeys.length} data keys in localStorage`,
      dataKeys: existingDataKeys,
      userEmail: parsedUser?.email || 'unknown',
      lastUserEmail: lastUserEmail || 'none'
    });
  }

  // Check sessionStorage for signup/login flags
  const signupInProgress = sessionStorage.getItem('tpp_signup_in_progress');
  const loginInProgress = sessionStorage.getItem('tpp_login_in_progress');
  
  if (signupInProgress === 'true' || loginInProgress === 'true') {
    report.info.push({
      type: 'auth_in_progress',
      message: 'Authentication process in progress',
      signupInProgress: signupInProgress === 'true',
      loginInProgress: loginInProgress === 'true'
    });
  }

  // Recommendations
  if (report.issues.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      action: 'Clear all user data and reload',
      reason: 'Critical email mismatch detected - potential data bleed'
    });
  }

  if (existingDataKeys.length > 0 && (!lastUserEmail || !parsedUser)) {
    report.recommendations.push({
      priority: 'MEDIUM',
      action: 'Validate data ownership before loading',
      reason: 'Orphaned data found without user context'
    });
  }

  return report;
}

/**
 * Log diagnostic report to console with formatting
 */
export function logDataBleedDiagnostic() {
  const report = diagnoseDataBleed();
  
  console.group('🔍 Data Bleed Diagnostic Report');
  console.log('Timestamp:', report.timestamp);
  
  if (report.issues.length > 0) {
    console.group('🚨 CRITICAL ISSUES');
    report.issues.forEach(issue => {
      console.error(`${issue.severity}: ${issue.message}`, issue.details);
    });
    console.groupEnd();
  }
  
  if (report.warnings.length > 0) {
    console.group('⚠️ WARNINGS');
    report.warnings.forEach(warning => {
      if (typeof warning === 'object') {
        console.warn(warning.message, warning.details);
      } else {
        console.warn(warning);
      }
    });
    console.groupEnd();
  }
  
  if (report.info.length > 0) {
    console.group('ℹ️ INFO');
    report.info.forEach(info => {
      if (typeof info === 'object') {
        console.log(info.message, info);
      } else {
        console.log(info);
      }
    });
    console.groupEnd();
  }
  
  if (report.recommendations.length > 0) {
    console.group('💡 RECOMMENDATIONS');
    report.recommendations.forEach(rec => {
      console.log(`[${rec.priority}] ${rec.action} - ${rec.reason}`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
  
  return report;
}

/**
 * Safe localStorage getter that validates user ownership
 * @param {string} key - localStorage key
 * @param {string} expectedUserEmail - Expected user email
 * @returns {any|null} Parsed value or null if ownership invalid
 */
export function safeLocalStorageGet(key, expectedUserEmail) {
  if (!key || !expectedUserEmail) {
    console.warn('⚠️ safeLocalStorageGet: Missing key or expectedUserEmail');
    return null;
  }

  // Check if data belongs to current user
  const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
  const currentUser = localStorage.getItem('tpprover_user');
  
  let parsedUser = null;
  if (currentUser) {
    try {
      parsedUser = JSON.parse(currentUser);
    } catch (e) {
      console.warn('⚠️ Failed to parse user data during validation');
      return null;
    }
  }

  // Validate ownership
  const normalizedExpected = expectedUserEmail.toLowerCase();
  const normalizedLast = lastUserEmail?.toLowerCase();
  const normalizedCurrent = parsedUser?.email?.toLowerCase();

  // If we have a last user email, it must match expected
  if (normalizedLast && normalizedLast !== normalizedExpected) {
    console.warn(`⚠️ Data ownership mismatch for ${key}:`, {
      expected: normalizedExpected,
      lastUser: normalizedLast,
      currentUser: normalizedCurrent
    });
    return null;
  }

  // If we have current user, it must match expected
  if (normalizedCurrent && normalizedCurrent !== normalizedExpected) {
    console.warn(`⚠️ Data ownership mismatch for ${key}:`, {
      expected: normalizedExpected,
      lastUser: normalizedLast,
      currentUser: normalizedCurrent
    });
    return null;
  }

  // Safe to read
  try {
    const value = localStorage.getItem(key);
    if (!value || value === '[]' || value === '{}' || value === 'null') {
      return null;
    }
    return JSON.parse(value);
  } catch (e) {
    console.error(`❌ Failed to parse localStorage key ${key}:`, e);
    return null;
  }
}

/**
 * Check if current localStorage data belongs to the specified user
 * @param {string} userEmail - User email to validate against
 * @returns {boolean} True if data belongs to user, false otherwise
 */
export function validateDataOwnership(userEmail) {
  if (!userEmail) return false;

  const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
  const currentUser = localStorage.getItem('tpprover_user');
  
  const normalizedExpected = userEmail.toLowerCase();
  const normalizedLast = lastUserEmail?.toLowerCase();
  
  let normalizedCurrent = null;
  if (currentUser) {
    try {
      const parsed = JSON.parse(currentUser);
      normalizedCurrent = parsed.email?.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  // Check if last user email matches
  if (normalizedLast && normalizedLast !== normalizedExpected) {
    return false;
  }

  // Check if current user email matches
  if (normalizedCurrent && normalizedCurrent !== normalizedExpected) {
    return false;
  }

  return true;
}




