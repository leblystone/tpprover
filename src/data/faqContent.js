/**
 * Shared FAQ content.
 *
 * Used by:
 *   - src/pages/FAQ.jsx              (public landing FAQ — SEO)
 *   - src/pages/settings/SettingsHelp.jsx (in-app Help Center)
 *
 * Keeping both reads off this file means marketing answers and in-app
 * answers never drift. Add in-app-specific operational guides under
 * `inAppGuides` below — those are short "how do I..." walkthroughs
 * that don't make sense on the public landing page.
 */

/**
 * Icon map: Lucide icon *name* string for each category.
 * SettingsHelp reads these to render icon tiles.
 */
export const CATEGORY_ICONS = {
    'About The Pep Planner':         'FlaskConical',
    'Getting Started':               'Rocket',
    'Protocol Tracking & Management':'ClipboardList',
    'Inventory & Stockpile Management':'Boxes',
    'Features & Tools':              'Wrench',
    'Data & Security':               'Shield',
    'Support & Help':                'LifeBuoy',
    'Daily Workflow':                'Calendar',
    'Recon Calculator':              'Calculator',
    'Inventory & Orders':            'ShoppingCart',
    'Plans, Subscriptions & Data':   'CreditCard',
};

/**
 * App how-it-works roadmap steps.
 * Shown as a visual walkthrough in Settings → Help Center.
 */
export const appRoadmap = [
    {
        phase: 'Setup',
        color: '#7F9E95',
        icon: 'UserPlus',
        title: 'Create your account',
        body: 'Sign up for a free trial — no credit card required. You immediately get access to all core features including the Recon Calculator, Protocol builder, and Stockpile tracker.',
    },
    {
        phase: 'Protocols',
        color: '#7F9E95',
        icon: 'ClipboardList',
        title: 'Build your first protocol',
        body: 'Go to Research → Protocols → New Protocol. Pick the compound, set your dose, frequency, and start date. Once saved it appears on your Calendar and Dashboard automatically.',
    },
    {
        phase: 'Stockpile',
        color: '#7F9E95',
        icon: 'Boxes',
        title: 'Track your inventory',
        body: 'Research → Stockpile shows every vial you own. When you receive an order, mark it as Received and the line items auto-add to your stockpile. Expirations surface on your Dashboard.',
    },
    {
        phase: 'Recon',
        color: '#7F9E95',
        icon: 'Calculator',
        title: 'Reconstitute with confidence',
        body: 'Research → Recon Calculator. Enter vial mg, BAC water mL, and your desired dose. The result tells you exactly how many units to draw. Save to Vial History for instant recall.',
    },
    {
        phase: 'Daily use',
        color: '#7F9E95',
        icon: 'Calendar',
        title: 'Log doses from the Dashboard',
        body: 'Your Dashboard shows today\'s pending doses. Tap any dose chip → Mark Done → pick injection site. The app rotates site suggestions automatically and logs the time-stamp.',
    },
    {
        phase: 'Insights',
        color: '#7F9E95',
        icon: 'BarChart2',
        title: 'Review analytics & goals',
        body: 'The Analytics widget and Goals page track adherence, spending, and protocol progress over time. Set milestones and see a summary of your research history at a glance.',
    },
    {
        phase: 'Research+',
        color: '#C8912A',
        icon: 'Sparkles',
        title: 'Upgrade to Research+',
        body: 'Unlocks AI-assisted protocol research, unlimited protocols, cloud sync across devices, the Research Partner system, the Community directory, and advanced analytics.',
    },
];

export const publicFaqCategories = [
    {
        title: 'About The Pep Planner',
        faqs: [
            {
                question: 'What is The Pep Planner?',
                answer:
                    'The Pep Planner is a peptide research protocol management app built by a fellow researcher who got tired of managing everything in messy spreadsheets. It handles your protocols, stockpile, reconstitution math, vendor contacts, orders, and research calendar all in one place — synced across every device. The goal is simple: less time on record-keeping, more time focused on your actual research.',
            },
            {
                question: 'What is peptide research?',
                answer:
                    'Peptide research involves studying peptides — short chains of amino acids that occur naturally in the body — for purposes ranging from health optimization and body composition to longevity and performance. It\'s a fast-growing space, and managing it properly takes more than a sticky note and a prayer. The Pep Planner gives you the structure to stay organized and consistent no matter what your research goals are.',
            },
            {
                question: 'What makes The Pep Planner different from other research tracking tools?',
                answer:
                    'Most tracking apps are built for general wellness or medication management — they weren\'t designed with a peptide researcher\'s workflow in mind. The Pep Planner was built from the ground up for this: reconstitution math baked in, titration scheduling, protocol phase management, injection site rotation, vial-level stockpile tracking, washout visualization, and vendor management. It\'s the difference between forcing a generic tool to do something it wasn\'t made for versus using one that just gets it.',
            },
            {
                question: 'Is there a better alternative to spreadsheets for tracking peptide research?',
                answer:
                    'If you\'ve tried managing multiple active peptide protocols in a spreadsheet you already know the pain — formulas that break, reminders you have to babysit, zero stockpile visibility. The Pep Planner replaces all of that with a purpose-built research tracker: automated dosing schedules, built-in reconstitution calculations, injection site rotation, vial expiration alerts, and order-to-stockpile syncing. Your spreadsheet definitely can\'t do that.',
            },
            {
                question: 'Can I use The Pep Planner to track GLP-1 peptides like semaglutide or tirzepatide?',
                answer:
                    'Absolutely. The Pep Planner works for any compound you\'re researching — GLP-1 peptides like semaglutide, tirzepatide, BPC-157, TB-500, CJC-1295, NAD+, you name it. You can set up weekly or bi-weekly dosing schedules, map out titration phases, log injection sites, and keep an eye on your stockpile across the full protocol. If you\'re researching it, you can track it here.',
            },
            {
                question: 'What is a peptide washout period and can the app track it?',
                answer:
                    'A washout period is the time it takes for a compound to fully clear your system after your last dose — usually several half-lives. The Pep Planner visualizes washout windows directly on your research calendar so you always know where you are in a cycle and when you\'re clear. No math required.',
            },
        ],
    },
    {
        title: 'Getting Started',
        faqs: [
            {
                question: 'How do I get started?',
                answer:
                    'Sign up for free — no credit card required during the trial. You\'ll have immediate access to the Protocol builder, Recon Calculator, and Stockpile tracker. Most researchers have their first protocol running within a few minutes of signing up.',
            },
            {
                question: 'Is there a mobile app?',
                answer:
                    'Yes. The Pep Planner is available as a native iOS app on the App Store, an Android app on Google Play, and a full web version you can access from any browser on desktop or mobile. Your data stays in sync across all of them.',
            },
            {
                question: 'Can I import data from spreadsheets or other tools?',
                answer:
                    'Yes — The Pep Planner has an import tool for bringing your existing research data in. You can also export everything at any time, in formats that work outside the app. Your data is always yours and we don\'t hold it hostage.',
            },
            {
                question: 'How much does The Pep Planner cost?',
                answer:
                    'There\'s a free tier, a Research+ monthly plan, a Research+ annual plan (better value), and a lifetime access option for researchers who want to pay once and move on. The Recon Calculator is always free regardless of plan. Visit the pricing page or just sign up and explore — no credit card needed to start.',
            },
        ],
    },
    {
        title: 'Protocol Tracking & Management',
        faqs: [
            {
                question: 'How does protocol tracking work?',
                answer:
                    'You build a protocol by picking the compound, setting your dose, frequency, delivery method, and start date. The app handles the calendar scheduling, generates daily dose reminders, and tracks your adherence automatically. You can run multiple active protocols simultaneously, pause and resume dosing phases, schedule titration increases, and log notes on any given day. It\'s everything you used to do manually, finally automated.',
            },
            {
                question: 'Can I manage multiple research protocols?',
                answer:
                    'Absolutely — there\'s no limit on Research+ plans. You can run multiple compounds at the same time, organize them however makes sense to you, and see everything laid out on a single calendar view. The Dashboard surfaces today\'s doses across all active protocols so nothing slips through the cracks.',
            },
            {
                question: 'Can I track injection sites and rotation schedules?',
                answer:
                    'Yes, and this is one of those features that sounds small until you\'ve been tracking rotation manually for a few months. Every time you log a dose you can record the injection site, and the app suggests the next site in rotation automatically. Your full injection history stays logged so you always know where you were last.',
            },
            {
                question: 'How do I track my research progress and outcomes?',
                answer:
                    'Goal setting, adherence tracking, protocol milestone markers, and a full analytics dashboard. You can set research objectives, monitor protocol consistency, track spending over time, and review your complete dosing history. There\'s also a notes field on every protocol day — those observations you think you\'ll remember but definitely won\'t.',
            },
        ],
    },
    {
        title: 'Inventory & Stockpile Management',
        faqs: [
            {
                question: 'Can I track my peptide stockpile?',
                answer:
                    'The stockpile tracker is one of the most-used features in the app. Each vial you own gets its own entry — amount, concentration, expiration date, storage notes, and recon history. The Dashboard flags anything expiring soon and the Calendar shows washout periods so you know exactly where you stand at all times. No more "wait, how much do I have left?"',
            },
            {
                question: 'How does the order management feature work?',
                answer:
                    'Add an incoming order with the vendor, compounds, and quantities. When it arrives, mark it Received — everything drops straight into your Stockpile automatically, no double entry. You keep a full order history organized by vendor so you can see what you\'ve ordered from whom and when, all in one place.',
            },
        ],
    },
    {
        title: 'Features & Tools',
        faqs: [
            {
                question: 'What features are included?',
                answer:
                    'Protocol builder and scheduler, Recon Calculator (always free), stockpile tracker, order management, vendor directory, research calendar with washout visualization, injection site rotation, spending and analytics insights, goal tracking, daily notes, data export, and sync across all your devices. It\'s a lot — and it all lives in one place.',
            },
            {
                question: 'How do I calculate peptide reconstitution dosages?',
                answer:
                    'The Recon Calculator is built right into the app. Enter your vial strength (mg), how much BAC water you\'re adding (mL), and the dose you want to hit (mcg). It tells you exactly how many units to draw. Save the result to your Vial History and it\'ll be there every time you pick that vial back up.',
            },
            {
                question: 'Is the Recon Calculator really always free?',
                answer:
                    'Always. No subscription required, no trial period, no usage cap. Safety-critical tools shouldn\'t sit behind a paywall — full stop. Log in or create an account and it\'s right there.',
            },
            {
                question: 'What analytics are available?',
                answer:
                    'Protocol adherence rates, dosing consistency over time, spending by compound and vendor, inventory trends, and protocol milestone tracking. Research+ unlocks deeper insights — patterns in your data, order history analysis, and a full research timeline that makes it easy to look back and actually understand what happened.',
            },
        ],
    },
    {
        title: 'Data & Security',
        faqs: [
            {
                question: 'Is my research data secure?',
                answer:
                    'Your data is stored securely and encrypted — we take that seriously. We don\'t sell it, we don\'t share it with third parties, and we don\'t monetize it. Your research is yours, full stop. The privacy policy is written in plain English — no legal gymnastics required to understand what we do with your data.',
            },
            {
                question: 'Can I sync data across devices?',
                answer:
                    'Cloud sync is included with Research+ and Founder plans. Once enabled, your protocols, stockpile, orders, and notes stay in sync across web, iOS, and any other device you sign into. Pick up exactly where you left off, every time.',
            },
            {
                question: 'Does The Pep Planner work offline?',
                answer:
                    'Yes — the mobile and web apps both handle basic viewing and data entry without a connection. Anything you log saves automatically and syncs when you\'re back online. Handy when your research setup isn\'t exactly near a Wi-Fi hotspot.',
            },
        ],
    },
    {
        title: 'Research+',
        faqs: [
            {
                question: 'What is Research+ and what does it include?',
                answer:
                    'Research+ is the paid plan that unlocks everything the app can do for the account holder: unlimited protocols and stockpile entries, PiP (the AI research assistant), advanced analytics and streaks, premium themes, and sync across all your devices. It also includes the Buddy System — co-tracking for one research partner inside your account (not a second login or full duplicate subscription). The free plan is genuinely useful for getting started — Research+ is where the app fully opens up. Monthly, annual, and lifetime options are all available.',
            },
            {
                question: 'What is the AI Research feature?',
                answer:
                    'PiP is The Pep Planner\'s built-in AI research assistant. Ask questions about compounds, protocols, and dosing without ever leaving your dashboard. PiP is context-aware — it knows what protocols you\'re currently running — so you get relevant answers without copying and pasting information between tabs. Available on Research+ plans.',
            },
            {
                question: 'What is the Buddy System?',
                answer:
                    'The Buddy System lets you co-track one research partner inside your Research+ account — their protocols, doses, and stockpile tagged separately from yours, with calendar and list filters by person. It is ideal when one person manages the data for both of you. It is not a second full account: no separate login, and advanced analytics and streaks stay with the account holder. If your buddy wants their own analytics and AI history, they can export their data and subscribe separately. Available on Research+ only.',
            },
            {
                question: 'Does my buddy get their own analytics, streaks, or login?',
                answer:
                    'No. Buddy co-tracking covers day-to-day research logging — protocols, supplements, stockpile, and calendar tasks — under your one account. Advanced analytics, streaks, spending insights, and AI Research (PiP) apply to you as the Research+ subscriber. Your buddy\'s tasks do not affect your streak. If they want a full personal dashboard, analytics, and their own subscription, use Export on the Buddy page and have them create their own account.',
            },

            {
                question: 'What happens when my free trial ends?',
                answer:
                    'Nothing is deleted — ever. You move to the free plan, which keeps one active protocol and up to five stockpile entries. Everything you added during the trial stays visible. You just can\'t add more until you upgrade. When you\'re ready to go all in, it\'s one tap to restore full access.',
            },
        ],
    },
    {
        title: 'Support & Help',
        faqs: [
            {
                question: 'What kind of support is available?',
                answer:
                    'There\'s an in-app Help Center with step-by-step guides for every major feature, a built-in support form for direct questions, and email support for anything more involved. We\'re a small, founder-led product — when you reach out, you\'re talking to someone who actually built the thing and uses it themselves.',
            },
        ],
    },
];

/**
 * In-app operational guides — "how do I do X in the app".
 * These are shorter, task-focused, and live alongside the public FAQ
 * inside Settings → Help Center. Group by workflow area.
 */
export const inAppGuides = [
    {
        title: 'Daily Workflow',
        entries: [
            {
                question: 'How do I add my first protocol?',
                answer:
                    'Open the Protocols tab, tap New Protocol, name it, pick the peptide, set your dose, frequency, and start date. Save. It\'ll show on your Calendar and Dashboard immediately.',
            },
            {
                question: 'How do I log an injection / dose?',
                answer:
                    'From the Dashboard or Calendar, tap the pending dose chip → Mark Done. You can also pick the injection site here — the app will rotate your site suggestions automatically.',
            },
            {
                question: 'Where do notes go?',
                answer:
                    'Every protocol and every calendar day has a notes slot. Tap the pencil icon to add timestamped notes. They sync across devices if you\'re on Research+ or Founder.',
            },
        ],
    },
    {
        title: 'Recon Calculator',
        entries: [
            {
                question: 'What is the Recon Calculator?',
                answer:
                    'It figures out the exact volume of bacteriostatic water to add to a vial so each dose you draw lands on a clean unit mark. Safety-critical → always free, no subscription needed.',
            },
            {
                question: 'How do I use it?',
                answer:
                    'Open the Recon Calculator, enter vial strength (mg), BAC water volume (mL), and your desired dose. The calculator tells you exactly how many units to draw. Save the result to Vial History so you can reopen it from your Stockpile.',
            },
            {
                question: 'Can I share a recon calculation?',
                answer:
                    'Yes. After calculating, hit Share Vial — generates a clean label / card you can save as image or send to a research buddy.',
            },
        ],
    },
    {
        title: 'Inventory & Orders',
        entries: [
            {
                question: 'How does stockpile auto-sync to orders?',
                answer:
                    'When you mark an order as Received, the app adds its line items to your Stockpile automatically. No manual duplicate entry.',
            },
            {
                question: 'How do I track vial expirations?',
                answer:
                    'Each stockpile item has an expiration date. The Dashboard surfaces anything within 30 days of expiring, and the Calendar shows them as gentle reminders.',
            },
            {
                question: 'Where do I manage vendors?',
                answer:
                    'Vendors tab. Add a name, source, notes, and rating. Orders can be linked to a vendor so you can see your full history with them over time.',
            },
        ],
    },
    {
        title: 'Plans, Subscriptions & Data',
        entries: [
            {
                question: 'What happens if my trial expires?',
                answer:
                    'Nothing is deleted. You\'re downgraded to Free, which caps new protocols at 1 and stockpile items at 10. Everything you added during the trial stays visible and editable — you just can\'t add more until you upgrade.',
            },
            {
                question: 'How do I upgrade?',
                answer:
                    'Account → Subscription → Change Plan. Research+ unlocks unlimited protocols & stockpile, AI Research, Buddy System, Community Directory, advanced insights, and cloud sync.',
            },
            {
                question: 'Is the Recon Calculator capped on the Free plan?',
                answer:
                    'No. Recon is always free. Full calculator, full history, always available.',
            },
            {
                question: 'How do I export my data?',
                answer:
                    'Account → Data → Export. Generates CSV snapshots of your protocols, stockpile, orders, and calendar notes.',
            },
        ],
    },
];

/**
 * Flatten both sources into a single array of Q/A pairs. Used by the
 * FAQ search bar in Settings → Help Center.
 */
export function getAllFaqEntries() {
    const fromPublic = publicFaqCategories.flatMap((cat) =>
        cat.faqs.map((f) => ({
            group: cat.title,
            source: 'public',
            question: f.question,
            answer: f.answer,
        }))
    );
    const fromGuides = inAppGuides.flatMap((cat) =>
        cat.entries.map((f) => ({
            group: cat.title,
            source: 'in_app',
            question: f.question,
            answer: f.answer,
        }))
    );
    return [...fromGuides, ...fromPublic];
}
