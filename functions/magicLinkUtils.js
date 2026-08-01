/**
 * Magic-link helpers for passwordless email sign-in.
 *
 * Firebase generateSignInWithEmailLink() returns a URL on the Auth domain
 * (*.firebaseapp.com). Email clients open that in a browser, so the native
 * app never receives the link. We rewrite it onto our Universal/App Link
 * domain so the OS can open The Pep Planner directly.
 */

const APP_MAGIC_LINK_ORIGIN = 'https://thepepplanner.app';
const APP_MAGIC_LINK_PATH = '/magic-link';

const ACTION_CODE_SETTINGS = {
  url: `${APP_MAGIC_LINK_ORIGIN}${APP_MAGIC_LINK_PATH}`,
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.thepepplanner.app',
  },
  android: {
    packageName: 'com.thepepplanner.app',
    installApp: true,
  },
};

/**
 * @returns {import('firebase-admin/auth').ActionCodeSettings}
 */
function getMagicLinkActionCodeSettings() {
  return { ...ACTION_CODE_SETTINGS, iOS: { ...ACTION_CODE_SETTINGS.iOS }, android: { ...ACTION_CODE_SETTINGS.android } };
}

/**
 * Convert a Firebase auth/action sign-in URL into an https Universal Link
 * on thepepplanner.app that still carries oobCode/mode/apiKey.
 *
 * @param {string} firebaseSignInLink
 * @returns {string}
 */
function toUniversalMagicLink(firebaseSignInLink) {
  if (!firebaseSignInLink || typeof firebaseSignInLink !== 'string') {
    return firebaseSignInLink;
  }

  let src;
  try {
    src = new URL(firebaseSignInLink);
  } catch {
    return firebaseSignInLink;
  }

  let oobCode = src.searchParams.get('oobCode');
  let mode = src.searchParams.get('mode');
  let apiKey = src.searchParams.get('apiKey');
  let lang = src.searchParams.get('lang');

  const nested = src.searchParams.get('link');
  if ((!oobCode || !mode) && nested) {
    try {
      const nestedUrl = new URL(nested);
      oobCode = oobCode || nestedUrl.searchParams.get('oobCode');
      mode = mode || nestedUrl.searchParams.get('mode');
      apiKey = apiKey || nestedUrl.searchParams.get('apiKey');
      lang = lang || nestedUrl.searchParams.get('lang');
    } catch {
      // keep top-level values
    }
  }

  if (!oobCode || mode !== 'signIn') {
    return firebaseSignInLink;
  }

  const dest = new URL(`${APP_MAGIC_LINK_ORIGIN}${APP_MAGIC_LINK_PATH}`);
  dest.searchParams.set('oobCode', oobCode);
  dest.searchParams.set('mode', mode);
  if (apiKey) dest.searchParams.set('apiKey', apiKey);
  if (lang) dest.searchParams.set('lang', lang);
  return dest.toString();
}

module.exports = {
  APP_MAGIC_LINK_ORIGIN,
  APP_MAGIC_LINK_PATH,
  getMagicLinkActionCodeSettings,
  toUniversalMagicLink,
};
