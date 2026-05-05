/**
 * Subscription plans — Research+ Wave.
 *
 * TIER MODEL:
 *   - free           → new signups only; capped access (1 protocol, 10 stockpile, no AI/Buddy/Directory/cloud)
 *   - founder        → grandfathered $3.99/$36.99 users; CLOSED to new signups; gets every future feature
 *   - research_plus  → new paid tier; $4.99/mo · $39.99/yr · $99.99 lifetime; full access
 *
 * PLAN KEYS:
 *   Legacy keys `monthly`, `annual`, `lifetime` are preserved and alias the
 *   `founder*` variants so existing checkout/webhook code keeps working.
 *   New `researchPlus*` keys are what new signups see.
 */

// --- FOUNDER (grandfathered, closed to new signups) ---
const founderMonthly = {
    key: 'founderMonthly',
    tier: 'founder',
    label: 'Founder Monthly',
    interval: 'month',
    price: 3.99,
    cta: 'Your Founder Plan',
    grandfathered: true,
};

const founderAnnual = {
    key: 'founderAnnual',
    tier: 'founder',
    label: 'Founder Annual',
    interval: 'year',
    price: 36.99,
    cta: 'Your Founder Plan',
    grandfathered: true,
};

const founderLifetime = {
    key: 'founderLifetime',
    tier: 'founder',
    label: 'Founder Lifetime',
    interval: 'lifetime',
    price: 99.99,
    cta: 'Your Founder Plan',
    grandfathered: true,
};

// --- RESEARCH+ (new users) ---
const researchPlusMonthly = {
    key: 'researchPlusMonthly',
    tier: 'research_plus',
    label: 'Research+ Monthly',
    interval: 'month',
    price: 4.99,
    cta: 'Start Monthly',
    description: 'AI Research, Buddy, Community Directory — everything unlocked.',
};

const researchPlusAnnual = {
    key: 'researchPlusAnnual',
    tier: 'research_plus',
    label: 'Research+ Annual',
    interval: 'year',
    price: 39.99,
    cta: 'Start Annual',
    description: 'Best for year-round research — effectively $3.33/month.',
    highlight: true, // default-highlighted in the Pricing page
};

const researchPlusLifetime = {
    key: 'researchPlusLifetime',
    tier: 'research_plus',
    label: 'Research+ Lifetime',
    interval: 'lifetime',
    price: 99.99,
    cta: 'Join Forever',
    description: 'One-time payment. Keeps up with every future feature.',
};

export const SUBSCRIPTION_PLANS = {
    // New plan keys (shown to new signups)
    free: {
        key: 'free',
        tier: 'free',
        label: 'Free',
        interval: 'free',
        price: 0,
        cta: 'Continue Free',
        description: '1 protocol, 10 stockpile items, full Recon Calculator. Upgrade anytime.',
    },
    researchPlusMonthly,
    researchPlusAnnual,
    researchPlusLifetime,

    // Founder plan keys (grandfathered users only — hidden from signup flows)
    founderMonthly,
    founderAnnual,
    founderLifetime,

    // Legacy aliases — keep existing code paths working.
    // Any call site that reads `SUBSCRIPTION_PLANS.monthly` now gets the
    // founderMonthly shape, which is what existing subscribers have.
    monthly: founderMonthly,
    annual: founderAnnual,
    lifetime: founderLifetime,
};

/**
 * Plans displayed on the public Pricing page / signup flows.
 * Founder plans are intentionally excluded — they're only shown to
 * grandfathered users in Account → Subscription.
 */
export const PUBLIC_PLAN_KEYS = ['researchPlusMonthly', 'researchPlusAnnual', 'researchPlusLifetime'];

/**
 * Tier -> feature matrix. Single source of truth for what each tier can do.
 * Caps `null` means unlimited. Helpers in useSubscriptionAccess read from here.
 */
export const TIER_FEATURES = {
    free: {
        maxActiveProtocols: 1,
        maxStockpileItems: 5,   // each individual entry counts (not grouped by compound)
        maxSupplements: 1,
        maxOrders: 1,           // active (non-delivered) orders; delivered orders are historical and don't count
        maxSavedCalcs: 1,       // Recon calculator always usable; 1 saved result allowed
        hasCloudSync: false,    // cross-device cloud sync is a Research+ premium feature
        hasAIAccess: true,
        hasBuddyAccess: false,
        hasDirectoryAccess: false,
        hasAdvancedInsights: false,
        hasPremiumThemes: false,
        aiDailyQuota: 3,
    },
    founder: {
        maxActiveProtocols: null,
        maxStockpileItems: null,
        hasCloudSync: true,
        hasAIAccess: true,
        hasBuddyAccess: true,
        hasDirectoryAccess: true,
        hasAdvancedInsights: true,
        hasPremiumThemes: true,
        aiDailyQuota: 100,
    },
    research_plus: {
        maxActiveProtocols: null,
        maxStockpileItems: null,
        hasCloudSync: true,
        hasAIAccess: true,
        hasBuddyAccess: true,
        hasDirectoryAccess: true,
        hasAdvancedInsights: true,
        hasPremiumThemes: true,
        aiDailyQuota: 50,
    },
};

/**
 * Pricing cutoff for founder migration.
 * Any user with `createdAt < PRICING_CUTOFF_DATE` who holds a legacy
 * monthly/annual/lifetime plan gets stamped `isFounder: true` and
 * `tier: 'founder'` by the one-off `migrateFounderTier` function.
 *
 * Set this to the exact UTC instant you flip ENABLE_RESEARCH_PLUS on.
 * Until then it's a conservative placeholder (future-dated so no user
 * gets accidentally flagged in staging runs).
 */
export const PRICING_CUTOFF_DATE = new Date('2026-04-30T23:59:59Z');

/**
 * Founding Member cutoff — the moment Research+ launches publicly.
 *
 * ANY user (free or paid) whose account was created before this date
 * earns a permanent "Founding Member" badge, visible across the app.
 * This is a separate concept from the `tier: 'founder'` paid bucket —
 * free-tier users who stuck around early still get the badge as a
 * thank-you, even if they never paid.
 *
 * Set to April 30 2026 — the day Research+ launched. Any account
 * created after this date is a new user and does NOT qualify.
 */
export const FOUNDERS_CUTOFF_DATE = PRICING_CUTOFF_DATE;

/**
 * True if the given user signed up before Research+ launched.
 * Accepts either a Date, a Firestore Timestamp, an ISO string, or a
 * number (unix ms) in `createdAt`. Nullish inputs return false.
 */
export function isFoundingMember(user) {
    if (!user) return false;
    // Honor any explicit server-stamped flag first (from migration).
    if (user.isFoundingMember === true) return true;
    const raw = user.createdAt || user.created_at || user.signupDate || user.createdDate;
    if (!raw) return false;
    let created;
    try {
        if (raw?.toDate) created = raw.toDate();
        else if (typeof raw === 'number') created = new Date(raw);
        else created = new Date(raw);
    } catch {
        return false;
    }
    if (Number.isNaN(created?.getTime?.())) return false;
    return created.getTime() < FOUNDERS_CUTOFF_DATE.getTime();
}

export function getFounderPrice(basePrice, discountPercent) {
    if (!discountPercent || discountPercent <= 0) {
        return basePrice;
    }
    const discounted = basePrice * (1 - discountPercent / 100);
    return Math.max(0, Number(discounted.toFixed(2)));
}

export function getPlanPricing(planKey, discountPercent) {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
        return null;
    }

    const founderPrice = getFounderPrice(plan.price, discountPercent);

    let savings = 0;
    if (planKey === 'researchPlusAnnual' || planKey === 'annual' || planKey === 'founderAnnual') {
        const monthlyBasis = SUBSCRIPTION_PLANS.researchPlusMonthly.price;
        const yearly = monthlyBasis * 12;
        savings = Number((yearly - founderPrice).toFixed(2));
    } else {
        savings = Number((plan.price - founderPrice).toFixed(2));
    }

    return {
        ...plan,
        founderPrice,
        savings,
        discountPercent,
    };
}

/**
 * Given a raw subscription doc (from Firestore / webhook), derive the
 * canonical tier the user should be treated as.
 *
 * Priority:
 *   1. Explicit `tier` field on the doc (webhook-authoritative)
 *   2. `isFounder: true` flag set by migration
 *   3. Plan key lookup in SUBSCRIPTION_PLANS
 *   4. Fallback: 'free'
 */
export function deriveTierFromSubscription(subscription) {
    if (!subscription) return 'free';
    if (subscription.tier && TIER_FEATURES[subscription.tier]) {
        return subscription.tier;
    }
    if (subscription.isFounder === true) return 'founder';
    // Active trial — give full Research+ feature access so users experience
    // the product before committing. Hard lockouts (e.g. Buddy System) are
    // enforced separately via subscriptionStatus checks.
    if (subscription.status === 'trialing') return 'research_plus';
    const planKey = subscription.plan || subscription.planKey || subscription.product;
    if (planKey && SUBSCRIPTION_PLANS[planKey]) {
        return SUBSCRIPTION_PLANS[planKey].tier || 'free';
    }
    // Legacy shape: interval-only docs (from old checkouts) → treat as founder
    // if the user existed before the cutoff (caller should pass that in).
    if (subscription.interval && ['month', 'monthly', 'year', 'annual', 'lifetime'].includes(subscription.interval)) {
        if (subscription.isFounder === undefined) {
            // Can't determine — default to founder for safety (never downgrade
            // a paying user accidentally). The migration script is the one
            // that decides who is and isn't a founder permanently.
            return 'founder';
        }
    }
    return 'free';
}

/**
 * Look up the TIER_FEATURES record for a given tier, with safe fallback.
 */
export function getTierFeatures(tier) {
    return TIER_FEATURES[tier] || TIER_FEATURES.free;
}
