# 📧 Bulk Email Send Checklist - Trial Expired Survey

## ⚠️ Pre-Send Verification (DO THIS BEFORE CLICKING "SEND")

### 1. **SendGrid Account Status** ✅
- [ ] Log into SendGrid dashboard: https://app.sendgrid.com
- [ ] Check account status is **Active** (not suspended)
- [ ] Verify API key is valid (check in Firebase Secrets)
- [ ] Check **Sender Authentication** is verified:
  - [ ] Domain authentication: `thepepplanner.com` ✅
  - [ ] Single sender verification: `contact@thepepplanner.com` ✅

### 2. **SendGrid Rate Limits** ⚡
- [ ] Check your SendGrid plan limits:
  - **Free Plan**: 100 emails/day
  - **Essentials**: 40,000 emails/month
  - **Pro**: 100,000+ emails/month
- [ ] Verify you have enough quota for the bulk send
- [ ] **Current batch size**: 5 emails at a time with 1 second delay
- [ ] **Estimated time**: ~1 email per second = ~60 emails/minute

### 3. **Email Template Verification** 📝
- [ ] Go to Admin → Communications → Email Templates
- [ ] Select "Trial Expired Survey"
- [ ] Verify **CTA Link** is correct:
  ```
  https://docs.google.com/forms/d/e/1FAIpQLSfWCDthbS9tBOY-L-XhF4hzYcC6Dd3eXr9cDFANc7-uVJx-eg/viewform?usp=header
  ```
- [ ] Click "Test Trial Expired Survey" and verify:
  - [ ] Email arrives in your inbox
  - [ ] Survey link works when clicked
  - [ ] Email looks correct
- [ ] **Save template to Firestore** (if not already saved)

### 4. **Expired Users List** 👥
- [ ] Go to Admin → Communications → Email Templates tab
- [ ] Scroll to "Expired Trial Users" section
- [ ] Review the list:
  - [ ] Count matches expected number
  - [ ] No duplicate emails
  - [ ] All users have valid email addresses
- [ ] **Export emails to CSV** as backup (optional but recommended)

### 5. **Function Deployment** 🚀
- [ ] Verify functions are deployed:
  ```bash
  firebase functions:list | grep sendTrialExpiredSurveyEmail
  ```
- [ ] Check function logs are accessible:
  ```bash
  firebase functions:log --only sendTrialExpiredSurveyEmail --limit 5
  ```

### 6. **Test Send First** 🧪
- [ ] **IMPORTANT**: Test with 1-2 users first
- [ ] Manually send to yourself or a test account
- [ ] Verify email arrives and link works
- [ ] Check SendGrid Activity Feed shows successful delivery

### 7. **SendGrid Activity Monitoring** 📊
- [ ] Open SendGrid Activity Feed in another tab: 
  https://app.sendgrid.com/activity
- [ ] Keep it open during bulk send to monitor:
  - Delivery status
  - Bounces
  - Blocks
  - Spam reports

### 8. **Backup Plan** 💾
- [ ] Export expired users list to CSV (backup)
- [ ] Note the exact count before sending
- [ ] Have SendGrid support contact ready (if needed)

---

## 🚀 During Bulk Send

### What to Watch:
1. **Browser Console** - Check for errors
2. **SendGrid Activity Feed** - Monitor delivery in real-time
3. **Progress Counter** - Watch sent/failed counts
4. **Function Logs** - Check Firebase Functions logs if issues occur

### Expected Behavior:
- ✅ Emails send in batches of 5
- ✅ 1 second delay between batches
- ✅ Progress updates in real-time
- ✅ Success/failure counts displayed

### If Issues Occur:
- **Rate Limit Hit**: Wait 1 minute, then retry
- **SendGrid Error**: Check Activity Feed for details
- **Function Error**: Check Firebase Functions logs
- **Stop if needed**: Close browser tab (emails already sent will complete)

---

## ✅ Post-Send Verification

### 1. **Check Results**
- [ ] Review success/failure count
- [ ] Check SendGrid Activity Feed for delivery status
- [ ] Verify no unexpected bounces/blocks

### 2. **SendGrid Activity Review**
- [ ] Go to SendGrid → Activity Feed
- [ ] Filter by "Trial Expired Survey" subject
- [ ] Check for:
  - ✅ Delivered emails
  - ⚠️ Bounces (hard/soft)
  - ⚠️ Blocks
  - ⚠️ Spam reports

### 3. **Email History**
- [ ] Go to Admin → Communications → Email History
- [ ] Verify emails are logged
- [ ] Check status is "sent" for successful sends

### 4. **Test Survey Link**
- [ ] Click survey link from a test email
- [ ] Verify Google Form opens correctly
- [ ] Test form submission works

---

## 📋 Quick Pre-Send Checklist (5 minutes)

1. ✅ SendGrid account active
2. ✅ Enough quota for bulk send
3. ✅ Template saved with correct survey link
4. ✅ Test email sent and verified
5. ✅ Expired users list reviewed
6. ✅ Functions deployed
7. ✅ SendGrid Activity Feed open
8. ✅ Ready to send!

---

## 🆘 Emergency Contacts

- **SendGrid Support**: https://support.sendgrid.com
- **Firebase Support**: https://firebase.google.com/support
- **Function Logs**: `firebase functions:log`

---

## 📊 SendGrid Rate Limits Reference

| Plan | Daily Limit | Monthly Limit | Rate Limit |
|------|------------|---------------|------------|
| Free | 100/day | 3,000/month | 1/sec |
| Essentials | 1,000/day | 40,000/month | 1/sec |
| Pro | Unlimited | 100,000+/month | 1/sec |

**Current Implementation**: 
- Batch size: 5 emails
- Delay: 1 second between batches
- Effective rate: ~5 emails/second (well within limits)

---

## ⚠️ Important Notes

1. **You can only send once** - The system tracks sent emails in `emailHistory` to prevent duplicates
2. **Bulk send is irreversible** - Once started, emails will be sent
3. **Monitor SendGrid Activity** - Watch for issues in real-time
4. **Test first** - Always test with 1-2 emails before bulk send
5. **Save template** - Make sure template is saved to Firestore before sending

---

**Ready to send?** ✅ Complete the checklist above, then proceed with confidence!

