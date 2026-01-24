# 🤖 Ghost Worker: Multi-Model Router Proposal

## 📋 Executive Summary

Build an intelligent AI routing system that processes your support tickets using different LLMs based on task complexity, optimizing for both cost and quality.

**Current State**: You have a support ticket system (`supportTickets` collection in Firestore) that notifies admins via email.

**Proposed State**: Tickets automatically trigger a "Ghost Worker" that:
1. **Triages** using Gemini Flash (fast/cheap)
2. **Routes** to the appropriate specialist:
   - **Gemini Pro** → UI/UX tweaks, text changes, simple fixes
   - **Claude Sonnet 4.5** → Business logic, payments, complex bugs

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPPORT TICKET CREATED                      │
│              (Firestore trigger or webhook)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   🧠 TRIAGE LAYER (Router)                      │
│                                                                 │
│  Model: Gemini Flash 2.0 (~$0.075 per 1M tokens)              │
│  Purpose: Read ticket, classify complexity, extract context     │
│  Output: { route: "gemini-pro" | "claude-sonnet",             │
│            confidence: 0-100,                                   │
│            reasoning: "..." }                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
    ┌────────────────────────┐  ┌────────────────────────┐
    │  🎨 GEMINI PRO         │  │  🔧 CLAUDE SONNET 4.5  │
    │                        │  │                        │
    │  UI/UX Changes         │  │  Business Logic        │
    │  Text Updates          │  │  Payment Code          │
    │  Simple Bugs           │  │  Complex Debugging     │
    │  Content Changes       │  │  Architecture          │
    │                        │  │  Security              │
    │  ~$1.25 per 1M tokens  │  │  ~$3 per 1M tokens     │
    └────────────┬───────────┘  └────────────┬───────────┘
                 │                           │
                 └───────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │  💾 RESPONSE HANDLER         │
              │                              │
              │  - Post to ticket            │
              │  - Notify user/admin         │
              │  - Log costs/metrics         │
              └──────────────────────────────┘
```

---

## 📍 Where to Insert the Router

### Option 1: Firestore Trigger (Recommended)
**Insert Point**: Create a new Firebase Function that triggers when tickets are created.

```javascript
// functions/ghostWorker.js

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {logger} = require('firebase-functions');

exports.ghostWorkerTriage = onDocumentCreated(
  {
    document: 'supportTickets/{ticketId}',
    secrets: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY']
  },
  async (event) => {
    const ticketData = event.data.data();
    const ticketId = event.params.ticketId;
    
    logger.info(`🤖 Ghost Worker activated for ticket: ${ticketId}`);
    
    // Step 1: Triage with Gemini Flash
    const routingDecision = await triageTicket(ticketData);
    
    // Step 2: Route to specialist
    let response;
    if (routingDecision.route === 'gemini-pro') {
      response = await processWithGeminiPro(ticketData, routingDecision.context);
    } else {
      response = await processWithClaudeSonnet(ticketData, routingDecision.context);
    }
    
    // Step 3: Post response to ticket
    await addGhostWorkerResponse(ticketId, response, routingDecision);
  }
);
```

**Why this location?**
- ✅ Automatic: Triggers the moment a ticket is created
- ✅ Native: Uses your existing Firebase infrastructure
- ✅ Cost-effective: No external services needed
- ✅ Secure: API keys stored as Firebase secrets

### Option 2: Webhook Integration (Alternative)
If you want to use n8n or another orchestration tool:

**Insert Point**: Modify `createSupportTicket` to send webhook after ticket creation:

```javascript
// In functions/index.js, after line 3356 (ticket created)

// Send webhook to Ghost Worker (n8n)
if (process.env.GHOST_WORKER_WEBHOOK_URL) {
  await fetch(process.env.GHOST_WORKER_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId: ticketRef.id,
      ticketNumber: ticketNumber,
      type: type,
      subject: subject,
      message: message,
      userEmail: userEmail,
      metadata: metadata
    })
  });
}
```

Then n8n handles the routing logic and calls back to Firebase to post responses.

---

## 🧠 System Prompts & Routing Logic

### Triage Layer Prompt (Gemini Flash 2.0)

```javascript
const TRIAGE_SYSTEM_PROMPT = `You are the Triage Agent for The Pep Planner support system.

Your ONLY job is to analyze incoming support tickets and decide which AI specialist should handle them.

## ROUTING RULES:

### Route to GEMINI-PRO if ticket involves:
- UI/UX changes (colors, layouts, spacing, animations)
- Text updates (copy changes, labels, tooltips)
- Simple visual bugs (alignment, missing icons, display issues)
- Feature requests for UI components
- Content changes (help text, descriptions)
- Mobile responsiveness tweaks
- Email template updates

### Route to CLAUDE-SONNET if ticket involves:
- Payment processing (Stripe, Google Play, Apple IAP)
- User authentication/authorization
- Database queries or Firestore rules
- Business logic (trial periods, subscriptions, access control)
- Security concerns
- Complex bugs with stack traces or error logs
- Data integrity issues
- API integrations (webhooks, external services)
- Performance optimization
- Architecture decisions

## OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "route": "gemini-pro" | "claude-sonnet",
  "confidence": 0-100,
  "reasoning": "Brief explanation of why this route was chosen",
  "complexity": "low" | "medium" | "high",
  "keywords": ["relevant", "extracted", "keywords"],
  "urgency": "low" | "medium" | "high" | "critical"
}

## IMPORTANT RULES:
- If payment/money/billing/stripe/subscription mentioned → ALWAYS route to claude-sonnet
- If user data/security/authentication mentioned → ALWAYS route to claude-sonnet
- If the ticket mentions "not working" + error messages → route to claude-sonnet
- If purely cosmetic/visual → route to gemini-pro
- When in doubt about complexity → route to claude-sonnet (safety first)
- If ticket includes code snippets or stack traces → route to claude-sonnet

Be decisive. Don't overthink it. Make a choice based on the primary concern.`;
```

### Gemini Pro Specialist Prompt

```javascript
const GEMINI_PRO_SYSTEM_PROMPT = `You are the UI/UX Specialist for The Pep Planner.

## YOUR ROLE:
You handle cosmetic changes, UI tweaks, and simple visual bugs. You excel at:
- React component styling (Tailwind CSS)
- Layout adjustments
- Animation and transitions
- Responsive design
- Text/copy updates
- Icon and image placement
- Email template HTML/CSS

## CODEBASE CONTEXT:
- React app using Vite
- Tailwind CSS for styling
- Firebase for backend
- Capacitor for mobile (iOS/Android)

## TOOLS YOU CAN USE:
- Read files to understand current implementation
- Edit JSX components
- Update CSS/Tailwind classes
- Modify email templates
- Test changes visually

## RESPONSE FORMAT:
1. Acknowledge the request
2. Explain your approach
3. Show the changes (code diffs)
4. Provide testing instructions
5. Ask if the user wants you to implement

## CONSTRAINTS:
- DO NOT touch payment code (Stripe, Google Play Billing)
- DO NOT modify authentication logic
- DO NOT change Firebase security rules
- DO NOT alter database schemas
- If you encounter business logic → flag for escalation to Claude Sonnet

Be friendly, visual, and design-focused. Use emojis sparingly but effectively.`;
```

### Claude Sonnet Senior Engineer Prompt

```javascript
const CLAUDE_SONNET_SYSTEM_PROMPT = `You are the Senior Engineer for The Pep Planner.

## YOUR ROLE:
You handle complex technical tasks that require deep reasoning:
- Payment systems (Stripe, Google Play Billing, Apple IAP)
- User authentication/authorization
- Business logic (trials, subscriptions, access control)
- Database design and Firestore rules
- Security and data integrity
- Complex debugging
- API integrations
- Performance optimization

## CODEBASE CONTEXT:
- React PWA with mobile apps (iOS/Android via Capacitor)
- Firebase backend (Functions, Firestore, Storage, Auth)
- Payment processors: Stripe (web), Google Play (Android), Squarespace (merch)
- Email service: Resend API
- Key collections: users, supportTickets, emailQueue, subscriptions

## YOUR APPROACH:
1. **Analyze deeply**: Understand the root cause, not just symptoms
2. **Security first**: Never compromise user data or payment integrity
3. **Test thoroughly**: Consider edge cases and failure modes
4. **Document clearly**: Explain your reasoning and trade-offs
5. **Suggest improvements**: Beyond fixing bugs, improve architecture

## RESPONSE FORMAT:
### Analysis
- What's the root cause?
- What are the implications?

### Solution
- Proposed fix with code
- Alternative approaches considered
- Why this approach is best

### Testing
- How to verify the fix
- Edge cases to test
- Rollback plan if needed

### Follow-up
- Any technical debt created?
- Monitoring/logging needed?

## CONSTRAINTS:
- NEVER make assumptions about payment amounts or user access
- ALWAYS verify data integrity after changes
- TEST payment flows in sandbox/test mode first
- LOG all critical operations for audit trails

Be thorough, senior-level, and safety-conscious. Code quality over speed.`;
```

---

## 🔧 Implementation Options

### Option A: Firebase Functions Only (Recommended)

**Pros:**
- ✅ No external dependencies
- ✅ Lower latency (everything in Firebase)
- ✅ Easier secret management
- ✅ Free tier generous (2M invocations/month)
- ✅ Native integration with your existing code

**Cons:**
- ⚠️ Requires managing API clients for Gemini/Claude
- ⚠️ Less visual workflow builder
- ⚠️ More manual logging/monitoring

**Cost Estimate:**
- Firebase Functions: Free tier likely covers it
- Gemini Flash triage: ~$0.075 per 1M tokens (~$0.0001 per ticket)
- Gemini Pro execution: ~$1.25 per 1M tokens (~$0.005 per response)
- Claude Sonnet execution: ~$3 per 1M tokens (~$0.015 per response)
- **Total per ticket: $0.001 - $0.02 depending on route**

### Option B: n8n Orchestration Layer

**Pros:**
- ✅ Visual workflow builder
- ✅ Built-in error handling and retries
- ✅ Easy to modify routing logic without code deployment
- ✅ Better observability (see each step)
- ✅ Can integrate with other tools (Slack, Discord, etc.)

**Cons:**
- ⚠️ Additional service to host (~$20/month for n8n Cloud)
- ⚠️ Higher latency (webhook roundtrip)
- ⚠️ More complex architecture
- ⚠️ Another place to manage secrets

**Cost Estimate:**
- n8n Cloud: $20/month (or self-host for free)
- AI costs same as Option A
- **Total: $20/month + $0.001-$0.02 per ticket**

---

## 📊 Routing Decision Tree

```
Is payment/billing/money mentioned?
  YES → Claude Sonnet
  NO  ↓

Is auth/security/user data mentioned?
  YES → Claude Sonnet
  NO  ↓

Does ticket include error logs/stack traces?
  YES → Claude Sonnet
  NO  ↓

Is it purely cosmetic/visual/text?
  YES → Gemini Pro
  NO  ↓

Is business logic affected (trials, access, etc)?
  YES → Claude Sonnet
  NO  ↓

Can it be done in <50 lines of code?
  YES → Gemini Pro
  NO  → Claude Sonnet
```

---

## 🎯 Recommended Implementation Path

### Phase 1: MVP (Week 1)
1. Create `functions/ghostWorker.js` with triage logic
2. Implement Gemini Flash router
3. Connect to existing ticket system
4. Log all routing decisions (but don't auto-respond yet)
5. **Manually review** routing decisions for accuracy

### Phase 2: Single Route Testing (Week 2)
1. Enable auto-responses for Gemini Pro route ONLY (low-risk)
2. Monitor responses for quality
3. Flag any that should have gone to Claude
4. Refine routing logic based on misroutes

### Phase 3: Full Automation (Week 3+)
1. Enable Claude Sonnet route
2. Add confidence threshold (e.g., only auto-respond if >80% confidence)
3. Low confidence tickets → flag for human review
4. Build admin dashboard to review Ghost Worker activity

### Phase 4: Enhancement (Ongoing)
1. Add learning from human overrides
2. Track cost per ticket type
3. A/B test different prompts
4. Add "escalation" flow (Ghost Worker asks for human help)

---

## 🔐 Security & Safety Rails

### 1. Approval Gates
```javascript
// Only auto-respond if confidence is high
if (routingDecision.confidence < 80) {
  // Flag for human review instead
  await flagForHumanReview(ticketId, routingDecision);
  return;
}
```

### 2. Restricted Actions
```javascript
const FORBIDDEN_ACTIONS = [
  'delete user data',
  'modify payment amounts',
  'change subscription pricing',
  'alter security rules',
  'grant admin access'
];

// Before executing, scan for forbidden actions
if (FORBIDDEN_ACTIONS.some(action => response.includes(action))) {
  await escalateToHuman(ticketId, 'Forbidden action detected');
  return;
}
```

### 3. Sandbox Testing
- Ghost Worker can create PRs/branches but not merge to main
- Require human approval for:
  - Database migrations
  - Payment code changes
  - Security rule updates

### 4. Audit Trail
Log every decision to Firestore:
```javascript
await db.collection('ghostWorkerLogs').add({
  ticketId,
  triageModel: 'gemini-flash-2.0',
  executionModel: 'gemini-pro',
  routingReasoning: routingDecision.reasoning,
  confidence: routingDecision.confidence,
  responseGenerated: true,
  humanOverride: false,
  cost: estimatedCost,
  timestamp: admin.firestore.FieldValue.serverTimestamp()
});
```

---

## 💰 Cost Analysis (100 Tickets/Month)

| Scenario | Triage | Execution | Total/Month |
|----------|--------|-----------|-------------|
| All Simple (Gemini Pro) | $0.01 | $0.50 | **$0.51** |
| All Complex (Claude) | $0.01 | $1.50 | **$1.51** |
| 70/30 Split (Realistic) | $0.01 | $0.80 | **$0.81** |

**Compared to:** Hiring a developer to respond to 100 tickets = ~$2,000-$5,000/month

**ROI:** 🚀 Massive (like 2000x+ savings)

---

## 🚦 Traffic Cop Logic (The Router Function)

```javascript
async function triageTicket(ticketData) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const ticketContext = `
    Type: ${ticketData.type}
    Subject: ${ticketData.subject}
    Message: ${ticketData.message}
    User: ${ticketData.userEmail}
    Metadata: ${JSON.stringify(ticketData.metadata || {})}
  `;

  const prompt = `${TRIAGE_SYSTEM_PROMPT}

## TICKET TO ANALYZE:
${ticketContext}

Analyze this ticket and return your routing decision as JSON.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  // Parse JSON response
  const routingDecision = JSON.parse(response);
  
  logger.info(`🚦 Routing decision:`, routingDecision);
  
  return routingDecision;
}
```

---

## 📝 Next Steps

### Before Implementation:
1. **Review this proposal** - Do these routing rules match your vision?
2. **Decide on architecture** - Firebase Functions only, or add n8n?
3. **Set API budget** - What's your monthly AI spend limit?
4. **Define success metrics** - How will you measure if Ghost Worker is helping?

### To Get Started:
1. I'll create `functions/ghostWorker.js` with the full implementation
2. Set up Firebase secrets for `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`
3. Deploy the triage function (observation mode first)
4. Monitor routing decisions for 1-2 weeks
5. Enable auto-responses once confident in routing accuracy

---

## ❓ Questions to Answer

1. **Auto-respond immediately, or flag for approval first?**
   - Recommendation: Start with "flag for approval" mode, graduate to auto-respond

2. **Should Ghost Worker have write access to your codebase?**
   - Recommendation: Read-only for now, propose fixes via ticket responses

3. **What's the confidence threshold for auto-execution?**
   - Recommendation: Start at 90%, lower to 80% once proven

4. **Should users know they're talking to an AI?**
   - Recommendation: Yes, be transparent ("Our AI assistant suggests...")

5. **What happens if Ghost Worker is wrong?**
   - Recommendation: Add "This didn't help" button → escalates to human + improves future routing

---

## 🎉 Summary

This Multi-Model Router gives you:
- ✅ **99% cost savings** vs human support for automatable tasks
- ✅ **24/7 instant responses** to simple tickets
- ✅ **Smart routing** to preserve Claude for complex work
- ✅ **Safety rails** to prevent costly mistakes
- ✅ **Audit trail** for continuous improvement

Ready to build this? Just say "GO" and I'll start implementation! 🚀
