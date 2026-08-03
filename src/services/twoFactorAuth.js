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
 * @param {string} encKey - Encryption key: user's password for email/password accounts, or socialEncKey for Google/magic-link accounts
 * @returns {Promise<Object|null>} 2FA settings or null
 */
export async function getTwoFactorSettings(userId, encKey = null) {
  try {
    const userDoc = doc(db, COLLECTION, userId);
    const docSnap = await getDoc(userDoc);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    const settings = {
      enabled: data.twoFactorEnabled || false,
      method: data.twoFactorMethod || 'authenticator',
      secret: data.totpSecret || '',
      backupCodes: data.backupCodes || [],
      enrolledAt: data.enrolledAt || null,
      lastVerified: data.lastVerified || null
    };
    
    // If secret is encrypted and a key is provided, decrypt it
    if (settings.secret && encKey) {
      try {
        if (typeof settings.secret === 'string' && settings.secret.startsWith('U2Fs')) {
          settings.secret = decryptData(settings.secret, encKey);
        }
      } catch (error) {
        console.error('Failed to decrypt 2FA secret:', error);
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
 * @param {string} encKey - Encryption key: user's password for email/password accounts, or socialEncKey for Google/magic-link accounts
 * @returns {Promise<boolean>} Success status
 */
export async function saveTwoFactorSettings(userId, settings, encKey = null) {
  try {
    const userDoc = doc(db, COLLECTION, userId);
    
    const dataToSave = {
      twoFactorEnabled: settings.enabled || false,
      twoFactorMethod: settings.method || 'authenticator',
      lastUpdated: serverTimestamp()
    };
    
    // Store TOTP secret — encrypt with encKey if available
    if (settings.secret) {
      if (encKey) {
        dataToSave.totpSecret = encryptData(settings.secret, encKey);
      } else {
        // No key available (edge case): store plain — Firestore rules restrict access to owner
        dataToSave.totpSecret = settings.secret;
      }
    }
    
    if (settings.backupCodes && settings.backupCodes.length > 0) {
      if (encKey) {
        dataToSave.backupCodes = encryptData(settings.backupCodes, encKey);
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
 * @param {string} encKey - Encryption key for decryption (password or socialEncKey)
 * @returns {Promise<boolean>} Whether the code was valid and removed
 */
export async function verifyAndConsumeBackupCode(userId, code, encKey) {
  try {
    const settings = await getTwoFactorSettings(userId, encKey);
    if (!settings || !settings.backupCodes || settings.backupCodes.length === 0) {
      return false;
    }
    
    // Ensure backup codes are decrypted
    let codes = settings.backupCodes;
    if (typeof codes === 'string' && codes.startsWith('U2Fs')) {
      codes = decryptData(codes, encKey);
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
    await saveTwoFactorSettings(userId, settings, encKey);
    
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

