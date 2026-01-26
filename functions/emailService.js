// 📧 Email Service for The Pep Planner
// Sends transactional emails via Resend

const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailTemplates = require('./emailTemplates');
const { fetchFounderState } = require('./founderOffer');

// Resend API key will be stored in Firebase environment config
// Run: firebase functions:secrets:set RESEND_API_KEY

/**
 * Send email using Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {object} options - Optional metadata for logging (type, recipientName, userId, etc.)
 * @returns {Promise<boolean>}
 */
async function sendEmail(to, subject, html, options = {}) {
  try {
    // Get Resend API key from environment variables (Firebase Functions v2)
    // The secret is automatically injected as an environment variable when the function is called
    let resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/\r?\n/g, '');
    
    logger.info('🔑 API Key being used:', resendApiKey ? `${resendApiKey.substring(0, 10)}...` : 'undefined');
    logger.info('🔑 API Key length:', resendApiKey ? resendApiKey.length : 0);
    
    if (!resendApiKey) {
      logger.warn('⚠️ Resend not configured - email not sent');
      logger.info('📧 Would have sent email to:', to, 'Subject:', subject);
      
      // Log to email history if options provided
      if (options.logToHistory && options.type) {
        try {
          await logEmailToHistory({
            type: options.type,
            recipientEmail: to,
            recipientName: options.recipientName || null,
            userId: options.userId || null,
            subject: subject,
            status: 'failed',
            error: 'Resend API key not configured',
            sentBy: options.sentBy || 'system'
          });
        } catch (logError) {
          logger.error('❌ Failed to log email to history:', logError);
        }
      }
      
      return false;
    }
    
    // Validate API key format (Resend keys start with "re_")
    if (!resendApiKey.startsWith('re_') || resendApiKey.length < 30) {
      logger.error('❌ Invalid Resend API key format. Key must start with "re_" and be at least 30 characters');
      logger.error('API key provided:', resendApiKey.substring(0, 20) + '...');
      logger.error('API key length:', resendApiKey.length);
      
      // Log to email history if options provided
      if (options.logToHistory && options.type) {
        try {
          await logEmailToHistory({
            type: options.type,
            recipientEmail: to,
            recipientName: options.recipientName || null,
            userId: options.userId || null,
            subject: subject,
            status: 'failed',
            error: 'Invalid Resend API key format',
            sentBy: options.sentBy || 'system'
          });
        } catch (logError) {
          logger.error('❌ Failed to log email to history:', logError);
        }
      }
      
      return false;
    }

    // Dynamic import of Resend (only load if configured)
    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);

    const result = await resend.emails.send({
      from: 'The Pep Planner <contact@thepepplanner.com>',
      to,
      subject,
      html,
      replyTo: 'contact@thepepplanner.com',
      headers: {
        'X-Entity-Ref-ID': `tpp-${Date.now()}`,
        'List-Unsubscribe': '<https://thepepplanner.app/app/account>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'category', value: 'transactional' },
        { name: 'source', value: 'the-pep-planner' }
      ],
    });
    
    logger.info('✅ Email sent successfully to:', to);
    logger.info('📊 Resend Response:', JSON.stringify(result));
    
    // Resend returns an object with id on success
    if (result.data && result.data.id) {
      logger.info('✅ Email accepted by Resend and queued for delivery');
      
      // Track email count for ALL emails sent (including direct sends)
      try {
        const emailQueue = require('./emailQueue');
        const newCount = await emailQueue.incrementEmailCount();
        logger.info(`📊 Email count incremented. New count: ${newCount}`);
      } catch (countError) {
        logger.error('❌ Failed to increment email count:', countError);
        logger.error('Count error details:', {
          message: countError.message,
          stack: countError.stack
        });
        // Don't fail the email send if count increment fails, but log it
      }
      
      // Log to email history if options provided
      if (options.logToHistory && options.type) {
        try {
          await logEmailToHistory({
            type: options.type,
            recipientEmail: to,
            recipientName: options.recipientName || null,
            userId: options.userId || null,
            subject: subject,
            status: 'sent',
            sentBy: options.sentBy || 'system',
            customContent: options.customContent || null,
            inviteLink: options.inviteLink || null,
            reason: options.reason || null
          });
        } catch (logError) {
          logger.error('❌ Failed to log email to history:', logError);
        }
      }
      
      return true;
    } else if (result.error) {
      logger.error('❌ Resend API error:', result.error);
      
      // Log to email history if options provided
      if (options.logToHistory && options.type) {
        try {
          await logEmailToHistory({
            type: options.type,
            recipientEmail: to,
            recipientName: options.recipientName || null,
            userId: options.userId || null,
            subject: subject,
            status: 'failed',
            error: result.error?.message || 'Resend API error',
            sentBy: options.sentBy || 'system'
          });
        } catch (logError) {
          logger.error('❌ Failed to log email to history:', logError);
        }
      }
      
      return false;
    } else {
      logger.warn('⚠️ Unexpected Resend response:', result);
      return true; // Still return true if Resend accepted it
    }
    
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    
    // Log to email history if options provided
    if (options.logToHistory && options.type) {
      try {
        await logEmailToHistory({
          type: options.type,
          recipientEmail: to,
          recipientName: options.recipientName || null,
          userId: options.userId || null,
          subject: subject,
          status: 'failed',
          error: error.message,
          sentBy: options.sentBy || 'system'
        });
      } catch (logError) {
        logger.error('❌ Failed to log email to history:', logError);
      }
    }
    
    return false;
  }
}

/**
 * Helper function to log email to emailHistory collection
 */
async function logEmailToHistory(emailData) {
  try {
    const db = admin.firestore();
    await db.collection('emailHistory').add({
      ...emailData,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info(`✅ Email logged to history: ${emailData.type} to ${emailData.recipientEmail}`);
  } catch (error) {
    logger.error('❌ Failed to log email to history:', error);
    throw error;
  }
}

// Export the base sendEmail function
exports.sendEmail = sendEmail;

/**
 * Send email with automatic queuing if quota exceeded
 * This is the recommended method for sending emails
 */
exports.sendEmailWithQueue = async (to, subject, html, options = {}) => {
  const emailQueue = require('./emailQueue');
  return await emailQueue.sendEmailWithQueue(to, subject, html, options);
};

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (userEmail, userName = null, options = {}) => {
  logger.info(`📧 sendWelcomeEmail called for: ${userEmail}, userName: ${userName}`);
  
  // Try to load custom template from Firestore, fallback to hardcoded
  try {
    const customTemplate = await loadEmailTemplate('welcome');
    if (customTemplate) {
      logger.info('✅ Using custom welcome template from Firestore');
      const subject = customTemplate.subject || 'Welcome to The Pep Planner! 🎉';
      const html = generateEmailHTML(customTemplate, { userName, userEmail });
      return sendEmail(userEmail, subject, html, {
        logToHistory: true,
        type: 'welcome',
        recipientName: userName,
        userId: options.userId || null,
        sentBy: options.sentBy || 'system'
      });
    } else {
      logger.warn('⚠️ No custom welcome template found in Firestore');
    }
  } catch (error) {
    logger.warn('Failed to load custom welcome template, using default:', error);
  }
  
  // Fallback to hardcoded template
  logger.info('📧 Using hardcoded welcome template');
  const subject = 'Welcome to The Pep Planner! 🎉';
  const html = emailTemplates.welcomeEmail(userName, userEmail);
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    type: 'welcome',
    recipientName: userName,
    userId: options.userId || null,
    sentBy: options.sentBy || 'system'
  });
};

/**
 * Send email verification
 */
exports.sendVerificationEmail = async (userEmail, verificationLink, options = {}) => {
  logger.info(`📧 sendVerificationEmail called for: ${userEmail}`);
  
  try {
    const customTemplate = await loadEmailTemplate('verification');
    if (customTemplate) {
      logger.info('✅ Using custom verification template from Firestore');
      const subject = customTemplate.subject || 'Verify your email for The Pep Planner';
      const html = generateEmailHTML(customTemplate, { verificationLink, userEmail });
      return sendEmail(userEmail, subject, html, {
        logToHistory: true,
        type: 'verification',
        recipientName: options.recipientName || null,
        userId: options.userId || null,
        sentBy: options.sentBy || 'system'
      });
    } else {
      logger.warn('⚠️ No custom verification template found in Firestore');
    }
  } catch (e) {
    logger.warn('Failed to load custom verification template, using themed default:', e);
  }
  // Fallback to themed default template that matches other emails
  logger.info('📧 Using hardcoded verification template');
  const defaultTemplate = {
    heading: 'Verify Your Email 📧',
    greeting: `Hi there,`,
    mainMessage: `Thanks for signing up for The Pep Planner! Please verify your email address by clicking the button below.`,
    ctaText: 'Verify Email',
    ctaLink: verificationLink,
    highlightTitle: '🎉 Welcome to The Pep Planner!',
    highlightMessage: 'Once verified, you\'ll have full access to all features and can start organizing your research.',
    postCtaNote: 'If you didn\'t create an account, you can safely ignore this email.',
    features: []
  };
  const subject = 'Verify your email for The Pep Planner';
  const html = generateEmailHTML(defaultTemplate, { verificationLink, userEmail });
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    type: 'verification',
    recipientName: options.recipientName || null,
    userId: options.userId || null,
    sentBy: options.sentBy || 'system'
  });
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
 * Disables click tracking to ensure direct links work properly
 */
exports.sendCustomPasswordResetEmail = async (userEmail, resetToken) => {
  // Use environment variable for base URL, fallback to production
  // For local development, you can set BASE_URL=http://localhost:5173
  const baseUrl = process.env.BASE_URL || 'https://thepepplanner.app';
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  logger.info(`🔗 Password reset link: ${resetLink}`);
  
  try {
    // Get Resend API key from environment variables
    let resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/\r?\n/g, '');
    
    if (!resendApiKey) {
      logger.warn('⚠️ Resend not configured - password reset email not sent');
      return false;
    }
    
    // Validate API key format
    if (!resendApiKey.startsWith('re_') || resendApiKey.length < 30) {
      logger.error('❌ Invalid Resend API key format');
      return false;
    }

    // Dynamic import of Resend
    const { Resend } = require('resend');
    const resend = new Resend(resendApiKey);

    // Try to load custom template from Firestore, fallback to themed default
    let subject, html;
    try {
      const customTemplate = await loadEmailTemplate('passwordReset');
      if (customTemplate) {
        subject = customTemplate.subject || 'Reset your password for The Pep Planner';
        html = generateEmailHTML(customTemplate, { resetLink, userEmail });
      } else {
        throw new Error('No custom template found');
      }
    } catch (error) {
      logger.warn('Failed to load custom password reset template, using themed default:', error);
      // Fallback to themed default template that matches other emails
      const defaultTemplate = {
        heading: 'Reset Your Password 🔐',
        greeting: `Hi there,`,
        mainMessage: `We received a request to reset the password for your account (${userEmail}). Click the button below to create a new password.`,
        ctaText: 'Reset Password',
        ctaLink: resetLink,
        highlightTitle: '⏱️ This link expires in 1 hour',
        highlightMessage: 'For your security, this password reset link is only valid for 60 minutes.',
        postCtaNote: 'If you didn\'t request a password reset, you can safely ignore this email. Your password won\'t change unless you click the link above and create a new one.',
        features: []
      };
      subject = 'Reset your password for The Pep Planner';
      html = generateEmailHTML(defaultTemplate, { resetLink, userEmail });
    }

    // Send email via Resend (Resend doesn't track clicks by default, so links work directly)
    const result = await resend.emails.send({
      from: 'The Pep Planner <contact@thepepplanner.com>',
      to: userEmail,
      subject,
      html,
    });
    
    logger.info('✅ Password reset email sent successfully to:', userEmail);
    logger.info('📊 Resend Response:', JSON.stringify(result));
    
    return result.data && result.data.id ? true : false;
    
  } catch (error) {
    logger.error('❌ Failed to send password reset email:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    return false;
  }
};

/**
 * Send custom verification email with Firebase token
 */
exports.sendCustomVerificationEmail = async (userEmail, verificationToken, options = {}) => {
  // Use environment variable for base URL, fallback to production
  // For local development, you can set BASE_URL=http://localhost:5173
  const baseUrl = process.env.BASE_URL || 'https://thepepplanner.app';
  const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  logger.info(`🔗 Verification link: ${verificationLink}`);
  logger.info(`📧 sendCustomVerificationEmail called for: ${userEmail}`);
  
  // Try to load custom template from Firestore, fallback to themed default
  try {
    const customTemplate = await loadEmailTemplate('verification');
    if (customTemplate) {
      logger.info('✅ Using custom verification template from Firestore');
      const subject = customTemplate.subject || 'Verify your email for The Pep Planner';
      // Pass multiple variable names to support different template formats
      const html = generateEmailHTML(customTemplate, { 
        verificationLink,
        link: verificationLink,  // Support %LINK% variable in templates
        verification_link: verificationLink,  // Support %VERIFICATION_LINK% variable (with underscore)
        userEmail
      });
      return sendEmail(userEmail, subject, html, {
        logToHistory: true,
        type: 'verification',
        recipientName: options.recipientName || null,
        userId: options.userId || null,
        sentBy: options.sentBy || 'system'
      });
    } else {
      logger.warn('⚠️ No custom verification template found in Firestore');
    }
  } catch (error) {
    logger.warn('Failed to load custom verification template, using themed default:', error);
  }
  
  // Fallback to themed default template that matches other emails
  logger.info('📧 Using hardcoded verification template');
  const defaultTemplate = {
    heading: 'Verify Your Email 📧',
    greeting: `Hi there,`,
    mainMessage: `Thanks for signing up for The Pep Planner! Please verify your email address by clicking the button below.`,
    ctaText: 'Verify Email',
    ctaLink: verificationLink,
    highlightTitle: '🎉 Welcome to The Pep Planner!',
    highlightMessage: 'Once verified, you\'ll have full access to all features and can start organizing your research.',
    postCtaNote: 'If you didn\'t create an account, you can safely ignore this email.',
    features: []
  };
  const subject = 'Verify your email for The Pep Planner';
  const html = generateEmailHTML(defaultTemplate, { verificationLink, userEmail });
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    type: 'verification',
    recipientName: options.recipientName || null,
    userId: options.userId || null,
    sentBy: options.sentBy || 'system'
  });
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
      // Convert value to string to handle numbers, dates, etc.
      let replacement = value != null ? String(value) : '';
      // URL encode email addresses when used in URLs
      if (key === 'userEmail' && replacement && text.includes('?')) {
        replacement = encodeURIComponent(replacement);
      }
      // Escape special regex characters in the key for safe replacement
      const escapedKey = key.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`%${escapedKey}%`, 'g');
      const beforeReplace = result;
      result = result.replace(regex, replacement);
      if (beforeReplace !== result && replacement) {
        logger.info(`✅ Replaced %${key.toUpperCase()}% with: ${replacement.substring(0, 50)}${replacement.length > 50 ? '...' : ''}`);
      }
    });
    return result;
  };

  // Replace variables in all text fields
  processedTemplate.greeting = replaceVars(template.greeting);
  processedTemplate.mainMessage = replaceVars(template.mainMessage);
  processedTemplate.highlightTitle = replaceVars(template.highlightTitle);
  processedTemplate.highlightMessage = replaceVars(template.highlightMessage);
  processedTemplate.ctaText = replaceVars(template.ctaText);
  // Replace ctaLink, handling all common variable formats
  let ctaLinkValue = replaceVars(template.ctaLink);
  // Also replace %RESET_LINK% (with underscore) if it exists
  if (ctaLinkValue && variables.resetLink) {
    ctaLinkValue = ctaLinkValue.replace(/%RESET_LINK%/g, variables.resetLink);
    ctaLinkValue = ctaLinkValue.replace(/%RESETLINK%/g, variables.resetLink);
  }
  // Also replace %VERIFICATION_LINK% (with underscore) if it exists
  if (ctaLinkValue && variables.verificationLink) {
    ctaLinkValue = ctaLinkValue.replace(/%VERIFICATION_LINK%/g, variables.verificationLink);
    ctaLinkValue = ctaLinkValue.replace(/%VERIFICATIONLINK%/g, variables.verificationLink);
    ctaLinkValue = ctaLinkValue.replace(/%LINK%/g, variables.verificationLink);
  }
  // Also replace %ACTIVATION_LINK% (with underscore) if it exists
  if (ctaLinkValue && variables.activationLink) {
    ctaLinkValue = ctaLinkValue.replace(/%ACTIVATION_LINK%/g, variables.activationLink);
    ctaLinkValue = ctaLinkValue.replace(/%ACTIVATIONLINK%/g, variables.activationLink);
    if (!ctaLinkValue || ctaLinkValue === '#' || ctaLinkValue.includes('%LINK%')) {
      ctaLinkValue = variables.activationLink;
    }
  }
  // Also replace %SURVEY_LINK% (with underscore) if it exists
  if (ctaLinkValue && variables.surveyLink) {
    ctaLinkValue = ctaLinkValue.replace(/%SURVEY_LINK%/g, variables.surveyLink);
    ctaLinkValue = ctaLinkValue.replace(/%SURVEYLINK%/g, variables.surveyLink);
  }
  // If ctaLink is empty or still contains a placeholder, use activationLink, surveyLink, resetLink, verificationLink, or link from variables
  if (!ctaLinkValue || ctaLinkValue === '#' || 
      ctaLinkValue.includes('%LINK%') || 
      ctaLinkValue.includes('%VERIFICATIONLINK%') || 
      ctaLinkValue.includes('%VERIFICATION_LINK%') ||
      ctaLinkValue.includes('%RESETLINK%') ||
      ctaLinkValue.includes('%RESET_LINK%') ||
      ctaLinkValue.includes('%SURVEYLINK%') ||
      ctaLinkValue.includes('%SURVEY_LINK%') ||
      ctaLinkValue.includes('%ACTIVATIONLINK%') ||
      ctaLinkValue.includes('%ACTIVATION_LINK%')) {
    ctaLinkValue = variables.activationLink || variables.surveyLink || variables.resetLink || variables.verificationLink || variables.link || '#';
    logger.info(`🔗 Using fallback ctaLink: ${ctaLinkValue.substring(0, 50)}...`);
  } else {
    logger.info(`🔗 Using template ctaLink: ${ctaLinkValue.substring(0, 50)}...`);
  }
  // Ensure the link is absolute (starts with http:// or https://)
  if (ctaLinkValue && ctaLinkValue !== '#' && !ctaLinkValue.startsWith('http://') && !ctaLinkValue.startsWith('https://')) {
    logger.warn(`⚠️ ctaLink is not absolute, prepending https://: ${ctaLinkValue}`);
    ctaLinkValue = `https://${ctaLinkValue}`;
  }
  processedTemplate.ctaLink = ctaLinkValue;
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
    // Replace processedTemplate.ctaLink in custom HTML if it exists
    if (processedTemplate.ctaLink && processedTemplate.ctaLink !== '#') {
      // Replace any placeholder or existing href with the actual ctaLink
      html = html.replace(/href=["']%RESET_LINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']%RESETLINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']%VERIFICATION_LINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']%VERIFICATIONLINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']%ACTIVATION_LINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']%ACTIVATIONLINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']%LINK%["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']#["']/gi, `href="${processedTemplate.ctaLink}"`);
      html = html.replace(/href=["']about:blank["']/gi, `href="${processedTemplate.ctaLink}"`);
      logger.info(`✅ Replaced href attributes in custom HTML with ctaLink`);
    }
  } else {
    logger.info('📝 Generating HTML from simple template fields');
    html = generateDefaultHTML(processedTemplate, colors);
  }
  
  // Also replace variables in custom HTML if provided
  Object.entries(variables).forEach(([key, value]) => {
    // Convert value to string to handle numbers, dates, etc.
    const replacement = value != null ? String(value) : '';
    // Replace both %KEY% and %KEY_WITH_UNDERSCORE% formats
    const regex1 = new RegExp(`%${key.toUpperCase()}%`, 'g');
    const regex2 = new RegExp(`%${key.toUpperCase().replace(/([A-Z])/g, '_$1').substring(1)}%`, 'g');
    const beforeReplace = html;
    html = html.replace(regex1, replacement);
    html = html.replace(regex2, replacement);
    // Also handle RESET_LINK specifically (common pattern)
    if (key === 'resetLink') {
      html = html.replace(/%RESET_LINK%/g, replacement);
      html = html.replace(/%RESETLINK%/g, replacement);
    }
    // Also handle SURVEY_LINK specifically (common pattern)
    if (key === 'surveyLink') {
      html = html.replace(/%SURVEY_LINK%/g, replacement);
      html = html.replace(/%SURVEYLINK%/g, replacement);
    }
    if (beforeReplace !== html) {
      logger.info(`✅ Replaced %${key.toUpperCase()}% in HTML`);
    }
  });
  
  // Handle common variable name variations for reset links
  if (variables.resetLink) {
    const linkValue = variables.resetLink;
    // Replace %RESET_LINK% (with underscore) - used in email templates
    const resetPatterns = [
      { regex: /%RESET_LINK%/g, name: '%RESET_LINK%' },
      { regex: /%RESETLINK%/g, name: '%RESETLINK%' },
      { regex: /%RESET[_\s]*LINK%/gi, name: '%RESET_LINK% (variations)' }
    ];
    
    resetPatterns.forEach(({ regex, name }) => {
      if (html.match(regex)) {
        const beforeCount = (html.match(regex) || []).length;
        html = html.replace(regex, linkValue);
        logger.info(`✅ Replaced ${beforeCount} occurrence(s) of ${name} in HTML`);
      }
    });
    
    // Replace in href attributes
    html = html.replace(/href=["']([^"']*%RESET[_\s]*LINK[^"']*|%RESETLINK%|about:blank|#)["']/gi, `href="${linkValue}"`);
  }

  // Handle common variable name variations for verification links
  if (variables.verificationLink) {
    const linkValue = variables.verificationLink;
    // Replace %VERIFICATION_LINK% (with underscore) - used in default templates
    // Check for it in various contexts: href="...", src="...", or plain text
    const patterns = [
      { regex: /%VERIFICATION_LINK%/g, name: '%VERIFICATION_LINK%' },
      { regex: /%VERIFICATIONLINK%/g, name: '%VERIFICATIONLINK%' },
      { regex: /%LINK%/g, name: '%LINK%' }
    ];
    
    patterns.forEach(({ regex, name }) => {
      if (html.match(regex)) {
        const beforeCount = (html.match(regex) || []).length;
        html = html.replace(regex, linkValue);
        logger.info(`✅ Replaced ${beforeCount} occurrence(s) of ${name} in HTML`);
      }
    });
    
    // Final pass: Replace any remaining placeholders that look like verification links
    // This catches any edge cases where the placeholder might be in a different format
    html = html.replace(/%VERIFICATION[_\s]*LINK%/gi, linkValue);
    
    // CRITICAL: Replace any href attributes that might have placeholders or be set to about:blank
    // This ensures the CTA button always has a valid link
    html = html.replace(/href=["']([^"']*%VERIFICATION[_\s]*LINK[^"']*|%LINK%|about:blank|#)["']/gi, `href="${linkValue}"`);
    
    // Also check for any remaining placeholders that might cause issues
    const remainingPlaceholders = html.match(/%[A-Z_]+%/g);
    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      const uniquePlaceholders = [...new Set(remainingPlaceholders)];
      logger.warn(`⚠️ Found ${remainingPlaceholders.length} remaining placeholder(s) in HTML: ${uniquePlaceholders.join(', ')}`);
      // If we still have verification link placeholders, try one more aggressive replacement
      if (uniquePlaceholders.some(p => p.includes('VERIFICATION') || p.includes('LINK'))) {
        logger.warn(`⚠️ Attempting aggressive replacement of remaining link placeholders`);
        html = html.replace(/%[A-Z_]*VERIFICATION[_\s]*LINK[A-Z_]*%/gi, linkValue);
        html = html.replace(/%[A-Z_]*LINK[A-Z_]*%/gi, linkValue);
        // Also replace in href attributes one more time
        html = html.replace(/href=["'][^"']*%[A-Z_]*LINK[^"']*["']/gi, `href="${linkValue}"`);
      }
    }
    
    // Final safety check: if we still have about:blank or # in href, replace with verification link
    if (html.includes('href="about:blank"') || html.includes("href='about:blank'") || 
        (html.includes('href="#"') && html.includes('Verify'))) {
      logger.warn(`⚠️ Found about:blank or # in href, replacing with verification link`);
      html = html.replace(/href=["']about:blank["']/gi, `href="${linkValue}"`);
      html = html.replace(/href=["']#["']/gi, `href="${linkValue}"`);
    }
  }
  
  // Log final ctaLink value for debugging
  if (processedTemplate.ctaLink) {
    logger.info(`🔗 Final ctaLink value: ${processedTemplate.ctaLink.substring(0, 80)}...`);
  }
  
  // Also ensure the link is in the HTML if using simple fields
  if (!template.html && processedTemplate.ctaLink && processedTemplate.ctaLink !== '#') {
    // Double-check that the link is actually in the generated HTML
    if (!html.includes(processedTemplate.ctaLink)) {
      logger.warn(`⚠️ ctaLink not found in generated HTML! Link: ${processedTemplate.ctaLink.substring(0, 50)}...`);
    } else {
      logger.info(`✅ ctaLink found in generated HTML`);
    }
  }

  // Replace color variables in HTML if they exist (for advanced editor)
  html = html.replace(/\$\{colors\.(\w+)\}/g, (match, colorKey) => {
    return colors[colorKey] || match;
  });

  // Final validation: Check if there are any problematic href attributes
  const problematicHrefs = html.match(/href=["'](about:blank|#|%[A-Z_]+%)["']/gi);
  if (problematicHrefs && problematicHrefs.length > 0) {
    logger.error(`❌ Found ${problematicHrefs.length} problematic href attribute(s): ${problematicHrefs.join(', ')}`);
    if (variables.verificationLink) {
      logger.warn(`⚠️ Attempting emergency replacement with verification link`);
      html = html.replace(/href=["'](about:blank|#)["']/gi, `href="${variables.verificationLink}"`);
    }
  }
  
  // Log a sample of the final HTML to verify the link is correct (first 500 chars)
  if (html.includes('Verify Email') || html.includes('Verify')) {
    const buttonMatch = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>.*?Verify[^<]*<\/a>/i);
    if (buttonMatch) {
      logger.info(`✅ Final button href: ${buttonMatch[1]}`);
    } else {
      logger.warn(`⚠️ Could not find Verify button href in final HTML`);
    }
  }

  return html;
}

// Export generateEmailHTML so it can be used by other modules
exports.generateEmailHTML = generateEmailHTML;

/**
 * Generate default HTML from template data
 */
function generateDefaultHTML(template, colors) {
  // SYNCED WITH ADMIN PANEL - EmailTemplateManager.jsx generateHTMLFromTemplate()
  // Last sync: January 25, 2026
  const LOGO_URL = process.env.LOGO_URL || 'https://thepepplanner.app/tpp_logo.png';
  
  // Generate features HTML if features exist AND showFeatures is not false - FULL WIDTH background
  const showFeatures = template.showFeatures !== false;
  const featuresTitle = template.featuresTitle || "What's waiting for you:";
  const featuresHTML = showFeatures && template.features && template.features.length > 0 ? `
    </div>
  </div>
  <!-- Full-width features section background -->
  <div style="background-color: #EFF2EE; padding: 24px 0 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0 20px;">
      <div style="background-color: #FFFFFF; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
        <h2 style="font-size: 18px; font-weight: 700; color: ${colors.primary}; margin: 0 0 24px 0; text-align: center;">${featuresTitle}</h2>
        <div style="text-align: left;">
          ${template.features.map(feature => {
            const parts = feature.includes(' – ') ? feature.split(' – ') : [feature, ''];
            const title = parts[0];
            const desc = parts[1] || '';
            return `
              <div style="margin-bottom: 16px;">
                <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td valign="top" style="padding-right: 12px;">
                      <span style="color: ${colors.primary}; font-size: 18px; line-height: 1.2;">✓</span>
                    </td>
                    <td>
                      <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${colors.text};">${title}</p>
                      ${desc ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: ${colors.textLight}; line-height: 1.5;">${desc}</p>` : ''}
                    </td>
                  </tr>
                </table>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  </div>
  <!-- Re-open content wrapper for signature -->
  <div style="background-color: #F5F5F0; padding: 0 20px;">
    <div style="max-width: 600px; margin: 0 auto;">
      ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cedarville+Cursive&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F5F5F0;">
  <!-- Full-width header - seamless across top, no padding on sides -->
  <div style="background-color: #FFFFFF; padding: 16px 0; border-bottom: 1px solid #DDE6DE;">
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; max-width: 600px; margin: 0 auto;">
      <tr>
        <!-- Left: Tagline -->
        <td width="33%" valign="middle" align="center" style="padding: 0 16px;">
          <p style="margin: 0; font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #9CA3AF; font-family: 'Poppins', sans-serif;">
            Organize Your Research
          </p>
        </td>
        
        <!-- Center: Logo -->
        <td width="34%" valign="middle" align="center">
          <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
            <img src="${LOGO_URL}" alt="The Pep Planner" style="width: 64px; height: 64px; border-radius: 50%; display: block; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);" onerror="this.style.display='none';" />
          </a>
        </td>
        
        <!-- Right: Dashboard Link -->
        <td width="33%" valign="middle" align="center" style="padding: 0 16px;">
          <a href="https://thepepplanner.app/app/dashboard" style="color: ${colors.primary}; text-decoration: none; font-size: 13px; font-weight: 500; font-family: 'Poppins', sans-serif;">
            Dashboard →
          </a>
        </td>
      </tr>
    </table>
  </div>
  
  <!-- Main content area with side padding -->
  <div style="background-color: #F5F5F0; padding: 0 20px;">
    <div style="max-width: 600px; margin: 0 auto;">
      
      <!-- Section: Intro (light off-white) -->
      <div style="background-color: #F5F5F0; padding: 40px 32px; color: ${colors.text};">
        <h1 style="color: ${colors.primary}; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; line-height: 1.3; text-align: center;">
          ${(template.heading || 'Welcome!').replace(/🥼/g, '')}
        </h1>
        
        <p style="font-size: 16px; line-height: 1.8; color: ${colors.text}; margin: 0 0 24px 0; text-align: center;">
          ${template.greeting || ''}
        </p>
        
        ${template.mainMessage ? `<p style="font-size: 14px; line-height: 1.6; color: ${colors.textLight}; margin: 0 0 32px 0; text-align: center;">${template.mainMessage.replace(/\n/g, '<br>')}</p>` : ''}

        ${template.ctaText ? `
        <center style="margin: 24px 0 0 0;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; border-spacing: 0; margin: 0 auto;">
            <tr>
              <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%); box-shadow: 0 4px 16px rgba(52, 78, 65, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1);">
                <a href="${template.ctaLink || '#'}" style="display: inline-block; padding: 14px 32px; color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px;">
                  ${template.ctaText}
                </a>
              </td>
            </tr>
          </table>
        </center>
        ` : ''}
      </div>

      ${featuresHTML}

      <!-- Section: Post-CTA Note + Signature -->
      <div style="padding: 40px 32px; color: ${colors.text};">


        ${template.postCtaNote ? `
        <p style="font-size: 14px; line-height: 1.6; color: ${colors.textLight}; text-align: center; margin: 0 0 32px 0; font-style: italic;">
          ${template.postCtaNote}
        </p>
        ` : ''}

        <div style="text-align: center; padding-top: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin: 0;">
            Happy researching,
          </p>
          <p style="font-size: 16px; font-weight: 700; color: ${colors.primary}; margin: 4px 0 0 0;">
            The Pep Planner Team
          </p>
        </div>
      </div>
      
    </div>
  </div>
  
  <!-- Full-width footer - seamless across bottom -->
  <div style="background-color: #2F3B3A; padding: 32px 0; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0 16px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #A0B9B3;">
        © ${new Date().getFullYear()} The Pep Planner. All rights reserved.
      </p>
      <p style="margin: 0; font-size: 16px; color: #D1D9D6; font-family: 'Cedarville Cursive', cursive; font-style: italic;">
        — for the love of research
      </p>
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
      const html = generateEmailHTML(customTemplate, { resetLink, userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (e) {
    logger.warn('Failed to load custom password reset template, using themed default:', e);
  }
  // Fallback to themed default template that matches other emails
  const defaultTemplate = {
    heading: 'Reset Your Password 🔐',
    greeting: `Hi there,`,
    mainMessage: `We received a request to reset the password for your account (${userEmail}). Click the button below to create a new password.`,
    ctaText: 'Reset Password',
    ctaLink: resetLink,
    highlightTitle: '⏱️ This link expires in 1 hour',
    highlightMessage: 'For your security, this password reset link is only valid for 60 minutes.',
    postCtaNote: 'If you didn\'t request a password reset, you can safely ignore this email. Your password won\'t change unless you click the link above and create a new one.',
    features: []
  };
  const subject = 'Reset your password for The Pep Planner';
  const html = generateEmailHTML(defaultTemplate, { resetLink, userEmail });
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
 * Send trial extension notification
 * Triggered when admin manually extends a user's trial period
 */
exports.sendTrialExtensionEmail = async (userEmail, userName, daysAdded, newEndDate, adminNote = null) => {
  logger.info(`📧 Sending trial extension email to ${userEmail}`);
  logger.info(`📧 Parameters: userName=${userName}, daysAdded=${daysAdded}, newEndDate=${newEndDate}`);
  
  // Try to load custom template from Firestore first
  try {
    logger.info('📧 Attempting to load trialExtension template from Firestore...');
    const customTemplate = await loadEmailTemplate('trialExtension');
    if (customTemplate) {
      logger.info('✅ Found trialExtension template in Firestore');
      const subject = customTemplate.subject || '🎉 Your Research Trial Has Been Extended!';
      const html = generateEmailHTML(customTemplate, { 
        userName, 
        userEmail, 
        daysAdded, 
        newEndDate,
        adminNote 
      });
      logger.info('✅ Generated HTML from custom template');
      return sendEmail(userEmail, subject, html);
    } else {
      logger.info('⚠️ trialExtension template not found in Firestore, using default');
    }
  } catch (error) {
    logger.error('❌ Failed to load trialExtension template:', error);
    logger.error('❌ Error stack:', error.stack);
  }
  
  // Fallback to themed default template that matches other emails
  logger.info('📧 Using themed default trialExtension template');
  const defaultTemplate = {
    heading: '🎉 Your Research Trial Has Been Extended!',
    greeting: `Hi ${userName || 'there'},`,
    mainMessage: `Great news! We've added ${daysAdded} ${daysAdded === 1 ? 'day' : 'days'} to your research trial. Your trial now ends on ${newEndDate}.${adminNote ? `\n\n${adminNote}` : ''}`,
    ctaText: 'Continue Researching',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '⏰ New Trial End Date',
    highlightMessage: `Your extended trial ends on ${newEndDate}. Make the most of your extra time to explore all features!`,
    postCtaNote: 'If you have any questions, feel free to reach out to our support team.',
    features: []
  };
  const subject = '🎉 Your Research Trial Has Been Extended!';
  const html = generateEmailHTML(defaultTemplate, { userName, userEmail, daysAdded, newEndDate, adminNote });
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
 * Send email change verification notification to new email
 */
exports.sendEmailChangeVerificationNotification = async (newEmail, oldEmail, options = {}) => {
  logger.info(`📧 sendEmailChangeVerificationNotification called for: ${newEmail}`);
  
  try {
    const customTemplate = await loadEmailTemplate('emailChangeVerification');
    if (customTemplate) {
      logger.info('✅ Using custom email change verification template from Firestore');
      const subject = customTemplate.subject || 'Verify Your New Email Address - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { newEmail, oldEmail });
      return sendEmail(newEmail, subject, html, {
        logToHistory: true,
        type: 'email_change_verification',
        recipientName: options.recipientName || null,
        userId: options.userId || null,
        sentBy: options.sentBy || 'system'
      });
    } else {
      logger.warn('⚠️ No custom email change verification template found in Firestore');
    }
  } catch (e) {
    logger.warn('Failed to load custom email change verification template, using default:', e);
  }
  
  // Fallback to hardcoded template
  logger.info('📧 Using hardcoded email change verification template');
  const subject = 'Verify Your New Email Address - The Pep Planner';
  const html = emailTemplates.emailChangeVerificationEmail(newEmail, oldEmail);
  return sendEmail(newEmail, subject, html, {
    logToHistory: true,
    type: 'email_change_verification',
    recipientName: options.recipientName || null,
    userId: options.userId || null,
    sentBy: options.sentBy || 'system'
  });
};

/**
 * Send email change security notification
 */
exports.sendEmailChangeNotification = async (oldEmail, newEmail, timestamp, options = {}) => {
  logger.info(`📧 sendEmailChangeNotification called for: ${oldEmail} -> ${newEmail}`);
  
  try {
    const customTemplate = await loadEmailTemplate('emailChangeNotification');
    if (customTemplate) {
      logger.info('✅ Using custom email change notification template from Firestore');
      const subject = customTemplate.subject || 'Security Alert: Email Address Changed - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { oldEmail, newEmail, timestamp });
      return sendEmail(oldEmail, subject, html, {
        logToHistory: true,
        type: 'email_change_notification',
        recipientName: options.recipientName || null,
        userId: options.userId || null,
        sentBy: options.sentBy || 'system'
      });
    } else {
      logger.warn('⚠️ No custom email change notification template found in Firestore');
    }
  } catch (e) {
    logger.warn('Failed to load custom email change notification template, using default:', e);
  }
  
  // Fallback to hardcoded template
  logger.info('📧 Using hardcoded email change notification template');
  const subject = 'Security Alert: Email Address Changed - The Pep Planner';
  const html = emailTemplates.emailChangeNotificationEmail(oldEmail, newEmail, timestamp);
  return sendEmail(oldEmail, subject, html, {
    logToHistory: true,
    type: 'email_change_notification',
    recipientName: options.recipientName || null,
    userId: options.userId || null,
    sentBy: options.sentBy || 'system'
  });
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
 * Send Squarespace activation email (for new users who purchased on Squarespace)
 */
exports.sendSquarespaceActivationEmail = async (userEmail, customerName, planKey, activationToken) => {
  try {
    const customTemplate = await loadEmailTemplate('squarespaceActivation');
    if (customTemplate) {
      const activationLink = `https://thepepplanner.com/activate?token=${activationToken}`;
      const subject = customTemplate.subject || 'Create Your Pep Planner Account 🧬';
      const html = generateEmailHTML(customTemplate, { 
        userEmail, 
        customerName: customerName || 'there',
        CUSTOMERNAME: customerName || 'there',
        planKey,
        PLANKEY: planKey === 'monthly' ? 'Monthly' : planKey === 'annual' ? 'Annual' : 'Lifetime',
        activationLink,
        ACTIVATION_LINK: activationLink,
        activationToken,
        ACTIVATION_TOKEN: activationToken
      });
      return sendEmail(userEmail, subject, html, {
        logToHistory: true,
        type: 'squarespace-activation',
        recipientName: customerName
      });
    }
  } catch (e) {
    logger.warn('Failed to load custom Squarespace activation template, using default:', e);
  }
  
  // Fallback to default template
  const activationLink = `https://thepepplanner.com/activate?token=${activationToken}`;
  const planName = planKey === 'monthly' ? 'Monthly' : planKey === 'annual' ? 'Annual' : 'Lifetime';
  const subject = 'Create Your Pep Planner Account 🧬';
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #344E41;">Welcome to The Pep Planner! 🧬</h2>
      <p>Hi ${customerName || 'there'},</p>
      <p>Thank you for your purchase! Your ${planName} subscription is ready to activate.</p>
      <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0; font-weight: 600; color: #344E41;">Create Your App Account</p>
        <p style="margin: 8px 0 0 0;">Your billing portal (used for purchasing) is separate from your Pep Planner app account. Click below to create your app account and start using The Pep Planner. This will only take a moment!</p>
      </div>
      <center>
        <a href="${activationLink}" style="display: inline-block; padding: 16px 32px; background-color: #344E41; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0;">
          Create Your Pep Planner Account
        </a>
      </center>
      <p style="font-size: 14px; color: #666; margin-top: 24px;">
        <strong>Important:</strong> Your billing portal (for purchases) and your Pep Planner app account are separate. You'll use your app account to access The Pep Planner features.
      </p>
      <p style="font-size: 14px; color: #666;">
        This activation link expires in 30 days. If you have any questions, contact us at contact@thepepplanner.com
      </p>
      <p style="font-size: 14px; color: #999; margin-top: 32px;">
        Or copy this link: ${activationLink}
      </p>
    </div>
  `;
  
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    type: 'squarespace-activation',
    recipientName: customerName
  });
};

/**
 * Send Squarespace subscription activated email (for existing users)
 */
exports.sendSquarespaceSubscriptionActivatedEmail = async (userEmail, customerName, planKey) => {
  try {
    const customTemplate = await loadEmailTemplate('squarespaceActivated');
    if (customTemplate) {
      const planName = planKey === 'monthly' ? 'Monthly' : planKey === 'annual' ? 'Annual' : 'Lifetime';
      const subject = customTemplate.subject || 'Your Subscription is Now Active! ✅';
      const html = generateEmailHTML(customTemplate, { 
        userEmail, 
        customerName: customerName || 'there',
        CUSTOMERNAME: customerName || 'there',
        planKey,
        PLANKEY: planKey === 'monthly' ? 'Monthly' : planKey === 'annual' ? 'Annual' : 'Lifetime',
        planName,
        PLANNAME: planName
      });
      return sendEmail(userEmail, subject, html, {
        logToHistory: true,
        type: 'squarespace-activated',
        recipientName: customerName
      });
    }
  } catch (e) {
    logger.warn('Failed to load custom Squarespace activated template, using default:', e);
  }
  
  // Fallback to default template
  const planName = planKey === 'monthly' ? 'Monthly' : planKey === 'annual' ? 'Annual' : 'Lifetime';
  const subject = 'Your Subscription is Now Active! ✅';
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #344E41;">Subscription Activated! 🎉</h2>
      <p>Hi ${customerName || 'there'},</p>
      <p>Great news! Your ${planName} subscription is now active.</p>
      <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0; font-weight: 600; color: #344E41;">You're all set!</p>
        <p style="margin: 8px 0 0 0;">Your Pep Planner app account has been created. Access The Pep Planner app to start tracking your research.</p>
      </div>
      <center>
        <a href="https://thepepplanner.com/login" style="display: inline-block; padding: 16px 32px; background-color: #344E41; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0;">
          Access The Pep Planner App
        </a>
      </center>
      <p style="font-size: 14px; color: #666; margin-top: 24px;">
        <strong>Note:</strong> Your billing portal (for purchases) and your Pep Planner app account are separate. Use your app account to access The Pep Planner features.
      </p>
      <p style="font-size: 14px; color: #666;">
        Need help? Contact us at contact@thepepplanner.com
      </p>
    </div>
  `;
  
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    type: 'squarespace-activated',
    recipientName: customerName
  });
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

/**
 * Send account deletion email
 */
exports.sendAccountDeletionEmail = async (userEmail, userName = null) => {
  logger.info('📧 Sending account deletion confirmation email');
  
  // Try to load custom template from Firestore
  try {
    const customTemplate = await loadEmailTemplate('accountDeletion');
    if (customTemplate && customTemplate.heading) {
      logger.info('✅ Using account deletion template from Firestore');
      const subject = customTemplate.subject || 'We\'re Sad to See You Go - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { userName: userName || 'User', userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load account deletion template, using default:', error);
  }
  
  // Fallback to default template
  const subject = 'We\'re Sad to See You Go - The Pep Planner';
  const defaultTemplate = {
    heading: 'We\'re Sad to See You Go! 😢',
    greeting: `Hi ${userName || 'User'},`,
    mainMessage: `Your account and all associated data have been permanently deleted from The Pep Planner. We understand that sometimes things don't work out, and we respect your decision.\n\nAll your research data, protocols, and account information have been completely removed from our system. This action cannot be undone.`,
    ctaText: 'Share Your Feedback',
    ctaLink: 'https://thepepplanner.app/feedback',
    highlightTitle: '💡 Want to Return?',
    highlightMessage: 'If you change your mind and would like to use The Pep Planner again in the future, you\'ll need to create a new account. We\'d love to have you back!',
    features: [
      'Account Status – Permanently deleted',
      'Data Removal – All research data removed',
      'Subscription – Cancelled (if applicable)',
      'Rejoining – New account required'
    ]
  };
  const html = generateEmailHTML(defaultTemplate, { userName: userName || 'User', userEmail });
  return sendEmail(userEmail, subject, html);
};

/**
 * Send in-depth request email
 */
exports.sendInDepthRequestEmail = async (userEmail, userName = null, customContent = null) => {
  // If custom content is provided, use it directly
  if (customContent && (customContent.subject || customContent.mainMessage)) {
    logger.info('📧 Using custom email content for in-depth request');
    const subject = customContent.subject || 'In-Depth Request - The Pep Planner';
    const template = {
      heading: 'In-Depth Request',
      greeting: customContent.greeting || `Hi ${userName || 'there'},`,
      mainMessage: customContent.mainMessage || '',
      ctaText: '',
      ctaLink: '',
      highlightTitle: '',
      highlightMessage: '',
      features: []
    };
    
    // Build HTML with custom content
    let html = generateEmailHTML(template, { userName, userEmail });
    
    // Replace signature if provided
    if (customContent.signature) {
      const signatureHtml = customContent.signature.replace(/\n/g, '<br>');
      html = html.replace(
        /Happy Researching! ✌🏻,<br>\s*<strong[^>]*>The Pep Planner Team<\/strong>/,
        signatureHtml
      );
    }
    
    return sendEmail(userEmail, subject, html);
  }
  
  // Otherwise, use template from Firestore or default
  try {
    const customTemplate = await loadEmailTemplate('inDepthRequest');
    if (customTemplate) {
      const subject = customTemplate.subject || 'In-Depth Request - The Pep Planner';
      const html = generateEmailHTML(customTemplate, { userName, userEmail });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load in-depth request template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'In-Depth Request - The Pep Planner';
  const defaultTemplate = {
    heading: 'In-Depth Request',
    greeting: `Hi ${userName || 'there'},`,
    mainMessage: 'Thank you for your in-depth request. We have received your inquiry and will review it carefully. Our team will get back to you as soon as possible.',
    ctaText: '',
    ctaLink: '',
    highlightTitle: '📋 Request Received',
    highlightMessage: 'We typically respond within 24-48 hours.',
    features: []
  };
  const html = generateEmailHTML(defaultTemplate, { userName, userEmail });
  return sendEmail(userEmail, subject, html);
};

/**
 * Send invite email
 */
exports.sendInviteEmail = async (userEmail, userName = null, inviteLink = null, customContent = null) => {
  // If custom content is provided, use it directly
  if (customContent && (customContent.subject || customContent.mainMessage)) {
    logger.info('📧 Using custom email content for invite');
    const subject = customContent.subject || 'You\'re Invited to The Pep Planner! 🎉';
    const template = {
      heading: 'You\'re Invited!',
      greeting: customContent.greeting || `Hi ${userName || 'there'}!`,
      mainMessage: customContent.mainMessage || '',
      ctaText: 'Accept Invitation',
      ctaLink: inviteLink || 'https://thepepplanner.app/signup',
      highlightTitle: '🎁 Special Invitation',
      highlightMessage: 'Join our research community and start organizing your protocols today.',
      features: []
    };
    
    // Build HTML with custom content
    let html = generateEmailHTML(template, { userName, userEmail, inviteLink: inviteLink || 'https://thepepplanner.app/signup' });
    
    // Replace signature if provided
    if (customContent.signature) {
      const signatureHtml = customContent.signature.replace(/\n/g, '<br>');
      html = html.replace(
        /Happy Researching! ✌🏻,<br>\s*<strong[^>]*>The Pep Planner Team<\/strong>/,
        signatureHtml
      );
    }
    
    return sendEmail(userEmail, subject, html);
  }
  
  // Otherwise, use template from Firestore or default
  try {
    const customTemplate = await loadEmailTemplate('inviteEmail');
    if (customTemplate) {
      const subject = customTemplate.subject || 'You\'re Invited to The Pep Planner! 🎉';
      const html = generateEmailHTML(customTemplate, { 
        userName, 
        userEmail, 
        inviteLink: inviteLink || 'https://thepepplanner.app/signup' 
      });
      return sendEmail(userEmail, subject, html);
    }
  } catch (error) {
    logger.warn('Failed to load invite email template, using default:', error);
  }
  
  // Fallback to hardcoded template
  const subject = 'You\'re Invited to The Pep Planner! 🎉';
  const defaultTemplate = {
    heading: 'You\'re Invited!',
    greeting: `Hi ${userName || 'there'}!`,
    mainMessage: 'You\'ve been invited to join The Pep Planner, your complete research management platform. Create an account to get started with organizing your research protocols and tracking your progress.',
    ctaText: 'Accept Invitation',
    ctaLink: inviteLink || 'https://thepepplanner.app/signup',
    highlightTitle: '🎁 Special Invitation',
    highlightMessage: 'Join our research community and start organizing your protocols today.',
    features: []
  };
  const html = generateEmailHTML(defaultTemplate, { userName, userEmail, inviteLink: inviteLink || 'https://thepepplanner.app/signup' });
  return sendEmail(userEmail, subject, html);
};

/**
 * Send account deletion request notification to admin
 * This sends an email to contact@thepepplanner.com with user details
 */
exports.sendAccountDeletionRequestToAdmin = async (userEmail, userName = null, dataSummary = {}) => {
  const adminEmail = 'contact@thepepplanner.com';
  
  const subject = `Account Deletion Request - ${userEmail}`;
  
  // Build data summary text
  const dataSummaryText = Object.entries(dataSummary)
    .map(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
      return `  • ${label}: ${value}`;
    })
    .join('\n');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #344E41, #3A5A40); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .data-summary { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; border-radius: 4px; }
        .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .warning { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🗑️ Account Deletion Request</h2>
        </div>
        <div class="content">
          <p><strong>User Email:</strong> ${userEmail}</p>
          <p><strong>User Name:</strong> ${userName || 'Not provided'}</p>
          <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          
          <div class="data-summary">
            <p class="warning">⚠️ The following data will be deleted within 48 hours:</p>
            <pre style="margin: 10px 0; font-family: monospace; font-size: 12px;">${dataSummaryText || '  • No data summary available'}</pre>
          </div>
          
          <p><strong>Action Required:</strong> Please manually delete this user's account and all associated data from Firebase/Firestore within 48 hours.</p>
          
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <small>This is an automated notification from The Pep Planner account deletion system.</small>
          </p>
        </div>
        <div class="footer">
          <p>The Pep Planner - Account Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail(adminEmail, subject, html);
};

/**
 * Send trial expired survey email
 * Uses queue system to track email count
 */
exports.sendTrialExpiredSurveyEmail = async (userEmail, userName = null, surveyLink = null) => {
  const emailQueue = require('./emailQueue');
  
  try {
    logger.info('📧 Attempting to load custom trialExpiredSurvey template...');
    const customTemplate = await loadEmailTemplate('trialExpiredSurvey');
    if (customTemplate) {
      logger.info('✅ Custom trialExpiredSurvey template found in Firestore');
      // Use the surveyLink parameter if provided, otherwise use the template's ctaLink or default
      const finalSurveyLink = surveyLink || customTemplate.ctaLink || 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header';
      const variables = { 
        userName: userName || 'there', 
        userEmail, 
        surveyLink: finalSurveyLink 
      };
      logger.info('📧 Variables for trial expired survey:', {
        userName: variables.userName,
        userEmail: variables.userEmail,
        surveyLink: variables.surveyLink ? variables.surveyLink.substring(0, 50) + '...' : 'null'
      });
      const html = generateEmailHTML(customTemplate, variables);
      // Replace variables in subject after processing (subject is processed in generateEmailHTML but we need to extract it)
      let subject = customTemplate.subject || 'Quick Survey: Help Us Improve The Pep Planner 📊';
      // Replace variables in subject manually since we extract it before generateEmailHTML processes it
      Object.entries(variables).forEach(([key, value]) => {
        const replacement = value || '';
        const regex = new RegExp(`%${key.toUpperCase()}%`, 'g');
        subject = subject.replace(regex, replacement);
      });
      // Use queue system with low priority for survey emails
      const result = await emailQueue.sendEmailWithQueue(userEmail, subject, html, {
        priority: emailQueue.PRIORITY_LOW,
        type: 'trialExpiredSurvey',
        metadata: { userName, surveyLink: finalSurveyLink }
      });
      return result.sent || result.queued; // Return true if sent or queued
    }
  } catch (e) {
    logger.error('❌ Failed to load custom trialExpiredSurvey template:', e);
  }
  logger.info('📧 Falling back to hardcoded trialExpiredSurvey template');
  const subject = 'Quick Survey: Help Us Improve The Pep Planner 📊';
  const finalSurveyLink = surveyLink || 'https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header';
  const html = emailTemplates.trialExpiredSurveyEmail(userName || 'there', userEmail, finalSurveyLink);
  // Use queue system with low priority for survey emails
  const result = await emailQueue.sendEmailWithQueue(userEmail, subject, html, {
    priority: emailQueue.PRIORITY_LOW,
    type: 'trialExpiredSurvey',
    metadata: { userName, surveyLink: finalSurveyLink }
  });
  return result.sent || result.queued; // Return true if sent or queued
};

