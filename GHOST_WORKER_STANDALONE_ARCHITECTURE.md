# 🤖 Ghost Worker - Standalone Background Architecture

## 🎯 Key Requirement: Complete Separation from Cursor

Your Ghost Worker will be a **100% independent background service** that:
- ✅ Runs in Firebase Cloud (NOT in Cursor)
- ✅ Uses YOUR Google and Anthropic API keys (separate billing)
- ✅ Watches Firestore `supportTickets` collection
- ✅ Logs every API call + cost to `ai_worker_logs` collection
- ✅ Never uses Cursor's AI credits or models

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   YOUR FIREBASE PROJECT                         │
│                  (Runs 24/7 in Google Cloud)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │   Firestore Collection:                │
         │   "supportTickets"                     │
         │                                        │
         │   New ticket created by user...        │
         └────────────┬───────────────────────────┘
                      │
                      │ (Firestore Trigger)
                      ▼
         ┌────────────────────────────────────────┐
         │  🤖 GHOST WORKER                       │
         │  (Firebase Cloud Function)             │
         │                                        │
         │  Running on: Google Cloud Platform    │
         │  Billing: Your Firebase project       │
         │  No connection to Cursor              │
         └────────────┬───────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────────────────┐
         │  STEP 1: Triage Layer                 │
         │                                        │
         │  API Call to: Google AI API            │
         │  Your Key: GEMINI_API_KEY              │
         │  Model: gemini-2.0-flash-exp           │
         │  Cost: ~$0.0001 per triage             │
         │  Billing: Your Google Cloud account    │
         └────────────┬───────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────────────────┐
         │  ROUTING DECISION                      │
         │  {                                     │
         │    route: "gemini-pro" or              │
         │            "claude-sonnet",            │
         │    confidence: 85%,                    │
         │    reasoning: "..."                    │
         │  }                                     │
         └────────────┬───────────────────────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ Google AI API    │  │ Anthropic API    │
   │                  │  │                  │
   │ Your Key:        │  │ Your Key:        │
   │ GEMINI_API_KEY   │  │ ANTHROPIC_API_KEY│
   │                  │  │                  │
   │ Model:           │  │ Model:           │
   │ gemini-1.5-pro   │  │ claude-sonnet-4  │
   │                  │  │                  │
   │ Cost:            │  │ Cost:            │
   │ $1.25/1M tokens  │  │ $3.00/1M tokens  │
   │                  │  │                  │
   │ Billing:         │  │ Billing:         │
   │ Google Cloud     │  │ Anthropic.com    │
   └────────┬─────────┘  └────────┬─────────┘
            │                     │
            └──────────┬──────────┘
                       ▼
         ┌────────────────────────────────────────┐
         │  Response Generated                    │
         │  (markdown with code examples)         │
         └────────────┬───────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────────────────┐
         │  POST RESPONSE                         │
         │                                        │
         │  → Add message to ticket               │
         │  → Update ticket status                │
         │  → Log usage & cost                    │
         └────────────┬───────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────────────────┐
         │  Firestore Collection:                 │
         │  "ai_worker_logs"                      │
         │                                        │
         │  {                                     │
         │    ticketId: "abc123",                 │
         │    timestamp: "2026-01-21 10:30:00",   │
         │    triageModel: "gemini-flash",        │
         │    triageTokens: 450,                  │
         │    triageCost: 0.000034,               │
         │    executionModel: "gemini-pro",       │
         │    executionTokens: 2847,              │
         │    executionCost: 0.003559,            │
         │    totalCost: 0.003593,                │
         │    route: "gemini-pro",                │
         │    confidence: 92,                     │
         │    billedTo: {                         │
         │      triage: "Google Cloud",           │
         │      execution: "Google Cloud"         │
         │    }                                   │
         │  }                                     │
         └────────────────────────────────────────┘
```

---

## 📍 Where This Runs

| Component | Location | Billing |
|-----------|----------|---------|
| **Firebase Function** | Google Cloud Platform | Your Firebase project |
| **Gemini API Calls** | Google AI API (ai.google.dev) | Your Google Cloud account |
| **Claude API Calls** | Anthropic API (api.anthropic.com) | Your Anthropic account |
| **Firestore Reads/Writes** | Firebase Firestore | Your Firebase project |
| **Cursor IDE** | Your local machine | NOT INVOLVED ✅ |

---

## 🔑 API Key Setup (Your Own Keys)

### Step 1: Get Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create API key for your Google Cloud project
3. Copy the key (starts with `AIza...`)
4. **Billing**: Usage appears in Google Cloud Console under your project

### Step 2: Get Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up / log in
3. Navigate to "API Keys"
4. Create new key
5. Copy the key (starts with `sk-ant-...`)
6. **Billing**: Usage appears in Anthropic Console under your account

### Step 3: Store Keys in Firebase (Securely)
```bash
# These keys are stored in Firebase, NOT in your code
# They are encrypted and only accessible by your Cloud Functions

firebase functions:secrets:set GEMINI_API_KEY
# Paste your AIza... key when prompted

firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your sk-ant... key when prompted
```

**Important**: These keys are:
- ✅ Stored in Firebase Secret Manager (encrypted)
- ✅ Only accessible by your Cloud Functions
- ✅ Never in your codebase or git repo
- ✅ Separate from Cursor's AI credits
- ✅ Billed directly to your Google/Anthropic accounts

---

## 💰 Cost Tracking Architecture

### Collection: `ai_worker_logs`

Every time Ghost Worker processes a ticket, it writes a detailed log:

```javascript
{
  // Ticket Reference
  ticketId: "abc123def456",
  ticketNumber: "Z005",
  ticketType: "bug",
  timestamp: Timestamp(2026-01-21 10:30:00),
  
  // Triage (Gemini Flash)
  triageModel: "gemini-2.0-flash-exp",
  triageTokensInput: 320,
  triageTokensOutput: 130,
  triageTokensTotal: 450,
  triageCostPer1M: 0.075,
  triageCost: 0.000034,  // Actual cost in USD
  triageBilledTo: "Google Cloud",
  triageApiKey: "AIza****1234", // Last 4 digits only
  
  // Routing Decision
  route: "gemini-pro",
  confidence: 92,
  reasoning: "Simple UI text change request",
  complexity: "low",
  urgency: "medium",
  
  // Execution (Gemini Pro or Claude)
  executionModel: "gemini-1.5-pro",
  executionTokensInput: 1842,
  executionTokensOutput: 1005,
  executionTokensTotal: 2847,
  executionCostPer1M: 1.25,
  executionCost: 0.003559,  // Actual cost in USD
  executionBilledTo: "Google Cloud",
  executionApiKey: "AIza****1234", // Last 4 digits only
  
  // Total Cost Tracking
  totalTokens: 3297,
  totalCost: 0.003593,  // USD
  
  // Response Metadata
  responseGenerated: true,
  responsePosted: true,
  responseLength: 1247, // characters
  
  // Quality Control
  humanOverride: false,
  correctRoute: null,
  feedback: null
}
```

### Collection: `ai_worker_stats` (Daily Rollup)

Automatic daily summary for quick reporting:

```javascript
{
  date: "2026-01-21",
  
  // Volume
  totalTickets: 12,
  routedToGeminiPro: 8,
  routedToClaudeSonnet: 4,
  
  // Cost Breakdown
  totalCost: 0.087,  // USD
  geminiFlashCost: 0.0004,
  geminiProCost: 0.042,
  claudeSonnetCost: 0.045,
  
  // Per-Ticket Averages
  avgCostPerTicket: 0.00725,
  avgConfidence: 88.5,
  avgTokensPerTicket: 2847,
  
  // Billing Targets
  billingBreakdown: {
    "Google Cloud": 0.042,
    "Anthropic": 0.045
  }
}
```

---

## 🎯 Implementation Options

### Option A: Firebase Function Only (Recommended)

**Pros:**
- ✅ Simplest setup
- ✅ No external services needed
- ✅ Direct API calls to Google/Anthropic
- ✅ All logs in Firebase (easy queries)
- ✅ Free tier covers most usage

**Cons:**
- ⚠️ Less visual than n8n
- ⚠️ Requires Firebase CLI for deployment

**Cost Structure:**
- Firebase Functions: Free tier → 2M invocations/month
- Firestore: Free tier → 50K reads/20K writes per day
- Gemini API: Your Google Cloud bill
- Claude API: Your Anthropic bill

**Monthly Estimate (100 tickets):**
- Firebase: $0 (within free tier)
- Gemini API: ~$0.50
- Claude API: ~$0.30
- **Total: ~$0.80/month**

---

### Option B: n8n Workflow Orchestration

**Pros:**
- ✅ Visual workflow builder
- ✅ Easy to modify routing logic
- ✅ Built-in retry/error handling
- ✅ Can integrate other tools (Slack, Discord, etc.)

**Cons:**
- ⚠️ Requires hosting n8n (~$20/month or self-host)
- ⚠️ Additional complexity
- ⚠️ More places to manage secrets

**Architecture:**
```
Firestore Trigger (webhook)
    ↓
n8n Workflow
    ↓
Split: Triage with Gemini Flash
    ↓
Router Node
    ↓
    ├─→ Gemini Pro Node
    └─→ Claude Sonnet Node
    ↓
Post Response to Firestore
    ↓
Log to ai_worker_logs
```

**Cost Structure:**
- n8n Cloud: $20/month (or $0 if self-hosted)
- Firebase: Same as Option A
- AI APIs: Same as Option A
- **Total: ~$20.80/month (or $0.80 if self-host n8n)**

---

## 🔐 Security & Separation

### API Key Isolation

```javascript
// In Firebase Functions, keys are loaded from environment
// They NEVER appear in your code or Cursor

const geminiKey = process.env.GEMINI_API_KEY;  // From Firebase Secrets
const claudeKey = process.env.ANTHROPIC_API_KEY; // From Firebase Secrets

// Direct API calls (no Cursor involvement)
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(geminiKey);

const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: claudeKey });
```

### Billing Verification

**To verify Ghost Worker is using YOUR keys (not Cursor):**

1. **Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Navigate to "APIs & Services" → "Enabled APIs"
   - Find "Generative Language API"
   - Click "Metrics" → See Ghost Worker usage in real-time

2. **Anthropic Console**
   - Go to https://console.anthropic.com/
   - Navigate to "Usage"
   - See API calls and costs

3. **Firebase Logs**
   - Each API call logged with token count and cost
   - Query `ai_worker_logs` collection to see breakdown

---

## 📊 Cost Tracking Dashboard Query

You can query your exact costs anytime:

```javascript
// Get costs for a specific date range
const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-31');

const logsRef = collection(db, 'ai_worker_logs');
const q = query(
  logsRef,
  where('timestamp', '>=', startDate),
  where('timestamp', '<=', endDate)
);

const snapshot = await getDocs(q);
let totalCost = 0;
let geminiCost = 0;
let claudeCost = 0;

snapshot.forEach(doc => {
  const data = doc.data();
  totalCost += data.totalCost;
  
  if (data.executionModel.includes('gemini')) {
    geminiCost += data.executionCost;
  } else if (data.executionModel.includes('claude')) {
    claudeCost += data.executionCost;
  }
});

console.log({
  totalCost: `$${totalCost.toFixed(4)}`,
  geminiCost: `$${geminiCost.toFixed(4)}`,
  claudeCost: `$${claudeCost.toFixed(4)}`,
  ticketCount: snapshot.size
});
```

---

## 🚀 Deployment Flow (Firebase Function)

### Step 1: Install Dependencies
```bash
cd functions
npm install @google/generative-ai@latest
npm install @anthropic-ai/sdk@latest
```

### Step 2: Set Your API Keys
```bash
# Your Gemini key (from Google AI Studio)
firebase functions:secrets:set GEMINI_API_KEY

# Your Anthropic key (from Anthropic Console)
firebase functions:secrets:set ANTHROPIC_API_KEY
```

### Step 3: Deploy Ghost Worker
```bash
# Deploy ONLY the Ghost Worker function
firebase deploy --only functions:ghostWorkerTriage
```

### Step 4: Verify Deployment
```bash
# Check function is running
firebase functions:list

# Watch logs in real-time
firebase functions:log --only ghostWorkerTriage
```

### Step 5: Test with Real Ticket
1. Create a support ticket in your app
2. Ghost Worker auto-triggers (within seconds)
3. Check Firebase logs: `firebase functions:log`
4. Check Firestore: Look in `ai_worker_logs` collection
5. Verify billing: Check Google Cloud Console and Anthropic Console

---

## 🎯 Verification Checklist

After deployment, verify complete separation:

- [ ] Check Google Cloud Console → See Gemini API usage
- [ ] Check Anthropic Console → See Claude API usage
- [ ] Query `ai_worker_logs` → See cost breakdown
- [ ] Check Firebase Functions logs → See execution traces
- [ ] Verify NO charges to Cursor account
- [ ] Create test ticket → Ghost Worker responds
- [ ] Check ticket has AI response posted
- [ ] Confirm costs logged to `ai_worker_logs`

---

## 💡 Key Differences from Cursor AI

| Feature | Ghost Worker | Cursor AI |
|---------|-------------|-----------|
| **Runs Where** | Firebase Cloud (24/7) | Your Cursor IDE |
| **API Keys** | Your own Google/Anthropic | Cursor's pool |
| **Billing** | Direct to your accounts | Cursor subscription |
| **Triggers** | Firestore events | Manual prompts |
| **Cost Tracking** | Logged to Firebase | Not visible |
| **Automation** | Fully automatic | Manual/on-demand |
| **Model Choice** | You control routing | Cursor decides |

---

## 📈 ROI Calculation

**Traditional Support:**
- 100 tickets/month
- 10 minutes per ticket
- $50/hour developer rate
- **Cost: $833/month**

**Ghost Worker:**
- 100 tickets/month
- 70% automated (70 tickets)
- AI cost: ~$0.80/month
- Human handles 30 complex tickets: $250/month
- **Cost: $250.80/month**

**Savings: $582/month ($6,984/year)** 🎉

---

## 🔄 Alternative: n8n Workflow Setup

If you prefer a visual workflow builder, here's the n8n setup:

### Workflow Structure
```
1. Firestore Trigger Node
   → Watches supportTickets collection
   → Triggers on document.created

2. Gemini Flash HTTP Request Node
   → POST to https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
   → Header: x-goog-api-key: YOUR_GEMINI_KEY
   → Body: { prompt: triagePrompt }
   → Parse JSON response

3. Router Node (IF/ELSE)
   → IF route === "gemini-pro" → Go to Node 4a
   → IF route === "claude-sonnet" → Go to Node 4b

4a. Gemini Pro HTTP Request Node
   → POST to Google AI API
   → Your GEMINI_API_KEY

4b. Claude Sonnet HTTP Request Node
   → POST to https://api.anthropic.com/v1/messages
   → Header: x-api-key: YOUR_ANTHROPIC_KEY
   → Body: { messages: [...] }

5. Firestore Write Node
   → Collection: supportTickets/{ticketId}/messages
   → Add Ghost Worker response

6. Firestore Write Node
   → Collection: ai_worker_logs
   → Log costs and metadata
```

**n8n Pros:**
- See each step visually
- Easy to debug (inspect each node)
- Add Slack notifications easily
- Built-in error handling

**n8n Cons:**
- Requires hosting ($20/month or self-host)
- More moving parts
- Firebase Function approach is simpler

---

## 🎓 My Recommendation

**Start with Option A (Firebase Function)** because:

1. ✅ **Simpler** - One deployment, all in Firebase
2. ✅ **Cheaper** - No n8n hosting costs
3. ✅ **Native** - Uses Firebase triggers (no webhooks needed)
4. ✅ **Faster** - Lower latency (no external service)
5. ✅ **Easier** - Fewer places to manage secrets

**Upgrade to n8n later if:**
- You want visual workflow editing
- You need to integrate many other services
- You prefer no-code modifications
- You want built-in retry logic

---

## 📝 Next Steps

1. **Review this architecture** - Does this meet your separation requirements?
2. **Choose deployment method** - Firebase Function or n8n?
3. **Get API keys** - Google AI Studio + Anthropic Console
4. **Decide on auto-response** - Observation mode first, or full auto?
5. **Ready to implement?** - Say "GO" and I'll deploy it!

---

## ❓ Questions to Answer

1. **Observation Mode First?**
   - Start with Ghost Worker analyzing but NOT posting responses?
   - Or go straight to full automation?

2. **Cost Alerts?**
   - Should I add Firebase Functions to alert you if daily cost exceeds a threshold?
   - E.g., "Alert if AI costs exceed $1/day"

3. **Response Style?**
   - Should Ghost Worker identify itself? ("Ghost Worker suggests...")
   - Or respond as if human?

4. **Confidence Threshold?**
   - Only auto-respond if >80% confident?
   - Or >90% to be safer?

5. **Escalation Rules?**
   - Should low-confidence tickets auto-escalate to you?
   - Or just log and wait for human review?

---

**Ready to confirm the architecture and say GO?** 🚀
