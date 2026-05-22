/**
 * Page intro copy — shown the FIRST time a user visits each route.
 *
 * Keyed by route path. The `usePageIntro` hook checks
 * `localStorage['tpprover_page_intros_seen']` (a map of routeKey → version)
 * and surfaces a `PageIntroModal` when the stored version is behind the
 * current one (or missing entirely).
 *
 * To re-show a tip for ALL users after a significant page update, simply
 * increment that page's `version` number. No announcement copy needed —
 * the tip surfaces naturally on next visit.
 *
 * Keep copy short — 1 sentence title, 1-2 sentences body, 3 bullets max.
 */

export const pageIntros = {
    '/app/dashboard': {
        version: 1,
        title: 'This is your Dashboard',
        body: 'A quick snapshot of today\'s research — what\'s due, what\'s low, and what\'s next.',
        bullets: [
            'Tap any widget to jump straight into that section.',
            'Use the Quick Action button at the bottom to log a dose, reconstitute, or add a note — fast.',
            'Widgets update in real time as you log doses and manage inventory.',
        ],
    },
    '/app/protocols': {
        version: 1,
        title: 'Protocols',
        body: 'Build your full research plan here — peptides, schedules, dosing, and notes all in one place.',
        bullets: [
            'Each protocol tracks its own peptide, dose, frequency, and injection site.',
            'Switch between Active and Archived to keep things tidy without losing history.',
            'Tap any protocol to edit its schedule, pause it, or view its full dose log.',
        ],
    },
    '/app/calendar': {
        version: 1,
        title: 'Calendar',
        body: 'See every upcoming and past dose laid out by day, color-coded to each protocol.',
        bullets: [
            'Tap a day to mark doses as done, skip them, or add a note.',
            'Colored dots match your protocol colors so you can tell them apart at a glance.',
            'Switch between week and month view depending on how far ahead you want to look.',
        ],
    },
    '/app/stockpile': {
        version: 1,
        title: 'Stockpile',
        body: 'Everything you have on hand — vials, quantities, and when they expire.',
        bullets: [
            'Items that are running low or expiring soon are flagged so you never get caught off guard.',
            'When you mark an order as received, those items show up here automatically.',
            'Tap any item to see its full history, including past reconstitutions.',
        ],
    },
    '/app/orders': {
        version: 1,
        title: 'Orders',
        body: 'Keep a running record of what you\'ve ordered, from whom, and whether it\'s arrived.',
        bullets: [
            'Mark an order as Received and its items move straight into your Stockpile.',
            'Link an order to a vendor so you can track spending per source over time.',
            'Add notes to any order — they\'re saved permanently for your reference.',
        ],
    },
    '/app/vendors': {
        version: 1,
        title: 'Vendors',
        body: 'Your private list of suppliers — rate them, take notes, and organize by type.',
        bullets: [
            'Filter between Domestic, International, and Group Buy sources.',
            'Rate vendors and add notes so you remember your experience.',
            'Everything here is private to your account — no one else sees your list.',
        ],
    },
    '/app/recon': {
        version: 1,
        title: 'Reconstitution Calculator',
        body: 'Figure out exactly how much BAC water to add and how many units per dose — always free.',
        bullets: [
            'Enter your vial size and desired dose, and the math is done for you instantly.',
            'Save your results to Vial History so you can reference them later.',
            'Share a clean Vial Label card with a research buddy if you want a second set of eyes.',
        ],
    },
    '/app/insights': {
        version: 1,
        title: 'Insights',
        body: 'See the bigger picture — trends in your dosing, spending, and body metrics over time.',
        bullets: [
            'Track adherence, total doses, and spending across all your protocols.',
            'Log body metrics like weight and composition to see changes over time.',
            'Export any chart as an image to save or share. Advanced charts require Research+.',
        ],
    },
    '/app/goals': {
        version: 1,
        title: 'Goals',
        body: 'Set targets for your research and watch your progress build over time.',
        bullets: [
            'Create goals with milestones so you can break big targets into smaller steps.',
            'Link a goal to a protocol and your progress updates automatically as you log doses.',
            'Active goals show up on your Dashboard as progress bars so you never lose sight of them.',
        ],
    },
    '/app/community': {
        version: 1,
        title: 'Community',
        body: 'Save the forums and groups you follow in one place. Explore the Directory on Research+.',
        bullets: [
            'My List is completely private — only you can see what you\'ve saved.',
            'The Directory is split into Research (verified sources) and Community (peer groups).',
            'Add your own forums or groups anytime — no approval needed.',
        ],
    },
    '/app/ai': {
        version: 1,
        title: 'AI Research',
        body: 'Ask research questions and get answers you can save, organize, and turn into protocols.',
        bullets: [
            'Start a conversation and save useful threads to your personal library.',
            'Use "Pre-fill Protocol" to turn an AI response into a draft protocol you can review and edit.',
            'This is a research tool, not medical advice — always verify before acting on anything.',
        ],
    },
    '/app/announcements': {
        version: 1,
        title: 'Announcements',
        body: 'Stay in the loop — app updates, new features, and anything you need to know.',
        bullets: [
            'New posts show a badge on the newspaper icon so you know when something\'s fresh.',
            'Filter by category to find what matters to you.',
            'React with emojis to share quick feedback with the team.',
        ],
    },
    '/app/account/buddy': {
        version: 1,
        title: 'Buddy System',
        body: 'Co-track one research partner inside your Research+ account — not a second login or full analytics seat.',
        bullets: [
            'Tag protocols, supplements, and tasks as Mine or Theirs.',
            'Buddy cards and calendar rows use darker styling so schedules stay clear.',
            'Your analytics, streaks, and AI Research stay with you — buddies need their own account for that.',
        ],
    },
    '/app/settings/help': {
        version: 1,
        title: 'Help Center',
        body: 'Quick guides, FAQs, and direct support — all in one spot.',
        bullets: [
            'Use the search bar to find answers across guides and FAQs at the same time.',
            'Can\'t find what you need? Tap Contact Support and we\'ll get back to you.',
            'Guides walk you through the most common tasks step by step.',
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
