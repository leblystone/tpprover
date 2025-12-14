// Quick script to check alex91mald@gmail.com in Firestore
// Run: node check-user.js

const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUser() {
  try {
    const email = 'alex91mald@gmail.com';
    
    // Find user
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (usersSnap.empty) {
      console.log('User not found');
      return;
    }
    
    const userId = usersSnap.docs[0].id;
    console.log('\n🔍 USER ID:', userId);
    
    // Check users collection
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    console.log('\n📋 USERS COLLECTION:');
    console.log('Status:', userData.subscription?.status);
    console.log('End Date:', userData.subscription?.currentPeriodEnd);
    console.log('Trial Expired Flag:', userData.trialExpired);
    
    // Check userSubscriptions collection  
    const subDoc = await db.collection('userSubscriptions').doc(userId).get();
    if (subDoc.exists()) {
      const subData = subDoc.data();
      console.log('\n📋 USERSUBSCRIPTIONS COLLECTION:');
      console.log('Status:', subData.subscription?.status);
      console.log('End Date:', subData.subscription?.currentPeriodEnd);
      console.log('Last Extension:', subData.trialExtensionHistory?.[subData.trialExtensionHistory.length - 1]);
    }
    
    console.log('\n✅ Done\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();

