/**
 * Tracks how many times a Simple-mode user taps "More options" across modals.
 * After NUDGE_THRESHOLD clicks, fires tpp:upgrade-nudge so ModeNudgeToast can
 * suggest switching to Advanced mode.
 *
 * The counter resets after successfully firing the nudge so the user can get
 * re-nudged if they keep using it but haven't switched yet.
 */

const STORAGE_KEY = 'tpp_more_options_clicks';
const NUDGE_THRESHOLD = 3;

export function trackMoreOptionsClick() {
  try {
    const count = (parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(STORAGE_KEY, String(count));

    if (count >= NUDGE_THRESHOLD) {
      localStorage.setItem(STORAGE_KEY, '0'); // reset so it can nudge again later
      window.dispatchEvent(
        new CustomEvent('tpp:upgrade-nudge', {
          detail: {
            type: 'usage',
            featureLabel: 'More options in modals',
            path: '/app/settings/preferences',
          },
        })
      );
    }
  } catch {
    // silently ignore localStorage errors
  }
}

export function resetMoreOptionsCount() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
