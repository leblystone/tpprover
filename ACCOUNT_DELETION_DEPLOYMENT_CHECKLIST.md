# 🚀 Account Deletion System - Deployment Checklist

## ✅ Pre-Deployment (Already Done)

- ✅ Created `submitAccountDeletionRequest` Firebase function
- ✅ Updated `DeleteAccountModal` to submit requests
- ✅ Created `AccountDeletionRequests` admin component
- ✅ Added deletion requests to work queue
- ✅ Updated admin settings deletions page with tabs
- ✅ Created "We're Sad to See You Go" email template
- ✅ Added email template to backend and frontend

---

## 📋 Deployment Steps

### 1. Deploy Firebase Functions

Run this command to deploy all functions:

```bash
firebase deploy --only functions
```

**OR** deploy just the new function:

```bash
firebase deploy --only functions:submitAccountDeletionRequest
```

**Expected Output:**
```
✔ functions[submitAccountDeletionRequest(us-central1)] Successful create operation.
Function URL: https://us-central1-[your-project].cloudfunctions.net/submitAccountDeletionRequest
```

### 2. Test the Deletion Request Flow

1. **User Side Test:**
   - Log in as a regular user (not admin)
   - Go to Settings → Data & Privacy
   - Click "Delete Account"
   - Fill out the modal and submit
   - Check for success toast: "Your request has been submitted..."
   - Verify "Account Deletion Pending" chip appears in settings

2. **Admin Side Test:**
   - Log in as admin
   - Go to **Settings → Deletions → Pending Requests**
   - Verify the deletion request appears
   - Check it also appears in **Overview → Work Queue** with 🗑️ icon

3. **Approval Test:**
   - In Pending Requests, click "Approve & Delete"
   - Confirm the scary warning dialog
   - Wait for processing (watch the toast messages)
   - Verify success: "Account deleted successfully!"
   - Check that request moves to "Recent History" with "Approved" status

4. **Email Test:**
   - Check the deleted user's email inbox
   - Look for "We're Sad to See You Go - The Pep Planner"
   - **Email should arrive IMMEDIATELY** (sent before deletion)
   - Verify email contains:
     - Friendly goodbye message
     - Confirmation of deletion
     - "Share Your Feedback" button
     - Features list
   - **CRITICAL:** Email is sent FIRST, before any data deletion!

### 3. Update Feedback Survey Link

**IMPORTANT:** After you create your feedback survey:

1. Go to **Comms → Email Templates**
2. Select "Account Deletion Confirmation" from dropdown
3. Update the CTA Link field from:
   - Current: `https://thepepplanner.app/feedback`
   - New: `[YOUR ACTUAL SURVEY URL]`
4. Click "Save"
5. Send a test email to verify

---

## 🧪 Testing Scenarios

### Scenario 1: Trial Expired User
1. Create test user
2. Let trial expire (or manually set in Firestore)
3. User visits app → sees trial expired page
4. Click "Delete Account"
5. Verify request submitted with source: "trial_expired"

### Scenario 2: Subscription Expired User
1. Create user with expired subscription
2. User sees subscription expired page
3. Click "Delete Account"
4. Verify request submitted with source: "subscription_expired"
5. After approval, verify Stripe subscription cancelled

### Scenario 3: Settings Page
1. Active user goes to Settings
2. Data & Privacy → Delete Account
3. Verify request submitted with source: "user_settings"

### Scenario 4: Rejection
1. Submit deletion request
2. As admin, click "Reject"
3. Enter reason (optional)
4. Verify request status changes to "rejected"
5. User should no longer see "pending" chip

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Function deployed successfully (check Firebase Console)
- [ ] Users can submit deletion requests from all 3 locations
- [ ] Requests appear in admin panel (Pending Requests tab)
- [ ] Requests appear in work queue with red badge
- [ ] Approve button deletes user completely
- [ ] Email sent to deleted user with correct content
- [ ] Stripe subscription cancelled (if exists)
- [ ] Request logged in accountDeletions history
- [ ] Reject button works and updates status
- [ ] Email template editable in Comms → Email Templates

---

## 🐛 Troubleshooting

### "Function not found" error
- Wait 2-3 minutes after deployment for functions to propagate
- Run `firebase deploy --only functions` again
- Check Firebase Console → Functions to verify deployment

### Email not sending
- Check Firebase Functions logs for errors
- Verify RESEND_API_KEY is set in secrets
- Check user's spam folder

### User still sees "pending" chip after rejection
- User needs to refresh page or log out/in
- localStorage flag may be cached

### Deletion not completing
- Check Firebase Functions logs for specific error
- Verify admin permissions (email must be in admin list)
- Check that user exists in Firebase Auth

---

## 📊 Monitoring After Deployment

Watch these metrics:

1. **Firebase Console → Functions:**
   - Check `submitAccountDeletionRequest` invocation count
   - Look for any errors in logs

2. **Firestore:**
   - Check `accountDeletionRequests` collection
   - Monitor pending vs approved/rejected counts

3. **Work Queue:**
   - Keep eye on deletion requests appearing
   - Make sure they clear after approval/rejection

4. **Email Delivery:**
   - Monitor Resend dashboard for delivery stats
   - Check bounce/spam reports

---

## 🎯 What's Different Now?

**Before:**
- User clicks delete → Account immediately deleted
- No admin control
- Limited email customization

**After:**
- User clicks delete → Request submitted
- Admin reviews and approves
- Shows in work queue
- Friendly, customizable email
- Full audit trail

---

## 📞 Support

If users ask about deletion:
- "Your request is pending admin review (24-48 hours)"
- "You'll receive a confirmation email once processed"
- "Check your email for the goodbye message with feedback link"

If you need to manually delete (emergency):
- Still available via Firebase Console (Auth)
- But prefer using the new approval system for audit trail

---

## ✅ Done!

Once all tests pass and feedback survey is live:
1. Update email template CTA link to survey
2. Monitor first few deletion requests closely
3. Adjust email template wording if needed
4. You're good to go! 🎉
