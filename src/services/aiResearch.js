/**
 * AI Research service layer.
 *
 * Thin client wrapper around the server-side AI callable functions
 * powered by Anthropic Claude. All requests route through:
 *   1. Feature-flag gate (`ENABLE_AI_RESEARCH`)
 *   2. Client-side daily quota check (server re-enforces)
 *   3. PII scrubbing before leaving the device
 *   4. Firebase callable → Anthropic Claude → response
 */
import { featureFlags } from '../config/featureFlags';
import { generateId } from '../utils/string';

const DAILY_QUOTA_KEY = 'tpprover_ai_daily_quota';
const LIBRARY_KEY = 'tpprover_ai_library';
const CONVERSATIONS_KEY = 'tpprover_ai_conversations';
const PIP_GREETED_KEY = 'tpprover_pip_greeted';

export const AI_DAILY_QUOTA = 25;

let _quotaLimit = AI_DAILY_QUOTA;

export function setQuotaLimit(limit) {
    _quotaLimit = (typeof limit === 'number' && limit > 0) ? limit : AI_DAILY_QUOTA;
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

export function getRemainingQuota(limit) {
    const cap = limit ?? _quotaLimit;
    try {
        const raw = localStorage.getItem(DAILY_QUOTA_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (!data || data.date !== today()) return cap;
        return Math.max(0, cap - (data.count || 0));
    } catch {
        return cap;
    }
}

export function incrementQuota() {
    try {
        const raw = localStorage.getItem(DAILY_QUOTA_KEY);
        const data = raw ? JSON.parse(raw) : null;
        const current = (!data || data.date !== today()) ? 0 : (data.count || 0);
        localStorage.setItem(DAILY_QUOTA_KEY, JSON.stringify({ date: today(), count: current + 1 }));
    } catch { /* ignore */ }
}

// ── First-time greeting ──────────────────────────────────────────────────────

export function hasSeenGreeting() {
    try { return localStorage.getItem(PIP_GREETED_KEY) === '1'; } catch { return false; }
}

export function markGreetingSeen() {
    try { localStorage.setItem(PIP_GREETED_KEY, '1'); } catch { /* noop */ }
}

// ── PII scrubber ─────────────────────────────────────────────────────────────

function redactPII(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[email]')
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted]')
        .replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, '[phone]');
}

// ── Easter eggs (client-side, instant — no API call) ─────────────────────────

const EASTER_EGGS = [
    {
        match: /\bi have pip\b/i,
        response: `The physical kind? Bummer. You should probably check your injection technique or site rotation. If you mean me? I'm right here. 😏\n\nWant to log that as a side effect for today?`,
        actions: [{ type: 'side_effect_checkin', label: 'Log side effects' }],
    },
    {
        match: /\bgive me advice\b/i,
        response: `I'm a planner, not a practitioner. I can tell you what time it is and what your last dose was, but for the medical stuff, you're on your own. Keep it safe. 🧪`,
    },
    {
        match: /\bwho are you\b|\bwhat are you\b/i,
        response: `I'm PiP — your peptide planner. Yes, I'm aware of the irony. Unlike the other kind of PIP, I won't make your leg sore — I'm just here to keep your logs clean and your schedule tighter than a peptide bond.\n\nI don't give medical advice (I'm made of pixels, not protein), but I'm a world-class record keeper. What are we tracking today?`,
    },
    {
        match: /\bside effect/i,
        response: `Let's log that properly. Tap below to do a quick side effect check-in — it takes 5 seconds and helps you spot patterns over time.`,
        actions: [{ type: 'side_effect_checkin', label: 'Quick check-in' }],
    },
];

function checkEasterEgg(prompt) {
    for (const egg of EASTER_EGGS) {
        if (egg.match.test(prompt)) return egg;
    }
    return null;
}

// ── Protocol creation intent detection ──────────────────────────────────────

function detectProtocolIntent(prompt) {
    const lower = (prompt || '').toLowerCase();
    const patterns = [
        /(?:create|start|set up|make|build|generate)\s+(?:a\s+)?(?:new\s+)?protocol\s+(?:for\s+)?(.+)/i,
        /protocol\s+(?:for|with)\s+(.+)/i,
        /(?:help me|can you)\s+(?:set up|create|make|build)\s+(?:a\s+)?(.+?)\s+protocol/i,
        /(?:suggest|recommend)\s+(?:a\s+)?protocol\s+(?:for\s+)?(.+)/i,
    ];
    for (const pat of patterns) {
        const m = lower.match(pat);
        if (m) {
            const compound = m[1].replace(/[?.!,]+$/, '').trim();
            return compound.length > 1 && compound.length < 60 ? compound : null;
        }
    }
    return null;
}

// ── Reconstitution math (client-side, instant) ───────────────────────────────

function detectReconIntent(prompt) {
    return /reconstitut|bac water|bacteriostatic|how much water|units per|iu per|concentration|dilut|mixing|draw up/i.test(prompt);
}

function handleReconQuery(prompt) {
    const mgMatches = [...prompt.matchAll(/(\d+(?:\.\d+)?)\s*mg\b/gi)].map(m => parseFloat(m[1]));
    const mlMatches = [...prompt.matchAll(/(\d+(?:\.\d+)?)\s*(?:ml|cc)\b/gi)].map(m => parseFloat(m[1]));
    const mcgMatches = [...prompt.matchAll(/(\d+(?:\.\d+)?)\s*(?:mcg|μg|ug)\b/gi)].map(m => parseFloat(m[1]));

    const vialMg = mgMatches[0] ?? null;
    const waterMl = mlMatches[0] ?? null;
    const desiredMcg = mcgMatches[0] ?? null;
    const desiredMg = mgMatches[1] ?? null;

    const disclaimer = '\n\n_Based on standard pharmacology reconstitution guidelines. Informational only — not medical advice._';

    if (vialMg && waterMl) {
        const concMgPerMl = vialMg / waterMl;
        const concMcgPerMl = concMgPerMl * 1000;
        let body = `**${vialMg}mg vial + ${waterMl}ml BAC water**\nConcentration: **${concMgPerMl.toFixed(3)} mg/ml** (${concMcgPerMl.toFixed(0)} mcg/ml)\n\n`;

        if (desiredMcg) {
            const volMl = (desiredMcg / 1000) / concMgPerMl;
            const volUnits = volMl * 100;
            body += `For a **${desiredMcg}mcg dose:**\n• **${volMl.toFixed(3)} ml** on a standard syringe\n• **${volUnits.toFixed(1)} units** on a U100 insulin syringe\n\n`;
        } else if (desiredMg && desiredMg < vialMg) {
            const volMl = desiredMg / concMgPerMl;
            const volUnits = volMl * 100;
            body += `For a **${desiredMg}mg dose:**\n• **${volMl.toFixed(3)} ml** on a standard syringe\n• **${volUnits.toFixed(1)} units** on a U100 insulin syringe\n\n`;
        } else {
            const commonMcg = [100, 200, 250, 300, 500].filter(d => d <= vialMg * 1000);
            body += `**Common doses (U100 insulin syringe):**\n${commonMcg.map(mcg => {
                const ml = (mcg / 1000) / concMgPerMl;
                return `• ${mcg}mcg → ${(ml * 100).toFixed(1)} units`;
            }).join('\n')}`;
        }

        body += '\n\nInsulin syringes (U100) are the most common and precise for peptide dosing.';
        return body + disclaimer;
    }

    return `Reconstitution converts lyophilized peptide powder into an injectable solution.\n\n**Formula:**\nConcentration (mg/ml) = Vial size (mg) ÷ BAC water added (ml)\nDose volume (ml) = Desired dose (mg) ÷ Concentration (mg/ml)\nOn a U100 insulin syringe: volume (ml) × 100 = units to draw\n\n**Example:** 5mg vial + 2ml BAC water = 2.5mg/ml. A 250mcg dose = 0.1ml = 10 units.\n\n**Tips:**\n• Inject BAC water against the vial wall, never directly onto the powder\n• Gently swirl — never shake\n• Refrigerate immediately; most peptides are stable 4–8 weeks refrigerated\n\nGive me your vial size, water volume, and desired dose and I'll calculate the exact draw.${disclaimer}`;
}

// ── "Stack with X?" handler (client-side) ────────────────────────────────────

function detectStackWithIntent(prompt) {
    const m = prompt.match(/(?:what (?:can i|should i|do i|goes|pairs|works)\s+(?:well\s+)?(?:with|alongside))|(?:stack(?:ing)?\s+with)|(?:add(?:ing)?\s+to)|(?:combine\s+with)|(?:good\s+with)|(?:pair\s+with)/i);
    if (!m) return null;
    const after = prompt.slice(prompt.search(m[0]) + m[0].length).replace(/[?.!,]+$/, '').trim();
    return after.length > 1 && after.length < 60 ? after : null;
}

function handleStackWithQuery(compoundRaw) {
    const normalized = normalizePepName(compoundRaw);
    const info = lookupPep(normalized);
    const displayName = compoundRaw.trim();
    const disclaimer = '\n\n_Informational only — not medical advice._';

    const disclaimer = '\n\n_Based on published peptide research literature. Informational only — not medical advice._';

    if (!info) {
        return `I don't have receptor class data for "${displayName}" in my local knowledge base — I can't give specific overlap or synergy guidance without it. Ask me the same question in the AI chat (uses your quota) and Claude can pull broader research context. What's your goal with ${displayName}?${disclaimer}`;
    }

    const parts = [];

    // Synergies containing this compound
    const relatedSynergies = STACK_KB.synergies.filter(s => s.compounds.includes(normalized));
    if (relatedSynergies.length > 0) {
        const synergyLines = relatedSynergies.map(s => {
            const partners = s.compounds.filter(c => c !== normalized).map(c => c.toUpperCase()).join(' + ');
            return `• **${partners}** — ${s.note}`;
        }).join('\n');
        parts.push(`**Known synergistic pairings with ${displayName}:**\n${synergyLines}`);
    }

    // Axis-based suggestions
    const axisSet = new Set([info.axis]);
    const axisNormSet = new Set([normalized]);
    const matchedSuggestions = STACK_KB.suggestions.filter(s => s.condition(axisSet, axisNormSet));
    if (matchedSuggestions.length > 0) {
        parts.push(matchedSuggestions.map(s => `**${s.title}:** ${s.body}`).join('\n\n'));
    }

    // Receptor conflict warning (what NOT to add)
    const conflictGroup = STACK_KB.receptorConflicts.find(g => info.receptorClass && g.receptorClasses.includes(info.receptorClass));
    if (conflictGroup) {
        const sameClass = Object.entries(STACK_KB.peptides)
            .filter(([k, v]) => {
                const resolved = v.alias ? STACK_KB.peptides[v.alias] : v;
                return resolved?.receptorClass && conflictGroup.receptorClasses.includes(resolved.receptorClass) && k !== normalized && !v.alias;
            })
            .map(([k]) => k.toUpperCase())
            .slice(0, 3);
        if (sameClass.length > 0) {
            parts.push(`**Avoid stacking with:** ${sameClass.join(', ')} — same receptor class, competing for the same binding site.`);
        }
    }

    if (parts.length === 0) {
        const axisLabels = { gh: 'GH axis', repair: 'tissue repair', metabolic: 'metabolic', sexual: 'sexual health', neuro: 'cognitive', longevity: 'longevity', hormonal: 'hormonal' };
        parts.push(`${displayName} is a ${info.category} compound (${axisLabels[info.axis] || info.axis}). Look for compounds that complement this axis without overlapping at the receptor level. Ask me about a specific compound you're considering.`);
    }

    return parts.join('\n\n') + disclaimer;
}

// ── Firebase callable helper ─────────────────────────────────────────────────

async function getCallable(name) {
    const [{ getFunctions, httpsCallable }, { getApp }] = await Promise.all([
        import('firebase/functions'),
        import('firebase/app'),
    ]);
    const functions = getFunctions(getApp(), 'us-central1');
    return httpsCallable(functions, name);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a prompt to the AI backend (Anthropic Claude via Firebase).
 * `userContext` carries { protocols, stockpile, supplements } for personalized answers.
 */
export async function sendPrompt({ prompt, history = [], conversationId, skipQuota, userContext }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }

    if (!skipQuota && getRemainingQuota() <= 0) {
        throw new Error('Daily AI quota reached. Resets at midnight local time.');
    }

    const cleaned = redactPII(prompt);

    // Easter eggs are handled instantly client-side
    const egg = checkEasterEgg(prompt);
    if (egg) {
        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: egg.response,
                actions: egg.actions || [],
                createdAt: new Date().toISOString(),
            },
            quotaRemaining: getRemainingQuota(),
            conversationId: conversationId || generateId(),
        };
    }

    // Reconstitution math — knowledge-based, simulated research delay
    if (detectReconIntent(prompt)) {
        await new Promise(r => setTimeout(r, 700 + Math.random() * 600));
        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: handleReconQuery(prompt),
                actions: [],
                createdAt: new Date().toISOString(),
            },
            quotaRemaining: getRemainingQuota(),
            conversationId: conversationId || generateId(),
        };
    }

    // "Stack with X?" — knowledge-base synergy lookup, simulated research delay
    const stackWithCompound = detectStackWithIntent(prompt);
    if (stackWithCompound) {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: handleStackWithQuery(stackWithCompound),
                actions: [],
                createdAt: new Date().toISOString(),
            },
            quotaRemaining: getRemainingQuota(),
            conversationId: conversationId || generateId(),
        };
    }

    // Detect protocol creation intent → route to prefillProtocol for structured data
    const protocolCompound = detectProtocolIntent(prompt);
    if (protocolCompound) {
        try {
            const result = await prefillProtocol({ compound: protocolCompound, goal: null, skipQuota: true });
            if (!skipQuota) incrementQuota();
            return {
                message: {
                    id: generateId(),
                    role: 'assistant',
                    content: result.content || `I've pre-filled a protocol for **${protocolCompound}** — tap below to review and adjust.`,
                    actions: [{ type: 'create_protocol', label: `Create ${protocolCompound} protocol`, prefill: result.prefill }],
                    createdAt: new Date().toISOString(),
                },
                quotaRemaining: result.quotaRemaining ?? getRemainingQuota(),
                conversationId: conversationId || generateId(),
            };
        } catch {
            // Fall through to general chat if prefill fails
        }
    }

    // General chat → call Firebase → Anthropic Claude
    try {
        const callChat = await getCallable('aiResearchChat');
        const response = await callChat({ prompt: cleaned, history, conversationId, userContext });
        const data = response?.data || {};

        if (!skipQuota) incrementQuota();

        const content = data.message?.content || '';
        const actions = [];
        if (content.toLowerCase().includes('side effect')) {
            actions.push({ type: 'side_effect_checkin', label: 'Log side effects' });
        }

        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content,
                actions,
                citations: data.message?.citations || [],
                createdAt: data.message?.createdAt || new Date().toISOString(),
            },
            quotaRemaining: data.quotaRemaining ?? getRemainingQuota(),
            conversationId: data.conversationId || conversationId || generateId(),
        };
    } catch (error) {
        const message = error?.message || 'AI chat failed.';
        if (message.toLowerCase().includes('quota')) {
            throw new Error('Daily AI quota reached. Resets at midnight local time.');
        }
        throw new Error(message);
    }
}

/**
 * Generate a structured protocol prefill for a compound via Anthropic Claude.
 */
export async function prefillProtocol({ compound, goal, skipQuota }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }
    if (!compound) throw new Error('Compound is required.');
    if (!skipQuota && getRemainingQuota() <= 0) {
        throw new Error('Daily AI quota reached. Resets at midnight local time.');
    }

    try {
        const callPrefill = await getCallable('aiResearchPrefillProtocol');
        const response = await callPrefill({ compound, goal });
        const data = response?.data || {};

        if (!skipQuota) incrementQuota();

        return {
            prefill: data.prefill || { protocolName: String(compound).slice(0, 48), purpose: goal || '', notes: '' },
            content: data.content,
            disclaimer: data.disclaimer || 'Informational only. Not medical advice.',
            quotaRemaining: data.quotaRemaining ?? getRemainingQuota(),
        };
    } catch (error) {
        const message = error?.message || 'Protocol prefill failed.';
        if (message.toLowerCase().includes('quota')) {
            throw new Error('Daily AI quota reached. Resets at midnight local time.');
        }
        throw new Error(message);
    }
}

// ── Stack analysis knowledge base ────────────────────────────────────────────
// dose: { min, max, unit, typical, maxNote } — used for sanity checking entered doses
// delivery: 'injectable' | 'oral' | 'nasal' | 'topical' — used for site-load check
// cycleType: 'timed' | 'as_needed' — as_needed on a long cycle = mismatch flag
// cycleMin: number (weeks) — flag if cycle set shorter than this

const STACK_KB = {
    peptides: {
        // Tissue repair
        'bpc-157':       { category: 'Tissue repair', axis: 'repair', fastedReq: false, delivery: 'injectable', dose: { min: 200, max: 500, unit: 'mcg', typical: 250, maxNote: 'Beyond 500mcg per dose shows diminishing returns in most literature.' } },
        'bpc157':        { alias: 'bpc-157' },
        'tb-500':        { category: 'Tissue repair', axis: 'repair', fastedReq: false, delivery: 'injectable', dose: { min: 2, max: 5, unit: 'mg', typical: 2.5, maxNote: 'Loading phase (5mg/week) is short-term; maintenance is 2–2.5mg/week.' } },
        'tb500':         { alias: 'tb-500' },
        'thymosin-beta-4': { alias: 'tb-500' },
        'll-37':         { category: 'Tissue repair', axis: 'repair', fastedReq: false, delivery: 'injectable', dose: { min: 0.1, max: 1, unit: 'mg', typical: 0.5, maxNote: 'Doses above 1mg reported to cause flushing and GI upset.' } },
        'ghk-cu':        { category: 'Tissue repair', axis: 'repair', fastedReq: false, delivery: 'topical', dose: { min: 0.1, max: 2, unit: 'mg', typical: 1 } },
        'ghk':           { alias: 'ghk-cu' },

        // GH axis — GHRPs (ghrelin receptor agonists)
        'ipamorelin':    { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true, delivery: 'injectable', dose: { min: 100, max: 300, unit: 'mcg', typical: 200, maxNote: 'Above 300mcg per dose yields diminishing GH returns; most research uses 100–300mcg.' } },
        'ghrp-2':        { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true, delivery: 'injectable', dose: { min: 100, max: 300, unit: 'mcg', typical: 100 } },
        'ghrp-6':        { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true, delivery: 'injectable', dose: { min: 100, max: 300, unit: 'mcg', typical: 100 } },
        'hexarelin':     { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true, delivery: 'injectable', dose: { min: 100, max: 200, unit: 'mcg', typical: 100, maxNote: 'Hexarelin desensitizes faster than other GHRPs — shorter cycles or lower doses reduce tolerance.' } },

        // GH axis — GHRHs (GHRH receptor agonists — synergistic with GHRPs)
        'cjc-1295':      { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRH', fastedReq: true, delivery: 'injectable', dose: { min: 100, max: 300, unit: 'mcg', typical: 100 } },
        'cjc1295':       { alias: 'cjc-1295' },
        'mod-grf':       { alias: 'cjc-1295' },
        'sermorelin':    { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRH', fastedReq: true, delivery: 'injectable', dose: { min: 200, max: 500, unit: 'mcg', typical: 300 } },
        'tesamorelin':   { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRH', fastedReq: true, delivery: 'injectable', dose: { min: 1, max: 2, unit: 'mg', typical: 2 } },

        // GH axis — oral secretagogue (different receptor, no fasting required)
        'mk-677':        { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GH-oral', fastedReq: false, delivery: 'oral', dose: { min: 10, max: 25, unit: 'mg', typical: 10, maxNote: 'Higher doses (25mg+) increase appetite and water retention significantly without proportional GH benefit.' } },
        'ibutamoren':    { alias: 'mk-677' },

        // Metabolic
        'glp-1':         { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1', fastedReq: false, delivery: 'injectable', cycleMin: 12, dose: { min: 0.25, max: 2.4, unit: 'mg', typical: 0.5 } },
        'semaglutide':   { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1', fastedReq: false, delivery: 'injectable', cycleMin: 12, dose: { min: 0.25, max: 2.4, unit: 'mg', typical: 0.5, maxNote: 'Titrate slowly — GI side effects are dose-dependent. Never skip titration steps.' } },
        'ozempic':       { alias: 'semaglutide' },
        'wegovy':        { alias: 'semaglutide' },
        'tirzepatide':   { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1-GIP', fastedReq: false, delivery: 'injectable', cycleMin: 12, dose: { min: 2.5, max: 15, unit: 'mg', typical: 5 } },
        'mounjaro':      { alias: 'tirzepatide' },
        'retatrutide':   { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1-GIP-GCG', fastedReq: false, delivery: 'injectable', cycleMin: 12 },
        'aod-9604':      { category: 'Metabolic', axis: 'metabolic', fastedReq: true, delivery: 'injectable', dose: { min: 250, max: 300, unit: 'mcg', typical: 250 } },

        // Sexual health
        'pt-141':        { category: 'Sexual health', axis: 'sexual', fastedReq: false, delivery: 'injectable', cycleType: 'as_needed', dose: { min: 0.5, max: 2, unit: 'mg', typical: 1, maxNote: 'Start with a 0.5mg test dose. Nausea and flushing are common above 1.5mg.' } },
        'bremelanotide': { alias: 'pt-141' },
        'melanotan-ii':  { category: 'Sexual health', axis: 'sexual', fastedReq: false, delivery: 'injectable', cycleType: 'as_needed', dose: { min: 0.25, max: 1, unit: 'mg', typical: 0.5, maxNote: 'Always start with a 0.25mg test dose — nausea and spontaneous erections common at higher doses.' } },
        'mt-2':          { alias: 'melanotan-ii' },
        'mt2':           { alias: 'melanotan-ii' },

        // Cognitive / neuroprotection
        'semax':         { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'nasal', dose: { min: 0.1, max: 0.6, unit: 'mg', typical: 0.3 } },
        'selank':        { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'nasal', dose: { min: 0.25, max: 3, unit: 'mg', typical: 0.75 } },
        'dihexa':        { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'oral', dose: { min: 10, max: 50, unit: 'mg', typical: 10 } },
        'noopept':       { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'oral', dose: { min: 10, max: 30, unit: 'mg', typical: 10 } },
        'dsip':          { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'injectable', dose: { min: 0.5, max: 2, unit: 'mg', typical: 1 } },

        // Longevity / epigenetic
        'epithalon':     { category: 'Longevity', axis: 'longevity', fastedReq: false, delivery: 'injectable', dose: { min: 5, max: 10, unit: 'mg', typical: 10 } },
        'epitalon':      { alias: 'epithalon' },

        // Hormonal support / PCT
        'kisspeptin':    { category: 'Hormonal', axis: 'hormonal', fastedReq: false, delivery: 'injectable' },
        'gonadorelin':   { category: 'Hormonal', axis: 'hormonal', fastedReq: false, delivery: 'injectable', dose: { min: 50, max: 100, unit: 'mcg', typical: 100 } },
        'hcg':           { category: 'Hormonal', axis: 'hormonal', fastedReq: false, delivery: 'injectable' },

        // Immune / anti-inflammatory
        'thymosin-alpha-1': { category: 'Immune support', axis: 'immune', fastedReq: false, delivery: 'injectable', dose: { min: 0.9, max: 1.8, unit: 'mg', typical: 1.8 } },
        'ta-1':          { alias: 'thymosin-alpha-1' },
        'ta1':           { alias: 'thymosin-alpha-1' },
        'kpv':           { category: 'Anti-inflammatory', axis: 'repair', fastedReq: false, delivery: 'injectable', dose: { min: 0.5, max: 2, unit: 'mg', typical: 1 } },
        'vip':           { category: 'Anti-inflammatory', axis: 'immune', fastedReq: false, delivery: 'injectable', dose: { min: 50, max: 200, unit: 'mcg', typical: 100 } },
        'vasoactive-intestinal-peptide': { alias: 'vip' },
        'll-37':         { category: 'Immune support', axis: 'immune', fastedReq: false, delivery: 'injectable', dose: { min: 0.1, max: 1, unit: 'mg', typical: 0.5, maxNote: 'Doses above 1mg reported to cause flushing and GI upset.' } },

        // Mitochondrial / metabolic
        'mots-c':        { category: 'Mitochondrial', axis: 'metabolic', fastedReq: true, delivery: 'injectable', dose: { min: 5, max: 15, unit: 'mg', typical: 5 } },
        'motsc':         { alias: 'mots-c' },

        // Cognitive / neuro (extended)
        'pe-22-28':      { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'injectable', dose: { min: 0.5, max: 2, unit: 'mg', typical: 1 } },
        'pe2228':        { alias: 'pe-22-28' },
        'adamax':        { category: 'Cognitive', axis: 'neuro', fastedReq: false, delivery: 'injectable' },

        // Metabolic — dual/triple agonists
        'survodutide':   { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1-GCG', fastedReq: false, delivery: 'injectable', cycleMin: 12 },
        'mazdutide':     { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1-GCGRa', fastedReq: false, delivery: 'injectable', cycleMin: 12 },
        'cagrilintide':  { category: 'Metabolic', axis: 'metabolic', fastedReq: false, delivery: 'injectable', cycleMin: 12, dose: { min: 0.16, max: 2.4, unit: 'mg', typical: 1.2 } },

        // Cardiac / longevity peptides (Khavinson / epigenetic series)
        'vilon':         { category: 'Longevity', axis: 'longevity', fastedReq: false, delivery: 'injectable', dose: { min: 0.1, max: 1, unit: 'mg', typical: 0.5 } },
        'cardiogen':     { category: 'Cardiac support', axis: 'longevity', fastedReq: false, delivery: 'injectable', dose: { min: 0.1, max: 1, unit: 'mg', typical: 0.5 } },

        // Common supplements tracked alongside peptides
        'vitamin-c':     { category: 'Supplement', axis: 'supplement', fastedReq: false, delivery: 'oral' },
        'vitamin-c-':    { alias: 'vitamin-c' },
        'zinc':          { category: 'Supplement', axis: 'supplement', fastedReq: false, delivery: 'oral' },
        'glutathione':   { category: 'Supplement', axis: 'supplement', fastedReq: false, delivery: 'oral' },
        'nac':           { category: 'Supplement', axis: 'supplement', fastedReq: false, delivery: 'oral' },
        'n-acetyl-cysteine': { alias: 'nac' },

        // NAD / longevity support
        'nad':           { category: 'Longevity', axis: 'longevity', fastedReq: false, delivery: 'injectable' },
        'nmn':           { category: 'Longevity', axis: 'longevity', fastedReq: false, delivery: 'oral' },
        'nr':            { category: 'Longevity', axis: 'longevity', fastedReq: false, delivery: 'oral' },
    },

    // Two+ from the same receptor group = diminishing returns / conflict
    receptorConflicts: [
        {
            receptorClasses: ['GHRP'],
            caution: 'Both are GHRPs — they compete for the same ghrelin receptor. Running two GHRPs adds minimal benefit over one alone. The standard approach is one GHRP paired with a GHRH (like CJC-1295) to hit two different receptors and genuinely amplify the GH pulse.',
        },
        {
            receptorClasses: ['GHRH'],
            caution: 'Both are GHRH analogs hitting the same receptor — stacking them is redundant. One GHRH + one GHRP is the established synergistic pairing.',
        },
        {
            receptorClasses: ['GLP1', 'GLP1-GIP'],
            caution: 'Running two GLP-1 receptor agonists simultaneously is not recommended — they overlap at the receptor level and significantly multiply GI side effect risk. Use one at a time.',
        },
    ],

    // Confirmed synergistic pairings (different mechanisms, same goal)
    synergies: [
        {
            compounds: ['ipamorelin', 'cjc-1295'],
            label: 'GHRP + GHRH (GH axis)',
            note: 'Classic synergistic pair. Ipamorelin triggers the pituitary to release GH; CJC-1295 amplifies the pulse amplitude — they bind different receptors and genuinely multiply each other\'s effect. Dose together, fasted, ideally at bedtime.',
        },
        {
            compounds: ['ghrp-2', 'cjc-1295'],
            label: 'GHRP + GHRH (GH axis)',
            note: 'Strong synergistic pair. GHRP-2 produces a more aggressive GH pulse than Ipamorelin and pairs cleanly with CJC-1295 on a separate receptor. More appetite stimulation than Ipamorelin — factor that in. Fasted dosing is critical.',
        },
        {
            compounds: ['ghrp-6', 'cjc-1295'],
            label: 'GHRP + GHRH (GH axis)',
            note: 'GHRP-6 produces a strong GH pulse and significant appetite stimulation — useful in a bulking context. Pairs cleanly with CJC-1295 on a separate receptor for true synergy.',
        },
        {
            compounds: ['bpc-157', 'tb-500'],
            label: 'Tissue repair combo',
            note: 'Different mechanisms, same goal — genuinely complementary, not redundant. BPC-157 works locally: collagen synthesis, tendon repair, gut lining. TB-500 is systemic: drives cell migration, angiogenesis, and anti-inflammatory response. This is one of the most well-documented peptide stacks.',
        },
        {
            compounds: ['ipamorelin', 'cjc-1295', 'mk-677'],
            label: 'Full GH axis coverage',
            note: 'Triple GH axis stack. The injectable GHRP/GHRH pair provides pulsatile nighttime GH release; MK-677 (oral, daily) maintains baseline GH elevation throughout the day via a different receptor. Comprehensive coverage for body composition cycles.',
        },
    ],

    // What to add based on current stack axes
    suggestions: [
        {
            condition: (axes, set) => axes.has('gh') && !axes.has('repair'),
            title: 'Complement your GH stack',
            body: 'BPC-157 is a natural addition to a GH axis stack — it accelerates collagen turnover and gut integrity, amplifying recovery response alongside GH optimization. No timing conflict; can be dosed independently.',
        },
        {
            condition: (axes, set) => axes.has('repair') && !axes.has('gh'),
            title: 'Accelerate your repair stack',
            body: 'A GHRP + GHRH pair (Ipamorelin + CJC-1295) is a natural complement to tissue repair — GH pulses directly accelerate collagen synthesis and enhance the healing response your repair stack is already targeting.',
        },
        {
            condition: (axes, set) => axes.has('gh') && !set.has('mk-677') && !set.has('ibutamoren') && (set.has('ipamorelin') || set.has('ghrp-2') || set.has('ghrp-6')) && (set.has('cjc-1295') || set.has('sermorelin')),
            title: 'Extended GH coverage',
            body: 'MK-677 (oral, daily) would extend GH elevation into waking hours. The injectable GHRP/GHRH you\'re running provides pulsatile nighttime release; MK-677 adds sustained daytime baseline elevation through a different receptor. No conflict.',
        },
        {
            condition: (axes) => axes.has('metabolic') && !axes.has('repair'),
            title: 'GI protection during metabolic cycle',
            body: 'BPC-157 is frequently added alongside GLP-1 agonists to protect gut lining and reduce GI side effects — particularly valuable during the titration phase when sensitivity is highest.',
        },
    ],

    // Follow-up protocols after washout
    followups: {
        repair: 'After a tissue repair cycle, Epithalon is a popular washout-window compound — no receptor conflict with repair peptides, used for cellular recovery and telomere support. A 3–4 week course during washout is a common pattern.',
        gh: 'Standard washout after a GH axis cycle is 4–8 weeks. Common follow-up options: restart the same stack, rotate to Sermorelin for a lighter maintenance phase, or cycle in MK-677 as a bridge before the next injectable run.',
        metabolic: 'After a GLP-1 cycle, most researchers run a diet-focused maintenance window before the next cycle. AOD-9604 is sometimes used as a lower-intervention bridge for continued fat metabolism support.',
        neuro: 'Cognitive stacks (Semax/Selank) are often run in shorter cycles (4–6 weeks). After washout, many rotate between the two — Semax is more stimulating and focus-oriented; Selank leans anxiolytic and recovery-oriented.',
    },
};

function normalizePepName(name) {
    return (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').trim();
}

function lookupPep(normalized) {
    const e = STACK_KB.peptides[normalized];
    if (!e) return null;
    return e.alias ? (STACK_KB.peptides[e.alias] || null) : e;
}

function getRecentHistory() {
    try {
        const raw = localStorage.getItem('tpprover_protocol_history');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function buildStackSections(protocols, supplements) {
    const allProtocols = Array.isArray(protocols) ? protocols : [];
    const allSupplements = Array.isArray(supplements) ? supplements : [];

    // Separate active from inactive
    const activeProtocols = allProtocols.filter(p => p.active === true);
    const inactiveProtocols = allProtocols.filter(p => !p.active);

    // Flatten peptide entries — primary analysis is on ACTIVE protocols only
    const entries = [];
    activeProtocols.forEach(proto => {
        (proto.peptides || []).forEach(pep => {
            const raw = (pep.name || '').trim();
            if (!raw) return;
            const normalized = normalizePepName(raw);
            const info = lookupPep(normalized);
            entries.push({ name: raw, normalized, info, proto, pep });
        });
    });

    // Also collect inactive protocol compound names for washout cross-reference
    const inactiveEntries = [];
    inactiveProtocols.forEach(proto => {
        (proto.peptides || []).forEach(pep => {
            const raw = (pep.name || '').trim();
            if (!raw) return;
            const normalized = normalizePepName(raw);
            const info = lookupPep(normalized);
            inactiveEntries.push({ name: raw, normalized, info, proto, pep });
        });
    });

    if (entries.length === 0 && allSupplements.length === 0) {
        // Check if everything is inactive (might be in washout)
        if (inactiveEntries.length > 0) {
            const names = [...new Set(inactiveEntries.map(e => e.name))].join(' · ');
            return {
                summary: 'No active protocols.',
                sections: [{
                    type: 'note',
                    title: 'All protocols currently inactive',
                    body: `${names} — your protocols are inactive. If you're in a washout period, that's intentional — receptor sensitivity is restoring. When you're ready to restart or start a new cycle, PiP can help plan it. Ask: "what should I run after a washout?"`,
                    level: 'info',
                }],
            };
        }
        return {
            summary: 'No compounds found in your protocols.',
            sections: [{
                type: 'note',
                title: 'Nothing to analyze yet',
                body: 'Add compound names to your protocol entries and PiP can check for receptor overlap, synergistic pairings, timing notes, and suggest what else might round out your stack.',
                level: 'info',
            }],
        };
    }

    const knownEntries = entries.filter(e => e.info);
    const normalizedSet = new Set(entries.map(e => e.normalized));
    const axes = new Set(knownEntries.map(e => e.info.axis).filter(Boolean));
    const sections = [];

    // Cross-reference inactive protocols — detect likely washout window
    if (inactiveProtocols.length > 0) {
        const history = getRecentHistory();
        const washoutProtocols = inactiveProtocols.filter(proto => {
            // Check recent history for this protocol ending within the last 12 weeks
            const recentEntry = history.find(h => h.protocolId === proto.id || h.protocolName === (proto.name || proto.protocolName));
            if (recentEntry?.endDate) {
                const daysSinceEnd = Math.floor((Date.now() - new Date(recentEntry.endDate).getTime()) / 86400000);
                return daysSinceEnd >= 0 && daysSinceEnd <= 84;
            }
            return false;
        });

        const inactiveNotWashout = inactiveProtocols.filter(p => !washoutProtocols.includes(p));

        if (washoutProtocols.length > 0) {
            const names = washoutProtocols.map(p => p.name || p.protocolName).filter(Boolean).join(', ');
            sections.push({
                type: 'note',
                title: 'In washout / recovery',
                body: `${names} — recently ended, likely in a washout window. This is the right time to let receptor sensitivity restore before restarting. Ask PiP "when should I restart?" for timing guidance based on the compounds involved.`,
                level: 'info',
            });
        }

        if (inactiveNotWashout.length > 0) {
            const names = inactiveNotWashout.map(p => p.name || p.protocolName).filter(Boolean).join(', ');
            const inactiveCompoundNames = [...new Set(inactiveNotWashout.flatMap(p => (p.peptides || []).map(pep => pep.name).filter(Boolean)))];
            const complementary = inactiveCompoundNames.filter(n => {
                const norm = normalizePepName(n);
                const inf = lookupPep(norm);
                if (!inf || !inf.axis) return false;
                return !axes.has(inf.axis);
            });
            if (complementary.length > 0) {
                sections.push({
                    type: 'suggestion',
                    title: 'Inactive protocols worth revisiting',
                    body: `**${names}** — these protocols are inactive but contain compounds (${complementary.join(', ')}) that could complement your current active stack without receptor conflict. Consider activating one or asking PiP about stacking strategy.`,
                    level: 'info',
                });
            }
        }
    }

    // 1. Receptor overlap (bad — different mechanism, same receptor)
    const overlapNotes = [];
    STACK_KB.receptorConflicts.forEach(group => {
        const matching = knownEntries.filter(e => e.info.receptorClass && group.receptorClasses.includes(e.info.receptorClass));
        if (matching.length >= 2) overlapNotes.push(group.caution);
    });
    if (overlapNotes.length > 0) {
        sections.push({
            type: 'overlap',
            title: 'Receptor overlap — review needed',
            body: overlapNotes.join(' '),
            level: 'warning',
        });
    }

    // 2. Synergistic pairs (same goal, different mechanism — intentional and good)
    const synergyNotes = [];
    STACK_KB.synergies.forEach(syn => {
        if (syn.compounds.every(c => normalizedSet.has(c))) {
            synergyNotes.push(syn.note);
        }
    });
    if (synergyNotes.length > 0) {
        sections.push({
            type: 'synergy',
            title: synergyNotes.length > 1 ? 'Multiple synergies confirmed' : 'Synergistic pairing confirmed',
            body: synergyNotes.join('\n\n'),
            level: 'good',
        });
    }

    // 3. Compounds to consider adding
    const suggestionBodies = [];
    STACK_KB.suggestions.forEach(s => {
        if (s.condition(axes, normalizedSet)) {
            suggestionBodies.push({ title: s.title, body: s.body });
        }
    });
    if (suggestionBodies.length > 0) {
        sections.push({
            type: 'suggestion',
            title: 'What to consider adding',
            body: suggestionBodies.map(s => `**${s.title}:** ${s.body}`).join('\n\n'),
            level: 'info',
        });
    }

    // 4. Follow-up after this cycle
    const followupBodies = [...axes].map(a => STACK_KB.followups[a]).filter(Boolean);
    if (followupBodies.length > 0) {
        sections.push({
            type: 'followup',
            title: 'After this cycle',
            body: followupBodies.join('\n\n'),
            level: 'info',
        });
    }

    // 5. Dosage sanity check
    const dosageFlags = [];
    knownEntries.forEach(e => {
        if (!e.info.dose || !e.pep.dosage?.amount) return;
        const amount = parseFloat(e.pep.dosage.amount);
        if (isNaN(amount) || amount <= 0) return;
        const { max, unit, maxNote } = e.info.dose;
        const pepUnit = (e.pep.dosage.unit || '').toLowerCase().replace(/[^a-z]/g, '');
        const infoUnit = unit.toLowerCase().replace(/[^a-z]/g, '');
        if (pepUnit === infoUnit && amount > max * 1.1) {
            dosageFlags.push(`${e.name} is set to ${amount}${unit} — typical ceiling is ${max}${unit}. ${maxNote || 'Verify this is intentional.'}`);
        }
    });
    if (dosageFlags.length > 0) {
        sections.push({
            type: 'caution',
            title: 'Dosage above typical ceiling',
            body: dosageFlags.join(' '),
            level: 'warning',
        });
    }

    // 6. Cycle length vs. goal mismatch
    const cycleMismatches = [];
    allProtocols.forEach(proto => {
        (proto.peptides || []).forEach(pep => {
            const info = lookupPep(normalizePepName(pep.name || ''));
            if (!info || !proto.duration || proto.duration.noEnd) return;
            const count = parseInt(proto.duration?.count) || 0;
            const unit = proto.duration?.unit || 'weeks';
            const durationWeeks = unit === 'weeks' ? count : unit === 'months' ? count * 4 : Math.round(count / 7);

            if (info.cycleType === 'as_needed' && durationWeeks > 4) {
                cycleMismatches.push(`${pep.name} is an as-needed compound — it's dosed per occasion, not on a fixed cycle schedule. A ${count}-${unit} cycle doesn't apply here.`);
            } else if (info.cycleMin && durationWeeks > 0 && durationWeeks < info.cycleMin) {
                cycleMismatches.push(`${pep.name} is set to ${count} ${unit} — meaningful results for this compound typically require ${info.cycleMin}+ weeks minimum.`);
            }
        });
    });
    if (cycleMismatches.length > 0) {
        sections.push({
            type: 'caution',
            title: 'Cycle length mismatch',
            body: cycleMismatches.join(' '),
            level: 'caution',
        });
    }

    // 7. Injection site load
    const injectables = knownEntries.filter(e => e.info.delivery === 'injectable');
    if (injectables.length >= 3) {
        sections.push({
            type: 'note',
            title: 'Site rotation',
            body: `${injectables.length} injectable compounds in this stack. Site rotation becomes critical at this load — track injection sites to avoid PIP and localized irritation. Common rotation: abdomen quadrants, glutes, thighs, deltoids. Give each site at least 72 hours before re-using.`,
            level: 'info',
        });
    }

    // 8. Timing — one note, no name repetition
    const timingNotes = [];
    const ghFasted = knownEntries.filter(e => e.info.fastedReq && e.info.axis === 'gh');
    if (ghFasted.length > 0) {
        timingNotes.push('GH-axis compounds require fasted dosing — insulin blunts the GH response. A minimum 2-hour post-meal window; bedtime fasted is the most common and effective window for these.');
    }
    const amCount = entries.filter(e => (e.pep.frequency?.time || []).includes('AM')).length;
    if (amCount >= 4) {
        timingNotes.push(`${amCount} compounds are all scheduled AM. Consider splitting some to PM to reduce simultaneous peak load and make individual side effect tracking cleaner.`);
    }
    if (timingNotes.length > 0) {
        sections.push({
            type: 'timing',
            title: 'Timing notes',
            body: timingNotes.join(' '),
            level: 'caution',
        });
    }

    // 9. Missing washout on long cycles (active only)
    const missingWashout = activeProtocols.filter(p => {
        if (!p.active || !p.duration || p.duration.noEnd) return false;
        const count = parseInt(p.duration?.count) || 0;
        const unit = p.duration?.unit || 'weeks';
        const days = unit === 'weeks' ? count * 7 : unit === 'months' ? count * 30 : count;
        return days >= 84 && !p.washout?.enabled;
    });
    if (missingWashout.length > 0) {
        sections.push({
            type: 'caution',
            title: 'Washout not planned',
            body: `${missingWashout.length > 1 ? 'Several protocols are' : 'This protocol is'} 12+ weeks with no washout period set. Extended cycles benefit from a scheduled break to restore receptor sensitivity before the next run — add a washout in your protocol settings.`,
            level: 'caution',
        });
    }

    // 11. All clear fallback
    if (sections.length === 0) {
        sections.push({
            type: 'synergy',
            title: 'Stack looks clean',
            body: 'No receptor conflicts, timing clusters, or missing washout plans detected. Keep logging side effects per compound independently so you can isolate anything that changes.',
            level: 'good',
        });
    }

    // Summary line — compound names appear ONCE here only
    const compoundNames = [...new Set(entries.map(e => e.name))];
    const axisLabels = { gh: 'GH axis', repair: 'tissue repair', metabolic: 'metabolic', sexual: 'sexual health', neuro: 'cognitive', longevity: 'longevity', hormonal: 'hormonal', immune: 'immune support', supplement: 'supplements' };
    const knownAxes = new Set(knownEntries.filter(e => e.info.axis !== 'supplement').map(e => e.info.axis).filter(Boolean));
    const axisDescription = [...knownAxes].map(a => axisLabels[a] || a).join(' + ') || 'custom stack';
    const summary = `${compoundNames.join(' · ')} — ${axisDescription}.`;

    return { summary, sections };
}

/**
 * Analyze the user's stack. Uses knowledge-based local analysis (immediate,
 * domain-accurate) while the Claude backend wiring is finalized.
 */
export async function analyzeStack({ protocols = [], supplements = [] }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }
    if (getRemainingQuota() <= 0) {
        throw new Error('Daily AI quota reached. Resets at midnight local time.');
    }

    await new Promise(r => setTimeout(r, 350 + Math.random() * 250));
    incrementQuota();

    const { summary, sections } = buildStackSections(protocols, supplements);

    return {
        summary,
        sections,
        disclaimer: 'Informational only. Not medical advice.',
    };
}

// ── Conversation & library persistence ──────────────────────────────────────

export function loadConversations() {
    try {
        const raw = localStorage.getItem(CONVERSATIONS_KEY);
        return raw ? JSON.parse(raw) || [] : [];
    } catch { return []; }
}

export function persistConversations(list) {
    try {
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list || []));
    } catch { /* ignore */ }
}

export function loadLibrary() {
    try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        return raw ? JSON.parse(raw) || [] : [];
    } catch { return []; }
}

export function persistLibrary(list) {
    try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(list || []));
    } catch { /* ignore */ }
}

export default {
    sendPrompt,
    prefillProtocol,
    analyzeStack,
    getRemainingQuota,
    incrementQuota,
    setQuotaLimit,
    loadConversations,
    persistConversations,
    loadLibrary,
    persistLibrary,
    AI_DAILY_QUOTA,
    hasSeenGreeting,
    markGreetingSeen,
};
