// 🔍 Email System Diagnostic Function
// This will help identify why emails aren't being sent

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Comprehensive email system diagnostic
 * Checks API key, function access, and sends a test email
 */
exports.diagnoseEmailSystem = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      checks: {},
      errors: [],
      recommendations: []
    };

    try {
      // Check 1: Is RESEND_API_KEY accessible?
      logger.info('🔍 Check 1: Testing RESEND_API_KEY access...');
      const resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/\r?\n/g, '');
      
      diagnostics.checks.apiKeyAccessible = !!resendApiKey;
      diagnostics.checks.apiKeyLength = resendApiKey ? resendApiKey.length : 0;
      diagnostics.checks.apiKeyFormat = resendApiKey ? resendApiKey.startsWith('re_') : false;
      diagnostics.checks.apiKeyPreview = resendApiKey ? `${resendApiKey.substring(0, 10)}...` : 'NOT FOUND';

      if (!resendApiKey) {
        diagnostics.errors.push('RESEND_API_KEY is not accessible in process.env');
        diagnostics.recommendations.push('Run: firebase functions:secrets:set RESEND_API_KEY');
      } else if (!resendApiKey.startsWith('re_')) {
        diagnostics.errors.push('RESEND_API_KEY format is invalid (should start with "re_")');
        diagnostics.recommendations.push('Verify the API key is correct in Firebase Secrets');
      }

      // Check 2: Can we import Resend?
      logger.info('🔍 Check 2: Testing Resend import...');
      try {
        const { Resend } = require('resend');
        diagnostics.checks.resendImport = true;
        
        // Try to get version, but don't fail if package.json isn't accessible
        try {
          const pkg = require('resend/package.json');
          diagnostics.checks.resendVersion = pkg?.version || 'unknown';
        } catch (versionError) {
          diagnostics.checks.resendVersion = 'installed (version not accessible)';
        }
      } catch (error) {
        diagnostics.checks.resendImport = false;
        diagnostics.errors.push(`Failed to import Resend: ${error.message}`);
        diagnostics.recommendations.push('Run: cd functions && npm install resend');
      }

      // Check 3: Can we initialize Resend client?
      if (resendApiKey && resendApiKey.startsWith('re_')) {
        logger.info('🔍 Check 3: Testing Resend client initialization...');
        try {
          const { Resend } = require('resend');
          const resend = new Resend(resendApiKey);
          diagnostics.checks.resendClientInit = true;
        } catch (error) {
          diagnostics.checks.resendClientInit = false;
          diagnostics.errors.push(`Failed to initialize Resend client: ${error.message}`);
        }
      }

      // Check 4: Test sending an email
      if (resendApiKey && resendApiKey.startsWith('re_') && diagnostics.checks.resendClientInit) {
        logger.info('🔍 Check 4: Testing email send...');
        const testEmail = request.data?.testEmail || 'thepepplanner@gmail.com';
        
        try {
          const { Resend } = require('resend');
          const resend = new Resend(resendApiKey);
          
          const result = await resend.emails.send({
            from: 'The Pep Planner <noreply@thepepplanner.app>',
            to: testEmail,
            subject: '🔍 Email System Diagnostic Test',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #344E41;">Email System Diagnostic</h1>
                <p>If you're receiving this email, the Resend integration is working!</p>
                <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
                <p><strong>API Key Status:</strong> ✅ Accessible</p>
                <p><strong>Resend Client:</strong> ✅ Initialized</p>
                <p style="color: #10B981; font-weight: bold;">✅ All systems operational!</p>
              </div>
            `,
            replyTo: 'contact@thepepplanner.com',
            headers: {
              // Mark as transactional to avoid Promotions tab
              'X-Priority': '1',
              'X-Mailer': 'The Pep Planner',
              'Auto-Submitted': 'no',
              'X-Auto-Response-Suppress': 'All',
              'X-Transaction-Type': 'transactional',
            },
            tags: [
              { name: 'category', value: 'transactional' },
              { name: 'type', value: 'diagnostic' }
            ],
          });

          if (result.data && result.data.id) {
            diagnostics.checks.emailSendSuccess = true;
            diagnostics.checks.emailId = result.data.id;
            diagnostics.checks.testEmailSent = testEmail;
          } else if (result.error) {
            diagnostics.checks.emailSendSuccess = false;
            diagnostics.errors.push(`Resend API error: ${result.error.message || JSON.stringify(result.error)}`);
          } else {
            diagnostics.checks.emailSendSuccess = false;
            diagnostics.errors.push('Unexpected Resend response');
          }
        } catch (error) {
          diagnostics.checks.emailSendSuccess = false;
          diagnostics.errors.push(`Email send failed: ${error.message}`);
          diagnostics.errors.push(`Error stack: ${error.stack}`);
        }
      }

      // Check 5: Check emailHistory collection access
      logger.info('🔍 Check 5: Testing Firestore access...');
      try {
        const db = admin.firestore();
        const testDoc = await db.collection('emailHistory').limit(1).get();
        diagnostics.checks.firestoreAccess = true;
        diagnostics.checks.emailHistoryCount = testDoc.size;
      } catch (error) {
        diagnostics.checks.firestoreAccess = false;
        diagnostics.errors.push(`Firestore access failed: ${error.message}`);
      }

      // Check 6: List all functions that need RESEND_API_KEY
      logger.info('🔍 Check 6: Listing email functions...');
      diagnostics.checks.emailFunctions = [
        'onUserCreated (trigger)',
        'sendWelcomeEmail',
        'sendCustomVerificationEmail',
        'sendAccountDeletionEmail',
        'sendInDepthRequestEmail',
        'sendInviteEmail',
        'sendLifetimeAccessEmail',
        'sendCustomAnnouncementEmail',
        'sendTrialExpiredSurveyEmail',
        'createSupportTicket',
        'addTicketMessage',
        'scheduledTrialReminders',
        'scheduledTrialExpiredSurvey',
        'scheduledResearchReminders'
      ];

      // Overall status
      const allChecksPass = 
        diagnostics.checks.apiKeyAccessible &&
        diagnostics.checks.apiKeyFormat &&
        diagnostics.checks.resendImport &&
        diagnostics.checks.resendClientInit &&
        diagnostics.checks.emailSendSuccess &&
        diagnostics.checks.firestoreAccess;

      diagnostics.overallStatus = allChecksPass ? '✅ OPERATIONAL' : '❌ ISSUES DETECTED';

      if (!allChecksPass) {
        diagnostics.recommendations.push('Review the errors above and fix each issue');
        diagnostics.recommendations.push('Check Firebase Functions logs for detailed error messages');
        diagnostics.recommendations.push('Verify RESEND_API_KEY is set: firebase functions:secrets:access RESEND_API_KEY');
      }

      return {
        success: allChecksPass,
        diagnostics: diagnostics
      };

    } catch (error) {
      logger.error('❌ Diagnostic function error:', error);
      diagnostics.errors.push(`Diagnostic function failed: ${error.message}`);
      diagnostics.errors.push(`Stack: ${error.stack}`);
      return {
        success: false,
        diagnostics: diagnostics
      };
    }
  }
);

