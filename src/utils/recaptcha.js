/**
 * Google reCAPTCHA v3 Utility
 * 
 * Domain Configuration Required:
 * - thepepplanner.app (production)
 * - localhost (development)
 * - tpp-splendide.web.app (Firebase default)
 * - tpp-splendide.firebaseapp.com (Firebase default)
 */

const RECAPTCHA_SITE_KEY = '6LegeyksAAAAAO7P9TI17T0uD83znwc5OX5obNoN';

/**
 * Load reCAPTCHA script dynamically
 */
export function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.grecaptcha && window.grecaptcha.ready) {
      window.grecaptcha.ready(() => resolve());
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="recaptcha"]');
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(() => resolve());
        } else {
          resolve();
        }
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => resolve());
      } else {
        resolve();
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Execute reCAPTCHA v3 and get token
 * @param {string} action - Action name (e.g., 'login', 'signup', 'contact', 'support')
 * @returns {Promise<string>} reCAPTCHA token
 */
export async function executeRecaptcha(action = 'submit') {
  try {
    // Ensure script is loaded
    await loadRecaptchaScript();
    
    if (!window.grecaptcha) {
      throw new Error('reCAPTCHA not loaded');
    }

    return new Promise((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then((token) => {
            resolve(token);
          })
          .catch((error) => {
            console.error('reCAPTCHA execution error:', error);
            reject(error);
          });
      });
    });
  } catch (error) {
    console.error('Error executing reCAPTCHA:', error);
    throw error;
  }
}

/**
 * React hook for reCAPTCHA
 */
export function useRecaptcha() {
  const execute = async (action = 'submit') => {
    try {
      const token = await executeRecaptcha(action);
      return token;
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      // In development or if reCAPTCHA fails, return null
      // The server should handle this gracefully
      return null;
    }
  };

  return { execute };
}

export { RECAPTCHA_SITE_KEY };

