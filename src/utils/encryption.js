import CryptoJS from 'crypto-js';

/**
 * Encrypts data using AES encryption with user's password
 * @param {*} data - Data to encrypt (will be JSON stringified)
 * @param {string} password - User's password used as encryption key
 * @returns {string} - Encrypted string
 */
export function encryptData(data, password) {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES decryption with user's password
 * @param {string} encryptedData - Encrypted string
 * @param {string} password - User's password used as decryption key
 * @returns {*} - Decrypted and parsed data
 */
export function decryptData(encryptedData, password) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!jsonString) {
      throw new Error('Invalid password or corrupted data');
    }
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data - check password');
  }
}

/**
 * Creates a hash of the password for verification (not for encryption)
 * @param {string} password - User's password
 * @returns {string} - Password hash
 */
export function hashPassword(password) {
  return CryptoJS.SHA256(password).toString();
}

/**
 * Generates a secure random salt
 * @returns {string} - Random salt
 */
export function generateSalt() {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

/**
 * Encrypts user's private data for Firebase storage
 * @param {object} userData - User's private data object
 * @param {string} password - User's password
 * @returns {object} - Object with encrypted data and metadata
 */
export function encryptUserData(userData, password) {
  const timestamp = new Date().toISOString();
  const salt = generateSalt();
  
  // Combine password with salt for extra security
  const saltedPassword = password + salt;
  
  const encryptedData = {
    data: encryptData(userData, saltedPassword),
    salt: salt,
    lastUpdated: timestamp,
    version: '1.0'
  };
  
  return encryptedData;
}

/**
 * Decrypts user's private data from Firebase
 * @param {object} encryptedUserData - Encrypted data object from Firebase
 * @param {string} password - User's password
 * @returns {object} - Decrypted user data
 */
export function decryptUserData(encryptedUserData, password) {
  if (!encryptedUserData || !encryptedUserData.data || !encryptedUserData.salt) {
    throw new Error('Invalid encrypted data format');
  }
  
  const saltedPassword = password + encryptedUserData.salt;
  return decryptData(encryptedUserData.data, saltedPassword);
}
