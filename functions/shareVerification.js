/**
 * Share Incentive Verification
 *
 * Verifies that a user has posted a TPP share card on social media
 * using Gemini Vision, then returns a one-time promo code from the
 * Firestore `sharePromoCodes` pool.
 *
 * Request body (JSON):
 *   { image: <base64 string>, mimeType: <string>, os: 'ios'|'android'|'web' }
 *
 * Response:
 *   Success → { promoCode: 'XXXXXX' }
 *   Failure → { status: 'failed', reason: '...' }
 *
 * Firestore collections:
 *   sharePromoCodes   — pool of codes { code, used, usedBy, usedAt }
 *   shareIncentiveClaims — one doc per uid { uid, promoCode, os, claimedAt }
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const GEMINI_MODEL = 'gemini-1.5-flash';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB base64 safety cap

const VERIFICATION_PROMPT = `You are a content verifier for a marketing campaign run by "The Pep Planner" — a peptide research management app.

Examine this screenshot and determine if it clearly shows BOTH of the following:
1. A social media context — an Instagram post, X/Twitter post, Reddit post, Facebook post, TikTok, or any similar platform.
2. A share card from "The Pep Planner" app — these cards display research data such as protocols, inventory snapshots, analytics, vendor ratings, or half-life charts. They include "The Pep Planner" branding/logo.

The screenshot MUST be:
- Legible and not heavily cropped, blurry, or otherwise obscured
- Showing the TPP share card visibly within a social media context

Respond ONLY with a valid JSON object on a single line.
If both requirements are met: {"verified":true}
Otherwise: {"verified":false,"reason":"one short sentence"}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyWithGemini(imageBase64, mimeType, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent([
    VERIFICATION_PROMPT,
    { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
  ]);

  const text = (result.response.text() || '').trim();
  const jsonMatch = text.match(/\{[^{}]*\}/);
  if (!jsonMatch) return { verified: false, reason: 'Could not parse AI response' };
  return JSON.parse(jsonMatch[0]);
}

async function resolveUid(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

async function getExistingClaim(db, uid) {
  if (!uid) return null;
  const snap = await db.collection('shareIncentiveClaims').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function assignPromoCode(db, uid, os) {
  const query = await db.collection('sharePromoCodes')
    .where('used', '==', false)
    .limit(1)
    .get();

  if (query.empty) {
    logger.warn('[ShareVerify] Promo code pool exhausted');
    return null;
  }

  const codeDoc = query.docs[0];
  const { code } = codeDoc.data();
  const batch = db.batch();

  batch.update(codeDoc.ref, {
    used: true,
    usedBy: uid || 'anonymous',
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (uid) {
    batch.set(db.collection('shareIncentiveClaims').doc(uid), {
      uid,
      promoCode: code,
      os: os || 'web',
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return code;
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.verifyShareScreenshot = onRequest(
  {
    cors: true,
    invoker: 'public',
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ status: 'failed', reason: 'Method not allowed' });
      return;
    }

    try {
      const { image, mimeType, os } = req.body || {};

      if (!image || typeof image !== 'string') {
        res.status(400).json({ status: 'failed', reason: 'No image provided' });
        return;
      }

      if (image.length > MAX_IMAGE_BYTES) {
        res.status(413).json({ status: 'failed', reason: 'Image too large' });
        return;
      }

      const db = admin.firestore();
      const uid = await resolveUid(req);

      // One-per-user: return existing code if already claimed
      if (uid) {
        const existing = await getExistingClaim(db, uid);
        if (existing) {
          logger.info('[ShareVerify] Returning existing claim', { uid });
          res.json({ promoCode: existing.promoCode });
          return;
        }
      }

      // AI verification
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        logger.error('[ShareVerify] GEMINI_API_KEY secret not set');
        res.json({ status: 'failed', reason: 'Verification service not configured' });
        return;
      }

      let aiResult;
      try {
        aiResult = await verifyWithGemini(image, mimeType, geminiKey);
      } catch (aiErr) {
        logger.error('[ShareVerify] Gemini error:', aiErr.message);
        res.json({ status: 'failed', reason: 'Verification service unavailable' });
        return;
      }

      logger.info('[ShareVerify] AI result', { uid, verified: aiResult.verified, reason: aiResult.reason });

      if (!aiResult.verified) {
        res.json({ status: 'failed', reason: aiResult.reason || 'Screenshot did not meet requirements' });
        return;
      }

      // Assign a promo code
      const promoCode = await assignPromoCode(db, uid, os);

      if (!promoCode) {
        res.json({ status: 'failed', reason: 'No promo codes available — contact support.' });
        return;
      }

      logger.info('[ShareVerify] Code assigned', { uid, os });
      res.json({ promoCode });
    } catch (err) {
      logger.error('[ShareVerify] Unhandled error:', err);
      res.status(500).json({ status: 'failed', reason: 'Internal server error' });
    }
  }
);
