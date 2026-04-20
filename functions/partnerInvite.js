/**
 * Research+ Wave — Partner invite callables.
 *
 * Stubs for the two-step partner-link flow:
 *   1. sendPartnerInvite  — sends an email invite + writes a pending record
 *   2. acceptPartnerInvite — links the two accounts in Firestore
 *   3. removePartner       — unlinks both sides
 *
 * Real email delivery wires in when SendGrid / Firebase Email Extension
 * is configured. Until then the stubs validate, write to Firestore, and
 * return the pending invite state.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const PARTNER_INVITES = 'partnerInvites';
const USERS = 'users';

async function getUser(uid) {
    const snap = await admin.firestore().collection(USERS).doc(uid).get();
    return snap.exists ? { uid, ...snap.data() } : null;
}

/**
 * sendPartnerInvite({ email: string })
 *
 * Creates a pending invite document and (later) sends an email.
 * Enforces: must be authenticated, can only have 1 active invite,
 * cannot invite yourself.
 */
exports.sendPartnerInvite = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
    const uid = request.auth.uid;
    const inviteeEmail = (request.data?.email || '').trim().toLowerCase();

    if (!inviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
        throw new HttpsError('invalid-argument', 'A valid email address is required.');
    }

    if (inviteeEmail === (request.auth.token?.email || '').toLowerCase()) {
        throw new HttpsError('invalid-argument', 'You cannot invite yourself.');
    }

    const db = admin.firestore();

    // Check if sender already has an active partner or pending invite.
    const senderDoc = await db.collection(USERS).doc(uid).get();
    const senderData = senderDoc.data() || {};
    if (senderData.partnerId) {
        throw new HttpsError('already-exists', 'You already have a linked partner. Remove them first.');
    }

    // Expire any old pending invite from this sender.
    const oldInvites = await db.collection(PARTNER_INVITES)
        .where('senderUid', '==', uid)
        .where('status', '==', 'pending')
        .get();
    const batch = db.batch();
    oldInvites.docs.forEach((d) => batch.update(d.ref, { status: 'cancelled' }));

    // Create new invite.
    const inviteRef = db.collection(PARTNER_INVITES).doc();
    batch.set(inviteRef, {
        senderUid: uid,
        senderEmail: request.auth.token?.email || null,
        inviteeEmail,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Stamp the sender so their UI shows "invite pending".
    batch.set(db.collection(USERS).doc(uid), {
        partnerInvitePending: { inviteId: inviteRef.id, inviteeEmail },
    }, { merge: true });

    await batch.commit();

    // TODO: trigger email via Firebase Extension / SendGrid
    logger.info('Partner invite created', { senderUid: uid, inviteeEmail, inviteId: inviteRef.id });

    return { inviteId: inviteRef.id, inviteeEmail, status: 'pending' };
});

/**
 * acceptPartnerInvite({ inviteId: string })
 *
 * Called by the invitee once they tap the link in their email.
 * Links both user docs and marks the invite as accepted.
 */
exports.acceptPartnerInvite = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
    const uid = request.auth.uid;
    const { inviteId } = request.data || {};
    if (!inviteId) throw new HttpsError('invalid-argument', 'inviteId required.');

    const db = admin.firestore();
    const inviteSnap = await db.collection(PARTNER_INVITES).doc(inviteId).get();
    if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invite not found.');

    const invite = inviteSnap.data();
    if (invite.status !== 'pending') {
        throw new HttpsError('failed-precondition', `Invite is ${invite.status}.`);
    }
    if (new Date() > invite.expiresAt.toDate()) {
        throw new HttpsError('deadline-exceeded', 'Invite has expired.');
    }
    if ((request.auth.token?.email || '').toLowerCase() !== invite.inviteeEmail) {
        throw new HttpsError('permission-denied', 'This invite was sent to a different email address.');
    }

    const senderUid = invite.senderUid;
    const batch = db.batch();

    // Link both users.
    batch.set(db.collection(USERS).doc(senderUid), {
        partnerId: uid,
        partnerEmail: request.auth.token?.email,
        partnerLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
        partnerInvitePending: admin.firestore.FieldValue.delete(),
    }, { merge: true });

    batch.set(db.collection(USERS).doc(uid), {
        partnerId: senderUid,
        partnerEmail: invite.senderEmail,
        partnerLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    batch.update(inviteSnap.ref, { status: 'accepted', acceptedAt: admin.firestore.FieldValue.serverTimestamp() });

    await batch.commit();
    logger.info('Partner invite accepted', { senderUid, inviteeUid: uid, inviteId });

    return { status: 'accepted', partnerId: senderUid };
});

/**
 * removePartner()
 *
 * Unlinks the calling user from their partner. Both sides are updated.
 */
exports.removePartner = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
    const uid = request.auth.uid;
    const db = admin.firestore();

    const userSnap = await db.collection(USERS).doc(uid).get();
    const userData = userSnap.data() || {};
    const partnerId = userData.partnerId;

    const batch = db.batch();
    const userRef = db.collection(USERS).doc(uid);
    batch.update(userRef, {
        partnerId: admin.firestore.FieldValue.delete(),
        partnerEmail: admin.firestore.FieldValue.delete(),
        partnerLinkedAt: admin.firestore.FieldValue.delete(),
        partnerInvitePending: admin.firestore.FieldValue.delete(),
    });

    if (partnerId) {
        const partnerRef = db.collection(USERS).doc(partnerId);
        batch.update(partnerRef, {
            partnerId: admin.firestore.FieldValue.delete(),
            partnerEmail: admin.firestore.FieldValue.delete(),
            partnerLinkedAt: admin.firestore.FieldValue.delete(),
        });
    }

    await batch.commit();
    logger.info('Partner unlinked', { uid, partnerId });
    return { status: 'removed' };
});
