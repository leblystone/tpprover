/**
 * List of known disposable/temporary email domains
 * These are commonly used by bots and spammers
 */

const DISPOSABLE_EMAIL_DOMAINS = [
  // Popular disposable email services
  'passmail.net',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'yopmail.com',
  'maildrop.cc',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chitthi.in',
  'dispostable.com',
  'meltmail.com',
  'mintemail.com',
  'mytemp.email',
  'tempail.com',
  'tempr.email',
  'tmpmail.org',
  'trashmail.com',
  'trashmailer.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'inboxkitten.com',
  'mailcatch.com',
  'mailsac.com',
  'mytrashmail.com',
  'throwawaymail.com',
  'tmpmail.net',
  'mailnesia.com',
  'melt.li',
  'mintemail.com',
  'mohmal.com',
  'mytrashmail.com',
  'nada.email',
  'spamgourmet.com',
  'tempmailo.com',
  'throwaway.email',
  'tmpmail.org',
  'trashmail.com',
  'yopmail.com',
  'zoho.com', // Sometimes used for temporary accounts
];

/**
 * Check if an email domain is a disposable/temporary email service
 * @param {string} email - The email address to check
 * @returns {boolean} - True if the email is from a disposable domain
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Validate email and check if it's disposable
 * @param {string} email - The email address to validate
 * @returns {{valid: boolean, error?: string, tip?: string, isDisposable?: boolean}}
 */
export function validateEmailWithDisposableCheck(email) {
  if (!email) {
    return { valid: false, error: 'Email is required.' };
  }

  // Basic email format validation
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address.',
      tip: 'Email should be in format: yourname@example.com'
    };
  }

  // Check for disposable email
  if (isDisposableEmail(email)) {
    return {
      valid: false,
      error: 'Temporary or disposable email addresses are not allowed.',
      tip: 'Please use a permanent email address (Gmail, Outlook, Yahoo, etc.)',
      isDisposable: true
    };
  }

  if (email.length > 254) {
    return {
      valid: false,
      error: 'Email address is too long.',
      tip: 'Email should be less than 254 characters'
    };
  }

  return { valid: true, isDisposable: false };
}

