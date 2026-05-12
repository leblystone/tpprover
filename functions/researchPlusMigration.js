/**
 * Research+ Wave — Founder Migration (one-off callable).
 *
 * Purpose:
 *   Stamp every existing paying user (sub created BEFORE the pricing
 *   cutoff) with `isFounder: true` and `tier: 'founder'` so they keep all
 *   future Research+ features for free, forever.
 *
 * How to run:
 *   - Admin only (verified via admin emails list or user doc role).
 *   - Call the `migrateFoundersToTier` callable from the admin panel or a
 *     one-shot invocation script. Supports `dryRun: true` to preview.
 *   - Safe to re-run; skips users already stamped.
 *
 * Audit:
 *   - Writes a summary doc to `admin/migrations/researchPlusWave/runs/{ts}`
 *     with counts, dry-run flag, and any errors.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

// Must match src/utils/subscriptionPlans.js FOUNDERS_CUTOFF_DATE.
const DEFAULT_PRICING_CUTOFF_ISO = '2026-05-05T00:00:00.000Z';

async function ensureAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const callerEmail = (request.auth.token && request.auth.token.email) || '';
  if (callerEmail && ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
    return;
  }
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const data = userDoc.exists ? userDoc.data() : {};
  const docEmail = (data.email || '').toLowerCase();
  if (ADMIN_EMAILS.includes(docEmail) || data.role === 'admin') {
    return;
  }
  throw new HttpsError('permission-denied', 'Admin access required');
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  // Firestore Admin SDK Timestamp — has toMillis() and toDate()
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  // Legacy shape: { _seconds, _nanoseconds } or { seconds, nanoseconds }
  if (value._seconds !== undefined) return value._seconds * 1000;
  if (value.seconds !== undefined) return value.seconds * 1000;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function shouldMarkAsFounder(subscriptionDoc, cutoffMillis) {
  if (!subscriptionDoc) return false;
  // Already stamped → skip.
  if (subscriptionDoc.isFounder === true || subscriptionDoc.tier === 'founder') {
    return 'already_stamped';
  }
  // Explicitly NOT a founder (manually set) → skip.
  if (subscriptionDoc.isFounder === false) return false;

  const createdAt = toMillis(
      subscriptionDoc.createdAt ||
      subscriptionDoc.startedAt ||
      subscriptionDoc.trialStartDate
  );
  if (!createdAt) {
    // No creation date → be conservative and treat as founder
    // (any existing doc must be legacy). The admin can manually
    // flip individual users if needed.
    return true;
  }
  return createdAt < cutoffMillis;
}

exports.migrateFoundersToTier = onCall({
  timeoutSeconds: 540,
  memory: '512MiB',
}, async (request) => {
  await ensureAdmin(request);

  const dryRun = request.data?.dryRun !== false; // default to dry-run for safety
  const cutoffIso = request.data?.cutoffIso || DEFAULT_PRICING_CUTOFF_ISO;
  const cutoffMillis = Date.parse(cutoffIso);

  if (Number.isNaN(cutoffMillis)) {
    throw new HttpsError('invalid-argument', `Invalid cutoffIso: ${cutoffIso}`);
  }

  const db = admin.firestore();
  const usersSnap = await db.collection('users').get();

  const summary = {
    scanned: 0,
    stampedFounder: 0,
    alreadyStamped: 0,
    skippedFreeOrMissing: 0,
    errors: [],
    dryRun,
    cutoffIso,
    startedAt: Date.now(),
  };

  const batch = [];
  const BATCH_SIZE = 400;

  for (const userDoc of usersSnap.docs) {
    summary.scanned++;
    try {
      const uid = userDoc.id;
      const userData = userDoc.data() || {};

      // Check user-level createdAt against cutoff
      const userCreatedMs = toMillis(
          userData.createdAt || userData.created_at ||
          userData.signupDate || userData.createdDate
      );

      // Also read userSubscriptions doc for the subscription map
      const userSubRef = db.collection('userSubscriptions').doc(uid);
      const userSubSnap = await userSubRef.get();
      const subData = userSubSnap.exists
        ? (userSubSnap.data().subscription || null)
        : (userData.subscription || null);

      // Already fully stamped — skip
      if (
        userData.isFounder === true &&
        subData?.tier === 'founder' &&
        subData?.isFounder === true
      ) {
        summary.alreadyStamped++;
        continue;
      }

      // Determine if this user qualifies
      // Use account createdAt OR subscription createdAt/startedAt — whichever is earlier
      const subCreatedMs = toMillis(
          subData?.createdAt || subData?.startedAt || subData?.trialStartDate
      );
      const effectiveCreatedMs = (userCreatedMs && subCreatedMs)
        ? Math.min(userCreatedMs, subCreatedMs)
        : (userCreatedMs || subCreatedMs || null);

      if (!effectiveCreatedMs) {
        // No date at all — be conservative: treat as founder (must be legacy)
        logger.warn(`migrateFoundersToTier: no createdAt for ${uid}, stamping as founder`);
      } else if (effectiveCreatedMs >= cutoffMillis) {
        summary.skippedFreeOrMissing++;
        continue;
      }

      // Skip if explicitly opted out
      if (subData?.isFounder === false) {
        summary.skippedFreeOrMissing++;
        continue;
      }

      summary.stampedFounder++;
      logger.info(`migrateFoundersToTier: stamping ${uid} (${userData.email || 'no email'})`);

      if (!dryRun) {
        const founderFields = {
          isFounder: true,
          tier: 'founder',
          founderStampedAt: admin.firestore.FieldValue.serverTimestamp(),
          founderMigrationVersion: 'research_plus_wave_v1',
        };

        const writeBatch = db.batch();

        // Stamp top-level user doc
        writeBatch.set(userDoc.ref, {
          isFounder: true,
          founderBackfilledAt: admin.firestore.FieldValue.serverTimestamp(),
          subscription: founderFields,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Stamp userSubscriptions doc
        writeBatch.set(userSubRef, {
          subscription: founderFields,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        batch.push(writeBatch);

        if (batch.length >= BATCH_SIZE) {
          await Promise.all(batch.map(b => b.commit()));
          batch.length = 0;
        }
      }
    } catch (err) {
      logger.error('migrateFoundersToTier: user failed', {uid: userDoc.id, err: err.message});
      summary.errors.push({uid: userDoc.id, message: err.message});
    }
  }

  if (!dryRun && batch.length > 0) {
    await Promise.all(batch.map(b => b.commit()));
  }

  summary.completedAt = Date.now();
  summary.durationMs = summary.completedAt - summary.startedAt;

  try {
    await db
        .collection('admin')
        .doc('migrations')
        .collection('researchPlusWave')
        .doc(`run_${summary.startedAt}`)
        .set(summary);
  } catch (auditErr) {
    logger.warn('Audit write failed', auditErr);
  }

  return summary;
});

/**
 * Stamp `isFoundingMember: true` on every user who existed before the
 * Research+ launch cutoff — regardless of whether they pay. Separate
 * from `migrateFoundersToTier` (which handles paid grandfathering);
 * this one is strictly about the "Founding Member" badge that appears
 * across the app and on future community posts.
 *
 * Safe to re-run; idempotent.
 */
exports.stampFoundingMembers = onCall({
  timeoutSeconds: 540,
  memory: '512MiB',
}, async (request) => {
  await ensureAdmin(request);

  const dryRun = request.data?.dryRun !== false;
  const cutoffIso = request.data?.cutoffIso || DEFAULT_PRICING_CUTOFF_ISO;
  const cutoffMillis = Date.parse(cutoffIso);

  if (Number.isNaN(cutoffMillis)) {
    throw new HttpsError('invalid-argument', `Invalid cutoffIso: ${cutoffIso}`);
  }

  const db = admin.firestore();
  const usersSnap = await db.collection('users').get();

  const summary = {
    scanned: 0,
    stampedFounding: 0,
    alreadyStamped: 0,
    skippedTooNew: 0,
    skippedNoCreatedAt: 0,
    errors: [],
    dryRun,
    cutoffIso,
    startedAt: Date.now(),
  };

  const batch = [];
  const BATCH_SIZE = 400;

  for (const userDoc of usersSnap.docs) {
    summary.scanned++;
    try {
      const data = userDoc.data() || {};

      if (data.isFoundingMember === true) {
        summary.alreadyStamped++;
        continue;
      }

      const createdMs = toMillis(
          data.createdAt ||
          data.created_at ||
          data.signupDate ||
          data.createdDate
      );

      if (!createdMs) {
        summary.skippedNoCreatedAt++;
        continue;
      }

      if (createdMs >= cutoffMillis) {
        summary.skippedTooNew++;
        continue;
      }

      summary.stampedFounding++;
      if (!dryRun) {
        batch.push({
          ref: userDoc.ref,
          data: {
            isFoundingMember: true,
            foundingMemberStampedAt: admin.firestore.FieldValue.serverTimestamp(),
            foundingMemberSince: new Date(createdMs).toISOString(),
          },
        });

        if (batch.length >= BATCH_SIZE) {
          const writeBatch = db.batch();
          batch.forEach(({ref, data}) => writeBatch.set(ref, data, {merge: true}));
          await writeBatch.commit();
          batch.length = 0;
        }
      }
    } catch (err) {
      logger.error('stampFoundingMembers: user failed', {uid: userDoc.id, err: err.message});
      summary.errors.push({uid: userDoc.id, message: err.message});
    }
  }

  if (!dryRun && batch.length > 0) {
    const writeBatch = db.batch();
    batch.forEach(({ref, data}) => writeBatch.set(ref, data, {merge: true}));
    await writeBatch.commit();
  }

  summary.completedAt = Date.now();
  summary.durationMs = summary.completedAt - summary.startedAt;

  try {
    await db
        .collection('admin')
        .doc('migrations')
        .collection('foundingMembers')
        .doc(`run_${summary.startedAt}`)
        .set(summary);
  } catch (auditErr) {
    logger.warn('Founding member audit write failed', auditErr);
  }

  return summary;
});
