/**
 * AI Research callable functions (Research+ Wave).
 *
 * These are stubs that define the contract the client expects. Wiring
 * to an actual provider (OpenAI, Anthropic, etc.) lands in a follow-up
 * deploy once the provider, cost ceiling, and safety policy are
 * finalized.
 *
 * The server-side contract is explicit:
 *   - Caller must be authenticated.
 *   - Caller must be on Research+ / founder tier.
 *   - Caller's daily quota is enforced server-side (source of truth).
 *   - Request is sanitized (PII scrubbed, prompt length capped).
 *   - Response always includes a disclaimer + citations array.
 *
 * Client calls these via httpsCallable:
 *   - aiResearchChat({ prompt, conversationId, history })
 *   - aiResearchPrefillProtocol({ compound, goal })
 *   - aiResearchAnalyzeStack({ protocols, supplements })
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const DAILY_QUOTA = 25;
const MAX_PROMPT_CHARS = 2000;
const PII_PATTERNS = [
    { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, replacement: '[email]' },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[redacted]' },
    { pattern: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, replacement: '[phone]' },
];

function sanitizePrompt(text) {
    if (!text || typeof text !== 'string') return '';
    let result = text.slice(0, MAX_PROMPT_CHARS);
    PII_PATTERNS.forEach(({ pattern, replacement }) => {
        result = result.replace(pattern, replacement);
    });
    return result;
}

async function assertTierAndQuota(uid) {
    const db = admin.firestore();
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User record missing.');
    }
    const user = userSnap.data() || {};
    const tier = user.tier || (user.isFounder ? 'founder' : 'free');
    if (!['founder', 'research_plus'].includes(tier)) {
        throw new HttpsError('permission-denied', 'AI Research requires Research+ access.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const quotaRef = db.collection('aiQuota').doc(`${uid}_${today}`);
    const quotaSnap = await quotaRef.get();
    const count = quotaSnap.exists ? (quotaSnap.data().count || 0) : 0;
    if (count >= DAILY_QUOTA) {
        throw new HttpsError('resource-exhausted', 'Daily AI quota reached.');
    }
    await quotaRef.set({
        uid,
        date: today,
        count: count + 1,
        lastAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { tier, used: count + 1, remaining: DAILY_QUOTA - (count + 1) };
}

function buildDisclaimer() {
    return 'This is an AI research assistant. Output is informational only and not medical advice. Always verify with primary sources.';
}

// --------------------------------------------------------------------
// aiResearchChat
// --------------------------------------------------------------------
exports.aiResearchChat = onCall({ cors: true }, async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Sign-in required.');
    }
    const { prompt, conversationId } = request.data || {};
    const cleanPrompt = sanitizePrompt(prompt);
    if (!cleanPrompt) {
        throw new HttpsError('invalid-argument', 'Prompt is required.');
    }

    const quota = await assertTierAndQuota(uid);

    // TODO: wire to real provider. For now, return a deterministic mock.
    logger.info('aiResearchChat', { uid, len: cleanPrompt.length, quota });

    return {
        conversationId: conversationId || null,
        message: {
            role: 'assistant',
            content: `Pending real-provider wiring. Sanitized prompt length: ${cleanPrompt.length} chars.\n\n${buildDisclaimer()}`,
            citations: [],
            mock: true,
            createdAt: new Date().toISOString(),
        },
        quotaRemaining: quota.remaining,
    };
});

// --------------------------------------------------------------------
// aiResearchPrefillProtocol — generate a ProtocolEditor prefill payload
// --------------------------------------------------------------------
exports.aiResearchPrefillProtocol = onCall({ cors: true }, async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');

    const { compound, goal } = request.data || {};
    if (!compound) throw new HttpsError('invalid-argument', 'Compound is required.');

    await assertTierAndQuota(uid);

    // Stub payload — the client knows how to apply this to the editor.
    return {
        prefill: {
            protocolName: String(compound).slice(0, 48),
            purpose: goal ? String(goal).slice(0, 120) : '',
            notes: `Generated pre-fill for ${compound}. Verify dosing against primary literature.`,
        },
        disclaimer: buildDisclaimer(),
    };
});

// --------------------------------------------------------------------
// aiResearchAnalyzeStack — lightweight heuristic scan of a user stack
// --------------------------------------------------------------------
exports.aiResearchAnalyzeStack = onCall({ cors: true }, async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');

    const { protocols = [], supplements = [] } = request.data || {};
    await assertTierAndQuota(uid);

    const protocolCount = Array.isArray(protocols) ? protocols.length : 0;
    const supplementCount = Array.isArray(supplements) ? supplements.length : 0;

    return {
        summary: `You have ${protocolCount} protocol(s) and ${supplementCount} supplement(s) active. A full analysis (receptor overlap, half-life staggering, co-administration flags) ships once the real-provider wiring is complete.`,
        flags: [],
        disclaimer: buildDisclaimer(),
    };
});
