/**
 * ONE-TIME CLEANUP SCRIPT
 * Deletes fake winBack emailHistory records from Feb 23, 2026
 * and reverses the subscription changes on those users.
 *
 * Run from the functions/ folder:
 *   node cleanupWinBack.js
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key,
 * OR run via: firebase functions:shell  (which auto-applies credentials)
 * OR just: npx firebase-admin  if you have gcloud auth configured.
 *
 * Easiest: set GOOGLE_APPLICATION_CREDENTIALS before running, e.g.:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccountKey.json"
 *   node cleanupWinBack.js
 */

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'tpp-splendide',
});

const db = admin.firestore();

async function cleanupWinBackRecords() {
  console.log('🔍 Querying winBack emailHistory records from Feb 23, 2026...');

  // Query only on type (no composite index needed), filter date in JS
  const snap = await db.collection('emailHistory')
    .where('type', '==', 'winBack')
    .get();

  // Feb 23, 2026 — full day window (UTC-7 covers the local day)
  const startOfDay = new Date('2026-02-23T00:00:00-07:00');
  const endOfDay   = new Date('2026-02-24T00:00:00-07:00');

  // Filter to only Feb 23 records in JS
  const todayDocs = snap.docs.filter(doc => {
    const data = doc.data();
    if (!data.sentAt) return false;
    const sentAt = data.sentAt.toDate ? data.sentAt.toDate() : new Date(data.sentAt);
    return sentAt >= startOfDay && sentAt < endOfDay;
  });

  if (todayDocs.length === 0) {
    console.log('✅ No winBack records found for Feb 23. Nothing to clean up!');
    process.exit(0);
  }

  console.log(`📋 Found ${todayDocs.length} winBack records from Feb 23 to clean up.`);

  const userIds = new Set();
  const deletePromises = [];

  for (const doc of todayDocs) {
    const data = doc.data();
    console.log(`  ❌ Deleting emailHistory/${doc.id} — ${data.recipientEmail}`);
    deletePromises.push(doc.ref.delete());
    if (data.userId) userIds.add(data.userId);
  }

  // Delete all emailHistory records
  await Promise.all(deletePromises);
  console.log(`\n✅ Deleted ${todayDocs.length} emailHistory records.`);

  // Reverse subscription changes for affected users
  console.log(`\n🔄 Reversing subscription changes for ${userIds.size} users...`);

  const subscriptionResets = [];
  for (const userId of userIds) {
    // Remove winBackTrialGranted flag and revert status to 'expired'
    subscriptionResets.push(
      db.collection('users').doc(userId).set({
        subscription: {
          status: 'expired',
          winBackTrialGranted: admin.firestore.FieldValue.delete(),
          winBackTrialGrantedAt: admin.firestore.FieldValue.delete(),
          currentPeriodEnd: admin.firestore.FieldValue.delete(),
        }
      }, { merge: true })
      .then(() => console.log(`  ✅ Reset users/${userId}`))
      .catch(err => console.error(`  ⚠️ Failed users/${userId}: ${err.message}`))
    );

    subscriptionResets.push(
      db.collection('userSubscriptions').doc(userId).set({
        subscription: {
          status: 'expired',
          winBackTrialGranted: admin.firestore.FieldValue.delete(),
          winBackTrialGrantedAt: admin.firestore.FieldValue.delete(),
          currentPeriodEnd: admin.firestore.FieldValue.delete(),
        }
      }, { merge: true })
      .then(() => console.log(`  ✅ Reset userSubscriptions/${userId}`))
      .catch(err => console.error(`  ⚠️ Failed userSubscriptions/${userId}: ${err.message}`))
    );
  }

  await Promise.all(subscriptionResets);

  console.log('\n🎉 Cleanup complete!');
  console.log('   — emailHistory records deleted: ' + todayDocs.length);
  console.log('   — Users reset: ' + userIds.size);
  console.log('\nYou can now re-run the win-back campaign and emails will go to these users again.');
  process.exit(0);
}

cleanupWinBack().catch(err => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});

// Alias
function cleanupWinBack() { return cleanupWinBackRecords(); }
