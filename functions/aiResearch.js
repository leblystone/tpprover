/**
 * AI Research callable functions (Research+ Wave).
 *
 * Cost protection layers (server-side, source of truth):
 *   1. Emergency stop       — Firestore `config/aiCostLimits.emergencyStop: true`
 *                             Instantly halts all AI calls globally. Kill switch in admin.
 *   2. Global monthly cap   — `config/aiCostLimits.globalMonthlyRequestCap` (default 50 000)
 *                             Counts across all users. Blows up Firestore `aiGlobalStats/{YYYY-MM}`.
 *   3. Per-user rate limit  — Max N calls per 60 s per user. Stored in `aiRateLimit/{uid}`.
 *                             Prevents runaway scripts / looping UI bugs from burning money.
 *   4. Per-user daily quota — Max 25 calls/day. Stored in `aiQuota/{uid}_{date}`.
 *   5. Per-user monthly cap — Max 750 estimated tokens / month per user (configurable).
 *                             Tracked in `aiMonthlyUsage/{uid}_{YYYY-MM}`.
 *
 * Provider wiring (OpenAI, Anthropic, etc.) drops in as a one-liner swap
 * inside the TODO blocks once the vendor is chosen. The stubs already
 * return the exact shape the client expects.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

// ── Configurable defaults (all overridable via Firestore config doc) ──
const DEFAULTS = {
    DAILY_QUOTA:              25,
    RATE_LIMIT_CALLS:          5,    // max N calls per window
    RATE_LIMIT_WINDOW_SECS:   60,    // rolling window (seconds)
    MONTHLY_TOKEN_CAP:       7500,   // estimated tokens / user / month
    GLOBAL_MONTHLY_REQ_CAP: 50000,   // total calls across all users / month
    MAX_PROMPT_CHARS:        2000,
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
    return 'This is an AI research assistant. Output is informational only and not medical advice. Always verify with primary sources.';
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
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const globalRef = db.collection('aiGlobalStats').doc(monthKey);
    const snap = await globalRef.get();
    const count = snap.exists ? (snap.data().totalCalls || 0) : 0;
    if (count >= limits.globalMonthlyReqCap) {
        throw new HttpsError('resource-exhausted', 'Global AI monthly capacity reached. Try again next month.');
    }
    // Increment global counter.
    await globalRef.set({
        month: monthKey,
        totalCalls: admin.firestore.FieldValue.increment(1),
        lastAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

/** Per-user rate limit: N calls per window. Uses Firestore for distributed state. */
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
    // New or expired window — reset.
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
        throw new HttpsError('resource-exhausted', `Monthly AI token budget (${limits.monthlyTokenCap.toLocaleString()} est. tokens) reached.`);
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

/** Verify user tier (Research+ / founder). */
async function assertTier(db, uid) {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) throw new HttpsError('not-found', 'User record missing.');
    const user = snap.data() || {};
    const tier = user.tier || (user.isFounder ? 'founder' : 'free');
    if (!['founder', 'research_plus'].includes(tier)) {
        throw new HttpsError('permission-denied', 'AI Research requires Research+ access.');
    }
    return tier;
}

/** Run all checks in sequence. Returns quota info for the response. */
async function runAllGuards(uid, promptText) {
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const db = admin.firestore();
    const limits = await getAiLimits(db);
    await assertGlobalLimits(db, limits);
    await assertRateLimit(db, uid, limits);
    await assertTier(db, uid);
    const quota = await assertDailyQuota(db, uid, limits);
    // Rough estimate: 1 token ≈ 4 chars, +100 for system prompt overhead
    const estimatedTokens = Math.ceil((promptText?.length || 0) / 4) + 100;
    const monthly = await assertMonthlyTokenCap(db, uid, limits, estimatedTokens);
    return { quota, monthly, limits };
}

// ── Callable functions ────────────────────────────────────────────

exports.aiResearchChat = onCall({ cors: true }, async (request) => {
    const uid = request.auth?.uid;
    const { prompt, conversationId } = request.data || {};
    const clean = sanitizePrompt(prompt);
    if (!clean) throw new HttpsError('invalid-argument', 'Prompt is required.');

    const { quota, monthly } = await runAllGuards(uid, clean);
    logger.info('aiResearchChat', { uid, len: clean.length, quota });

    // TODO: replace mock with real provider call (OpenAI / Anthropic).
    return {
        conversationId: conversationId || null,
        message: {
            role: 'assistant',
            content: `[Provider not yet wired] Prompt received (${clean.length} chars).\n\n${buildDisclaimer()}`,
            citations: [],
            mock: true,
            createdAt: new Date().toISOString(),
        },
        quotaRemaining: quota.remaining,
        tokensRemaining: monthly.remainingTokens,
    };
});

exports.aiResearchPrefillProtocol = onCall({ cors: true }, async (request) => {
    const uid = request.auth?.uid;
    const { compound, goal } = request.data || {};
    if (!compound) throw new HttpsError('invalid-argument', 'Compound is required.');

    const { quota } = await runAllGuards(uid, compound + (goal || ''));
    logger.info('aiResearchPrefillProtocol', { uid, compound });

    // TODO: replace with real provider call.
    return {
        prefill: {
            protocolName: String(compound).slice(0, 48),
            purpose: goal ? String(goal).slice(0, 120) : '',
            notes: `Generated pre-fill for ${compound}. Verify dosing against primary literature.`,
        },
        disclaimer: buildDisclaimer(),
        quotaRemaining: quota.remaining,
    };
});

exports.aiResearchAnalyzeStack = onCall({ cors: true }, async (request) => {
    const uid = request.auth?.uid;
    const { protocols = [], supplements = [] } = request.data || {};

    const { quota } = await runAllGuards(uid, JSON.stringify(protocols).slice(0, 500));
    logger.info('aiResearchAnalyzeStack', { uid, protocols: protocols.length, supplements: supplements.length });

    const protocolCount = Array.isArray(protocols) ? protocols.length : 0;
    const supplementCount = Array.isArray(supplements) ? supplements.length : 0;

    // TODO: replace with real provider call.
    return {
        summary: `You have ${protocolCount} protocol(s) and ${supplementCount} supplement(s) active. Full analysis ships once provider is wired.`,
        flags: [],
        disclaimer: buildDisclaimer(),
        quotaRemaining: quota.remaining,
    };
});
