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
 * Provider: Anthropic Claude (claude-3-5-haiku for chat/prefill, claude-3-5-sonnet for stack analysis)
 * Secret:   ANTHROPIC_API_KEY stored in Firebase Secret Manager
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// ── Configurable defaults (all overridable via Firestore config doc) ──
const DEFAULTS = {
    DAILY_QUOTA:              25,
    RATE_LIMIT_CALLS:          5,
    RATE_LIMIT_WINDOW_SECS:   60,
    MONTHLY_TOKEN_CAP:        7500,
    GLOBAL_MONTHLY_REQ_CAP:  50000,
    MAX_PROMPT_CHARS:         2000,
};

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

/** Load configurable limits from Firestore (falls back to DEFAULTS). */
async function getAiLimits(db) {
    try {
        const snap = await db.collection('config').doc('aiCostLimits').get();
        if (snap.exists) {
            const d = snap.data();
            return {
                emergencyStop:        Boolean(d.emergencyStop),
                dailyQuota:           d.dailyQuota           ?? DEFAULTS.DAILY_QUOTA,
                rateLimitCalls:       d.rateLimitCalls       ?? DEFAULTS.RATE_LIMIT_CALLS,
                rateLimitWindowSecs:  d.rateLimitWindowSecs  ?? DEFAULTS.RATE_LIMIT_WINDOW_SECS,
                monthlyTokenCap:      d.monthlyTokenCap      ?? DEFAULTS.MONTHLY_TOKEN_CAP,
                globalMonthlyReqCap:  d.globalMonthlyReqCap  ?? DEFAULTS.GLOBAL_MONTHLY_REQ_CAP,
                maxPromptChars:       d.maxPromptChars       ?? DEFAULTS.MAX_PROMPT_CHARS,
            };
        }
    } catch { /* offline */ }
    return { ...DEFAULTS, emergencyStop: false };
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
    return { used: count + 1, remaining: limits.dailyQuota - (count + 1) };
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
        if (sub.tier && ['founder', 'research_plus'].includes(sub.tier)) return sub.tier;
    }

    throw new HttpsError('permission-denied', 'AI Research requires Research+ access.');
}

/** Run all guards. Returns quota info for the response. */
async function runAllGuards(uid, promptText) {
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const db = admin.firestore();
    const limits = await getAiLimits(db);
    await assertGlobalLimits(db, limits);
    await assertRateLimit(db, uid, limits);
    await assertTier(db, uid);
    const quota = await assertDailyQuota(db, uid, limits);
    const estimatedTokens = Math.ceil((promptText?.length || 0) / 4) + 100;
    const monthly = await assertMonthlyTokenCap(db, uid, limits, estimatedTokens);
    return { quota, monthly, limits };
}

/** Build system prompt for chat with optional user context. */
function buildChatSystemPrompt(userContext) {
    const lines = [
        'You are PiP, an AI research assistant embedded in the TPP Splendide peptide tracking app.',
        'You help users understand their peptide protocols, dosing schedules, reconstitution, and research information.',
        '',
        'RULES:',
        '- Provide research information only — NOT medical advice. Always include a brief disclaimer at the end.',
        '- Keep responses concise and well-formatted using markdown.',
        '- Be helpful, direct, and focused on what the user actually asked.',
        '- Never prescribe or recommend specific doses as treatment.',
        '- If the user asks about side effects, encourage them to log them in the app.',
    ];

    if (userContext) {
        const { protocols = [], stockpile = [], supplements = [] } = userContext;
        const activeProtocols = (Array.isArray(protocols) ? protocols : []).filter(p => p.active !== false);

        if (activeProtocols.length > 0) {
            lines.push('', 'USER\'S ACTIVE PROTOCOLS:');
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
            lines.push('', `USER SUPPLIES: ${supplies.length} tracked${lowStock.length > 0 ? `, ${lowStock.length} low on stock` : ', all stocked'}`);
        }

        const sups = Array.isArray(supplements) ? supplements : [];
        if (sups.length > 0) {
            lines.push('', `USER SUPPLEMENTS: ${sups.map(s => s.name).filter(Boolean).slice(0, 10).join(', ')}`);
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

exports.aiResearchChat = onCall({ cors: true, secrets: [ANTHROPIC_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    const { prompt, history = [], conversationId, userContext } = request.data || {};
    const clean = sanitizePrompt(prompt);
    if (!clean) throw new HttpsError('invalid-argument', 'Prompt is required.');

    const { quota } = await runAllGuards(uid, clean);
    logger.info('aiResearchChat', { uid, len: clean.length, quotaRemaining: quota.remaining });

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const systemPrompt = buildChatSystemPrompt(userContext);

    // Build conversation messages (last 10 turns for context)
    const messages = [];
    if (Array.isArray(history)) {
        history.slice(-10).forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({
                    role: msg.role,
                    content: String(msg.content || '').slice(0, 1500),
                });
            }
        });
    }
    messages.push({ role: 'user', content: clean });

    const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
    });

    const content = response.content[0]?.text || 'No response generated.';
    logger.info('aiResearchChat complete', { uid, outputLen: content.length });

    return {
        conversationId: conversationId || null,
        message: {
            role: 'assistant',
            content,
            citations: [],
            createdAt: new Date().toISOString(),
        },
        quotaRemaining: quota.remaining,
    };
});

exports.aiResearchPrefillProtocol = onCall({ cors: true, secrets: [ANTHROPIC_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    const { compound, goal } = request.data || {};
    if (!compound) throw new HttpsError('invalid-argument', 'Compound is required.');

    const { quota } = await runAllGuards(uid, compound + (goal || ''));
    logger.info('aiResearchPrefillProtocol', { uid, compound });

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const systemPrompt = `You are a peptide research data assistant. Given a compound name and optional goal, return a JSON object for a protocol template.
Return ONLY valid JSON — no markdown, no code blocks, no other text.

Required JSON format:
{
  "protocolName": "string max 48 chars",
  "purpose": "string max 120 chars describing the research goal",
  "notes": "2-4 sentence research summary covering typical use, considerations, and key notes",
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: `Compound: ${String(compound).slice(0, 100)}\nGoal: ${String(goal || 'general research').slice(0, 200)}`,
        }],
    });

    const rawText = response.content[0]?.text || '{}';
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

    const content = `Here's what the research suggests for **${compoundName}**:\n\n${parsed.notes || ''}${doseInfo}${titrationInfo}\n\nI've pre-filled a protocol — tap below to review and adjust before saving.\n\n_${buildDisclaimer()}_`;

    logger.info('aiResearchPrefillProtocol complete', { uid, compound: compoundName });

    return {
        prefill,
        content,
        disclaimer: buildDisclaimer(),
        quotaRemaining: quota.remaining,
    };
});

exports.aiResearchAnalyzeStack = onCall({ cors: true, secrets: [ANTHROPIC_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    const { protocols = [], supplements = [] } = request.data || {};

    const stackJson = JSON.stringify({ protocols, supplements }).slice(0, 1000);
    const { quota } = await runAllGuards(uid, stackJson);
    logger.info('aiResearchAnalyzeStack', { uid, protocols: protocols.length, supplements: supplements.length });

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const systemPrompt = `You are PiP, an AI research assistant for peptide protocol tracking. Analyze the user's active stack.

Return ONLY valid JSON — no markdown, no code blocks, no other text:
{
  "summary": "2-3 sentence overview of the stack covering what they are running and overall complexity",
  "flags": [{"level": "info|warning|error", "text": "specific observation or concern"}],
  "recommendations": ["concise actionable recommendation"]
}

Focus on: compound overlap/double-dosing, timing conflicts, stack complexity, missing dose data, and general safety considerations. Be specific and helpful.`;

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
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Analyze this stack:\n${JSON.stringify(stackData, null, 2)}` }],
    });

    const rawText = response.content[0]?.text || '{}';
    const parsed = parseJsonResponse(rawText, { summary: rawText, flags: [] });

    const flags = Array.isArray(parsed.flags) ? parsed.flags : [];
    if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
        flags.push(...parsed.recommendations.map(r => ({ level: 'info', text: String(r) })));
    }

    logger.info('aiResearchAnalyzeStack complete', { uid, flags: flags.length });

    return {
        summary: String(parsed.summary || 'Analysis completed.'),
        flags,
        disclaimer: buildDisclaimer(),
        quotaRemaining: quota.remaining,
    };
});
