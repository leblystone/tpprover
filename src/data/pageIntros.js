/**
 * Page intro copy — shown the FIRST time a user visits each route.
 *
 * Keyed by route path. The `usePageIntro` hook checks
 * `localStorage['tpprover_page_intros_seen']` (a Set of route keys)
 * and surfaces a `PageIntroModal` when a key is missing.
 *
 * Keep copy short — 1 sentence title, 1-2 sentences body, 3 bullets max.
 */

export const pageIntros = {
    '/app/dashboard': {
        title: 'This is your Dashboard',
        body: 'Your at-a-glance view of today\'s doses, inventory, and progress.',
        bullets: [
            'Tap any widget to open it in full.',
            'Hold-drag widgets to rearrange them (desktop).',
            'Your Reconstitution Calculator is always one tap away.',
        ],
    },
    '/app/protocols': {
        title: 'Protocols',
        body: 'Create and manage your research protocols. Each protocol has its own schedule, dose, and notes.',
        bullets: [
            'Tap New Protocol to get started.',
            'Mark doses done from the Calendar or Dashboard.',
            'All protocols archive cleanly — nothing is ever lost.',
        ],
    },
    '/app/calendar': {
        title: 'Calendar',
        body: 'Every scheduled dose shows up here. Color-coded by protocol.',
        bullets: [
            'Tap a day to log doses or add notes.',
            'Swipe through weeks or jump to month view.',
            'Notes timestamp automatically.',
        ],
    },
    '/app/stockpile': {
        title: 'Stockpile',
        body: 'Track every vial: quantity, storage, and expiration date.',
        bullets: [
            'The Dashboard warns you 30 days before anything expires.',
            'Received orders auto-sync here.',
            'Tap any vial to see its recon calculation history.',
        ],
    },
    '/app/orders': {
        title: 'Orders',
        body: 'Your history of incoming peptide orders.',
        bullets: [
            'Mark Received → items flow straight into your Stockpile.',
            'Link orders to a vendor to see per-vendor spending over time.',
            'Notes on an order persist forever.',
        ],
    },
    '/app/vendors': {
        title: 'Vendors',
        body: 'Your personal vendor list with ratings, notes, and categories.',
        bullets: [
            'Domestic / International / Group Buy filters.',
            'Link any order to its vendor.',
            'Private to your account.',
        ],
    },
    '/app/recon': {
        title: 'Reconstitution Calculator',
        body: 'Always free — forever. Work out exact BAC water volumes and per-dose unit counts.',
        bullets: [
            'Save results to Vial History.',
            'Share a clean Vial Label card to a research buddy.',
            'No subscription required — safety-critical tooling should never be paywalled.',
        ],
    },
    '/app/insights': {
        title: 'Insights',
        body: 'Charts and trends across your protocols, doses, metrics, and spending.',
        bullets: [
            'Advanced Insights require Research+.',
            'Export any chart as an image.',
            'Metrics tab = body-composition trends.',
        ],
    },
    '/app/goals': {
        title: 'Goals',
        body: 'Set research goals with milestones and track adherence over time.',
        bullets: [
            'Goals pin to your Dashboard as progress bars.',
            'Link goals to specific protocols for auto-tracking.',
        ],
    },
    '/app/community': {
        title: 'Community',
        body: 'Track the forums and groups you follow. Browse the curated Directory on Research+.',
        bullets: [
            'My List = private to you, never shared.',
            'Directory is clearly split: Research (verified) vs Community (user discretion).',
            'Add your own anytime — no approval needed.',
        ],
    },
    '/app/ai': {
        title: 'AI Research',
        body: 'Research-focused assistant with a saved library. Research+ only.',
        bullets: [
            'Chat freely, save useful threads to your library.',
            'Paste AI output → "Pre-fill protocol" creates a draft for you to review.',
            'Safety disclaimers apply — nothing here is medical advice.',
        ],
    },
    '/app/announcements': {
        title: 'Announcements',
        body: 'Updates from the team — what\'s new, what\'s cooking, and known issues.',
        bullets: [
            'React with emojis to tell us what resonates.',
            'Filter by category at the top.',
            'The bell icon shows a dot when there\'s something new.',
        ],
    },
    '/app/account/buddy': {
        title: 'Buddy System',
        body: 'Track two users on one account — perfect for a research partner or spouse.',
        bullets: [
            'Each entry has an owner label.',
            'Calendar color-codes doses by owner.',
            'Switch focus with the filter chip in the Topbar.',
        ],
    },
    '/app/settings/help': {
        title: 'Help Center',
        body: 'Quick guides for the app plus the full FAQ — all searchable.',
        bullets: [
            'Search across both sources from the bar at the top.',
            'Contact Support if nothing helps.',
        ],
    },
};

export function getIntroForRoute(pathname, search = '') {
    if (!pathname) return null;
    // Strip query/hash from pathname; `search` is location.search (e.g. ?tab=community)
    const clean = pathname.split('?')[0].split('#')[0].replace(/\/$/, '');
    const params = new URLSearchParams(search && !search.startsWith('?') ? `?${search}` : search);
    if (clean === '/app/vendors' && params.get('tab') === 'community') {
        return pageIntros['/app/community'] || null;
    }
    return pageIntros[clean] || null;
}
