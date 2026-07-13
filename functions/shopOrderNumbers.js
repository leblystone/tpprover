const admin = require('firebase-admin');

const SHOP_ORDER_NUMBER_START = 1001;
const COUNTER_PATH = '_config/shopOrderSequence';

/**
 * Atomically allocate the next shop order number (1001, 1002, …).
 * Used for orders created on our site (Stripe checkout, manual admin entry).
 */
async function allocateShopOrderNumber(db = admin.firestore()) {
  const counterRef = db.doc(COUNTER_PATH);

  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    let next = SHOP_ORDER_NUMBER_START;

    if (snap.exists) {
      const stored = Number(snap.data()?.next);
      if (Number.isFinite(stored) && stored >= SHOP_ORDER_NUMBER_START) {
        next = stored;
      }
    }

    t.set(
      counterRef,
      {
        next: next + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return next;
  });
}

function formatShopOrderNumber(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = {
  SHOP_ORDER_NUMBER_START,
  allocateShopOrderNumber,
  formatShopOrderNumber,
};
