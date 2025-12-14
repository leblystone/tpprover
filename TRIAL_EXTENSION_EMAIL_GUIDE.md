# Trial Extension Email Template Guide

## Overview
This guide documents the automatic email notification system that triggers when an admin manually extends a user's trial period from the admin panel.

## Implementation Summary

### 1. Email Template (`functions/emailTemplates.js`)
- **Function**: `trialExtensionEmail(userName, userEmail, daysAdded, newEndDate, adminNote)`
- **Design**: Matches The Pep Planner brand using sage color palette
- **Features**:
  - Personalized greeting with user's name
  - Clear display of extension details (days added, new end date)
  - Optional admin note display if provided
  - Feature highlights to remind users what they have access to
  - Call-to-action button to continue research
  - Professional, research-focused messaging

### 2. Email Service Function (`functions/emailService.js`)
- **Function**: `sendTrialExtensionEmail(userEmail, userName, daysAdded, newEndDate, adminNote)`
- **Behavior**:
  - First checks Firestore for custom `trialExtension` template
  - Falls back to hardcoded template if custom template not found
  - Logs all actions for debugging
  - Returns email send result

### 3. Cloud Function Integration (`functions/index.js`)
- **Function**: `adminExtendTrialPeriod`
- **Trigger**: Automatically sends email after successful trial extension
- **Error Handling**: 
  - Email failure does NOT cause trial extension to fail
  - Email errors are logged but don't impact the main function
  - Ensures trial extension always succeeds even if email fails

## Email Content

### Subject Line
🎉 Your Research Trial Has Been Extended!

### Key Information Displayed
- Days added to trial
- New trial end date (formatted nicely)
- Optional admin note (if provided)
- List of available features during trial

### Call to Action
"Continue Your Research" button linking to dashboard

## Admin Panel Usage

When an admin extends a trial from the admin panel:
1. Admin fills in extension days and optional note
2. Trial extension is processed via Cloud Function
3. User's trial period is updated in Firestore
4. Email notification is automatically sent to user
5. User receives confirmation email with all details

## Customization Options

### Option 1: Use Default Template
- No setup required
- Template is hardcoded and ready to use
- Matches existing brand styling

### Option 2: Create Custom Template in Firestore
1. Navigate to Firestore Console
2. Go to `emailTemplates` collection
3. Create document with ID: `trialExtension`
4. Add custom fields:
   - `subject`: Email subject line
   - `heading`: Main header text
   - `greeting`: Opening greeting (supports %USERNAME%, %USEREMAIL%)
   - `mainMessage`: Main message body (supports %DAYSADDED%, %NEWENDDATE%, %ADMINNOTE%)
   - `ctaText`: Button text
   - `ctaLink`: Button URL
   - `colors`: Color palette object

### Available Template Variables
- `%USERNAME%` - User's display name
- `%USEREMAIL%` - User's email address
- `%DAYSADDED%` - Number of days added
- `%NEWENDDATE%` - New trial end date
- `%ADMINNOTE%` - Optional admin message

## Testing

To test the email template:
1. Use the admin panel trial extension feature
2. Extend a test user's trial with a note
3. Check the user's email inbox
4. Verify all information is displayed correctly

## Logging

All email activities are logged in Cloud Functions:
- `📧 Sending trial extension email to {email}`
- `✅ Trial extension email sent successfully`
- `❌ Failed to send trial extension email` (if error occurs)

## Notes

- Email is sent **after** trial extension succeeds in database
- Email failure does not roll back the trial extension
- User email is retrieved from their user profile in Firestore
- If user has no email, extension still succeeds but no email is sent
- Admin note is optional and only shown if provided

## Files Modified

1. `functions/emailTemplates.js` - Added `trialExtensionEmail` template
2. `functions/emailService.js` - Added `sendTrialExtensionEmail` service function
3. `functions/index.js` - Updated `adminExtendTrialPeriod` to trigger email

---

**Last Updated**: December 14, 2025

