/**
 * Trial Subscription Debug Script
 * Run in browser console to check current trial subscription state
 */

console.log('🔍 [TRIAL DEBUG SCRIPT] Starting comprehensive trial subscription check...');

// 1. Check localStorage subscription
console.log('\n📦 [LOCALSTORAGE CHECK]');
const localSub = localStorage.getItem('tpprover_subscription');
if (localSub) {
  try {
    const parsed = JSON.parse(localSub);
    console.log('✅ localStorage subscription found:', {
      id: parsed.id,
      status: parsed.status,
      interval: parsed.interval,
      startedAt: parsed.startedAt,
      currentPeriodEnd: parsed.currentPeriodEnd,
      daysRemaining: Math.ceil((new Date(parsed.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
    });
  } catch (e) {
    console.error('❌ Failed to parse localStorage subscription:', e);
  }
} else {
  console.log('❌ No subscription found in localStorage');
}

// 2. Check current user and session
console.log('\n👤 [USER SESSION CHECK]');
const currentUser = localStorage.getItem('tpprover_user');
const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
const authToken = localStorage.getItem('tpprover_auth_token');

console.log('Current user:', currentUser);
console.log('Last user email:', lastUserEmail);
console.log('Auth token:', authToken);

// 3. Check session flags that might interfere
console.log('\n🔒 [SESSION FLAGS CHECK]');
const signupInProgress = sessionStorage.getItem('tpp_signup_in_progress');
const loginInProgress = sessionStorage.getItem('tpp_login_in_progress');

console.log('Signup in progress:', signupInProgress);
console.log('Login in progress:', loginInProgress);

// 4. Check demo data flags
console.log('\n🎭 [DEMO DATA FLAGS]');
const hasSeeded = localStorage.getItem('tpprover_has_seeded');
const demoDataCleared = localStorage.getItem('tpprover_demo_data_cleared');
const demoSeededAt = localStorage.getItem('tpprover_demo_seeded_at');

console.log('Has seeded demo data:', hasSeeded);
console.log('Demo data cleared:', demoDataCleared);
console.log('Demo seeded at:', demoSeededAt);

// 5. Function to manually check cloud subscription (if available)
console.log('\n☁️ [CLOUD SUBSCRIPTION CHECK]');
if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
  console.log('Firebase user available - you can manually check cloud subscription');
  console.log('Run: checkCloudSubscription() to test cloud loading');
  
  window.checkCloudSubscription = async () => {
    try {
      const user = window.firebase.auth().currentUser;
      if (user) {
        console.log('🔍 Checking cloud subscription for user:', user.uid);
        // This would need to import the cloudStorage module
        console.log('Note: You\'ll need to import cloudStorage module to test this');
      }
    } catch (error) {
      console.error('❌ Failed to check cloud subscription:', error);
    }
  };
} else {
  console.log('❌ No Firebase user available');
}

// 6. Create recovery functions
console.log('\n🆘 [RECOVERY FUNCTIONS]');

window.debugTrialRecovery = () => {
  console.log('🔄 Attempting to recover trial subscription...');
  
  // Check if there's a backup
  const backup = localStorage.getItem('tpprover_data_backup');
  if (backup) {
    try {
      const backupData = JSON.parse(backup);
      if (backupData.tpprover_subscription) {
        localStorage.setItem('tpprover_subscription', JSON.stringify(backupData.tpprover_subscription));
        console.log('✅ Trial subscription recovered from backup');
        window.location.reload();
      }
    } catch (e) {
      console.error('❌ Failed to recover from backup:', e);
    }
  } else {
    console.log('❌ No backup data found');
  }
};

window.debugCreateTestTrial = () => {
  console.log('🧪 Creating test trial subscription...');
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  
  const testTrial = {
    id: 'debug_trial_' + Date.now(),
    plan: '7-Day Free Trial (Debug)',
    price: 0,
    interval: 'trial',
    currency: 'USD',
    status: 'trialing',
    startedAt: now.toISOString(),
    currentPeriodEnd: end.toISOString(),
    paymentMethod: null,
  };
  
  localStorage.setItem('tpprover_subscription', JSON.stringify(testTrial));
  console.log('✅ Test trial created:', testTrial);
  window.location.reload();
};

console.log('\n🎯 [DEBUG SCRIPT COMPLETE]');
console.log('Available functions:');
console.log('- debugTrialRecovery() - attempt to recover from backup');
console.log('- debugCreateTestTrial() - create a test trial subscription');
if (window.checkCloudSubscription) {
  console.log('- checkCloudSubscription() - check cloud subscription');
}

console.log('\n📋 Next steps:');
console.log('1. Check the debug output above');
console.log('2. Look for [TRIAL DEBUG] messages in console during app startup');
console.log('3. Note any account switching or data clearing messages');
console.log('4. Test trial persistence by restarting dev server');
