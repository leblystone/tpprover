/**
 * Subscription Data Diagnostic Tool
 * Run this in browser console to check subscription data
 */

// Add to window for easy access
window.checkSubscriptionData = async function() {
  const userId = 'qf8NSLncZyffYXZSlVIuK06KboH3'; // From your logs
  
  console.log('🔍 Checking subscription data for user:', userId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Import Firestore
  const { doc, getDoc, collection, getDocs, query, where } = await import('firebase/firestore');
  const { db } = await import('./src/config/firebase.js');
  
  try {
    // Check 1: userSubscriptions collection
    console.log('\n📦 Checking userSubscriptions collection...');
    const userSubRef = doc(db, 'userSubscriptions', userId);
    const userSubSnap = await getDoc(userSubRef);
    
    if (userSubSnap.exists()) {
      const data = userSubSnap.data();
      console.log('✅ Found in userSubscriptions:');
      console.log('   Full document:', data);
      console.log('   Subscription object:', data.subscription);
      console.log('   currentPeriodEnd:', data.subscription?.currentPeriodEnd);
      console.log('   interval:', data.subscription?.interval);
      console.log('   status:', data.subscription?.status);
      console.log('   paymentProvider:', data.subscription?.paymentProvider);
    } else {
      console.log('❌ No document in userSubscriptions collection');
    }
    
    // Check 2: users collection subscription field
    console.log('\n📦 Checking users collection...');
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.subscription) {
        console.log('✅ Found subscription in users collection:');
        console.log('   Subscription:', userData.subscription);
        console.log('   currentPeriodEnd:', userData.subscription?.currentPeriodEnd);
      } else {
        console.log('⚠️ User document exists but no subscription field');
      }
    } else {
      console.log('❌ No document in users collection');
    }
    
    // Check 3: lifetimeAccess collection
    console.log('\n📦 Checking lifetimeAccess collection...');
    const lifetimeRef = doc(db, 'lifetimeAccess', userId);
    const lifetimeSnap = await getDoc(lifetimeRef);
    
    if (lifetimeSnap.exists()) {
      console.log('✅ Found in lifetimeAccess:');
      console.log('   Data:', lifetimeSnap.data());
    } else {
      console.log('❌ No document in lifetimeAccess collection');
    }
    
    // Check 4: stripeCustomers collection
    console.log('\n📦 Checking stripeCustomers collection...');
    const stripeCustomersRef = collection(db, 'stripeCustomers');
    const q = query(stripeCustomersRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        console.log('✅ Found Stripe customer:');
        console.log('   Customer ID:', doc.id);
        console.log('   Data:', doc.data());
      });
    } else {
      console.log('❌ No Stripe customer found');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Diagnostic complete!');
    
  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
  }
};

console.log('💡 Diagnostic tool loaded!');
console.log('   Run: checkSubscriptionData()');


