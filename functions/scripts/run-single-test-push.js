/**
 * Wrapper: build temp ADC from Firebase CLI login, send one test push, cleanup.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

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
    return {
      clientId:
        '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      clientSecret: 'FAKESECRET_a3b4c5d6e7f8g9h0i1j2',
    };
  }
}

const { clientId, clientSecret } = loadFirebaseCliOAuth();
const toolsPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(toolsPath)) {
  console.error('Firebase CLI credentials not found — run `firebase login` first.');
  process.exit(1);
}

const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
const refreshToken = tools?.tokens?.refresh_token;
if (!refreshToken) {
  console.error('No refresh_token — run `firebase login` first.');
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpp-adc-'));
const adcPath = path.join(tmpDir, 'application_default_credentials.json');
fs.writeFileSync(
  adcPath,
  JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    type: 'authorized_user',
  }),
  { mode: 0o600 }
);

console.log(`Using Firebase CLI login as ADC (${tools?.user?.email || 'unknown'})`);

const targetScript = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'send-single-test-push.js');

const result = spawnSync(process.execPath, [targetScript], {
  cwd: path.join(__dirname, '..'),
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
  // ignore
}

process.exit(result.status == null ? 1 : result.status);
