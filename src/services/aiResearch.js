/**
 * AI Research service layer.
 *
 * Thin client wrapper around the server-side AI callable functions.
 * Currently ships with a deterministic mock responder for local dev
 * and pre-launch QA — production wiring to the cloud function happens
 * by flipping `AI_USE_REAL_BACKEND` to true in featureFlags.
 *
 * All requests pass through:
 *   1. Feature-flag gate (`ENABLE_AI_RESEARCH`)
 *   2. Daily quota check (client-side first-pass; function re-enforces)
 *   3. Safety redaction (PII scrubbing) before leaving the device
 *   4. Citation/response post-processing
 */
import { featureFlags } from '../config/featureFlags';
import { generateId } from '../utils/string';

const DAILY_QUOTA_KEY = 'tpprover_ai_daily_quota';
const LIBRARY_KEY = 'tpprover_ai_library';
const CONVERSATIONS_KEY = 'tpprover_ai_conversations';

export const AI_DAILY_QUOTA = 25; // soft client cap; server re-enforces

const MOCK_CITATIONS = [
    { id: 'mock-1', title: 'Position Stand: Peptide Research Safety', source: 'Mock Journal', year: 2024, url: '#' },
    { id: 'mock-2', title: 'Reconstitution Best Practices', source: 'Mock Lab Bulletin', year: 2023, url: '#' },
];

function today() {
    return new Date().toISOString().slice(0, 10);
}

export function getRemainingQuota() {
    try {
        const raw = localStorage.getItem(DAILY_QUOTA_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (!data || data.date !== today()) {
            return AI_DAILY_QUOTA;
        }
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
    } catch {
        // ignore
    }
}

/**
 * Minimal client-side safety pass. The real safety layer lives in
 * the callable function; this is just a quick pre-filter.
 */
function redactPII(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[email]')
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted]')
        .replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, '[phone]');
}

function buildMockResponse(prompt) {
    const lower = (prompt || '').toLowerCase();
    const disclaimer = 'This is an AI research assistant. Output is informational only and not medical advice. Always verify with primary sources.';

    let body;
    if (lower.includes('dose') || lower.includes('dosing')) {
        body = 'Dosing for research compounds is typically reported in micrograms or milligrams per kilogram of body weight. Published protocols vary by compound, target receptor, and study goal. Consult the original study and a qualified clinician before modeling any regimen on yourself.';
    } else if (lower.includes('stack') || lower.includes('combo') || lower.includes('combin')) {
        body = 'Stacking considerations: receptor overlap, half-life staggering, and total peripheral load. Two compounds sharing a pathway may amplify both target effects and off-target effects. Space administrations to reduce additive load where appropriate and track side effects independently.';
    } else if (lower.includes('reconstitute') || lower.includes('recon')) {
        body = 'Reconstitution is typically with bacteriostatic water. Volume is chosen so one "click" on your pen or one graduation on your syringe corresponds to a clean dose. Refrigerate after reconstitution and observe the compound\'s documented stability window.';
    } else {
        body = `Here's a summary based on published research for: "${prompt}". Always cross-reference a compound-specific paper before changing anything. If you want, tell me the specific peptide, goal, and constraint and I can narrow the response.`;
    }

    return {
        id: generateId(),
        role: 'assistant',
        content: `${body}\n\n${disclaimer}`,
        citations: MOCK_CITATIONS,
        createdAt: new Date().toISOString(),
        mock: true,
    };
}

/**
 * Send a prompt to the AI backend.
 *
 * In production this will call the `aiResearchChat` callable function.
 * Returns `{ message, citations, quotaRemaining }` or throws a
 * descriptive error the UI can surface.
 */
export async function sendPrompt({ prompt, history = [], conversationId }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }

    const remaining = getRemainingQuota();
    if (remaining <= 0) {
        throw new Error('Daily AI quota reached. Resets at midnight local time.');
    }

    const cleaned = redactPII(prompt);

    // MOCK path (current): simulate network latency + return deterministic reply
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 400));
    const message = buildMockResponse(cleaned);
    incrementQuota();

    return {
        message,
        quotaRemaining: getRemainingQuota(),
        conversationId: conversationId || generateId(),
    };
}

/**
 * Generate a prefilled protocol payload (name, purpose, notes).
 * Mock responder returns deterministic output. Real backend will fill
 * from literature-grounded suggestions.
 */
export async function prefillProtocol({ compound, goal }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }
    if (!compound) throw new Error('Compound is required.');
    if (getRemainingQuota() <= 0) {
        throw new Error('Daily AI quota reached. Resets at midnight local time.');
    }

    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    incrementQuota();

    const name = String(compound).trim();
    return {
        prefill: {
            protocolName: name.slice(0, 48),
            purpose: goal ? String(goal).slice(0, 120) : `Research protocol for ${name}`,
            notes: `AI-suggested starting point for ${name}. Cross-reference primary literature before modeling any dosing schedule.`,
        },
        disclaimer: 'Informational only. Not medical advice.',
        mock: true,
    };
}

/**
 * Analyze a stack of protocols + supplements for overlap flags.
 * Mock responder returns a plain summary. Real backend surfaces
 * receptor / half-life / load overlap warnings.
 */
export async function analyzeStack({ protocols = [], supplements = [] }) {
    if (!featureFlags.ENABLE_AI_RESEARCH) {
        throw new Error('AI Research is disabled.');
    }
    if (getRemainingQuota() <= 0) {
        throw new Error('Daily AI quota reached. Resets at midnight local time.');
    }

    await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
    incrementQuota();

    const protocolCount = protocols.length;
    const supplementCount = supplements.length;

    const flags = [];
    if (protocolCount >= 4) {
        flags.push({ level: 'info', text: 'Stack size is large — consider whether each compound has a distinct role or if any are redundant.' });
    }
    if (protocolCount === 0 && supplementCount === 0) {
        flags.push({ level: 'info', text: 'No active items found. Add protocols or supplements to run an analysis.' });
    }

    return {
        summary: `Analyzed ${protocolCount} protocol(s) and ${supplementCount} supplement(s). Full receptor-overlap, half-life staggering, and co-administration flags ship with the real-provider wiring. For now, the basics: spread dosing times, track side effects separately, and verify stability / storage conditions per compound.`,
        flags,
        disclaimer: 'Informational only. Not medical advice.',
        mock: true,
    };
}

export function loadConversations() {
    try {
        const raw = localStorage.getItem(CONVERSATIONS_KEY);
        return raw ? JSON.parse(raw) || [] : [];
    } catch {
        return [];
    }
}

export function persistConversations(list) {
    try {
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list || []));
    } catch {
        // ignore
    }
}

export function loadLibrary() {
    try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        return raw ? JSON.parse(raw) || [] : [];
    } catch {
        return [];
    }
}

export function persistLibrary(list) {
    try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(list || []));
    } catch {
        // ignore
    }
}

export default {
    sendPrompt,
    getRemainingQuota,
    incrementQuota,
    loadConversations,
    persistConversations,
    loadLibrary,
    persistLibrary,
    AI_DAILY_QUOTA,
};
