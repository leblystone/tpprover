/**
 * Trial length cutover — users who signed up before this date get 30 days;
 * anyone on or after gets 14 days.
 */
const TRIAL_CUTOVER = new Date('2026-03-10T00:00:00.000Z');

const LEGACY_TRIAL_DAYS = 30;
const NEW_TRIAL_DAYS = 14;

/**
 * Returns the number of trial days that should apply for a given signup date.
 * @param {Date|null} signupDate - The user's createdAt date.
 * @returns {number}
 */
export function getTrialDaysForSignup(signupDate) {
  if (!signupDate || !(signupDate instanceof Date) || isNaN(signupDate.getTime())) {
    return NEW_TRIAL_DAYS;
  }
  return signupDate < TRIAL_CUTOVER ? LEGACY_TRIAL_DAYS : NEW_TRIAL_DAYS;
}

/**
 * Calculates the fallback trial end date for a user based on their signup date.
 * @param {Date} signupDate
 * @returns {Date}
 */
export function calcTrialEndFallback(signupDate) {
  const days = getTrialDaysForSignup(signupDate);
  return new Date(signupDate.getTime() + days * 24 * 60 * 60 * 1000);
}
