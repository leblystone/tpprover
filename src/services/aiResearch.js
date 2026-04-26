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

function today() {
    return new Date().toISOString().slice(0, 10);
}

export function getRemainingQuota() {
    try {
        const raw = localStorage.getItem(DAILY_QUOTA_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (!data || data.date !== today()) return AI_DAILY_QUOTA;
        return Math.max(0, AI_DAILY_QUOTA - (data.count || 0));
    } catch {
        return AI_DAILY_QUOTA;
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

const STACK_KB = {
    peptides: {
        // Tissue repair
        'bpc-157':       { category: 'Tissue repair', axis: 'repair', fastedReq: false },
        'bpc157':        { alias: 'bpc-157' },
        'tb-500':        { category: 'Tissue repair', axis: 'repair', fastedReq: false },
        'tb500':         { alias: 'tb-500' },
        'thymosin-beta-4': { alias: 'tb-500' },

        // GH axis — GHRPs (ghrelin receptor agonists)
        'ipamorelin':    { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true },
        'ghrp-2':        { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true },
        'ghrp-6':        { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true },
        'hexarelin':     { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRP', fastedReq: true },

        // GH axis — GHRHs (GHRH receptor agonists — synergistic with GHRPs)
        'cjc-1295':      { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRH', fastedReq: true },
        'cjc1295':       { alias: 'cjc-1295' },
        'mod-grf':       { alias: 'cjc-1295' },
        'sermorelin':    { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRH', fastedReq: true },
        'tesamorelin':   { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GHRH', fastedReq: true },

        // GH axis — oral secretagogue (different receptor, no fasting required)
        'mk-677':        { category: 'GH secretagogue', axis: 'gh', receptorClass: 'GH-oral', fastedReq: false },
        'ibutamoren':    { alias: 'mk-677' },

        // Metabolic
        'glp-1':         { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1', fastedReq: false },
        'semaglutide':   { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1', fastedReq: false },
        'tirzepatide':   { category: 'Metabolic', axis: 'metabolic', receptorClass: 'GLP1-GIP', fastedReq: false },
        'aod-9604':      { category: 'Metabolic', axis: 'metabolic', fastedReq: true },

        // Sexual health
        'pt-141':        { category: 'Sexual health', axis: 'sexual', fastedReq: false },
        'bremelanotide': { alias: 'pt-141' },

        // Cognitive / neuroprotection
        'semax':         { category: 'Cognitive', axis: 'neuro', fastedReq: false },
        'selank':        { category: 'Cognitive', axis: 'neuro', fastedReq: false },
        'dihexa':        { category: 'Cognitive', axis: 'neuro', fastedReq: false },
        'noopept':       { category: 'Cognitive', axis: 'neuro', fastedReq: false },

        // Longevity / epigenetic
        'epithalon':     { category: 'Longevity', axis: 'longevity', fastedReq: false },
        'epitalon':      { alias: 'epithalon' },

        // Hormonal support
        'kisspeptin':    { category: 'Hormonal', axis: 'hormonal', fastedReq: false },
        'gonadorelin':   { category: 'Hormonal', axis: 'hormonal', fastedReq: false },
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

function buildStackSections(protocols, supplements) {
    const allProtocols = Array.isArray(protocols) ? protocols : [];
    const allSupplements = Array.isArray(supplements) ? supplements : [];

    // Flatten all peptide entries
    const entries = [];
    allProtocols.forEach(proto => {
        (proto.peptides || []).forEach(pep => {
            const raw = (pep.name || '').trim();
            if (!raw) return;
            const normalized = normalizePepName(raw);
            const info = lookupPep(normalized);
            entries.push({ name: raw, normalized, info, proto, pep });
        });
    });

    if (entries.length === 0 && allSupplements.length === 0) {
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

    // 5. Timing — one note, no name repetition
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

    // 6. Missing washout on long cycles
    const missingWashout = allProtocols.filter(p => {
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

    // 7. Unknown compounds note
    const unknownNames = [...new Set(entries.filter(e => !e.info).map(e => e.name))];
    if (unknownNames.length > 0) {
        sections.push({
            type: 'note',
            title: 'Not in knowledge base',
            body: `${unknownNames.join(', ')} — PiP doesn't have receptor class data for ${unknownNames.length > 1 ? 'these compounds' : 'this compound'} yet. Overlap and interaction analysis is unavailable; verify manually.`,
            level: 'info',
        });
    }

    // 8. All clear fallback
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
    const axisLabels = { gh: 'GH axis', repair: 'tissue repair', metabolic: 'metabolic', sexual: 'sexual health', neuro: 'cognitive', longevity: 'longevity', hormonal: 'hormonal' };
    const axisDescription = [...axes].map(a => axisLabels[a] || a).join(' + ') || 'custom stack';
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
    loadConversations,
    persistConversations,
    loadLibrary,
    persistLibrary,
    AI_DAILY_QUOTA,
    hasSeenGreeting,
    markGreetingSeen,
};
