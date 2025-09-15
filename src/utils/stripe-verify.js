// Stripe Configuration Verification Utility
// Run this in browser console to check your Stripe setup

export function verifyStripeConfig() {
  console.log('🔍 Verifying Stripe Configuration...\n');
  
  // Check environment variables
  const config = {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    monthlyPriceId: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID,
    lifetimePriceId: import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID
  };
  
  let allGood = true;
  
  // Verify publishable key
  if (!config.publishableKey) {
    console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY is missing');
    allGood = false;
  } else if (!config.publishableKey.startsWith('pk_')) {
    console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY should start with pk_');
    allGood = false;
  } else {
    const mode = config.publishableKey.includes('test') ? 'TEST' : 'LIVE';
    console.log(`✅ Publishable Key: ${config.publishableKey.substring(0, 20)}... (${mode} mode)`);
  }
  
  // Verify price IDs
  const priceChecks = [
    { name: 'Monthly', key: 'monthlyPriceId', value: config.monthlyPriceId },
    { name: 'Annual', key: 'annualPriceId', value: config.annualPriceId },
    { name: 'Lifetime', key: 'lifetimePriceId', value: config.lifetimePriceId }
  ];
  
  priceChecks.forEach(check => {
    if (!check.value) {
      console.error(`❌ VITE_STRIPE_${check.key.toUpperCase()} is missing`);
      allGood = false;
    } else if (!check.value.startsWith('price_')) {
      console.error(`❌ ${check.name} Price ID should start with price_`);
      allGood = false;
    } else {
      console.log(`✅ ${check.name} Price: ${check.value}`);
    }
  });
  
  // Overall status
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('🎉 All Stripe configuration looks good!');
    console.log('💡 Next steps:');
    console.log('   1. Verify products exist in Stripe Dashboard');
    console.log('   2. Test subscription flow');
    console.log('   3. Deploy backend endpoints');
  } else {
    console.log('⚠️  Stripe configuration has issues. Please fix the errors above.');
  }
  console.log('='.repeat(50));
  
  return { config, allGood };
}

// Auto-run verification when imported
if (typeof window !== 'undefined') {
  // Make available globally for console testing
  window.verifyStripeConfig = verifyStripeConfig;
}
