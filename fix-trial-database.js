/**
 * Script to fix trial subscription start date in Firestore
 * Run this in browser console while logged in
 */

console.log('🔧 TRIAL DATABASE FIX SCRIPT');

async function fixTrialSubscription() {
  try {
    // Get current user
    const user = firebase?.auth()?.currentUser;
    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }
    
    console.log('👤 Fixing trial for user:', user.uid);
    
    // Import cloud storage functions
    const { saveUserSubscription } = await import('./src/services/cloudStorage.js');
    
    // Create corrected trial subscription
    const signupDate = new Date('2025-10-24T14:46:44.732Z'); // Your actual signup date from userState
    const trialEndDate = new Date(signupDate);
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days from signup
    
    const correctedTrial = {
      id: '1761572935604', // Keep same ID
      plan: '7-Day Free Trial',
      price: 0,
      interval: 'trial',
      currency: 'USD',
      status: 'trialing',
      startedAt: signupDate.toISOString(), // CORRECT: Your actual signup date
      currentPeriodEnd: trialEndDate.toISOString(), // CORRECT: 7 days from signup
      paymentMethod: null,
    };
    
    console.log('🔧 Corrected trial subscription:', correctedTrial);
    
    // Calculate what days remaining should be
    const now = new Date();
    const timeLeft = trialEndDate - now;
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    
    console.log('📊 Expected results after fix:', {
      startDate: signupDate.toLocaleDateString(),
      endDate: trialEndDate.toLocaleDateString(),
      daysRemaining: daysLeft,
      hoursRemaining: Math.floor(timeLeft / (1000 * 60 * 60))
    });
    
    // Save to Firestore
    console.log('💾 Saving corrected trial to Firestore...');
    const result = await saveUserSubscription(user.uid, correctedTrial);
    
    if (result) {
      console.log('✅ Trial subscription corrected in database!');
      console.log('🔄 Refreshing page to apply changes...');
      window.location.reload();
    } else {
      console.error('❌ Failed to save corrected trial');
    }
    
  } catch (error) {
    console.error('❌ Error fixing trial subscription:', error);
  }
}

// Make function available globally
window.fixTrialSubscription = fixTrialSubscription;

console.log('✅ Fix function ready. Run: fixTrialSubscription()');
