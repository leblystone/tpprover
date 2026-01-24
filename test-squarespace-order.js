/**
 * Quick test script for manual Squarespace order processing
 * Run: node test-squarespace-order.js
 */

const { initializeApp } = require('firebase-admin/app');
const { getFunctions, httpsCallable } = require('firebase-functions');

// Initialize Firebase Admin (if not already initialized)
if (!require('firebase-admin').apps.length) {
  const serviceAccount = require('./serviceAccountKey.json'); // You'll need this file
  initializeApp({
    credential: require('firebase-admin').credential.cert(serviceAccount)
  });
}

async function testOrder() {
  const orderId = '6965d3c8c4bf0860f73d9e3e';
  
  console.log('🧪 Testing Squarespace order processing...');
  console.log('📦 Order ID:', orderId);
  console.log('');
  
  try {
    // Note: This requires Firebase Functions emulator or calling via HTTP
    // For easier testing, use Firebase Console or create a simple HTTP call
    
    console.log('⚠️  For easier testing, use one of these methods:');
    console.log('');
    console.log('1. Firebase Console:');
    console.log('   - Go to Functions → manualProcessSquarespaceOrder → Test');
    console.log('   - Enter: {"data": {"orderId": "6965d3c8c4bf0860f73d9e3e"}}');
    console.log('');
    console.log('2. Or use curl:');
    console.log('   curl -X POST https://us-central1-tpp-splendide.cloudfunctions.net/manualProcessSquarespaceOrder \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"data": {"orderId": "6965d3c8c4bf0860f73d9e3e"}}\'');
    console.log('');
    console.log('3. Or test from your app admin panel (if you add a button)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOrder();
