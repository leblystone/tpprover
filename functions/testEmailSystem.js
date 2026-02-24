// 🧪 Test Email System Function
// Call this function to test email automation

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const emailService = require('./emailService');

/**
 * Helper function to send email via Resend
 */
async function sendEmailViaResend(to, subject, html) {
  const { Resend } = require('resend');
  const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;
  
  if (!apiKey) {
    logger.error('❌ RESEND_API_KEY environment variable is not set');
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  
  if (!apiKey.startsWith('re_') || apiKey.length < 30) {
    logger.error(`❌ Invalid Resend API key format. Got: ${apiKey.substring(0, 20)}... (length: ${apiKey.length})`);
    throw new Error(`Invalid Resend API key format. Got: ${apiKey.substring(0, 20)}... (length: ${apiKey.length})`);
  }
  
  logger.info(`📧 Sending email via Resend to: ${to}`);
  logger.info(`📧 Subject: ${subject}`);
  logger.info(`📧 HTML length: ${html ? html.length : 0} characters`);
  
  const resend = new Resend(apiKey);
  let result;
  
  try {
    // Use Resend's sandbox sender so test emails work without verifying thepepplanner.app
    result = await resend.emails.send({
      from: 'The Pep Planner <onboarding@resend.dev>',
      to,
      subject,
      html,
      replyTo: 'contact@thepepplanner.com',
      headers: {
        'X-Entity-Ref-ID': `tpp-test-${Date.now()}`,
        'List-Unsubscribe': '<https://thepepplanner.app/app/account>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        // Mark as transactional to avoid Promotions tab
        'X-Priority': '1',
        'X-Mailer': 'The Pep Planner',
        'Auto-Submitted': 'no',
        // Important headers for inbox placement (transactional emails)
        'X-Auto-Response-Suppress': 'All',
        'X-Transaction-Type': 'transactional',
      },
      tags: [
        { name: 'category', value: 'transactional' },
        { name: 'source', value: 'the-pep-planner' },
        { name: 'type', value: 'test' }
      ],
    });
    
    logger.info('📧 Resend API response:', JSON.stringify(result, null, 2));
  } catch (sendError) {
    logger.error('❌ Resend API call failed:', sendError);
    logger.error('❌ Error message:', sendError.message);
    logger.error('❌ Error stack:', sendError.stack);
    throw sendError;
  }
  
  if (result.data && result.data.id) {
    logger.info(`✅ Email sent successfully! Resend ID: ${result.data.id}`);
    logger.info(`✅ Email sent to: ${to}`);
    logger.info(`✅ Subject: ${subject}`);
    // Return both formats for backward compatibility
    const emailResult = { success: true, emailId: result.data.id, result };
    // Also set success property for backward compatibility
    emailResult.success = true;
    return emailResult;
  } else if (result.error) {
    logger.error('❌ Resend API returned error:', result.error);
    logger.error('❌ Full error object:', JSON.stringify(result.error, null, 2));
    throw new Error(result.error.message || 'Resend API error');
  } else {
    logger.error('❌ Unexpected Resend response:', JSON.stringify(result, null, 2));
    throw new Error('Unexpected Resend response - no data.id and no error');
  }
}

/**
 * Test function to verify email system is working
 * Call this from Firebase Console or client app
 */
exports.testEmailSystem = onCall(
    {
      cors: true,
      secrets: ['RESEND_API_KEY', 'LOGO_URL']
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
        try {
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User', 
            userEmail: testEmail 
          });
          logger.info('✅ HTML generated successfully, length:', htmlContent ? htmlContent.length : 0);
          if (!htmlContent || htmlContent.length === 0) {
            throw new Error('Generated HTML is empty');
          }
        } catch (htmlError) {
          logger.error('❌ Failed to generate HTML:', htmlError);
          logger.error('❌ HTML generation error message:', htmlError.message);
          logger.error('❌ HTML generation error stack:', htmlError.stack);
          throw new Error(`Failed to generate email HTML: ${htmlError.message}`);
        }
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
      
      // Direct Resend test for welcome email
      try {
        const sendResult = await sendEmailViaResend(testEmail, subjectText, htmlContent);
        if (sendResult && (sendResult === true || sendResult.success)) {
          logger.info('✅ Direct Resend email sent successfully');
          if (sendResult.emailId) {
            logger.info(`📧 Resend Email ID: ${sendResult.emailId}`);
          }
          emailResult = true;
        } else {
          throw new Error('Email send returned false or no success flag');
        }
      } catch (error) {
        logger.error('❌ Direct Resend failed:', error);
        logger.error('Error details:', {
          message: error.message,
          code: error.code
        });
        emailResult = false;
        emailName = error.message || 'Resend API error';
      }
      
      emailName = 'Welcome Email';
    } else if (templateType === 'trialEnding') {
      logger.info('Testing trial ending email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom trialEnding template from Firestore...');
        const customTemplate = await loadEmailTemplate('trialEnding');
        
        if (customTemplate) {
          logger.info('✅ Custom trialEnding template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            daysLeft: 2
          });
          subjectText = customTemplate.subject || 'Your trial ends in 2 days - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            daysLeft: 2
          });
          subjectText = templateData.subject || 'Your trial ends in 2 days - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Your Trial Ends in 2 Days ⏰</h1>
              <p>Your 10-day research trial will end in 2 days. Continue your research journey!</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `;
          subjectText = 'Your trial ends in 2 days - The Pep Planner';
        }
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Trial ending test email sent successfully');
      } catch (error) {
        logger.error('❌ Trial ending email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Trial Ending Email';
    } else if (templateType === 'verification') {
      logger.info('Testing verification email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom verification template from Firestore...');
        const customTemplate = await loadEmailTemplate('verification');
        
        if (customTemplate) {
          logger.info('✅ Custom verification template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          // Generate a fake verification link for testing
          const testVerificationLink = `https://thepepplanner.app/verify?token=TEST_${Date.now()}`;
          htmlContent = generateEmailHTML(customTemplate, { 
            verificationLink: testVerificationLink,
            userEmail: testEmail,
            userName: 'Test User'
          });
          subjectText = customTemplate.subject || 'Verify your email for The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          const testVerificationLink = `https://thepepplanner.app/verify?token=TEST_${Date.now()}`;
          htmlContent = generateEmailHTML(templateData, { 
            verificationLink: testVerificationLink,
            userEmail: testEmail,
            userName: 'Test User'
          });
          subjectText = templateData.subject || 'Verify your email for The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
          const testVerificationLink = `https://thepepplanner.app/verify?token=TEST_${Date.now()}`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Verify Your Email 📧</h1>
              <p>Thanks for signing up! Please verify your email address.</p>
              <p><a href="${testVerificationLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `;
          subjectText = 'Verify your email for The Pep Planner';
        }
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Verification test email sent successfully');
      } catch (error) {
        logger.error('❌ Verification email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Verification Email';
    } else if (templateType === 'passwordReset') {
      logger.info('Testing password reset email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom passwordReset template from Firestore...');
        const customTemplate = await loadEmailTemplate('passwordReset');
        
        if (customTemplate) {
          logger.info('✅ Custom passwordReset template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          // Generate a fake reset link for testing
          const testResetLink = `https://thepepplanner.app/reset-password?token=TEST_${Date.now()}`;
          htmlContent = generateEmailHTML(customTemplate, { 
            resetLink: testResetLink,
            userEmail: testEmail
          });
          subjectText = customTemplate.subject || 'Reset your password for The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          const testResetLink = `https://thepepplanner.app/reset-password?token=TEST_${Date.now()}`;
          htmlContent = generateEmailHTML(templateData, { 
            resetLink: testResetLink,
            userEmail: testEmail
          });
          subjectText = templateData.subject || 'Reset your password for The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
          const testResetLink = `https://thepepplanner.app/reset-password?token=TEST_${Date.now()}`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Reset Your Password 🔐</h1>
              <p>We received a request to reset the password for your account.</p>
              <p><a href="${testResetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `;
          subjectText = 'Reset your password for The Pep Planner';
        }
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Password reset test email sent successfully');
      } catch (error) {
        logger.error('❌ Password reset email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Password Reset Email';
    } else if (templateType === 'subscription') {
      logger.info('Testing subscription email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom subscription template from Firestore...');
        const customTemplate = await loadEmailTemplate('subscription');
        
        if (customTemplate) {
          logger.info('✅ Custom subscription template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            plan: 'Pro Plan',
            interval: 'month',
            price: '$8.99'
          });
          subjectText = customTemplate.subject || 'Subscription Confirmed - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            plan: 'Pro Plan',
            interval: 'month',
            price: '$8.99'
          });
          subjectText = templateData.subject || 'Subscription Confirmed - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Welcome to Pro Plan! 🎉</h1>
              <p>Thank you for subscribing to The Pep Planner! You now have full access.</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `;
          subjectText = 'Subscription Confirmed - The Pep Planner';
        }
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Subscription test email sent successfully');
      } catch (error) {
        logger.error('❌ Subscription email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Subscription Confirmed Email';
    } else if (templateType === 'paymentSuccessful') {
      logger.info('Testing payment successful email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom paymentSuccessful template from Firestore...');
        const customTemplate = await loadEmailTemplate('paymentSuccessful');
        
        if (customTemplate) {
          logger.info('✅ Custom paymentSuccessful template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User', 
            userEmail: testEmail,
            amount: '$29.99',
            planName: 'Monthly Plan'
          });
          subjectText = customTemplate.subject || 'Payment Successful - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User', 
            userEmail: testEmail,
            amount: '$29.99',
            planName: 'Monthly Plan'
          });
          subjectText = templateData.subject || 'Payment Successful - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
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
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Payment successful test email sent successfully');
      } catch (error) {
        logger.error('❌ Payment successful email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Payment Successful Email';
    } else if (templateType === 'subscriptionCancelled') {
      logger.info('Testing subscription cancelled email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom subscriptionCancelled template from Firestore...');
        const customTemplate = await loadEmailTemplate('subscriptionCancelled');
        
        if (customTemplate) {
          logger.info('✅ Custom subscriptionCancelled template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User', 
            userEmail: testEmail,
            planName: 'Monthly Plan',
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
          });
          subjectText = customTemplate.subject || 'Subscription Cancelled - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User', 
            userEmail: testEmail,
            planName: 'Monthly Plan',
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
          });
          subjectText = templateData.subject || 'Subscription Cancelled - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
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
        
        // Send the email via Resend
        logger.info(`📧 Sending subscription cancelled email to ${testEmail}...`);
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Subscription cancelled email sent successfully');
      } catch (error) {
        logger.error('❌ Subscription cancelled email failed:', error);
        logger.error('❌ Error message:', error.message);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
        emailName = `Subscription Cancelled Email - ${error.message}`;
      }
      if (emailResult) {
        emailName = 'Subscription Cancelled Email';
      }
    } else if (templateType === 'renewalReminder') {
      logger.info('Testing renewal reminder email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom renewalReminder template from Firestore...');
        const customTemplate = await loadEmailTemplate('renewalReminder');
        
        if (customTemplate) {
          logger.info('✅ Custom renewalReminder template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User', 
            userEmail: testEmail,
            daysUntil: 3,
            planName: 'Monthly Plan'
          });
          subjectText = customTemplate.subject || 'Your subscription renews in 3 days - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User', 
            userEmail: testEmail,
            daysUntil: 3,
            planName: 'Monthly Plan'
          });
          subjectText = templateData.subject || 'Your subscription renews in 3 days - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
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
        
        // Send the email via Resend
        logger.info(`📧 Sending renewal reminder email to ${testEmail}...`);
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Renewal reminder email sent successfully');
      } catch (error) {
        logger.error('❌ Renewal reminder email failed:', error);
        logger.error('❌ Error message:', error.message);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
        emailName = `Renewal Reminder Email - ${error.message}`;
      }
      if (emailResult) {
        emailName = 'Renewal Reminder Email';
      }
    } else if (templateType === 'weeklyReminder') {
      logger.info('Testing weekly reminder email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom weeklyReminder template from Firestore...');
        const customTemplate = await loadEmailTemplate('weeklyReminder');
        
        if (customTemplate) {
          logger.info('✅ Custom weeklyReminder template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User', 
            userEmail: testEmail,
            taskCount: 3,
            peptideName: 'BPC-157'
          });
          subjectText = customTemplate.subject || 'Weekly Research Reminder - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User', 
            userEmail: testEmail,
            taskCount: 3,
            peptideName: 'BPC-157'
          });
          subjectText = templateData.subject || 'Weekly Research Reminder - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
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
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Weekly reminder test email sent successfully');
      } catch (error) {
        logger.error('❌ Weekly reminder email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Weekly Reminder Email';
    } else if (templateType === 'paymentFailed') {
      logger.info('Testing payment failed email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom paymentFailed template from Firestore...');
        const customTemplate = await loadEmailTemplate('paymentFailed');
        
        if (customTemplate) {
          logger.info('✅ Custom paymentFailed template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User', 
            userEmail: testEmail,
            amount: '$29.99',
            planName: 'Monthly Plan'
          });
          subjectText = customTemplate.subject || 'Payment Failed - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User', 
            userEmail: testEmail,
            amount: '$29.99',
            planName: 'Monthly Plan'
          });
          subjectText = templateData.subject || 'Payment Failed - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
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
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Payment failed test email sent successfully');
      } catch (error) {
        logger.error('❌ Payment failed email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Payment Failed Email';
    } else if (templateType === 'giftExpiringSoon') {
      logger.info('Testing gift expiring soon email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom giftExpiringSoon template from Firestore...');
        const customTemplate = await loadEmailTemplate('giftExpiringSoon');
        
        if (customTemplate) {
          logger.info('✅ Custom giftExpiringSoon template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User', 
            userEmail: testEmail,
            daysLeft: 3,
            planName: 'Monthly Gift Plan',
            giftGiverName: 'Test Friend'
          });
          subjectText = customTemplate.subject || 'Your Gifted Research Time Is Ending Soon - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
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
          // Final fallback to simple hardcoded template
          logger.warn('⚠️ No custom template found, using simple fallback');
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
        
        // Send the email via Resend
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Gift expiring soon test email sent successfully');
      } catch (error) {
        logger.error('❌ Gift expiring soon email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Gift Expiring Soon Email';
    } else if (templateType === 'giftPurchaseConfirmation') {
      logger.info('Testing gift purchase confirmation email...');
      
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom giftPurchaseConfirmation template from Firestore...');
        const customTemplate = await loadEmailTemplate('giftPurchaseConfirmation');
        
        if (customTemplate) {
          logger.info('✅ Custom giftPurchaseConfirmation template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            giftGiverEmail: testEmail,
            giftGiverName: 'Test Giver',
            recipientEmail: 'recipient@example.com',
            giftMessage: 'This is a test gift message',
            giftId: 'test-gift-123',
            subscriptionType: 'Monthly Plan',
            pricePaid: '$29.99'
          });
          subjectText = customTemplate.subject || '🎁 Gift Purchase Confirmed - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            giftGiverEmail: testEmail,
            giftGiverName: 'Test Giver',
            recipientEmail: 'recipient@example.com',
            giftMessage: 'This is a test gift message',
            giftId: 'test-gift-123',
            subscriptionType: 'Monthly Plan',
            pricePaid: '$29.99'
          });
          subjectText = templateData.subject || '🎁 Gift Purchase Confirmed - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          logger.info('📧 Using emailService.sendGiftPurchaseConfirmationEmail function');
          emailResult = await emailService.sendGiftPurchaseConfirmationEmail(
            testEmail,
            'Test Giver',
            'recipient@example.com',
            'This is a test gift message',
            'test-gift-123',
            'Monthly Plan',
            '$29.99'
          );
          emailName = 'Gift Purchase Confirmation Email';
          if (emailResult) {
            logger.info('✅ Gift purchase confirmation test email sent successfully');
          } else {
            logger.error('❌ Failed to send gift purchase confirmation email');
          }
          results.tests.giftPurchaseConfirmationEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Gift purchase confirmation test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Gift purchase confirmation email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Gift Purchase Confirmation Email';
    } else if (templateType === 'giftRedeemed') {
      logger.info('Testing gift redeemed (recipient) email...');
      
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom giftRedeemed template from Firestore...');
        const customTemplate = await loadEmailTemplate('giftRedeemed');
        
        if (customTemplate) {
          logger.info('✅ Custom giftRedeemed template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            giftGiverName: 'Test Giver',
            subscriptionType: 'Monthly Plan',
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
          });
          subjectText = customTemplate.subject || '🎉 Gift Successfully Redeemed - Welcome to The Pep Planner!';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            giftGiverName: 'Test Giver',
            subscriptionType: 'Monthly Plan',
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
          });
          subjectText = templateData.subject || '🎉 Gift Successfully Redeemed - Welcome to The Pep Planner!';
          logger.info('✅ Using custom template from admin panel');
        } else {
          logger.info('📧 Using emailService.sendGiftRedeemedEmail function');
          emailResult = await emailService.sendGiftRedeemedEmail(
            testEmail,
            'Test Giver',
            'Monthly Plan',
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
          );
          emailName = 'Gift Redeemed (Recipient) Email';
          if (emailResult) {
            logger.info('✅ Gift redeemed test email sent successfully');
          } else {
            logger.error('❌ Failed to send gift redeemed email');
          }
          results.tests.giftRedeemedEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Gift redeemed test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Gift redeemed email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Gift Redeemed (Recipient) Email';
    } else if (templateType === 'giftRedeemedNotification') {
      logger.info('Testing gift redeemed notification (giver notice) email...');
      
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom giftRedeemedNotification template from Firestore...');
        const customTemplate = await loadEmailTemplate('giftRedeemedNotification');
        
        if (customTemplate) {
          logger.info('✅ Custom giftRedeemedNotification template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          // Remove features if they exist for this template
          const templateWithoutFeatures = { ...customTemplate };
          if (templateWithoutFeatures.features) {
            delete templateWithoutFeatures.features;
          }
          htmlContent = generateEmailHTML(templateWithoutFeatures, { 
            giftGiverName: 'Test Giver',
            recipientEmail: 'recipient@example.com',
            subscriptionType: 'Monthly Plan'
          });
          subjectText = customTemplate.subject || '🎉 Your Gift Was Redeemed - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          // Remove features if they exist for this template
          const templateWithoutFeatures = { ...templateData };
          if (templateWithoutFeatures.features) {
            delete templateWithoutFeatures.features;
          }
          htmlContent = generateEmailHTML(templateWithoutFeatures, { 
            giftGiverName: 'Test Giver',
            recipientEmail: 'recipient@example.com',
            subscriptionType: 'Monthly Plan'
          });
          subjectText = templateData.subject || '🎉 Your Gift Was Redeemed - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          logger.info('📧 Using emailService.sendGiftRedeemedNotificationEmail function');
          emailResult = await emailService.sendGiftRedeemedNotificationEmail(
            testEmail,
            'Test Giver',
            'recipient@example.com',
            'Monthly Plan'
          );
          emailName = 'Gift Redeemed Notification (Giver Notice) Email';
          if (emailResult) {
            logger.info('✅ Gift redeemed notification test email sent successfully');
          } else {
            logger.error('❌ Failed to send gift redeemed notification email');
          }
          results.tests.giftRedeemedNotificationEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Gift redeemed notification test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Gift redeemed notification email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Gift Redeemed Notification (Giver Notice) Email';
    } else if (templateType === 'giftNotification') {
      logger.info('Testing gift received notification email...');
      
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom giftNotification template from Firestore...');
        const customTemplate = await loadEmailTemplate('giftNotification');
        
        if (customTemplate) {
          logger.info('✅ Custom giftNotification template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            recipientName: 'Test Recipient',
            giftGiverName: 'Test Giver',
            giftMessage: 'This is a test gift message',
            giftId: 'test-gift-123',
            subscriptionType: 'Monthly Plan'
          });
          subjectText = customTemplate.subject || '🎁 You\'ve Been Gifted Access to The Pep Planner!';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            recipientName: 'Test Recipient',
            giftGiverName: 'Test Giver',
            giftMessage: 'This is a test gift message',
            giftId: 'test-gift-123',
            subscriptionType: 'Monthly Plan'
          });
          subjectText = templateData.subject || '🎁 You\'ve Been Gifted Access to The Pep Planner!';
          logger.info('✅ Using custom template from admin panel');
        } else {
          logger.info('📧 Using emailService.sendGiftNotificationEmail function');
          emailResult = await emailService.sendGiftNotificationEmail(
            testEmail,
            'Test Recipient',
            'Test Giver',
            'This is a test gift message',
            'test-gift-123',
            'Monthly Plan'
          );
          emailName = 'Gift Received Notification Email';
          if (emailResult) {
            logger.info('✅ Gift notification test email sent successfully');
          } else {
            logger.error('❌ Failed to send gift notification email');
          }
          results.tests.giftNotificationEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Gift notification test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Gift notification email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Gift Received Notification Email';
    } else if (templateType === 'manualLifetimeGrant') {
      logger.info('Testing manual lifetime grant email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom manualLifetimeGrant template from Firestore...');
        const customTemplate = await loadEmailTemplate('manualLifetimeGrant');
        
        if (customTemplate) {
          logger.info('✅ Custom manualLifetimeGrant template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User',
            userEmail: testEmail,
            reason: 'Test reason: This is a test email to verify the lifetime access grant functionality.'
          });
          subjectText = customTemplate.subject || '✅ Lifetime Access Granted by Admin - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User',
            userEmail: testEmail,
            reason: 'Test reason: This is a test email to verify the lifetime access grant functionality.'
          });
          subjectText = templateData.subject || '✅ Lifetime Access Granted by Admin - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback: use the email service function
          logger.info('📧 Using emailService.sendLifetimeAccessEmail function');
          emailResult = await emailService.sendLifetimeAccessEmail(testEmail, 'Test User', 'Test reason: This is a test email to verify the lifetime access grant functionality.');
          emailName = 'Manual Lifetime Grant Email';
          if (emailResult) {
            logger.info('✅ Manual lifetime grant test email sent successfully');
          } else {
            logger.error('❌ Failed to send manual lifetime grant email');
          }
          results.tests.manualLifetimeGrantEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        // Send the email if we generated HTML
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Manual lifetime grant test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Manual lifetime grant email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Manual Lifetime Grant Email';
    } else if (templateType === 'lifetimeAccessGranted') {
      logger.info('Testing lifetime access granted email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom lifetimeAccessGranted template from Firestore...');
        const customTemplate = await loadEmailTemplate('lifetimeAccessGranted');
        
        if (customTemplate) {
          logger.info('✅ Custom lifetimeAccessGranted template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User',
            userEmail: testEmail,
            reason: 'Beta tester'
          });
          subjectText = customTemplate.subject || '🎉 You\'ve Been Granted Lifetime Access to The Pep Planner!';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User',
            userEmail: testEmail,
            reason: 'Beta tester'
          });
          subjectText = templateData.subject || '🎉 You\'ve Been Granted Lifetime Access to The Pep Planner!';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback: use the email service function
          logger.info('📧 Using emailService.sendLifetimeAccessGrantedEmail function');
          emailResult = await emailService.sendLifetimeAccessGrantedEmail(testEmail, 'Beta tester');
          emailName = 'Lifetime Access Granted Email';
          if (emailResult) {
            logger.info('✅ Lifetime access granted test email sent successfully');
          } else {
            logger.error('❌ Failed to send lifetime access granted email');
          }
          results.tests.lifetimeAccessGrantedEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        // Send the email if we generated HTML
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Lifetime access granted test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Lifetime access granted email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Lifetime Access Granted Email';
    } else if (templateType === 'customAnnouncement') {
      logger.info('Testing custom announcement/maintenance email...');
      
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom customAnnouncement template from Firestore...');
        const customTemplate = await loadEmailTemplate('customAnnouncement');
        
        if (customTemplate) {
          logger.info('✅ Custom customAnnouncement template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User',
            userEmail: testEmail,
            firstName: 'Test'
          });
          subjectText = customTemplate.subject || 'Important Update - The Pep Planner';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User',
            userEmail: testEmail,
            firstName: 'Test'
          });
          subjectText = templateData.subject || 'Important Update - The Pep Planner';
          logger.info('✅ Using custom template from admin panel');
        } else {
          logger.info('📧 Using emailService.sendCustomAnnouncementEmail function');
          emailResult = await emailService.sendCustomAnnouncementEmail(testEmail, 'Test User');
          emailName = 'Custom Announcement / Maintenance Email';
          if (emailResult) {
            logger.info('✅ Custom announcement test email sent successfully');
          } else {
            logger.error('❌ Failed to send custom announcement email');
          }
          results.tests.customAnnouncementEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        if (htmlContent) {
          await sendEmailViaResend(testEmail, subjectText, htmlContent);
          emailResult = true;
          logger.info('✅ Custom announcement test email sent successfully');
        }
      } catch (error) {
        logger.error('❌ Custom announcement email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Custom Announcement / Maintenance Email';
    } else if (templateType === 'trialExpiredSurvey') {
      logger.info('Testing trial expired survey email...');
      
      // Try to load custom template from Firestore first
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom trialExpiredSurvey template from Firestore...');
        const customTemplate = await loadEmailTemplate('trialExpiredSurvey');
        
        if (customTemplate) {
          logger.info('✅ Custom trialExpiredSurvey template found in Firestore');
          logger.info('📋 Template fields:', Object.keys(customTemplate));
          htmlContent = generateEmailHTML(customTemplate, { 
            userName: 'Test User',
            userEmail: testEmail,
            surveyLink: 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header'
          });
          subjectText = customTemplate.subject || 'Quick Survey: Help Us Improve The Pep Planner 📊';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          // Fallback to templateData from admin panel
          logger.info('📧 No Firestore template, using templateData from admin panel');
          logger.info('🔍 Template data fields:', Object.keys(templateData));
          htmlContent = generateEmailHTML(templateData, { 
            userName: 'Test User',
            userEmail: testEmail,
            surveyLink: 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header'
          });
          subjectText = templateData.subject || 'Quick Survey: Help Us Improve The Pep Planner 📊';
          logger.info('✅ Using custom template from admin panel');
        } else {
          // Final fallback: use the email service function
          logger.info('📧 Using emailService.sendTrialExpiredSurveyEmail function');
          emailResult = await emailService.sendTrialExpiredSurveyEmail(testEmail, 'Test User', 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header');
          emailName = 'Trial Expired Survey Email';
          if (emailResult) {
            logger.info('✅ Trial expired survey test email sent successfully');
          } else {
            logger.error('❌ Failed to send trial expired survey email');
          }
          results.tests.trialExpiredSurveyEmail = {
            success: emailResult,
            message: emailResult ? 'Email sent successfully' : 'Email failed to send'
          };
          return results;
        }
        
        // Send the email if we generated HTML
        if (htmlContent) {
          const sendResult = await sendEmailViaResend(testEmail, subjectText, htmlContent);
          if (sendResult && sendResult.success) {
            emailResult = true;
            logger.info('✅ Trial expired survey test email sent successfully');
            logger.info(`📧 Email ID: ${sendResult.emailId}`);
          } else {
            emailResult = false;
            logger.error('❌ Failed to send trial expired survey email');
          }
        } else {
          logger.error('❌ No HTML content generated for trial expired survey email');
          emailResult = false;
        }
      } catch (error) {
        logger.error('❌ Trial expired survey email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Trial Expired Survey Email';
    } else if (templateType === 'trialExtension') {
      logger.info('Testing trial extension email...');
      
      try {
        // Try to load custom template or use templateData
        let htmlContent, subjectText;
        const emailService = require('./emailService');
        const { loadEmailTemplate, generateEmailHTML } = emailService;
        
        logger.info('📧 Attempting to load trialExtension template...');
        let customTemplate = null;
        
        if (templateData) {
          logger.info('✅ Using templateData from admin panel');
          customTemplate = templateData;
        } else {
          try {
            customTemplate = await loadEmailTemplate('trialExtension');
            if (customTemplate) {
              logger.info('✅ Found trialExtension template in Firestore');
            } else {
              logger.info('⚠️ No trialExtension template in Firestore');
            }
          } catch (loadError) {
            logger.warn('⚠️ Failed to load template from Firestore:', loadError.message);
          }
        }
        
        if (customTemplate) {
          logger.info('✅ Using custom trialExtension template');
          const testDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          logger.info('📧 Generating HTML with variables:', { userName: 'Test User', userEmail: testEmail, daysAdded: 7, newEndDate: testDate });
          try {
            htmlContent = generateEmailHTML(customTemplate, { 
              userName: 'Test User',
              userEmail: testEmail,
              daysAdded: 7,
              newEndDate: testDate,
              adminNote: 'This is a test extension from the admin panel'
            });
            subjectText = customTemplate.subject || '🎉 Your Research Trial Has Been Extended!';
            logger.info('✅ HTML generated successfully, length:', htmlContent.length);
          } catch (htmlError) {
            logger.error('❌ Failed to generate HTML:', htmlError);
            logger.error('❌ HTML generation error message:', htmlError.message);
            logger.error('❌ HTML generation error stack:', htmlError.stack);
            throw new Error(`Failed to generate email HTML: ${htmlError.message}`);
          }
        } else {
          // Fallback to themed default template
          logger.info('📧 Using themed default trialExtension template');
          const defaultTemplate = {
            heading: '🎉 Your Research Trial Has Been Extended!',
            greeting: `Hi Test User,`,
            mainMessage: `Great news! We've added 7 days to your research trial. Your trial now ends on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
            ctaText: 'Continue Researching',
            ctaLink: 'https://thepepplanner.app/app/dashboard',
            highlightTitle: '⏰ New Trial End Date',
            highlightMessage: `Your extended trial ends on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Make the most of your extra time to explore all features!`,
            postCtaNote: 'If you have any questions, feel free to reach out to our support team.',
            features: []
          };
          try {
            htmlContent = generateEmailHTML(defaultTemplate, { 
              userName: 'Test User', 
              userEmail: testEmail, 
              daysAdded: 7, 
              newEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              adminNote: 'This is a test extension from the admin panel'
            });
            subjectText = '🎉 Your Research Trial Has Been Extended!';
            logger.info('✅ Default template HTML generated successfully, length:', htmlContent.length);
          } catch (htmlError) {
            logger.error('❌ Failed to generate default template HTML:', htmlError);
            logger.error('❌ HTML generation error message:', htmlError.message);
            logger.error('❌ HTML generation error stack:', htmlError.stack);
            throw new Error(`Failed to generate email HTML: ${htmlError.message}`);
          }
        }
        
        logger.info('📧 Sending email via Resend to:', testEmail);
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        logger.info('✅ Trial extension test email sent successfully');
      } catch (error) {
        logger.error('❌ Trial extension email failed:', error);
        logger.error('❌ Error message:', error.message);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
        emailName = `Trial Extension Email - ${error.message}`;
      }
      // Don't overwrite emailName if it already has an error message
      if (!emailName || emailName === 'Trial Extension Email') {
        emailName = 'Trial Extension Email';
      }
    } else if (templateType === 'winBack') {
      logger.info('Testing win-back campaign email...');
      
      let htmlContent, subjectText;
      const { loadEmailTemplate, generateEmailHTML } = require('./emailService');
      
      try {
        logger.info('📧 Attempting to load custom winBack template from Firestore...');
        const customTemplate = await loadEmailTemplate('winBack');
        
        if (customTemplate) {
          logger.info('✅ Custom winBack template found in Firestore');
          htmlContent = generateEmailHTML(customTemplate, { userName: 'Test User', userEmail: testEmail });
          subjectText = customTemplate.subject || 'The doors are open — and we saved you a spot';
          logger.info('✅ Using custom template from Firestore');
        } else if (templateData) {
          logger.info('📧 No Firestore template, using templateData from admin panel');
          htmlContent = generateEmailHTML(templateData, { userName: 'Test User', userEmail: testEmail });
          subjectText = templateData.subject || 'The doors are open — and we saved you a spot';
          logger.info('✅ Using custom template from admin panel');
        } else {
          logger.info('📧 Using emailService.sendWinBackEmail fallback');
          emailResult = await emailService.sendWinBackEmail(testEmail, 'Test User', null);
          emailName = 'Win-Back Campaign Email';
          if (emailResult) {
            logger.info('✅ Win-back test email sent successfully');
          } else {
            logger.error('❌ Failed to send win-back email');
          }
          results.tests.winBackEmail = { success: emailResult, message: emailResult ? 'Email sent successfully' : 'Email failed to send' };
          return results;
        }
        
        if (htmlContent) {
          const sendResult = await sendEmailViaResend(testEmail, subjectText, htmlContent);
          if (sendResult && sendResult.success) {
            emailResult = true;
            logger.info('✅ Win-back test email sent successfully');
            logger.info(`📧 Email ID: ${sendResult.emailId}`);
          } else {
            emailResult = false;
            logger.error('❌ Failed to send win-back email');
          }
        } else {
          logger.error('❌ No HTML content generated for win-back email');
          emailResult = false;
        }
      } catch (error) {
        logger.error('❌ Win-back email failed:', error);
        logger.error('❌ Error stack:', error.stack);
        emailResult = false;
      }
      emailName = 'Win-Back Campaign Email';
    } else if (templateData && (templateData.subject != null || templateData.heading != null || templateData.greeting != null)) {
      // Generic: any template with data from admin – render and send so "Send test" works for EVERY template
      logger.info(`📧 Sending test for template type "${templateType}" using admin template data`);
      const { generateEmailHTML } = require('./emailService');
      const testVars = {
        userName: 'Test User',
        userEmail: testEmail,
        verificationLink: 'https://thepepplanner.app/app/account',
        resetLink: 'https://thepepplanner.app/app/account',
        activationLink: 'https://thepepplanner.app/activate?token=test-token',
        surveyLink: 'https://thepepplanner.app/app/account',
        newEmail: testEmail,
        oldEmail: 'previous@example.com',
        reason: 'Test dispute / refund (test email)',
        giftGiverName: 'Test Giver',
        recipientEmail: 'recipient@example.com',
        subscriptionType: 'Monthly Plan',
        pricePaid: '$29.99',
        giftId: 'test-gift-id',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        daysAdded: 7,
        newEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')
      };
      try {
        const htmlContent = generateEmailHTML(templateData, testVars);
        const subjectText = templateData.subject || `Test - ${templateType}`;
        await sendEmailViaResend(testEmail, subjectText, htmlContent);
        emailResult = true;
        emailName = `${templateType} (test)`;
        logger.info(`✅ Generic test email sent for ${templateType}`);
      } catch (error) {
        logger.error(`❌ Generic test email failed for ${templateType}:`, error);
        emailResult = false;
        emailName = `Failed (${templateType})`;
      }
    } else {
      // No template data: send placeholder so caller still gets a result
      logger.info('⚠️ No template type or data, sending placeholder...');
      try {
        await sendEmailViaResend(
          testEmail,
          `Test Email - ${templateType || 'Unknown Template'}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #6366f1;">Test Email</h1>
              <p>This is a test email for template type: <strong>${templateType || 'Unknown'}</strong></p>
              <p>Select a template and click Send test again to send the actual template.</p>
              <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
            </div>
          `
        );
        emailResult = true;
        emailName = `Test Email (${templateType})`;
      } catch (error) {
        logger.error('❌ Placeholder test email failed:', error);
        emailResult = false;
        emailName = `Failed Test (${templateType})`;
      }
    }

    // Single template test
    results.tests[templateType] = {
      success: emailResult,
      message: emailResult ? 'Email sent successfully' : 'Email failed to send',
      error: emailResult ? null : (emailName.includes(' - ') ? emailName.split(' - ')[1] : 'Unknown error')
    };

    logger.info(`✅ ${emailName} test completed: ${emailResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Include more error details in response
    const responseMessage = emailResult 
      ? `${emailName} sent successfully` 
      : `${emailName} failed to send${emailName.includes(' - ') ? `: ${emailName.split(' - ')[1]}` : ''}`;
    
    return {
      success: emailResult,
      message: responseMessage,
      error: emailResult ? null : (emailName.includes(' - ') ? emailName.split(' - ')[1] : 'Unknown error'),
      results
    };

  } catch (error) {
    logger.error('❌ Email system test failed:', error);
    logger.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message || 'Unknown error',
      errorCode: error.code,
      errorStack: error.stack,
      message: `Email system test failed: ${error.message || 'Unknown error'}`,
      results
    };
  }
});
