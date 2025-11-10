// 📧 Email Service for The Pep Planner
// Sends transactional emails via SendGrid

const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailTemplates = require('./emailTemplates');
const { fetchFounderState } = require('./founderOffer');

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
    const statusCode = result[0]?.statusCode;
    const headers = result[0]?.headers;
    
    logger.info('✅ Email sent successfully to:', to);
    logger.info('📊 SendGrid Response Status:', statusCode);
    logger.info('📊 SendGrid Response Headers:', JSON.stringify(headers));
    logger.info('📊 Full SendGrid Response:', JSON.stringify(result));
    
    // SendGrid returns 202 for accepted emails
    if (statusCode === 202) {
      logger.info('✅ Email accepted by SendGrid and queued for delivery');
      return true;
    } else {
      logger.warn('⚠️ Unexpected SendGrid status code:', statusCode);
      return true; // Still return true if SendGrid accepted it
    }
    
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

// Export the base sendEmail function
exports.sendEmail = sendEmail;

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
exports.sendLifetimeAccessEmail = async (userEmail, userName = null, reason = null) => {
  logger.info(`📧 sendLifetimeAccessEmail called for: ${userEmail}`);
  logger.info(`📧 Parameters: userName=${userName}, reason=${reason}`);
  
  // Try to load manual grant template from Firestore first
  try {
    logger.info('📧 Attempting to load manualLifetimeGrant template from Firestore...');
    const customTemplate = await loadEmailTemplate('manualLifetimeGrant');
    if (customTemplate) {
      logger.info('✅ Found manualLifetimeGrant template in Firestore');
      logger.info('📋 Template fields available:', Object.keys(customTemplate));
      logger.info('📋 Template has subject:', !!customTemplate.subject);
      logger.info('📋 Template has heading:', !!customTemplate.heading);
      logger.info('📋 Template has greeting:', !!customTemplate.greeting);
      logger.info('📋 Template has mainMessage:', !!customTemplate.mainMessage);
      logger.info('📋 Template has reason variable support:', !!customTemplate.mainMessage?.includes('%REASON%'));
      
      const subject = customTemplate.subject || '✅ Lifetime Access Granted by Admin - The Pep Planner';
      logger.info(`📧 Generating HTML with subject: ${subject}`);
      logger.info(`📧 Variables being passed: userName=${userName}, userEmail=${userEmail}, reason=${reason}`);
      
      const html = generateEmailHTML(customTemplate, { userName, userEmail, reason });
      logger.info(`📧 HTML generated, length: ${html.length} characters`);
      logger.info('✅ Using manualLifetimeGrant template from Firestore');
      
      const result = await sendEmail(userEmail, subject, html);
      logger.info(`📧 sendEmail returned: ${result}`);
      return result;
    } else {
      logger.warn('⚠️ manualLifetimeGrant template not found in Firestore - template returned null');
      logger.warn('⚠️ This means the template document does not exist or is empty');
    }
  } catch (error) {
    logger.error('❌ Failed to load manual lifetime grant template:', error);
    logger.error('❌ Error message:', error.message);
    logger.error('❌ Error stack:', error.stack);
  }
  
  // Fallback to regular lifetime access template if manual grant template doesn't exist
  try {
    logger.info('📧 Attempting to load lifetimeAccessGranted template from Firestore...');
    const customTemplate = await loadEmailTemplate('lifetimeAccessGranted');
    if (customTemplate) {
      logger.info('✅ Found lifetimeAccessGranted template in Firestore');
      const subject = customTemplate.subject || '🎉 You\'ve Been Granted Lifetime Access to The Pep Planner!';
      const html = generateEmailHTML(customTemplate, { userName, userEmail, reason });
      const result = await sendEmail(userEmail, subject, html);
      logger.info(`📧 sendEmail returned: ${result}`);
      return result;
    } else {
      logger.info('⚠️ lifetimeAccessGranted template not found in Firestore');
    }
  } catch (error) {
    logger.warn('Failed to load lifetime access template, using default:', error);
    logger.warn('Error details:', error.message, error.stack);
  }
  
  // Final fallback to hardcoded template
  logger.info('📧 Using hardcoded template fallback');
  const subject = '✅ Lifetime Access Granted by Admin - The Pep Planner';
  const html = emailTemplates.lifetimeAccessGrantedEmail(userEmail, userName || 'User');
  const result = await sendEmail(userEmail, subject, html);
  logger.info(`📧 sendEmail returned: ${result}`);
  return result;
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
      logger.info(`📋 Template document ID: ${templateDoc.id}`);
      logger.info(`📋 Template has ${Object.keys(data).length} fields`);
      logger.info(`📋 Template field names: ${Object.keys(data).join(', ')}`);
      
      // Log key template fields
      if (data.name) logger.info(`📋 Template name: ${data.name}`);
      if (data.subject) logger.info(`📋 Template subject: ${data.subject}`);
      if (data.heading) logger.info(`📋 Template heading: ${data.heading}`);
      if (data.greeting) logger.info(`📋 Template greeting: ${data.greeting.substring(0, 50)}...`);
      if (data.mainMessage) logger.info(`📋 Template mainMessage: ${data.mainMessage.substring(0, 50)}...`);
      
      // If template doesn't have colors, try to load from _branding doc
      if (!data.colors) {
        logger.info(`🎨 Template ${templateType} missing colors, loading from _branding...`);
        try {
          const brandingRef = admin.firestore().collection('emailTemplates').doc('_branding');
          const brandingDoc = await brandingRef.get();
          if (brandingDoc.exists && brandingDoc.data().colors) {
            data.colors = brandingDoc.data().colors;
            logger.info(`✅ Loaded colors from _branding doc`);
          } else {
            logger.warn(`⚠️ _branding doc not found or missing colors`);
          }
        } catch (brandingError) {
          logger.warn(`⚠️ Could not load colors from _branding:`, brandingError);
        }
      } else {
        logger.info(`✅ Template ${templateType} has embedded colors`);
      }
      
      logger.info(`✅ Returning template data for ${templateType}`);
      return data;
    } else {
      logger.warn(`⚠️ Template ${templateType} not found in Firestore`);
      logger.warn(`⚠️ Document path: emailTemplates/${templateType}`);
      logger.warn(`⚠️ Document exists: ${templateDoc.exists}`);
    }
    return null;
  } catch (error) {
    logger.error(`❌ Failed to load email template ${templateType}:`, error);
    logger.error(`❌ Error stack:`, error.stack);
    return null;
  }
}

// Export loadEmailTemplate so it can be used by other modules
exports.loadEmailTemplate = loadEmailTemplate;

/**
 * Generate email HTML from admin template
 */
function generateEmailHTML(template, variables = {}) {
  const colors = template.colors || {
    primary: '#344E41',
    primaryLight: '#3A5A40',
    secondary: '#A3B18A',
    sage: '#D4D7CD',
    white: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280'
  };

  logger.info('🎨 Using colors:', Object.keys(colors));

  // Replace variables in template text fields BEFORE generating HTML
  const processedTemplate = { ...template };
  
  // Function to replace variables in a string
  const replaceVars = (text) => {
    if (!text) return text;
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      // Handle null/undefined values gracefully
      let replacement = value || '';
      // URL encode email addresses when used in URLs
      if (key === 'userEmail' && replacement && text.includes('?')) {
        replacement = encodeURIComponent(replacement);
      }
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
  processedTemplate.postCtaNote = replaceVars(template.postCtaNote);
  processedTemplate.subject = replaceVars(template.subject);
  processedTemplate.heading = replaceVars(template.heading);
  
  // Replace variables in features array
  if (template.features && Array.isArray(template.features)) {
    processedTemplate.features = template.features.map(f => replaceVars(f));
  }

  // Generate HTML from processed template
  // If template.html exists, use it (from advanced editor), otherwise generate from simple fields
  let html;
  if (template.html) {
    logger.info('📝 Using custom HTML from template.html field');
    html = template.html;
  } else {
    logger.info('📝 Generating HTML from simple template fields');
    html = generateDefaultHTML(processedTemplate, colors);
  }
  
  // Also replace variables in custom HTML if provided
  Object.entries(variables).forEach(([key, value]) => {
    const replacement = value || '';
    html = html.replace(new RegExp(`%${key.toUpperCase()}%`, 'g'), replacement);
  });

  // Replace color variables in HTML if they exist (for advanced editor)
  html = html.replace(/\$\{colors\.(\w+)\}/g, (match, colorKey) => {
    return colors[colorKey] || match;
  });

  return html;
}

// Export generateEmailHTML so it can be used by other modules
exports.generateEmailHTML = generateEmailHTML;

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
        <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
          <img src="${LOGO_URL}" alt="The Pep Planner" style="width: 120px; height: auto; margin: 0 auto 12px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)); display: block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        </a>
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

        ${template.postCtaNote ? `
        <p style="font-size: 14px; line-height: 1.6; color: ${colors.textLight}; font-style: italic; text-align: center; margin: 16px 0 24px 0;">
          <strong>${template.postCtaNote}</strong>
        </p>
        ` : ''}

        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin-top: 24px;">
          Happy Researching! ✌🏻,<br>
          <strong style="color: ${colors.primary};">The Pep Planner Team</strong>
        </p>
      </div>
      <div style="background-color: ${colors.sage}; padding: 32px; text-align: center; color: ${colors.textLight}; font-size: 13px;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${colors.text};">The Pep Planner</p>
        <p style="margin: 0 0 16px 0;">Organize Your Research</p>
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
  let founderState = null;
  try {
    founderState = await fetchFounderState();
  } catch (fetchError) {
    logger.warn('⚠️ Unable to load founder offer state for trial email:', fetchError.message);
  }

  // Try Firestore template
  try {
    logger.info('📧 Attempting to load custom trialEnding template...');
    const customTemplate = await loadEmailTemplate('trialEnding');
    if (customTemplate) {
      logger.info('✅ Custom trialEnding template found in Firestore');
      logger.info('📋 Template has html field:', !!customTemplate.html);
      logger.info('🎨 Template has colors:', !!customTemplate.colors);
      const subject = customTemplate.subject || `Your trial ends in ${daysLeft} days - The Pep Planner`;
      const html = generateEmailHTML(customTemplate, { daysLeft, founderState });
      logger.info('✅ Generated HTML from custom template, length:', html.length);
      return sendEmail(userEmail, subject, html);
    } else {
      logger.warn('⚠️ No custom trialEnding template found in Firestore, using default');
    }
  } catch (e) {
    logger.error('❌ Failed to load custom trialEnding template:', e);
    logger.error('❌ Error stack:', e.stack);
  }
  logger.info('📧 Falling back to hardcoded trialEnding template');
  const subject = `Your trial ends in ${daysLeft} days - The Pep Planner`;
  const html = emailTemplates.trialEndingEmail(daysLeft, userEmail, founderState);
  return sendEmail(userEmail, subject, html);
};

/**
 * Send subscription confirmation
 */
exports.sendSubscriptionConfirmationEmail = async (userEmail, plan, interval, price) => {
  try {
    logger.info('📧 Attempting to load custom subscription template...');
    const customTemplate = await loadEmailTemplate('subscription');
    if (customTemplate) {
      logger.info('✅ Custom subscription template found in Firestore');
      logger.info('📋 Template has html field:', !!customTemplate.html);
      logger.info('🎨 Template has colors:', !!customTemplate.colors);
      const subject = customTemplate.subject || 'Subscription Confirmed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { plan, interval, price });
      logger.info('✅ Generated HTML from custom template, length:', html.length);
      return sendEmail(userEmail, subject, html);
    } else {
      logger.warn('⚠️ No custom subscription template found in Firestore, using default');
    }
  } catch (e) {
    logger.error('❌ Error loading/generating custom subscription template:', e);
    logger.error('❌ Error stack:', e.stack);
  }
  logger.info('📧 Falling back to hardcoded subscription template');
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
    logger.info('📧 Attempting to load custom subscription template (sendSubscriptionConfirmedEmail)...');
    const customTemplate = await loadEmailTemplate('subscription');
    if (customTemplate) {
      logger.info('✅ Custom subscription template found in Firestore');
      logger.info('📋 Template has html field:', !!customTemplate.html);
      logger.info('🎨 Template has colors:', !!customTemplate.colors);
      const subject = customTemplate.subject || 'Subscription Confirmed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { plan, interval: 'month', price: '$8.99' });
      logger.info('✅ Generated HTML from custom template, length:', html.length);
      return sendEmail(userEmail, subject, html);
    } else {
      logger.warn('⚠️ No custom subscription template found in Firestore, using default');
    }
  } catch (e) { 
    logger.error('❌ Failed to load custom subscription template:', e);
    logger.error('❌ Error stack:', e.stack);
  }
  logger.info('📧 Falling back to hardcoded subscription template');
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
      // Remove features from giftRedeemedNotification template - it shouldn't show "What you can do"
      const templateWithoutFeatures = { ...customTemplate };
      if (templateWithoutFeatures.features) {
        delete templateWithoutFeatures.features;
      }
      const html = generateEmailHTML(templateWithoutFeatures, { giftGiverName, recipientEmail, subscriptionType });
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

