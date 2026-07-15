/**
 * Half-life backfill — one-time AI migration.
 *
 * Scans all protocols for peptides missing half-life data, calls the
 * server-side Gemini + Google Search grounding callable, then patches
 * protocols in-place with estimated values. Marks itself complete via
 * localStorage flag so it only runs once per device.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { shouldBackfillHalfLife } from './halfLife';
import { featureFlags } from '../config/featureFlags';
import {
    normalizePeptideLookupKey,
    sanitizePeptideNameForApi,
    stripDecorativeChars,
} from './peptideNameNormalize';

export { normalizePeptideLookupKey, sanitizePeptideNameForApi, stripDecorativeChars };

// v2 — bumped so devices already marked complete under v1 re-run once with the
// improved fuzzy matching + retry logic.
const BACKFILL_KEY = 'tpprover_halfLife_backfill_v2';
const ATTEMPTS_KEY = 'tpprover_halfLife_backfill_attempts_v2';
// Give each compound a couple of tries before giving up so genuinely unknown
// compounds (vitamins, obscure blends) don't re-hit the API every session.
const MAX_ATTEMPTS = 2;

// In-memory lock — prevents AppContext auto-run and manual console run from firing simultaneously.
let _backfillRunning = false;

export function isHalfLifeBackfillComplete() {
    try { return localStorage.getItem(BACKFILL_KEY) === '1'; } catch { return false; }
}

function markComplete() {
    try { localStorage.setItem(BACKFILL_KEY, '1'); } catch { /* noop */ }
}

function loadAttempts() {
    try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}') || {}; }
    catch { return {}; }
}

function saveAttempts(map) {
    try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

function attemptsFor(map, name) {
    return map[normalizePeptideLookupKey(name)] || 0;
}

/**
 * Collect unique peptide names that need half-life across all protocols.
 */
export function collectPeptidesNeedingHalfLife(protocols) {
    const seen = new Set();
    const needed = [];
    for (const protocol of (protocols || [])) {
        for (const pep of (protocol.peptides || [])) {
            const name = (pep.name || '').trim();
            if (!name) continue;
            if (!shouldBackfillHalfLife(pep)) continue;
            const key = normalizePeptideLookupKey(name);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            needed.push(sanitizePeptideNameForApi(name));
        }
    }
    return needed;
}

/**
 * Apply AI results to protocols. Returns a new array (immutable).
 * Only patches peptides that still have empty half-life at apply time.
 */
export function applyHalfLifeResults(protocols, resultsMap) {
    let totalPatched = 0;
    const updated = (protocols || []).map(protocol => {
        const peptides = (protocol.peptides || []);
        let protocolChanged = false;
        const patchedPeptides = peptides.map(pep => {
            if (!shouldBackfillHalfLife(pep)) return pep;
            const key = normalizePeptideLookupKey(pep.name);
            const match = resultsMap[key];
            if (!match) return pep;
            protocolChanged = true;
            totalPatched++;
            return {
                ...pep,
                halfLife: { value: match.value, unit: match.unit },
                halfLifeSource: 'estimated',
                halfLifeEstimatedAt: new Date().toISOString(),
            };
        });
        if (!protocolChanged) return protocol;
        return {
            ...protocol,
            peptides: patchedPeptides,
            updatedAt: new Date().toISOString(),
        };
    });
    return { protocols: updated, totalPatched };
}

/**
 * Run the full backfill pipeline. Call after data load + merge in AppContext.
 * Returns { patched, skipped } or throws on callable failure (caller retries next session).
 */
export async function runHalfLifeBackfill(protocols, options = {}) {
    const protocolCount = (protocols || []).length;

    if (_backfillRunning) {
        console.log('[HalfLifeBackfill] Skipped — already running');
        return { patched: 0, skipped: true, reason: 'already_running' };
    }
    if (!featureFlags.ENABLE_HALF_LIFE_BACKFILL) {
        console.log('[HalfLifeBackfill] Skipped — ENABLE_HALF_LIFE_BACKFILL is OFF. Turn on in Admin → Settings → Feature flags or set VITE_ENABLE_HALF_LIFE_BACKFILL=true');
        return { patched: 0, skipped: true, reason: 'flag_off' };
    }
    if (isHalfLifeBackfillComplete()) {
        console.log('[HalfLifeBackfill] Skipped — already completed on this device (clear tpprover_halfLife_backfill_v1 to retry)');
        return { patched: 0, skipped: true, reason: 'already_complete' };
    }

    const needed = collectPeptidesNeedingHalfLife(protocols);
    console.log(`[HalfLifeBackfill] Scanning ${protocolCount} protocols — ${needed.length} unique peptide(s) need half-life (emojis stripped for lookup)`, needed);

    if (needed.length === 0) {
        markComplete();
        console.log('[HalfLifeBackfill] Nothing to fill (all peptides have half-life or no peptide names). Marked complete.');
        return { patched: 0, skipped: false, reason: 'nothing_to_fill' };
    }

    // Only request compounds we haven't already exhausted retries on. forceRetry
    // (dev/manual) ignores the attempt cap so you can always re-run everything.
    const attempts = loadAttempts();
    const force = options?.forceRetry === true;
    const toRequest = force ? needed : needed.filter((n) => attemptsFor(attempts, n) < MAX_ATTEMPTS);

    if (toRequest.length === 0) {
        markComplete();
        console.log(`[HalfLifeBackfill] ${needed.length} peptide(s) still empty but retries exhausted — marking complete (no data found for these)`, needed);
        return { patched: 0, skipped: false, reason: 'retries_exhausted' };
    }

    console.log(`[HalfLifeBackfill] Calling aiBackfillProtocolHalfLives… (${toRequest.length} of ${needed.length})`, toRequest);
    _backfillRunning = true;
    try {
        const functions = getFunctions(getApp(), 'us-central1');
        const callable = httpsCallable(functions, 'aiBackfillProtocolHalfLives', { timeout: 130000 });
        const response = await callable({ peptideNames: toRequest, forceRetry: force });
        const data = response?.data || {};

        if (data.alreadyCompleted) {
            markComplete();
            console.log('[HalfLifeBackfill] Server says already completed for this user');
            return { patched: 0, skipped: true, reason: 'server_already_complete' };
        }

        // Count an attempt for every compound we asked about this run.
        for (const n of toRequest) {
            const key = normalizePeptideLookupKey(n);
            if (key) attempts[key] = (attempts[key] || 0) + 1;
        }
        saveAttempts(attempts);

        const resultsMap = data.results || {};
        const matchCount = Object.keys(resultsMap).length;
        console.log(`[HalfLifeBackfill] AI returned ${matchCount} match(es)`, resultsMap);

        const { protocols: patched, totalPatched } = applyHalfLifeResults(protocols, resultsMap);

        // Mark complete only when nothing eligible is left to try — either
        // everything is filled, or the leftovers have hit the retry cap.
        const remaining = collectPeptidesNeedingHalfLife(patched);
        const stillEligible = remaining.filter((n) => attemptsFor(attempts, n) < MAX_ATTEMPTS);

        if (stillEligible.length === 0) {
            markComplete();
            console.log(`[HalfLifeBackfill] Done — patched ${totalPatched} peptide(s); no eligible leftovers. Marked complete.`);
        } else {
            console.log(`[HalfLifeBackfill] Patched ${totalPatched} this run — ${stillEligible.length} peptide(s) will retry next session`, stillEligible);
        }

        if (totalPatched === 0 && matchCount > 0) {
            console.warn('[HalfLifeBackfill] AI returned data but nothing patched — check name matching', resultsMap);
        }

        return {
            patched: totalPatched,
            patchedProtocols: patched,
            disclaimer: data.disclaimer,
            remaining: stillEligible,
        };
    } finally {
        _backfillRunning = false;
    }
}

/** Dev helper: run backfill from browser console — window.tppRunHalfLifeBackfill() */
export async function runHalfLifeBackfillFromConsole() {
    try { localStorage.removeItem(BACKFILL_KEY); } catch { /* noop */ }
    try { localStorage.removeItem(ATTEMPTS_KEY); } catch { /* noop */ }
    try {
        const raw = localStorage.getItem('tpprover_protocols') || '[]';
        const protocols = JSON.parse(raw);
        try {
            const { loadRemoteFlags } = await import('../services/remoteFlags');
            await loadRemoteFlags();
        } catch { /* flags already loaded or service worker blocked module; proceed with cached flags */ }
        console.log('[HalfLifeBackfill] Flag =', featureFlags.ENABLE_HALF_LIFE_BACKFILL);
        const result = await runHalfLifeBackfill(protocols, { forceRetry: true });
        if (result.patchedProtocols) {
            localStorage.setItem('tpprover_protocols', JSON.stringify(result.patchedProtocols));
            console.log('[HalfLifeBackfill] Saved to localStorage — reload the page to refresh UI');
        }
        return result;
    } catch (e) {
        console.error('[HalfLifeBackfill] Manual run failed:', e);
        throw e;
    }
}

if (typeof window !== 'undefined') {
    window.tppRunHalfLifeBackfill = runHalfLifeBackfillFromConsole;
    window.tppHalfLifeBackfillStatus = () => ({
        flag: featureFlags.ENABLE_HALF_LIFE_BACKFILL,
        deviceComplete: isHalfLifeBackfillComplete(),
        attempts: loadAttempts(),
        maxAttempts: MAX_ATTEMPTS,
        peptidesNeeding: collectPeptidesNeedingHalfLife(
            JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
        ),
    });
}
