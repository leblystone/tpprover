// Simple trial fix - paste this directly in browser console
console.log('🔧 SIMPLE TRIAL FIX STARTING...');

// Direct fix without imports
async function fixTrialNow() {
  try {
    // Get Firebase user
    const user = firebase?.auth()?.currentUser;
    if (!user) {
      console.error('❌ No Firebase user found');
      return;
    }
    
    console.log('👤 User ID:', user.uid);
    
    // Get Firestore instance
    const db = firebase.firestore();
    if (!db) {
      console.error('❌ Firestore not available');
      return;
    }
    
    // Your actual signup date from the logs
    const actualSignupDate = new Date('2025-10-24T14:46:44.732Z');
    const trialEndDate = new Date(actualSignupDate);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    const correctedTrial = {
      userId: user.uid,
      subscription: {
        id: '1761572935604',
        plan: '7-Day Free Trial',
        price: 0,
        interval: 'trial',
        currency: 'USD',
        status: 'trialing',
        startedAt: actualSignupDate.toISOString(),
        currentPeriodEnd: trialEndDate.toISOString(),
        paymentMethod: null,
      },
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };
    
    console.log('🔧 Corrected trial data:', correctedTrial.subscription);
    
    // Calculate expected days remaining
    const now = new Date();
    const timeLeft = trialEndDate - now;
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    
    console.log('📊 Expected results:', {
      signupDate: actualSignupDate.toLocaleDateString(),
      endDate: trialEndDate.toLocaleDateString(),
      daysRemaining: daysLeft,
      hoursRemaining: Math.floor(timeLeft / (1000 * 60 * 60))
    });
    
    // Write to Firestore directly
    console.log('💾 Writing to Firestore...');
    await db.collection('userSubscriptions').doc(user.uid).set(correctedTrial);
    
    console.log('✅ SUCCESS! Trial subscription corrected in database!');
    console.log('🔄 Reloading page in 2 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error fixing trial:', error);
  }
}

// Run automatically
fixTrialNow();
