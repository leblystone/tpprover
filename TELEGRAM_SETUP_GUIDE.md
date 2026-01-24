# 📱 Telegram Integration Setup Guide for Ghosty👻

## Overview
This guide will walk you through setting up Telegram notifications so Ghosty can alert you when tickets are processed and wait for your approval before posting responses.

---

## ✅ Step 1: Configure Telegram Secrets in Firebase

You already have your Telegram bot token, now we need to store it securely in Firebase Secret Manager.

### Commands to Run:

```bash
# Navigate to your functions directory
cd functions

# Set the Telegram Bot Token
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# When prompted, paste: 8245716682:AAGptrge2O_3eQXVV5VNPub0g5zNVlFLzpM

# Set your Telegram Chat ID
firebase functions:secrets:set TELEGRAM_CHAT_ID
# When prompted, paste: 7489465189
```

### Verify Secrets Are Set:
```bash
firebase functions:secrets:access TELEGRAM_BOT_TOKEN
firebase functions:secrets:access TELEGRAM_CHAT_ID
```

---

## ✅ Step 2: Set Up Telegram Webhook (For Approval Buttons)

The webhook allows Ghosty to receive button clicks from Telegram (approve/reject).

### Get Your Firebase Function URL:
After deploying (Step 4), your webhook URL will be:
```
https://us-central1-tpp-splendide.cloudfunctions.net/handleTelegramCallback
```

### Set the Webhook:
Run this command in your terminal (or browser):

```bash
curl "https://api.telegram.org/bot8245716682:AAGptrge2O_3eQXVV5VNPub0g5zNVlFLzpM/setWebhook?url=https://us-central1-tpp-splendide.cloudfunctions.net/handleTelegramCallback"
```

**Expected Response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Verify Webhook:
```bash
curl "https://api.telegram.org/bot8245716682:AAGptrge2O_3eQXVV5VNPub0g5zNVlFLzpM/getWebhookInfo"
```

---

## ✅ Step 3: Update functions/index.js to Export Telegram Functions

Make sure these are in your `functions/index.js`:

```javascript
// Import Telegram Bot
const telegramBot = require('./telegramBot');

// Export Telegram functions
exports.handleTelegramCallback = telegramBot.handleTelegramCallback;
exports.checkDailyBudget = telegramBot.checkDailyBudget;
exports.sendDailyDigest = telegramBot.sendDailyDigest;
```

---

## ✅ Step 4: Deploy Functions with Telegram Secrets

Deploy your functions with the Telegram secrets bound:

```bash
firebase deploy --only functions:ghostWorkerTriage
firebase deploy --only functions:handleTelegramCallback
firebase deploy --only functions:checkDailyBudget
firebase deploy --only functions:sendDailyDigest
firebase deploy --only functions:testGhostWorkerOnTicket
```

**Note:** You'll be prompted to grant these functions access to the secrets. Type `y` to confirm.

---

## 📱 What You'll Receive in Telegram

### 1. **Ticket Processed Alert** (When Ghosty analyzes a ticket)
```
🎫 New Ticket: Z048

👤 From: John Doe
📧 Email: john@example.com
📝 Type: Support
📌 Subject: How do I extend my trial?

🧠 Ghosty Analysis:
• Route: 🎨 Gemini Pro
• Confidence: 95%
• Reasoning: Trial extension is a standard account management task...

📄 Suggested Response:
Hi John! I'd be happy to help you extend your trial...

💰 Estimated Cost: $0.00024

What should I do?

[✅ Approve & Post] [❌ Reject]
[✏️ Edit First] [👁️ View Full]
```

### 2. **Budget Alerts** (Hourly check)
```
⚠️ Budget Alert: WARNING

📊 Today's AI Costs:
• Current: $0.85
• Limit: $1.00
• Tickets: 42

Approaching budget limit. Monitor closely.
```

### 3. **Daily Digest** (6 PM daily)
```
📊 Ghosty Daily Report
Jan 23, 2026

✅ Tickets Processed: 28
💰 Total Cost: $1.24

🎨 Gemini Pro: 18 tickets ($0.62)
🔧 Claude Sonnet: 10 tickets ($0.62)

📈 Performance:
• Avg Confidence: 89.3%
• Avg Cost/Ticket: $0.00443
• Responses Posted: 0
• Human Overrides: 0

✅ No routing corrections - All decisions accurate!
```

### 4. **Error Alerts** (When something goes wrong)
```
🚨 Ghosty Error

🎫 Ticket: abc123xyz
❌ Error: API rate limit exceeded

Check Firebase logs for details.
```

---

## 🎯 How to Use the Approval Workflow

### When You Receive a Notification:

1. **Review the ticket and suggested response** in Telegram
2. **Click a button:**
   - **✅ Approve & Post** - Ghosty will post the response immediately
   - **❌ Reject** - Response won't be posted, ticket stays open
   - **✏️ Edit First** - Opens admin panel link to manually edit
   - **👁️ View Full** - See the complete response in a new message

### Button Actions:
- **Approve** → Response posted to ticket, user notified
- **Reject** → Ticket marked as "AI rejected", stays in your queue
- **Edit** → Get admin panel link, edit manually, then post
- **View** → Full response sent in next Telegram message

---

## 🔧 Troubleshooting

### Not Receiving Telegram Messages?

1. **Check secrets are set:**
   ```bash
   firebase functions:secrets:access TELEGRAM_BOT_TOKEN
   firebase functions:secrets:access TELEGRAM_CHAT_ID
   ```

2. **Check webhook is active:**
   ```bash
   curl "https://api.telegram.org/bot8245716682:AAGptrge2O_3eQXVV5VNPub0g5zNVLFLzpM/getWebhookInfo"
   ```

3. **Check Firebase logs:**
   ```bash
   firebase functions:log
   ```

4. **Test Telegram directly:**
   ```bash
   curl -X POST "https://api.telegram.org/bot8245716682:AAGptrge2O_3eQXVV5VNPub0g5zNVlFLzpM/sendMessage" \
   -H "Content-Type: application/json" \
   -d '{"chat_id":"7489465189","text":"Test message from Ghosty setup!"}'
   ```

### Buttons Not Working?

1. **Verify webhook is set** (see Step 2)
2. **Check function is deployed:**
   ```bash
   firebase functions:list
   ```
3. **Check Firebase logs** for webhook errors

---

## 📊 Budget Alert Thresholds

Current settings in `telegramBot.js`:

- **Warning**: $1.00/day → Telegram notification
- **Critical**: $1.50/day → Urgent notification
- **Auto-Pause**: $2.00/day → Ghosty stops processing + notification

**To adjust these**, edit `functions/telegramBot.js`:
```javascript
const WARNING_THRESHOLD = 1.00;  // Change this
const CRITICAL_THRESHOLD = 1.50; // Change this
const AUTO_PAUSE_THRESHOLD = 2.00; // Change this
```

---

## ✅ What's Integrated

### Telegram Functions Built:
✅ **Instant alerts** - When Ghosty processes a ticket  
✅ **Approval workflow** - Buttons to approve/reject responses  
✅ **Budget monitoring** - Hourly cost checks with alerts  
✅ **Daily digests** - 6 PM summary of activity  
✅ **Error notifications** - When Ghosty encounters issues

### Integration Points:
✅ `ghostWorker.js` → Calls Telegram when response generated  
✅ `telegramBot.js` → All Telegram logic  
✅ `index.js` → Exports Telegram functions

---

## 🚀 Next Steps After Setup

1. ✅ **Configure secrets** (Step 1)
2. ✅ **Set webhook** (Step 2)
3. ✅ **Deploy functions** (Step 4)
4. ✅ **Test with a real ticket** - Create a support ticket and watch Telegram!
5. ✅ **Review first few responses** - Make sure routing is accurate
6. ✅ **Adjust confidence threshold** - If needed (currently 90%)
7. ✅ **Switch to active mode** - When ready for Ghosty to auto-post

---

**Once Telegram is working, you'll have full visibility and control over every Ghosty decision!** 📱👻✨
