/**
 * Wrapper: build a temporary ADC file from the Firebase CLI refresh token,
 * then run the stale-userData audit. Deletes the temp file on exit.
 *
 * Usage: node functions/scripts/run-audit-with-firebase-login.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Public Firebase CLI OAuth client — read from the installed firebase-tools so
// we always match whatever secret the current CLI version ships with.
function loadFirebaseCliOAuth() {
  try {
    const api = require(
      path.join(
        process.env.APPDATA || '',
        'npm',
        'node_modules',
        'firebase-tools',
        'lib',
        'api'
      )
    );
    return { clientId: api.clientId(), clientSecret: api.clientSecret() };
  } catch {
    // Fallback to current firebase-tools defaults (update if CLI bumps these)
    return {
      clientId:
        '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      clientSecret: 'FAKESECRET_a3b4c5d6e7f8g9h0i1j2',
    };
  }
}
const { clientId: FIREBASE_CLI_CLIENT_ID, clientSecret: FIREBASE_CLI_CLIENT_SECRET } =
  loadFirebaseCliOAuth();

const toolsPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(toolsPath)) {
  console.error('Firebase CLI credentials not found at', toolsPath);
  process.exit(1);
}

const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
const refreshToken = tools?.tokens?.refresh_token;
if (!refreshToken) {
  console.error('No refresh_token in firebase-tools.json — run `firebase login` first.');
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpp-adc-'));
const adcPath = path.join(tmpDir, 'application_default_credentials.json');
fs.writeFileSync(
  adcPath,
  JSON.stringify({
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: refreshToken,
    type: 'authorized_user',
  }),
  { mode: 0o600 }
);

const auditScript = path.join(__dirname, 'auditStaleUserData.js');
console.log(`Using Firebase CLI login as ADC (${tools?.user?.email || 'unknown'})`);

const result = spawnSync(process.execPath, [auditScript], {
  cwd: path.join(__dirname, '..', '..'),
  env: {
    ...process.env,
    GOOGLE_APPLICATION_CREDENTIALS: adcPath,
    GCLOUD_PROJECT: 'tpp-splendide',
    GOOGLE_CLOUD_PROJECT: 'tpp-splendide',
  },
  stdio: 'inherit',
});

try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch {
  // ignore cleanup errors
}

process.exit(result.status == null ? 1 : result.status);
