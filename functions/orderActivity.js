const admin = require('firebase-admin');

function activityEntry({
  type,
  title,
  detail = null,
  actor = 'system',
  actorEmail = null,
  meta = null,
}) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    title,
    detail,
    actor,
    actorEmail,
    meta,
    createdAt: admin.firestore.Timestamp.now(),
  };
}

async function appendOrderActivity(orderRef, entry) {
  await orderRef.update({
    activityLog: admin.firestore.FieldValue.arrayUnion(entry),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

const SHOP_EVENT_LABELS = {
  shop_add_to_cart: (p) => ({
    type: 'add_to_cart',
    title: 'Added to cart',
    detail: [p.name, p.qty && p.qty !== '1' ? `×${p.qty}` : null].filter(Boolean).join(' '),
    actor: 'customer',
  }),
  shop_remove_from_cart: (p) => ({
    type: 'remove_from_cart',
    title: 'Removed from cart',
    detail: p.name || null,
    actor: 'customer',
  }),
  shop_checkout_started: (p) => ({
    type: 'checkout_started',
    title: 'Checkout started',
    detail: p.itemCount ? `${p.itemCount} item${p.itemCount === '1' ? '' : 's'}` : null,
    actor: 'customer',
  }),
  shop_checkout_session_created: (p) => ({
    type: 'checkout_session',
    title: 'Stripe checkout opened',
    detail: p.itemCount ? `${p.itemCount} item${p.itemCount === '1' ? '' : 's'}` : null,
    actor: 'customer',
  }),
  shop_purchase_success: () => ({
    type: 'checkout_completed',
    title: 'Checkout completed',
    detail: 'Payment confirmed',
    actor: 'customer',
  }),
};

/**
 * Pull shop funnel events for a Stripe session and return activity entries.
 */
async function shopEventsForSession(db, sessionId, orderCreatedAt) {
  if (!sessionId) return [];

  const entries = [];
  const snap = await db.collection('shopEvents')
    .where('params.sessionId', '==', sessionId)
    .limit(50)
    .get();

  let browserSessionId = null;
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.eventName === 'shop_checkout_session_created' && data.sessionId) {
      browserSessionId = data.sessionId;
    }
    const mapper = SHOP_EVENT_LABELS[data.eventName];
    if (mapper) {
      entries.push({
        ...mapper(data.params || {}),
        id: `shop-${doc.id}`,
        createdAt: data.createdAt || null,
        actorEmail: data.email || null,
      });
    }
  });

  if (browserSessionId) {
    const funnelSnap = await db.collection('shopEvents')
      .where('sessionId', '==', browserSessionId)
      .limit(100)
      .get();

    const orderTs = orderCreatedAt?.toDate?.() || (orderCreatedAt ? new Date(orderCreatedAt) : null);
    funnelSnap.forEach((doc) => {
      if (snap.docs.some((d) => d.id === doc.id)) return;
      const data = doc.data();
      if (data.params?.sessionId) return;
      const mapper = SHOP_EVENT_LABELS[data.eventName];
      if (!mapper) return;
      if (orderTs && data.createdAt?.toDate?.() && data.createdAt.toDate() > orderTs) return;
      entries.push({
        ...mapper(data.params || {}),
        id: `shop-${doc.id}`,
        createdAt: data.createdAt || null,
        actorEmail: data.email || null,
      });
    });
  }

  return entries;
}

module.exports = {
  activityEntry,
  appendOrderActivity,
  shopEventsForSession,
};
