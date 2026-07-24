/**
 * PiP Gemini endpoints — research + protocol prefill with Google Search grounding.
 *
 * Uses GEMINI_API_KEY (same secret as halfLifeBackfill.js).
 * Shares quota/tier guards with aiResearch.js via exported helpers.
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {
    runAllGuards,
    sanitizePrompt,
    buildChatSystemPrompt,
    buildDisclaimer,
    parseJsonResponse,
    sanitizePipBranding,
} = require('./aiResearch');

const GEMINI_MODEL = 'gemini-2.5-flash';

// ── Research cache (Firestore, 30-day TTL) ────────────────────────────────────
const CACHE_COLLECTION = 'pip_research_cache';
const QUERY_LOG_COLLECTION = 'pip_query_log';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function buildCacheKey(query) {
    return query.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '').slice(0, 200);
}

async function getCachedResearch(query) {
    const key = buildCacheKey(query);
    try {
        const doc = await admin.firestore().collection(CACHE_COLLECTION).doc(key).get();
        if (!doc.exists) return null;
        const data = doc.data();
        const ageMs = Date.now() - (data.lastVerified?.toMillis?.() || 0);
        if (ageMs > CACHE_TTL_MS) {
            logger.info('Research cache expired, will refresh', { key, ageDays: (ageMs / 86400000).toFixed(1) });
            return null;
        }
        return {
            content: data.content,
            lastVerified: data.lastVerified?.toDate?.().toISOString() || null,
            hitCount: (data.hitCount || 1) + 1,
        };
    } catch (e) {
        logger.warn('Research cache read failed', { key, err: e?.message });
        return null;
    }
}

async function setCachedResearch(query, content) {
    const key = buildCacheKey(query);
    try {
        await admin.firestore().collection(CACHE_COLLECTION).doc(key).set({
            query: query.slice(0, 500),
            content,
            lastVerified: admin.firestore.FieldValue.serverTimestamp(),
            hitCount: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
        logger.info('Research cache written', { key, contentLen: content.length });
    } catch (e) {
        logger.warn('Research cache write failed', { key, err: e?.message });
    }
}

function incrementCacheHitCount(query) {
    const key = buildCacheKey(query);
    admin.firestore().collection(CACHE_COLLECTION).doc(key).update({
        hitCount: admin.firestore.FieldValue.increment(1),
    }).catch((e) => {
        logger.warn('Research cache hitCount increment failed', { key, err: e?.message });
    });
}

// provider: 'gemini' | 'cache' | 'local'
function logPipQuery(uid, query, provider) {
    const uidHash = uid
        ? crypto.createHash('sha256').update(uid).digest('hex').slice(0, 16)
        : 'anon';
    const resolvedProvider = provider === true ? 'cache' : provider === false ? 'gemini' : (provider || 'gemini');
    admin.firestore().collection(QUERY_LOG_COLLECTION).add({
        uidHash,
        query: String(query).slice(0, 300),
        intent: 'RESEARCH',
        provider: resolvedProvider,
        fromCache: resolvedProvider === 'cache',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch((e) => {
        logger.warn('PiP query log write failed', { err: e?.message });
    });
}

/**
 * Lightweight callable so the client can log locally-answered queries
 * (compounds served from the built-in knowledge base without hitting Gemini).
 */
exports.logPipQueryClient = onCall({ cors: true }, async (request) => {
    const uid = request.auth?.uid || null;
    const { query, provider } = request.data || {};
    if (!query || typeof query !== 'string' || !query.trim()) return { ok: false };
    logPipQuery(uid, query.trim(), provider || 'local');
    return { ok: true };
});

/** Stream pre-fetched text in chunks for typewriter effect on cache hits. */
async function streamTextAsChunks(text, onChunk) {
    const chunks = text.match(/.{1,60}/gs) || [text];
    for (const chunk of chunks) {
        onChunk(chunk);
        await new Promise((r) => setTimeout(r, 10));
    }
}

function extractResponseText(response) {
    try {
        const t = response?.text;
        if (t && String(t).trim()) return String(t);
    } catch (e) {
        logger.warn('Gemini response.text accessor failed', { err: e?.message });
    }
    const parts = response?.candidates?.[0]?.content?.parts || [];
    return parts.filter((p) => p?.text).map((p) => p.text).join('\n');
}

async function callGeminiWithSearch(apiKey, { systemPrompt, userMessage, useSearch = true, temperature = 0.35 }) {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const config = {
        temperature,
        systemInstruction: systemPrompt,
    };
    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userMessage,
        config,
    });

    const text = extractResponseText(response);
    if (!text || !text.trim()) {
        throw new Error(`Empty response from ${GEMINI_MODEL}${useSearch ? ' + googleSearch' : ''}`);
    }
    return text.trim();
}

async function streamGeminiWithSearch(apiKey, { systemPrompt, userMessage, useSearch = true, temperature = 0.35, onChunk }) {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const config = {
        temperature,
        systemInstruction: systemPrompt,
    };
    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const stream = await ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: userMessage,
        config,
    });

    let full = '';
    for await (const chunk of stream) {
        let text = '';
        try {
            text = chunk?.text ? String(chunk.text) : '';
        } catch {
            const parts = chunk?.candidates?.[0]?.content?.parts || [];
            text = parts.filter((p) => p?.text).map((p) => p.text).join('');
        }
        if (!text) continue;
        const sanitized = sanitizePipBranding(text);
        full += sanitized;
        onChunk(sanitized);
    }

    if (!full.trim()) {
        throw new Error(`Empty stream from ${GEMINI_MODEL}${useSearch ? ' + googleSearch' : ''}`);
    }
    return full.trim();
}

function buildResearchSystemPrompt(userContext) {
    const base = buildChatSystemPrompt(userContext);
    return [
        base,
        '',
        '## RESEARCH MODE (Google Search enabled)',
        'You have live web search. Use it to verify compound facts, dosing ranges, half-lives, and recent research context.',
        'Cite nothing by URL — synthesize findings in PiP voice.',
        'For "tell me about X": cover mechanism, typical research use, protocol notes, best stacks, side effects — concisely.',
        'Never fabricate studies. If search is inconclusive, say so clearly.',
        'Add the disclaimer once at the end on research-heavy answers.',
    ].join('\n');
}

function buildPrefillFromParsed(parsed, compound, goal) {
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

    const doseInfo = parsed.doseRange
        ? `\n\n**Dose range:** ${parsed.doseRange}${parsed.typicalDose ? `\n**Typical dose:** ${parsed.typicalDose} ${parsed.unit || ''}` : ''}${parsed.durationWeeks ? `\n**Cycle length:** ${parsed.durationWeeks} weeks` : ''}`
        : '';

    const titrationInfo = Array.isArray(parsed.titration) && parsed.titration.length > 0
        ? `\n\n**Titration:** ${parsed.titration.map(t => `${t.label} — ${t.dose} × ${t.durationDays}d`).join(' → ')}`
        : '';

    const content = `Here's what the research suggests for **${compoundName}**:\n\n${parsed.notes || ''}${doseInfo}${titrationInfo}\n\nI've pre-filled a protocol — tap below to review and adjust before saving.\n\n_${buildDisclaimer()}_`;

    return { prefill, content };
}

exports.aiPipGeminiResearch = onCall(
    { cors: true, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120, minInstances: 1 },
    async (request) => {
        const uid = request.auth?.uid;
        try {
            const { query, history = [], conversationId, userContext } = request.data || {};
            const clean = sanitizePrompt(query);
            if (!clean) throw new HttpsError('invalid-argument', 'Query is required.');

            const { quota } = await runAllGuards(uid, clean);
            const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                logger.error('GEMINI_API_KEY secret not set');
                throw new HttpsError('internal', 'AI service misconfigured.');
            }

            logger.info('aiPipGeminiResearch', { uid, len: clean.length, quotaRemaining: quotaRem });

            let contextBlock = '';
            if (Array.isArray(history) && history.length > 0) {
                contextBlock = history.slice(-4).map((m) => {
                    const role = m.role === 'assistant' ? 'PiP' : 'User';
                    return `${role}: ${String(m.content || '').slice(0, 400)}`;
                }).join('\n');
            }

            const userMessage = contextBlock
                ? `Recent conversation:\n${contextBlock}\n\nCurrent question:\n${clean}`
                : clean;

            const systemPrompt = buildResearchSystemPrompt(userContext);

            // Cache check — skip API if answer is fresh
            const cached = await getCachedResearch(clean);
            if (cached) {
                logger.info('aiPipGeminiResearch cache hit', { uid, key: buildCacheKey(clean), hitCount: cached.hitCount });
                incrementCacheHitCount(clean);
                logPipQuery(uid, clean, true);
                return {
                    conversationId: conversationId || null,
                    message: {
                        role: 'assistant',
                        content: cached.content,
                        citations: [],
                        createdAt: new Date().toISOString(),
                    },
                    quotaRemaining: quotaRem,
                    provider: 'gemini',
                    fromCache: true,
                    cacheLastVerified: cached.lastVerified,
                };
            }

            const content = sanitizePipBranding(await callGeminiWithSearch(apiKey, {
                systemPrompt,
                userMessage,
                useSearch: true,
            }));

            // Fire-and-forget cache write
            setCachedResearch(clean, content).catch(() => {});
            logPipQuery(uid, clean, false);

            logger.info('aiPipGeminiResearch complete', { uid, outputLen: content.length });

            return {
                conversationId: conversationId || null,
                message: {
                    role: 'assistant',
                    content,
                    citations: [],
                    createdAt: new Date().toISOString(),
                },
                quotaRemaining: quotaRem,
                provider: 'gemini',
                fromCache: false,
                cacheLastVerified: null,
            };
        } catch (e) {
            if (e instanceof HttpsError) throw e;
            logger.error('aiPipGeminiResearch failed', { uid: uid || null, err: e?.message || String(e) });
            throw new HttpsError('internal', 'PiP could not complete this research request.');
        }
    }
);

/**
 * Streaming research endpoint (SSE). Tokens appear as Gemini generates them.
 */
exports.aiPipGeminiResearchStream = onRequest(
    { secrets: ['GEMINI_API_KEY'], minInstances: 1, cors: true, timeoutSeconds: 120 },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

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

        const { query, history = [], conversationId, userContext } = req.body || {};
        const clean = sanitizePrompt(query);
        if (!clean) {
            res.status(400).json({ error: 'Query required' });
            return;
        }

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

        res.set('Content-Type', 'text/event-stream');
        res.set('Cache-Control', 'no-cache');
        res.set('Connection', 'keep-alive');

        const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                sendEvent({ type: 'error', message: 'AI service misconfigured.' });
                res.end();
                return;
            }

            let contextBlock = '';
            if (Array.isArray(history) && history.length > 0) {
                contextBlock = history.slice(-4).map((m) => {
                    const role = m.role === 'assistant' ? 'PiP' : 'User';
                    return `${role}: ${String(m.content || '').slice(0, 400)}`;
                }).join('\n');
            }

            const userMessage = contextBlock
                ? `Recent conversation:\n${contextBlock}\n\nCurrent question:\n${clean}`
                : clean;

            const systemPrompt = buildResearchSystemPrompt(userContext);
            const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;

            // Cache check — stream cached content if fresh
            const cached = await getCachedResearch(clean);
            if (cached) {
                logger.info('aiPipGeminiResearchStream cache hit', { uid, key: buildCacheKey(clean) });
                incrementCacheHitCount(clean);
                logPipQuery(uid, clean, true);
                await streamTextAsChunks(cached.content, (token) => sendEvent({ type: 'token', token }));
                sendEvent({
                    type: 'done',
                    quotaRemaining: quotaRem,
                    conversationId: conversationId || null,
                    fromCache: true,
                    cacheLastVerified: cached.lastVerified,
                });
                res.end();
                return;
            }

            logger.info('aiPipGeminiResearchStream', { uid, len: clean.length, quotaRemaining: quotaRem });

            let fullContent = '';
            await streamGeminiWithSearch(apiKey, {
                systemPrompt,
                userMessage,
                useSearch: true,
                onChunk: (token) => {
                    fullContent += token;
                    sendEvent({ type: 'token', token });
                },
            });

            // Fire-and-forget cache write after stream completes
            if (fullContent.trim()) {
                setCachedResearch(clean, fullContent.trim()).catch(() => {});
            }
            logPipQuery(uid, clean, false);

            sendEvent({
                type: 'done',
                quotaRemaining: quotaRem,
                conversationId: conversationId || null,
                fromCache: false,
                cacheLastVerified: null,
            });
            res.end();
            logger.info('aiPipGeminiResearchStream complete', { uid, outputLen: fullContent.length });
        } catch (e) {
            logger.error('aiPipGeminiResearchStream failed', { uid, err: e?.message || String(e) });
            sendEvent({ type: 'error', message: 'PiP could not complete this research request.' });
            res.end();
        }
    }
);

exports.aiPipGeminiPrefill = onCall(
    { cors: true, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120, minInstances: 1 },
    async (request) => {
        const uid = request.auth?.uid;
        try {
            const { compound, goal } = request.data || {};
            if (!compound) throw new HttpsError('invalid-argument', 'Compound is required.');

            const compoundStr = String(compound).slice(0, 100);
            const goalStr = String(goal || 'general research').slice(0, 200);
            const { quota } = await runAllGuards(uid, compoundStr + goalStr);
            const quotaRem = Number.isFinite(quota?.remaining) ? Math.max(0, quota.remaining) : 0;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                logger.error('GEMINI_API_KEY secret not set');
                throw new HttpsError('internal', 'AI service misconfigured.');
            }

            logger.info('aiPipGeminiPrefill', { uid, compound: compoundStr });

            const systemPrompt = `You are PiP, the research assistant inside The Pep Planner. Use Google Search to verify dosing ranges and half-life data.
Never say "TPP Splendide" or "Splendide" — the app is The Pep Planner only.

Return ONLY valid JSON — no markdown, no code blocks, no other text. Be accurate and concise.

HARD RULE: Never state or imply that this compound is safe with, or has no interaction with, any prescription medication. You have no verified interaction data for prescription drugs — do not mention medication safety at all in the notes.

The "notes" field should be 2-3 sentences in PiP's voice: direct, informed, slightly witty — not corporate.

Required JSON format:
{
  "protocolName": "string max 48 chars",
  "purpose": "string max 120 chars describing the research goal",
  "notes": "2-3 sentence research summary in PiP's voice",
  "doseRange": "string like '250-500 mcg' or '2-5 mg'",
  "typicalDose": "numeric string like '250' or '2.5'",
  "unit": "mcg or mg",
  "frequencyType": "daily | twice_daily | twice_weekly | weekly | as_needed",
  "frequencyTimes": ["AM"] or ["PM"] or ["AM","PM"],
  "durationWeeks": "numeric string like '4' or '12'",
  "halfLifeValue": "numeric string like '4' or '3'",
  "halfLifeUnit": "hours or days",
  "deliveryMethod": "pipette or pen or oral",
  "titration": [] or array of {"label": "string", "dose": "string", "durationDays": "string"}
}`;

            const rawText = await callGeminiWithSearch(apiKey, {
                systemPrompt,
                userMessage: `Compound: ${compoundStr}\nGoal: ${goalStr}`,
                useSearch: true,
                temperature: 0.2,
            });

            const parsed = parseJsonResponse(rawText, {});
            const { prefill, content } = buildPrefillFromParsed(parsed, compoundStr, goalStr);

            logger.info('aiPipGeminiPrefill complete', { uid, compound: prefill.protocolName });

            return {
                prefill,
                content: sanitizePipBranding(content),
                disclaimer: buildDisclaimer(),
                quotaRemaining: quotaRem,
                provider: 'gemini',
            };
        } catch (e) {
            if (e instanceof HttpsError) throw e;
            logger.error('aiPipGeminiPrefill failed', { uid: uid || null, err: e?.message || String(e) });
            throw new HttpsError('internal', 'Protocol prefill failed.');
        }
    }
);
