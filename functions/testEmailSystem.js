// 🧪 Test Email System Function
// Call this function to test email automation

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const emailService = require('./emailService');

/**
 * Test function to verify email system is working
 * Call this from Firebase Console or client app
 */
exports.testEmailSystem = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const userId = request.auth.uid;
  const { testEmail } = request.data;

  if (!testEmail) {
    throw new Error('testEmail parameter is required');
  }

  logger.info(`🧪 Testing email system for user ${userId} with email ${testEmail}`);

  const results = {
    timestamp: new Date().toISOString(),
    userId,
    testEmail,
    tests: {}
  };

  try {
    // Test 1: Welcome Email
    logger.info('Testing welcome email...');
    const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
    results.tests.welcomeEmail = {
      success: welcomeResult,
      message: welcomeResult ? 'Email sent successfully' : 'Email failed to send'
    };

    // Test 2: Trial Ending Email
    logger.info('Testing trial ending email...');
    const trialResult = await emailService.sendTrialEndingEmail(testEmail, 2);
    results.tests.trialEndingEmail = {
      success: trialResult,
      message: trialResult ? 'Email sent successfully' : 'Email failed to send'
    };

    // Test 3: Lifetime Access Email
    logger.info('Testing lifetime access email...');
    const lifetimeResult = await emailService.sendLifetimeAccessGrantedEmail(testEmail, 'System Test');
    results.tests.lifetimeAccessEmail = {
      success: lifetimeResult,
      message: lifetimeResult ? 'Email sent successfully' : 'Email failed to send'
    };

    // Summary
    const successCount = Object.values(results.tests).filter(test => test.success).length;
    const totalTests = Object.keys(results.tests).length;
    
    results.summary = {
      totalTests,
      successfulTests: successCount,
      failedTests: totalTests - successCount,
      overallSuccess: successCount === totalTests
    };

    logger.info(`✅ Email system test completed: ${successCount}/${totalTests} tests passed`);
    
    return {
      success: true,
      message: `Email system test completed: ${successCount}/${totalTests} tests passed`,
      results
    };

  } catch (error) {
    logger.error('❌ Email system test failed:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
});
