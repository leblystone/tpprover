# 🗑️ Manual User Deletion Guide

## Overview
Added a "Manual User Deletion" section to the admin panel for emergency deletions or legacy requests that didn't go through the automated system.

---

## Where to Find It
**Admin Panel → Settings → Deletions → Pending Requests Tab**

At the very top of the page, you'll see a red-bordered section titled:
**"Manual User Deletion (Emergency Use Only)"**

---

## How to Use It

1. **Enter the user's email address** in the text input field
2. **Click "Delete User"** button
3. **Confirm TWICE** (for safety):
   - First confirmation dialog explains what will happen
   - Second prompt asks you to re-type the email to confirm
4. System automatically:
   - ✅ Sends goodbye email to user ("We're Sad to See You Go")
   - ✅ Cancels their Stripe subscription (if any)
   - ✅ Deletes ALL Firestore data (users, userData, userSubscriptions, etc.)
   - ✅ Deletes from Firebase Auth
   - ✅ Logs to `accountDeletions` history

---

## When to Use This

✅ **Use for:**
- Legacy deletion requests from old system (like kaylatilley83@gmail.com)
- Emergency deletions requested via email/support
- Users who cannot access the app to request deletion
- GDPR/legal deletion requests

❌ **Don't use for:**
- Normal deletion requests (use the "Approve & Delete" button instead)
- Testing (use test accounts)

---

## Safety Features

🛡️ **Double Confirmation:**
- First: Warning dialog with full explanation
- Second: Must re-type email exactly to confirm

🛡️ **Email Sent First:**
- User receives goodbye email BEFORE any data is deleted
- Ensures they have confirmation even if something goes wrong

🛡️ **Full Audit Trail:**
- All deletions logged to `accountDeletions` collection
- Includes timestamp, email, and reason

---

## Example: Delete kaylatilley83@gmail.com

1. Go to **Admin → Settings → Deletions**
2. At the top, find the red "Manual User Deletion" section
3. Type: `kaylatilley83@gmail.com`
4. Click **"Delete User"**
5. Confirm in the dialog
6. Re-type email when prompted: `kaylatilley83@gmail.com`
7. ✅ Done! User receives goodbye email and account is deleted

---

## What Happens Behind the Scenes

The manual deletion uses the same `adminTerminateUser` Cloud Function as the "Approve & Delete" button, ensuring:
- ✅ Same email sent to user
- ✅ Same deletion process
- ✅ Same safety checks
- ✅ Same audit logging

**The only difference:** No deletion request document needed (for legacy/emergency cases)

---

## UI Preview

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Manual User Deletion (Emergency Use Only)               │
│                                                             │
│ Delete a user account by email address. Use this for      │
│ legacy requests or emergency deletions. The user will      │
│ receive a goodbye email confirmation.                      │
│                                                             │
│ [Enter user email address...            ] [🗑️ Delete User]│
└─────────────────────────────────────────────────────────────┘
```

---

## Pro Tips

💡 Always verify the email is correct before confirming
💡 Check if user has active subscription first (system handles cancellation automatically)
💡 User will receive the same "We're Sad to See You Go" email as normal deletions
💡 All deletions appear in the "Deletion History" tab for audit purposes

---

## Questions?

This feature is now live and ready to use. No deployment needed since it uses existing backend functions!
