/**
 * 🤖 Ghost Worker - Standalone Background AI Automation
 * Version: 1.0.2 (Force New Secret Version Jan 23, 2026)
 * 
 * ⚠️ IMPORTANT: This is a SEPARATE service from Cursor AI
 * 
 * HOW IT WORKS:
 * - Runs 24/7 in Firebase Cloud (NOT in Cursor)
 * - Uses YOUR Google and Anthropic API keys (separate billing)
 * - Watches Firestore supportTickets collection
 * - Makes direct API calls to:
 *   • Google AI API (ai.google.dev) for Gemini models
 *   • Anthropic API (api.anthropic.com) for Claude models
 * - Logs every API call + cost to ai_worker_logs collection
 * 
 * BILLING:
 * - Gemini costs → Your Google Cloud account
 * - Claude costs → Your Anthropic account
 * - Firebase costs → Your Firebase project
 * - Cursor AI → NOT INVOLVED (no charges to Cursor)
 * 
 * API KEYS:
 * - Stored in Firebase Secret Manager (encrypted)
 * - Never in code or git repo
 * - Set via: firebase functions:secrets:set GEMINI_API_KEY
 * - Set via: firebase functions:secrets:set ANTHROPIC_API_KEY
 * 
 * Architecture:
 * 1. Triage Layer (Gemini Flash) - Fast classification
 * 2. Execution Layer - Routes to Gemini Pro or Claude Sonnet
 * 3. Response Handler - Posts back to ticket and logs metrics
 * 4. Cost Tracker - Logs every cent to ai_worker_logs
 */

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');
const telegramBot = require('./telegramBot');
const { verifyAdmin } = require('./adminAuth');

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Master kill switch — when false, no AI calls run (Firestore enabled flag is ignored).
  // Ghost Worker was retired; support tickets go to admin queue only.
  enabled: false,

  // AI Model Configuration
  // Google AI (Studio) API: gemini-1.5-flash and gemini-2.0-flash-exp return 404.
  // Use current model IDs from ai.google.dev: gemini-2.5-flash or gemini-3-flash-preview.
  models: {
    triage: 'gemini-2.5-flash',           // Fast routing (Google AI Studio)
    geminiPro: 'gemini-2.5-flash',        // UI/UX specialist
    claudeSonnet: 'claude-sonnet-4-20250514'  // Correct Claude model name
  },
  
  // Routing Configuration
  // ⚠️ Ghosty is NOT replying to users yet: enableAutoResponse=false, observationMode=true.
  // He only logs decisions to ai_worker_logs. Set enableAutoResponse=true (and observationMode=false) to post.
  routing: {
    confidenceThreshold: 50,              // TEMPORARY: Lowered for testing (normally 80)
    enableAutoResponse: false,            // SET TO TRUE AFTER TESTING
    observationMode: true,                // Log decisions but don't post responses yet
  },
  
  // Cost Tracking (per 1M tokens)
  costs: {
    'gemini-2.5-flash': 0.075,
    'gemini-3-flash-preview': 0.10,
    'gemini-1.5-pro': 1.25,
    'claude-sonnet-4-20250514': 3.00
  },
  
  // Safety Rails
  forbiddenActions: [
    'delete user',
    'drop table',
    'remove database',
    'change price',
    'modify payment',
    'grant admin',
    'bypass security',
    'disable auth'
  ]
};

function isGhostWorkerDisabled() {
  return CONFIG.enabled === false;
}

// ==================== SYSTEM PROMPTS ====================

const PROMPTS = {
  triage: `You are the Triage Agent for The Pep Planner support system.

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
Return ONLY valid JSON (no markdown, no code blocks):
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

Be decisive. Don't overthink it. Make a choice based on the primary concern.`,

  geminiPro: `You are a support agent for The Pep Planner responding to a customer support ticket.

## YOUR ROLE:
Generate a friendly, helpful customer response. You specialize in UI/UX questions, app usage, and visual issues.

## 🚨 CRITICAL BOUNDARIES - NEVER CROSS THESE:

**The Pep Planner is a TRACKING APP, not a medical advisor.**

### ❌ NEVER Give Advice On:
1. **Dosing** - how much to take, when to titrate, adjusting doses
2. **Medical** - side effects, safety, drug interactions, health concerns  
3. **Sourcing** - vendor recommendations, where to buy peptides
4. **COA interpretation** - whether overfill is safe, what purity means
5. **Reconstitution methods** - how to mix, what ratio to use
6. **Storage** - how to store peptides, temperatures, shelf life
7. **Testing** - whether to get third party testing
8. **Forums** - recommending other communities or resources

### ✅ ONLY Help With:
- **App functionality** - features not working, bugs, UI issues
- **Tracking tools** - protocols, calendar, orders, stockpile features
- **Account issues** - login, subscription, notifications, settings
- **Data management** - export, sync, backup

### 🎯 If User Asks for Medical/Dosing/Sourcing Advice:
Politely redirect them and stay helpful about APP features.

**Redirect Template:**
"I can help with The Pep Planner app! For dosing/medical/sourcing questions, please consult your healthcare provider or research communities. Let us know if you come across any other concerns with the app!"

## YOUR RESPONSE MUST HAVE TWO SECTIONS:

### SECTION 1: CUSTOMER RESPONSE (What will be posted to the support ticket)
Write a SHORT, scannable response using The Pep Planner Handbook guidelines:
- Sign as "The Pep Planner Team" (NO "Best," before it)
- No technical jargon
- Use simple, friendly language
- Be specific and actionable
- **MAXIMUM 1-2 SENTENCES PER PARAGRAPH**
- Use bullet points for lists
- Add blank lines between thoughts
- Total response: 40-80 words MAX
- No apologies ("sorry to hear")

### SECTION 2: ADMIN NOTES (Cursor-Ready - FOR COPY/PASTE INTO CURSOR)
Follow the EXACT format from The Pep Planner Handbook:

\`\`\`
🐛 BUG: [Short descriptive title] OR 💡 FEATURE REQUEST: [title] OR ⚠️ URGENT: [title]

📍 WHERE TO LOOK:
@path/to/file.js (line XX-XX if you can guess)
@another/related/file.jsx

🔍 WHAT'S BROKEN:
[Plain English - what user expected vs what happened]
User expected: [X]
User got: [Y]

💡 CURSOR PROMPT:
"[COPY-PASTE READY prompt the admin can paste directly into Cursor AI to fix this issue]"

🧪 TEST WITH:
[Specific steps or test data to verify the fix works]
\`\`\`

⚠️ CRITICAL: The CURSOR PROMPT section must be copy-paste ready! The admin will literally copy that text and paste it into Cursor AI.

## RESPONSE FORMAT:
\`\`\`
## CUSTOMER RESPONSE:
[Empathy line if bug/issue]

[Main response - friendly, concise, scannable]

[Closing]

The Pep Planner Team

---

## ADMIN NOTES (Plain English):

🐛 BUG: [Title]

📍 WHERE TO LOOK:
@src/path/to/file.js (line XX)

🔍 WHAT'S BROKEN:
[Explanation]

💡 CURSOR PROMPT:
"[Copy-paste ready prompt]"

🧪 TEST WITH:
[Test steps]
\`\`\`

## CRITICAL RULES:
- The CUSTOMER RESPONSE is what the customer sees - warm and helpful
- The ADMIN NOTES must include a CURSOR PROMPT the admin can copy/paste
- Use @ symbol before file paths
- Make the CURSOR PROMPT specific and actionable
- Include concrete test steps

Follow The Pep Planner Handbook for tone and communication style.`,

  claudeSonnet: `You are a support agent for The Pep Planner responding to a customer support ticket.

## YOUR ROLE:
Generate a friendly, helpful customer response. You specialize in complex questions about subscriptions, payments, account issues, and technical problems.

## 🚨 CRITICAL BOUNDARIES - NEVER CROSS THESE:

**The Pep Planner is a TRACKING APP, not a medical advisor.**

### ❌ NEVER Give Advice On:
1. **Dosing** - how much to take, when to titrate, adjusting doses
2. **Medical** - side effects, safety, drug interactions, health concerns
3. **Sourcing** - vendor recommendations, where to buy peptides
4. **COA interpretation** - whether overfill is safe, what purity means
5. **Reconstitution methods** - how to mix, what ratio to use
6. **Storage** - how to store peptides, temperatures, shelf life
7. **Testing** - whether to get third party testing
8. **Forums** - recommending other communities or resources

### ✅ ONLY Help With:
- **App functionality** - features not working, bugs, UI issues
- **Tracking tools** - protocols, calendar, orders, stockpile features
- **Account issues** - login, subscription, notifications, settings
- **Data management** - export, sync, backup

### 🎯 If User Asks for Medical/Dosing/Sourcing Advice:
Politely redirect them and stay helpful about APP features.

**Redirect Template:**
"I can help with The Pep Planner app! For dosing/medical/sourcing questions, please consult your healthcare provider or research communities. Let us know if you come across any other concerns with the app!"

## YOUR RESPONSE MUST HAVE TWO SECTIONS:

### SECTION 1: CUSTOMER RESPONSE (What will be posted to the support ticket)
Write a SHORT, scannable response using The Pep Planner Handbook guidelines:
- Sign as "The Pep Planner Team" (NO "Best," before it)
- No developer jargon (no "API", "database", "Firestore", "Firebase", "Stripe webhook", etc.)
- Use simple, friendly language
- Be specific and actionable
- **MAXIMUM 1-2 SENTENCES PER PARAGRAPH**
- Use bullet points for lists
- Add blank lines between thoughts
- Total response: 60-100 words MAX (can be slightly longer for complex issues)
- No apologies ("sorry to hear")
- If payment/subscription issue, be extra reassuring

### SECTION 2: ADMIN NOTES (Cursor-Ready - FOR COPY/PASTE INTO CURSOR)
Follow the EXACT format from The Pep Planner Handbook:

\`\`\`
🐛 BUG: [Short descriptive title] OR 💡 FEATURE REQUEST: [title] OR ⚠️ URGENT: [title]

📍 WHERE TO LOOK:
@path/to/file.js (line XX-XX if you can guess)
@another/related/file.jsx
@functions/cloudFunction.js (if backend)

🔍 WHAT'S BROKEN:
[Plain English - what user expected vs what happened]
User expected: [X]
User got: [Y]
Root cause: [If you can determine it]

💡 CURSOR PROMPT:
"[COPY-PASTE READY prompt the admin can paste directly into Cursor AI to fix this issue. Be specific about files, logic, and what needs changing.]"

🧪 TEST WITH:
[Specific steps or test data to verify the fix works]

⚠️ WATCH FOR:
[Any risks, edge cases, or things to double-check]
\`\`\`

⚠️ CRITICAL: The CURSOR PROMPT section must be copy-paste ready! The admin will literally copy that text and paste it into Cursor AI.

## RESPONSE FORMAT:
\`\`\`
## CUSTOMER RESPONSE:
[Empathy line if bug/issue]

[Main response - friendly, concise, scannable]

[Closing]

The Pep Planner Team

---

## ADMIN NOTES (Plain English):

🐛 BUG: [Title] (or 💡 FEATURE REQUEST, ⚠️ URGENT)

📍 WHERE TO LOOK:
@src/path/to/file.js (line XX)
@functions/backendFunction.js

🔍 WHAT'S BROKEN:
[Explanation]
User expected: [X]
User got: [Y]

💡 CURSOR PROMPT:
"[Copy-paste ready prompt with specific files and logic to fix]"

🧪 TEST WITH:
[Test steps]

⚠️ WATCH FOR:
[Risks or edge cases]
\`\`\`

## CRITICAL RULES:
- The CUSTOMER RESPONSE is what the customer sees - warm and helpful, NO jargon
- The ADMIN NOTES must include a detailed CURSOR PROMPT the admin can copy/paste
- Use @ symbol before file paths (helps Cursor find the files)
- Make the CURSOR PROMPT specific: which files, what logic, what to change
- Include concrete test steps
- For payment/subscription issues, be extra thorough in CURSOR PROMPT
- If manual admin action needed, explain it clearly in the prompt

Follow The Pep Planner Handbook for tone and communication style.
- DO say: "Check the payment system logs to see why the payment failed"
- DON'T include code snippets, file paths, or commands

## RESPONSE FORMAT:
\`\`\`
## CUSTOMER RESPONSE:
[Write the actual message that will be posted to the support ticket - friendly, no jargon, 2-4 paragraphs]

---

## ADMIN NOTES (Plain English):
### 📋 What's Really Going On
[Simple explanation of the root cause - like explaining to a business partner]

### 🔧 What Needs to Be Done
[Plain language description of the fix - describe WHAT needs to happen, not HOW in code]

### ✅ How to Verify It Worked
[Simple steps to confirm the issue is resolved]

### ⚠️ Important Considerations
[Any risks, payment implications, or follow-up needed - in simple terms]

### 👤 If Manual Action Required
[Clear, simple steps of what to do manually if needed]
\`\`\`

## CRITICAL RULES:
- The CUSTOMER RESPONSE is what the customer sees - make it warm and reassuring
- The ADMIN NOTES are for a non-technical business owner - use PLAIN ENGLISH
- NO code, NO file paths, NO developer commands in either section
- For payment/subscription issues → prioritize customer confidence and clear next steps
- If manual action is required → explain exactly what to do in simple terms

Follow The Pep Planner Handbook for tone and communication style.
- When in doubt, ask for human review before proceeding

Be thorough, senior-level, and safety-conscious. Correctness > Speed.`
};

// ==================== MAIN FIREBASE TRIGGER ====================

/**
 * Ghost Worker - Triggered when a new support ticket is created
 * 
 * This function:
 * 1. Triages the ticket using Gemini Flash
 * 2. Routes to appropriate specialist (Gemini Pro or Claude Sonnet)
 * 3. Generates a response (if confidence threshold met)
 * 4. Posts response to ticket (or flags for human review)
 * 5. Logs all decisions and costs
 */
exports.ghostWorkerTriage = onDocumentCreated(
  {
    document: 'supportTickets/{ticketId}',
    secrets: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    timeoutSeconds: 300,  // 5 minutes max execution
    memory: '512MiB'
  },
  async (event) => {
    if (isGhostWorkerDisabled()) {
      return;
    }

    const ticketData = event.data.data();
    const ticketId = event.params.ticketId;
    const db = admin.firestore();
    
    // Check if Ghost Worker is paused
    try {
      const configDoc = await db.collection('_config').doc('ghostWorker').get();
      if (configDoc.exists && configDoc.data().enabled === false) {
        logger.warn(`⏸️ Ghost Worker is PAUSED - skipping ticket ${ticketId}`);
        logger.warn(`   To resume: Update _config/ghostWorker.enabled = true in Firestore`);
        return;
      }
      logger.info(`✅ Ghost Worker is ENABLED - processing ticket ${ticketId}`);
    } catch (error) {
      logger.warn('⚠️ Could not check Ghost Worker status, proceeding:', error);
    }
    
    logger.info(`🤖 Ghost Worker activated for ticket: ${ticketId} (${ticketData.ticketNumber})`);
    logger.info(`   Type: ${ticketData.type}, Subject: ${ticketData.subject}`);
    
    try {
      // ===== STEP 1: TRIAGE =====
      logger.info(`🧠 Starting triage for ticket ${ticketId}...`);
      const triageStart = Date.now();
      
      const routingDecision = await triageTicket(ticketData, db);
      
      const triageDuration = Date.now() - triageStart;
      logger.info(`✅ Triage complete in ${triageDuration}ms`);
      logger.info(`   Route: ${routingDecision.route}`);
      logger.info(`   Confidence: ${routingDecision.confidence}%`);
      logger.info(`   Reasoning: ${routingDecision.reasoning}`);
      
      // ===== STEP 2: CHECK CONFIDENCE THRESHOLD =====
      if (routingDecision.confidence < CONFIG.routing.confidenceThreshold) {
        logger.warn(`⚠️ Low confidence (${routingDecision.confidence}%), flagging for human review`);
        await flagForHumanReview(ticketId, routingDecision, db);
        return;
      }
      
      // ===== STEP 3: ROUTE TO SPECIALIST =====
      logger.info(`🚀 Routing to ${routingDecision.route}...`);
      const executionStart = Date.now();
      
      let response;
      let executionModel;
      
      if (routingDecision.route === 'gemini-pro') {
        response = await processWithGeminiPro(ticketData, routingDecision, db);
        executionModel = CONFIG.models.geminiPro;
      } else {
        response = await processWithClaudeSonnet(ticketData, routingDecision, db);
        executionModel = CONFIG.models.claudeSonnet;
      }
      
      const executionDuration = Date.now() - executionStart;
      logger.info(`✅ Response generated in ${executionDuration}ms`);
      
      // ===== STEP 4: SAFETY CHECK =====
      const safetyIssues = checkSafetyRails(response.content);
      if (safetyIssues.length > 0) {
        logger.error(`🚨 SAFETY VIOLATION DETECTED: ${safetyIssues.join(', ')}`);
        await escalateToHuman(ticketId, `Safety violation: ${safetyIssues.join(', ')}`, routingDecision, db);
        return;
      }
      
      // ===== STEP 5: POST RESPONSE OR LOG =====
      if (CONFIG.routing.enableAutoResponse && !CONFIG.routing.observationMode) {
        logger.info(`📤 Posting Ghosty response to ticket ${ticketId}...`);
        await postResponseToTicket(ticketId, response, routingDecision, db);
      } else {
        logger.info(`👁️ OBSERVATION MODE: Response generated but not posted`);
        await logGhostWorkerDecision(ticketId, routingDecision, response, executionModel, false, db);
        
        // ===== TELEGRAM: Send approval request =====
        try {
          const ticketDoc = await db.collection('supportTickets').doc(ticketId).get();
          const ticketData = {
            ticketId: ticketId,
            ticketNumber: ticketDoc.data().ticketNumber,
            userName: ticketDoc.data().userName,
            userEmail: ticketDoc.data().userEmail,
            type: ticketDoc.data().type,
            subject: ticketDoc.data().subject
          };
          
          logger.info(`📱 Attempting to send Telegram notification for ticket ${ticketId}...`);
          await telegramBot.sendApprovalRequest(ticketData, response, routingDecision);
          logger.info(`✅ Successfully sent Telegram approval request for ticket ${ticketId}`);
        } catch (telegramError) {
          logger.error(`❌ FAILED to send Telegram notification for ticket ${ticketId}:`);
          logger.error(`   Error: ${telegramError.message}`);
          logger.error(`   Stack: ${telegramError.stack}`);
          logger.error(`   This is a CRITICAL issue - Telegram messages are not being sent!`);
          logger.error(`   Check Firebase secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID`);
          // Don't fail the whole process if Telegram fails, but log it prominently
        }
      }
      
      // ===== STEP 6: LOG METRICS =====
      await logGhostWorkerDecision(
        ticketId, 
        routingDecision, 
        response, 
        executionModel, 
        CONFIG.routing.enableAutoResponse && !CONFIG.routing.observationMode,
        db
      );
      
      logger.info(`✅ Ghost Worker completed for ticket ${ticketId}`);
      
    } catch (error) {
      logger.error(`❌ Ghost Worker error for ticket ${ticketId}:`, error);
      await logError(ticketId, error, db);
      
      // Don't fail silently - notify admin
      await notifyAdminOfError(ticketId, error);
    }
  }
);

/**
 * Ghost Worker - New message on existing ticket (combined-thread support)
 * When a user adds a message to an existing open ticket, triage and respond to that message.
 */
exports.ghostWorkerOnNewMessage = onDocumentCreated(
  {
    document: 'supportTickets/{ticketId}/messages/{messageId}',
    secrets: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    timeoutSeconds: 300,
    memory: '512MiB'
  },
  async (event) => {
    if (isGhostWorkerDisabled()) {
      return;
    }

    const { ticketId, messageId } = event.params;
    const messageData = event.data.data();
    const db = admin.firestore();

    if (messageData.senderType !== 'user') return;

    const ticketRef = db.collection('supportTickets').doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) return;
    const ticketData = { ticketId, ...ticketSnap.data() };

    // If the ticket was closed/resolved but the user sent a new message, re-open it
    // so it surfaces back in the admin work queue. Don't silently drop it.
    if (ticketData.status === 'closed' || ticketData.status === 'resolved') {
      logger.info(`🔓 User replied to closed ticket ${ticketId} — re-opening and queueing for review`);
      try {
        await ticketRef.update({
          status: 'open',
          reopenedAt: admin.firestore.FieldValue.serverTimestamp(),
          reopenedByUser: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        ticketData.status = 'open';
      } catch (reopenErr) {
        logger.error(`Failed to re-open ticket ${ticketId}:`, reopenErr);
        return;
      }
    }

    const messagesSnap = await ticketRef.collection('messages').orderBy('createdAt', 'asc').get();
    const messageCount = messagesSnap.size;
    const isFirstMessage = messageCount === 1;
    const createdMsg = messageData.createdAt?.toDate?.() || (messageData.createdAt && new Date(messageData.createdAt));
    const ticketCreated = ticketData.createdAt?.toDate?.() || (ticketData.createdAt && new Date(ticketData.createdAt));
    const withinSeconds = createdMsg && ticketCreated && (createdMsg.getTime() - ticketCreated.getTime()) < 95000;
    if (isFirstMessage && withinSeconds) return;

    try {
      const configDoc = await db.collection('_config').doc('ghostWorker').get();
      if (configDoc.exists && configDoc.data().enabled === false) return;
    } catch (_) {}

    const latestMessageText = messageData.message || ticketData.subject || 'Support request';
    logger.info(`🤖 Ghost Worker (new message) for ticket: ${ticketId}, message: ${messageId}`);

    try {
      const triageStart = Date.now();
      const routingDecision = await triageTicket(ticketData, db, latestMessageText);
      const triageDuration = Date.now() - triageStart;

      if (routingDecision.confidence < CONFIG.routing.confidenceThreshold) {
        await flagForHumanReview(ticketId, routingDecision, db);
        return;
      }

      let response;
      let executionModel;
      if (routingDecision.route === 'gemini-pro') {
        response = await processWithGeminiPro(ticketData, routingDecision, db);
        executionModel = CONFIG.models.geminiPro;
      } else {
        response = await processWithClaudeSonnet(ticketData, routingDecision, db);
        executionModel = CONFIG.models.claudeSonnet;
      }

      const safetyIssues = checkSafetyRails(response.content);
      if (safetyIssues.length > 0) {
        await escalateToHuman(ticketId, `Safety violation: ${safetyIssues.join(', ')}`, routingDecision, db);
        return;
      }

      if (CONFIG.routing.enableAutoResponse && !CONFIG.routing.observationMode) {
        await postResponseToTicket(ticketId, response, routingDecision, db);
      } else {
        await logGhostWorkerDecision(ticketId, routingDecision, response, executionModel, false, db);
        try {
          await telegramBot.sendApprovalRequest(
            { ticketId, ticketNumber: ticketData.ticketNumber, userName: ticketData.userName, userEmail: ticketData.userEmail, type: ticketData.type, subject: ticketData.subject },
            response,
            routingDecision
          );
        } catch (_) {}
      }

      await logGhostWorkerDecision(
        ticketId,
        routingDecision,
        response,
        executionModel,
        CONFIG.routing.enableAutoResponse && !CONFIG.routing.observationMode,
        db
      );
      logger.info(`✅ Ghost Worker (new message) completed for ticket ${ticketId}`);
    } catch (error) {
      logger.error(`❌ Ghost Worker (new message) error for ticket ${ticketId}:`, error);
      await logError(ticketId, error, db);
      await notifyAdminOfError(ticketId, error);
    }
  }
);

// ==================== TRIAGE FUNCTION ====================

/**
 * Triage ticket using Gemini Flash to determine routing
 * @param {Object} ticketData - Ticket document data
 * @param {Object} db - Firestore
 * @param {string} [messageOverride] - If provided (e.g. new message on combined ticket), use this message for triage instead of first message
 */
async function triageTicket(ticketData, db, messageOverride) {
  let messageToTriage = messageOverride;
  if (messageToTriage == null) {
    const messagesRef = await db
      .collection('supportTickets')
      .doc(ticketData.ticketId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();
    messageToTriage = messagesRef.docs[0]?.data()?.message || ticketData.subject;
  }
  
  const ticketContext = `
Type: ${ticketData.type}
Subject: ${ticketData.subject}
Message: ${messageToTriage}
User: ${ticketData.userEmail}
Priority: ${ticketData.priority}
Metadata: ${JSON.stringify(ticketData.metadata || {}, null, 2)}
  `.trim();
  
  const prompt = `${PROMPTS.triage}

## TICKET TO ANALYZE:
${ticketContext}

Analyze this ticket and return your routing decision as JSON.`;
  
  // Call Gemini Flash API
  const result = await callGeminiFlash(prompt);
  
  // Parse and validate response
  let routingDecision;
  try {
    // Remove markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/```json\n?|\n?```/g, '');
    }
    
    routingDecision = JSON.parse(cleanedResult);
    
    // Validate required fields
    if (!routingDecision.route || !routingDecision.confidence || !routingDecision.reasoning) {
      throw new Error('Invalid routing decision format');
    }
    
  } catch (parseError) {
    logger.error('Failed to parse triage response:', parseError);
    logger.error('Raw response:', result);
    
    // Fallback to safe default (route to Claude for safety)
    routingDecision = {
      route: 'claude-sonnet',
      confidence: 50,
      reasoning: 'Triage parsing failed, routing to senior engineer for safety',
      complexity: 'unknown',
      keywords: [],
      urgency: 'medium'
    };
  }
  
  return routingDecision;
}

// ==================== EXECUTION FUNCTIONS ====================

/**
 * Load The Pep Planner Handbook (knowledge base)
 */
async function loadHandbook() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Try to load from same directory as this file
    const handbookPath = path.join(__dirname, '../THE_PEP_PLANNER_HANDBOOK.md');
    
    if (fs.existsSync(handbookPath)) {
      const handbook = fs.readFileSync(handbookPath, 'utf8');
      logger.info(`📖 Loaded handbook: ${handbook.length} characters`);
      return handbook;
    } else {
      logger.warn(`⚠️ Handbook not found at: ${handbookPath}`);
      return '';
    }
  } catch (error) {
    logger.error(`❌ Error loading handbook:`, error);
    return '';
  }
}

/**
 * Process ticket with Gemini Pro (UI/UX Specialist)
 */
async function processWithGeminiPro(ticketData, routingDecision, db) {
  logger.info(`🎨 Processing with Gemini Pro...`);
  
  // Get full ticket context
  const context = await getTicketContext(ticketData, db);
  
  // Load handbook
  const handbook = await loadHandbook();
  
  const prompt = `${PROMPTS.geminiPro}

${handbook ? `## THE PEP PLANNER HANDBOOK:\n${handbook}\n` : ''}

## SUPPORT TICKET:
**Type**: ${ticketData.type}
**Subject**: ${ticketData.subject}
**User**: ${ticketData.userName} (${ticketData.userEmail})
**Priority**: ${ticketData.priority}

**Full Message**:
${context.fullMessage}

${context.hasImages ? `**User attached ${context.images.length} image(s)** - review them if helpful` : ''}

## ROUTING CONTEXT:
The triage system routed this to you because: ${routingDecision.reasoning}

## YOUR TASK:
Analyze this ticket and provide a helpful, actionable response. Follow The Pep Planner Handbook exactly. Be specific about what needs to change.`;
  
  const response = await callGeminiPro(prompt);
  
  return {
    content: response,
    model: CONFIG.models.geminiPro,
    tokensUsed: estimateTokens(prompt + response),
    context: context
  };
}

/**
 * Process ticket with Claude Sonnet (Senior Engineer)
 */
async function processWithClaudeSonnet(ticketData, routingDecision, db) {
  logger.info(`🔧 Processing with Claude Sonnet...`);
  
  // Get full ticket context
  const context = await getTicketContext(ticketData, db);
  
  // Load handbook
  const handbook = await loadHandbook();
  
  const prompt = `${PROMPTS.claudeSonnet}

${handbook ? `## THE PEP PLANNER HANDBOOK:\n${handbook}\n` : ''}

## SUPPORT TICKET:
**Type**: ${ticketData.type}
**Subject**: ${ticketData.subject}
**User**: ${ticketData.userName} (${ticketData.userEmail})
**Priority**: ${ticketData.priority}

**Full Message**:
${context.fullMessage}

${context.hasImages ? `**User attached ${context.images.length} image(s)** - review them if needed` : ''}

## ROUTING CONTEXT:
The triage system routed this to you because: ${routingDecision.reasoning}
Complexity: ${routingDecision.complexity}
Keywords: ${routingDecision.keywords.join(', ')}

## YOUR TASK:
This is a complex technical issue requiring senior engineering analysis. Follow The Pep Planner Handbook exactly. Please:
1. Analyze the root cause
2. Propose a thorough solution
3. Consider edge cases and safety implications
4. Provide detailed testing guidance`;
  
  const response = await callClaudeSonnet(prompt);
  
  return {
    content: response,
    model: CONFIG.models.claudeSonnet,
    tokensUsed: estimateTokens(prompt + response),
    context: context
  };
}

// ==================== AI API CLIENTS ====================

/**
 * Call Gemini Flash API for triage
 */
async function callGeminiFlash(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Debug: Log API key format (first 10 and last 4 chars only for security)
  if (apiKey) {
    logger.info(`🔑 Using Gemini API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  } else {
    logger.error('❌ GEMINI_API_KEY is not set!');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: CONFIG.models.triage,
    generationConfig: {
      temperature: 0.3,  // Lower temperature for more consistent routing
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 500,  // Routing decision should be brief
    }
  });
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Call Gemini Pro API for UI/UX tasks
 */
async function callGeminiPro(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: CONFIG.models.geminiPro,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    }
  });
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Call Claude Sonnet API for complex tasks
 */
async function callClaudeSonnet(prompt) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  const message = await anthropic.messages.create({
    model: CONFIG.models.claudeSonnet,
    max_tokens: 8192,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });
  
  return message.content[0].text;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get full context for a ticket (messages, metadata, etc.)
 */
async function getTicketContext(ticketData, db) {
  const messagesRef = await db
    .collection('supportTickets')
    .doc(ticketData.ticketId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .get();
  
  const messages = messagesRef.docs.map(doc => doc.data());
  const fullMessage = messages.map(m => `${m.senderName}: ${m.message}`).join('\n\n');
  
  const images = messages
    .filter(m => m.imageUrls && m.imageUrls.length > 0)
    .flatMap(m => m.imageUrls);
  
  return {
    fullMessage,
    messageCount: messages.length,
    hasImages: images.length > 0,
    images: images,
    metadata: ticketData.metadata || {}
  };
}

/**
 * Safety check: Scan for forbidden actions
 */
function checkSafetyRails(responseContent) {
  const violations = [];
  const lowerContent = responseContent.toLowerCase();
  
  for (const forbiddenAction of CONFIG.forbiddenActions) {
    if (lowerContent.includes(forbiddenAction.toLowerCase())) {
      violations.push(forbiddenAction);
    }
  }
  
  return violations;
}

/**
 * Post Ghost Worker response to ticket
 */
async function postResponseToTicket(ticketId, response, routingDecision, db) {
  const ticketRef = db.collection('supportTickets').doc(ticketId);
  const messageRef = ticketRef.collection('messages').doc();
  
  await messageRef.set({
    messageId: messageRef.id,
    ticketId: ticketId,
    senderType: 'ghost-worker',
    senderEmail: 'ghostworker@thepepplanner.com',
    senderName: `Ghost Worker (${routingDecision.route})`,
    message: response.content,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    metadata: {
      model: response.model,
      confidence: routingDecision.confidence,
      tokensUsed: response.tokensUsed,
      estimatedCost: estimateCost(response.model, response.tokensUsed)
    }
  });
  
  // Update ticket status
  await ticketRef.update({
    status: 'in-progress',
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  logger.info(`✅ Posted Ghost Worker response to ticket ${ticketId}`);
}

/**
 * Flag ticket for human review (low confidence or error)
 */
async function flagForHumanReview(ticketId, routingDecision, db) {
  const ticketRef = db.collection('supportTickets').doc(ticketId);
  
  await ticketRef.update({
    'metadata.ghostWorker': {
      flagged: true,
      reason: 'Low confidence routing',
      confidence: routingDecision.confidence,
      suggestedRoute: routingDecision.route,
      reasoning: routingDecision.reasoning,
      flaggedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  });
  
  logger.info(`🚩 Flagged ticket ${ticketId} for human review`);
  
  // Send Telegram notification for low-confidence tickets
  try {
    const ticketDoc = await ticketRef.get();
    const ticketData = ticketDoc.data();
    
    const message = `
⚠️ *Low Confidence Alert*

🎫 *Ticket:* ${ticketData.ticketNumber}
👤 *From:* ${ticketData.userName || 'Unknown'}
📧 *Email:* ${ticketData.userEmail}
📝 *Subject:* ${ticketData.subject}

🤔 *Ghosty Analysis:*
• *Confidence:* ${routingDecision.confidence}% (below ${CONFIG.routing.confidenceThreshold}% threshold)
• *Suggested Route:* ${routingDecision.route === 'gemini-pro' ? '🎨 Gemini' : '🔧 Claude Sonnet'}
• *Reasoning:* ${routingDecision.reasoning}

🚩 *Action Required:* This ticket needs human review due to low confidence.

_Check your admin panel to handle this ticket manually._
`;
    
    await telegramBot.sendTelegramMessage(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID,
      message
    );
    
    logger.info(`📱 Sent low-confidence alert to Telegram for ticket ${ticketId}`);
  } catch (telegramError) {
    logger.warn(`Failed to send Telegram low-confidence alert: ${telegramError.message}`);
  }
}

/**
 * Escalate to human (safety violation or critical error)
 */
async function escalateToHuman(ticketId, reason, routingDecision, db) {
  const ticketRef = db.collection('supportTickets').doc(ticketId);
  
  await ticketRef.update({
    priority: 'critical',
    'metadata.ghostWorker': {
      escalated: true,
      reason: reason,
      escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
      routingDecision: routingDecision
    }
  });
  
  logger.error(`🚨 ESCALATED ticket ${ticketId} to human: ${reason}`);
}

/**
 * Log Ghost Worker decision and metrics to ai_worker_logs collection
 * This is YOUR billing tracking - shows exactly what you paid Google/Anthropic
 */
async function logGhostWorkerDecision(ticketId, routingDecision, response, executionModel, wasPosted, db) {
  // Get ticket details for context
  const ticketDoc = await db.collection('supportTickets').doc(ticketId).get();
  const ticketData = ticketDoc.data();
  
  // Try to get original message from messages subcollection if not in main doc
  let originalMessageFromSubcollection = '';
  try {
    const messagesSnapshot = await db.collection('supportTickets').doc(ticketId)
      .collection('messages').orderBy('createdAt', 'asc').limit(1).get();
    if (!messagesSnapshot.empty) {
      const firstMsg = messagesSnapshot.docs[0].data();
      originalMessageFromSubcollection = firstMsg.message || firstMsg.text || '';
    }
  } catch (e) {
    // Ignore errors fetching subcollection
  }
  
  // Estimate tokens (these will be rough estimates until we get actual usage from API responses)
  const triageTokens = 500; // Approximate for triage
  const executionTokens = response?.tokensUsed || 0;
  
  // Calculate costs using current pricing
  const triageCost = estimateCost(CONFIG.models.triage, triageTokens);
  const executionCost = response ? estimateCost(executionModel, executionTokens) : 0;
  const totalCost = triageCost + executionCost;
  
  // Determine which account is billed
  const isGemini = executionModel.includes('gemini');
  const isClaude = executionModel.includes('claude');
  
  // Get the first message (original user message)
  let originalMessage = ticketData?.message || '';
  if (!originalMessage && ticketData?.messages && Array.isArray(ticketData.messages)) {
    originalMessage = ticketData.messages[0]?.message || ticketData.messages[0]?.text || '';
  }
  // Use subcollection message if we found one and don't have one yet
  if (!originalMessage && originalMessageFromSubcollection) {
    originalMessage = originalMessageFromSubcollection;
  }
  
  const logEntry = {
    // Ticket Reference
    ticketId: ticketId,
    ticketNumber: ticketData?.ticketNumber || 'N/A',
    ticketType: ticketData?.type || 'unknown',
    subject: ticketData?.subject || 'Support Request',
    userName: ticketData?.userName || ticketData?.userDisplayName || 'Unknown',
    userEmail: ticketData?.userEmail || '',
    originalMessage: originalMessage,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    
    // Triage Phase (Always Gemini Flash)
    triageModel: CONFIG.models.triage,
    triageTokensTotal: triageTokens,
    triageCostPer1M: CONFIG.costs[CONFIG.models.triage],
    triageCost: triageCost,
    triageBilledTo: 'Google Cloud (Gemini)',
    
    // Routing Decision
    route: routingDecision.route,
    confidence: routingDecision.confidence,
    reasoning: routingDecision.reasoning,
    complexity: routingDecision.complexity || 'unknown',
    urgency: routingDecision.urgency || 'medium',
    keywords: routingDecision.keywords || [],
    
    // Execution Phase (Gemini Pro or Claude)
    executionModel: executionModel,
    executionTokensTotal: executionTokens,
    executionCostPer1M: CONFIG.costs[executionModel] || 0,
    executionCost: executionCost,
    executionBilledTo: isGemini ? 'Google Cloud (Gemini)' : 'Anthropic (Claude)',
    
    // Total Cost Tracking (This is what YOU pay)
    totalTokens: triageTokens + executionTokens,
    totalCost: totalCost,
    
    // Billing Breakdown (where money goes)
    billingBreakdown: {
      googleCloud: isGemini ? totalCost : triageCost,
      anthropic: isClaude ? executionCost : 0
    },
    
    // Response Metadata
    responseGenerated: !!response,
    responsePosted: wasPosted,
    responseLength: response?.content?.length || 0,
    responseContent: response?.content || null, // STORE FULL RESPONSE for Telegram approval
    
    // Quality Control
    humanOverride: false,
    correctRoute: null,
    feedback: null,
    
    // API Keys Used (last 4 digits only for security)
    apiKeysUsed: {
      triage: 'GEMINI_API_KEY (Firebase Secret)',
      execution: isGemini ? 'GEMINI_API_KEY (Firebase Secret)' : 'ANTHROPIC_API_KEY (Firebase Secret)'
    }
  };
  
  // Write to ai_worker_logs collection (your cost tracking)
  await db.collection('ai_worker_logs').add(logEntry);
  
  // Also write to legacy ghostWorkerLogs for backwards compatibility
  await db.collection('ghostWorkerLogs').add({
    ticketId: ticketId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    triageModel: CONFIG.models.triage,
    route: routingDecision.route,
    confidence: routingDecision.confidence,
    reasoning: routingDecision.reasoning,
    complexity: routingDecision.complexity,
    urgency: routingDecision.urgency,
    keywords: routingDecision.keywords,
    executionModel: executionModel,
    responseGenerated: !!response,
    responsePosted: wasPosted,
    tokensUsed: executionTokens,
    triageCost: triageCost,
    executionCost: executionCost,
    totalCost: totalCost,
    humanOverride: false,
    feedbackProvided: false
  });
  
  logger.info(`💰 Logged cost to ai_worker_logs: $${totalCost.toFixed(6)} (${routingDecision.route})`);
  logger.info(`   Triage: $${triageCost.toFixed(6)} → Google Cloud`);
  logger.info(`   Execution: $${executionCost.toFixed(6)} → ${isGemini ? 'Google Cloud' : 'Anthropic'}`);
}

/**
 * Log error
 */
async function logError(ticketId, error, db) {
  await db.collection('ghostWorkerErrors').add({
    ticketId: ticketId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    errorMessage: error.message,
    errorStack: error.stack,
    errorType: error.name
  });
}

/**
 * Notify admin of Ghost Worker error
 */
async function notifyAdminOfError(ticketId, error) {
  // Notify admin via Telegram
  try {
    await telegramBot.notifyError(ticketId, error.message || 'Unknown error');
    logger.info(`📱 Sent error notification to Telegram for ticket ${ticketId}`);
  } catch (telegramError) {
    logger.error(`Failed to send Telegram error notification: ${telegramError.message}`);
  }
}

/**
 * Estimate tokens (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on model and tokens
 */
function estimateCost(model, tokens) {
  const costPerMillion = CONFIG.costs[model] || 0;
  return (tokens / 1_000_000) * costPerMillion;
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Admin function to override Ghost Worker routing (for training)
 */
exports.overrideGhostWorkerRouting = require('firebase-functions/v2/https').onCall(
  {
    cors: true
  },
  async (request) => {
    verifyAdmin(request);
    
    const { ticketId, correctRoute, feedback } = request.data;
    
    if (!ticketId || !correctRoute) {
      throw new Error('Ticket ID and correct route are required');
    }
    
    const db = admin.firestore();
    
    // Find the Ghost Worker log for this ticket
    const logsRef = await db
      .collection('ghostWorkerLogs')
      .where('ticketId', '==', ticketId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    if (logsRef.empty) {
      throw new Error('No Ghost Worker log found for this ticket');
    }
    
    const logDoc = logsRef.docs[0];
    await logDoc.ref.update({
      humanOverride: true,
      correctRoute: correctRoute,
      feedbackProvided: true,
      feedback: feedback || '',
      overrideTimestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`✅ Admin override recorded for ticket ${ticketId}: ${correctRoute}`);
    
    return {
      success: true,
      message: 'Override recorded. Ghost Worker will learn from this.'
    };
  }
);

/**
 * Get Ghost Worker stats (for admin dashboard)
 */
exports.getGhostWorkerStats = require('firebase-functions/v2/https').onCall(
  {
    cors: true
  },
  async (request) => {
    verifyAdmin(request);
    
    const db = admin.firestore();
    
    // Get all logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logsRef = await db
      .collection('ghostWorkerLogs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    const stats = {
      totalProcessed: logsRef.size,
      routedToGeminiPro: 0,
      routedToClaudeSonnet: 0,
      averageConfidence: 0,
      responsesPosted: 0,
      humanOverrides: 0,
      totalCost: 0,
      averageCostPerTicket: 0
    };
    
    let confidenceSum = 0;
    
    logsRef.forEach(doc => {
      const data = doc.data();
      
      if (data.route === 'gemini-pro') stats.routedToGeminiPro++;
      if (data.route === 'claude-sonnet') stats.routedToClaudeSonnet++;
      if (data.responsePosted) stats.responsesPosted++;
      if (data.humanOverride) stats.humanOverrides++;
      
      confidenceSum += data.confidence || 0;
      stats.totalCost += data.totalCost || 0;
    });
    
    stats.averageConfidence = logsRef.size > 0 ? confidenceSum / logsRef.size : 0;
    stats.averageCostPerTicket = logsRef.size > 0 ? stats.totalCost / logsRef.size : 0;
    
    return {
      success: true,
      stats: stats,
      period: '30 days'
    };
  }
);

// ==================== TESTING FUNCTIONS ====================

/**
 * Manual trigger to test Ghost Worker on existing ticket
 * Use this to test on old tickets before going live
 */
exports.testGhostWorkerOnTicket = require('firebase-functions/v2/https').onCall(
  {
    cors: true,
    secrets: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY']
  },
  async (request) => {
    verifyAdmin(request);
    
    const { ticketId } = request.data;
    
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }
    
    logger.info(`🧪 TEST MODE: Running Ghost Worker on existing ticket: ${ticketId}`);
    
    try {
      const db = admin.firestore();
      
      // Get ticket data
      const ticketDoc = await db.collection('supportTickets').doc(ticketId).get();
      
      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }
      
      const ticketData = ticketDoc.data();
      
      // ===== STEP 1: TRIAGE =====
      logger.info(`🧠 TEST: Starting triage for ticket ${ticketId}...`);
      const triageStart = Date.now();
      
      const routingDecision = await triageTicket(ticketData, db);
      
      const triageDuration = Date.now() - triageStart;
      logger.info(`✅ TEST: Triage complete in ${triageDuration}ms`);
      logger.info(`   Route: ${routingDecision.route}`);
      logger.info(`   Confidence: ${routingDecision.confidence}%`);
      
      // ===== STEP 2: CHECK CONFIDENCE THRESHOLD =====
      const meetsThreshold = routingDecision.confidence >= CONFIG.routing.confidenceThreshold;
      
      // ===== STEP 3: ROUTE TO SPECIALIST =====
      logger.info(`🚀 TEST: Routing to ${routingDecision.route}...`);
      const executionStart = Date.now();
      
      let response;
      let executionModel;
      
      if (routingDecision.route === 'gemini-pro') {
        response = await processWithGeminiPro(ticketData, routingDecision, db);
        executionModel = CONFIG.models.geminiPro;
      } else {
        response = await processWithClaudeSonnet(ticketData, routingDecision, db);
        executionModel = CONFIG.models.claudeSonnet;
      }
      
      const executionDuration = Date.now() - executionStart;
      logger.info(`✅ TEST: Response generated in ${executionDuration}ms`);
      
      // ===== STEP 4: SAFETY CHECK =====
      const safetyIssues = checkSafetyRails(response.content);
      
      // ===== STEP 5: LOG TO TEST COLLECTION =====
      const testLog = {
        ticketId: ticketId,
        ticketNumber: ticketData.ticketNumber,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        mode: 'TEST',
        routingDecision: routingDecision,
        response: {
          content: response.content,
          model: executionModel,
          tokensUsed: response.tokensUsed
        },
        safetyIssues: safetyIssues,
        meetsThreshold: meetsThreshold,
        wouldHavePosted: CONFIG.routing.enableAutoResponse && meetsThreshold && safetyIssues.length === 0,
        triageDuration: triageDuration,
        executionDuration: executionDuration
      };
      
      await db.collection('ghostWorkerTests').add(testLog);
      
      // Also log to regular ai_worker_logs for cost tracking
      await logGhostWorkerDecision(
        ticketId,
        routingDecision,
        response,
        executionModel,
        false, // Never post in test mode
        db
      );
      
      logger.info(`✅ TEST: Completed for ticket ${ticketId}`);
      
      return {
        success: true,
        ticketId: ticketId,
        ticketNumber: ticketData.ticketNumber,
        routing: {
          route: routingDecision.route,
          confidence: routingDecision.confidence,
          reasoning: routingDecision.reasoning,
          meetsThreshold: meetsThreshold
        },
        response: {
          preview: response.content,  // Return full content, not truncated
          fullLength: response.content.length,
          model: executionModel
        },
        safety: {
          passed: safetyIssues.length === 0,
          issues: safetyIssues
        },
        performance: {
          triageDuration: `${triageDuration}ms`,
          executionDuration: `${executionDuration}ms`,
          totalDuration: `${triageDuration + executionDuration}ms`
        },
        wouldPost: testLog.wouldHavePosted,
        message: testLog.wouldHavePosted 
          ? 'Would have posted automatically in live mode'
          : 'Would have been flagged for review in live mode'
      };
      
    } catch (error) {
      logger.error(`❌ TEST: Error testing on ticket ${ticketId}:`, error);
      throw new Error(`Test failed: ${error.message}`);
    }
  }
);

// ==================== FEEDBACK ACKNOWLEDGMENT ====================

/**
 * Handle feedback acknowledgment (bug reports and suggestions)
 * This generates a personalized "Thank you" message for bug/suggestion submissions
 */
async function handleFeedbackAcknowledgment(feedbackId) {
  if (isGhostWorkerDisabled()) {
    return { success: false, disabled: true };
  }

  try {
    logger.info(`📝 Processing feedback acknowledgment: ${feedbackId}`);
    
    const db = admin.firestore();
    const feedbackRef = db.collection('feedback').doc(feedbackId);
    const feedbackDoc = await feedbackRef.get();
    
    if (!feedbackDoc.exists) {
      throw new Error('Feedback not found');
    }
    
    const feedbackData = feedbackDoc.data();
    const isBug = feedbackData.type === 'bug';
    
    logger.info(`   Type: ${feedbackData.type}`);
    logger.info(`   From: ${feedbackData.userEmail}`);
    
    // Build the prompt for Gemini Flash (fast and cheap for acknowledgments)
    const prompt = `You are Ghosty, the friendly AI assistant for The Pep Planner app.

A user just submitted a ${isBug ? 'bug report' : 'feature suggestion'} and needs a warm, personalized acknowledgment.

## USER'S ${isBug ? 'BUG REPORT' : 'SUGGESTION'}:
${feedbackData.message}

## YOUR TASK:
Write a friendly, concise acknowledgment message (2-3 sentences max) that:
1. Thanks them genuinely for taking the time to report this
2. Acknowledges the specific issue/idea they mentioned (show you read it!)
3. ${isBug ? 'Assures them the dev team will investigate' : 'Lets them know their idea will be reviewed'}
4. Keeps it warm but professional

## STYLE GUIDE:
- Be human and warm (not robotic)
- Use casual, friendly language
- NO corporate jargon or overly formal tone
- NO emojis unless they feel natural
- Keep it SHORT (2-3 sentences)
- Sound like a real person from the team

## EXAMPLE GOOD RESPONSES:

Bug report about data not saving:
"Thanks for flagging this! Data not saving is definitely frustrating, and I can see why that would be a problem. We're on it and will get this sorted out."

Suggestion for dark mode:
"Love this idea! Dark mode has been on our radar, and it's great to hear you're interested in it too. We'll definitely keep this in mind as we plan future updates."

Bug report about app crashing:
"Oof, crashes are the worst. Thanks for letting us know - we're digging into this right away to figure out what's going on."

Now write YOUR acknowledgment for the ${isBug ? 'bug report' : 'suggestion'} above:`;

    // Call Gemini Flash (fast and cheap)
    const rawAcknowledgment = await callGeminiFlash(prompt);

    const acknowledgmentMessage = (typeof rawAcknowledgment === 'string' ? rawAcknowledgment : rawAcknowledgment?.text || '').trim();
    
    logger.info(`✅ Generated acknowledgment: ${acknowledgmentMessage.substring(0, 100)}...`);
    
    // Log to ai_worker_logs for cost tracking
    await db.collection('ai_worker_logs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      feedbackId: feedbackId,
      type: 'feedback_acknowledgment',
      feedbackType: feedbackData.type,
      model: CONFIG.models.triage,
      inputTokens: prompt.length / 4, // Rough estimate
      outputTokens: acknowledgmentMessage.length / 4,
      cost: calculateCost(CONFIG.models.triage, prompt.length / 4, acknowledgmentMessage.length / 4),
      success: true
    });
    
    // Send Telegram notification to admin
    try {
      await telegramBot.sendFeedbackNotification({
        type: feedbackData.type,
        feedbackId: feedbackId,
        userEmail: feedbackData.userEmail,
        message: feedbackData.message,
        ghostyResponse: acknowledgmentMessage
      });
    } catch (telegramError) {
      logger.warn(`⚠️ Failed to send Telegram notification:`, telegramError.message);
    }
    
    return {
      success: true,
      message: acknowledgmentMessage
    };
    
  } catch (error) {
    logger.error(`❌ Error in feedback acknowledgment:`, error);
    throw error;
  }
}

// Export for use in index.js
exports.handleFeedbackAcknowledgment = handleFeedbackAcknowledgment;

// Export config for testing
exports.CONFIG = CONFIG;
