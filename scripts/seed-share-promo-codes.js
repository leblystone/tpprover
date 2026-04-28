/**
 * Seed Share Incentive Promo Codes
 *
 * Run once to load your promo codes into Firestore:
 *   node scripts/seed-share-promo-codes.js
 *
 * Edit the PROMO_CODES array below with your real Apple / Google Play
 * or Stripe coupon codes before running.
 *
 * Each code doc:  { code, platform, used, createdAt }
 *   platform: 'ios' | 'android' | 'stripe' | 'any'
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account.json'); // adjust path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'tpp-splendide',
});

const db = admin.firestore();

// ─── Add your codes here ──────────────────────────────────────────────────────
// For iOS:     generate in App Store Connect → Promotions → Promo Codes
// For Android: generate in Google Play Console → User Acquisition → Promo Codes
// For Stripe:  create coupon codes in Stripe Dashboard → Products → Coupons
// platform 'any' will be given to whichever OS asks first
const PROMO_CODES = [
  // { code: 'XXXXXX', platform: 'ios' },
  // { code: 'YYYYYY', platform: 'android' },
  // { code: 'TPP3FREE', platform: 'stripe' },
  // { code: 'ZZZZZZ', platform: 'any' },
];
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  if (PROMO_CODES.length === 0) {
    console.log('⚠️  No codes defined — edit the PROMO_CODES array and re-run.');
    process.exit(0);
  }

  const batch = db.batch();
  const col = db.collection('sharePromoCodes');

  for (const { code, platform } of PROMO_CODES) {
    const ref = col.doc(code); // use code as document ID to prevent duplicates
    batch.set(ref, {
      code,
      platform: platform || 'any',
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: false });
  }

  await batch.commit();
  console.log(`✅ Seeded ${PROMO_CODES.length} promo code(s) into sharePromoCodes`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
