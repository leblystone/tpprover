# 📱 Telegram Bot Setup for Ghost Worker

**Time to Complete:** ~10 minutes  
**Why Telegram:** Industry standard for dev alerts, instant notifications, free

---

## 🤖 Step 1: Create Your Telegram Bot

### 1.1 Open Telegram
- Install Telegram app on your phone or use web version (https://web.telegram.org/)
- Log in with your phone number

### 1.2 Find BotFather
- In Telegram search, type: `@BotFather`
- Click on the verified bot (blue checkmark)
- It's Telegram's official bot for creating bots

### 1.3 Create New Bot
Send this command to BotFather:
```
/newbot
```

BotFather will ask:

**"Alright, a new bot. How are we going to call it? Please choose a name for your bot."**

Reply with:
```
The Pep Planner Ghost Worker
```

**"Good. Now let's choose a username for your bot. It must end in `bot`."**

Reply with something like:
```
pepplanner_ghost_bot
```

(Must be unique - try variations if taken: `pepplanner_ghostworker_bot`, `tpp_ghost_bot`, etc.)

### 1.4 Save Your Bot Token

BotFather will reply with:
```
Done! Congratulations on your new bot...

Use this token to access the HTTP API:
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890

Keep your token secure and store it safely...
```

**COPY THIS TOKEN** and save it somewhere safe. You'll need it in Step 3.

---

## 💬 Step 2: Get Your Chat ID

### 2.1 Message Your Bot
- Click the link BotFather sent (t.me/your_bot_name)
- Send your bot any message, like:
```
Hello!
```

### 2.2 Get Your Chat ID
Open this URL in your browser (replace `YOUR_BOT_TOKEN` with the token from Step 1):

```
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

**Example:**
```
https://api.telegram.org/bot123456789:ABCdef/getUpdates
```

### 2.3 Find Your Chat ID in the Response

You'll see JSON like this:
```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "from": {
          "id": 987654321,
          ...
        },
        "chat": {
          "id": 987654321,
          ...
        },
        "text": "Hello!"
      }
    }
  ]
}
```

**Look for `"chat":{"id":987654321`**

The number after `"id":` is your **Chat ID**. Copy it.

**Note:** Chat IDs can be negative (like `-123456789`) - that's normal for group chats.

---

## 🔐 Step 3: Store Secrets in Firebase

### 3.1 Open Terminal/PowerShell
```bash
cd C:\Users\lebro\Desktop\TPPSpendide
```

### 3.2 Set Bot Token
```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
```

When prompted, paste your bot token and press Enter.

### 3.3 Set Chat ID
```bash
firebase functions:secrets:set TELEGRAM_CHAT_ID
```

When prompted, paste your chat ID (just the number) and press Enter.

### 3.4 Verify Secrets
```bash
firebase functions:secrets:list
```

You should see:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID
- GEMINI_API_KEY
- ANTHROPIC_API_KEY
- RESEND_API_KEY

---

## ✅ Step 4: Test Integration

### 4.1 Deploy Ghost Worker (if not already deployed)
```bash
firebase deploy --only functions:checkDailyBudget,functions:sendDailyDigest
```

### 4.2 Test Daily Digest Manually

Open Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click "Functions" in left menu
4. Find `sendDailyDigest`
5. Click "..." → "Execute now"

**Check your Telegram** - you should receive a message within 30 seconds:

```
📊 Ghost Worker Daily Report
2026-01-21

✅ Tickets Processed: 0
💰 Total Cost: $0.0000

🎨 Gemini Pro: 0 tickets
🔧 Claude Sonnet: 0 tickets

Performance:
• Avg Confidence: 0%
• Responses Posted: 0

(No activity yet - this is normal if just deployed)
```

If you receive this, **Telegram integration works!** ✅

---

## 🎯 What You'll Receive on Telegram

### When New Ticket Created:
```
🎫 New Ticket: Z042 | Confidence: 94%

From: user@example.com
Subject: "Can't find dark mode"

📝 Suggested Response:
Hi! Let's enable dark mode:
1. Tap Settings (gear icon)
2. Tap Appearance
3. Select "Dark" under Theme
...

👇 React to this message:
✅ = Approve & Post
✏️ = Edit First
❌ = I'll Handle
```

### Budget Alerts (Hourly Check):
```
⚠️ Budget Alert: WARNING

📊 Today's AI Costs:
• Current: $1.12
• Limit: $1.00
• Tickets: 42

Approaching budget limit. Monitor closely.
```

### Critical Budget Alert:
```
🚨 Budget Alert: CRITICAL

📊 Today's AI Costs:
• Current: $1.67
• Limit: $1.50
• Tickets: 58

🛑 Ghost Worker has been auto-paused.

Review costs in admin dashboard. Enable manually when ready.
```

### Daily Digest (6 PM):
```
📊 Ghost Worker Daily Report
2026-01-21

✅ Tickets Processed: 12
💰 Total Cost: $0.08

🎨 Gemini Pro: 8 tickets ($0.04)
🔧 Claude Sonnet: 4 tickets ($0.04)

📈 Performance:
• Avg Confidence: 91%
• Avg Cost/Ticket: $0.0067
• Responses Posted: 12
• Human Overrides: 1

⚠️ 1 routing correction - Review for improvements
```

### Error Alerts:
```
🚨 Ghost Worker Error

🎫 Ticket: abc123def456
❌ Error: API rate limit exceeded

Check Firebase logs for details.
```

---

## 🎨 Customize Bot (Optional)

### Set Bot Profile Picture
1. Message @BotFather
2. Send: `/setuserpic`
3. Select your bot
4. Upload an image (square, 512x512px recommended)

### Set Bot Description
1. Message @BotFather
2. Send: `/setdescription`
3. Select your bot
4. Enter: "The Pep Planner AI support automation - sends ticket approvals and alerts"

### Set Bot Commands
1. Message @BotFather
2. Send: `/setcommands`
3. Select your bot
4. Paste:
```
start - Start the bot
help - Get help
stats - Get Ghost Worker stats
```

---

## 📊 Using Your Bot

### Commands You Can Send:

**`/start`** - Initialize bot (first time only)

**`/help`** - Get help info (not implemented yet, but good to have)

**`/stats`** - Get quick stats (future feature)

### Approval Workflow:

When Ghost Worker generates a response, you'll receive a message with buttons:

**Option 1: Approve & Post** ✅
- Click this button
- Response posts to ticket immediately
- User gets notified
- Logged to `ai_worker_logs`

**Option 2: Reject** ❌
- Click this button
- Response NOT posted
- Ticket flagged for manual review
- You handle it yourself

**Option 3: Edit First** ✏️
- Click this button
- Opens admin panel (in browser)
- You can edit the response before posting
- Full control

**Option 4: View Full** 👁️
- Click this button
- Sends full response text (if preview was truncated)
- Review complete response before deciding

---

## 🔐 Security Notes

### Keep Your Bot Token Secret
- ❌ Never share it publicly
- ❌ Never commit it to git
- ✅ Only stored in Firebase Secrets
- ✅ Only accessible by your Cloud Functions

### Bot Privacy
- Your bot only messages YOU (your chat ID)
- Other users can't add your bot to groups
- Bot can't initiate chats (only responds to messages)

### If Token Compromised
1. Message @BotFather
2. Send: `/revoke`
3. Select your bot
4. Get new token
5. Update Firebase secret:
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   ```
6. Redeploy functions

---

## 🆘 Troubleshooting

### "Bot not responding"
- Did you send `/start` to the bot first?
- Check bot token is correct
- Verify bot is not banned (message @BotSupport if needed)

### "Not receiving alerts"
- Check Chat ID is correct (should be a number)
- Verify secrets are set: `firebase functions:secrets:list`
- Check Firebase Functions are deployed
- Check Functions logs for errors

### "Wrong chat receiving messages"
- Double-check your Chat ID
- Re-get it from `/getUpdates`
- Update secret: `firebase functions:secrets:set TELEGRAM_CHAT_ID`
- Redeploy

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Bot responds to `/start` command
- [ ] You receive test message (trigger `sendDailyDigest` manually)
- [ ] Bot token stored in Firebase Secrets
- [ ] Chat ID stored in Firebase Secrets
- [ ] Functions deployed successfully
- [ ] Can receive messages from bot

---

## 🎉 You're Done!

Once setup is complete, you'll receive:
- ✅ **Instant notifications** when Ghost Worker needs approval
- ✅ **Budget alerts** if costs exceed limits
- ✅ **Daily digests** with performance stats
- ✅ **Error alerts** if something goes wrong
- ✅ **One-tap approval** (no need to open admin panel)

**Your phone is now your Ghost Worker control center!** 📱✨
