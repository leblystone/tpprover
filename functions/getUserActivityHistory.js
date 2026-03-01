/**
 * getUserActivityHistory - Aggregates account and subscription activity for a user.
 * Used by the admin User Detail modal (Activity Log tab).
 * Returns a unified chronological list of events from:
 * - userSubscriptions/{userId}/history
 * - stripeEvents (where userId matches)
 * - emailHistory (where userId or recipientEmail matches)
 * - lifetimeAccess doc
 * - users doc (createdAt → "account created")
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com'
];

function toDate(v) {
  if (!v) return null;
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeEvent(item) {
  return {
    id: item.id,
    timestamp: item.timestamp,
    type: item.type,
    title: item.title,
    description: item.description,
    source: item.source,
    severity: item.severity,
    metadata: item.metadata || {}
  };
}

/**
 * Build activity events from userSubscriptions/{userId}/history subcollection
 */
function fromSubscriptionHistory(doc) {
  const d = doc.data();
  const id = doc.id;
  const ts = d.eventTimestamp || d.statusUpdatedAt || d.lastUpdated;
  const timestamp = toDate(ts);
  if (!timestamp) return null;
  const source = d.source || 'stripe_webhook';
  const status = d.status || 'unknown';
  const eventType = d.eventType || 'subscription_change';
  let title = 'Subscription updated';
  let description = `${status}`;
  let severity = 'info';
  if (eventType === 'charge.refunded' || status === 'refunded') {
    title = 'Refund processed';
    description = 'Full refund applied; access revoked.';
    severity = 'error';
  } else if (eventType === 'charge.dispute.created' || status === 'disputed') {
    title = 'Dispute opened';
    description = d.disputeReason ? `Dispute: ${d.disputeReason}` : 'Chargeback opened.';
    severity = 'error';
  } else if (eventType === 'charge.dispute.closed') {
    title = d.outcome === 'won' ? 'Dispute resolved (won)' : 'Dispute closed (lost)';
    description = d.outcome || '';
    severity = d.outcome === 'won' ? 'success' : 'error';
  } else if (status === 'active' && (d.interval === 'lifetime' || d.plan === 'lifetime')) {
    title = 'Lifetime / subscription started';
    description = d.plan ? `${d.plan} via ${source}` : 'Active';
    severity = 'success';
  } else if (status === 'canceled' || status === 'expired') {
    title = 'Subscription canceled or expired';
    description = status;
    severity = 'warning';
  } else if (d.plan) {
    description = `${d.plan} – ${status}`;
  }
  return { id: `sub_${id}`, timestamp, type: 'subscription_change', title, description, source, severity, metadata: d };
}

/**
 * Build activity events from stripeEvents collection
 */
function fromStripeEvent(doc) {
  const d = doc.data();
  const id = doc.id;
  const timestamp = toDate(d.timestamp);
  if (!timestamp) return null;
  const evType = d.type || '';
  let title = evType.replace(/_/g, ' ');
  let description = '';
  let severity = 'info';
  if (evType === 'charge.refunded') {
    title = 'Refund recorded';
    description = d.isFullRefund ? 'Full refund' : 'Partial refund';
    severity = 'error';
  } else if (evType === 'charge.dispute.created') {
    title = 'Dispute created';
    severity = 'error';
  } else if (evType === 'charge.dispute.closed') {
    title = 'Dispute closed';
    description = d.outcome || '';
    severity = d.outcome === 'won' ? 'success' : 'error';
  } else if (evType === 'invoice.payment_succeeded') {
    title = 'Payment succeeded';
    severity = 'success';
  } else if (evType === 'invoice.payment_failed') {
    title = 'Payment failed';
    severity = 'error';
  } else if (evType === 'customer.subscription.deleted') {
    title = 'Subscription deleted';
    severity = 'warning';
  } else if (evType === 'customer.subscription.updated') {
    title = 'Subscription updated';
  } else if (evType === 'customer.subscription.created') {
    title = 'Subscription created';
    severity = 'success';
  }
  if (d.amountRefunded != null) description = `Amount: $${(d.amountRefunded / 100).toFixed(2)}`;
  else if (d.amount != null) description = `Amount: $${(d.amount / 100).toFixed(2)}`;
  return { id: `stripe_${id}`, timestamp, type: 'payment', title, description, source: 'stripe', severity, metadata: d };
}

/**
 * Build activity events from emailHistory
 */
function fromEmailHistory(doc) {
  const d = doc.data();
  const id = doc.id;
  const timestamp = toDate(d.sentAt);
  if (!timestamp) return null;
  const typeLabel = (d.type || 'email').replace(/_/g, ' ');
  const title = `Email: ${typeLabel}`;
  const description = d.subject || d.status || '';
  const severity = d.status === 'failed' ? 'error' : 'info';
  const source = (d.sentBy === 'admin' || d.sentBy === 'system') ? d.sentBy : 'system';
  return { id: `email_${id}`, timestamp, type: 'communication', title, description, source, severity, metadata: d };
}

/**
 * Build synthetic "account created" and "trial started" from users doc
 */
function fromUserDoc(userId, userData) {
  const out = [];
  const createdAt = toDate(userData.createdAt);
  if (createdAt) {
    out.push({
      id: `user_${userId}_created`,
      timestamp: createdAt,
      type: 'account',
      title: 'Account created',
      description: 'User registered.',
      source: 'system',
      severity: 'success',
      metadata: {}
    });
  }
  const trialEnd = toDate(userData.trialEndDate);
  if (trialEnd && createdAt) {
    out.push({
      id: `user_${userId}_trial`,
      timestamp: createdAt,
      type: 'trial',
      title: 'Trial started',
      description: `Trial through ${trialEnd.toISOString().split('T')[0]}`,
      source: 'system',
      severity: 'info',
      metadata: {}
    });
  }
  return out;
}

/**
 * Build events from lifetimeAccess doc
 */
function fromLifetimeAccess(doc) {
  const d = doc.data();
  const id = doc.id;
  const createdAt = toDate(d.grantedAt || d.createdAt);
  const revokedAt = toDate(d.revokedAt);
  const out = [];
  if (createdAt) {
    out.push({
      id: `lifetime_${id}_granted`,
      timestamp: createdAt,
      type: 'lifetime',
      title: 'Lifetime access granted',
      description: d.reason || d.revokedReason || 'Lifetime access',
      source: d.source || 'admin',
      severity: 'success',
      metadata: d
    });
  }
  if (revokedAt) {
    out.push({
      id: `lifetime_${id}_revoked`,
      timestamp: revokedAt,
      type: 'lifetime',
      title: 'Lifetime access revoked',
      description: d.revokedReason || 'Revoked',
      source: 'stripe_webhook',
      severity: 'error',
      metadata: d
    });
  }
  return out;
}

exports.getUserActivityHistory = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const callerEmail = request.auth.token.email;
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const userId = request.data?.userId;
    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required');
    }

    const db = admin.firestore();
    const limit = Math.min(Number(request.data?.limit) || 100, 150);

    try {
      // No orderBy on cross-collection queries to avoid composite index requirements.
      // Sorting is done in memory after fetching.
      const [userSnap, lifetimeSnap, subHistorySnap, stripeEventsSnap, emailByUserIdSnap] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('lifetimeAccess').doc(userId).get(),
        db.collection('userSubscriptions').doc(userId).collection('history')
          .orderBy('eventTimestamp', 'desc').limit(50).get(),
        db.collection('stripeEvents').where('userId', '==', userId).limit(60).get(),
        db.collection('emailHistory').where('userId', '==', userId).limit(60).get()
      ]);

      const userData = userSnap.exists ? userSnap.data() : null;
      const userEmail = userData?.email ? userData.email.trim().toLowerCase() : null;

      let emailByEmailSnap = { empty: true, docs: [] };
      if (userEmail) {
        emailByEmailSnap = await db.collection('emailHistory')
          .where('recipientEmail', '==', userEmail)
          .limit(60)
          .get();
      }

      const events = [];

      subHistorySnap.docs.forEach((doc) => {
        const ev = fromSubscriptionHistory(doc);
        if (ev) events.push(ev);
      });
      stripeEventsSnap.docs.forEach((doc) => {
        const ev = fromStripeEvent(doc);
        if (ev) events.push(ev);
      });
      const seenEmailIds = new Set();
      emailByUserIdSnap.docs.forEach((doc) => {
        const ev = fromEmailHistory(doc);
        if (ev && !seenEmailIds.has(ev.id)) {
          seenEmailIds.add(ev.id);
          events.push(ev);
        }
      });
      emailByEmailSnap.docs.forEach((doc) => {
        const ev = fromEmailHistory(doc);
        if (ev && !seenEmailIds.has(ev.id)) {
          seenEmailIds.add(ev.id);
          events.push(ev);
        }
      });
      if (userData) {
        fromUserDoc(userId, userData).forEach((ev) => events.push(ev));
      }
      if (lifetimeSnap.exists) {
        fromLifetimeAccess(lifetimeSnap).forEach((ev) => events.push(ev));
      }

      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const capped = events.slice(0, limit).map((e) => ({
        ...normalizeEvent(e),
        timestamp: e.timestamp.toISOString()
      }));

      return { success: true, events: capped };
    } catch (err) {
      logger.error('getUserActivityHistory error', err);
      throw new HttpsError('internal', err.message || 'Failed to load activity history');
    }
  }
);

/**
 * getUserCommunications - Returns emails, admin messages, and support tickets for a user.
 * Used by the admin User Detail modal (Communications tab).
 */
exports.getUserCommunications = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const callerEmail = request.auth.token.email;
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const userId = request.data?.userId;
    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required');
    }

    const db = admin.firestore();

    try {
      const userSnap = await db.collection('users').doc(userId).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      const userEmail = userData?.email ? userData.email.trim().toLowerCase() : null;

      const limit = 80;

      // No orderBy on cross-collection queries — sort in memory to avoid composite index requirements.
      const [emailByUserIdSnap, emailByEmailSnap, adminMessagesSnap, ticketsByUserIdSnap, ticketsByEmailSnap] = await Promise.all([
        db.collection('emailHistory').where('userId', '==', userId).limit(limit).get(),
        userEmail ? db.collection('emailHistory').where('recipientEmail', '==', userEmail).limit(limit).get() : Promise.resolve({ docs: [] }),
        userEmail ? db.collection('adminMessages').where('userEmail', '==', userEmail).limit(limit).get() : Promise.resolve({ docs: [] }),
        db.collection('supportTickets').where('userId', '==', userId).limit(limit).get(),
        userEmail ? db.collection('supportTickets').where('userEmail', '==', userEmail).limit(limit).get() : Promise.resolve({ docs: [] })
      ]);

      const seenEmailIds = new Set();
      const emails = [];
      [...emailByUserIdSnap.docs, ...emailByEmailSnap.docs].forEach((doc) => {
        if (seenEmailIds.has(doc.id)) return;
        seenEmailIds.add(doc.id);
        const d = doc.data();
        emails.push({
          id: doc.id,
          type: d.type || 'email',
          subject: d.subject || '',
          status: d.status || 'sent',
          sentAt: d.sentAt ? toDate(d.sentAt).toISOString() : null,
          sentBy: d.sentBy || 'system',
          recipientEmail: d.recipientEmail
        });
      });
      emails.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));

      const adminMessages = adminMessagesSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          messageId: d.messageId,
          message: d.message,
          createdAt: d.createdAt ? toDate(d.createdAt).toISOString() : null,
          userReadAt: d.userReadAt ? toDate(d.userReadAt).toISOString() : null,
          createdBy: d.createdBy || 'admin'
        };
      });

      const seenTicketIds = new Set();
      const supportTickets = [];
      [...ticketsByUserIdSnap.docs, ...ticketsByEmailSnap.docs].forEach((doc) => {
        if (seenTicketIds.has(doc.id)) return;
        seenTicketIds.add(doc.id);
        const d = doc.data();
        supportTickets.push({
          id: doc.id,
          ticketNumber: d.ticketNumber,
          subject: d.subject,
          type: d.type,
          status: d.status,
          createdAt: d.createdAt ? toDate(d.createdAt).toISOString() : null,
          updatedAt: d.updatedAt ? toDate(d.updatedAt).toISOString() : null,
          userEmail: d.userEmail
        });
      });
      supportTickets.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      return {
        success: true,
        emails: emails.slice(0, 80),
        adminMessages: adminMessages.slice(0, 80),
        supportTickets: supportTickets.slice(0, 80)
      };
    } catch (err) {
      logger.error('getUserCommunications error', err);
      throw new HttpsError('internal', err.message || 'Failed to load communications');
    }
  }
);
