/**
 * One-time migration: backfill founder tier for pre-cutoff accounts.
 *
 * Who gets updated:
 *   - Account created before May 5, 2026 (the Research+ launch / founder cutoff)
 *   - Not already stamped as a founder (isFounder !== true)
 *   - Subscription is expired, trialing, or missing (not an active paid sub)
 *
 * What gets written:
 *   - users/{uid}.isFounder = true
 *   - users/{uid}.subscription.tier = 'founder'
 *   - users/{uid}.subscription.isFounder = true
 *   - userSubscriptions/{uid}.subscription.tier = 'founder'
 *   - userSubscriptions/{uid}.subscription.isFounder = true
 *
 * Usage:
 *   Dry run (no writes):   node functions/scripts/backfillFounderTier.js
 *   Live run (writes):     node functions/scripts/backfillFounderTier.js --live
 */

const admin = require('firebase-admin');

// Uses application default credentials — works when already authenticated
// via `firebase login` or GOOGLE_APPLICATION_CREDENTIALS env var.
admin.initializeApp({
  projectId: 'tpp-splendide',
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const DRY_RUN = !process.argv.includes('--live');
const FOUNDERS_CUTOFF = new Date('2026-05-05T00:00:00.000Z');
const BATCH_SIZE = 400; // Firestore batch limit is 500; stay safe

// Statuses considered "not actively paid" — these accounts get the backfill
const NON_ACTIVE_STATUSES = new Set([
  'expired', 'trialing', 'canceled', 'refunded', 'disputed', 'revoked',
  'on_hold', 'paused', 'past_due', undefined, null, '',
]);

let stats = {
  total: 0,
  skippedAlreadyFounder: 0,
  skippedPostCutoff: 0,
  skippedActivePaid: 0,
  skippedNoCreatedAt: 0,
  updated: 0,
  errors: 0,
};

function getCreatedAt(userData) {
  const raw = userData.createdAt;
  if (!raw) return null;
  try {
    if (raw?.toDate) return raw.toDate();
    if (typeof raw === 'number') return new Date(raw);
    return new Date(raw);
  } catch {
    return null;
  }
}

function isPreCutoff(createdAt) {
  return createdAt instanceof Date &&
    !isNaN(createdAt.getTime()) &&
    createdAt.getTime() < FOUNDERS_CUTOFF.getTime();
}

async function processUser(userDoc, subDoc) {
  const uid = userDoc.id;
  const userData = userDoc.data();
  const subData = subDoc?.data()?.subscription || userData.subscription || null;

  stats.total++;

  // Skip already-stamped founders
  if (userData.isFounder === true) {
    stats.skippedAlreadyFounder++;
    return;
  }

  // Skip accounts with no createdAt
  const createdAt = getCreatedAt(userData);
  if (!createdAt) {
    stats.skippedNoCreatedAt++;
    console.warn(`  ⚠️  ${uid} — no createdAt, skipping`);
    return;
  }

  // Skip post-cutoff accounts
  if (!isPreCutoff(createdAt)) {
    stats.skippedPostCutoff++;
    return;
  }

  // Skip accounts with an active paid subscription (webhook fix handles future payments)
  const subStatus = subData?.status;
  if (
    subStatus === 'active' &&
    subData?.interval !== 'trial' &&
    !NON_ACTIVE_STATUSES.has(subData?.plan === '14-Day Research Trial' ? 'trialing' : null)
  ) {
    stats.skippedActivePaid++;
    console.log(`  💳  ${uid} (${userData.email}) — active paid, skipping`);
    return;
  }

  console.log(`  👑  ${uid} (${userData.email}) — created ${createdAt.toISOString().slice(0, 10)}, status: ${subStatus || 'none'} → stamping founder`);

  if (DRY_RUN) {
    stats.updated++;
    return;
  }

  try {
    const batch = db.batch();

    // Stamp isFounder on the top-level user doc
    batch.set(db.collection('users').doc(uid), {
      isFounder: true,
      founderBackfilledAt: FieldValue.serverTimestamp(),
      subscription: {
        tier: 'founder',
        isFounder: true,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Stamp on userSubscriptions doc if it exists
    if (subDoc?.exists) {
      batch.set(db.collection('userSubscriptions').doc(uid), {
        subscription: {
          tier: 'founder',
          isFounder: true,
        },
        lastUpdated: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    stats.updated++;
  } catch (err) {
    stats.errors++;
    console.error(`  ❌  ${uid} — ${err.message}`);
  }
}

async function run() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       Founder Tier Backfill Migration                ║');
  console.log(`║       Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)        ' : '🚀 LIVE (writing to Firestore) '} ║`);
  console.log(`║       Cutoff: ${FOUNDERS_CUTOFF.toISOString().slice(0, 10)}                        ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Fetch all users created before the cutoff
  const usersSnap = await db.collection('users')
    .where('createdAt', '<', FOUNDERS_CUTOFF)
    .get();

  // Pre-fetch all userSubscriptions in one go to avoid N reads in the loop
  const uids = usersSnap.docs.map(d => d.id);
  console.log(`Found ${uids.length} user(s) created before cutoff.\n`);

  // Fetch subscription docs in chunks of 30 (Firestore 'in' limit)
  const subMap = {};
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    const subSnap = await db.collection('userSubscriptions')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    subSnap.docs.forEach(d => { subMap[d.id] = d; });
  }

  // Process each user
  for (const userDoc of usersSnap.docs) {
    const subDoc = subMap[userDoc.id] || null;
    await processUser(userDoc, subDoc);
  }

  console.log('');
  console.log('══════════════════════════ RESULTS ══════════════════════════');
  console.log(`  Total scanned:          ${stats.total}`);
  console.log(`  Already founders:       ${stats.skippedAlreadyFounder}`);
  console.log(`  Post-cutoff (skipped):  ${stats.skippedPostCutoff}`);
  console.log(`  Active paid (skipped):  ${stats.skippedActivePaid}`);
  console.log(`  No createdAt (skipped): ${stats.skippedNoCreatedAt}`);
  console.log(`  ✅ Stamped as founder:  ${stats.updated}`);
  console.log(`  ❌ Errors:              ${stats.errors}`);
  console.log('');
  if (DRY_RUN) {
    console.log('  This was a DRY RUN — nothing was written.');
    console.log('  Re-run with --live to apply changes.\n');
  } else {
    console.log('  Migration complete. ✅\n');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
