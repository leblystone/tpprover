import { TOTP } from 'otpauth';
import QRCode from 'qrcode';

/**
 * TOTP (Time-based One-Time Password) Utilities
 * Handles generating secrets, QR codes, and verifying codes for authenticator apps
 */

/**
 * Generate a new TOTP secret
 * @returns {string} Base32 encoded secret key
 */
export function generateTOTPSecret() {
  const totp = new TOTP({
    issuer: 'The Pep Planner',
    label: 'Account',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  
  // Generate a random base32 secret (32 characters = 160 bits)
  return totp.secret.base32;
}

/**
 * Generate a QR code data URL for easy setup in authenticator apps
 * @param {string} secret - Base32 encoded secret
 * @param {string} email - User's email address
 * @returns {Promise<string>} Data URL of QR code image
 */
export async function generateQRCode(secret, email) {
  const totp = new TOTP({
    issuer: 'The Pep Planner',
    label: email,
    secret: secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  // Generate the otpauth:// URL
  const url = totp.toString();
  
  // Generate QR code as data URL
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Verify a TOTP code against a secret
 * @param {string} secret - Base32 encoded secret
 * @param {string} code - 6-digit code from authenticator app
 * @param {number} window - Time window tolerance (default: 1 = 30 seconds on each side)
 * @returns {boolean} Whether the code is valid
 */
export function verifyTOTPCode(secret, code, window = 1) {
  try {
    const totp = new TOTP({
      secret: secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    // Validate the code with a time window (allows for clock skew)
    const valid = totp.validate({ token: code, window: window }) !== null;
    return valid;
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    return false;
  }
}

/**
 * Get the otpauth:// URL for manual entry
 * @param {string} secret - Base32 encoded secret
 * @param {string} email - User's email address
 * @returns {string} otpauth:// URL
 */
export function getTOTPUrl(secret, email) {
  const totp = new TOTP({
    issuer: 'The Pep Planner',
    label: email,
    secret: secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return totp.toString();
}

/**
 * Validate that a code is 6 digits
 * @param {string} code - Code to validate
 * @returns {boolean} Whether the code format is valid
 */
export function isValidCodeFormat(code) {
  return /^\d{6}$/.test(code);
}







