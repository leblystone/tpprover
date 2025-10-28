// 🧪 Test Email System Function
// Call this function to test email automation

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const emailService = require('./emailService');

/**
 * Test function to verify email system is working
 * Call this from Firebase Console or client app
 */
exports.testEmailSystem = onCall(
    {
      cors: true,
      secrets: ['SENDGRID_API_KEY']
    },
    async (request) => {
  // For admin testing, we'll allow unauthenticated calls but log it
  const userId = request.auth ? request.auth.uid : 'admin-test';
  
  if (!request.auth) {
    logger.warn('⚠️ testEmailSystem called without authentication - allowing for admin testing');
  }
  const { testEmail, templateType } = request.data;

  if (!testEmail) {
    throw new Error('testEmail parameter is required');
  }

  logger.info(`🧪 Testing email system for user ${userId} with email ${testEmail}`);

  const results = {
    timestamp: new Date().toISOString(),
    userId,
    testEmail,
    templateType,
    tests: {}
  };

  try {
    let emailResult = false;
    let emailName = '';

    // Send specific template based on templateType
    if (templateType === 'welcome') {
      logger.info('Testing welcome email...');
      
      // Direct SendGrid test for welcome email
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        logger.info('🔑 Checking API Key...');
        logger.info('API Key exists:', !!apiKey);
        if (apiKey) {
          logger.info('API Key length:', apiKey.length);
          logger.info('API Key starts with:', apiKey.substring(0, 10));
        }
        
        if (!apiKey) {
          throw new Error('SENDGRID_API_KEY environment variable is not set');
        }
        
        if (!apiKey.startsWith('SG.')) {
          throw new Error(`Invalid SendGrid API key format. Got: ${apiKey.substring(0, 20)}...`);
        }
        
        sgMail.setApiKey(apiKey);

        const msg = {
          to: testEmail,
          from: 'contact@thepepplanner.com',
          subject: 'Welcome to The Pep Planner! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Welcome to The Pep Planner! 🎉</h1>
              <p>Hi there! We're thrilled to have you join our research community.</p>
              <p>This is a direct test email to verify the system is working.</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `
        };

        await sgMail.send(msg);
        logger.info('✅ Direct SendGrid email sent successfully');
        emailResult = true;
      } catch (error) {
        logger.error('❌ Direct SendGrid failed:', error);
        logger.error('Error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.body
        });
        emailResult = false;
        emailName = error.message || 'SendGrid API error';
      }
      
      emailName = 'Welcome Email';
    } else if (templateType === 'trialEnding') {
      logger.info('Testing trial ending email...');
      emailResult = await emailService.sendTrialEndingEmail(testEmail, 2);
      emailName = 'Trial Ending Email';
    } else if (templateType === 'verification') {
      logger.info('Testing verification email...');
      emailResult = await emailService.sendVerificationEmail(testEmail, 'test-verification-link');
      emailName = 'Verification Email';
    } else if (templateType === 'passwordReset') {
      logger.info('Testing password reset email...');
      emailResult = await emailService.sendPasswordResetEmail(testEmail, 'test-reset-link');
      emailName = 'Password Reset Email';
    } else if (templateType === 'subscription') {
      logger.info('Testing subscription email...');
      emailResult = await emailService.sendSubscriptionConfirmedEmail(testEmail, 'Pro Plan');
      emailName = 'Subscription Confirmed Email';
    } else {
      // Default: send all emails for general testing
      logger.info('Testing all email types...');
      
      const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
      const trialResult = await emailService.sendTrialEndingEmail(testEmail, 2);
      const lifetimeResult = await emailService.sendLifetimeAccessGrantedEmail(testEmail, 'System Test');
      
      results.tests.welcomeEmail = {
        success: welcomeResult,
        message: welcomeResult ? 'Email sent successfully' : 'Email failed to send'
      };
      results.tests.trialEndingEmail = {
        success: trialResult,
        message: trialResult ? 'Email sent successfully' : 'Email failed to send'
      };
      results.tests.lifetimeAccessEmail = {
        success: lifetimeResult,
        message: lifetimeResult ? 'Email sent successfully' : 'Email failed to send'
      };

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
    }

    // Single template test
    results.tests[templateType] = {
      success: emailResult,
      message: emailResult ? 'Email sent successfully' : 'Email failed to send'
    };

    logger.info(`✅ ${emailName} test completed: ${emailResult ? 'SUCCESS' : 'FAILED'}`);
    
    return {
      success: emailResult,
      message: emailResult ? `${emailName} sent successfully` : `${emailName} failed to send`,
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
