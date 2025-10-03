// Agreement Tracking Service
// Tracks all user agreements with timestamps for legal protection

import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const AGREEMENT_STORAGE_KEY = 'tpprover_agreement_history';

// Agreement types
export const AGREEMENT_TYPES = {
  FIRST_LAUNCH_DISCLAIMER: 'first_launch_disclaimer',
  SIGNUP_TERMS: 'signup_terms',
  SIGNUP_PRIVACY: 'signup_privacy',
  TERMS_UPDATE: 'terms_update',
  PRIVACY_UPDATE: 'privacy_update'
};

// Agreement versions (update these when terms change)
export const AGREEMENT_VERSIONS = {
  TERMS_OF_SERVICE: '2025-01-01-v1',
  PRIVACY_POLICY: '2025-01-01-v1'
};

/**
 * Get all agreement history
 */
export function getAgreementHistory() {
  try {
    const history = localStorage.getItem(AGREEMENT_STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error loading agreement history:', error);
    return [];
  }
}

/**
 * Record a new agreement
 */
export async function recordAgreement(type, version = null, additionalData = {}, userEmail = null) {
  try {
    const history = getAgreementHistory();
    const agreement = {
      id: generateAgreementId(),
      type,
      version,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: null, // Could be populated from server if needed
      userEmail, // User's email for admin tracking
      additionalData,
      // Legal metadata
      legalJurisdiction: 'New Mexico, United States',
      agreementLanguage: 'English'
    };

    // Store locally
    history.push(agreement);
    localStorage.setItem(AGREEMENT_STORAGE_KEY, JSON.stringify(history));

    // Store in Firebase for admin access
    try {
      await storeAgreementInFirebase(agreement);
    } catch (firebaseError) {
      console.warn('Failed to store agreement in Firebase:', firebaseError);
      // Continue with local storage even if Firebase fails
    }

    // Log for debugging (remove in production)
    console.log('📝 Agreement recorded:', {
      type,
      version,
      timestamp: agreement.timestamp,
      id: agreement.id,
      userEmail
    });

    return agreement;
  } catch (error) {
    console.error('Error recording agreement:', error);
    throw error;
  }
}

/**
 * Store agreement in Firebase for admin access
 */
async function storeAgreementInFirebase(agreement) {
  try {
    const agreementRef = doc(db, 'user_agreements', agreement.id);
    await setDoc(agreementRef, {
      ...agreement,
      firebaseTimestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing agreement in Firebase:', error);
    throw error;
  }
}

/**
 * Get agreement history for a specific type
 */
export function getAgreementsByType(type) {
  const history = getAgreementHistory();
  return history.filter(agreement => agreement.type === type);
}

/**
 * Get the latest agreement for a specific type
 */
export function getLatestAgreement(type) {
  const agreements = getAgreementsByType(type);
  return agreements.length > 0 ? agreements[agreements.length - 1] : null;
}

/**
 * Check if user has agreed to specific agreement type
 */
export function hasAgreedTo(type) {
  return getLatestAgreement(type) !== null;
}

/**
 * Get agreement summary for user
 */
export function getAgreementSummary() {
  const history = getAgreementHistory();
  const summary = {
    totalAgreements: history.length,
    firstAgreement: history.length > 0 ? history[0].timestamp : null,
    lastAgreement: history.length > 0 ? history[history.length - 1].timestamp : null,
    agreementTypes: {},
    versions: {}
  };

  // Group by type
  history.forEach(agreement => {
    if (!summary.agreementTypes[agreement.type]) {
      summary.agreementTypes[agreement.type] = 0;
    }
    summary.agreementTypes[agreement.type]++;

    if (agreement.version) {
      if (!summary.versions[agreement.version]) {
        summary.versions[agreement.version] = 0;
      }
      summary.versions[agreement.version]++;
    }
  });

  return summary;
}

/**
 * Export agreement history for legal purposes
 */
export function exportAgreementHistory() {
  const history = getAgreementHistory();
  const summary = getAgreementSummary();
  
  return {
    exportTimestamp: new Date().toISOString(),
    userIdentifier: 'anonymous', // Could be user email if available
    agreementHistory: history,
    summary,
    legalNotice: 'This data is maintained for legal compliance and user protection.'
  };
}

/**
 * Generate unique agreement ID
 */
function generateAgreementId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `agreement_${timestamp}_${random}`;
}

/**
 * Validate agreement data integrity
 */
export function validateAgreementHistory() {
  try {
    const history = getAgreementHistory();
    const issues = [];

    history.forEach((agreement, index) => {
      if (!agreement.id) issues.push(`Agreement ${index}: Missing ID`);
      if (!agreement.type) issues.push(`Agreement ${index}: Missing type`);
      if (!agreement.timestamp) issues.push(`Agreement ${index}: Missing timestamp`);
      if (!agreement.userAgent) issues.push(`Agreement ${index}: Missing user agent`);
    });

    return {
      isValid: issues.length === 0,
      issues,
      totalAgreements: history.length
    };
  } catch (error) {
    return {
      isValid: false,
      issues: ['Failed to validate agreement history'],
      totalAgreements: 0
    };
  }
}

/**
 * ADMIN FUNCTIONS - For business/legal access to user agreement data
 */

/**
 * Get all user agreements from Firebase (Admin only)
 */
export async function getAllUserAgreements() {
  try {
    const agreementsRef = collection(db, 'user_agreements');
    const q = query(agreementsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    const agreements = [];
    snapshot.forEach((doc) => {
      agreements.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return agreements;
  } catch (error) {
    console.error('Error fetching user agreements:', error);
    throw error;
  }
}

/**
 * Get agreements for a specific user (Admin only)
 */
export async function getUserAgreements(userEmail) {
  try {
    const agreementsRef = collection(db, 'user_agreements');
    const q = query(
      agreementsRef, 
      where('userEmail', '==', userEmail),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const agreements = [];
    snapshot.forEach((doc) => {
      agreements.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return agreements;
  } catch (error) {
    console.error('Error fetching user agreements:', error);
    throw error;
  }
}

/**
 * Get agreement statistics (Admin only)
 */
export async function getAgreementStatistics() {
  try {
    const agreements = await getAllUserAgreements();
    
    const stats = {
      totalAgreements: agreements.length,
      uniqueUsers: new Set(agreements.map(a => a.userEmail).filter(Boolean)).size,
      agreementTypes: {},
      versions: {},
      timeRange: {
        earliest: null,
        latest: null
      }
    };

    agreements.forEach(agreement => {
      // Count by type
      if (!stats.agreementTypes[agreement.type]) {
        stats.agreementTypes[agreement.type] = 0;
      }
      stats.agreementTypes[agreement.type]++;

      // Count by version
      if (agreement.version) {
        if (!stats.versions[agreement.version]) {
          stats.versions[agreement.version] = 0;
        }
        stats.versions[agreement.version]++;
      }

      // Time range
      if (!stats.timeRange.earliest || agreement.timestamp < stats.timeRange.earliest) {
        stats.timeRange.earliest = agreement.timestamp;
      }
      if (!stats.timeRange.latest || agreement.timestamp > stats.timeRange.latest) {
        stats.timeRange.latest = agreement.timestamp;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching agreement statistics:', error);
    throw error;
  }
}

/**
 * Export all agreement data for legal purposes (Admin only)
 */
export async function exportAllAgreements() {
  try {
    const agreements = await getAllUserAgreements();
    const stats = await getAgreementStatistics();
    
    return {
      exportTimestamp: new Date().toISOString(),
      exportedBy: 'admin',
      totalRecords: agreements.length,
      statistics: stats,
      agreements: agreements,
      legalNotice: 'This data export contains all user agreement records for legal compliance purposes.'
    };
  } catch (error) {
    console.error('Error exporting agreements:', error);
    throw error;
  }
}

// Debug functions (remove in production)
if (process.env.NODE_ENV === 'development') {
  window.debugAgreements = {
    getHistory: getAgreementHistory,
    getSummary: getAgreementSummary,
    exportHistory: exportAgreementHistory,
    validate: validateAgreementHistory,
    clearHistory: () => {
      localStorage.removeItem(AGREEMENT_STORAGE_KEY);
      console.log('🗑️ Agreement history cleared');
    },
    // Admin functions
    getAllAgreements: getAllUserAgreements,
    getUserAgreements: getUserAgreements,
    getStatistics: getAgreementStatistics,
    exportAll: exportAllAgreements
  };
}
