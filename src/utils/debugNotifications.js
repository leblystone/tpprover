import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Debug why notifications aren't working
 * Call this from the browser console: window.debugNotifications()
 */
export async function debugNotifications() {
  try {
    console.log('🔍 Debugging notifications...');
    
    const functions = getFunctions();
    const debugFn = httpsCallable(functions, 'debugNotifications');
    
    const result = await debugFn();
    const data = result.data;
    
    console.log('\n📊 NOTIFICATION DEBUG REPORT\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👤 USER INFO:');
    console.log(`   Email: ${data.email}`);
    console.log(`   User ID: ${data.userId}`);
    console.log('');
    
    console.log('⏰ CURRENT TIME:');
    console.log(`   Timezone: ${data.currentTime.timezone}`);
    console.log(`   Current Time: ${data.currentTime.formatted}`);
    console.log(`   Hour: ${data.currentTime.hour}`);
    console.log('');
    
    console.log('📱 PUSH NOTIFICATION SETTINGS:');
    console.log(`   Has FCM Token: ${data.pushSettings.hasFCMToken} ${data.pushSettings.hasFCMToken ? '✅' : '❌'}`);
    console.log(`   FCM Token Length: ${data.pushSettings.fcmTokenLength}`);
    console.log(`   push: ${data.pushSettings.push} ${data.pushSettings.push ? '✅' : '❌'}`);
    console.log(`   pushEnabled: ${data.pushSettings.pushEnabled} ${data.pushSettings.pushEnabled ? '✅' : '❌'}`);
    console.log(`   researchReminders: ${data.pushSettings.researchReminders} ${data.pushSettings.researchReminders ? '✅' : '❌'}`);
    console.log(`   researchRemindersAM: ${data.pushSettings.researchRemindersAM} ${data.pushSettings.researchRemindersAM ? '✅' : '❌'}`);
    console.log(`   researchRemindersPM: ${data.pushSettings.researchRemindersPM} ${data.pushSettings.researchRemindersPM ? '✅' : '❌'}`);
    console.log(`   AM Time: ${data.pushSettings.researchReminderTimeAM}`);
    console.log(`   PM Time: ${data.pushSettings.researchReminderTimePM}`);
    console.log('');
    
    console.log('🎯 TIME MATCHING:');
    console.log(`   Is Default AM Time (${data.pushSettings.researchReminderTimeAM}): ${data.timeMatching.isDefaultAMTime} ${data.timeMatching.isDefaultAMTime ? '✅' : '❌'}`);
    console.log(`   Matches AM Reminder: ${data.timeMatching.matchesAMReminder} ${data.timeMatching.matchesAMReminder ? '✅' : '❌'}`);
    console.log(`   Matches PM Reminder: ${data.timeMatching.matchesPMReminder} ${data.timeMatching.matchesPMReminder ? '✅' : '❌'}`);
    console.log(`   Would Send Notification: ${data.timeMatching.wouldSendNotification} ${data.timeMatching.wouldSendNotification ? '✅' : '❌'}`);
    console.log('');
    
    console.log('📋 PROTOCOLS:');
    console.log(`   Total Protocols: ${data.protocols.total}`);
    console.log(`   Active Today: ${data.protocols.activeToday}`);
    if (data.protocols.list.length > 0) {
      data.protocols.list.forEach((protocol, i) => {
        console.log(`   ${i + 1}. ${protocol.name}`);
        console.log(`      Active Today: ${protocol.isActiveToday} ${protocol.isActiveToday ? '✅' : '❌'}`);
        console.log(`      Start: ${protocol.startDate}`);
        console.log(`      End: ${protocol.endDate}`);
        console.log(`      Peptides: ${protocol.peptideCount}`);
        console.log(`      Tasks Today: ${protocol.tasks.length}`);
        if (protocol.tasks.length > 0) {
          protocol.tasks.forEach(task => {
            console.log(`         - ${task.name}: ${task.dose}${task.unit} at ${task.time}`);
          });
        }
      });
    }
    console.log('');
    
    console.log('✅ PEPTIDES TODAY:');
    console.log(`   Total Peptides: ${data.peptides.total} ${data.peptides.total > 0 ? '✅' : '❌'}`);
    if (data.peptides.list.length > 0) {
      data.peptides.list.forEach((task, i) => {
        console.log(`   ${i + 1}. ${task.name}: ${task.dose}${task.unit} at ${task.time}`);
      });
    }
    console.log('');
    
    console.log('💊 SUPPLEMENTS TODAY:');
    console.log(`   Total Supplements: ${data.supplements.total} ${data.supplements.total > 0 ? '✅' : '❌'}`);
    if (data.supplements.list.length > 0) {
      data.supplements.list.forEach((task, i) => {
        console.log(`   ${i + 1}. ${task.name}: ${task.dose} at ${task.time}`);
      });
    }
    console.log('');
    
    console.log(`📊 TOTAL ITEMS TODAY: ${data.totalItemsToday} (${data.peptides.total} peptides + ${data.supplements.total} supplements)`);
    console.log('');
    
    console.log('🔔 FINAL RESULT:');
    console.log(`   Would Send Notification: ${data.wouldSendNotification} ${data.wouldSendNotification ? '✅' : '❌'}`);
    console.log('');
    
    if (data.blockingReasons.length > 0) {
      console.log('🚫 BLOCKING REASONS (Why notification won\'t send):');
      data.blockingReasons.forEach((reason, i) => {
        console.log(`   ${i + 1}. ${reason}`);
      });
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Return the data for further inspection
    return data;
    
  } catch (error) {
    console.error('❌ Error debugging notifications:', error);
    throw error;
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.debugNotifications = debugNotifications;
}
