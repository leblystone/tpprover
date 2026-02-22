# 📧 Email System – Full Audit

**Date:** 2026-02-20  
**Purpose:** Single source of truth for every email: template source, admin-editable or not, and inconsistencies.

**Updates (2026-02-20):**
- Email change: Legacy callables `sendEmailChangeVerificationNotification` and `sendEmailChangeNotification` are now no-ops. Only `requestEmailChangeVerification` sends email-change emails. All three templates (emailChangeNotification, emailChangeVerification, emailChangeVerificationWithLink) are in the admin list; `sendEmailChangeVerificationWithLink` uses `loadEmailTemplate('emailChangeVerificationWithLink')` when the Firestore doc exists.
- Dispute emails: `sendDisputeNotificationEmail`, `sendDisputeStatusUpdateEmail`, and `sendDisputeResolutionEmail` are implemented in emailService.js with Firestore IDs disputeNotification, disputeStatusUpdate, disputeResolution and inline fallbacks. All three are in the admin panel under "Disputes (Chargebacks)".
- Account deletion request confirmation: `sendAccountDeletionRequestConfirmation` now uses `loadEmailTemplate('accountDeletionRequestConfirmation')` when present. Template added to admin list under "Custom & Announcements".

---

## How the system works today

1. **Firestore**  
   Custom templates live in `emailTemplates/{templateId}`. The admin panel (Email Template Manager) only shows and saves templates that exist in the **hardcoded list** `DEFAULT_TEMPLATES` in `EmailTemplateManager.jsx`. If a template type is used in backend code but not in that list, it does **not** appear in the admin UI.

2. **Backend (emailService.js)**  
   For each email type we either:
   - **A)** Call `loadEmailTemplate('templateId')` → if a Firestore doc exists, use it with `generateEmailHTML()`; else fall back to a function in `emailTemplates.js` (hardcoded).
   - **B)** Use only a hardcoded function from `emailTemplates.js` (no Firestore, no admin).
   - **C)** Build HTML inline in `emailService.js` (no Firestore, no admin).

3. **emailTemplates.js**  
   Contains many duplicate-style exports (e.g. multiple `giftNotificationEmail` implementations, V2 variants). The **active** fallback is whichever function each `emailService.send*` actually calls when Firestore returns null.

---

## Master list: every email

| # | Email type / trigger | Backend function | Firestore template ID | Fallback (if no Firestore) | In admin list? | Notes |
|---|----------------------|------------------|------------------------|-----------------------------|----------------|-------|
| 1 | Welcome (on signup) | sendWelcomeEmail | welcome | emailTemplates.welcomeEmail | ✅ welcome | |
| 2 | Email verification (signup) | sendCustomVerificationEmail | verification | defaultTemplate + emailTemplates | ✅ verification | |
| 3 | Password reset | sendCustomPasswordResetEmail, sendPasswordResetEmail | passwordReset | emailTemplates.passwordResetEmail | ✅ passwordReset | |
| 4 | Manual lifetime grant (pre-grant) | (in index flow) | manualLifetimeGrant | emailTemplates.lifetimeAccessGrantedEmail | ✅ manualLifetimeGrant | |
| 5 | Lifetime access granted | sendLifetimeAccessGrantedEmail, sendLifetimeAccessEmail | lifetimeAccessGranted | emailTemplates.lifetimeAccessGrantedEmail | ✅ lifetimeAccessGranted | sendLifetimeAccessEmail also tries manualLifetimeGrant |
| 6 | Trial ending soon | sendTrialEndingEmail | trialEnding | emailTemplates.trialEndingEmail | ✅ trialEnding | |
| 7 | Trial extension | sendTrialExtensionEmail | trialExtension | emailTemplates.trialExtensionEmail | ✅ trialExtension | |
| 8 | Subscription confirmed | sendSubscriptionConfirmedEmail, sendSubscriptionConfirmationEmail | subscription | emailTemplates.subscriptionConfirmedEmail | ✅ subscription | |
| 9 | Payment failed | sendPaymentFailedEmail | paymentFailed | emailTemplates.paymentFailedEmail | ✅ paymentFailed | |
| 10 | Payment successful | sendPaymentSuccessfulEmail | paymentSuccessful | emailTemplates.paymentSuccessfulEmail | ✅ paymentSuccessful | |
| 11 | Email change – verification (instructional, legacy) | sendEmailChangeVerificationNotification (no-op) | emailChangeVerification | emailTemplates.emailChangeVerificationEmail | ✅ in admin | “Check your inbox for Firebase’s email” – no link. Still used if old flow runs. |
| 12 | Email change – security alert (old email) | sendEmailChangeNotification (no-op) | emailChangeNotification | emailTemplates.emailChangeNotificationEmail | ✅ in admin | Sent to OLD email. |
| 13 | Email change – verification WITH link (main + admin resend) | sendEmailChangeVerificationWithLink, requestEmailChangeVerification | emailChangeVerificationWithLink | emailTemplates.emailChangeVerificationWithLinkEmail | ✅ in admin | Uses loadEmailTemplate when Firestore doc exists. |
| 14 | Subscription cancelled | sendSubscriptionCancelledEmail | subscriptionCancelled | emailTemplates.subscriptionCancelledEmail | ✅ subscriptionCancelled | |
| 15 | Renewal reminder | sendRenewalReminderEmail | renewalReminder | emailTemplates.renewalReminderEmail | ✅ renewalReminder | |
| 16 | Weekly research reminder | sendWeeklyResearchReminderEmail | weeklyReminder | emailTemplates.weeklyResearchReminderEmail | ✅ weeklyReminder | |
| 17 | Gift – recipient notification | sendGiftNotificationEmail | giftNotification | emailTemplates.giftNotificationEmail | ✅ giftNotification | |
| 18 | Gift – purchase confirmation (giver) | sendGiftPurchaseConfirmationEmail | giftPurchaseConfirmation | emailTemplates.giftPurchaseConfirmationEmail | ✅ giftPurchaseConfirmation | |
| 19 | Gift – redeemed (recipient) | sendGiftRedeemedEmail | giftRedeemed | emailTemplates.giftRedeemedEmail | ✅ giftRedeemed | |
| 20 | Gift – redeemed notification (giver) | sendGiftRedeemedNotificationEmail | giftRedeemedNotification | emailTemplates.giftRedeemedNotificationEmail | ✅ giftRedeemedNotification | |
| 21 | Gift expiring soon | sendGiftExpiringSoonEmail | giftExpiringSoon | emailTemplates.giftExpiringSoonEmail | ✅ giftExpiringSoon | |
| 22 | Squarespace activation | sendSquarespaceActivationEmail | squarespaceActivation | inline + emailTemplates | ✅ squarespaceActivation | |
| 23 | Squarespace subscription activated | sendSquarespaceSubscriptionActivatedEmail | squarespaceActivated | emailTemplates (inline) | ✅ squarespaceActivated | |
| 24 | Custom announcement | sendCustomAnnouncementEmail | customAnnouncement | emailTemplates.lifetimeAccessGrantedEmail (reused) | ✅ customAnnouncement | |
| 25 | Account deletion (final) | sendAccountDeletionEmail | accountDeletion | defaultTemplate + generateEmailHTML | ✅ accountDeletion | |
| 26 | Account deletion request – confirmation to user | sendAccountDeletionRequestConfirmation | **accountDeletionRequestConfirmation** | defaultTemplate + generateEmailHTML | ✅ in admin | Uses Firestore when doc exists. |
| 27 | Account deletion request – to admin (old) | sendAccountDeletionRequestToAdmin | **(none)** | Inline HTML in emailService | ❌ **MISSING** | Internal admin email. |
| 28 | Account deletion request – to admin (new) | sendAccountDeletionRequestAdminNotification | **(none)** | Inline HTML in emailService | ❌ **MISSING** | Internal admin email. |
| 29 | In-depth request | sendInDepthRequestEmail | inDepthRequest | defaultTemplate + generateEmailHTML | ✅ inDepthRequest | Can use custom content from admin. |
| 30 | Invite | sendInviteEmail | inviteEmail | defaultTemplate + generateEmailHTML | ✅ inviteEmail | |
| 31 | Trial expired survey | sendTrialExpiredSurveyEmail | trialExpiredSurvey | emailTemplates.trialExpiredSurveyEmail | ✅ trialExpiredSurvey | |
| 32 | Win-back campaign | sendWinBackEmail | winBack | emailTemplates.winBackEmail | ✅ winBack | |
| 33 | Resend from Email History | resendEmail (index.js) | (varies by type) | Reuses stored content or re-sends by type | N/A | Uses type + optional custom content. |
| 34 | Contact form submission | submitContactForm | **(none)** | Inline HTML in index.js | ❌ **MISSING** | To contact@. |
| 35 | Support ticket / new message to admin | (in createSupportTicket, addTicketMessage, etc.) | **(none)** | Inline HTML in index.js | ❌ **MISSING** | Internal. |
| 36 | Dispute notification (chargeback created) | sendDisputeNotificationEmail | **disputeNotification** | Inline HTML fallback in emailService | ✅ in admin | Implemented; Firestore when doc exists. |
| 37 | Dispute status update | sendDisputeStatusUpdateEmail | **disputeStatusUpdate** | Inline HTML fallback in emailService | ✅ in admin | Implemented; Firestore when doc exists. |
| 38 | Dispute resolution (closed) | sendDisputeResolutionEmail | **disputeResolution** | Inline HTML fallback in emailService | ✅ in admin | Implemented; Firestore when doc exists. |

---

## Inconsistencies and problems

1. **Email change**  
   - **Fixed.** All three email-change templates are in the admin list; legacy callables are no-ops.  
   - **emailChangeVerificationWithLink** (the one with the button/link) uses Firestore when the doc exists and is in the admin list under "Email Change". Otherwise: falls back to hardcoded in `emailTemplates.js` when no Firestore doc . “change email” 
2. **Two “verification” emails for email change**  
   - If both the old and new flows run (or old code path still fires), the user can get:  
     (a) the **instructional** email (emailChangeVerification – “check your inbox for Firebase’s email”), and  
     (b) the **with-link** email (emailChangeVerificationWithLink – actual button).  
   - Only (b) is used by the current primary flow (`requestEmailChangeVerification`). (a) is still sent if `sendEmailChangeVerificationNotification` is called anywhere.

3. **Account deletion and internal admin emails**  
   - Deletion request **confirmation to user** now uses Firestore template accountDeletionRequestConfirmation (in admin). The two **admin** notifications are still inline.

4. **Dispute emails**  
   - **Fixed.** All three dispute email functions are implemented in emailService.js with Firestore IDs and admin list entries.

5. **Contact form and support tickets**  
   - Built with inline HTML in Cloud Functions. Not in admin panel.

6. **Duplicate / V2 templates in emailTemplates.js**  
   - Many templates have multiple versions (e.g. welcomeEmail vs welcomeEmailV2, multiple giftNotificationEmail). Only one is used per send path; the rest are dead code or legacy. This makes it unclear which copy is “the” template and complicates making every email editable the same way.

---

## What “every email editable the same way” should mean

- **Single list in admin:** One list in the admin panel that includes **every** user-facing (and, if you choose, internal) email type.
- **One template per type:** Each list entry maps to one Firestore doc (e.g. `emailTemplates/emailChangeVerificationWithLink`) and one send path.
- **Same flow for all:** For each type, backend does: `loadEmailTemplate(id)` → if exists, `generateEmailHTML(template, variables)`; else fall back to a single hardcoded default. No inline HTML in `index.js` or `emailService.js` for that type.
- **No hidden templates:** No template type used in code is missing from the admin list.

---

## Recommended next steps

1. **Add missing entries to admin**  
   Add to `DEFAULT_TEMPLATES` and to the dropdown (in the right optgroup):  
   - **emailChangeVerification** (instructional – can mark as legacy/deprecated).  
   - **emailChangeNotification** (security alert to old email).  
   - **emailChangeVerificationWithLink** (main verification email with link; this is the one you want to edit).

2. **Wire email change to Firestore**  
   - For `sendEmailChangeVerificationWithLink`, call `loadEmailTemplate('emailChangeVerificationWithLink')` and, if present, use `generateEmailHTML(template, { newEmail, oldEmail, verificationLink })` (with a consistent variable set). Fall back to `emailTemplates.emailChangeVerificationWithLinkEmail(...)` if the doc is missing.  
   - Ensure `sendEmailChangeNotification` and `sendEmailChangeVerificationNotification` use the same Firestore IDs as the new admin entries (already correct: emailChangeNotification, emailChangeVerification).

3. **Optional: internal/admin emails**  
   - If you want **every** form of communication in the panel (including contact form and support ticket text), add Firestore template IDs and admin list entries for them and replace inline HTML with `loadEmailTemplate` + `generateEmailHTML`.

4. **Dispute emails**  
   - Implement `sendDisputeNotificationEmail`, `sendDisputeStatusUpdateEmail`, and `sendDisputeResolutionEmail` in `emailService.js` (or one shared module), and add three template IDs + three admin list entries so they work and are editable like the rest.

5. **Account deletion request confirmation**  
   - Add a Firestore template (e.g. `accountDeletionRequestConfirmation`) and use it in `sendAccountDeletionRequestConfirmation` so it’s editable in the admin panel.

6. **Cleanup**  
   - Over time, remove or clearly deprecate duplicate/V2 and unused functions in `emailTemplates.js` so there is one canonical template per email type.

---

## Quick reference: Firestore IDs used by loadEmailTemplate (backend)

- welcome  
- verification  
- manualLifetimeGrant  
- lifetimeAccessGranted  
- passwordReset  
- trialEnding  
- trialExtension  
- subscription  
- paymentFailed  
- paymentSuccessful  
- **emailChangeVerification**  
- **emailChangeNotification**  
- subscriptionCancelled  
- renewalReminder  
- weeklyReminder  
- giftNotification  
- giftPurchaseConfirmation  
- giftRedeemed  
- giftRedeemedNotification  
- giftExpiringSoon  
- squarespaceActivation  
- squarespaceActivated  
- customAnnouncement  
- accountDeletion  
- inDepthRequest  
- inviteEmail  
- trialExpiredSurvey  
- winBack  
- emailChangeVerificationWithLink  
- accountDeletionRequestConfirmation  
- disputeNotification  
- disputeStatusUpdate  
- disputeResolution  

**Not used by loadEmailTemplate (inline only):** contact form, support ticket, account deletion request to admin (two variants).
