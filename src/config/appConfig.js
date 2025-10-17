// App Configuration - Environment Variables
// This file contains the actual environment variables for mobile builds
// where import.meta.env might not work properly

export const APP_CONFIG = {
  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: 'pk_test_51RsjE39js7CPqgp3rDbwa2wUhGSh4fqDcHD3SuQYAGpRjgF36YcnHAKLnPlBsSnIWG3FQDRxg29bOyuL6RYwq2w30081grdv60',
  STRIPE_MONTHLY_PRICE_ID: 'price_1RskKD50b3cktl9X0DQF4vaG',
  STRIPE_ANNUAL_PRICE_ID: 'price_1RskKk50b3cktl9XlHxY0iXW',
  STRIPE_LIFETIME_PRICE_ID: 'price_1RskLS50b3cktl9XrGWvkFid',
  
  // Firebase Configuration - Updated to match tpp-splendide project
  FIREBASE_API_KEY: 'AIzaSyDzGVtlnIk0QzUSgK6o41KGpYKk6opdgcE',
  FIREBASE_AUTH_DOMAIN: 'tpp-splendide.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'tpp-splendide',
  FIREBASE_STORAGE_BUCKET: 'tpp-splendide.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '97564473391',
  FIREBASE_APP_ID: '1:97564473391:web:71f235c49040e559aa6eda',
  FIREBASE_MEASUREMENT_ID: 'G-536N3PJ9EC'
};

// Fallback function to get environment variables
export function getEnvVar(key) {
  // Use hardcoded config for all builds
  const configKey = key.replace('VITE_', '');
  return APP_CONFIG[configKey];
}
