/**
 * AI Research service layer.
 *
 * PiP dual-provider router:
 *   RESEARCH  → Gemini + Google Search (compound lookup, prefill)
 *   REASONING → Claude Haiku/Sonnet (chat, stack narrative, recon explain)
 *   MATH      → Local calculateRecon() — AI never does arithmetic
 */
import { featureFlags } from '../config/featureFlags';
import { generateId } from '../utils/string';
import { calculateRecon } from '../utils/recon';
import { savePipChatToResearchNotes } from '../utils/researchNotes';

const DAILY_QUOTA_KEY = 'tpprover_ai_daily_quota';
const LIBRARY_KEY = 'tpprover_ai_library';
const CONVERSATIONS_KEY = 'tpprover_ai_conversations';
const PIP_GREETED_KEY = 'tpprover_pip_greeted';

export const AI_DAILY_QUOTA = 25;

let _quotaLimit = AI_DAILY_QUOTA;

export function setQuotaLimit(limit) {
    _quotaLimit = (typeof limit === 'number' && limit > 0) ? limit : AI_DAILY_QUOTA;
}

export function saveToLibrary(entry) {
    try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        localStorage.setItem(LIBRARY_KEY, JSON.stringify([entry, ...existing].slice(0, 200)));
    } catch { /* noop */ }
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
        match: /what'?s? a pip\b/i,
        simulateDelayBeforeReply: true,
        response: `Great question — two answers:\n\n💉 **PIP the injection thing:** Post-Injection Pain. The lovely soreness you get after pinning. It's real, it's annoying, and it's usually from carrier oil, injection speed, or site rotation. Log it here and we'll track patterns.\n\n🐐 **PiP the app:** That's me. Your Peptide Planner. I help you track protocols, analyze your stack, calculate recon math, and spot side effect patterns — without making your leg sore.\n\nYou're welcome for the clarity. What can I help with?`,
    },
    {
        match: /\bwhat (?:can you|do you) (?:do|help|offer|know)|your (?:features|capabilities)|help me understand|how (?:do|does) pip work/i,
        simulateDelayBeforeReply: true,
        response: `🧪 **Here's what I do:**\n\n**Stack analysis** — Ask me to analyze your active protocols. I'll flag receptor conflicts, synergistic pairings, timing issues, and suggest what to add.\n\n**Recon math** — Drop a vial size, BAC water amount, and target dose and I'll calculate the exact draw in seconds.\n\n**Stacking help** — Ask "what can I stack with BPC-157?" and I'll give you science-backed pairings and what to avoid.\n\n**Side effect logging** — I'll prompt you to check in, or you can log manually from the dashboard or Wellness tab.\n\n**Protocol suggestions** — Ask me to suggest or build a protocol for a specific goal.\n\n_Informational only. Not medical advice._`,
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

/** Pattern-based intent classifier — no API call. */
export function classifyIntent(prompt) {
    if (detectProtocolIntent(prompt)) return 'PREFILL';
    if (detectCompoundInfoIntent(prompt)) return 'RESEARCH';
    if (/\bhalf[- ]?life\b|\belimination half\b|\bhow long does .+ stay/i.test(prompt)) return 'RESEARCH';
    if (/\b(side effects?|interactions?|drug interaction|mechanism of action|how does .+ work|what is |what are |tell me about|explain |research on|dosing range|typical dose|pharmacology|stacks? with|pair with|combine with)\b/i.test(prompt)) {
        if (!detectReconIntent(prompt)) return 'RESEARCH';
    }
    return 'CHAT';
}

// ── Reconstitution math (local calc + Claude explanation) ───────────────────

function detectReconIntent(prompt) {
    return /reconstitut|bac water|bacteriostatic|how much water|units per|iu per|concentration|dilut|mixing|draw up/i.test(prompt);
}

function parseReconNumbers(prompt) {
    const mgMatches = [...prompt.matchAll(/(\d+(?:\.\d+)?)\s*mg\b/gi)].map(m => parseFloat(m[1]));
    const mlMatches = [...prompt.matchAll(/(\d+(?:\.\d+)?)\s*(?:ml|cc)\b/gi)].map(m => parseFloat(m[1]));
    const mcgMatches = [...prompt.matchAll(/(\d+(?:\.\d+)?)\s*(?:mcg|μg|ug)\b/gi)].map(m => parseFloat(m[1]));
    return {
        vialMg: mgMatches[0] ?? null,
        waterMl: mlMatches[0] ?? null,
        desiredMcg: mcgMatches[0] ?? null,
        desiredMg: mgMatches[1] ?? null,
    };
}

function buildReconFallbackText({ vialMg, waterMl, desiredMcg, desiredMg, concentrationMcgPerMl, unitsToDraw }) {
    const disclaimer = '\n\n_Calculation based on standard pharmacology reconstitution guidelines. Double-check before drawing. Not medical advice._';
    let body = `🧪 **${vialMg}mg + ${waterMl}ml BAC water**\nConcentration: **${concentrationMcgPerMl.toFixed(0)} mcg/ml**\n\n`;

    if (desiredMcg && unitsToDraw) {
        const volMl = unitsToDraw / 100;
        body += `💉 **For ${desiredMcg}mcg:**\n• Draw **${unitsToDraw.toFixed(1)} units** on a U100 insulin syringe\n• That's **${volMl.toFixed(3)} ml** on a standard syringe`;
    } else if (desiredMg && desiredMg < vialMg && unitsToDraw) {
        const volMl = unitsToDraw / 100;
        body += `💉 **For ${desiredMg}mg:**\n• Draw **${unitsToDraw.toFixed(1)} units** on a U100 insulin syringe\n• That's **${volMl.toFixed(3)} ml** on a standard syringe`;
    } else {
        const commonMcg = [100, 200, 250, 300, 500].filter(d => d <= vialMg * 1000);
        body += `💉 **Common doses — U100 syringe:**\n${commonMcg.map(mcg => {
            const units = ((mcg / 1000) / (vialMg / waterMl)) * 100;
            return `• **${mcg}mcg** → ${units.toFixed(1)} units`;
        }).join('\n')}\n\nTell me your target dose and I'll nail it down exactly.`;
    }
    return body + disclaimer;
}

async function handleReconQuery(prompt, { userContext, skipQuota } = {}) {
    const { vialMg, waterMl, desiredMcg, desiredMg } = parseReconNumbers(prompt);
    if (!vialMg || !waterMl) return null;

    const concentrationMcgPerMl = (vialMg / waterMl) * 1000;
    const doseMcg = desiredMcg ?? (desiredMg && desiredMg < vialMg ? desiredMg * 1000 : null);

    let unitsToDraw = null;
    let dosesPerVial = null;
    if (doseMcg) {
        const calc = calculateRecon({ mg: vialMg, water: waterMl, dose: doseMcg, doseUnit: 'mcg' });
        unitsToDraw = calc.unitsPerDose;
        dosesPerVial = calc.dosesPerVial;
    }

    const facts = {
        vialMg,
        waterMl,
        desiredMcg: desiredMcg ?? null,
        desiredMg: desiredMg ?? null,
        concentrationMcgPerMl: Number(concentrationMcgPerMl.toFixed(2)),
        unitsToDraw: unitsToDraw != null ? Number(unitsToDraw.toFixed(2)) : null,
        mlToDraw: unitsToDraw != null ? Number((unitsToDraw / 100).toFixed(4)) : null,
        dosesPerVial,
    };

    const fallback = buildReconFallbackText({ ...facts, desiredMcg, desiredMg });

    try {
        const result = await _callableChat({
            prompt: `The user asked about reconstitution. Use these EXACT calculated numbers — do not recalculate or change them:\n${JSON.stringify(facts, null, 2)}\n\nOriginal question: ${prompt}\n\nExplain in PiP's voice with practical recon tips (inject against vial wall, swirl don't shake). Include draw volume in U100 units.`,
            history: [],
            conversationId: null,
            userContext,
            skipQuota: true,
        });
        return result.message?.content || fallback;
    } catch {
        return fallback;
    }
}

// ── "Tell me about X" handler (client-side) ──────────────────────────────────

function detectCompoundInfoIntent(prompt) {
    // Pattern 1: "tell me about X", "what is X", "how does X work", etc.
    const m1 = prompt.match(
        /(?:tell me about|what (?:is|are)|explain|describe|info (?:on|about)|details (?:on|about)|how does|what does|what'?s)\s+(.+?)(?:\s+(?:do|work|work\s+for|peptide|compound))?[?.!,\s]*$/i
    );
    // Pattern 2: "what interactions/side effects/doses does COMPOUND have/do"
    const m2 = prompt.match(
        /(?:what\s+(?:interactions?|side effects?|doses?|effects?|mechanism|pharmacology|dosing|stacks?)\s+(?:does|do|did)\s+)(.+?)(?:\s+(?:have|do|cause|produce|show))?[?.!,\s]*$/i
    );
    const raw = (m1?.[1] || m2?.[1] || '').replace(/[?.!,]+$/, '').trim().toLowerCase();
    if (!raw || raw.length < 2 || raw.length > 60) return null;
    if (/^(it|that|this|the|a|an|my|your|their|our|pip|ai|app)$/i.test(raw)) return null;
    return raw;
}

/** True when the question needs live web search — not our baked-in profiles. */
function needsLiveResearch(prompt, compoundRaw) {
    if (/\b(latest|recent|new|update|updated|202[4-9]|study|studies|trial|fda|approved|currently|today)\b/i.test(prompt)) {
        return true;
    }
    if (/\bhalf[- ]?life\b|\belimination half\b|\bhow long does .+ stay/i.test(prompt)) {
        return true;
    }
    if (compoundRaw && !resolveProfile(compoundRaw) && !lookupPep(normalizePepName(compoundRaw))) {
        return true;
    }
    return false;
}

function hasLocalCompoundAnswer(compoundRaw) {
    if (resolveProfile(compoundRaw)) return true;
    return Boolean(lookupPep(normalizePepName(compoundRaw)));
}

// Rich research summaries for the most common compounds
const COMPOUND_PROFILES = {
    'bpc-157': {
        display: 'BPC-157',
        aka: 'Body Protective Compound-157',
        mechanism: 'A 15 amino-acid peptide derived from a naturally occurring gastric protein. It accelerates healing via angiogenesis (new blood vessel formation), upregulates growth hormone receptors, and has direct anti-inflammatory effects — locally at the injury site and systemically in the gut.',
        primaryUses: ['Tendon, ligament, and muscle injury recovery', 'Leaky gut and GI inflammation', 'Joint repair and cartilage health', 'Post-surgery healing acceleration', 'Neuroprotection (emerging research)'],
        protocol: 'Typical dose: **250–500mcg/day**. Injectable (subcutaneous or intramuscular). For systemic effects (gut, general recovery) — inject anywhere, usually abdomen. For localized injury — inject near the site. Some prefer splitting into 2×/day.',
        stacks: 'BPC-157 + **TB-500** is the gold standard injury stack — local repair meets systemic cell migration. Add **GHK-Cu** topically for extra collagen synthesis if skin/wound healing is the goal.',
        sideEffects: 'Well-tolerated. Occasional mild nausea at higher doses. PiP (injection site pain) is usually minimal with TB-500 being the worse offender of the two.',
        researchNote: 'Extensively studied in animal models. Human clinical trials are limited but community data is robust. Most protocols are based on extrapolation from rodent studies.',
    },
    'tb-500': {
        display: 'TB-500',
        aka: 'Thymosin Beta-4 fragment',
        mechanism: 'A synthetic fragment of Thymosin Beta-4. Promotes systemic cell migration and proliferation by upregulating actin, which is essential for tissue rebuilding. Works at a distance from the injection site — great for diffuse or hard-to-reach injuries.',
        primaryUses: ['Systemic injury recovery', 'Tendon and muscle repair', 'Cardiovascular tissue healing', 'Flexibility and range of motion improvement', 'Chronic injury management'],
        protocol: 'Loading: **5mg/week** (split into 2 injections) for 4–6 weeks. Maintenance: **2–2.5mg/week**. Subcutaneous or IM. Refrigerate — more temperature-sensitive than BPC.',
        stacks: 'TB-500 + **BPC-157** is the definitive repair stack. Add **Ipamorelin + CJC-1295** if you want GH pulses to accelerate collagen synthesis during the cycle.',
        sideEffects: 'Fatigue, head rush, and lightheadedness are the most common. Usually transient. PiP is moderate — slower injection speed helps.',
        researchNote: 'Originally developed for racehorses. Banned in competitive sport. Research in humans is limited but the community record is extensive.',
    },
    'ipamorelin': {
        display: 'Ipamorelin',
        aka: 'IPA',
        mechanism: 'A selective GHRP (Growth Hormone Releasing Peptide) — stimulates the pituitary gland to release GH in a clean, pulsatile pattern. Unlike older GHRPs, it does NOT significantly raise cortisol or prolactin, making it cleaner and more beginner-friendly.',
        primaryUses: ['GH optimization and anti-aging', 'Body composition (lean mass, fat loss)', 'Recovery and sleep quality', 'Collagen synthesis support', 'General longevity stack'],
        protocol: 'Dose: **100–300mcg per injection**. Best on an empty stomach (wait 2h after food, 30 min before eating). Common schedule: 2–3x/day or once before bed for the overnight GH pulse. Always pair with a GHRH like CJC-1295 for maximum GH release.',
        stacks: '**Ipamorelin + CJC-1295** is the standard — GHRP + GHRH working synergistically for amplified GH pulse. Add **MK-677** only if you want constant elevation (vs. pulsatile).',
        sideEffects: 'Mild hunger (much less than GHRP-6), water retention at higher doses. Carpal tunnel-like symptoms if GH stays elevated too long.',
        researchNote: 'One of the most widely used GH secretagogues in the peptide community. The "clean" GHRP — minimal cortisol/prolactin elevation compared to GHRP-2/6.',
    },
    'cjc-1295': {
        display: 'CJC-1295',
        aka: 'Modified GRF 1-29, Mod-GRF',
        mechanism: 'A GHRH analogue — mimics the body\'s growth hormone releasing hormone to amplify GH secretion from the pituitary. The DAC (Drug Affinity Complex) version has a much longer half-life (days). The no-DAC version (Mod-GRF) has a short half-life (~30 min) and is preferred for pulsatile release that mirrors natural GH patterns.',
        primaryUses: ['GH secretagogue stack (always paired with GHRP)', 'Lean body composition', 'Anti-aging and recovery', 'Collagen and skin quality'],
        protocol: 'No-DAC (Mod-GRF): **100–200mcg** per injection, timed with GHRP. Always fasted. With CJC-1295 DAC: **1–2mg/week** regardless of meal timing. Most prefer no-DAC for natural pulse patterns.',
        stacks: '**CJC-1295 + Ipamorelin** is the textbook pairing. This is the most common GH axis stack in the community.',
        sideEffects: 'Water retention, fatigue, tingling/numbness. Mostly dose-dependent.',
        researchNote: 'Human clinical data exists — original CJC-1295 (DAC version) showed sustained GH elevation in phase 2 trials.',
    },
    'semaglutide': {
        display: 'Semaglutide',
        aka: 'Ozempic, Wegovy',
        mechanism: 'A GLP-1 receptor agonist. Slows gastric emptying, reduces appetite via hypothalamic signaling, and improves insulin sensitivity. One of the most clinically validated weight-loss compounds to date.',
        primaryUses: ['Weight loss and fat reduction', 'Type 2 diabetes management', 'Cardiovascular risk reduction', 'Appetite regulation'],
        protocol: 'Start at **0.25mg/week** subcutaneous injection. Titrate up every 4 weeks (0.5 → 1 → 1.7 → 2.4mg). Never skip titration — GI side effects are almost always from going too fast.',
        stacks: 'Often paired with **Tirzepatide** protocols alternating cycles, or **MK-677** to preserve muscle mass during caloric deficit. **BPC-157** can help manage GI discomfort.',
        sideEffects: 'Nausea, vomiting, constipation — almost always dose-dependent and transient. Rare but serious: pancreatitis risk, thyroid C-cell concern (animal data).',
        researchNote: 'FDA-approved for both T2D (Ozempic) and weight loss (Wegovy). Landmark SURMOUNT and SELECT trials showed 15%+ body weight reduction and cardiovascular mortality benefit.',
    },
    'tirzepatide': {
        display: 'Tirzepatide',
        aka: 'Mounjaro, Zepbound',
        mechanism: 'Dual GLP-1 and GIP receptor agonist — the first-in-class "twincretin." GIP adds to GLP-1\'s effects with better tolerability and even greater weight loss than GLP-1 alone. Regarded as the most powerful approved weight-loss compound currently available.',
        primaryUses: ['Weight loss (superior to semaglutide in trials)', 'Type 2 diabetes', 'Metabolic syndrome', 'Insulin sensitivity'],
        protocol: 'Start at **2.5mg/week** SC injection. Titrate every 4 weeks: 5 → 7.5 → 10 → 12.5 → 15mg. Max 15mg/week. Same slow-titration rule applies.',
        stacks: 'Some cycle between Semaglutide and Tirzepatide to prevent receptor desensitization. **MK-677** or **Ipamorelin** used alongside to protect lean mass during aggressive fat loss.',
        sideEffects: 'Similar GI profile to semaglutide but often better tolerated. Nausea, constipation, fatigue. Generally milder than semaglutide at equivalent efficacy.',
        researchNote: 'FDA-approved 2022 (T2D) and 2023 (obesity). SURMOUNT-1 showed up to **22.5% body weight loss** — the highest ever seen in a pharmacological weight-loss trial.',
    },
    'mk-677': {
        display: 'MK-677',
        aka: 'Ibutamoren, Nutrobal',
        mechanism: 'A non-peptide oral ghrelin mimetic — stimulates GH and IGF-1 secretion by binding ghrelin receptors. Unlike injectable GH secretagogues, it works continuously (not pulsatile), keeping GH/IGF-1 elevated around the clock. Taken orally.',
        primaryUses: ['Muscle mass and recovery', 'Sleep quality improvement', 'GH/IGF-1 elevation without injections', 'Bone density', 'Anti-aging'],
        protocol: '**10–25mg/day**, oral, taken at night before bed (aligns with natural GH spike + manages hunger). Start at 10mg to assess tolerance. No fasting required.',
        stacks: 'Works with everything. Especially popular with **Ipamorelin + CJC-1295** to add constant baseline GH elevation on top of pulsatile spikes. Also common with **BPC-157** during recovery phases.',
        sideEffects: 'Significant appetite increase, water retention, possible insulin resistance at higher doses, lethargy, and vivid dreams. Carpal tunnel symptoms if IGF-1 runs too high.',
        researchNote: 'Not a SARM despite being classified alongside them. Extensive clinical trial data in elderly populations for muscle wasting and GH deficiency. Not FDA-approved.',
    },
    'nad+': {
        display: 'NAD+',
        aka: 'Nicotinamide Adenine Dinucleotide',
        mechanism: 'A coenzyme central to cellular energy metabolism (ATP production) and DNA repair via sirtuins and PARP enzymes. NAD+ declines with age. Supplementation (via precursors NMN/NR or direct IV/IM) aims to restore youthful cellular function.',
        primaryUses: ['Cellular energy and mitochondrial function', 'DNA repair and longevity', 'Cognitive clarity and neurological health', 'Addiction and withdrawal support (IV)', 'Anti-aging protocols'],
        protocol: 'IV (highest bioavailability): **250–1000mg** infused slowly (fast infusion causes chest tightness). IM: **100–300mg** 2–3x/week. Oral precursors (NMN/NR): **500–1000mg/day** — lower bioavailability but practical for maintenance.',
        stacks: '**NAD+ + Epitalon** is a popular longevity combo. Pairs well with **GHK-Cu** for skin and cellular repair. Common in longevity protocols alongside methylene blue.',
        sideEffects: 'IV: Flushing, chest tightness, nausea if infused too fast — slow the drip. IM/oral: Generally well-tolerated. Rare: headache, fatigue.',
        researchNote: 'Growing body of peer-reviewed longevity research (David Sinclair lab). IV protocols are popular in anti-aging clinics. Oral vs. IV bioavailability debate is ongoing.',
    },
    'sermorelin': {
        display: 'Sermorelin',
        aka: 'GRF 1-29',
        mechanism: 'A GHRH analogue (first 29 amino acids of native GHRH). Stimulates the pituitary to release GH naturally — preserving the feedback loop unlike exogenous GH. Considered a gentler, more physiological option than direct HGH.',
        primaryUses: ['GH deficiency therapy', 'Anti-aging and body composition', 'Sleep quality', 'Libido and energy'],
        protocol: '**200–500mcg/day** SC injection, before bed. Fasted for best results. Often used in longer cycles (12+ weeks) due to the gentler action.',
        stacks: 'Sermorelin + **Ipamorelin** pairs a GHRH + GHRP for synergistic GH release — same logic as CJC-1295 + Ipamorelin but with a shorter half-life and more "natural" profile.',
        sideEffects: 'Mild flushing, injection site reactions, headache. Generally very well tolerated.',
        researchNote: 'FDA-approved (was approved, now discontinued commercially — still available compounded). Longest track record of any GHRH analogue.',
    },
    'tesamorelin': {
        display: 'Tesamorelin',
        aka: 'Egrifta',
        mechanism: 'A stabilized GHRH analogue with a longer half-life than sermorelin. FDA-approved for HIV-associated lipodystrophy but used off-label for visceral fat reduction and GH optimization.',
        primaryUses: ['Visceral fat reduction (strongest evidence of any GH secretagogue)', 'GH optimization', 'Cognitive function (emerging research in MCI)', 'Body composition'],
        protocol: '**1–2mg/day** SC injection. Fasted. 26-week cycles are standard in clinical trials. Some run longer with periodic breaks.',
        stacks: 'Tesamorelin + **Ipamorelin** for GH amplification. The combination is particularly popular in body recomposition protocols.',
        sideEffects: 'Fluid retention, joint pain, injection site reactions. More potent than sermorelin — respect it.',
        researchNote: 'FDA-approved for a specific indication. The clinical data on visceral fat loss is impressive. Actively researched for Alzheimer\'s (mild cognitive impairment).',
    },
    'epithalon': {
        display: 'Epithalon',
        aka: 'Epitalon, Epithalamin',
        mechanism: 'A tetrapeptide that activates telomerase — the enzyme that rebuilds telomeres (protective DNA end-caps that shorten with aging). Developed by the St. Petersburg Institute of Bioregulation. May extend cellular lifespan by preserving telomere length.',
        primaryUses: ['Longevity and anti-aging', 'Telomere support', 'Circadian rhythm normalization', 'Cancer prevention research (preliminary)', 'Immune system modulation'],
        protocol: '**5–10mg/day** for 10–20 consecutive days, then off. Course is typically 2x/year. SC or IM injection. Some use intranasal for convenience.',
        stacks: 'Epithalon + **NAD+** is the cornerstone longevity stack. Often combined with **Thymalin** in Russian gerontology protocols.',
        sideEffects: 'Very well tolerated. Occasional vivid dreams (reportedly). Minimal reported side effects.',
        researchNote: 'Research is primarily from Russian scientists (Vladimir Khavinson). Animal studies show impressive lifespan extension. Human data is limited but the researcher has published extensively.',
    },
    'ghk-cu': {
        display: 'GHK-Cu',
        aka: 'Copper Peptide, GHK-Copper',
        mechanism: 'A naturally occurring copper-binding tripeptide found in human plasma, urine, and saliva. Declines with age. Activates skin remodeling, collagen/elastin production, and anti-inflammatory pathways. Also exhibits wound-healing and potentially systemic repair effects.',
        primaryUses: ['Skin quality and anti-aging (topical)', 'Wound healing acceleration', 'Hair growth support', 'Collagen and elastin production', 'Anti-inflammatory (systemic use)'],
        protocol: 'Topical: Apply 1–2% serum to skin 2x/day. Injectable: **1–2mg/day** SC for systemic effects. Topical is the most validated delivery method.',
        stacks: 'Topical GHK-Cu + injectable **BPC-157** for wound/skin healing. Natural fit in any anti-aging longevity stack alongside **Epithalon** and **NAD+**.',
        sideEffects: 'Topical: Rare irritation, possible blue-green skin tint at very high concentrations (rare). Injectable: Well-tolerated.',
        researchNote: 'Extensive lab and some human data for skin applications. Loren Pickart PhD has published extensively. Systemic injectable use is community-driven with limited formal trials.',
    },
    'thymosin-alpha-1': {
        display: 'Thymosin Alpha-1',
        aka: 'Ta1, Zadaxin',
        mechanism: 'A thymic peptide that modulates and enhances immune function — particularly T-cell and dendritic cell activity. Used clinically to treat immunodeficiency and chronic infections. Also being researched as an adjuvant therapy in cancer and autoimmune conditions.',
        primaryUses: ['Immune system modulation and enhancement', 'Chronic infections (Lyme, EBV, HBV, HCV)', 'Cancer adjuvant therapy', 'Autoimmune regulation', 'Post-illness recovery'],
        protocol: '**1.6mg** SC injection 2x/week, typically for 6–12 months in clinical settings. Shorter immune "boost" cycles (4–8 weeks) are popular in the community.',
        stacks: 'Thymosin Alpha-1 + **BPC-157** for gut-immune protocols. Often paired with **VIP** in mast cell and inflammatory conditions.',
        sideEffects: 'Very well tolerated. Mild injection site reactions. Rarely causes immune flares in autoimmune conditions — monitor carefully.',
        researchNote: 'FDA-approved in several countries (not the US). Commercially available as Zadaxin. Solid clinical trial data for HBV and malignant melanoma.',
    },
    'bpc157': { alias: 'bpc-157' },
    'bpc': { alias: 'bpc-157' },
    'tb500': { alias: 'tb-500' },
    'tb 500': { alias: 'tb-500' },
    'cjc1295': { alias: 'cjc-1295' },
    'mod-grf': { alias: 'cjc-1295' },
    'ibutamoren': { alias: 'mk-677' },
    'ozempic': { alias: 'semaglutide' },
    'wegovy': { alias: 'semaglutide' },
    'mounjaro': { alias: 'tirzepatide' },
    'zepbound': { alias: 'tirzepatide' },
    'epitalon': { alias: 'epithalon' },
    'copper peptide': { alias: 'ghk-cu' },
    'ghk': { alias: 'ghk-cu' },
    'ta1': { alias: 'thymosin-alpha-1' },
    'ta-1': { alias: 'thymosin-alpha-1' },
    'sermorelin': { alias: 'sermorelin' },
    'ipamorelin': { alias: 'ipamorelin' },
};

function resolveProfile(raw) {
    const key = raw.toLowerCase().trim().replace(/\s+/g, '-');
    const alt = raw.toLowerCase().trim();
    let profile = COMPOUND_PROFILES[key] || COMPOUND_PROFILES[alt];
    if (!profile) {
        // fuzzy: check if any key starts with or contains the query
        const match = Object.keys(COMPOUND_PROFILES).find(k => k.includes(alt) || alt.includes(k.replace(/-/g, '').replace(/\s/g, '')));
        profile = match ? COMPOUND_PROFILES[match] : null;
    }
    if (profile?.alias) profile = COMPOUND_PROFILES[profile.alias];
    return profile || null;
}

function handleCompoundInfoQuery(compoundRaw) {
    const profile = resolveProfile(compoundRaw);
    const disclaimer = '\n\n_Based on published research literature. Educational only — not medical advice. Verify protocols with your prescriber._';

    if (!profile) {
        const kbInfo = lookupPep(normalizePepName(compoundRaw));
        if (kbInfo) {
            const axisLabels = { gh: 'GH axis', repair: 'tissue repair', metabolic: 'metabolic', sexual: 'sexual health', neuro: 'cognitive', longevity: 'longevity', hormonal: 'hormonal', immune: 'immune support', supplement: 'supplement' };
            return `🧬 **${compoundRaw.toUpperCase()}** is in my stack database as a **${kbInfo.category}** compound targeting the **${axisLabels[kbInfo.axis] || kbInfo.axis}**.\n\nI have dosing ranges and interaction data for it, but a full research profile isn't loaded yet. Ask me to **analyze your stack** to see how it fits, or ask what **pairs well with ${compoundRaw}** for synergy suggestions.${disclaimer}`;
        }
        return `🤔 I don't have a full profile on **${compoundRaw}** yet. I've got detailed data on BPC-157, TB-500, Ipamorelin, CJC-1295, Semaglutide, Tirzepatide, MK-677, NAD+, Sermorelin, Tesamorelin, GHK-Cu, Epithalon, Thymosin Alpha-1, and more.\n\nWhat compound are you asking about?${disclaimer}`;
    }

    const usesList = profile.primaryUses.map(u => `• ${u}`).join('\n');

    return `🧬 **${profile.display}** _(${profile.aka})_\n\n**How it works:**\n${profile.mechanism}\n\n**Primary uses:**\n${usesList}\n\n**Protocol:**\n${profile.protocol}\n\n**Best stacks:**\n${profile.stacks}\n\n**Side effects to know:**\n${profile.sideEffects}\n\n**Research context:**\n${profile.researchNote}${disclaimer}`;
}

// ── "Stack with X?" handler (client-side) ────────────────────────────────────

function detectStackWithIntent(prompt) {
    const m = prompt.match(/(?:what (?:can i|should i|do i|goes|pairs|works)\s+(?:well\s+)?(?:with|alongside))|(?:stack(?:ing)?\s+with)|(?:add(?:ing)?\s+to)|(?:combine\s+with)|(?:good\s+with)|(?:pair\s+with)/i);
    if (!m) return null;
    const after = prompt.slice(prompt.search(m[0]) + m[0].length).replace(/[?.!,]+$/, '').trim();
    if (after.length < 2 || after.length >= 60) return null;
    // If the user means "my current protocols / my stack / my active protocols",
    // return null so the query falls through to Firebase where Claude has full user context.
    if (/\b(my|current|active|existing)\b.*(protocol|stack|compound|peptide|regime|cycle)/i.test(after)) return null;
    if (/\b(my stack|my protocols|my current|my active)\b/i.test(after)) return null;
    return after;
}

function handleStackWithQuery(compoundRaw) {
    const normalized = normalizePepName(compoundRaw);
    const info = lookupPep(normalized);
    const displayName = compoundRaw.trim();
    const disclaimer = '\n\n_Based on published peptide research literature. Not medical advice — verify before use._';

    if (!info) {
        return `🤔 I don't have receptor-level data on **${displayName}** just yet — tell me what you're running it for and I can point you toward complementary compounds based on your goal.\n\nWhat are you trying to optimise?${disclaimer}`;
    }

    const parts = [];

    // Synergies
    const relatedSynergies = STACK_KB.synergies.filter(s => s.compounds.includes(normalized));
    if (relatedSynergies.length > 0) {
        relatedSynergies.forEach(syn => {
            const partners = syn.compounds.filter(c => c !== normalized).map(c => c.toUpperCase()).join(' + ');
            parts.push(`🔗 **Best pairing: ${partners}**\n${syn.note}`);
        });
    }

    // Axis-based suggestions
    const axisSet = new Set([info.axis]);
    const axisNormSet = new Set([normalized]);
    const matchedSuggestions = STACK_KB.suggestions.filter(s => s.condition(axisSet, axisNormSet));
    if (matchedSuggestions.length > 0) {
        parts.push('💡 **Also worth considering:**\n' + matchedSuggestions.map(s => `**${s.title}** — ${s.body}`).join('\n\n'));
    }

    // What NOT to add
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
            parts.push(`⚠️ **Skip these:** ${sameClass.join(', ')} — same receptor class. You'd just be competing with yourself for the same binding site.`);
        }
    }

    if (parts.length === 0) {
        const axisLabels = { gh: 'GH axis', repair: 'tissue repair', metabolic: 'metabolic', sexual: 'sexual health', neuro: 'cognitive', longevity: 'longevity', hormonal: 'hormonal', immune: 'immune support', supplement: 'supplement' };
        parts.push(`🧪 **${displayName}** is a ${info.category} compound (${axisLabels[info.axis] || info.axis}). Look for compounds that hit a complementary axis without landing on the same receptor. Ask me about a specific one you're considering.`);
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
export async function sendPrompt({ prompt, history = [], conversationId, skipQuota, userContext, onToken }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }

    if (!skipQuota && getRemainingQuota() <= 0) {
        throw new Error('QUOTA_EXHAUSTED');
    }

    const cleaned = redactPII(prompt);

    // Easter eggs — client-side (some prompts get a short “checking…” delay so replies feel natural)
    const egg = checkEasterEgg(prompt);
    if (egg) {
        if (egg.simulateDelayBeforeReply) {
            await new Promise((r) => setTimeout(r, 850 + Math.random() * 950));
        }
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

    // Reconstitution math — local calc, Claude explains
    if (detectReconIntent(prompt)) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
        const reconContent = await handleReconQuery(prompt, { userContext, skipQuota });
        if (reconContent) {
            if (!skipQuota) incrementQuota();
            return {
                message: {
                    id: generateId(),
                    role: 'assistant',
                    content: reconContent,
                    actions: [],
                    createdAt: new Date().toISOString(),
                },
                quotaRemaining: getRemainingQuota(),
                conversationId: conversationId || generateId(),
            };
        }
        // No numbers parsed — fall through to Claude chat
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

    // Research queries → local profiles first, then Gemini + Google Search (streamed when possible)
    const intent = classifyIntent(prompt);
    const compoundQuery = detectCompoundInfoIntent(prompt);
    if (intent === 'RESEARCH' && compoundQuery && hasLocalCompoundAnswer(compoundQuery) && !needsLiveResearch(prompt, compoundQuery)) {
        await new Promise((r) => setTimeout(r, 450 + Math.random() * 450));
        if (!skipQuota) incrementQuota();
        // Log fire-and-forget so local answers appear in admin insights
        getCallable('logPipQueryClient')
            .then((fn) => fn({ query: cleaned, provider: 'local' }))
            .catch(() => {});
        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: handleCompoundInfoQuery(compoundQuery),
                actions: [],
                createdAt: new Date().toISOString(),
            },
            quotaRemaining: getRemainingQuota(),
            conversationId: conversationId || generateId(),
        };
    }

    if (intent === 'RESEARCH') {
        try {
            if (onToken) {
                return await _geminiResearchStream({
                    query: cleaned,
                    history,
                    conversationId,
                    userContext,
                    onToken,
                    skipQuota,
                });
            }
            const result = await _geminiResearch({
                query: cleaned,
                history,
                conversationId,
                userContext,
                skipQuota,
            });
            return result;
        } catch {
            // Fall through to Claude chat if Gemini fails
        }
    }

    // General chat → streaming SSE (fast) or callable fallback
    if (onToken) {
        return await _streamChat({ prompt: cleaned, history, conversationId, userContext, onToken, skipQuota });
    }
    return await _callableChat({ prompt: cleaned, history, conversationId, userContext, skipQuota });
}

/** Streaming path — tokens appear in the UI as Claude generates them. */
async function _streamChat({ prompt, history, conversationId, userContext, onToken, skipQuota }) {
    const [{ getApp }, { getAuth }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
    ]);
    const projectId = getApp().options.projectId;
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error('Not authenticated. Please sign in and try again.');

    const streamUrl = `https://us-central1-${projectId}.cloudfunctions.net/aiResearchChatStream`;
    const abort = new AbortController();
    // Kill the whole stream if it hasn't completed within 15 seconds
    const timeoutId = setTimeout(() => abort.abort(), 15000);

    let response;
    try {
        response = await fetch(streamUrl, {
            method: 'POST',
            signal: abort.signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ prompt, history, conversationId, userContext }),
        });
    } catch (fetchErr) {
        clearTimeout(timeoutId);
        // Network error or timeout — fall back to callable
        return await _callableChat({ prompt, history, conversationId, userContext, skipQuota });
    }

    // Non-200 before SSE starts = quota/rate error returned as JSON
    if (!response.ok) {
        clearTimeout(timeoutId);
        const err = await response.json().catch(() => ({}));
        if (err.error === 'QUOTA_EXHAUSTED') throw new Error('QUOTA_EXHAUSTED');
        throw new Error(err.error || 'PiP is having trouble connecting right now. Try again in a moment.');
    }

    // Check if the response is JSON (quota exhausted returned with 200)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
        clearTimeout(timeoutId);
        const json = await response.json();
        if (json.error === 'QUOTA_EXHAUSTED') throw new Error('QUOTA_EXHAUSTED');
        throw new Error(json.error || 'Something went wrong.');
    }

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let quotaRemaining = getRemainingQuota();
    let finalConversationId = conversationId;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const event = JSON.parse(line.slice(6));
                    if (event.type === 'token') {
                        onToken(event.token);
                    } else if (event.type === 'done') {
                        quotaRemaining = event.quotaRemaining ?? quotaRemaining;
                        finalConversationId = event.conversationId || conversationId;
                    } else if (event.type === 'error') {
                        throw new Error(event.message || 'Stream error');
                    }
                } catch (parseErr) {
                    if (parseErr.message && parseErr.message !== 'Unexpected end of JSON input') throw parseErr;
                }
            }
        }
    } catch (streamErr) {
        clearTimeout(timeoutId);
        reader.cancel().catch(() => {});
        // If stream aborted due to timeout and we already got some content, that's fine — it'll show
        // If no content yet, fall back to callable
        const isTimeout = streamErr?.name === 'AbortError';
        if (isTimeout) {
            return await _callableChat({ prompt, history, conversationId, userContext, skipQuota });
        }
        throw streamErr;
    }

    clearTimeout(timeoutId);
    if (!skipQuota) incrementQuota();
    return {
        message: { id: generateId(), role: 'assistant', content: '', actions: [], createdAt: new Date().toISOString() },
        quotaRemaining,
        conversationId: finalConversationId || generateId(),
    };
}

/** Gemini research path — compound lookup with Google Search grounding. */
async function _geminiResearch({ query, history, conversationId, userContext, skipQuota }) {
    const callResearch = await getCallable('aiPipGeminiResearch');
    const response = await callResearch({ query, history, conversationId, userContext });
    const data = response?.data || {};

    if (!skipQuota) incrementQuota();

    return {
        message: {
            id: generateId(),
            role: 'assistant',
            content: data.message?.content || '',
            actions: [],
            citations: data.message?.citations || [],
            createdAt: data.message?.createdAt || new Date().toISOString(),
            fromCache: data.fromCache ?? false,
            cacheLastVerified: data.cacheLastVerified ?? null,
        },
        quotaRemaining: data.quotaRemaining ?? getRemainingQuota(),
        conversationId: data.conversationId || conversationId || generateId(),
    };
}

/** Gemini research streaming — tokens appear as they generate. */
async function _geminiResearchStream({ query, history, conversationId, userContext, onToken, skipQuota }) {
    const [{ getApp }, { getAuth }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
    ]);
    const projectId = getApp().options.projectId;
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error('Not authenticated. Please sign in and try again.');

    const streamUrl = `https://us-central1-${projectId}.cloudfunctions.net/aiPipGeminiResearchStream`;
    const abort = new AbortController();
    const timeoutId = setTimeout(() => abort.abort(), 120000);

    let response;
    try {
        response = await fetch(streamUrl, {
            method: 'POST',
            signal: abort.signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ query, history, conversationId, userContext }),
        });
    } catch {
        clearTimeout(timeoutId);
        return await _geminiResearch({ query, history, conversationId, userContext, skipQuota });
    }

    if (!response.ok) {
        clearTimeout(timeoutId);
        const err = await response.json().catch(() => ({}));
        if (err.error === 'QUOTA_EXHAUSTED') throw new Error('QUOTA_EXHAUSTED');
        return await _geminiResearch({ query, history, conversationId, userContext, skipQuota });
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
        clearTimeout(timeoutId);
        const json = await response.json();
        if (json.error === 'QUOTA_EXHAUSTED') throw new Error('QUOTA_EXHAUSTED');
        return await _geminiResearch({ query, history, conversationId, userContext, skipQuota });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let quotaRemaining = getRemainingQuota();
    let finalConversationId = conversationId;
    let finalFromCache = false;
    let finalCacheLastVerified = null;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const event = JSON.parse(line.slice(6));
                    if (event.type === 'token') {
                        onToken(event.token);
                    } else if (event.type === 'done') {
                        quotaRemaining = event.quotaRemaining ?? quotaRemaining;
                        finalConversationId = event.conversationId || conversationId;
                        finalFromCache = event.fromCache ?? false;
                        finalCacheLastVerified = event.cacheLastVerified ?? null;
                    } else if (event.type === 'error') {
                        throw new Error(event.message || 'Stream error');
                    }
                } catch (parseErr) {
                    if (parseErr.message && parseErr.message !== 'Unexpected end of JSON input') throw parseErr;
                }
            }
        }
    } catch (streamErr) {
        clearTimeout(timeoutId);
        reader.cancel().catch(() => {});
        if (streamErr?.name === 'AbortError') {
            return await _geminiResearch({ query, history, conversationId, userContext, skipQuota });
        }
        throw streamErr;
    }

    clearTimeout(timeoutId);
    if (!skipQuota) incrementQuota();
    return {
        message: {
            id: generateId(),
            role: 'assistant',
            content: '',
            actions: [],
            createdAt: new Date().toISOString(),
            fromCache: finalFromCache,
            cacheLastVerified: finalCacheLastVerified,
        },
        quotaRemaining,
        conversationId: finalConversationId || generateId(),
    };
}

/** Non-streaming callable fallback (used when onToken not provided or streaming fails). */
async function _callableChat({ prompt, history, conversationId, userContext, skipQuota }) {
    try {
        const callChat = await getCallable('aiResearchChat');
        const response = await callChat({ prompt, history, conversationId, userContext });
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
        const message = error?.message || '';
        if (message.toLowerCase().includes('quota')) throw new Error('QUOTA_EXHAUSTED');
        if (!message || message === 'INTERNAL' || message.toLowerCase().includes('internal')) {
            throw new Error('PiP is having trouble connecting right now. Try again in a moment.');
        }
        throw new Error(message);
    }
}

/**
 * Generate a structured protocol prefill for a compound via Gemini + Google Search.
 */
export async function prefillProtocol({ compound, goal, skipQuota }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }
    if (!compound) throw new Error('Compound is required.');
    if (!skipQuota && getRemainingQuota() <= 0) {
        throw new Error('QUOTA_EXHAUSTED');
    }

    try {
        const callPrefill = await getCallable('aiPipGeminiPrefill');
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
            throw new Error('QUOTA_EXHAUSTED');
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
 * Instant local stack analysis — rules only, no API call.
 */
export function getLocalStackAnalysis({ protocols = [], supplements = [] }) {
    const { summary, sections } = buildStackSections(protocols, supplements);
    return {
        summary,
        sections,
        disclaimer: 'Informational only. Not medical advice.',
    };
}

/**
 * Optional PiP narrative pass — user taps "Tell me a bit more".
 */
export async function enrichStackAnalysis({ protocols = [], supplements = [], localResult }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }
    if (getRemainingQuota() <= 0) {
        throw new Error('QUOTA_EXHAUSTED');
    }

    const base = localResult || getLocalStackAnalysis({ protocols, supplements });

    try {
        const callStack = await getCallable('aiResearchAnalyzeStack');
        const response = await callStack({
            protocols,
            supplements,
            preComputedFlags: { summary: base.summary, sections: base.sections },
        });
        const data = response?.data || {};

        incrementQuota();

        return {
            summary: data.summary || base.summary,
            sections: Array.isArray(data.sections) && data.sections.length > 0 ? data.sections : base.sections,
            disclaimer: data.disclaimer || base.disclaimer,
        };
    } catch {
        return base;
    }
}

/**
 * Analyze the user's stack — hybrid: local rules detect flags, Claude Sonnet enriches narrative.
 * @deprecated Prefer getLocalStackAnalysis + enrichStackAnalysis for opt-in narrative.
 */
export async function analyzeStack({ protocols = [], supplements = [] }) {
    const local = getLocalStackAnalysis({ protocols, supplements });
    return enrichStackAnalysis({ protocols, supplements, localResult: local });
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
    getLocalStackAnalysis,
    enrichStackAnalysis,
    getRemainingQuota,
    incrementQuota,
    setQuotaLimit,
    loadConversations,
    persistConversations,
    loadLibrary,
    persistLibrary,
    saveToLibrary,
    savePipChatToResearchNotes,
    AI_DAILY_QUOTA,
    hasSeenGreeting,
    markGreetingSeen,
};

export { savePipChatToResearchNotes };
