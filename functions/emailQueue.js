// 📧 Email Queue System for The Pep Planner
// Handles email rate limiting and queuing for free SendGrid plan (100 emails/day)

const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const DAILY_EMAIL_LIMIT = 100;
const PRIORITY_CRITICAL = 1; // Password resets, verifications
const PRIORITY_HIGH = 2; // Welcome emails, subscription confirmations
const PRIORITY_NORMAL = 3; // Trial ending, announcements
const PRIORITY_LOW = 4; // Bulk emails, surveys

/**
 * Get today's email count from Firestore
 */
async function getTodayEmailCount() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const counterRef = admin.firestore().collection('emailCounters').doc(todayKey);
    const counterDoc = await counterRef.get();
    
    if (counterDoc.exists) {
      return counterDoc.data().count || 0;
    }
    
    return 0;
  } catch (error) {
    logger.error('Error getting today email count:', error);
    return 0;
  }
}

/**
 * Increment today's email count
 */
async function incrementEmailCount() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    
    logger.info(`📊 Incrementing email count for date: ${todayKey}`);
    
    const counterRef = admin.firestore().collection('emailCounters').doc(todayKey);
    
    // Use FieldValue.increment for atomic operation
    await counterRef.set({
      count: admin.firestore.FieldValue.increment(1),
      date: todayKey,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Get the updated count
    const counterDoc = await counterRef.get();
    const newCount = counterDoc.exists ? (counterDoc.data().count || 0) : 1;
    logger.info(`📊 Email count incremented. New count: ${newCount}`);
    return newCount;
  } catch (error) {
    logger.error('❌ Error incrementing email count:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return 0;
  }
}

/**
 * Check if we can send email immediately or need to queue it
 */
async function canSendEmailImmediately(priority = PRIORITY_NORMAL) {
  const currentCount = await getTodayEmailCount();
  
  // Critical emails always try to send (password resets, verifications)
  if (priority === PRIORITY_CRITICAL) {
    return currentCount < DAILY_EMAIL_LIMIT;
  }
  
  // Reserve 20 emails for critical/high priority
  const reservedForCritical = 20;
  const availableForNormal = DAILY_EMAIL_LIMIT - reservedForCritical;
  
  if (priority === PRIORITY_HIGH) {
    return currentCount < DAILY_EMAIL_LIMIT;
  }
  
  // Normal and low priority emails use the remaining quota
  return currentCount < availableForNormal;
}

/**
 * Add email to queue
 */
async function queueEmail(emailData) {
  try {
    const {
      to,
      subject,
      html,
      priority = PRIORITY_NORMAL,
      type = 'general',
      metadata = {}
    } = emailData;
    
    const queueRef = admin.firestore().collection('emailQueue').doc();
    await queueRef.set({
      to,
      subject,
      html,
      priority,
      type,
      metadata,
      status: 'queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0,
      lastAttempt: null
    });
    
    logger.info(`📧 Email queued: ${to} - ${subject} (Priority: ${priority})`);
    return queueRef.id;
  } catch (error) {
    logger.error('Error queueing email:', error);
    throw error;
  }
}

/**
 * Process queued emails (called by scheduled function)
 */
async function processEmailQueue() {
  try {
    const currentCount = await getTodayEmailCount();
    const remainingQuota = DAILY_EMAIL_LIMIT - currentCount;
    
    if (remainingQuota <= 0) {
      logger.info('📧 Email quota exhausted for today. Queue processing skipped.');
      return { processed: 0, remaining: remainingQuota };
    }
    
    // Get queued emails ordered by priority and creation time
    const queueSnapshot = await admin.firestore()
      .collection('emailQueue')
      .where('status', '==', 'queued')
      .orderBy('priority', 'asc')
      .orderBy('createdAt', 'asc')
      .limit(remainingQuota)
      .get();
    
    if (queueSnapshot.empty) {
      logger.info('📧 No emails in queue to process.');
      return { processed: 0, remaining: remainingQuota };
    }
    
    logger.info(`📧 Processing ${queueSnapshot.size} queued emails (${remainingQuota} quota remaining)`);
    
    const emailService = require('./emailService');
    let processed = 0;
    let failed = 0;
    
    for (const doc of queueSnapshot.docs) {
      const emailData = doc.data();
      
      try {
        // Try to send email
        const success = await emailService.sendEmail(
          emailData.to,
          emailData.subject,
          emailData.html
        );
        
        if (success) {
          // Mark as sent
          await doc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: admin.firestore.FieldValue.increment(1)
          });
          
          // Note: sendEmail already increments the count, so we don't need to increment here
          // This prevents double counting
          processed++;
          
          logger.info(`✅ Queued email sent: ${emailData.to} - ${emailData.subject}`);
        } else {
          // Mark as failed
          await doc.ref.update({
            status: 'failed',
            lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: admin.firestore.FieldValue.increment(1),
            error: 'SendGrid returned false'
          });
          failed++;
        }
      } catch (error) {
        // Mark as failed
        await doc.ref.update({
          status: 'failed',
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          attempts: admin.firestore.FieldValue.increment(1),
          error: error.message
        });
        failed++;
        logger.error(`❌ Failed to send queued email ${doc.id}:`, error);
      }
      
      // Check if we've used all quota
      const newCount = await getTodayEmailCount();
      if (newCount >= DAILY_EMAIL_LIMIT) {
        logger.info('📧 Daily email quota reached. Stopping queue processing.');
        break;
      }
    }
    
    return {
      processed,
      failed,
      remaining: DAILY_EMAIL_LIMIT - await getTodayEmailCount()
    };
  } catch (error) {
    logger.error('Error processing email queue:', error);
    throw error;
  }
}

/**
 * Send email with automatic queuing if quota exceeded
 */
async function sendEmailWithQueue(to, subject, html, options = {}) {
  const {
    priority = PRIORITY_NORMAL,
    type = 'general',
    metadata = {},
    forceSend = false // Bypass queue check (use with caution)
  } = options;
  
  try {
    // Check if we can send immediately
    const canSend = await canSendEmailImmediately(priority);
    
    if (!canSend && !forceSend) {
      // Queue the email
      const queueId = await queueEmail({
        to,
        subject,
        html,
        priority,
        type,
        metadata
      });
      
      logger.info(`📧 Email queued (quota exceeded): ${to} - ${subject}`);
      return {
        queued: true,
        queueId,
        message: 'Email queued - will be sent when quota allows'
      };
    }
    
    // Try to send immediately
    const emailService = require('./emailService');
    const success = await emailService.sendEmail(to, subject, html);
    
    if (success) {
      // Note: sendEmail already increments the count, so we don't need to increment here
      // This prevents double counting
      return {
        queued: false,
        sent: true,
        message: 'Email sent successfully'
      };
    } else {
      // If send failed, queue it for retry
      const queueId = await queueEmail({
        to,
        subject,
        html,
        priority,
        type,
        metadata
      });
      
      return {
        queued: true,
        queueId,
        sent: false,
        message: 'Email send failed - queued for retry'
      };
    }
  } catch (error) {
    logger.error('Error in sendEmailWithQueue:', error);
    
    // Queue on error
    try {
      const queueId = await queueEmail({
        to,
        subject,
        html,
        priority,
        type,
        metadata
      });
      
      return {
        queued: true,
        queueId,
        sent: false,
        error: error.message,
        message: 'Error occurred - email queued for retry'
      };
    } catch (queueError) {
      logger.error('Failed to queue email after error:', queueError);
      throw error;
    }
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    
    // Get today's count
    const currentCount = await getTodayEmailCount();
    const remaining = DAILY_EMAIL_LIMIT - currentCount;
    
    // Get queue stats
    const queuedSnapshot = await admin.firestore()
      .collection('emailQueue')
      .where('status', '==', 'queued')
      .get();
    
    const queuedCount = queuedSnapshot.size;
    
    // Count by priority
    const priorityCounts = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0
    };
    
    queuedSnapshot.docs.forEach(doc => {
      const priority = doc.data().priority;
      if (priority === PRIORITY_CRITICAL) priorityCounts.critical++;
      else if (priority === PRIORITY_HIGH) priorityCounts.high++;
      else if (priority === PRIORITY_NORMAL) priorityCounts.normal++;
      else priorityCounts.low++;
    });
    
    return {
      today: {
        date: todayKey,
        sent: currentCount,
        limit: DAILY_EMAIL_LIMIT,
        remaining
      },
      queue: {
        total: queuedCount,
        byPriority: priorityCounts
      }
    };
  } catch (error) {
    logger.error('Error getting queue stats:', error);
    throw error;
  }
}

module.exports = {
  sendEmailWithQueue,
  queueEmail,
  processEmailQueue,
  getQueueStats,
  getTodayEmailCount,
  incrementEmailCount,
  canSendEmailImmediately,
  PRIORITY_CRITICAL,
  PRIORITY_HIGH,
  PRIORITY_NORMAL,
  PRIORITY_LOW,
  DAILY_EMAIL_LIMIT
};

