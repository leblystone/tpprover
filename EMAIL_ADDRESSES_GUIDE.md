# ThePepPlanner Email Address Strategy

## 🎯 Recommended Setup for Your Business

### For thepepplanner.app (Digital App) - Resend (Send-Only)

| Address | Purpose | Reply-To |
|---------|---------|----------|
| `noreply@thepepplanner.app` | Password resets, system notifications | `contact@thepepplanner.com` |
| `alerts@thepepplanner.app` | Time-sensitive notifications (reminders, deadlines) | `contact@thepepplanner.com` |
| `receipts@thepepplanner.app` | Subscription confirmations, billing | `contact@thepepplanner.com` |
| `team@thepepplanner.app` | Product updates, feature announcements | `contact@thepepplanner.com` |

**Cost:** $0 (included with Resend domain verification)
**Setup:** Just use these strings in your code - no setup needed!

---

### For thepepplanner.com (Physical Products) - Google Workspace

| Address | Purpose | Monthly Cost | Do You Need It? |
|---------|---------|--------------|-----------------|
| `contact@thepepplanner.com` | Main support inbox (manual replies) | $6 | ✅ YES - You have this |
| `support@thepepplanner.com` | Dedicated customer service (if team grows) | $6 | ❌ Not yet - use contact@ |
| `orders@thepepplanner.com` | Order/shipping questions (if you hire help) | $6 | ❌ Not yet - use contact@ |
| `sales@thepepplanner.com` | Wholesale/bulk order inquiries | $6 | ❌ Only if you get B2B customers |

**Current Cost:** $6/month (just `contact@`)
**Recommendation:** Stick with ONE mailbox until you hire someone to help

---

## 🚀 Implementation Guide

### Phase 1: Right Now (Solo Operation)
```javascript
// In your app code
await resend.emails.send({
  from: 'noreply@thepepplanner.app',      // System emails
  replyTo: 'contact@thepepplanner.com',   // Goes to your inbox
  to: user.email,
  subject: '...',
  html: '...'
});
```

**You manually check:** `contact@thepepplanner.com` for ALL customer emails (app + store)

---

### Phase 2: When You Hire Help (Future)
Add a second mailbox:
- You: `contact@thepepplanner.com` (app support)
- Employee: `orders@thepepplanner.com` (store orders/shipping)

**Cost:** $12/month (2 mailboxes)

---

### Phase 3: When You Have a Team (Way Future)
- `contact@thepepplanner.com` → General inquiries
- `support@thepepplanner.com` → Technical app support (shared inbox)
- `orders@thepepplanner.com` → Store fulfillment team
- `sales@thepepplanner.com` → B2B/wholesale

**Cost:** $24-36/month (4-6 mailboxes)

---

## 💡 Google Workspace Features You're Paying For

### What You Get with Your $6/month:

1. **Professional Email Inbox**
   - `contact@thepepplanner.com` with Gmail interface
   - 30GB storage
   - Send/receive unlimited emails

2. **Google Calendar**
   - Schedule customer calls
   - Set reminders for order fulfillment

3. **Google Drive (30GB)**
   - Store order invoices
   - Product photos for your store
   - Business documents

4. **Google Meet**
   - Video calls with customers (if needed)
   - Screen sharing for app support

5. **Mobile App**
   - Check/reply to emails on your phone
   - Access Drive files anywhere

### What You DON'T Need Right Now:

❌ **Multiple mailboxes** — Only add more when you hire employees
❌ **Admin roles** — Only matters if you have a team
❌ **Shared inboxes** — Only useful with 2+ people managing same email

---

## 🎯 Your Current Perfect Setup

### Costs:
- **Google Workspace:** $6/month for `contact@thepepplanner.com`
- **Resend:** Free for up to 3,000 emails/month

### Usage:
1. **Automated app emails** → Send from `noreply@thepepplanner.app` via Resend
2. **Customer replies** → Automatically go to `contact@thepepplanner.com`
3. **Manual support** → You reply from `contact@thepepplanner.com` via Google Workspace
4. **Store emails** → Also handled through `contact@thepepplanner.com`

### When to Add More Mailboxes:
- When you hire someone to help with customer service
- When email volume is too much for one person
- When you want to separate app support from store support

**Not before then!** Don't pay $6/month for mailboxes you don't use.

---

## 📋 Action Items

### To Finish Resend Setup:
1. Add DNS records to `thepepplanner.app` domain registrar
2. Wait for Resend to verify (5-60 min)
3. Update app code to send from `@thepepplanner.app` addresses
4. Add `replyTo: 'contact@thepepplanner.com'` to all automated emails

### To Maximize Google Workspace:
1. ✅ Use Gmail app on your phone for mobile support
2. ✅ Set up email filters/labels to organize app vs store questions
3. ✅ Use Drive to store business docs (invoices, contracts, etc.)
4. ✅ Enable 2FA for security
5. ❌ Don't add more mailboxes unless you hire help

---

## 🤔 FAQs

**Q: Can I create aliases instead of new mailboxes?**
A: Yes! Google Workspace lets you create aliases (like `support@thepepplanner.com`) that deliver to your main `contact@` inbox without paying extra. Good for filtering!

**Q: Why did Squarespace make me buy Workspace?**
A: They probably bundled it or heavily promoted it. It's useful, but you could've just used Gmail forwarding if you only needed receiving.

**Q: Should I cancel it?**
A: NO! You're using it for legitimate business email. $6/month is worth it for a professional address.

**Q: When will I need more than one mailbox?**
A: When you have someone else handling emails (employee, VA, business partner).

---

## 📞 Questions?
Reply to this doc with questions or save it for reference!
