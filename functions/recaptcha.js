/**
 * Google reCAPTCHA v3 Server-Side Verification
 */

const RECAPTCHA_SECRET_KEY = '6LegeyksAAAAAJmEh1FwGDw1wEtPKFGCU4lls5nQ';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verify reCAPTCHA token on the server
 * @param {string} token - The reCAPTCHA token from the client
 * @param {string} remoteip - Optional: The user's IP address
 * @returns {Promise<{success: boolean, score?: number, action?: string, error?: string}>}
 */
async function verifyRecaptcha(token, remoteip = null) {
  if (!token) {
    return { success: false, error: 'No reCAPTCHA token provided' };
  }

  try {
    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET_KEY,
      response: token
    });

    if (remoteip) {
      params.append('remoteip', remoteip);
    }

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.success) {
      // reCAPTCHA v3 returns a score (0.0 to 1.0)
      // Lower scores indicate bot-like behavior
      // Typically, scores above 0.5 are considered legitimate
      const score = data.score || 0;
      const action = data.action || 'unknown';

      // Log for monitoring
      console.log(`reCAPTCHA verification: success=true, score=${score}, action=${action}`);

      // For production, you might want to enforce a minimum score
      // For now, we'll accept any successful verification
      return {
        success: true,
        score,
        action,
        challenge_ts: data.challenge_ts,
        hostname: data.hostname
      };
    } else {
      // Verification failed
      const errorCodes = data['error-codes'] || [];
      console.warn(`reCAPTCHA verification failed: ${errorCodes.join(', ')}`);
      return {
        success: false,
        error: errorCodes.join(', ') || 'Verification failed'
      };
    }
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return {
      success: false,
      error: error.message || 'Verification request failed'
    };
  }
}

/**
 * Verify reCAPTCHA with optional enforcement
 * @param {string} token - The reCAPTCHA token
 * @param {number} minScore - Minimum score threshold (default: 0.5)
 * @param {string} expectedAction - Expected action name (optional)
 * @param {string} remoteip - Optional: The user's IP address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function verifyRecaptchaWithEnforcement(token, minScore = 0.5, expectedAction = null, remoteip = null) {
  const result = await verifyRecaptcha(token, remoteip);

  if (!result.success) {
    return result;
  }

  // Check score threshold
  if (result.score !== undefined && result.score < minScore) {
    return {
      success: false,
      error: `reCAPTCHA score too low: ${result.score} (minimum: ${minScore})`
    };
  }

  // Check action if expected
  if (expectedAction && result.action !== expectedAction) {
    return {
      success: false,
      error: `reCAPTCHA action mismatch: expected ${expectedAction}, got ${result.action}`
    };
  }

  return { success: true, score: result.score, action: result.action };
}

module.exports = {
  verifyRecaptcha,
  verifyRecaptchaWithEnforcement
};

