const admin = require('firebase-admin');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

/**
 * Audit all users to find those with lifetime access data but showing as trialing
 * This is a read-only function - it doesn't change any data
 */
exports.auditLifetimeAccess = functions.https.onCall(async (data, context) => {
  logger.info('🔍 Starting lifetime access audit...');
  
  const db = admin.firestore();
  const findings = {
    totalUsers: 0,
    lifetimeInLifetimeCollection: 0,
    lifetimeInUsersCollection: 0,
    lifetimeInUserSubscriptions: 0,
    conflictingUsers: [],
    summary: {}
  };

  try {
    // 1. Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();
    findings.totalUsers = usersSnapshot.size;
    logger.info(`📊 Found ${findings.totalUsers} total users`);

    // 2. Check each user for lifetime access conflicts
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check all three places for lifetime access
      const lifetimeDoc = await db.collection('lifetimeAccess').doc(userId).get();
      const subscriptionDoc = await db.collection('userSubscriptions').doc(userId).get();
      
      const hasLifetimeInLifetimeCollection = lifetimeDoc.exists() && lifetimeDoc.data()?.hasLifetimeAccess === true;
      const hasLifetimeInUsersCollection = userData.subscription?.hasLifetimeAccess === true || userData.subscription?.interval === 'lifetime';
      const hasLifetimeInSubscriptions = subscriptionDoc.exists() && 
        (subscriptionDoc.data()?.subscription?.hasLifetimeAccess === true || 
         subscriptionDoc.data()?.subscription?.interval === 'lifetime');

      // Count where lifetime access exists
      if (hasLifetimeInLifetimeCollection) findings.lifetimeInLifetimeCollection++;
      if (hasLifetimeInUsersCollection) findings.lifetimeInUsersCollection++;
      if (hasLifetimeInSubscriptions) findings.lifetimeInUserSubscriptions++;

      // Check if user has lifetime access anywhere but might be showing as trialing
      const hasAnyLifetimeAccess = hasLifetimeInLifetimeCollection || hasLifetimeInUsersCollection || hasLifetimeInSubscriptions;
      
      if (hasAnyLifetimeAccess) {
        const subscriptionData = subscriptionDoc.exists() ? subscriptionDoc.data()?.subscription : userData.subscription;
        const status = subscriptionData?.status || 'unknown';
        
        // Check if there's a trial end date (indicating they might show as trialing)
        const hasTrialEndDate = !!(
          userData.trialEndDate ||
          subscriptionData?.currentPeriodEnd
        );
        
        // Calculate if trial is still active
        let isTrialActive = false;
        if (hasTrialEndDate) {
          const trialEnd = userData.trialEndDate?.toDate ? userData.trialEndDate.toDate() : 
                          (subscriptionData?.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd) : null);
          if (trialEnd) {
            isTrialActive = trialEnd > new Date();
          }
        }

        // If they have lifetime but also have active trial date, or status isn't 'active', flag it
        const hasConflict = (hasTrialEndDate && isTrialActive) || (status !== 'active' && status !== 'trialing');

        const userInfo = {
          userId,
          email: userData.email || 'N/A',
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : 'Unknown',
          lifetimeLocations: {
            lifetimeCollection: hasLifetimeInLifetimeCollection,
            usersCollection: hasLifetimeInUsersCollection,
            userSubscriptionsCollection: hasLifetimeInSubscriptions
          },
          lifetimeReason: lifetimeDoc.exists() ? lifetimeDoc.data()?.reason : 
                         (userData.subscription?.lifetimeReason || 'Unknown'),
          lifetimeGrantedBy: lifetimeDoc.exists() ? lifetimeDoc.data()?.grantedBy : 'Unknown',
          lifetimeGrantedAt: lifetimeDoc.exists() && lifetimeDoc.data()?.grantedAt?.toDate ? 
                            lifetimeDoc.data().grantedAt.toDate().toISOString() : 'Unknown',
          currentStatus: status,
          hasTrialEndDate: hasTrialEndDate,
          isTrialActive: isTrialActive,
          trialEndDate: hasTrialEndDate ? 
            (userData.trialEndDate?.toDate ? userData.trialEndDate.toDate().toISOString() : 
             (subscriptionData?.currentPeriodEnd || 'Unknown')) : null,
          hasConflict: hasConflict,
          conflictType: hasConflict ? 
            (isTrialActive ? 'Has lifetime but showing as trialing' : 
             `Has lifetime but status is '${status}'`) : 'No conflict'
        };

        if (hasConflict) {
          findings.conflictingUsers.push(userInfo);
          logger.info(`⚠️ Conflict found: ${userInfo.email} - ${userInfo.conflictType}`);
        } else {
          logger.info(`✅ ${userInfo.email} - Lifetime access correctly set (status: ${status})`);
        }
      }
    }

    // 3. Generate summary
    findings.summary = {
      totalUsersWithLifetimeAccess: Math.max(
        findings.lifetimeInLifetimeCollection,
        findings.lifetimeInUsersCollection,
        findings.lifetimeInUserSubscriptions
      ),
      usersWithConflicts: findings.conflictingUsers.length,
      consistencyCheck: {
        allThreeCollectionsMatch: findings.lifetimeInLifetimeCollection === findings.lifetimeInUsersCollection && 
                                   findings.lifetimeInUsersCollection === findings.lifetimeInUserSubscriptions,
        note: 'If false, some users have lifetime in one collection but not others'
      }
    };

    logger.info('✅ Audit complete!');
    logger.info(`📊 Summary: ${findings.conflictingUsers.length} conflicts found out of ${findings.totalUsers} users`);

    return {
      success: true,
      findings
    };

  } catch (error) {
    logger.error('❌ Audit failed:', error);
    throw new functions.https.HttpsError('internal', `Audit failed: ${error.message}`);
  }
});

