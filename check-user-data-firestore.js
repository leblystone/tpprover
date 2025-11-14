/**
 * Check user data in Firestore for UID: KROrMSV0EkfOlh75km8XwW1qUAS2
 * Run with: node check-user-data-firestore.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const userId = 'KROrMSV0EkfOlh75km8XwW1qUAS2';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUserData() {
  console.log(`\n🔍 Checking Firestore data for user: ${userId}\n`);
  
  try {
    // Check userData collection (unencrypted cloud storage)
    const userDataRef = doc(db, 'userData', userId);
    const userDataSnap = await getDoc(userDataRef);
    
    if (userDataSnap.exists()) {
      const data = userDataSnap.data();
      console.log('✅ Data found in Firestore (userData collection)');
      console.log('\n📊 Data summary:');
      console.log(`  Protocols: ${data.protocols?.length || 0}`);
      console.log(`  Orders: ${data.orders?.length || 0}`);
      console.log(`  Stockpile: ${data.stockpile?.length || 0}`);
      console.log(`  Vendors: ${data.vendors?.length || 0}`);
      console.log(`  Recon Items: ${data.reconItems?.length || 0}`);
      console.log(`  Supplements: ${data.supplements?.length || 0}`);
      console.log(`  Metrics: ${data.metrics?.length || 0}`);
      console.log(`  Scheduled Buys: ${data.scheduledBuys?.length || 0}`);
      console.log(`  Last updated: ${data.lastUpdated || 'unknown'}`);
      
      const hasRealData = (
        (data.protocols?.length > 0) ||
        (data.orders?.length > 0) ||
        (data.stockpile?.length > 0) ||
        (data.vendors?.length > 0)
      );
      
      if (!hasRealData) {
        console.log('\n⚠️  Firestore document exists but appears to be EMPTY');
        console.log('   This explains why the user sees blank data.');
        console.log('   The data was likely never synced to cloud.');
      } else {
        console.log('\n✅ User HAS data in Firestore - should be recoverable!');
        console.log('   The data exists in cloud, so it should appear on all devices.');
      }
    } else {
      console.log('❌ No data found in Firestore (userData collection)');
      console.log('   This means the data was never synced to cloud.');
      console.log('   Recovery depends on the snapshot in user\'s browser localStorage.');
    }
    
    // Check encrypted userdata collection (backup storage)
    const encryptedDataRef = doc(db, 'userdata', userId.toLowerCase());
    const encryptedDataSnap = await getDoc(encryptedDataRef);
    
    if (encryptedDataSnap.exists()) {
      console.log('\n✅ Data also found in encrypted collection (userdata)');
      console.log('   This is the encrypted backup storage.');
      console.log('   Note: This requires the user\'s password to decrypt.');
    } else {
      console.log('\n❌ No data in encrypted collection either');
    }
    
    console.log('\n📝 RECOMMENDATION:');
    console.log('   If Firestore is empty, the user needs to:');
    console.log('   1. Go to Settings → Data Management');
    console.log('   2. Click "Recover Data from Snapshot" button');
    console.log('   3. This will restore from their browser\'s recovery snapshot');
    console.log('   4. Then sync to cloud');
    
  } catch (error) {
    console.error('❌ Error checking user data:', error);
    console.error('   Make sure you have Firebase credentials in .env file');
  }
}

checkUserData().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

