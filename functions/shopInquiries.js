/**
 * Shop inquiry Firestore triggers — admin email on new submissions.
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

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
