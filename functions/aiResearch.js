/**
 * AI Research callable functions (Research+ Wave).
 *
 * Cost protection layers (server-side, source of truth):
 *   1. Emergency stop       — Firestore `config/aiCostLimits.emergencyStop: true`
 *   2. Global monthly cap   — `config/aiCostLimits.globalMonthlyRequestCap` (default 50 000)
 *   3. Per-user rate limit  — Max N calls per 60 s per user.
 *   4. Per-user daily quota — Max 25 calls/day.
 *   5. Per-user monthly cap — Max 7 500 estimated tokens / month per user.
 *
 * Provider: Anthropic Claude (Haiku 4.5 for chat/prefill, Sonnet 4.5 for stack analysis)
 * Secret:   ANTHROPIC_API_KEY stored in Firebase Secret Manager
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY_pip');

// Anthropic client — created once per warm container, not on every request
let _anthropicClient = null;
function getAnthropicClient() {
    if (!_anthropicClient) {
        const Anthropic = require('@anthropic-ai/sdk');
        _anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    }
    return _anthropicClient;
}

// In-memory config cache — avoids a Firestore read on every chat request
let _cachedLimits = null;
let _limitsExpiry = 0;

// ── Configurable defaults (all overridable via Firestore config doc) ──
const DEFAULTS = {
    DAILY_QUOTA:              25,
    RATE_LIMIT_CALLS:          5,
    RATE_LIMIT_WINDOW_SECS:   60,
    MONTHLY_TOKEN_CAP:        7500,
    GLOBAL_MONTHLY_REQ_CAP:  50000,
    MAX_PROMPT_CHARS:         2000,
};

/** Firestore config can store numbers as strings; bad values must not become NaN. */
function coalescePositiveInt(val, fallback) {
    const n = parseInt(String(val), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Claude model IDs — use aliases so dated snapshots don’t break when Anthropic rotates IDs. */
const CLAUDE_HAIKU = 'claude-haiku-4-5';
const CLAUDE_SONNET_STACK = 'claude-sonnet-4-5-20250929';

function firstTextFromClaudeMessage(response) {
    const blocks = response?.content;
    if (!Array.isArray(blocks)) return 'No response generated.';
    const textBlock = blocks.find((b) => b && b.type === 'text' && typeof b.text === 'string');
    return textBlock?.text || 'No response generated.';
}

const PII_PATTERNS = [
    { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, replacement: '[email]' },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[redacted]' },
    { pattern: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, replacement: '[phone]' },
];

// ── Helpers ─────────────────────────────────────────────────────────

function sanitizePrompt(text, maxChars) {
    if (!text || typeof text !== 'string') return '';
    let result = text.slice(0, maxChars || DEFAULTS.MAX_PROMPT_CHARS);
    PII_PATTERNS.forEach(({ pattern, replacement }) => {
        result = result.replace(pattern, replacement);
    });
    return result;
}

function buildDisclaimer() {
    return 'Informational only — not medical advice. Always verify with primary sources.';
}

/** Strip internal/dev app names from user-facing PiP output. */
function sanitizePipBranding(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/\bTPP\s+Splendide\b/gi, 'The Pep Planner')
        .replace(/\bSplendide\b/gi, 'The Pep Planner');
}

/** Shared branding + in-app navigation rules for all PiP prompts. */
const PIP_APP_CONTEXT = [
    '## APP CONTEXT',
    'You live inside **The Pep Planner** — a peptide protocol tracking app.',
    'NEVER say "TPP Splendide", "Splendide", or any variant. The app name is **The Pep Planner** only.',
    'For support tickets: direct users to **Settings → Support** in the app (or Support in the sidebar). You cannot submit tickets yourself.',
    'For account/billing issues: same — Settings → Support. Stay in your lane for peptide research questions.',
].join('\n');

/** Load configurable limits from Firestore (falls back to DEFAULTS). */
async function getAiLimits(db) {
    // Serve from in-memory cache for up to 60 seconds — avoids a Firestore read on every request
    const now = Date.now();
    if (_cachedLimits && now < _limitsExpiry) return _cachedLimits;

    try {
        const snap = await db.collection('config').doc('aiCostLimits').get();
        if (snap.exists) {
            const d = snap.data();
            _cachedLimits = {
                emergencyStop:        Boolean(d.emergencyStop),
                dailyQuota:           coalescePositiveInt(d.dailyQuota, DEFAULTS.DAILY_QUOTA),
                rateLimitCalls:       coalescePositiveInt(d.rateLimitCalls, DEFAULTS.RATE_LIMIT_CALLS),
                rateLimitWindowSecs:  coalescePositiveInt(d.rateLimitWindowSecs, DEFAULTS.RATE_LIMIT_WINDOW_SECS),
                monthlyTokenCap:      coalescePositiveInt(d.monthlyTokenCap, DEFAULTS.MONTHLY_TOKEN_CAP),
                globalMonthlyReqCap:  coalescePositiveInt(d.globalMonthlyReqCap, DEFAULTS.GLOBAL_MONTHLY_REQ_CAP),
                maxPromptChars:       coalescePositiveInt(d.maxPromptChars, DEFAULTS.MAX_PROMPT_CHARS),
            };
            _limitsExpiry = now + 60_000;
            return _cachedLimits;
        }
    } catch { /* offline */ }
    return {
        emergencyStop:       false,
        dailyQuota:          DEFAULTS.DAILY_QUOTA,
        rateLimitCalls:      DEFAULTS.RATE_LIMIT_CALLS,
        rateLimitWindowSecs: DEFAULTS.RATE_LIMIT_WINDOW_SECS,
        monthlyTokenCap:     DEFAULTS.MONTHLY_TOKEN_CAP,
        globalMonthlyReqCap: DEFAULTS.GLOBAL_MONTHLY_REQ_CAP,
        maxPromptChars:      DEFAULTS.MAX_PROMPT_CHARS,
    };
}

/** Check emergency stop + global monthly cap. */
async function assertGlobalLimits(db, limits) {
    if (limits.emergencyStop) {
        throw new HttpsError('unavailable', 'AI Research is temporarily unavailable. Please try again later.');
    }
    const monthKey = new Date().toISOString().slice(0, 7);
    const globalRef = db.collection('aiGlobalStats').doc(monthKey);
    const snap = await globalRef.get();
    const count = snap.exists ? (snap.data().totalCalls || 0) : 0;
    if (count >= limits.globalMonthlyReqCap) {
        throw new HttpsError('resource-exhausted', 'Global AI monthly capacity reached. Try again next month.');
    }
    await globalRef.set({
        month: monthKey,
        totalCalls: admin.firestore.FieldValue.increment(1),
        lastAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

/** Per-user rate limit: N calls per window. */
async function assertRateLimit(db, uid, limits) {
    const ref = db.collection('aiRateLimit').doc(uid);
    const snap = await ref.get();
    const now = Date.now();
    const windowMs = limits.rateLimitWindowSecs * 1000;

    if (snap.exists) {
        const d = snap.data();
        const windowStart = d.windowStart ? d.windowStart.toMillis() : 0;
        if (now - windowStart < windowMs) {
            const calls = d.calls || 0;
            if (calls >= limits.rateLimitCalls) {
                const waitSec = Math.ceil((windowMs - (now - windowStart)) / 1000);
                throw new HttpsError('resource-exhausted', `Rate limit reached. Please wait ${waitSec}s.`);
            }
            await ref.update({ calls: admin.firestore.FieldValue.increment(1) });
            return;
        }
    }
    await ref.set({ uid, windowStart: admin.firestore.Timestamp.fromMillis(now), calls: 1 }, { merge: true });
}

/** Per-user daily quota. */
async function assertDailyQuota(db, uid, limits) {
    const today = new Date().toISOString().slice(0, 10);
    const ref = db.collection('aiQuota').doc(`${uid}_${today}`);
    const snap = await ref.get();
    const count = snap.exists ? (snap.data().count || 0) : 0;
    if (count >= limits.dailyQuota) {
        throw new HttpsError('resource-exhausted', `Daily AI quota (${limits.dailyQuota} requests) reached. Resets tomorrow.`);
    }
    await ref.set({ uid, date: today, count: count + 1, lastAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { used: count + 1, remaining: Math.max(0, limits.dailyQuota - (count + 1)) };
}

/** Per-user monthly estimated-token cap. */
async function assertMonthlyTokenCap(db, uid, limits, estimatedTokens) {
    const monthKey = new Date().toISOString().slice(0, 7);
    const ref = db.collection('aiMonthlyUsage').doc(`${uid}_${monthKey}`);
    const snap = await ref.get();
    const used = snap.exists ? (snap.data().estimatedTokens || 0) : 0;
    if (used + estimatedTokens > limits.monthlyTokenCap) {
        throw new HttpsError('resource-exhausted', `Monthly AI token budget reached.`);
    }
    await ref.set({
        uid,
        month: monthKey,
        estimatedTokens: admin.firestore.FieldValue.increment(estimatedTokens),
        calls: admin.firestore.FieldValue.increment(1),
        lastAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { usedTokens: used + estimatedTokens, remainingTokens: limits.monthlyTokenCap - used - estimatedTokens };
}

/** Verify user tier (Research+ / founder) across all access sources. */
async function assertTier(db, uid) {
    // Check all sources in parallel — mirrors client-side loadUserSubscription logic
    const [userSnap, lifetimeSnap, subSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('lifetimeAccess').doc(uid).get(),
        db.collection('userSubscriptions').doc(uid).get(),
    ]);

    // 1. Explicit tier field on users doc
    const user = userSnap.exists ? (userSnap.data() || {}) : {};
    if (user.tier && ['founder', 'research_plus'].includes(user.tier)) return user.tier;

    // 2. isFounder flag on users doc
    if (user.isFounder === true) return 'founder';

    // 3. Subscription nested in users doc
    const userSub = user.subscription || {};
    if (userSub.hasLifetimeAccess || userSub.plan === 'lifetime' || userSub.interval === 'lifetime') return 'founder';

    // 4. lifetimeAccess collection
    if (lifetimeSnap.exists) {
        const la = lifetimeSnap.data() || {};
        if (la.hasLifetimeAccess && la.status !== 'revoked') return 'founder';
    }

    // 5. userSubscriptions collection
    if (subSnap.exists) {
        const sub = (subSnap.data() || {}).subscription || subSnap.data() || {};
        if (sub.hasLifetimeAccess || sub.plan === 'lifetime' || sub.interval === 'lifetime') return 'founder';
        if (sub.tier && ['founder', 'research_plus'].includes(sub.tier)) {
            // Guard against tier drift: verify the subscription is still active.
            // Statuses that lose access even with a paid tier stamp.
            const expiredStatuses = ['canceled', 'expired', 'refunded', 'revoked', 'on_hold', 'paused', 'disputed'];
            if (expiredStatuses.includes(sub.status)) {
                // Allow if cancel_at_period_end and still within the paid window
                const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
                const stillInWindow = periodEnd && periodEnd.getTime() > Date.now();
                if (!stillInWindow) {
                    throw new HttpsError('permission-denied', 'AI Research requires an active Research+ subscription.');
                }
            }
            return sub.tier;
        }
    }

    throw new HttpsError('permission-denied', 'AI Research requires Research+ access.');
}

/** Run all guards. Returns quota info for the response. */
async function runAllGuards(uid, promptText) {
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const db = admin.firestore();
    const limits = await getAiLimits(db); // cached after first call

    // Run independent checks in parallel — cuts ~400-800ms off every request
    await Promise.all([
        assertGlobalLimits(db, limits),
        assertRateLimit(db, uid, limits),
        assertTier(db, uid),
    ]);

    const quota = await assertDailyQuota(db, uid, limits);
    const estimatedTokens = Math.ceil((promptText?.length || 0) / 4) + 100;
    const monthly = await assertMonthlyTokenCap(db, uid, limits, estimatedTokens);
    return { quota, monthly, limits };
}

/** Build system prompt for chat with optional user context. */
function buildChatSystemPrompt(userContext) {
    const lines = [
        'You are PiP — the AI research assistant inside The Pep Planner.',
        '',
        PIP_APP_CONTEXT,
        '',
        '## WHO YOU ARE',
        'PiP stands for two things: Post-Injection Pain (the thing nobody wants) and Peptide Planner (the thing that helps avoid it). You are self-aware about this irony and it is part of your charm.',
        'You are knowledgeable, direct, and have a dry wit. You are NOT corporate, NOT preachy, and NOT a disclaimer machine.',
        'Think: a trusted friend who happens to have deep peptide research knowledge — not a liability-scared chatbot.',
        '',
        '## TONE & STYLE',
        '- Conversational and confident. Witty where appropriate, never forced.',
        '- Use emojis to label sections and accent key points — they replace markdown headers (## / ###). Never use ## or ### headings.',
        '- Use **bold** for compound names, key terms, and important numbers.',
        '- Use bullet points for lists. Use paragraphs for explanations.',
        '- Never repeat the compound name more than once per response.',
        '- Never open with "Great question!" or "Certainly!" or any filler.',
        '- Never write walls of text. Break things up. Get to the point.',
        '- Example section label style: "🧬 How it works" or "💉 Protocol" or "🔗 Best stacks" — not "## HOW IT WORKS".',
        '',
        '## KNOWLEDGE SCOPE',
        'You specialize in: peptides, GH secretagogues, GLP-1 agonists, longevity compounds, reconstitution math, stack synergies, receptor conflicts, timing protocols, and side effect pattern recognition.',
        'You can discuss dosing ranges, mechanisms of action, half-lives, stacking strategies, washout periods, and research context.',
        'You are NOT a diagnostician. You do NOT tell users to "consult a doctor" on every message — they know. Add a brief disclaimer ONCE at the end of research-heavy responses, not repeatedly.',
        '',
        '## PRESCRIPTION MEDICATION INTERACTIONS — HARD RULE (no exceptions)',
        'You have NO verified, reliable database of prescription drug interactions. You must NEVER state, imply, or suggest that a peptide/compound "has no interaction with," "is safe to combine with," "won\'t conflict with," or "is fine alongside" ANY prescription medication or medication class — including SSRIs, SNRIs, MAOIs, benzodiazepines, antipsychotics, blood thinners/anticoagulants, beta blockers, thyroid medication, hormonal birth control, HRT, or anything else a user names.',
        'This applies even if your training data suggests a combination is commonly considered safe or low-risk. You do not have the authority or verified data to make that call — do not guess, hedge into an implied answer, or soften a "no" into a "probably fine."',
        'If a user mentions ANY prescription medication (by name, class, or "I\'m on X for Y") in connection with a peptide/compound question, respond ONLY that this needs to be verified with their prescribing doctor or pharmacist first — do not speculate on safety in either direction, and do not proceed to answer the interaction question.',
        'You CAN still discuss the peptide itself (mechanism, dosing, general side effects) — just never bridge that into a medication-safety verdict.',
        '',
        '## RESPONSE RULES',
        '- Answer what was actually asked. Do not pad with unnecessary context.',
        '- For "tell me about X" questions: cover mechanism, typical use, protocol notes, best stacks, and side effects to watch — concisely.',
        '- For stack/synergy questions: explain WHY compounds work together (receptor class, mechanism), not just that they do.',
        '- For recon math: show the actual numbers. Users want the calculation, not a paragraph.',
        '- If a user logs or mentions a side effect, acknowledge it and suggest logging it in the app if they haven\'t.',
        '- Stay on topic. If asked something unrelated to peptides/research/protocols, redirect briefly and stay in your lane.',
        '- Never fabricate citations or studies. If you\'re not certain, say so clearly.',
    ];

    if (userContext) {
        const { protocols = [], stockpile = [], supplements = [] } = userContext;
        const activeProtocols = (Array.isArray(protocols) ? protocols : []).filter(p => p.active !== false);

        if (activeProtocols.length > 0) {
            lines.push('', '## USER\'S ACTIVE PROTOCOLS (personalize responses to these when relevant)');
            activeProtocols.slice(0, 10).forEach(p => {
                const peptides = (p.peptides || []).map(pep => {
                    const dose = pep.dosage ? `${pep.dosage.amount} ${pep.dosage.unit}` : 'dose not set';
                    return `${pep.name || 'unnamed'} (${dose})`;
                }).join(', ');
                lines.push(`- ${p.name || 'Unnamed protocol'}: ${peptides || 'no compounds listed'}`);
            });
        }

        const supplies = (Array.isArray(stockpile) ? stockpile : []).filter(s => s.type === 'supply');
        if (supplies.length > 0) {
            const lowStock = supplies.filter(s => (s.quantity || 0) <= (s.lowStockAlert || 3));
            lines.push('', `## USER SUPPLIES\n${supplies.length} compounds tracked${lowStock.length > 0 ? `. ⚠️ ${lowStock.length} running low` : ' — all stocked'}`);
        }

        const sups = Array.isArray(supplements) ? supplements : [];
        if (sups.length > 0) {
            lines.push('', `## USER SUPPLEMENTS\n${sups.map(s => s.name).filter(Boolean).slice(0, 10).join(', ')}`);
        }
    }

    return lines.join('\n');
}

/** Parse JSON from Claude response, with fallback extraction. */
function parseJsonResponse(rawText, fallback = {}) {
    try { return JSON.parse(rawText); } catch { /* try extraction */ }
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
        try { return JSON.parse(match[0]); } catch { /* use fallback */ }
    }
    return fallback;
}

// ── Callable functions ────────────────────────────────────────────

exports.aiResearchChat = onCall({ cors: true, secrets: [ANTHROPIC_API_KEY], minInstances: 1 }, async (request) => {
    const uid = request.auth?.uid;
    try {
        const { prompt, history = [], conversationId, userContext } = request.data || {};
        const clean = sanitizePrompt(prompt);
        if (!clean) throw new HttpsError('invalid-argument', 'Prompt is required.');

        const { quota } = await runAllGuards(uid, clean);
        const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;
        logger.info('aiResearchChat', { uid, len: clean.length, quotaRemaining: quotaRem });

        const client = getAnthropicClient();
        const systemPrompt = buildChatSystemPrompt(userContext);

        const messages = [];
        if (Array.isArray(history)) {
            history.slice(-6).forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({
                        role: msg.role,
                        content: String(msg.content || '').slice(0, 1200),
                    });
                }
            });
        }
        messages.push({ role: 'user', content: clean });

        const response = await client.messages.create({
            model: CLAUDE_HAIKU,
            max_tokens: 800,
            system: systemPrompt,
            messages,
        });

        const content = sanitizePipBranding(firstTextFromClaudeMessage(response));
        logger.info('aiResearchChat complete', { uid, outputLen: content.length });

        return {
            conversationId: conversationId || null,
            message: {
                role: 'assistant',
                content,
                citations: [],
                createdAt: new Date().toISOString(),
            },
            quotaRemaining: quotaRem,
        };
    } catch (e) {
        if (e instanceof HttpsError) throw e;
        logger.error('aiResearchChat failed', { uid: uid || null, err: e?.message || String(e) });
        throw new HttpsError('internal', 'PiP could not complete this request.');
    }
});

/**
 * Streaming chat endpoint (SSE). Tokens appear in the client as Claude generates them,
 * eliminating the "staring at thinking bubble" wait. Uses HTTP so we can stream the response body.
 */
exports.aiResearchChatStream = onRequest({ secrets: [ANTHROPIC_API_KEY], minInstances: 1, cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // Verify Firebase ID token
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    let uid;
    try {
        const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
        uid = decoded.uid;
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    const { prompt, history = [], conversationId, userContext } = req.body || {};
    const clean = sanitizePrompt(prompt);
    if (!clean) {
        res.status(400).json({ error: 'Prompt required' });
        return;
    }

    // Run guards — same cost-control as the callable version
    let quota;
    try {
        const guards = await runAllGuards(uid, clean);
        quota = guards.quota;
    } catch (e) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource')) {
            res.status(200).json({ error: 'QUOTA_EXHAUSTED' });
        } else {
            res.status(429).json({ error: msg || 'Rate limit reached' });
        }
        return;
    }

    // Switch to SSE
    res.set('Content-Type', 'text/event-stream');
    res.set('Cache-Control', 'no-cache');
    res.set('Connection', 'keep-alive');

    const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        const client = getAnthropicClient();
        const systemPrompt = buildChatSystemPrompt(userContext);

        const messages = [];
        if (Array.isArray(history)) {
            history.slice(-6).forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: String(msg.content || '').slice(0, 1200) });
                }
            });
        }
        messages.push({ role: 'user', content: clean });

        const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;
        logger.info('aiResearchChatStream', { uid, len: clean.length, quotaRemaining: quotaRem });

        const stream = client.messages.stream({
            model: CLAUDE_HAIKU,
            max_tokens: 800,
            system: systemPrompt,
            messages,
        });

        let fullContent = '';
        stream.on('text', (text) => {
            const token = sanitizePipBranding(text);
            fullContent += token;
            sendEvent({ type: 'token', token });
        });

        await stream.finalMessage();

        sendEvent({ type: 'done', quotaRemaining: quotaRem, conversationId: conversationId || null });
        res.end();
        logger.info('aiResearchChatStream complete', { uid, contentLen: fullContent.length });
    } catch (e) {
        logger.error('aiResearchChatStream failed', { uid, err: e?.message || String(e) });
        sendEvent({ type: 'error', message: 'PiP hit a snag. Try again in a moment.' });
        res.end();
    }
});

exports.aiResearchPrefillProtocol = onCall({ cors: true, secrets: [ANTHROPIC_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    const { compound, goal } = request.data || {};
    if (!compound) throw new HttpsError('invalid-argument', 'Compound is required.');

    const { quota } = await runAllGuards(uid, compound + (goal || ''));
    logger.info('aiResearchPrefillProtocol', { uid, compound });

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const systemPrompt = `You are PiP, the research assistant inside The Pep Planner. You are generating a protocol template prefill for a user.
Never say "TPP Splendide" or "Splendide" — the app is The Pep Planner only.
Return ONLY valid JSON — no markdown, no code blocks, no other text. Be accurate and concise. Use real-world research dosing ranges.

HARD RULE: Never state or imply that this compound is safe with, or has no interaction with, any prescription medication. You have no verified interaction data for prescription drugs — do not mention medication safety at all in the notes.

The "notes" field should be 2-3 sentences written in PiP's voice: direct, informed, slightly witty — not corporate. Cover what the compound does, key protocol considerations, and one practical note.

Required JSON format:
{
  "protocolName": "string max 48 chars",
  "purpose": "string max 120 chars describing the research goal",
  "notes": "2-3 sentence research summary in PiP's voice — direct and practical",
  "doseRange": "string like '250-500 mcg' or '2-5 mg'",
  "typicalDose": "numeric string like '250' or '2.5'",
  "unit": "mcg or mg",
  "frequencyType": "daily | twice_daily | twice_weekly | weekly | as_needed",
  "frequencyTimes": ["AM"] or ["PM"] or ["AM","PM"] as appropriate,
  "durationWeeks": "numeric string like '4' or '12'",
  "halfLifeValue": "numeric string like '4' or '3'",
  "halfLifeUnit": "hours or days",
  "deliveryMethod": "pipette or pen or oral",
  "titration": [] or array of {"label": "string", "dose": "string", "durationDays": "string"}
}`;

    const response = await client.messages.create({
        model: CLAUDE_HAIKU,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: `Compound: ${String(compound).slice(0, 100)}\nGoal: ${String(goal || 'general research').slice(0, 200)}`,
        }],
    });

    const rawText = firstTextFromClaudeMessage(response) || '{}';
    const parsed = parseJsonResponse(rawText, {});

    const compoundName = String(parsed.protocolName || compound).slice(0, 48);

    const prefill = {
        protocolName: compoundName,
        purpose: String(parsed.purpose || goal || `Research protocol for ${compound}`).slice(0, 120),
        notes: parsed.notes || `Research protocol for ${compound}. Verify dosing against primary literature.`,
    };

    if (parsed.durationWeeks) {
        prefill.duration = { count: String(parsed.durationWeeks), unit: 'weeks', noEnd: false };
    }

    if (parsed.typicalDose && parsed.unit) {
        const times = Array.isArray(parsed.frequencyTimes) && parsed.frequencyTimes.length
            ? parsed.frequencyTimes : ['AM'];
        prefill.peptides = [{
            id: `prefill_${Date.now()}`,
            name: compoundName,
            dosage: { amount: String(parsed.typicalDose), unit: String(parsed.unit) },
            frequency: {
                type: parsed.frequencyType || 'daily',
                time: times,
            },
            deliveryMethod: parsed.deliveryMethod || 'pipette',
            halfLife: parsed.halfLifeValue
                ? { value: String(parsed.halfLifeValue), unit: parsed.halfLifeUnit || 'hours' }
                : undefined,
            titration: Array.isArray(parsed.titration) && parsed.titration.length > 0
                ? parsed.titration : undefined,
        }];
    }

    // Build human-readable content for the chat message
    const doseInfo = parsed.doseRange
        ? `\n\n**Dose range:** ${parsed.doseRange}${parsed.typicalDose ? `\n**Typical dose:** ${parsed.typicalDose} ${parsed.unit || ''}` : ''}${parsed.durationWeeks ? `\n**Cycle length:** ${parsed.durationWeeks} weeks` : ''}`
        : '';

    const titrationInfo = Array.isArray(parsed.titration) && parsed.titration.length > 0
        ? `\n\n**Titration:** ${parsed.titration.map(t => `${t.label} — ${t.dose} × ${t.durationDays}d`).join(' → ')}`
        : '';

    const content = sanitizePipBranding(`Here's what the research suggests for **${compoundName}**:\n\n${parsed.notes || ''}${doseInfo}${titrationInfo}\n\nI've pre-filled a protocol — tap below to review and adjust before saving.\n\n_${buildDisclaimer()}_`);

    logger.info('aiResearchPrefillProtocol complete', { uid, compound: compoundName });

    const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;
    return {
        prefill,
        content,
        disclaimer: buildDisclaimer(),
        quotaRemaining: quotaRem,
    };
});

exports.aiResearchAnalyzeStack = onCall({ cors: true, secrets: [ANTHROPIC_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    const { protocols = [], supplements = [], preComputedFlags } = request.data || {};

    const stackJson = JSON.stringify({ protocols, supplements, preComputedFlags }).slice(0, 2000);
    const { quota } = await runAllGuards(uid, stackJson);
    logger.info('aiResearchAnalyzeStack', {
        uid,
        protocols: protocols.length,
        supplements: supplements.length,
        hybrid: Boolean(preComputedFlags?.sections?.length),
    });

    const client = getAnthropicClient();
    const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;

    // Hybrid mode: local rules already computed sections — Claude enriches narrative only.
    if (preComputedFlags?.sections?.length) {
        const localSections = preComputedFlags.sections.slice(0, 12).map((s) => ({
            type: String(s.type || 'note').slice(0, 32),
            title: String(s.title || '').slice(0, 120),
            body: String(s.body || '').slice(0, 800),
            level: s.level || 'info',
        }));

        const systemPrompt = `You are PiP — the peptide research assistant inside The Pep Planner.
Never say "TPP Splendide" or "Splendide" in any user-facing text.

The app's local stack engine already detected conflicts, synergies, and suggestions. Your job is NOT to re-detect — only rewrite the narrative in PiP's voice: direct, informed, slightly witty, never corporate.

Return ONLY valid JSON — no markdown fences:
{
  "summary": "2-3 sentence overview in PiP voice",
  "sections": [
    { "type": "synergy|overlap|caution|timing|suggestion|followup|note", "title": "same or improved title", "body": "richer PiP-voice prose — keep facts, improve readability" }
  ]
}

Rules:
- Keep the same number of sections and preserve each section's type and meaning.
- Do NOT invent new conflicts or remove real ones from the input.
- Use **bold** for compound names. No ## headings.
- Be concise but helpful.
- HARD RULE: This analysis is peptide/supplement-only — never state or imply a compound is safe with, or has no interaction with, any prescription medication (SSRIs, blood thinners, etc.), even if one is mentioned in the input. You have no verified interaction data for prescription drugs.`;

        const userPayload = {
            localSummary: preComputedFlags.summary || '',
            sections: localSections,
            stackOverview: {
                protocols: (Array.isArray(protocols) ? protocols : []).slice(0, 10).map((p) => ({
                    name: p.name || 'Unnamed',
                    active: p.active,
                    peptides: (p.peptides || []).slice(0, 8).map((pep) => ({
                        name: pep.name,
                        dose: pep.dosage ? `${pep.dosage.amount} ${pep.dosage.unit}` : 'not set',
                    })),
                })),
                supplements: (Array.isArray(supplements) ? supplements : []).slice(0, 10).map((s) => ({
                    name: s.name,
                    dose: s.dose ? `${s.dose} ${s.unit || ''}`.trim() : 'not set',
                })),
            },
        };

        const response = await client.messages.create({
            model: CLAUDE_SONNET_STACK,
            max_tokens: 1400,
            system: systemPrompt,
            messages: [{ role: 'user', content: JSON.stringify(userPayload) }],
        });

        const rawText = firstTextFromClaudeMessage(response) || '{}';
        const parsed = parseJsonResponse(rawText, {});

        const enrichedSections = Array.isArray(parsed.sections) && parsed.sections.length > 0
            ? parsed.sections.map((s, i) => ({
                type: s.type || localSections[i]?.type || 'note',
                title: String(s.title || localSections[i]?.title || 'Note').slice(0, 120),
                body: String(s.body || localSections[i]?.body || '').slice(0, 1200),
                level: localSections[i]?.level || s.level || 'info',
            }))
            : localSections;

        logger.info('aiResearchAnalyzeStack hybrid complete', { uid, sections: enrichedSections.length });

        return {
            summary: sanitizePipBranding(String(parsed.summary || preComputedFlags.summary || 'Analysis completed.')),
            sections: enrichedSections.map((s) => ({
                ...s,
                body: sanitizePipBranding(s.body),
                title: sanitizePipBranding(s.title),
            })),
            disclaimer: buildDisclaimer(),
            quotaRemaining: quotaRem,
        };
    }

    // Legacy full-analysis mode (no pre-computed flags)
    const systemPrompt = `You are PiP, an AI research assistant for peptide protocol tracking. Analyze the user's active stack.

Return ONLY valid JSON — no markdown, no code blocks, no other text:
{
  "summary": "2-3 sentence overview of the stack covering what they are running and overall complexity",
  "flags": [{"level": "info|warning|error", "text": "specific observation or concern"}],
  "recommendations": ["concise actionable recommendation"]
}

Focus on: compound overlap/double-dosing, timing conflicts, stack complexity, missing dose data, and general safety considerations. Be specific and helpful.

HARD RULE: This analysis is peptide/supplement-only — never state or imply that a compound is safe with, or has no interaction with, any prescription medication (SSRIs, blood thinners, etc.). You have no verified interaction data for prescription drugs and must not speculate on it in either direction.`;

    const stackData = {
        protocols: (Array.isArray(protocols) ? protocols : []).slice(0, 20).map(p => ({
            name: p.name || 'Unnamed',
            active: p.active,
            startDate: p.startDate,
            duration: p.duration,
            peptides: (p.peptides || []).slice(0, 10).map(pep => ({
                name: pep.name,
                dose: pep.dosage ? `${pep.dosage.amount} ${pep.dosage.unit}` : 'not set',
                frequency: pep.frequency?.type || 'daily',
                times: pep.frequency?.time,
                halfLife: pep.halfLife,
            })),
        })),
        supplements: (Array.isArray(supplements) ? supplements : []).slice(0, 20).map(s => ({
            name: s.name,
            dose: s.dose ? `${s.dose} ${s.unit || ''}`.trim() : 'not set',
            delivery: s.delivery,
            timing: s.timing,
        })),
    };

    const response = await client.messages.create({
        model: CLAUDE_SONNET_STACK,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Analyze this stack:\n${JSON.stringify(stackData, null, 2)}` }],
    });

    const rawText = firstTextFromClaudeMessage(response) || '{}';
    const parsed = parseJsonResponse(rawText, { summary: rawText, flags: [] });

    const flags = Array.isArray(parsed.flags) ? parsed.flags : [];
    if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
        flags.push(...parsed.recommendations.map(r => ({ level: 'info', text: String(r) })));
    }

    logger.info('aiResearchAnalyzeStack complete', { uid, flags: flags.length });

    return {
        summary: sanitizePipBranding(String(parsed.summary || 'Analysis completed.')),
        flags: flags.map((f) => ({ ...f, text: sanitizePipBranding(String(f.text || '')) })),
        disclaimer: buildDisclaimer(),
        quotaRemaining: quotaRem,
    };
});

// Shared helpers for pipGemini.js
exports.runAllGuards = runAllGuards;
exports.sanitizePrompt = sanitizePrompt;
exports.buildChatSystemPrompt = buildChatSystemPrompt;
exports.buildDisclaimer = buildDisclaimer;
exports.sanitizePipBranding = sanitizePipBranding;
exports.parseJsonResponse = parseJsonResponse;
