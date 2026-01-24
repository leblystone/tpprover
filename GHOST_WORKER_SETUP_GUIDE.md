# 🚀 Ghost Worker Setup Guide

## Prerequisites

1. **Google Cloud Account** (you already have this via Firebase)
2. **Anthropic API Key** (for Claude Sonnet)
3. **Google AI Studio API Key** (for Gemini models)

---

## Step 1: Get API Keys

### Gemini API Key (Google AI Studio)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

### Anthropic API Key (Claude)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-...`)

---

## Step 2: Install Dependencies

```bash
cd functions
npm install @google/generative-ai@latest
npm install @anthropic-ai/sdk@latest
```

---

## Step 3: Configure Firebase Secrets

```bash
# Set Gemini API Key
firebase functions:secrets:set GEMINI_API_KEY
# Paste your API key when prompted

# Set Anthropic API Key
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your API key when prompted

# Verify secrets are set
firebase functions:secrets:access GEMINI_API_KEY
firebase functions:secrets:access ANTHROPIC_API_KEY
```

---

## Step 4: Update functions/index.js

Add this line to export the Ghost Worker function:

```javascript
// At the top with other imports
const ghostWorker = require('./ghostWorker');

// At the bottom with other exports
exports.ghostWorkerTriage = ghostWorker.ghostWorkerTriage;
exports.overrideGhostWorkerRouting = ghostWorker.overrideGhostWorkerRouting;
exports.getGhostWorkerStats = ghostWorker.getGhostWorkerStats;
```

---

## Step 5: Deploy (Observation Mode)

The Ghost Worker starts in **observation mode** by default. This means:
- ✅ It WILL analyze tickets
- ✅ It WILL log routing decisions
- ❌ It will NOT post responses automatically
- ✅ You can review decisions before enabling auto-response

```bash
firebase deploy --only functions:ghostWorkerTriage
```

---

## Step 6: Test with a Real Ticket

1. Create a test support ticket from your app
2. Check Firebase logs to see routing decision:

```bash
firebase functions:log --only ghostWorkerTriage
```

You should see logs like:
```
🤖 Ghost Worker activated for ticket: abc123 (Z005)
🧠 Starting triage...
✅ Triage complete in 1200ms
   Route: gemini-pro
   Confidence: 95%
   Reasoning: Simple UI text change request
👁️ OBSERVATION MODE: Response generated but not posted
```

3. Check Firestore collection `ghostWorkerLogs` to see detailed decision data

---

## Step 7: Review Routing Accuracy

Monitor for 1-2 weeks in observation mode:

1. Check `ghostWorkerLogs` collection in Firestore
2. For each log, ask yourself: "Would I have routed this the same way?"
3. If routing was wrong, use the admin override function (see below)

---

## Step 8: Enable Auto-Response (When Ready)

Once you're confident in routing accuracy:

1. Edit `functions/ghostWorker.js`
2. Find the `CONFIG` object at the top
3. Change these values:

```javascript
routing: {
  confidenceThreshold: 80,              // Lower if too conservative
  enableAutoResponse: true,             // 👈 ENABLE THIS
  observationMode: false,               // 👈 DISABLE THIS
}
```

4. Redeploy:

```bash
firebase deploy --only functions:ghostWorkerTriage
```

---

## Step 9: Add Admin Dashboard (Optional)

1. Copy the `GhostWorkerDashboard.jsx` component to your admin panel
2. Import it in your Admin page:

```javascript
import GhostWorkerDashboard from './components/admin/GhostWorkerDashboard';

// In your admin panel JSX
<GhostWorkerDashboard />
```

---

## Admin Override (Training the Router)

If Ghost Worker routes incorrectly, teach it:

```javascript
// Call this from your admin panel
const overrideRouting = async (ticketId, correctRoute) => {
  const overrideGhostWorkerRouting = firebase
    .functions()
    .httpsCallable('overrideGhostWorkerRouting');
  
  await overrideGhostWorkerRouting({
    ticketId: ticketId,
    correctRoute: correctRoute, // 'gemini-pro' or 'claude-sonnet'
    feedback: 'Optional: Why the routing was wrong'
  });
};
```

This creates a training dataset you can use to:
- Improve routing prompts
- Fine-tune the triage model (future enhancement)
- Track accuracy over time

---

## Monitoring & Costs

### View Ghost Worker Stats

```javascript
const getStats = async () => {
  const getGhostWorkerStats = firebase
    .functions()
    .httpsCallable('getGhostWorkerStats');
  
  const result = await getGhostWorkerStats();
  console.log(result.data.stats);
  
  // {
  //   totalProcessed: 42,
  //   routedToGeminiPro: 28,
  //   routedToClaudeSonnet: 14,
  //   averageConfidence: 87.5,
  //   responsesPosted: 42,
  //   humanOverrides: 3,
  //   totalCost: 0.52,
  //   averageCostPerTicket: 0.012
  // }
};
```

### Check Firestore Collections

1. **`ghostWorkerLogs`** - Every routing decision
   - Fields: route, confidence, reasoning, cost, tokensUsed, etc.

2. **`ghostWorkerErrors`** - Any failures
   - Fields: ticketId, errorMessage, errorStack, timestamp

3. **`supportTickets`** - Tickets with Ghost Worker metadata
   - Look for `metadata.ghostWorker` field

---

## Troubleshooting

### "API key not configured" error

**Solution**: Make sure secrets are set correctly:
```bash
firebase functions:secrets:access GEMINI_API_KEY
firebase functions:secrets:access ANTHROPIC_API_KEY
```

### "Triage parsing failed"

**Cause**: Gemini returned non-JSON response

**Solution**: Check logs for raw response, adjust prompt if needed. The system will safely fallback to routing to Claude Sonnet.

### High costs

**Check**:
1. Are you processing the same ticket multiple times?
2. Is the triage model being called efficiently?
3. Review `ghostWorkerLogs` for `totalCost` field

**Solution**: Add caching or deduplication if needed.

### Ghost Worker not triggering

**Check**:
1. Is the Firestore trigger deployed? `firebase functions:list`
2. Are tickets being created in the `supportTickets` collection?
3. Check Firebase Functions logs for errors

---

## Configuration Options

All settings are in `functions/ghostWorker.js` under the `CONFIG` object:

```javascript
const CONFIG = {
  // Change models (when new versions release)
  models: {
    triage: 'gemini-2.0-flash-exp',
    geminiPro: 'gemini-1.5-pro',
    claudeSonnet: 'claude-sonnet-4'
  },
  
  // Adjust routing behavior
  routing: {
    confidenceThreshold: 80,     // 0-100, lower = more aggressive
    enableAutoResponse: false,    // true = post responses
    observationMode: true,        // false = active mode
  },
  
  // Update costs (check current pricing)
  costs: {
    'gemini-2.0-flash-exp': 0.075,
    'gemini-1.5-pro': 1.25,
    'claude-sonnet-4': 3.00
  },
  
  // Add more forbidden actions
  forbiddenActions: [
    'delete user',
    'drop table',
    // ... add more as needed
  ]
};
```

---

## Safety Features

Ghost Worker includes multiple safety layers:

1. **Confidence Threshold** - Won't act if unsure
2. **Forbidden Actions** - Blocks dangerous commands
3. **Observation Mode** - Test without risk
4. **Human Override** - Teach correct routing
5. **Escalation** - Auto-flags critical issues
6. **Audit Log** - Every decision tracked

---

## Next Steps

1. ✅ **Deploy in observation mode** (Step 5)
2. ✅ **Monitor for 1-2 weeks** (Step 7)
3. ✅ **Review routing accuracy** (Step 7)
4. ✅ **Enable auto-response** (Step 8)
5. ✅ **Add admin dashboard** (Step 9)
6. 🎉 **Enjoy automated support!**

---

## Support

If Ghost Worker misbehaves:
1. Check `ghostWorkerLogs` in Firestore
2. Review Firebase Functions logs
3. Disable by setting `enableAutoResponse: false`
4. Report issues via support ticket (ironically 😄)
