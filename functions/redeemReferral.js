/**
 * Referral callable functions (Research+ Wave).
 *
 * Two callables:
 *   - getMyReferralCode — returns the caller's stable referral code
 *     (creates one on first call, idempotent thereafter).
 *   - redeemReferral    — consumes someone else's code during onboarding
 *     or upgrade; rewards both the referrer and the referee once.
 *
 * Rewards are intentionally data-only here: the callable sets flags
 * on the user records that the client / billing layer reads. Actual
 * credit / month-comp logic lives in the Stripe layer.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

function generateReferralCode(uid) {
    // Deterministic 8-char code derived from uid so users always get
    // the same code back; avoids a race condition on parallel reads.
    const hash = Buffer.from(uid).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return (hash + 'XXXXXXXX').slice(0, 8);
}

exports.getMyReferralCode = onCall({ cors: true }, async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    const existing = snap.exists ? snap.data()?.referralCode : null;
    if (existing) return { code: existing };

    const code = generateReferralCode(uid);
    await userRef.set({
        referralCode: code,
        referralCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { code };
});

exports.redeemReferral = onCall({ cors: true }, async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');

    const { code } = request.data || {};
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized || normalized.length < 4) {
        throw new HttpsError('invalid-argument', 'Referral code is required.');
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError('not-found', 'User record missing.');

    const userData = userSnap.data() || {};
    if (userData.referredBy) {
        throw new HttpsError('already-exists', 'Referral already redeemed.');
    }
    if (userData.referralCode === normalized) {
        throw new HttpsError('failed-precondition', 'You cannot redeem your own code.');
    }

    const referrerQuery = await db
        .collection('users')
        .where('referralCode', '==', normalized)
        .limit(1)
        .get();

    if (referrerQuery.empty) {
        throw new HttpsError('not-found', 'Referral code not found.');
    }

    const referrerDoc = referrerQuery.docs[0];
    const referrerId = referrerDoc.id;
    if (referrerId === uid) {
        throw new HttpsError('failed-precondition', 'You cannot redeem your own code.');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Flag the referee
    batch.set(userRef, {
        referredBy: referrerId,
        referralRedeemedAt: now,
        // One free month on the referee side, consumed by billing layer.
        pendingReferralReward: { type: 'one_month_free', createdAt: now },
    }, { merge: true });

    // Credit the referrer (increment a counter; Stripe layer processes reward)
    batch.set(referrerDoc.ref, {
        referralCount: admin.firestore.FieldValue.increment(1),
        lastReferralAt: now,
        pendingReferralCredits: admin.firestore.FieldValue.increment(1),
    }, { merge: true });

    // Audit trail
    const auditRef = db.collection('referralAudit').doc();
    batch.set(auditRef, {
        refereeId: uid,
        referrerId,
        code: normalized,
        createdAt: now,
    });

    await batch.commit();
    logger.info('redeemReferral', { refereeId: uid, referrerId });

    return { success: true, referrerId };
});
