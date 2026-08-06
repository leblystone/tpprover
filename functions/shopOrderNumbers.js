const admin = require('firebase-admin');

/** First shop order number for our-site / manual orders (displayed as #0850). */
const SHOP_ORDER_NUMBER_START = 850;
const COUNTER_PATH = '_config/shopOrderSequence';

/**
 * Atomically allocate the next shop order number (850, 851, …).
 * Used for orders created on our site (Stripe checkout, manual admin entry).
 */
async function allocateShopOrderNumber(db = admin.firestore()) {
  const counterRef = db.doc(COUNTER_PATH);

  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    let next = SHOP_ORDER_NUMBER_START;

    if (snap.exists) {
      const stored = Number(snap.data()?.next);
      // Legacy default was 1001 — if the counter never advanced, adopt the new floor (850).
      if (Number.isFinite(stored) && stored === 1001) {
        next = SHOP_ORDER_NUMBER_START;
      } else if (Number.isFinite(stored) && stored >= SHOP_ORDER_NUMBER_START) {
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

/** Public display form, e.g. 850 → "#0850". */
function formatShopOrderNumberLabel(value) {
  const n = formatShopOrderNumber(value);
  if (n == null) return null;
  return `#${String(n).padStart(4, '0')}`;
}

module.exports = {
  SHOP_ORDER_NUMBER_START,
  allocateShopOrderNumber,
  formatShopOrderNumber,
  formatShopOrderNumberLabel,
};
