# 🚀 Quick Reference: Switching to V2 Email Templates

## Template Name Mapping

Use this as a cheat sheet when updating your code:

| Old Template Name | New V2 Template Name | Purpose |
|---|---|---|
| `welcomeEmail` | `welcomeEmailV2` | New user welcome |
| `trialEndingEmail` | `trialEndingEmailV2` | Trial expiration warning |
| `subscriptionConfirmedEmail` | `subscriptionConfirmedEmailV2` | Subscription success |
| `paymentFailedEmail` | `paymentFailedEmailV2` | Payment issue alert |
| `passwordResetEmail` | `passwordResetEmailV2` | Password reset |
| `trialExpiredSurveyEmail` | `trialExpiredSurveyEmailV2` | Post-trial feedback |
| `lifetimeAccessGrantedEmail` | `lifetimeAccessGrantedEmailV2` | Lifetime access notification |
| `paymentSuccessfulEmail` | `paymentSuccessfulEmailV2` | Payment receipt |
| `subscriptionCancelledEmail` | `subscriptionCancelledEmailV2` | Cancellation confirmation |
| `renewalReminderEmail` | `renewalReminderEmailV2` | Renewal reminder |
| `weeklyResearchReminderEmail` | `weeklyResearchReminderEmailV2` | Weekly engagement |
| `giftExpiringSoonEmail` | `giftExpiringSoonEmailV2` | Gift expiring |
| `giftNotificationEmail` | `giftNotificationEmailV2` | Gift received |
| `giftPurchaseConfirmationEmail` | `giftPurchaseConfirmationEmailV2` | Gift purchase receipt |
| `giftRedeemedEmail` | `giftRedeemedEmailV2` | Gift redeemed (recipient) |
| `giftRedeemedNotificationEmail` | `giftRedeemedNotificationEmailV2` | Gift redeemed (giver) |
| `trialExtensionEmail` | `trialExtensionEmailV2` | Trial extended |
| `emailChangeNotificationEmail` | `emailChangeNotificationEmailV2` | Email changed alert |
| `emailChangeVerificationEmail` | `emailChangeVerificationEmailV2` | Email verification |

## Find & Replace Script

Run this in your code editor (VS Code, etc.):

```javascript
// Find: emailTemplates.welcomeEmail(
// Replace: emailTemplates.welcomeEmailV2(

// Repeat for all 19 templates or use this regex:
// Find: emailTemplates\.(.*?Email)\(
// Replace: emailTemplates.$1V2(
```

## Where to Look for Email Calls

Check these files:
- `functions/emailService.js`
- `functions/index.js`
- `functions/squarespacePolling.js`
- `functions/googlePlayWebhooks.js`
- Any other function files that send emails

## Example Update

**Before:**
```javascript
// In emailService.js
async sendWelcomeEmail(userEmail, userName, metadata) {
  const subject = 'Welcome to The Pep Planner! 🎉';
  const html = emailTemplates.welcomeEmail(userName, userEmail);
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    userId: metadata?.userId,
    emailType: 'welcome'
  });
}
```

**After:**
```javascript
// In emailService.js
async sendWelcomeEmail(userEmail, userName, metadata) {
  const subject = 'Welcome to The Pep Planner! 🎉';
  const html = emailTemplates.welcomeEmailV2(userName, userEmail); // Changed!
  return sendEmail(userEmail, subject, html, {
    logToHistory: true,
    userId: metadata?.userId,
    emailType: 'welcome'
  });
}
```

## Testing Individual Templates

Send yourself a test email:

```javascript
// In functions/testEmailSystem.js or create a new test file
const emailTemplates = require('./emailTemplates');

// Test welcome email
const testWelcome = () => {
  const html = emailTemplates.welcomeEmailV2('Test User', 'test@example.com');
  console.log(html); // Or send via your email service
};

// Test trial ending email
const testTrialEnding = () => {
  const html = emailTemplates.trialEndingEmailV2(3, 'test@example.com', null);
  console.log(html);
};
```

## Deploy After Changes

After switching templates:

```bash
# Deploy only functions (faster)
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

## Rollback if Needed

If something breaks, just revert the change:

```javascript
// Change back to old template
const html = emailTemplates.welcomeEmail(userName, userEmail); // Removed V2
```

Old templates are still there, so it's safe to switch back!

---

That's it! Simple find & replace, test, deploy. 🚀
