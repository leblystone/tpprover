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
      secrets: ['SENDGRID_API_KEY', 'LOGO_URL']
    },
    async (request) => {
  // For admin testing, we'll allow unauthenticated calls but log it
  const userId = request.auth ? request.auth.uid : 'admin-test';
  
  if (!request.auth) {
    logger.warn('⚠️ testEmailSystem called without authentication - allowing for admin testing');
  }
  const { testEmail, templateType, templateData } = request.data;

  if (!testEmail) {
    throw new Error('testEmail parameter is required');
  }

  logger.info(`🧪 Testing email system for user ${userId} with email ${testEmail}`);
  logger.info(`📧 Template type: ${templateType}`);
  if (templateData) {
    logger.info(`📦 Custom template data received: ${JSON.stringify(templateData).substring(0, 200)}...`);
  }

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
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        logger.info('🔍 Welcome template data fields:', Object.keys(templateData));
        logger.info('🔍 Welcome template heading:', templateData.heading);
        logger.info('🔍 Welcome template greeting:', templateData.greeting);
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail 
        });
        subjectText = templateData.subject || 'Welcome to The Pep Planner! 🎉';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #6366f1;">Welcome to The Pep Planner! 🎉</h1>
            <p>Hi there! We're thrilled to have you join our research community.</p>
            <p>This is a direct test email to verify the system is working.</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Welcome to The Pep Planner! 🎉';
      }
      
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
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
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
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: 'Your trial ends in 2 days - The Pep Planner',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Your Trial Ends in 2 Days ⏰</h1>
              <p>Your 7-day free trial will end in 2 days. Continue your research journey!</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Trial ending email failed:', error);
        emailResult = false;
      }
      emailName = 'Trial Ending Email';
    } else if (templateType === 'verification') {
      logger.info('Testing verification email...');
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: 'Verify your email for The Pep Planner',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Verify Your Email 📧</h1>
              <p>Thanks for signing up! Please verify your email address.</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Verification email failed:', error);
        emailResult = false;
      }
      emailName = 'Verification Email';
    } else if (templateType === 'passwordReset') {
      logger.info('Testing password reset email...');
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: 'Reset your password for The Pep Planner',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Reset Your Password 🔐</h1>
              <p>We received a request to reset the password for your account.</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Password reset email failed:', error);
        emailResult = false;
      }
      emailName = 'Password Reset Email';
    } else if (templateType === 'subscription') {
      logger.info('Testing subscription email...');
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: 'Subscription Confirmed - The Pep Planner',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Welcome to Pro Plan! 🎉</h1>
              <p>Thank you for subscribing to The Pep Planner! You now have full access.</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Subscription email failed:', error);
        emailResult = false;
      }
      emailName = 'Subscription Confirmed Email';
    } else if (templateType === 'paymentSuccessful') {
      logger.info('Testing payment successful email...');
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        logger.info('🔍 Template data fields:', Object.keys(templateData));
        logger.info('🔍 Template heading:', templateData.heading);
        logger.info('🔍 Template greeting:', templateData.greeting);
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail,
          amount: '$29.99',
          planName: 'Monthly Plan'
        });
        subjectText = templateData.subject || 'Payment Successful - The Pep Planner';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Payment Successful! ✅</h1>
            <p>Your payment of $29.99 for the Monthly Plan has been processed successfully.</p>
            <p>You now have full access to all features.</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Payment Successful - The Pep Planner';
      }
      
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Payment successful email failed:', error);
        emailResult = false;
      }
      emailName = 'Payment Successful Email';
    } else if (templateType === 'subscriptionCancelled') {
      logger.info('Testing subscription cancelled email...');
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail,
          planName: 'Monthly Plan',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
        subjectText = templateData.subject || 'Subscription Cancelled - The Pep Planner';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Subscription Cancelled</h1>
            <p>Your Monthly Plan subscription has been cancelled.</p>
            <p>You'll continue to have access until ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Subscription Cancelled - The Pep Planner';
      }
      
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Subscription cancelled email failed:', error);
        emailResult = false;
      }
      emailName = 'Subscription Cancelled Email';
    } else if (templateType === 'renewalReminder') {
      logger.info('Testing renewal reminder email...');
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail,
          daysUntil: 3,
          planName: 'Monthly Plan'
        });
        subjectText = templateData.subject || 'Your subscription renews in 3 days - The Pep Planner';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">Subscription Renewal in 3 Days ⏰</h1>
            <p>Your Monthly Plan subscription will renew automatically in 3 days.</p>
            <p>Make sure your payment method is up to date.</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Your subscription renews in 3 days - The Pep Planner';
      }
      
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Renewal reminder email failed:', error);
        emailResult = false;
      }
      emailName = 'Renewal Reminder Email';
    } else if (templateType === 'weeklyReminder') {
      logger.info('Testing weekly reminder email...');
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail,
          taskCount: 3,
          peptideName: 'BPC-157'
        });
        subjectText = templateData.subject || 'Weekly Research Reminder - The Pep Planner';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8b5cf6;">Weekly Research Reminder 📅</h1>
            <p>You have 3 research tasks scheduled for this week.</p>
            <p>Don't forget to track your BPC-157 protocol progress!</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Weekly Research Reminder - The Pep Planner';
      }
      
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Weekly reminder email failed:', error);
        emailResult = false;
      }
      emailName = 'Weekly Reminder Email';
    } else if (templateType === 'paymentFailed') {
      logger.info('Testing payment failed email...');
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail,
          amount: '$29.99',
          planName: 'Monthly Plan'
        });
        subjectText = templateData.subject || 'Payment Failed - The Pep Planner';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Payment Failed ❌</h1>
            <p>We couldn't process your payment of $29.99 for the Monthly Plan.</p>
            <p>Please update your payment method to continue your subscription.</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Payment Failed - The Pep Planner';
      }
      
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Payment failed email failed:', error);
        emailResult = false;
      }
      emailName = 'Payment Failed Email';
    } else if (templateType === 'giftExpiringSoon') {
      logger.info('Testing gift expiring soon email...');
      
      // Use custom template data if provided, otherwise use simple test
      let htmlContent, subjectText;
      
      if (templateData) {
        // Use the custom template from admin panel
        const { generateEmailHTML } = require('./emailService');
        htmlContent = generateEmailHTML(templateData, { 
          userName: 'Test User', 
          userEmail: testEmail,
          daysLeft: 3,
          planName: 'Monthly Gift Plan',
          giftGiverName: 'Test Friend'
        });
        subjectText = templateData.subject || 'Your Gifted Research Time Is Ending Soon - The Pep Planner';
        logger.info('✅ Using custom template from admin panel');
      } else {
        // Simple fallback
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">🎁 Your Gifted Research Time Is Ending Soon</h1>
            <p>Your gifted Monthly Gift Plan subscription from Test Friend is ending in 3 days.</p>
            <p>Don't let your research organization stop! Extend your access with our flexible plans.</p>
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `;
        subjectText = 'Your Gifted Research Time Is Ending Soon - The Pep Planner';
      }
      
      try {
        const sgMail = require('@sendgrid/mail');
        const apiKey = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.trim() : null;
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key');
        }
        
        sgMail.setApiKey(apiKey);
        
        const msg = {
          to: testEmail,
          from: {
            email: 'contact@thepepplanner.com',
            name: 'The Pep Planner'
          },
          subject: subjectText,
          html: htmlContent
        };
        
        await sgMail.send(msg);
        emailResult = true;
      } catch (error) {
        logger.error('Gift expiring soon email failed:', error);
        emailResult = false;
      }
      emailName = 'Gift Expiring Soon Email';
    } else {
      // Default: send all emails for general testing
      logger.info('Testing all email types...');
      
      const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
      const trialResult = await emailService.sendTrialEndingEmail(testEmail, 2);
      const lifetimeResult = await emailService.sendLifetimeAccessGrantedEmail(testEmail, 'System Test');
      const giftExpiringResult = await emailService.sendGiftExpiringSoonEmail(testEmail, 'Monthly Gift Plan', 3, 'Test Friend');
      
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
      results.tests.giftExpiringSoonEmail = {
        success: giftExpiringResult,
        message: giftExpiringResult ? 'Email sent successfully' : 'Email failed to send'
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
