// Test helper to simulate expired trial status in browser console
// Usage: In browser console, run: window.testExpiredTrial()

console.log('🧪 Debug utilities loaded. Test expired trial with: window.testExpiredTrial()');

window.testExpiredTrial = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const expiredTrial = {
    id: `trial_${Date.now()}`,
    plan: '30-Day Research Trial',
    price: 0,
    interval: 'trial',
    currency: 'USD',
    status: 'trialing',  // Status is trialing but date has passed
    startedAt: new Date(now.getTime() - (31 * 24 * 60 * 60 * 1000)).toISOString(),
    currentPeriodEnd: yesterday.toISOString(),  // Expired yesterday
    paymentMethod: null,
    subscriptionId: `trial_${Date.now()}`
  };
  
  localStorage.setItem('tpprover_subscription', JSON.stringify(expiredTrial));
  console.log('⏰ Created expired trial:', expiredTrial);
  console.log('📊 Trial expired:', (now - new Date(expiredTrial.currentPeriodEnd)) / 1000 / 60 / 60, 'hours ago');
  console.log('🔄 Reload the page to see read-only mode');
  
  return expiredTrial;
};

window.checkCurrentStatus = () => {
  const sub = JSON.parse(localStorage.getItem('tpprover_subscription') || '{}');
  console.log('📊 Current subscription:', sub);
  
  if (sub.currentPeriodEnd) {
    const now = new Date();
    const end = new Date(sub.currentPeriodEnd);
    const timeLeft = end - now;
    const daysLeft = timeLeft / (1000 * 60 * 60 * 24);
    
    console.log('📅 Current period end:', sub.currentPeriodEnd);
    console.log('⏰ Time left:', daysLeft.toFixed(2), 'days');
    console.log(timeLeft > 0 ? '✅ Trial is ACTIVE' : '❌ Trial is EXPIRED');
  } else {
    console.log('⚠️ No currentPeriodEnd found');
  }
  
  return sub;
};








