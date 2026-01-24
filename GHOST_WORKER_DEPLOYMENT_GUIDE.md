# 🚀 Ghost Worker Deployment Guide

**Target:** Deploy Ghost Worker AI automation to Firebase  
**Mode:** Approval Mode (Telegram YES/NO before posting)  
**Confidence:** 90% threshold  
**Budget:** $1.50/day max with alerts

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before deploying, make sure you have:

- [ ] **Gemini API Key** (from https://aistudio.google.com/app/apikey)
- [ ] **Anthropic API Key** (from https://console.anthropic.com/)
- [ ] **Telegram Bot Token** (from @BotFather on Telegram)
- [ ] **Your Telegram Chat ID** (see instructions below)
- [ ] **Firebase CLI installed** (`npm install -g firebase-tools`)
- [ ] **Logged into Firebase** (`firebase login`)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Step 1: Get Your API Keys

#### A. Gemini API Key (Google)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Select your Google Cloud project (or create one)
4. Copy the key (starts with `AIza...`)
5. Save it somewhere safe

#### B. Anthropic API Key (Claude)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create Key"
5. Name it "Ghost Worker"
6. Copy the key (starts with `sk-ant-...`)
7. Save it somewhere safe

#### C. Telegram Bot Setup
1. Open Telegram app
2. Search for `@BotFather`
3. Send message: `/newbot`
4. Follow prompts:
   - Bot name: "The Pep Planner Ghost Worker"
   - Username: something like `pepplanner_ghost_bot` (must be unique)
5. Copy the bot token (long string like `123456789:ABCdefGHI...`)
6. Save it somewhere safe

#### D. Get Your Telegram Chat ID
1. Send a message to your new bot (any message, like "Hello")
2. Visit this URL in your browser (replace TOKEN with your bot token):
   ```
   https://api.telegram.org/botTOKEN/getUpdates
   ```
3. Look for `"chat":{"id":123456789` in the response
4. Copy your chat ID (the number, like `123456789` or `-123456789`)
5. Save it somewhere safe

---

### Step 2: Install Dependencies

```bash
cd functions
npm install @google/generative-ai@latest
npm install @anthropic-ai/sdk@latest
```

**Verify installation:**
```bash
npm list @google/generative-ai
npm list @anthropic-ai/sdk
```

---

### Step 3: Set Firebase Secrets

```bash
# Set Gemini API Key
firebase functions:secrets:set GEMINI_API_KEY
# Paste your AIza... key when prompted, press Enter

# Set Anthropic API Key
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your sk-ant... key when prompted, press Enter

# Set Telegram Bot Token
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# Paste your bot token, press Enter

# Set Your Telegram Chat ID
firebase functions:secrets:set TELEGRAM_CHAT_ID
# Paste your chat ID (just the number), press Enter
```

**Verify secrets are set:**
```bash
firebase functions:secrets:list
```

You should see:
- GEMINI_API_KEY
- ANTHROPIC_API_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID
- RESEND_API_KEY (already exists)

---

### Step 4: Deploy to Firebase

```bash
# Deploy ONLY Ghost Worker functions
firebase deploy --only functions:ghostWorkerTriage,functions:getGhostWorkerStats,functions:overrideGhostWorkerRouting,functions:testGhostWorkerOnTicket,functions:pauseGhostWorker,functions:resumeGhostWorker,functions:checkDailyBudget,functions:sendDailyDigest

# Or deploy all functions (if you're sure)
firebase deploy --only functions
```

**Wait for deployment to complete** (~3-5 minutes)

---

### Step 5: Verify Deployment

```bash
# Check that functions are deployed
firebase functions:list

# You should see:
# - ghostWorkerTriage
# - getGhostWorkerStats
# - overrideGhostWorkerRouting
# - testGhostWorkerOnTicket
# - pauseGhostWorker
# - resumeGhostWorker
# - checkDailyBudget
# - sendDailyDigest
```

---

### Step 6: Test with Existing Ticket

1. Open your admin panel
2. Go to Ghost Worker Dashboard
3. In the "Test on Existing Ticket" section:
   - Enter a ticket ID from your `supportTickets` collection
   - Click "Test"
4. Review the results:
   - Which route did it choose?
   - What's the confidence?
   - Read the response preview
   - Check if it would have posted or flagged

**Repeat with 5-10 different tickets:**
- Simple UI questions
- Complex payment issues
- Account deletion requests
- General questions

---

### Step 7: Monitor Initial Activity

```bash
# Watch Firebase logs in real-time
firebase functions:log --only ghostWorkerTriage

# Or check in Firebase Console
# https://console.firebase.google.com/ → Functions → Logs
```

---

### Step 8: Test Telegram Integration

1. **Wait for a new ticket** (or create a test ticket)
2. **Check your Telegram** - you should receive:
   ```
   🎫 New Ticket: Z042
   
   From: test@example.com
   Subject: "Can't find dark mode"
   
   Ghost Worker Analysis:
   • Route: 🎨 Gemini Pro
   • Confidence: 94%
   
   Suggested Response:
   Hi test user! Let's enable dark mode...
   
   What should I do?
   [✅ Approve & Post] [❌ Reject]
   [✏️ Edit First] [👁️ View Full]
   ```

3. **Click "Approve & Post"** - Response posts to ticket
4. **Check ticket in admin panel** - Ghost Worker response should appear

---

### Step 9: Monitor Budget

Ghost Worker will check costs every hour and send Telegram alerts:

- **At $1.00/day:** 🟡 Warning alert
- **At $1.50/day:** 🔴 Critical alert
- **At $2.00/day:** 🛑 Auto-pause (stops processing)

At 6 PM daily, you'll get a digest:
```
📊 Ghost Worker Daily Report

✅ Tickets Processed: 3
💰 Total Cost: $0.04

🎨 Gemini Pro: 2 tickets ($0.02)
🔧 Claude Sonnet: 1 ticket ($0.02)

Performance:
• Avg Confidence: 91%
• No routing corrections - All accurate!
```

---

## 🧪 TESTING PHASE (Week 1-2)

### Daily Routine

**Morning (5 minutes):**
1. Check Telegram for overnight tickets
2. Approve/reject Ghost Worker suggestions
3. Review any flagged tickets

**Evening (2 minutes):**
1. Read daily digest on Telegram
2. Check if any routing corrections needed
3. Review costs (should be $0.01-0.03/day)

### Success Criteria Before Going Live

After 2 weeks of testing, verify:
- [ ] Routing accuracy >90% (check human overrides)
- [ ] Zero safety violations
- [ ] Zero user complaints about AI responses
- [ ] Costs predictable and under budget
- [ ] Telegram approval workflow smooth
- [ ] You trust the system

---

## 🚨 TROUBLESHOOTING

### "Function deployment failed"

**Check:**
- Are all secrets set? `firebase functions:secrets:list`
- Are dependencies installed? `cd functions && npm list`
- Any syntax errors? Check Firebase deployment logs

**Fix:**
```bash
cd functions
npm install
firebase deploy --only functions --debug
```

### "Telegram not receiving messages"

**Check:**
1. Bot token correct? Test: `https://api.telegram.org/botYOUR_TOKEN/getMe`
2. Chat ID correct? Should be a number (might be negative)
3. Did you message the bot first? (Bots can't initiate chats)

**Fix:**
- Verify secrets: `firebase functions:secrets:access TELEGRAM_BOT_TOKEN`
- Send test message to bot
- Re-get chat ID from `/getUpdates`

### "Ghost Worker not triggering"

**Check:**
1. Is it paused? Check admin dashboard
2. Are new tickets being created in `supportTickets` collection?
3. Check Firebase logs: `firebase functions:log --only ghostWorkerTriage`

**Fix:**
- Create test ticket in your app
- Check Firestore rules allow function access
- Verify function is deployed: `firebase functions:list`

### "API key errors"

**Gemini API Error:**
```
Error: API key not valid. Please pass a valid API key.
```

**Fix:**
- Verify key is correct (starts with `AIza...`)
- Check it's enabled in Google Cloud Console
- Re-set: `firebase functions:secrets:set GEMINI_API_KEY`

**Anthropic API Error:**
```
Error: Invalid API key
```

**Fix:**
- Verify key is correct (starts with `sk-ant-...`)
- Check Anthropic Console for key status
- Re-set: `firebase functions:secrets:set ANTHROPIC_API_KEY`

### "Costs higher than expected"

**Check:**
- Are tickets being processed multiple times? (Check logs)
- Is triage model being called efficiently?
- Review `ai_worker_logs` for `totalCost` field

**Fix:**
- Add deduplication if needed
- Lower confidence threshold (fewer tickets processed)
- Check for retry loops in logs

---

## 🔄 UPDATES & MAINTENANCE

### Update Ghost Worker Code

1. Make changes to `functions/ghostWorker.js`
2. Update `THE_PEP_PLANNER_HANDBOOK.md` if needed
3. Copy handbook to functions: 
   ```bash
   copy "THE_PEP_PLANNER_HANDBOOK.md" "functions/THE_PEP_PLANNER_HANDBOOK.md"
   ```
4. Deploy:
   ```bash
   firebase deploy --only functions:ghostWorkerTriage
   ```

### Update System Prompts

Edit the `PROMPTS` object in `functions/ghostWorker.js`:
- `PROMPTS.triage` - Routing rules
- `PROMPTS.geminiPro` - UI/UX specialist prompt
- `PROMPTS.claudeSonnet` - Senior engineer prompt

### Update Configuration

Edit the `CONFIG` object in `functions/ghostWorker.js`:
```javascript
routing: {
  confidenceThreshold: 90,      // Change this
  enableAutoResponse: false,    // Change to true when ready
  observationMode: true,        // Change to false when ready
}
```

---

## 📊 FIRESTORE COLLECTIONS CREATED

Ghost Worker creates these collections:

1. **`ai_worker_logs`** - Every ticket processed
   - Cost tracking
   - Routing decisions
   - Model usage

2. **`ghostWorkerLogs`** - Legacy/backup logs
   - Same as ai_worker_logs
   - For backwards compatibility

3. **`ghostWorkerTests`** - Manual test results
   - When you use "Test on Existing Ticket"
   - Separate from production logs

4. **`ghostWorkerErrors`** - Error tracking
   - Any failures or exceptions
   - For debugging

5. **`_config/ghostWorker`** - Control document
   - `enabled: true/false` (pause/resume)
   - Timestamps for pause/resume
   - Who paused/resumed

---

## 🎯 NEXT STEPS AFTER DEPLOYMENT

### Week 1: Testing & Observation
- [ ] Test on 10+ existing tickets
- [ ] Review routing accuracy
- [ ] Check cost logs
- [ ] Monitor Telegram approvals
- [ ] Make note of any misroutes

### Week 2: Refinement
- [ ] Update handbook based on learnings
- [ ] Adjust confidence threshold if needed
- [ ] Refine routing rules if patterns emerge
- [ ] Test on 10+ more tickets

### Week 3: Consider Auto-Mode
- [ ] If >90% approval rate, consider enabling auto-response for >95% confidence
- [ ] Keep approval mode for 85-94% confidence
- [ ] Continue monitoring

---

## 🆘 EMERGENCY PROCEDURES

### If Ghost Worker Goes Rogue

1. **Immediate:** Click "Emergency Stop" in admin dashboard
2. **Verify:** Check `_config/ghostWorker` document shows `enabled: false`
3. **Review:** Check `ai_worker_logs` for recent activity
4. **Fix:** Identify issue, update code
5. **Test:** Use test function before resuming
6. **Resume:** Click "Resume" when confident

### If Costs Spike

1. **Auto-pause triggers at $2/day** (Ghost Worker stops automatically)
2. **Check `ai_worker_logs`:** Which tickets were expensive?
3. **Review logs:** Any retry loops or errors?
4. **Fix issue:** Update code or routing rules
5. **Resume carefully:** Test first

### If Users Complain

1. **Check specific tickets:** What did Ghost Worker say?
2. **Review in admin panel:** Was response appropriate?
3. **Human override:** Mark routing as incorrect
4. **Update handbook:** Add guidance for this scenario
5. **Apologize to user:** "We're training our system, human review now"

---

## 📝 DEPLOYMENT COMMANDS SUMMARY

```bash
# Install dependencies
cd functions
npm install @google/generative-ai@latest
npm install @anthropic-ai/sdk@latest

# Set secrets
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID

# Copy handbook to functions directory
copy "THE_PEP_PLANNER_HANDBOOK.md" "functions/THE_PEP_PLANNER_HANDBOOK.md"

# Deploy
firebase deploy --only functions

# Watch logs
firebase functions:log --only ghostWorkerTriage

# List deployed functions
firebase functions:list
```

---

## 💰 COST MONITORING

### Check Costs Anytime

**Firestore Query (in admin dashboard):**
```javascript
// Today's costs
const logsRef = collection(db, 'ai_worker_logs');
const today = new Date();
today.setHours(0,0,0,0);
const q = query(logsRef, where('timestamp', '>=', today));
const snapshot = await getDocs(q);

let total = 0;
snapshot.forEach(doc => { total += doc.data().totalCost });
console.log(`Today's cost: $${total.toFixed(4)}`);
```

**Telegram:**
- Hourly budget checks (auto-alert if over $1)
- Daily digest at 6 PM
- Emergency alerts if critical

**Google Cloud Console:**
- https://console.cloud.google.com/
- Navigate to your project → Billing
- Look for "Generative Language API"

**Anthropic Console:**
- https://console.anthropic.com/settings/billing
- View usage dashboard

---

## ✅ POST-DEPLOYMENT VERIFICATION

Run these checks after deployment:

### 1. Functions Deployed
```bash
firebase functions:list | grep ghost
```
Should show: `ghostWorkerTriage`, `getGhostWorkerStats`, etc.

### 2. Secrets Accessible
```bash
firebase functions:secrets:access GEMINI_API_KEY | head -c 20
```
Should show first 20 chars of your key

### 3. Test Function Works
```bash
# Via admin dashboard
# Click "Test on Existing Ticket"
# Enter a ticket ID
# Review results
```

### 4. Telegram Bot Responds
```bash
# Send message to your bot: /start
# Bot should respond (test connectivity)
```

### 5. Create Test Ticket
- Create a support ticket in your app
- Check Telegram for approval request (within 30 seconds)
- Approve it
- Verify response posts to ticket

---

## 📞 SUPPORT & RESOURCES

**Firebase:**
- Console: https://console.firebase.google.com/
- Docs: https://firebase.google.com/docs/functions
- Support: https://firebase.google.com/support

**Google AI:**
- Console: https://aistudio.google.com/
- Pricing: https://ai.google.dev/pricing
- Docs: https://ai.google.dev/docs

**Anthropic:**
- Console: https://console.anthropic.com/
- Pricing: https://www.anthropic.com/api
- Docs: https://docs.anthropic.com/

**Telegram:**
- Bot API: https://core.telegram.org/bots/api
- @BotFather: https://t.me/BotFather

---

## 🎉 CONGRATULATIONS!

Once deployed, Ghost Worker will:
- ✅ Monitor `supportTickets` collection 24/7
- ✅ Analyze every new ticket within seconds
- ✅ Route to the appropriate AI model
- ✅ Send you Telegram approval requests
- ✅ Post responses when you approve
- ✅ Log every penny spent
- ✅ Alert you if budget exceeded
- ✅ Give you daily digests

**You now have a 24/7 AI support team member!** 🎉

---

## 📋 WHAT TO DO NEXT

1. ✅ **Review the handbook** - Make sure it's accurate
2. ✅ **Deploy Ghost Worker** - Follow steps above
3. ✅ **Test on 5-10 tickets** - Use existing tickets
4. ✅ **Monitor for 1 week** - Watch Telegram approvals
5. ✅ **Refine as needed** - Update handbook/prompts
6. ✅ **Increase confidence** - Once proven accurate
7. ✅ **Go on vacation** - Ghost Worker has your back! 🏖️
