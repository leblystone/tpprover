/**
 * Client-side helpers for marketing unsubscribe URLs.
 * Signed tokens are generated server-side only — use links from promo emails
 * or Admin → Shop → Marketing when building campaigns.
 */

const UNSUBSCRIBE_PATH = '/unsubscribe';

/** Public unsubscribe page URL (no token — user enters email on the form). */
export function marketingUnsubscribePageUrl(email) {
  if (!email?.trim()) return UNSUBSCRIBE_PATH;
  const params = new URLSearchParams({ email: email.trim().toLowerCase() });
  return `${UNSUBSCRIBE_PATH}?${params.toString()}`;
}

/**
 * Documented pattern for promo email footers (server generates signed links).
 * @see functions/marketingContacts.js — buildMarketingUnsubscribeUrl
 * @see functions/shopEmails.js — buildMarketingUnsubscribeFooterHtml
 */
export const MARKETING_EMAIL_FOOTER_NOTE =
  'Append buildMarketingUnsubscribeFooterHtml(recipientEmail) to every shop promo blast.';
