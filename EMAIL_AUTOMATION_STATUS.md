# Email Automation Status - The Pep Planner

## ✅ Currently Working (Deployed & Active)

### Account & Authentication
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Welcome Email** | New user signup | ✅ ACTIVE | `onUserCreated` (Firestore trigger) |
| **Email Verification** | New user signup | ✅ ACTIVE | `onUserCreated` (Firestore trigger) |
| **Password Reset** | User requests reset | ✅ ACTIVE | `sendCustomPasswordResetEmail` (callable) |

### Subscription & Billing (Stripe Webhooks)
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Subscription Confirmed** | Stripe webhook: `checkout.session.completed` | ✅ ACTIVE | `onSubscriptionConfirmed` (webhook → callable) |
| **Payment Successful** | Stripe webhook: `payment_intent.succeeded` | ✅ ACTIVE | `onPaymentSuccessful` (webhook → callable) |
| **Payment Failed** | Stripe webhook: `payment_intent.payment_failed` | ✅ ACTIVE | `onPaymentFailed` (webhook → callable) |
| **Subscription Cancelled** | User cancels subscription | ✅ ACTIVE | `onSubscriptionCancelled` (webhook → callable) |
| **Subscription Renewal Reminder** | Scheduled: 3 days before renewal | ✅ ACTIVE | `checkRenewalReminders` (scheduled hourly) |

### Trial Management (Scheduled)
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Trial Ending Soon** | Scheduled: 2 days before trial ends | ✅ ACTIVE | `scheduledTrialReminders` (runs hourly, checks user timezone) |
| **Trial Expired Survey** | Scheduled: 3 days after trial expires | ✅ ACTIVE | `scheduledTrialExpiredSurvey` (runs hourly) |

### Lifetime Access
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Lifetime Access Granted** | Admin manually grants access | ✅ ACTIVE | `sendLifetimeAccessEmail` (callable from admin panel) |

### Gift Subscriptions
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Gift Expiring Soon** | Scheduled: 7 days before gift expires | ✅ ACTIVE | `checkGiftExpiringSoon` (scheduled daily) |
| **Gift Purchase Confirmation** | When gift is purchased | ⚠️ MANUAL | Called from admin panel |
| **Gift Redeemed (Recipient)** | When gift is redeemed | ⚠️ MANUAL | Called from admin panel |
| **Gift Redeemed (Giver Notice)** | When gift is redeemed | ⚠️ MANUAL | Called from admin panel |

### Support & Communication
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Support Ticket Created** | User submits ticket | ✅ ACTIVE | `createSupportTicket` (callable) |
| **Support Ticket Message** | Admin/user replies | ✅ ACTIVE | `addTicketMessage` (callable) |
| **Account Deletion** | User requests deletion | ✅ ACTIVE | `sendAccountDeletionEmail` (callable) |
| **In-Depth Request** | User requests features | ✅ ACTIVE | `sendInDepthRequestEmail` (callable) |
| **Invite Email** | Admin sends invite | ✅ ACTIVE | `sendInviteEmail` (callable) |
| **Custom Announcement** | Admin broadcasts message | ✅ ACTIVE | `sendCustomAnnouncementEmail` (callable) |

### Research Reminders (Scheduled)
| Email Type | Trigger | Status | Function |
|-----------|---------|--------|----------|
| **Weekly Research Reminder** | Every Sunday at 11 AM EST | ✅ ACTIVE | `sendWeeklyResearchReminders` (scheduled weekly) |

---

## 📋 Scheduled Functions Summary

All scheduled functions are **timezone-aware** and use the user's configured timezone:

1. **Hourly Checks** (Run every hour at :00):
   - Trial ending reminders (sends at 9 AM user's time)
   - Trial expired surveys (sends 3 days after expiration)
   - Renewal reminders (sends 3 days before renewal)

2. **Daily Checks**:
   - Gift expiration warnings (7 days before)

3. **Weekly Checks**:
   - Research reminders (Sundays at 11 AM EST)

---

## 🎯 Stripe Webhook Integration

Your Stripe webhook is configured to handle:
- `checkout.session.completed` → Subscription confirmation email
- `payment_intent.succeeded` → Payment success email
- `payment_intent.payment_failed` → Payment failed email
- `invoice.payment_succeeded` → Invoice payment success
- `invoice.payment_failed` → Invoice payment failed
- `customer.subscription.deleted` → Subscription cancelled email

**Webhook URL**: `https://stripewebhook-aqqitvxp7a-uc.a.run.app`

---

## ⚙️ Custom Email Templates

All emails use **custom templates** from your admin panel (`Email Templates` tab in Firestore).

Template names in Firestore:
- `welcome` - Welcome Email
- `verification` - Email Verification
- `passwordReset` - Password Reset
- `trialEnding` - Trial Ending Soon
- `trialExtension` - Trial Extension Notification
- `subscriptionConfirmed` - Subscription Confirmed
- `paymentFailed` - Payment Failed
- `paymentSuccessful` - Payment Successful
- `subscriptionRenewal` - Subscription Renewal Reminder
- `subscriptionCancelled` - Subscription Cancelled
- `lifetimeAccess` - Lifetime Access Granted
- `accountDeletion` - Account Deletion
- `inDepthRequest` - In-Depth Request
- `invite` - Invite Email
- `announcement` - Custom Announcement
- `trialExpiredSurvey` - Trial Expired Survey
- `giftExpiringSoon` - Gift Expiring Soon
- `weeklyResearchReminder` - Weekly Research Reminder

---

## 🔧 Testing

You can test any email automation from the admin panel using the `testEmailAutomation` callable function:

```javascript
testEmailAutomation({
  emailType: 'subscription_confirmed',
  userEmail: 'test@example.com'
})
```

Supported email types:
- `subscription_confirmed`
- `payment_failed`
- `payment_successful`
- `subscription_cancelled`
- `renewal_reminder`
- `weekly_reminder`

---

## ✅ All Systems Operational

- ✅ Resend API key configured
- ✅ All functions deployed with latest API key
- ✅ Email history logging active
- ✅ Custom templates loaded from Firestore
- ✅ Scheduled functions running (hourly/daily/weekly)
- ✅ Stripe webhooks configured
- ✅ Timezone-aware scheduling for user comfort

---

**Last Updated**: December 28, 2025  
**API**: Resend (all functions using latest key)

