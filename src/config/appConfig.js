// App Configuration - Environment Variables
// This file contains the actual environment variables for mobile builds
// where import.meta.env might not work properly

export const APP_CONFIG = {
  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51RsjDx50b3cktl9XDlsC1BaeJr431KvkmtiKeCfSkvGcSTbzmCYvVbQcbE1R7Vku394xTuV8m9L1BD79lGg2XTeP004cs4mnJu',
  STRIPE_MONTHLY_PRICE_ID: 'price_1SSh7y50b3cktl9XXn8toTeS', // $3.99/month (founder grandfathered)
  STRIPE_ANNUAL_PRICE_ID: 'price_1Sbug350b3cktl9XNM6gpjge', // Annual (founder grandfathered)
  STRIPE_LIFETIME_PRICE_ID: 'price_1SUALt50b3cktl9X7nAOQdQR', // $99.99 one-time (founder grandfathered)
  // Research+ pricing (new signups)
  STRIPE_RP_MONTHLY_PRICE_ID: 'price_1TS5C550b3cktl9XUg2Uvg5d', // $4.99/month
  STRIPE_RP_ANNUAL_PRICE_ID: 'price_1TS5D250b3cktl9XYpr3bhT2', // $39.99/year
  STRIPE_RP_LIFETIME_PRICE_ID: 'price_1TS5DS50b3cktl9Xb3gNyL2d', // $99.99 one-time
  // Shop (physical/digital planners) — separate Stripe account
  STRIPE_SHOP_PUBLISHABLE_KEY:
    'pk_live_51TXTdp9Zv4lzK1k8dEdtOFQlCYdN603U0bw8SlQCf7uMRUj2AVFrCvpa9vEny2OH7dVcaJvpE9WKtDsk5HZ9G82s00P45o5rfG',

  // Firebase Configuration - Updated to match tpp-splendide project
  FIREBASE_API_KEY: 'AIzaSyDzGVtlnIk0QzUSgK6o41KGpYKk6opdgcE',
  FIREBASE_AUTH_DOMAIN: 'tpp-splendide.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'tpp-splendide',
  FIREBASE_STORAGE_BUCKET: 'tpp-splendide.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '97564473391',
  FIREBASE_APP_ID: '1:97564473391:web:71f235c49040e559aa6eda',
  FIREBASE_MEASUREMENT_ID: 'G-536N3PJ9EC',
  FIREBASE_VAPID_KEY: '', // TODO: Paste your VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
  
  // Squarespace Configuration
  SQUARESPACE_SITE_URL: 'https://www.thepepplanner.com',

  // Google Play Research+ product IDs
  GOOGLE_PLAY_RP_MONTHLY_PRODUCT_ID: 'com.thepepplanner.app.researchmonthly',
  GOOGLE_PLAY_RP_ANNUAL_PRODUCT_ID: 'm.thepepplanner.app.researchannual',
  GOOGLE_PLAY_RP_LIFETIME_PRODUCT_ID: 'com.thepepplanner.app.researchlifetime',

  // Share Incentive Verification
  SHARE_VERIFY_URL: 'https://us-central1-tpp-splendide.cloudfunctions.net/verifyShareScreenshot',
};

// APP_CONFIG is canonical for Firebase (tpp-splendide). .env may still point at an old project.
export function getEnvVar(key) {
  const configKey = key.replace('VITE_', '');
  const fromConfig = APP_CONFIG[configKey];
  if (fromConfig != null && fromConfig !== '') return fromConfig;

  const fromVite = import.meta.env?.[key];
  if (fromVite != null && fromVite !== '') return fromVite;

  return undefined;
}
