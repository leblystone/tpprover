/**
 * PiP Gemini endpoints — research + protocol prefill with Google Search grounding.
 *
 * Uses GEMINI_API_KEY (same secret as halfLifeBackfill.js).
 * Shares quota/tier guards with aiResearch.js via exported helpers.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const {
    runAllGuards,
    sanitizePrompt,
    buildChatSystemPrompt,
    buildDisclaimer,
    parseJsonResponse,
} = require('./aiResearch');

const GEMINI_MODEL = 'gemini-2.5-flash';

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
    { cors: true, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120 },
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
            const content = await callGeminiWithSearch(apiKey, {
                systemPrompt,
                userMessage,
                useSearch: true,
            });

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
            };
        } catch (e) {
            if (e instanceof HttpsError) throw e;
            logger.error('aiPipGeminiResearch failed', { uid: uid || null, err: e?.message || String(e) });
            throw new HttpsError('internal', 'PiP could not complete this research request.');
        }
    }
);

exports.aiPipGeminiPrefill = onCall(
    { cors: true, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120 },
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

            const systemPrompt = `You are PiP, the research assistant inside TPP Splendide peptide tracking app. Use Google Search to verify dosing ranges and half-life data.

Return ONLY valid JSON — no markdown, no code blocks, no other text. Be accurate and concise.

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
                content,
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
