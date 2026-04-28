// App Configuration - Environment Variables
// This file contains the actual environment variables for mobile builds
// where import.meta.env might not work properly

export const APP_CONFIG = {
  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51RsjDx50b3cktl9XDlsC1BaeJr431KvkmtiKeCfSkvGcSTbzmCYvVbQcbE1R7Vku394xTuV8m9L1BD79lGg2XTeP004cs4mnJu',
  STRIPE_MONTHLY_PRICE_ID: 'price_1SSh7y50b3cktl9XXn8toTeS', // $3.99/month
  STRIPE_ANNUAL_PRICE_ID: 'price_1Sbug350b3cktl9XNM6gpjge', // Annual subscription
  STRIPE_LIFETIME_PRICE_ID: 'price_1SUALt50b3cktl9X7nAOQdQR', // $99.99 one-time
  
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

  // Share Incentive Verification
  SHARE_VERIFY_URL: 'https://us-central1-tpp-splendide.cloudfunctions.net/verifyShareScreenshot',
};

// Fallback function to get environment variables
export function getEnvVar(key) {
  // Use hardcoded config for all builds
  const configKey = key.replace('VITE_', '');
  return APP_CONFIG[configKey];
}
