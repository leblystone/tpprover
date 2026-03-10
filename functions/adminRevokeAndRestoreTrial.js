/**
 * adminRevokeAndRestoreTrial
 *
 * Admin-callable function to manually revoke lifetime access for a user and
 * restore their remaining trial days. Used when Stripe webhooks fail to deliver
 * (e.g. refund/cancellation not received), or for any manual admin correction.
 *
 * Logic:
 *  1. Look up the user's lifetimeAccess doc + users doc
 *  2. Calculate how many trial days they had remaining at time of purchase
 *     (from snapshot if available, else calculated from createdAt)
 *  3. Revoke lifetime access in lifetimeAccess doc
 *  4. Restore trialEndDate = today + remaining days on user doc
 *  5. Update subscription status back to 'trialing' (or 'refunded' if no days left)
 *  6. Write detailed history entries for full audit trail
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com'
];

exports.adminRevokeAndRestoreTrial = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const callerEmail = request.auth.token.email;
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, reason, refundAmount } = request.data;
    if (!userId) throw new HttpsError('invalid-argument', 'userId is required');

    const db = admin.firestore();
    const now = new Date();

    const userRef = db.collection('users').doc(userId);
    const userSubRef = db.collection('userSubscriptions').doc(userId);
    const lifetimeRef = db.collection('lifetimeAccess').doc(userId);

    const [userDoc, userSubDoc, lifetimeDoc] = await Promise.all([
      userRef.get(),
      userSubRef.get(),
      lifetimeRef.get()
    ]);

    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const userData = userDoc.data();
    const lifetimeData = lifetimeDoc.exists ? lifetimeDoc.data() : null;

    // ── Calculate trial days to restore ────────────────────────────────
    let restoredTrialEndDate = null;
    let trialDaysRestored = 0;
    let trialRestoredNote = '';

    const snapshotDays = lifetimeData?.trialDaysRemainingAtPurchase;

    if (snapshotDays != null && snapshotDays > 0) {
      restoredTrialEndDate = new Date(now.getTime() + snapshotDays * 24 * 60 * 60 * 1000);
      trialDaysRestored = snapshotDays;
      trialRestoredNote = `${snapshotDays} day(s) restored from purchase-time snapshot.`;
    } else {
      // Fallback: compute from createdAt and purchase date
      const created = userData.createdAt?.toDate
        ? userData.createdAt.toDate()
        : userData.createdAt ? new Date(userData.createdAt) : null;

      let originalTrialEnd = null;
      if (userData.trialEndDate?.toDate) originalTrialEnd = userData.trialEndDate.toDate();
      else if (userData.trialEndDate) originalTrialEnd = new Date(userData.trialEndDate);
      else if (created) originalTrialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);

      if (originalTrialEnd && created) {
        const purchasedAt = lifetimeData?.grantedAt?.toDate
          ? lifetimeData.grantedAt.toDate()
          : now;
        const daysConsumed = Math.max(0, Math.floor((purchasedAt - created) / (24 * 60 * 60 * 1000)));
        const totalTrialDays = Math.round((originalTrialEnd - created) / (24 * 60 * 60 * 1000));
        const daysRemaining = Math.max(0, totalTrialDays - daysConsumed);

        if (daysRemaining > 0) {
          restoredTrialEndDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
          trialDaysRestored = daysRemaining;
          trialRestoredNote = `${daysRemaining} of ${totalTrialDays} day(s) restored (${daysConsumed} days used before purchase).`;
        } else {
          trialRestoredNote = 'Trial had fully elapsed before purchase; no days to restore.';
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────

    const restoredStatus = restoredTrialEndDate ? 'trialing' : 'refunded';
    const refundReason = reason || 'Manual admin revocation — subscription refunded';

    const restoredSubscription = {
      status: restoredStatus,
      hasLifetimeAccess: false,
      interval: restoredTrialEndDate ? 'trial' : null,
      plan: null,
      cancelAt: null,
      cancelAtPeriodEnd: false,
      refundedAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      ...(restoredTrialEndDate && {
        currentPeriodEnd: restoredTrialEndDate.toISOString(),
        trialRestoredAt: FieldValue.serverTimestamp(),
        trialRestoredDays: trialDaysRestored,
        trialRestoredByAdmin: callerEmail,
      }),
    };

    const batch = db.batch();

    // 1. Revoke lifetime access doc
    if (lifetimeDoc.exists) {
      batch.update(lifetimeRef, {
        status: 'revoked',
        revokedAt: FieldValue.serverTimestamp(),
        revokedReason: refundReason,
        revokedByAdmin: callerEmail,
      });
    }

    // 2. Update userSubscriptions
    batch.set(userSubRef, {
      subscription: restoredSubscription,
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Update users doc — restore trialEndDate
    const userUpdate = {
      subscription: restoredSubscription,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (restoredTrialEndDate) userUpdate.trialEndDate = restoredTrialEndDate;
    batch.set(userRef, userUpdate, { merge: true });

    // 4. History: admin revocation
    const histRevokeRef = userSubRef.collection('history').doc();
    batch.set(histRevokeRef, {
      eventType: 'admin_revoke_lifetime',
      status: 'revoked',
      title: 'Lifetime access manually revoked by admin',
      description: refundReason + (refundAmount ? ` | Refund amount: $${refundAmount}` : ''),
      revokedByAdmin: callerEmail,
      source: 'admin_manual',
      severity: 'error',
      eventTimestamp: FieldValue.serverTimestamp(),
    });

    // 5. History: trial restoration
    const histTrialRef = userSubRef.collection('history').doc();
    batch.set(histTrialRef, {
      eventType: restoredTrialEndDate ? 'trial_restored' : 'trial_expired_no_restore',
      status: restoredStatus,
      title: restoredTrialEndDate
        ? `Trial restored — ${trialDaysRestored} day(s) remaining`
        : 'Revoked — no trial days remaining to restore',
      description: trialRestoredNote,
      trialDaysRestored,
      restoredTrialEndDate: restoredTrialEndDate ? restoredTrialEndDate.toISOString() : null,
      restoredByAdmin: callerEmail,
      source: 'admin_manual',
      severity: restoredTrialEndDate ? 'success' : 'warning',
      eventTimestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    logger.info(`✅ Admin ${callerEmail} revoked lifetime for ${userId}. Trial restored: ${trialDaysRestored} day(s). ${trialRestoredNote}`);

    return {
      success: true,
      userId,
      restoredStatus,
      trialDaysRestored,
      restoredTrialEndDate: restoredTrialEndDate ? restoredTrialEndDate.toISOString() : null,
      trialRestoredNote,
    };
  }
);
