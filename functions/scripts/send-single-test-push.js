/**
 * One-shot: send a research-reminder test push to ONE account only.
 * Usage (via firebase CLI ADC): node functions/scripts/run-single-test-push.js
 */
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'tpp-splendide' });
const push = require('../pushNotifications');

const TARGET_EMAIL = 'lebrockmaldonado@gmail.com';

(async () => {
  const user = await admin.auth().getUserByEmail(TARGET_EMAIL);
  console.log('TARGET (single account only):', TARGET_EMAIL, '->', user.uid);

  const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
  const d = userDoc.data() || {};
  console.log('fcmToken present:', !!d.fcmToken);
  console.log('push enabled:', !!(d.notificationSettings?.push || d.notificationSettings?.pushEnabled));
  console.log('researchRemindersAM:', d.notificationSettings?.researchRemindersAM === true);
  console.log('researchRemindersPM:', d.notificationSettings?.researchRemindersPM === true);

  const result = await push.sendPushNotificationByType(user.uid, 'researchReminders', {
    title: '🧪 Test Morning Research Reminder',
    body: 'Single-account deploy test — if you see this, AM/PM push delivery is working.',
    tag: 'research-reminder-am',
    appUrl: 'https://thepepplanner.com/app/dashboard',
  });

  console.log('RESULT:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
})().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
