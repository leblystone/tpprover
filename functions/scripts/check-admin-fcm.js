const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'tpp-splendide' });

(async () => {
  const uid = 'G2Msgqiu28PVc2B2WjsE4ciVz5W2';
  const d = (await admin.firestore().collection('users').doc(uid).get()).data() || {};
  console.log(
    JSON.stringify(
      {
        email: d.email,
        hasFcmToken: !!d.fcmToken,
        hasPushToken: !!d.pushToken,
        push: d.notificationSettings?.push,
        pushEnabled: d.notificationSettings?.pushEnabled,
        researchRemindersAM: d.notificationSettings?.researchRemindersAM,
        researchRemindersPM: d.notificationSettings?.researchRemindersPM,
        researchReminderTimeAM: d.notificationSettings?.researchReminderTimeAM,
        researchReminderTimePM: d.notificationSettings?.researchReminderTimePM,
        timezone: d.settings?.region?.timeZone,
        fcmStaleTokenCleanups: d.fcmStaleTokenCleanups || 0,
        fcmLastStaleTokenAt: d.fcmLastStaleTokenAt || null,
        fcmLastStaleTokenErrorCode: d.fcmLastStaleTokenErrorCode || null,
      },
      null,
      2
    )
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
