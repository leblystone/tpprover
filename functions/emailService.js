// 📧 Email Service for The Pep Planner
// Sends transactional emails via SendGrid

const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailTemplates = require('./emailTemplates');

// SendGrid API key will be stored in Firebase environment config
// Run: firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"

/**
 * Send email using SendGrid
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<boolean>}
 */
async function sendEmail(to, subject, html) {
  try {
    // Get SendGrid API key from environment variables (Firebase Functions v2)
    // The secret is automatically injected as an environment variable when the function is called
    let sendgridApiKey = process.env.SENDGRID_API_KEY?.trim().replace(/\r?\n/g, '');
    
    logger.info('🔑 API Key being used:', sendgridApiKey ? `${sendgridApiKey.substring(0, 10)}...` : 'undefined');
    logger.info('🔑 API Key length:', sendgridApiKey ? sendgridApiKey.length : 0);
    
    if (!sendgridApiKey) {
      logger.warn('⚠️ SendGrid not configured - email not sent');
      logger.info('📧 Would have sent email to:', to, 'Subject:', subject);
      return false;
    }
    
    // Validate API key format
    if (!sendgridApiKey.startsWith('SG.') || sendgridApiKey.length < 60) {
      logger.error('❌ Invalid SendGrid API key format. Key must start with "SG." and be at least 60 characters');
      logger.error('API key provided:', sendgridApiKey.substring(0, 20) + '...');
      logger.error('API key length:', sendgridApiKey.length);
      return false;
    }

    // Dynamic import of SendGrid (only load if configured)
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey);

    const msg = {
      to,
      from: {
        email: 'contact@thepepplanner.com',
        name: 'The Pep Planner'
      },
      subject,
      html,
    };

    const result = await sgMail.send(msg);
    logger.info('✅ Email sent successfully to:', to, 'Status:', result[0]?.statusCode);
    return true;
    
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    return false;
  }
}

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (userEmail, userName = null) => {
  // Try to load custom template from Firestore, fallback to hardcoded
  try {
    const customTemplate = await loadEmailTemplate('welcome');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Welcome to The Pep Planner! 🎉';
      const html = generateEmailHTML(customTemplate, { userName, userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load custom welcome template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'Welcome to The Pep Planner! 🎉';
  const html = emailTemplates.welcomeEmail(userName, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send email verification
 */
exports.sendVerificationEmail = async (userEmail, verificationLink) => {
  try {
    const customTemplate = await loadEmailTemplate('verification');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Verify your email for The Pep Planner';
      const html = generateEmailHTML(customTemplate, { verificationLink });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) {
    logger.warn('Failed to load custom verification template, using default:', e);
  }
  const subject = 'Verify your email for The Pep Planner';
  const html = emailTemplates.verificationEmail(verificationLink);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send lifetime access granted email (for manual admin grants)
 * Uses manualLifetimeGrant template instead of lifetimeAccessGranted
 */
exports.sendLifetimeAccessEmail = async (userEmail, userName = null) => {
  // Try to load manual grant template from Firestore first
  try {
    const customTemplate = await loadEmailTemplate('manualLifetimeGrant');
    if (customTemplate) {
      const subject = customTemplate.subject || '✅ Lifetime Access Granted by Admin - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { userName, userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load manual lifetime grant template, trying fallback:', error);
  }
  
  // Fallback to regular lifetime access template if manual grant template doesn't exist
  try {
    const customTemplate = await loadEmailTemplate('lifetimeAccessGranted');
    if (customTemplate) {
      const subject = customTemplate.subject || '🎉 You\'ve Been Granted Lifetime Access to The Pep Planner!';
      const html = generateEmailHTML(customTemplate, { userName, userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load lifetime access template, using default:', error);
  }
  
  // Final fallback to hardcoded template
  const subject = '✅ Lifetime Access Granted by Admin - The Pep Planner';
  const html = emailTemplates.lifetimeAccessGrantedEmail(userEmail, userName || 'User');
  return sendEmail(userEmail, subject, html);
};

/**
 * Send custom password reset email with Firebase token
 */
exports.sendCustomPasswordResetEmail = async (userEmail, resetToken) => {
  // Use environment variable for base URL, fallback to production
  // For local development, you can set BASE_URL=http://localhost:5173
  const baseUrl = process.env.BASE_URL || 'https://thepepplanner.app';
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  logger.info(`🔗 Password reset link: ${resetLink}`);
  
  // Try to load custom template from Firestore, fallback to hardcoded
  try {
    const customTemplate = await loadEmailTemplate('passwordReset');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Reset your password for The Pep Planner';
      const html = generateEmailHTML(customTemplate, { resetLink });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load custom password reset template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'Reset your password for The Pep Planner';
  const html = emailTemplates.passwordResetEmail(resetLink, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send custom verification email with Firebase token
 */
exports.sendCustomVerificationEmail = async (userEmail, verificationToken) => {
  // Use environment variable for base URL, fallback to production
  // For local development, you can set BASE_URL=http://localhost:5173
  const baseUrl = process.env.BASE_URL || 'https://thepepplanner.app';
  const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  logger.info(`🔗 Verification link: ${verificationLink}`);
  
  // Try to load custom template from Firestore, fallback to hardcoded
  try {
    const customTemplate = await loadEmailTemplate('verification');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Verify your email for The Pep Planner';
      const html = generateEmailHTML(customTemplate, { verificationLink });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load custom verification template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'Verify your email for The Pep Planner';
  const html = emailTemplates.verificationEmail(verificationLink);
  return sendEmail(userEmail, subject, html);
};

/**
 * Load email template from Firestore
 */
async function loadEmailTemplate(templateType) {
  try {
    logger.info(`📧 Loading email template: ${templateType}`);
    const templateRef = admin.firestore().collection('emailTemplates').doc(templateType);
    const templateDoc = await templateRef.get();
    
    if (templateDoc.exists) {
      const data = templateDoc.data();
      logger.info(`✅ Found template ${templateType} in Firestore`);
      return data;
    } else {
      logger.warn(`⚠️ Template ${templateType} not found in Firestore`);
    }
    return null;
  } catch (error) {
    logger.error(`❌ Failed to load email template ${templateType}:`, error);
    return null;
  }
}

/**
 * Generate email HTML from admin template
 */
exports.generateEmailHTML = function generateEmailHTML(template, variables = {}) {
  const colors = template.colors || {
    primary: '#344E41',
    primaryLight: '#3A5A40',
    secondary: '#A3B18A',
    sage: '#D4D7CD',
    white: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280'
  };

  // Replace variables in template text fields BEFORE generating HTML
  const processedTemplate = { ...template };
  
  // Function to replace variables in a string
  const replaceVars = (text) => {
    if (!text) return text;
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      // Handle null/undefined values gracefully
      const replacement = value || '';
      result = result.replace(new RegExp(`%${key.toUpperCase()}%`, 'g'), replacement);
    });
    return result;
  };

  // Replace variables in all text fields
  processedTemplate.greeting = replaceVars(template.greeting);
  processedTemplate.mainMessage = replaceVars(template.mainMessage);
  processedTemplate.highlightTitle = replaceVars(template.highlightTitle);
  processedTemplate.highlightMessage = replaceVars(template.highlightMessage);
  processedTemplate.ctaText = replaceVars(template.ctaText);
  processedTemplate.ctaLink = replaceVars(template.ctaLink);
  processedTemplate.subject = replaceVars(template.subject);
  processedTemplate.heading = replaceVars(template.heading);
  
  // Replace variables in features array
  if (template.features && Array.isArray(template.features)) {
    processedTemplate.features = template.features.map(f => replaceVars(f));
  }

  // Generate HTML from processed template
  let html = template.html || generateDefaultHTML(processedTemplate, colors);
  
  // Also replace variables in custom HTML if provided
  Object.entries(variables).forEach(([key, value]) => {
    const replacement = value || '';
    html = html.replace(new RegExp(`%${key.toUpperCase()}%`, 'g'), replacement);
  });

  return html;
}

/**
 * Generate default HTML from template data
 */
function generateDefaultHTML(template, colors) {
  // Use Firebase Storage URL if available, otherwise fallback to domain
  // Firebase Storage is more trusted by email clients than regular domains
  const ASSET_BASE = process.env.ASSET_BASE_URL || 'https://thepepplanner.app';
  // Try Firebase Storage first (most reliable for email clients), then domain
  const LOGO_URL = process.env.LOGO_URL || `https://thepepplanner.app/tpp_logo.png`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: ${colors.sage};">
  <div style="background-color: ${colors.sage}; padding: 20px 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%); padding: 40px 20px; text-align: center;">
        <img src="${LOGO_URL}" alt="The Pep Planner" style="width: 120px; height: auto; margin: 0 auto 12px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)); display: block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div style="display: none; color: ${colors.sage}; font-size: 24px; font-weight: 700; margin-bottom: 12px;">The Pep Planner</div>
        <div style="color: ${colors.sage}; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">Organize Your Research</div>
      </div>
      <div style="padding: 40px 32px; color: ${colors.text};">
        <h1 style="color: ${colors.primary}; font-size: 28px; margin: 0 0 16px 0;">${template.heading || 'Email'}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text};">
          ${template.greeting || ''}
        </p>
        
        ${template.mainMessage ? `<p style="font-size: 16px; line-height: 1.6; color: ${colors.text};">${template.mainMessage}</p>` : ''}

        ${template.highlightTitle ? `
        <div style="background-color: #F0FDF4; border-left: 4px solid ${colors.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
          <p style="margin: 0; font-weight: 600; color: ${colors.primary};">${template.highlightTitle}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.textLight};">
            ${template.highlightMessage || ''}
          </p>
        </div>
        ` : ''}

        ${template.features && template.features.length > 0 ? `
        <h2 style="color: ${colors.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do:</h2>
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          ${template.features.map(f => `
          <li style="padding: 12px 0; padding-left: 32px; position: relative;">
            <span style="position: absolute; left: 0; color: ${colors.secondary}; font-weight: bold; font-size: 18px;">✓</span>
            ${f}
          </li>
          `).join('')}
        </ul>
        ` : ''}

        ${template.ctaText ? `
        <center>
          <a href="${template.ctaLink || '#'}" style="display: inline-block; padding: 16px 32px; background-color: ${colors.primary}; color: ${colors.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            ${template.ctaText}
          </a>
        </center>
        ` : ''}

        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin-top: 24px;">
          Best,<br>
          <strong style="color: ${colors.primary};">The Pep Planner Team</strong>
        </p>
      </div>
      <div style="background-color: ${colors.sage}; padding: 32px; text-align: center; color: ${colors.textLight}; font-size: 13px;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${colors.text};">The Pep Planner</p>
        <p style="margin: 0 0 16px 0;">Your research management platform</p>
        <p style="margin: 0;">
          <a href="https://thepepplanner.app" style="color: ${colors.primary}; text-decoration: none;">Visit Website</a> • 
          <a href="https://thepepplanner.app/app/dashboard" style="color: ${colors.primary}; text-decoration: none;">Dashboard</a>
        </p>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: ${colors.textLight};">
          © 2025 The Pep Planner. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (userEmail, resetLink) => {
  try {
    const customTemplate = await loadEmailTemplate('passwordReset');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Reset your password for The Pep Planner';
      const html = generateEmailHTML(customTemplate, { resetLink });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) {
    logger.warn('Failed to load custom password reset template, using default:', e);
  }
  const subject = 'Reset your password for The Pep Planner';
  const html = emailTemplates.passwordResetEmail(resetLink, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send trial ending soon reminder
 */
exports.sendTrialEndingEmail = async (userEmail, daysLeft) => {
  // Try Firestore template
  try {
    const customTemplate = await loadEmailTemplate('trialEnding');
    if (customTemplate) {
      logger.info('✅ Using custom trialEnding template from Firestore');
      const subject = customTemplate.subject || `Your trial ends in ${daysLeft} days - The Pep Planner`;
      const html = generateEmailHTML(customTemplate, { daysLeft });
      return sendEmail(userEmail, subject, html);
    } else {
      logger.warn('⚠️ No custom trialEnding template found in Firestore, using default');
    }
  } catch (e) {
    logger.error('❌ Failed to load custom trialEnding template:', e);
  }
  const subject = `Your trial ends in ${daysLeft} days - The Pep Planner`;
  const html = emailTemplates.trialEndingEmail(daysLeft, userEmail);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send subscription confirmation
 */
exports.sendSubscriptionConfirmationEmail = async (userEmail, plan, interval, price) => {
  try {
    const customTemplate = await loadEmailTemplate('subscription');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Subscription Confirmed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { plan, interval, price });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = 'Subscription Confirmed - The Pep Planner';
  const html = emailTemplates.subscriptionConfirmedEmail(plan, interval, price);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send lifetime access granted email
 */
exports.sendLifetimeAccessGrantedEmail = async (userEmail, reason = 'Beta tester') => {
  try {
    const customTemplate = await loadEmailTemplate('lifetimeAccessGranted');
    if (customTemplate) {
      const subject = customTemplate.subject || '🎉 You\'ve Been Granted Lifetime Access to The Pep Planner!';
      const html = generateEmailHTML(customTemplate, { userEmail, userName: reason });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) {
    logger.warn('Failed to load custom lifetime access template, using default:', e);
  }
  const subject = '🎉 Lifetime Access Granted - The Pep Planner';
  const html = emailTemplates.lifetimeAccessGrantedEmail(userEmail, reason);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send subscription confirmed email (alias for testEmailSystem)
 */
exports.sendSubscriptionConfirmedEmail = async (userEmail, plan) => {
  try {
    const customTemplate = await loadEmailTemplate('subscription');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Subscription Confirmed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { plan, interval: 'month', price: '$8.99' });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { 
    logger.warn('Failed to load custom subscription template, using default:', e);
  }
  const subject = 'Subscription Confirmed - The Pep Planner';
  const html = emailTemplates.subscriptionConfirmedEmail(plan, 'month', '$8.99');
  return sendEmail(userEmail, subject, html);
};

/**
 * Send payment failed email
 */
exports.sendPaymentFailedEmail = async (userEmail, amount, currency, invoiceUrl) => {
  try {
    const customTemplate = await loadEmailTemplate('paymentFailed');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Payment Failed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { amount, currency, invoiceUrl });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = 'Payment Failed - The Pep Planner';
  const html = emailTemplates.paymentFailedEmail(amount, currency, invoiceUrl);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send payment successful email
 */
exports.sendPaymentSuccessfulEmail = async (userEmail, amount, currency, receiptUrl) => {
  try {
    const customTemplate = await loadEmailTemplate('paymentSuccessful');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Payment Confirmed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { amount, currency, receiptUrl });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = 'Payment Confirmed - The Pep Planner';
  const html = emailTemplates.paymentSuccessfulEmail(amount, currency, receiptUrl);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send subscription cancelled email
 */
exports.sendSubscriptionCancelledEmail = async (userEmail, planName, endDate) => {
  try {
    const customTemplate = await loadEmailTemplate('subscriptionCancelled');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Subscription Cancelled - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { planName, endDate });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = 'Subscription Cancelled - The Pep Planner';
  const html = emailTemplates.subscriptionCancelledEmail(planName, endDate);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send renewal reminder email
 */
exports.sendRenewalReminderEmail = async (userEmail, planName) => {
  try {
    const customTemplate = await loadEmailTemplate('renewalReminder');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Your subscription renews in 3 days - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { planName });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = 'Your subscription renews in 3 days - The Pep Planner';
  const html = emailTemplates.renewalReminderEmail(planName);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send weekly research reminder email
 */
exports.sendWeeklyResearchReminderEmail = async (userEmail, firstName) => {
  try {
    const customTemplate = await loadEmailTemplate('weeklyReminder');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Weekly Research Check-in - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { firstName });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = 'Weekly Research Check-in - The Pep Planner';
  const html = emailTemplates.weeklyResearchReminderEmail(firstName);
  return sendEmail(userEmail, subject, html);
};

// ===== GIFT ACCESS EMAIL FUNCTIONS =====

/**
 * Send gift notification email to recipient
 */
exports.sendGiftNotificationEmail = async (recipientEmail, recipientName, giftGiverName, giftMessage, giftId, subscriptionType) => {
  try {
    const customTemplate = await loadEmailTemplate('giftNotification');
    if (customTemplate) {
      const subject = customTemplate.subject || '🎁 You\'ve Received a Gift Subscription to The Pep Planner!';
      const html = generateEmailHTML(customTemplate, { recipientName, giftGiverName, giftMessage, giftId, subscriptionType });
      return sendEmail(recipientEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = '🎁 You\'ve Received a Gift Subscription to The Pep Planner!';
  const html = emailTemplates.giftNotificationEmail(recipientName, giftGiverName, giftMessage, giftId, subscriptionType);
  return sendEmail(recipientEmail, subject, html);
};

/**
 * Send gift purchase confirmation email to giver
 */
exports.sendGiftPurchaseConfirmationEmail = async (giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid) => {
  try {
    const customTemplate = await loadEmailTemplate('giftPurchaseConfirmation');
    if (customTemplate) {
      const subject = customTemplate.subject || '🎁 Gift Purchase Confirmed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid });
      return sendEmail(giftGiverEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = '🎁 Gift Purchase Confirmed - The Pep Planner';
  const html = emailTemplates.giftPurchaseConfirmationEmail(giftGiverEmail, giftGiverName, recipientEmail, giftMessage, giftId, subscriptionType, pricePaid);
  return sendEmail(giftGiverEmail, subject, html);
};

/**
 * Send gift redeemed confirmation email to recipient
 */
exports.sendGiftRedeemedEmail = async (recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate) => {
  try {
    const customTemplate = await loadEmailTemplate('giftRedeemed');
    if (customTemplate) {
      const subject = customTemplate.subject || '🎉 Gift Successfully Redeemed - Welcome to The Pep Planner!';
      const html = generateEmailHTML(customTemplate, { giftGiverName, subscriptionType, subscriptionEndDate });
      return sendEmail(recipientEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = '🎉 Gift Successfully Redeemed - Welcome to The Pep Planner!';
  const html = emailTemplates.giftRedeemedEmail(recipientEmail, giftGiverName, subscriptionType, subscriptionEndDate);
  return sendEmail(recipientEmail, subject, html);
};

/**
 * Send gift redeemed notification email to giver
 */
exports.sendGiftRedeemedNotificationEmail = async (giftGiverEmail, giftGiverName, recipientEmail, subscriptionType) => {
  try {
    const customTemplate = await loadEmailTemplate('giftRedeemedNotification');
    if (customTemplate) {
      const subject = customTemplate.subject || '🎉 Your Gift Was Redeemed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { giftGiverName, recipientEmail, subscriptionType });
      return sendEmail(giftGiverEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = '🎉 Your Gift Was Redeemed - The Pep Planner';
  const html = emailTemplates.giftRedeemedNotificationEmail(giftGiverEmail, giftGiverName, recipientEmail, subscriptionType);
  return sendEmail(giftGiverEmail, subject, html);
};

/**
 * Send gift subscription expiring soon email
 */
exports.sendGiftExpiringSoonEmail = async (recipientEmail, planName, daysLeft, giftGiverName) => {
  try {
    const customTemplate = await loadEmailTemplate('giftExpiringSoon');
    if (customTemplate) {
      const subject = customTemplate.subject || `🎁 Your Gifted Research Time Is Ending in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'} - The Pep Planner`;
      const html = generateEmailHTML(customTemplate, { planName, daysLeft, giftGiverName });
      return sendEmail(recipientEmail, subject, html);
    }
  } catch (e) { /* ignore */ }
  const subject = `🎁 Your Gifted Research Time Is Ending in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'} - The Pep Planner`;
  const html = emailTemplates.giftExpiringSoonEmail(recipientEmail, planName, daysLeft, giftGiverName);
  return sendEmail(recipientEmail, subject, html);
};

/**
 * Send custom announcement/maintenance email
 * Use this for app-wide announcements, maintenance notices, downtime alerts, etc.
 */
exports.sendCustomAnnouncementEmail = async (userEmail, userName = null) => {
  try {
    const customTemplate = await loadEmailTemplate('customAnnouncement');
    if (customTemplate) {
      const subject = customTemplate.subject || 'Important Update - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { userName, userEmail, firstName: userName?.split(' ')[0] || 'User' });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load custom announcement template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'Important Update - The Pep Planner';
  const html = emailTemplates.lifetimeAccessGrantedEmail(userEmail, userName || 'User'); // Reuse structure
  return sendEmail(userEmail, subject, html);
};

