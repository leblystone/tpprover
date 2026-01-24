const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions/v2');

/**
 * Debug function to check why scheduled notifications aren't working
 * Returns detailed information about user's notification settings, protocols, and tasks
 */
exports.debugNotifications = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const userId = request.auth.uid;
  
  try {
    logger.info(`🔍 Debugging notifications for user ${userId}`);
    
    // Get user data
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData) {
      return { error: 'User not found' };
    }

    // Check notification settings
    const notificationSettings = userData.notificationSettings || {};
    const settings = userData.settings || {};
    const userTimezone = settings.region?.timeZone || 'America/New_York';
    
    // Get current time in user's timezone
    const now = new Date();
    const userTimeString = now.toLocaleString("en-US", {
      timeZone: userTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const [currentHour, currentMinute] = userTimeString.split(':').map(Number);
    
    // Get protocols from userData collection (single document, not subcollection)
    const userDataDoc = await admin.firestore().collection('userData').doc(userId).get();
    const userDataObj = userDataDoc.data();
    const protocolsArray = userDataObj?.protocols || [];
    const supplementsArray = userDataObj?.supplements || [];

    const protocols = [];
    const todayPeptides = [];
    const todaySupplements = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process protocols
    for (const protocol of protocolsArray) {
      
      const protocolInfo = {
        id: protocol.id,
        name: protocol.name || 'Unnamed',
        startDate: protocol.startDate,
        endDate: protocol.endDate,
        isActiveToday: false,
        hasPeptides: !!protocol.peptides,
        peptideCount: protocol.peptides?.length || 0,
        tasks: []
      };
      
      // Check if protocol is active today
      if (protocol.startDate && protocol.endDate) {
        const startDate = new Date(protocol.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(protocol.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        protocolInfo.isActiveToday = today >= startDate && today <= endDate;
        
        if (protocolInfo.isActiveToday && protocol.peptides) {
          protocol.peptides.forEach(peptide => {
            if (peptide.frequency && peptide.frequency.time) {
              peptide.frequency.time.forEach(time => {
                const task = {
                  name: peptide.name || 'Peptide',
                  dose: peptide.dosage?.amount || '',
                  unit: peptide.dosage?.unit || 'mcg',
                  time: time,
                  type: 'peptide'
                };
                protocolInfo.tasks.push(task);
                todayPeptides.push(task);
              });
            }
          });
        }
      }
      
      protocols.push(protocolInfo);
    }
    
    // Process supplements
    const dayOfWeek = today.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[dayOfWeek];

    for (const supplement of supplementsArray) {
      // Check if supplement is scheduled for today
      const isScheduledToday = !supplement.days || 
                               supplement.days.length === 0 || 
                               supplement.days.some(day => {
                                 const normalizedDay = day.toLowerCase();
                                 const normalizedCurrentDay = currentDayName.toLowerCase();
                                 return normalizedDay === normalizedCurrentDay || 
                                        normalizedDay === normalizedCurrentDay.substring(0, 3);
                               });

      if (isScheduledToday) {
        // Get time slots for supplement
        const schedule = Array.isArray(supplement.schedule) ? supplement.schedule : 
                        (supplement.schedule === 'PM' ? ['PM'] : ['AM']);
        
        schedule.forEach(time => {
          todaySupplements.push({
            name: supplement.name || 'Supplement',
            dose: supplement.dose || '',
            time: time,
            type: 'supplement'
          });
        });
      }
    }
    
    // Check time matching
    const reminderTimeAM = notificationSettings.researchReminderTimeAM || '08:00';
    const reminderTimePM = notificationSettings.researchReminderTimePM || '18:00';
    const [amHour] = reminderTimeAM.split(':').map(Number);
    const [pmHour] = reminderTimePM.split(':').map(Number);
    const [defaultAMHour] = reminderTimeAM.split(':').map(Number);
    
    const totalItems = todayPeptides.length + todaySupplements.length;
    
    const result = {
      userId,
      email: userData.email,
      
      // Current time info
      currentTime: {
        timezone: userTimezone,
        hour: currentHour,
        minute: currentMinute,
        formatted: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`
      },
      
      // Push notification settings
      pushSettings: {
        hasFCMToken: !!userData.fcmToken,
        fcmTokenLength: userData.fcmToken?.length || 0,
        push: notificationSettings.push,
        pushEnabled: notificationSettings.pushEnabled,
        researchReminders: notificationSettings.researchReminders,
        researchRemindersAM: notificationSettings.researchRemindersAM,
        researchRemindersPM: notificationSettings.researchRemindersPM,
        researchReminderTimeAM: reminderTimeAM,
        researchReminderTimePM: reminderTimePM
      },
      
      // Time matching
      timeMatching: {
        isDefaultAMTime: currentHour === defaultAMHour,
        matchesAMReminder: notificationSettings.researchRemindersAM === true && currentHour === amHour,
        matchesPMReminder: notificationSettings.researchRemindersPM === true && currentHour === pmHour,
        wouldSendNotification: (currentHour === defaultAMHour) || 
          (notificationSettings.researchRemindersAM === true && currentHour === amHour) ||
          (notificationSettings.researchRemindersPM === true && currentHour === pmHour)
      },
      
      // Protocol info
      protocols: {
        total: protocols.length,
        activeToday: protocols.filter(p => p.isActiveToday).length,
        list: protocols
      },
      
      // Peptide tasks
      peptides: {
        total: todayPeptides.length,
        list: todayPeptides
      },
      
      // Supplement tasks
      supplements: {
        total: todaySupplements.length,
        list: todaySupplements
      },
      
      // Combined total
      totalItemsToday: totalItems,
      
      // Final check
      wouldSendNotification: totalItems > 0 && (
        (currentHour === defaultAMHour) || 
        (notificationSettings.researchRemindersAM === true && currentHour === amHour) ||
        (notificationSettings.researchRemindersPM === true && currentHour === pmHour)
      ),
      
      // Reasons why notification might not send
      blockingReasons: []
    };
    
    // Add blocking reasons
    if (!userData.fcmToken && !notificationSettings.push && !notificationSettings.pushEnabled) {
      result.blockingReasons.push('No FCM token and push notifications not enabled');
    }
    if (totalItems === 0) {
      result.blockingReasons.push('No peptides or supplements scheduled for today');
    }
    if (!result.timeMatching.wouldSendNotification) {
      result.blockingReasons.push(`Current time (${currentHour}:00) doesn't match any reminder times (AM: ${amHour}:00, PM: ${pmHour}:00, Default AM: ${defaultAMHour}:00)`);
    }
    
    logger.info(`✅ Debug complete for user ${userId}`, result);
    return result;
    
  } catch (error) {
    logger.error('❌ Error debugging notifications:', error);
    return { error: error.message };
  }
});
