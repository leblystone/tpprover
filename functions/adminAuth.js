/**
 * Shared admin authentication for Cloud Functions.
 */
const { HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

/**
 * Verify the caller is an authenticated admin (token email in ADMIN_EMAILS).
 * @returns {string} The admin's email
 */
function verifyAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const callerEmail = request.auth.token.email;
  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return callerEmail;
}

/**
 * Verify admin with fallback: token email first, then Firestore user doc.
 */
async function ensureAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const callerEmail = (request.auth.token && request.auth.token.email) || '';
  if (callerEmail && ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
    return;
  }
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const data = userDoc.exists ? userDoc.data() : {};
  const docEmail = (data.email || '').toLowerCase();
  if (ADMIN_EMAILS.includes(docEmail) || data.role === 'admin') {
    return;
  }
  throw new HttpsError('permission-denied', 'Admin access required');
}

module.exports = {
  ADMIN_EMAILS,
  verifyAdmin,
  ensureAdmin,
};
