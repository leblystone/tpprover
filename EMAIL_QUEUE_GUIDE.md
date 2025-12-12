# 📧 Email Queue System Guide

## Overview

The Email Queue System automatically manages your SendGrid free plan limit of **100 emails per day**. It intelligently queues non-critical emails when the daily quota is reached, ensuring critical emails (password resets, verifications) always send immediately.

---

## 🎯 How It Works

### Priority System

1. **Critical Priority** (Priority 1)
   - Password resets
   - Email verifications
   - Always send immediately (even if quota is high)

2. **High Priority** (Priority 2)
   - Welcome emails
   - Subscription confirmations
   - Send immediately if quota allows

3. **Normal Priority** (Priority 3)
   - Trial ending reminders
   - Announcements
   - Queued when quota is low

4. **Low Priority** (Priority 4)
   - Bulk emails
   - Surveys
   - Queued when quota is low

### Automatic Queue Processing

- **Scheduled Function**: Processes queue every hour automatically
- **Manual Processing**: You can process the queue anytime from the admin panel
- **Smart Quota Management**: Reserves 20 emails for critical/high priority emails

---

## 📊 Admin Panel

### Email Queue Manager

Located in: **Admin → Communications → Email Templates**

**Features:**
- View today's email quota usage
- See queued emails by priority
- Manually process the queue
- Auto-refreshes every 30 seconds

**Stats Displayed:**
- Today's sent count (X / 100)
- Remaining quota
- Queued emails by priority
- Visual progress bar

---

## 🔧 Technical Details

### Firestore Collections

1. **`emailCounters`** - Daily email count tracking
   - Document ID: `YYYY-MM-DD` (date string)
   - Fields: `count`, `date`, `lastUpdated`

2. **`emailQueue`** - Queued emails
   - Fields:
     - `to` - Recipient email
     - `subject` - Email subject
     - `html` - Email HTML content
     - `priority` - Priority level (1-4)
     - `type` - Email type (e.g., 'welcome', 'bulk')
     - `status` - 'queued', 'sent', 'failed'
     - `createdAt` - Timestamp
     - `sentAt` - Timestamp (when sent)
     - `attempts` - Retry count
     - `error` - Error message (if failed)

### Firebase Functions

1. **`processEmailQueue`** (Scheduled)
   - Runs: Every hour
   - Processes queued emails up to daily limit
   - Orders by priority, then creation time

2. **`getEmailQueueStats`** (Callable)
   - Returns: Today's quota usage and queue stats
   - Used by: Admin panel

3. **`processEmailQueueManually`** (Callable)
   - Manually trigger queue processing
   - Returns: Processed count and results

### Email Service Integration

The queue system is integrated into `emailService.js`:

```javascript
// Use queue system for bulk emails
const emailQueue = require('./emailQueue');
await emailQueue.sendEmailWithQueue(to, subject, html, {
  priority: emailQueue.PRIORITY_LOW,
  type: 'bulk_survey'
});
```

---

## 📝 Usage Examples

### Sending Critical Email (Immediate)

```javascript
const emailService = require('./emailService');
// Password resets use direct sendEmail (bypasses queue)
await emailService.sendCustomPasswordResetEmail(userEmail, resetToken);
```

### Sending Bulk Email (Auto-Queued)

```javascript
const emailQueue = require('./emailQueue');
await emailQueue.sendEmailWithQueue(to, subject, html, {
  priority: emailQueue.PRIORITY_LOW,
  type: 'bulk_survey',
  metadata: { surveyId: 'xyz' }
});
```

### Checking Queue Status

```javascript
const emailQueue = require('./emailQueue');
const stats = await emailQueue.getQueueStats();
console.log(`Sent: ${stats.today.sent}/${stats.today.limit}`);
console.log(`Queued: ${stats.queue.total}`);
```

---

## ⚠️ Important Notes

1. **Critical emails always send** - Password resets and verifications bypass the queue
2. **Queue processes automatically** - No manual intervention needed
3. **Quota resets daily** - At midnight UTC
4. **Failed emails stay in queue** - Can be retried manually
5. **Bulk sends are queued** - Large email campaigns automatically queue

---

## 🚀 Best Practices

1. **Monitor Daily Usage**
   - Check Email Queue Manager daily
   - Plan bulk sends when quota is low

2. **Prioritize Correctly**
   - Use `PRIORITY_CRITICAL` only for password resets/verifications
   - Use `PRIORITY_LOW` for bulk emails and surveys

3. **Manual Processing**
   - Use "Process Queue" button if you need emails sent immediately
   - Queue processes automatically every hour, so manual processing is optional

4. **Monitor Queue**
   - Check queue size before large bulk sends
   - Process queue manually if needed before sending

---

## 🔍 Troubleshooting

### Queue Not Processing

1. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only processEmailQueue
   ```

2. Verify scheduled function is deployed:
   ```bash
   firebase functions:list | grep processEmailQueue
   ```

3. Manually trigger processing from admin panel

### Emails Stuck in Queue

1. Check email status in Firestore `emailQueue` collection
2. Review error messages in `error` field
3. Manually process queue or delete failed emails

### Quota Issues

1. Check `emailCounters` collection for today's date
2. Verify counter is incrementing correctly
3. Reset counter if needed (delete today's document)

---

## 📈 Future Enhancements

- [ ] Email batching (multiple recipients per email)
- [ ] Queue priority adjustment UI
- [ ] Email scheduling (send at specific time)
- [ ] Queue analytics dashboard
- [ ] Automatic retry with exponential backoff

---

**Need Help?** Check the admin panel's Email Queue Manager for real-time stats and manual processing options.

