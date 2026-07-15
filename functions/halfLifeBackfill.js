/**
 * Half-Life Backfill callable — Gemini + Google Search grounding.
 *
 * Separate from PiP chat quota/tier: available to ALL authenticated users,
 * limited to one successful run per user lifetime. Tracks usage in its own
 * Firestore collections so it never steals PiP daily/monthly budget.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const DEFAULT_MONTHLY_CAP = 15000;
const MAX_PEPTIDE_NAMES = 40;
const BATCH_SIZE = 12;
const BACKFILL_VERSION = 2;
const MODELS_WITH_SEARCH = ['gemini-2.5-flash'];
const MODEL_FALLBACK = 'gemini-2.5-flash';

const { normalizePeptideLookupKey, superNormalizePeptideName } = require('./peptideNameNormalize');

/** Build a lookup index from the names the client requested. */
function buildRequestIndex(names) {
    return (names || [])
        .map((n) => ({ requested: n, key: normalizePeptideLookupKey(n), sup: superNormalizePeptideName(n) }))
        .filter((e) => e.key && e.sup);
}

/**
 * Match an AI-returned compound name back to one of the requested names.
 * Handles spelling/spacing variants, parenthetical abbreviations
 * ("Vasoactive Intestinal Peptide (VIP)" -> "VIP"), and substring overlap.
 */
function findRequestedMatch(aiName, requestIndex) {
    if (!aiName || !requestIndex?.length) return null;
    const aiSup = superNormalizePeptideName(aiName);
    if (!aiSup) return null;

    // 1) exact super-normalized match
    let hit = requestIndex.find((e) => e.sup === aiSup);
    if (hit) return hit;

    // 2) exact alias key match
    const aiKey = normalizePeptideLookupKey(aiName);
    hit = requestIndex.find((e) => e.key === aiKey);
    if (hit) return hit;

    // 3) parenthetical abbreviation inside the AI name
    const parens = String(aiName).match(/\(([^)]+)\)/g) || [];
    for (const p of parens) {
        const psup = superNormalizePeptideName(p.replace(/[()]/g, ''));
        if (psup) {
            hit = requestIndex.find((e) => e.sup === psup);
            if (hit) return hit;
        }
    }

    // 4) containment either direction (guard against tiny false positives)
    hit = requestIndex.find((e) => e.sup.length >= 4 && (aiSup.includes(e.sup) || e.sup.includes(aiSup)));
    if (hit) return hit;

    return null;
}

function parseJsonFromText(text, fallback = {}) {
    try { return JSON.parse(text); } catch { /* try extraction */ }
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        try { return JSON.parse(match[0]); } catch { /* use fallback */ }
    }
    return fallback;
}

function buildPrompt(names) {
    return `You are a pharmacology research assistant. For each peptide/compound name below, provide the estimated elimination half-life based on published research literature.

IMPORTANT — user labels may include decorative emojis or symbols in the app (e.g. "BPC-157🩼", "Semaglutide🅾️"). Those are NOT part of the compound name. Research the underlying peptide/compound only (BPC-157, Semaglutide, TB-500, etc.). Ignore all emojis, trademark symbols, and non-chemical characters when searching.

Return ONLY valid JSON — no markdown, no code blocks, no explanation. Use this exact format:
{
  "results": [
    { "name": "clean compound name matching the list below (no emojis)", "halfLifeValue": "numeric string", "halfLifeUnit": "hours or days", "confidence": "high or medium or low" }
  ]
}

Rules:
- "name" must match the compound label from the list below (text only, no emojis added)
- halfLifeValue must be a numeric string (e.g. "4", "0.5", "168")
- halfLifeUnit must be "hours" or "days"
- Recognize common spellings/typos (e.g. Semorelin → sermorelin, TB500 → TB-500)
- If a compound has a well-established half-life, confidence is "high"
- If the half-life varies significantly by formulation or route, confidence is "medium"
- If you cannot determine a reliable half-life, omit that compound from results entirely
- Use the most commonly cited value for subcutaneous injection route when multiple routes exist
- For modified/PEGylated variants, use the modified form's half-life
- Vitamins/minerals (Vitamin C, Zinc, NAC, Glutathione) may be omitted if no meaningful peptide half-life exists

Compounds to look up:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
}

function extractResponseText(response) {
    try {
        const t = response?.text;
        if (t && String(t).trim()) return String(t);
    } catch (e) {
        logger.warn('response.text accessor failed', { err: e?.message });
    }
    const parts = response?.candidates?.[0]?.content?.parts || [];
    return parts.filter((p) => p?.text).map((p) => p.text).join('\n');
}

function parseResultsFromText(text, resultsMap, requestIndex) {
    const parsed = parseJsonFromText(text, { results: [] });
    const arr = Array.isArray(parsed.results) ? parsed.results : [];
    for (const item of arr) {
        if (!item.name || !item.halfLifeValue || !item.halfLifeUnit) continue;
        const val = parseFloat(item.halfLifeValue);
        if (isNaN(val) || val <= 0) continue;
        if (!['hours', 'days'].includes(item.halfLifeUnit)) continue;
        // Key by the requested name when we can match it — that is the key the
        // client looks up. Fall back to the AI's own normalized name otherwise.
        const match = requestIndex ? findRequestedMatch(item.name, requestIndex) : null;
        const key = match ? match.key : normalizePeptideLookupKey(item.name);
        if (!key) continue;
        resultsMap[key] = {
            value: String(val),
            unit: item.halfLifeUnit,
            confidence: item.confidence || 'medium',
        };
    }
}

/** Try @google/genai with optional Google Search grounding. */
async function callGenAi(apiKey, names, { useSearch, model }) {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const config = { temperature: 0.2 };
    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }
    const response = await ai.models.generateContent({
        model,
        contents: buildPrompt(names),
        config,
    });
    const text = extractResponseText(response);
    if (!text || !text.trim()) {
        throw new Error(`Empty response from ${model}${useSearch ? ' + googleSearch' : ''}`);
    }
    return text;
}

/** Fallback: legacy @google/generative-ai (no search grounding). */
async function callLegacyGenAi(apiKey, names) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL_FALLBACK,
        generationConfig: { temperature: 0.2 },
    });
    const result = await model.generateContent(buildPrompt(names));
    const text = (result.response?.text?.() || '').trim();
    if (!text) throw new Error('Empty response from legacy Gemini SDK');
    return text;
}

async function lookupHalfLives(apiKey, names) {
    const errors = [];
    const resultsMap = {};
    const requestIndex = buildRequestIndex(names);

    // 1) @google/genai + googleSearch (best-effort per model)
    for (const model of MODELS_WITH_SEARCH) {
        try {
            const text = await callGenAi(apiKey, names, { useSearch: true, model });
            parseResultsFromText(text, resultsMap, requestIndex);
            if (Object.keys(resultsMap).length > 0) {
                logger.info('Half-life lookup succeeded', { model, search: true, matched: Object.keys(resultsMap).length });
                return resultsMap;
            }
        } catch (e) {
            errors.push(`${model}+search: ${e?.message || String(e)}`);
            logger.warn('GenAI search attempt failed', { model, err: e?.message });
        }
    }

    // 2) @google/genai without search
    for (const model of MODELS_WITH_SEARCH) {
        try {
            const text = await callGenAi(apiKey, names, { useSearch: false, model });
            parseResultsFromText(text, resultsMap, requestIndex);
            if (Object.keys(resultsMap).length > 0) {
                logger.info('Half-life lookup succeeded', { model, search: false, matched: Object.keys(resultsMap).length });
                return resultsMap;
            }
        } catch (e) {
            errors.push(`${model}: ${e?.message || String(e)}`);
            logger.warn('GenAI plain attempt failed', { model, err: e?.message });
        }
    }

    // 3) Legacy SDK
    try {
        const text = await callLegacyGenAi(apiKey, names);
        parseResultsFromText(text, resultsMap, requestIndex);
        if (Object.keys(resultsMap).length > 0) {
            logger.info('Half-life lookup succeeded via legacy SDK', { matched: Object.keys(resultsMap).length });
            return resultsMap;
        }
    } catch (e) {
        errors.push(`legacy: ${e?.message || String(e)}`);
        logger.warn('Legacy GenAI attempt failed', { err: e?.message });
    }

    throw new Error(errors.join(' | ') || 'All Gemini attempts failed');
}

exports.aiBackfillProtocolHalfLives = onCall(
    { cors: true, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120 },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');

        const { peptideNames, forceRetry } = request.data || {};
        if (!Array.isArray(peptideNames) || peptideNames.length === 0) {
            throw new HttpsError('invalid-argument', 'peptideNames array is required.');
        }

        const names = peptideNames
            .filter((n) => typeof n === 'string' && n.trim())
            .map((n) => n.trim().slice(0, 100))
            .slice(0, MAX_PEPTIDE_NAMES);

        if (names.length === 0) {
            throw new HttpsError('invalid-argument', 'No valid peptide names provided.');
        }

        const db = admin.firestore();

        let limits;
        try {
            const snap = await db.collection('config').doc('aiCostLimits').get();
            limits = snap.exists ? snap.data() : {};
        } catch { limits = {}; }

        if (limits.emergencyStop) {
            throw new HttpsError('unavailable', 'AI services are temporarily paused.');
        }

        const userRef = db.collection('aiHalfLifeBackfill').doc(uid);
        const userSnap = await userRef.get();
        // Only block re-runs that fully completed under the CURRENT backfill
        // version. Legacy docs (partial runs marked "completed" by old logic)
        // have no matching version, so they are allowed to retry.
        if (!forceRetry && userSnap.exists) {
            const d = userSnap.data() || {};
            if (d.completed && d.backfillVersion === BACKFILL_VERSION) {
                return { results: {}, alreadyCompleted: true };
            }
        }

        const monthKey = new Date().toISOString().slice(0, 7);
        const cap = parseInt(String(limits.halfLifeBackfillMonthlyCap), 10) || DEFAULT_MONTHLY_CAP;
        const statsRef = db.collection('aiMigrationStats').doc(monthKey);
        const statsSnap = await statsRef.get();
        const currentCalls = statsSnap.exists ? (statsSnap.data()?.halfLifeBackfillCalls || 0) : 0;
        if (currentCalls >= cap) {
            throw new HttpsError('resource-exhausted', 'Monthly half-life backfill capacity reached. Try again next month.');
        }

        logger.info('aiBackfillProtocolHalfLives', { uid, count: names.length });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.error('GEMINI_API_KEY secret not set');
            throw new HttpsError('internal', 'AI service misconfigured.');
        }

        let resultsMap = {};
        try {
            for (let i = 0; i < names.length; i += BATCH_SIZE) {
                const batch = names.slice(i, i + BATCH_SIZE);
                const batchResults = await lookupHalfLives(apiKey, batch);
                resultsMap = { ...resultsMap, ...batchResults };
            }
        } catch (e) {
            logger.error('Gemini half-life backfill failed', {
                uid,
                err: e?.message || String(e),
                stack: e?.stack?.slice?.(0, 800),
            });
            throw new HttpsError('internal', 'Half-life lookup failed. Will retry next session.');
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        const matched = Object.keys(resultsMap).length;

        // Count only results that map back to a compound the client requested —
        // avoids fallback (AI-named) entries falsely inflating completion.
        const requestKeys = buildRequestIndex(names).map((e) => e.key);
        const matchedRequested = requestKeys.filter((k) => resultsMap[k]).length;

        await statsRef.set({
            month: monthKey,
            halfLifeBackfillCalls: admin.firestore.FieldValue.increment(1),
            halfLifeBackfillPeptides: admin.firestore.FieldValue.increment(names.length),
            halfLifeBackfillMatched: admin.firestore.FieldValue.increment(matchedRequested),
            lastAt: now,
        }, { merge: true });

        // Fully complete only when every requested compound was resolved.
        // Partial runs stay open so the client can retry leftovers next session.
        const fullyComplete = matchedRequested >= requestKeys.length;
        await userRef.set({
            uid,
            completed: fullyComplete,
            backfillVersion: fullyComplete ? BACKFILL_VERSION : (userSnap.data()?.backfillVersion ?? null),
            requestedNames: names,
            matchedCount: matchedRequested,
            lastMatchedCount: matchedRequested,
            lastRequestedCount: names.length,
            [fullyComplete ? 'completedAt' : 'lastAttemptAt']: now,
        }, { merge: true });

        logger.info('aiBackfillProtocolHalfLives complete', { uid, requested: names.length, matched: matchedRequested, fullyComplete });

        return {
            results: resultsMap,
            disclaimer: 'Half-life values are estimates based on published research and web sources. Not medical advice. Verify with primary sources.',
        };
    }
);
