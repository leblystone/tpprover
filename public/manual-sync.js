// Manual Subscription Sync Tool
// Paste this in browser console to manually sync subscription from Stripe

window.manualSyncSubscription = async function() {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions();
  
  const email = prompt('Enter your email address:');
  if (!email) {
    console.log('❌ Email required');
    return;
  }
  
  console.log('🔄 Syncing subscription from Stripe for:', email);
  
  try {
    const syncFunction = httpsCallable(functions, 'manualSyncSubscription');
    const result = await syncFunction({ email });
    
    console.log('✅ Sync complete!');
    console.log('Result:', result.data);
    console.log('💡 Refresh the page to see updated subscription');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
};

console.log('💡 Manual sync tool loaded!');
console.log('   Run: manualSyncSubscription()');

