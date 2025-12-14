/**
 * Debug script to check a user's trial status in Firestore
 * Run this to see what's actually stored in the database
 */

const admin = require('firebase-admin');

// Initialize if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkUserTrialStatus(userEmail) {
  try {
    console.log(`\n🔍 Checking trial status for: ${userEmail}\n`);
    
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`❌ User not found with email: ${userEmail}`);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log(`✅ Found user: ${userId}`);
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Name: ${userData.displayName || userData.name || 'N/A'}\n`);
    
    // Check users collection subscription
    console.log('📋 USERS COLLECTION SUBSCRIPTION:');
    if (userData.subscription) {
      console.log(`   Status: ${userData.subscription.status}`);
      console.log(`   Plan: ${userData.subscription.plan}`);
      console.log(`   Interval: ${userData.subscription.interval}`);
      console.log(`   Current Period End: ${userData.subscription.currentPeriodEnd}`);
      console.log(`   Admin Extended: ${userData.subscription.adminExtended}`);
      console.log(`   Canceled At: ${userData.subscription.canceled_at || 'N/A'}`);
      console.log(`   Cancel At Period End: ${userData.subscription.cancel_at_period_end || false}`);
    } else {
      console.log('   ❌ No subscription object found');
    }
    
    if (userData.trialEndDate) {
      const endDate = userData.trialEndDate.toDate ? userData.trialEndDate.toDate() : new Date(userData.trialEndDate);
      console.log(`   Trial End Date: ${endDate.toISOString()}`);
      console.log(`   Is Expired: ${endDate < new Date()}`);
    }
    
    if (userData.trialExpired !== undefined) {
      console.log(`   Trial Expired Flag: ${userData.trialExpired}`);
    }
    
    // Check userSubscriptions collection
    console.log('\n📋 USERSUBSCRIPTIONS COLLECTION:');
    const subscriptionDoc = await db.collection('userSubscriptions').doc(userId).get();
    if (subscriptionDoc.exists()) {
      const subData = subscriptionDoc.data();
      if (subData.subscription) {
        console.log(`   Status: ${subData.subscription.status}`);
        console.log(`   Plan: ${subData.subscription.plan}`);
        console.log(`   Interval: ${subData.subscription.interval}`);
        console.log(`   Current Period End: ${subData.subscription.currentPeriodEnd}`);
        console.log(`   Admin Extended: ${subData.subscription.adminExtended}`);
        console.log(`   Canceled At: ${subData.subscription.canceled_at || 'N/A'}`);
        console.log(`   Cancel At Period End: ${subData.subscription.cancel_at_period_end || false}`);
      } else {
        console.log('   ❌ No subscription object found');
      }
      
      // Check extension history
      if (subData.trialExtensionHistory && subData.trialExtensionHistory.length > 0) {
        console.log(`\n📜 EXTENSION HISTORY (${subData.trialExtensionHistory.length} entries):`);
        subData.trialExtensionHistory.slice(-3).forEach((ext, i) => {
          console.log(`   ${i + 1}. Extended by ${ext.addedDays} days on ${ext.extendedAt}`);
          console.log(`      New End: ${ext.newEnd}`);
          console.log(`      Note: ${ext.note || 'None'}`);
        });
      }
    } else {
      console.log('   ❌ Document does not exist');
    }
    
    // Check lifetime access collection
    console.log('\n📋 LIFETIME ACCESS COLLECTION:');
    const lifetimeDoc = await db.collection('lifetimeAccess').doc(userId).get();
    if (lifetimeDoc.exists()) {
      const lifetimeData = lifetimeDoc.data();
      console.log(`   Has Lifetime Access: ${lifetimeData.hasLifetimeAccess}`);
      console.log(`   Granted At: ${lifetimeData.grantedAt}`);
      console.log(`   Reason: ${lifetimeData.reason || lifetimeData.lifetimeReason || 'N/A'}`);
    } else {
      console.log('   ❌ No lifetime access document');
    }
    
    console.log('\n✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking user status:', error);
  }
}

// Export for use in Cloud Functions
module.exports = { checkUserTrialStatus };

// Allow running directly from command line
if (require.main === module) {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.log('Usage: node checkUserTrialStatus.js <user-email>');
    process.exit(1);
  }
  checkUserTrialStatus(userEmail).then(() => process.exit(0));
}

