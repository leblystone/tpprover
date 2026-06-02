/**
 * Shop inquiry Firestore triggers — admin email on new submissions.
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

const VALID_STATUSES = new Set([
  'new',
  'contacted',
  'in_progress',
  'waiting_on_customer',
  'completed',
  'closed',
]);

function verifyAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to the admin panel to update inquiries.');
  }
  const email = (request.auth.token.email || '').toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return email;
}

/**
 * Admin: update inquiry status / notes (Admin SDK — reliable even if client rules lag).
 */
exports.adminUpdateShopInquiry = onCall({ cors: true }, async (request) => {
  verifyAdmin(request);

  const { inquiryId, status, adminNotes, markContacted } = request.data || {};
  if (!inquiryId || typeof inquiryId !== 'string') {
    throw new HttpsError('invalid-argument', 'inquiryId is required');
  }

  const nextStatus = status || 'new';
  if (!VALID_STATUSES.has(nextStatus)) {
    throw new HttpsError('invalid-argument', `Invalid status: ${nextStatus}`);
  }

  const notes = typeof adminNotes === 'string' ? adminNotes.trim() : '';
  const patch = {
    status: nextStatus,
    adminNotes: notes,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (markContacted || nextStatus === 'contacted') {
    patch.lastContactedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  const ref = admin.firestore().collection('inquiries').doc(inquiryId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Inquiry not found');
  }

  await ref.update(patch);
  logger.info('adminUpdateShopInquiry', { inquiryId, status: nextStatus, markContacted: !!markContacted });

  return { ok: true, inquiryId, status: nextStatus, adminNotes: notes };
});

exports.onShopInquiryCreated = onDocumentCreated(
  {
    document: 'inquiries/{inquiryId}',
    region: 'us-central1',
  },
  async (event) => {
    const inquiryId = event.params.inquiryId;
    const snap = event.data;
    if (!snap) {
      logger.warn('onShopInquiryCreated: missing snapshot', { inquiryId });
      return;
    }

    const data = snap.data();
    if (!data) return;

    try {
      const sent = await emailService.sendShopInquiryAdminNotification(inquiryId, data);
      if (sent) {
        await snap.ref.update({
          adminNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info('Shop inquiry admin notification sent', { inquiryId, type: data.type });
      } else {
        logger.warn('Shop inquiry admin notification not sent (email service returned false)', { inquiryId });
      }
    } catch (err) {
      logger.error('onShopInquiryCreated failed', { inquiryId, error: err.message });
    }
  }
);
