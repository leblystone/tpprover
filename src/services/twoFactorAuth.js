import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { encryptData, decryptData } from '../utils/encryption';

/**
 * Two-Factor Authentication Service
 * Manages 2FA settings stored in Firestore
 */

const COLLECTION = 'userSecurity';

/**
 * Get user's 2FA settings from Firestore
 * @param {string} userId - User ID
 * @param {string} password - User password for decryption (if secret is encrypted)
 * @returns {Promise<Object|null>} 2FA settings or null
 */
export async function getTwoFactorSettings(userId, password = null) {
  try {
    const userDoc = doc(db, COLLECTION, userId);
    const docSnap = await getDoc(userDoc);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    const settings = {
      enabled: data.twoFactorEnabled || false,
      method: data.twoFactorMethod || 'email',
      secret: data.totpSecret || '',
      backupCodes: data.backupCodes || [],
      enrolledAt: data.enrolledAt || null,
      lastVerified: data.lastVerified || null
    };
    
    // If secret is encrypted and password provided, decrypt it
    if (settings.secret && password) {
      try {
        if (typeof settings.secret === 'string' && settings.secret.startsWith('U2Fs')) {
          // Encrypted string - decrypt it
          settings.secret = decryptData(settings.secret, password);
        }
      } catch (error) {
        console.error('Failed to decrypt 2FA secret:', error);
        // Return null to prevent partial data
        return null;
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Error loading 2FA settings:', error);
    return null;
  }
}

/**
 * Save user's 2FA settings to Firestore
 * @param {string} userId - User ID
 * @param {Object} settings - 2FA settings object
 * @param {string} password - User password for encryption (optional)
 * @returns {Promise<boolean>} Success status
 */
export async function saveTwoFactorSettings(userId, settings, password = null) {
  try {
    const userDoc = doc(db, COLLECTION, userId);
    
    const dataToSave = {
      twoFactorEnabled: settings.enabled || false,
      twoFactorMethod: settings.method || 'email',
      lastUpdated: serverTimestamp()
    };
    
    // Store secret - encrypt if password provided
    if (settings.secret) {
      if (password) {
        // Encrypt the secret for security
        dataToSave.totpSecret = encryptData(settings.secret, password);
      } else {
        // Store plain (not recommended for production, but allows recovery)
        dataToSave.totpSecret = settings.secret;
      }
    }
    
    if (settings.backupCodes && settings.backupCodes.length > 0) {
      // Encrypt backup codes if password provided
      if (password) {
        dataToSave.backupCodes = encryptData(settings.backupCodes, password);
      } else {
        dataToSave.backupCodes = settings.backupCodes;
      }
    }
    
    if (settings.enrolledAt) {
      dataToSave.enrolledAt = settings.enrolledAt;
    }
    
    await setDoc(userDoc, dataToSave, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving 2FA settings:', error);
    return false;
  }
}

/**
 * Generate backup codes for 2FA recovery
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {string[]} Array of backup codes
 */
export function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Verify a backup code and remove it if valid
 * @param {string} userId - User ID
 * @param {string} code - Backup code to verify
 * @param {string} password - User password for decryption
 * @returns {Promise<boolean>} Whether the code was valid and removed
 */
export async function verifyAndConsumeBackupCode(userId, code, password) {
  try {
    const settings = await getTwoFactorSettings(userId, password);
    if (!settings || !settings.backupCodes || settings.backupCodes.length === 0) {
      return false;
    }
    
    // Ensure backup codes are decrypted
    let codes = settings.backupCodes;
    if (typeof codes === 'string' && codes.startsWith('U2Fs')) {
      codes = decryptData(codes, password);
    }
    
    if (!Array.isArray(codes)) {
      return false;
    }
    
    const codeUpper = code.toUpperCase().trim();
    const index = codes.indexOf(codeUpper);
    
    if (index === -1) {
      return false;
    }
    
    // Remove the used backup code
    codes.splice(index, 1);
    settings.backupCodes = codes;
    
    // Save updated settings
    await saveTwoFactorSettings(userId, settings, password);
    
    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
}

/**
 * Disable 2FA for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function disableTwoFactor(userId) {
  try {
    const userDoc = doc(db, COLLECTION, userId);
    await setDoc(userDoc, {
      twoFactorEnabled: false,
      totpSecret: null,
      backupCodes: [],
      disabledAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return false;
  }
}

