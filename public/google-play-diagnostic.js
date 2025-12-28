// Google Play Subscription Re-Sync Tool
// Use this to re-verify your Google Play subscription

window.resyncGooglePlaySubscription = async function() {
  console.log('🔄 Re-syncing Google Play subscription...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    
    // Get purchase data from local storage (if available)
    const purchaseToken = prompt('Enter your Google Play purchase token (or leave blank to check stored data):');
    
    if (!purchaseToken) {
      // Try to find it in localStorage
      console.log('🔍 Checking for stored purchase data...');
      
      // Check what's in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('purchase') || key.includes('subscription') || key.includes('google')) {
          console.log(`Found key: ${key}`);
          console.log(`Value:`, localStorage.getItem(key));
        }
      }
      
      console.log('\n💡 If you don\'t have the purchase token, you can:');
      console.log('   1. Make a new test purchase on Android');
      console.log('   2. Check Google Play Console for the order');
      console.log('   3. Contact support with your email');
      return;
    }
    
    // Ask for product ID
    const productId = prompt('Enter product ID (e.g., com.thepepplanner.app.monthly):', 'com.thepepplanner.app.monthly');
    
    // Call verify function
    console.log('📞 Calling verifyGooglePlayPurchase...');
    const verifyFunction = httpsCallable(functions, 'verifyGooglePlayPurchase');
    
    const result = await verifyFunction({
      purchaseToken,
      products: [productId],
      packageName: 'com.thepepplanner.app'
    });
    
    console.log('✅ Re-sync complete!');
    console.log('Result:', result.data);
    
    if (result.data?.success) {
      console.log('\n✅ Subscription synced successfully!');
      console.log('📊 Subscription data:', result.data.subscription);
      console.log('\n💡 Refresh the page to see your subscription');
      
      // Auto-refresh after 2 seconds
      setTimeout(() => {
        console.log('🔄 Refreshing page...');
        window.location.reload();
      }, 2000);
    } else {
      console.error('❌ Sync failed:', result.data);
    }
    
  } catch (error) {
    console.error('❌ Error during re-sync:', error);
    console.log('\n🔍 Error details:', error.message);
    
    if (error.message?.includes('unauthenticated')) {
      console.log('💡 Make sure you\'re logged in');
    } else if (error.message?.includes('SERVICE_ACCOUNT_KEY')) {
      console.log('💡 Google Play API is not configured on the backend');
    }
  }
};

// Also create a function to check current Firestore subscription
window.checkFirestoreSubscription = async function() {
  console.log('🔍 Checking Firestore subscription data...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./src/config/firebase.js');
    const { getAuth } = await import('firebase/auth');
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ Not logged in');
      return;
    }
    
    console.log('👤 User ID:', user.uid);
    console.log('📧 Email:', user.email);
    
    // Check userSubscriptions
    console.log('\n📦 Checking userSubscriptions collection...');
    const subRef = doc(db, 'userSubscriptions', user.uid);
    const subSnap = await getDoc(subRef);
    
    if (subSnap.exists()) {
      const data = subSnap.data();
      console.log('✅ Found subscription data:');
      console.log(JSON.stringify(data, null, 2));
      
      const sub = data.subscription;
      if (sub) {
        console.log('\n📊 Subscription Details:');
        console.log('   Status:', sub.status);
        console.log('   Plan:', sub.plan);
        console.log('   Interval:', sub.interval);
        console.log('   Payment Provider:', sub.paymentProvider);
        console.log('   Current Period End:', sub.currentPeriodEnd);
        console.log('   Google Play Product ID:', sub.googlePlayProductId);
        console.log('   Google Play Token:', sub.googlePlayPurchaseToken ? '✅ Present' : '❌ Missing');
      }
    } else {
      console.log('❌ No subscription data found in userSubscriptions');
      console.log('💡 The subscription may not have been synced from Google Play yet');
    }
    
    // Check users collection
    console.log('\n📦 Checking users collection...');
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.subscription) {
        console.log('✅ Found subscription in users collection');
        console.log(JSON.stringify(userData.subscription, null, 2));
      } else {
        console.log('⚠️ No subscription field in users collection');
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

console.log('🛠️ Google Play Diagnostic Tools Loaded!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📱 Commands available:');
console.log('   1. checkFirestoreSubscription() - Check what\'s currently stored');
console.log('   2. resyncGooglePlaySubscription() - Re-sync from Google Play');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n💡 Start with: checkFirestoreSubscription()');

