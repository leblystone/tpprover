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
// Use SKU-style versioning: TOS-YYYY-MM-DD-REV or PP-YYYY-MM-DD-REV
// These should match the actual date when the content was last updated
export const AGREEMENT_VERSIONS = {
  TERMS_OF_SERVICE: 'TOS-2026-04-30-REV1',
  PRIVACY_POLICY: 'PP-2026-04-30-REV1'
};

// Data retention periods (in milliseconds) for medical/research compliance
export const RETENTION_PERIODS = {
  // Legal agreements - 10 years (medical/research liability protection)
  LEGAL_AGREEMENTS: 10 * 365 * 24 * 60 * 60 * 1000,
  
  // User metadata - 5 years (account data, preferences, security logs)
  USER_METADATA: 5 * 365 * 24 * 60 * 60 * 1000,
  
  // Technical data - 3 years (user agents, error logs, analytics)
  TECHNICAL_DATA: 3 * 365 * 24 * 60 * 60 * 1000,
  
  // Agreement versions - indefinite (regulatory compliance)
  AGREEMENT_VERSIONS: null, // Never delete
  
  // User deletion grace period - 30 days (anonymization delay)
  USER_DELETION_GRACE: 30 * 24 * 60 * 60 * 1000
};

// Data classification for retention policies
export const DATA_CLASSIFICATIONS = {
  LEGAL_AGREEMENT: 'legal_agreement',
  USER_METADATA: 'user_metadata', 
  TECHNICAL_DATA: 'technical_data',
  AGREEMENT_VERSION: 'agreement_version'
};

/**
 * Helper function to update agreement versions when terms/privacy are updated
 * Call this function when you update the terms or privacy policy content
 */
export function updateAgreementVersion(type, newVersion) {
  if (type === 'TERMS_OF_SERVICE') {
    AGREEMENT_VERSIONS.TERMS_OF_SERVICE = newVersion;
  } else if (type === 'PRIVACY_POLICY') {
    AGREEMENT_VERSIONS.PRIVACY_POLICY = newVersion;
  }
  console.log(`📝 Updated ${type} version to: ${newVersion}`);
}

/**
 * Automatically generate a new version for updated terms/privacy
 * This should be called when the content is updated, before users start agreeing to it
 */
export function generateNewVersion(type) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '-'); // YYYY-MM-DD format
  
  // Get current version to increment revision number
  const currentVersion = type === 'TERMS_OF_SERVICE' ? 
    AGREEMENT_VERSIONS.TERMS_OF_SERVICE : 
    AGREEMENT_VERSIONS.PRIVACY_POLICY;
  
  // Extract current revision number and increment it
  const match = currentVersion.match(/-REV(\d+)$/);
  const currentRev = match ? parseInt(match[1]) : 0;
  const newRev = currentRev + 1;
  
  const prefix = type === 'TERMS_OF_SERVICE' ? 'TOS' : 'PP';
  const newVersion = `${prefix}-${dateStr}-REV${newRev}`;
  
  // Update the version
  updateAgreementVersion(type, newVersion);
  
  console.log(`🔄 Generated new version for ${type}: ${newVersion}`);
  return newVersion;
}

/**
 * Debug function to check and fix agreement data issues
 * This can be called from the browser console for debugging
 */
export function debugAgreementData() {
  const history = getAgreementHistory();
  console.log('🔍 Agreement Debug Information:');
  console.log('Total agreements:', history.length);
  console.log('All agreements:', history);
  
  // Check for future dates
  const now = new Date();
  const futureAgreements = history.filter(agreement => 
    new Date(agreement.timestamp) > now
  );
  
  if (futureAgreements.length > 0) {
    console.warn('⚠️ Found agreements with future dates:', futureAgreements);
  }
  
  // Check for missing privacy agreements
  const privacyAgreements = history.filter(agreement => 
    agreement.type === AGREEMENT_TYPES.SIGNUP_PRIVACY || 
    agreement.type === AGREEMENT_TYPES.PRIVACY_UPDATE
  );
  
  if (privacyAgreements.length === 0) {
    console.warn('⚠️ No privacy policy agreements found');
  }
  
  // Check for missing terms agreements
  const termsAgreements = history.filter(agreement => 
    agreement.type === AGREEMENT_TYPES.SIGNUP_TERMS || 
    agreement.type === AGREEMENT_TYPES.TERMS_UPDATE
  );
  
  if (termsAgreements.length === 0) {
    console.warn('⚠️ No terms of service agreements found');
  }
  
  return {
    totalAgreements: history.length,
    futureAgreements: futureAgreements.length,
    privacyAgreements: privacyAgreements.length,
    termsAgreements: termsAgreements.length,
    hasIssues: futureAgreements.length > 0 || privacyAgreements.length === 0 || termsAgreements.length === 0
  };
}

/**
 * Fix missing privacy agreement for existing users
 * This can be called manually to fix the privacy policy recording issue
 */
export async function fixMissingPrivacyAgreement(userEmail = null) {
  try {
    console.log('🔧 Fixing missing privacy agreement...');
    
    // Check if privacy agreement already exists
    const existingPrivacy = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY) || getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE);
    if (existingPrivacy) {
      console.log('✅ Privacy agreement already exists:', existingPrivacy);
      return existingPrivacy;
    }
    
    // Create missing privacy agreement
    const privacyAgreement = await recordAgreement(
      AGREEMENT_TYPES.SIGNUP_PRIVACY,
      AGREEMENT_VERSIONS.PRIVACY_POLICY,
      { 
        fixedManually: true,
        reason: 'Missing privacy agreement fix'
      },
      userEmail
    );
    
    console.log('✅ Created missing privacy agreement:', privacyAgreement);
    return privacyAgreement;
  } catch (error) {
    console.error('❌ Failed to fix missing privacy agreement:', error);
    throw error;
  }
}

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
 * @param {string} type - Agreement type
 * @param {string} version - Agreement version
 * @param {object} additionalData - Additional data to store
 * @param {string} userEmail - User email
 * @param {string|Date} customTimestamp - Optional custom timestamp (ISO string or Date object) to use instead of current date
 */
export async function recordAgreement(type, version = null, additionalData = {}, userEmail = null, customTimestamp = null) {
  try {
    const history = getAgreementHistory();
    // Use custom timestamp if provided, otherwise use current date
    const timestampDate = customTimestamp ? new Date(customTimestamp) : new Date();
    const now = timestampDate;
    // Calculate retention expiration date based on agreement type
    const getRetentionInfo = (agreementType) => {
      // Legal agreements get 10-year retention
      if ([AGREEMENT_TYPES.SIGNUP_TERMS, AGREEMENT_TYPES.SIGNUP_PRIVACY, 
           AGREEMENT_TYPES.TERMS_UPDATE, AGREEMENT_TYPES.PRIVACY_UPDATE].includes(agreementType)) {
        return {
          classification: DATA_CLASSIFICATIONS.LEGAL_AGREEMENT,
          retentionPeriod: RETENTION_PERIODS.LEGAL_AGREEMENTS,
          expirationDate: new Date(now.getTime() + RETENTION_PERIODS.LEGAL_AGREEMENTS).toISOString()
        };
      }
      
      // First launch disclaimer gets technical data retention
      if (agreementType === AGREEMENT_TYPES.FIRST_LAUNCH_DISCLAIMER) {
        return {
          classification: DATA_CLASSIFICATIONS.TECHNICAL_DATA,
          retentionPeriod: RETENTION_PERIODS.TECHNICAL_DATA,
          expirationDate: new Date(now.getTime() + RETENTION_PERIODS.TECHNICAL_DATA).toISOString()
        };
      }
      
      // Default to legal agreement retention for unknown types
      return {
        classification: DATA_CLASSIFICATIONS.LEGAL_AGREEMENT,
        retentionPeriod: RETENTION_PERIODS.LEGAL_AGREEMENTS,
        expirationDate: new Date(now.getTime() + RETENTION_PERIODS.LEGAL_AGREEMENTS).toISOString()
      };
    };

    const retentionInfo = getRetentionInfo(type);

    const agreement = {
      id: generateAgreementId(),
      type,
      version,
      timestamp: now.toISOString(),
      timestampLocal: now.toLocaleString(), // Add local timestamp for debugging
      userAgent: navigator.userAgent,
      ipAddress: null, // Could be populated from server if needed
      userEmail, // User's email for admin tracking
      additionalData,
      // Legal metadata
      legalJurisdiction: 'New Mexico, United States',
      agreementLanguage: 'English',
      // Retention metadata for compliance
      dataClassification: retentionInfo.classification,
      retentionPeriod: retentionInfo.retentionPeriod,
      retentionExpirationDate: retentionInfo.expirationDate,
      // Audit trail metadata
      auditTrail: {
        created: now.toISOString(),
        createdBy: 'system',
        lastAccessed: now.toISOString(),
        accessCount: 1,
        complianceFlags: {
          medicalResearchCompliance: true,
          fdaRegulatory: version ? true : false, // Only versioned agreements are FDA compliant
          legalProtection: true
        }
      }
    };

    // Store locally first (this should always work)
    history.push(agreement);
    try {
      localStorage.setItem(AGREEMENT_STORAGE_KEY, JSON.stringify(history));
      console.log('✅ Agreement stored locally successfully');
    } catch (localError) {
      console.error('❌ Failed to store agreement locally:', localError);
      throw new Error('Failed to store agreement locally: ' + localError.message);
    }

    // Store in Firebase for admin access
    try {
      await storeAgreementInFirebase(agreement);
      console.log('✅ Agreement stored in Firebase successfully');
    } catch (firebaseError) {
      console.error('❌ Failed to store agreement in Firebase:', firebaseError);
      console.error('Firebase error details:', {
        code: firebaseError.code,
        message: firebaseError.message,
        stack: firebaseError.stack
      });
      // Continue with local storage even if Firebase fails
    }

    // Log for debugging (remove in production)
    console.log('📝 Agreement recorded:', {
      type,
      version,
      timestamp: agreement.timestamp,
      id: agreement.id,
      userEmail,
      additionalData
    });
    
    // Additional debugging for signup flow
    if (additionalData.signupFlow) {
      console.log('🔍 Signup agreement recorded for:', type, 'with version:', version);
    }

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
 * Check if user has any agreement data at all
 */
export function hasAnyAgreementData() {
  const history = getAgreementHistory();
  return history.length > 0;
}

/**
 * Check if the user needs to re-accept the current Terms and Privacy (e.g. after a legal/version update).
 * Returns true if either the latest terms or privacy agreement version does not match current AGREEMENT_VERSIONS.
 * Uses local state only (for sync check when Firebase not yet loaded).
 */
export function needsReconsent() {
  const termsAgreement = getLatestAgreement(AGREEMENT_TYPES.TERMS_UPDATE) || getLatestAgreement(AGREEMENT_TYPES.SIGNUP_TERMS);
  const privacyAgreement = getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE) || getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY);
  const termsOutdated = !termsAgreement || termsAgreement.version !== AGREEMENT_VERSIONS.TERMS_OF_SERVICE;
  const privacyOutdated = !privacyAgreement || privacyAgreement.version !== AGREEMENT_VERSIONS.PRIVACY_POLICY;
  return termsOutdated || privacyOutdated;
}

/**
 * Fetch latest terms and privacy agreements from Firebase for the current user (cross-device).
 * Used so agreement status and timestamp show correctly on any device they're logged into.
 * @param {string} userEmail - Current user's email
 * @returns {{ termsAgreement: object|null, privacyAgreement: object|null }}
 */
export async function getLatestAgreementsFromFirebase(userEmail) {
  if (!userEmail) return { termsAgreement: null, privacyAgreement: null };
  try {
    const agreementsRef = collection(db, 'user_agreements');
    const q = query(
      agreementsRef,
      where('userEmail', '==', userEmail),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    let termsAgreement = null;
    let privacyAgreement = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const agreement = { id: docSnap.id, ...data };
      if (!termsAgreement && (data.type === AGREEMENT_TYPES.TERMS_UPDATE || data.type === AGREEMENT_TYPES.SIGNUP_TERMS)) {
        termsAgreement = agreement;
      }
      if (!privacyAgreement && (data.type === AGREEMENT_TYPES.PRIVACY_UPDATE || data.type === AGREEMENT_TYPES.SIGNUP_PRIVACY)) {
        privacyAgreement = agreement;
      }
    });
    return { termsAgreement, privacyAgreement };
  } catch (error) {
    console.warn('Could not fetch agreements from Firebase (cross-device):', error?.message);
    return { termsAgreement: null, privacyAgreement: null };
  }
}

/**
 * Async check: does this user need to re-consent? Uses Firebase when available (cross-device), falls back to local when index/query fails.
 * @param {string} userEmail - Current user's email
 * @returns {Promise<boolean>}
 */
export async function needsReconsentAsync(userEmail) {
  if (!userEmail) return needsReconsent();
  try {
    const { termsAgreement, privacyAgreement } = await getLatestAgreementsFromFirebase(userEmail);
    // If Firebase returned at least one agreement, use it for the check
    const hasFirebaseData = termsAgreement != null || privacyAgreement != null;
    if (hasFirebaseData) {
      const termsOutdated = !termsAgreement || termsAgreement.version !== AGREEMENT_VERSIONS.TERMS_OF_SERVICE;
      const privacyOutdated = !privacyAgreement || privacyAgreement.version !== AGREEMENT_VERSIONS.PRIVACY_POLICY;
      return termsOutdated || privacyOutdated;
    }
  } catch (_) {
    // Fall through to local
  }
  // Firebase failed (e.g. index not deployed) or returned no data: use local so modal doesn't re-show after agree
  return needsReconsent();
}

/**
 * Create initial agreement records for existing users who don't have agreement data
 * This should be called when a user first loads the app and has no agreement history
 * @param {string} userEmail - User email
 * @param {string|Date} accountCreationDate - Account creation date (ISO string or Date object) to use for agreement timestamps
 */
export async function createInitialAgreementsForExistingUser(userEmail = null, accountCreationDate = null) {
  try {
    // Only create if user has no agreement data
    if (hasAnyAgreementData()) {
      return false; // User already has agreement data
    }

    // Use account creation date if provided, otherwise fallback to current date (shouldn't happen for existing users)
    const agreementDate = accountCreationDate ? (typeof accountCreationDate === 'string' ? accountCreationDate : accountCreationDate.toISOString()) : new Date().toISOString();
    
    console.log('📝 Creating initial agreements with date:', agreementDate);
    
    await recordAgreement(
      AGREEMENT_TYPES.SIGNUP_TERMS,
      AGREEMENT_VERSIONS.TERMS_OF_SERVICE,
      { 
        migratedFromExistingUser: true,
        originalSignupDate: agreementDate
      },
      userEmail,
      agreementDate // Pass custom timestamp
    );
    
    await recordAgreement(
      AGREEMENT_TYPES.SIGNUP_PRIVACY,
      AGREEMENT_VERSIONS.PRIVACY_POLICY,
      { 
        migratedFromExistingUser: true,
        originalSignupDate: agreementDate
      },
      userEmail,
      agreementDate // Pass custom timestamp
    );

    console.log('📝 Created initial agreements for existing user:', userEmail, 'with date:', agreementDate);
    return true;
  } catch (error) {
    console.error('Error creating initial agreements for existing user:', error);
    throw error;
  }
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
 * DATA RETENTION AND CLEANUP FUNCTIONS
 */

/**
 * Check if an agreement record has expired based on retention policy
 */
export function isAgreementExpired(agreement) {
  if (!agreement.retentionExpirationDate) {
    return false; // No expiration date set
  }
  
  const now = new Date();
  const expirationDate = new Date(agreement.retentionExpirationDate);
  return now > expirationDate;
}

/**
 * Get agreements that are eligible for cleanup (expired)
 */
export function getExpiredAgreements() {
  const history = getAgreementHistory();
  return history.filter(agreement => {
    // Never delete legal agreements or agreement versions
    if (agreement.dataClassification === DATA_CLASSIFICATIONS.LEGAL_AGREEMENT ||
        agreement.dataClassification === DATA_CLASSIFICATIONS.AGREEMENT_VERSION) {
      return false;
    }
    
    return isAgreementExpired(agreement);
  });
}

/**
 * Calculate retention status for an agreement
 */
export function getRetentionStatus(agreement) {
  const now = new Date();
  const expirationDate = new Date(agreement.retentionExpirationDate);
  const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
  
  return {
    isExpired: isAgreementExpired(agreement),
    daysUntilExpiration: daysUntilExpiration,
    classification: agreement.dataClassification,
    canBeDeleted: agreement.dataClassification !== DATA_CLASSIFICATIONS.LEGAL_AGREEMENT &&
                  agreement.dataClassification !== DATA_CLASSIFICATIONS.AGREEMENT_VERSION,
    warningThreshold: daysUntilExpiration <= 30 && daysUntilExpiration > 0
  };
}

/**
 * Anonymize user data in agreement records (for user deletion requests)
 */
export function anonymizeAgreementData(userEmail, retainLegalRecords = true) {
  try {
    const history = getAgreementHistory();
    let anonymizedCount = 0;
    
    const updatedHistory = history.map(agreement => {
      if (agreement.userEmail === userEmail) {
        // Create anonymous version
        const anonymizedAgreement = { ...agreement };
        
        // Replace identifiable info with anonymized data
        anonymizedAgreement.userEmail = `anonymous_${agreement.id.substr(-8)}`;
        anonymizedAgreement.ipAddress = null;
        
        // Add anonymization metadata
        anonymizedAgreement.anonymized = {
          date: new Date().toISOString(),
          reason: 'user_deletion_request',
          originalUserExists: false
        };
        
        // Legal agreements keep minimal data for compliance
        if (retainLegalRecords && 
            agreement.dataClassification === DATA_CLASSIFICATIONS.LEGAL_AGREEMENT) {
          // Keep only essential legal compliance data
          anonymizedAgreement.auditTrail.anonymized = true;
          anonymizedCount++;
          return anonymizedAgreement;
        }
        
        // Non-legal agreements can be fully removed after grace period
        if (!retainLegalRecords || 
            agreement.dataClassification !== DATA_CLASSIFICATIONS.LEGAL_AGREEMENT) {
          return null; // Mark for deletion
        }
        
        anonymizedCount++;
        return anonymizedAgreement;
      }
      
      return agreement;
    }).filter(Boolean); // Remove null entries
    
    // Update local storage
    localStorage.setItem(AGREEMENT_STORAGE_KEY, JSON.stringify(updatedHistory));
    
    console.log(`🔒 Anonymized ${anonymizedCount} agreement records for user: ${userEmail}`);
    return { anonymizedCount, remainingRecords: updatedHistory.length };
    
  } catch (error) {
    console.error('❌ Error anonymizing agreement data:', error);
    throw error;
  }
}

/**
 * Get retention summary for admin dashboard
 */
export function getRetentionSummary() {
  const history = getAgreementHistory();
  const now = new Date();
  
  const summary = {
    totalAgreements: history.length,
    classifications: {
      legal: 0,
      metadata: 0,
      technical: 0,
      versions: 0
    },
    expirationStatus: {
      expired: 0,
      expiring30Days: 0,
      expiring90Days: 0,
      indefinite: 0
    },
    complianceFlags: {
      medicalResearch: 0,
      fdaRegulatory: 0,
      legalProtection: 0
    }
  };
  
  history.forEach(agreement => {
    // Count classifications
    switch (agreement.dataClassification) {
      case DATA_CLASSIFICATIONS.LEGAL_AGREEMENT:
        summary.classifications.legal++;
        break;
      case DATA_CLASSIFICATIONS.USER_METADATA:
        summary.classifications.metadata++;
        break;
      case DATA_CLASSIFICATIONS.TECHNICAL_DATA:
        summary.classifications.technical++;
        break;
      case DATA_CLASSIFICATIONS.AGREEMENT_VERSION:
        summary.classifications.versions++;
        break;
    }
    
    // Count expiration status
    if (!agreement.retentionExpirationDate) {
      summary.expirationStatus.indefinite++;
    } else {
      const expirationDate = new Date(agreement.retentionExpirationDate);
      const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiration <= 0) {
        summary.expirationStatus.expired++;
      } else if (daysUntilExpiration <= 30) {
        summary.expirationStatus.expiring30Days++;
      } else if (daysUntilExpiration <= 90) {
        summary.expirationStatus.expiring90Days++;
      }
    }
    
    // Count compliance flags
    if (agreement.auditTrail?.complianceFlags) {
      if (agreement.auditTrail.complianceFlags.medicalResearchCompliance) {
        summary.complianceFlags.medicalResearch++;
      }
      if (agreement.auditTrail.complianceFlags.fdaRegulatory) {
        summary.complianceFlags.fdaRegulatory++;
      }
      if (agreement.auditTrail.complianceFlags.legalProtection) {
        summary.complianceFlags.legalProtection++;
      }
    }
  });
  
  return summary;
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
    debug: debugAgreementData,
    fixPrivacy: fixMissingPrivacyAgreement,
    clearHistory: () => {
      localStorage.removeItem(AGREEMENT_STORAGE_KEY);
      console.log('🗑️ Agreement history cleared');
    },
    // Version management
    generateNewVersion: generateNewVersion,
    updateVersion: updateAgreementVersion,
    getCurrentVersions: () => AGREEMENT_VERSIONS,
    // Admin functions
    getAllAgreements: getAllUserAgreements,
    getUserAgreements: getUserAgreements,
    getStatistics: getAgreementStatistics,
    exportAll: exportAllAgreements,
    // Retention and cleanup functions
    getRetentionSummary: getRetentionSummary,
    getExpiredAgreements: getExpiredAgreements,
    getRetentionStatus: (agreementId) => {
      const history = getAgreementHistory();
      const agreement = history.find(a => a.id === agreementId);
      return agreement ? getRetentionStatus(agreement) : null;
    },
    anonymizeUser: anonymizeAgreementData,
    // Constants
    RETENTION_PERIODS: RETENTION_PERIODS,
    DATA_CLASSIFICATIONS: DATA_CLASSIFICATIONS,
    // Test functions
    testRetention: () => {
      console.log('📊 Current retention summary:', getRetentionSummary());
      console.log('⏰ Expired agreements:', getExpiredAgreements());
    }
  };
}
