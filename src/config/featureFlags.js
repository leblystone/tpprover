/**
 * Feature flags for the Research+ Wave rollout.
 *
 * All flags default FALSE in production. Flip via environment variables
 * (Vite `import.meta.env.VITE_*`) or by editing the override map below for
 * local development / staging.
 *
 * Rollback: flipping a flag off hides the feature UI/route. Data stays
 * intact in Firestore/localStorage. No redeploy needed.
 *
 * Staged rollout sequence (when ready to ship):
 *   1. ENABLE_RESEARCH_PLUS  — new pricing visible to new signups
 *   2. ENABLE_COMMUNITY      — Vendors → Community tab + directory (seed first)
 *   3. ENABLE_PAGE_INTROS    — first-view coachmarks
 *   4. ENABLE_SOFT_DOWNGRADE — subscription lockouts become Free-tier downgrade
 *   5. ENABLE_BUDDY          — Buddy System after couple-account testing
 *   6. ENABLE_AI_RESEARCH    — AI last, monitor cost telemetry daily
 */

const parseFlag = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

// Local override — lets you flip flags in dev without touching env vars.
// DO NOT flip these to true for a production build. Use env vars in your
// hosting dashboard (Firebase Hosting, Vercel, etc.) for prod control.
const LOCAL_DEV_OVERRIDES = {
    ENABLE_RESEARCH_PLUS: true,
    ENABLE_AI_RESEARCH: true,
    ENABLE_BUDDY: true,
    ENABLE_COMMUNITY: true,
    ENABLE_PAGE_INTROS: true,
    ENABLE_SOFT_DOWNGRADE: true,
};

export const featureFlags = {
    ENABLE_RESEARCH_PLUS: parseFlag(env.VITE_ENABLE_RESEARCH_PLUS, LOCAL_DEV_OVERRIDES.ENABLE_RESEARCH_PLUS),
    ENABLE_AI_RESEARCH: parseFlag(env.VITE_ENABLE_AI_RESEARCH, LOCAL_DEV_OVERRIDES.ENABLE_AI_RESEARCH),
    ENABLE_BUDDY: parseFlag(env.VITE_ENABLE_BUDDY, LOCAL_DEV_OVERRIDES.ENABLE_BUDDY),
    ENABLE_COMMUNITY: parseFlag(env.VITE_ENABLE_COMMUNITY, LOCAL_DEV_OVERRIDES.ENABLE_COMMUNITY),
    ENABLE_PAGE_INTROS: parseFlag(env.VITE_ENABLE_PAGE_INTROS, LOCAL_DEV_OVERRIDES.ENABLE_PAGE_INTROS),
    ENABLE_SOFT_DOWNGRADE: parseFlag(env.VITE_ENABLE_SOFT_DOWNGRADE, LOCAL_DEV_OVERRIDES.ENABLE_SOFT_DOWNGRADE),
};

/**
 * Helper: check a single flag. Prefer this over direct `featureFlags.X`
 * access so we can add telemetry / A-B slicing later in one place.
 */
export function isFeatureEnabled(flagName) {
    return Boolean(featureFlags[flagName]);
}

/**
 * Dev helper: override a flag at runtime (dev / QA only).
 * Persists to localStorage so it survives reload. Call with null to clear.
 */
export function setDevFlagOverride(flagName, value) {
    if (!(flagName in featureFlags)) {
        console.warn(`[featureFlags] Unknown flag: ${flagName}`);
        return;
    }
    try {
        const key = 'tpprover_dev_flag_overrides';
        const raw = localStorage.getItem(key);
        const overrides = raw ? JSON.parse(raw) : {};
        if (value === null) {
            delete overrides[flagName];
        } else {
            overrides[flagName] = Boolean(value);
        }
        localStorage.setItem(key, JSON.stringify(overrides));
        featureFlags[flagName] = value === null
            ? parseFlag(env[`VITE_${flagName}`], LOCAL_DEV_OVERRIDES[flagName])
            : Boolean(value);
    } catch (e) {
        console.warn('[featureFlags] Failed to persist override', e);
    }
}

// Apply any persisted dev overrides on module load.
try {
    const raw = typeof localStorage !== 'undefined'
        ? localStorage.getItem('tpprover_dev_flag_overrides')
        : null;
    if (raw) {
        const overrides = JSON.parse(raw);
        Object.keys(overrides).forEach((k) => {
            if (k in featureFlags) featureFlags[k] = Boolean(overrides[k]);
        });
    }
} catch {
    // ignore — missing localStorage (SSR) or bad JSON
}

export default featureFlags;
