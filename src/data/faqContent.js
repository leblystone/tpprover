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

export const publicFaqCategories = [
    {
        title: 'About The Pep Planner',
        faqs: [
            {
                question: 'What is The Pep Planner?',
                answer:
                    'The Pep Planner is a professional peptide research protocol management tool that helps researchers track protocols, manage stockpiles, organize orders, and optimize health research with advanced analytics and cloud sync. It\'s designed specifically for researchers conducting peptide research and provides comprehensive tools for organizing and managing research data safely and efficiently.',
            },
            {
                question: 'What is peptide research?',
                answer:
                    'Peptide research involves studying peptides — short chains of amino acids — for various research purposes. Peptides are naturally occurring biological molecules that play important roles in many biological processes. The Pep Planner helps researchers organize and manage their peptide research protocols safely and efficiently, ensuring proper documentation and tracking throughout the research process.',
            },
            {
                question: 'What makes The Pep Planner different from other research tracking tools?',
                answer:
                    'The Pep Planner is specifically designed for peptide research with features like reconstitution calculators, protocol templates, injection site tracking, vendor management, and comprehensive inventory control. Unlike generic tracking tools, The Pep Planner understands the unique needs of peptide research and provides specialized features that make research management more efficient and accurate.',
            },
            {
                question: 'Is there a better alternative to spreadsheets for tracking peptide research?',
                answer:
                    'Yes! The Pep Planner is specifically designed as a better alternative to spreadsheets for peptide research tracking. Unlike spreadsheets, The Pep Planner provides automated reminders, visual calendar views, protocol templates, reconstitution calculators, order tracking, and cloud sync across all devices. It\'s purpose-built for research management with features that spreadsheets simply can\'t provide.',
            },
        ],
    },
    {
        title: 'Getting Started',
        faqs: [
            {
                question: 'How do I get started?',
                answer:
                    'Visit thepepplanner.app and sign up for a free trial. You can start tracking your research protocols immediately. The platform is intuitive and user-friendly, with helpful guides and tutorials to get you started. No credit card required for the trial period.',
            },
            {
                question: 'Is there a mobile app?',
                answer:
                    'Yes, The Pep Planner is available as a Progressive Web App (PWA) that works on mobile devices. You can install it directly from your browser, and it works like a native app. Native mobile apps are also available in app stores for an even better mobile experience.',
            },
            {
                question: 'Can I import data from spreadsheets or other tools?',
                answer:
                    'Yes, The Pep Planner supports data import functionality. You can import your existing research data from spreadsheets or other formats to get started quickly. The platform also allows you to export your data at any time, ensuring you always have access to your research information in formats that work with other tools.',
            },
            {
                question: 'How much does The Pep Planner cost?',
                answer:
                    'The Pep Planner offers flexible pricing options including monthly and annual subscriptions, as well as a lifetime access option. We also offer a free tier and trial so you can try the platform before committing. Visit our pricing page or sign up to see current pricing and subscription options that fit your research needs.',
            },
        ],
    },
    {
        title: 'Protocol Tracking & Management',
        faqs: [
            {
                question: 'How does protocol tracking work?',
                answer:
                    'The Pep Planner allows you to create custom research protocols, schedule dosing and timing, track multiple compounds and supplements, and set reminders for consistency. You can organize protocols by category, set specific dosing schedules, track progress over time, and maintain detailed protocol history. All data syncs across devices via secure cloud storage, so you can access your protocols from anywhere.',
            },
            {
                question: 'Can I manage multiple research protocols?',
                answer:
                    'Absolutely! The Pep Planner is designed to handle multiple research protocols simultaneously. You can organize protocols by category, track different compounds, manage separate dosing schedules, and monitor progress across all your active research projects from a single dashboard.',
            },
            {
                question: 'Can I track injection sites and rotation schedules?',
                answer:
                    'Yes! The Pep Planner includes injection site tracking functionality that helps you manage rotation schedules. You can track where injections are administered, maintain proper rotation patterns, and ensure you\'re following best practices for injection site management.',
            },
            {
                question: 'How do I track my research progress and outcomes?',
                answer:
                    'The Pep Planner includes comprehensive progress tracking with goal setting, milestone tracking, and analytics dashboards. You can set research objectives, track protocol adherence, monitor dosing consistency, and view detailed reports on your research activities.',
            },
        ],
    },
    {
        title: 'Inventory & Stockpile Management',
        faqs: [
            {
                question: 'Can I track my peptide stockpile?',
                answer:
                    'Yes! The Pep Planner includes aggressive vial tracking so you always know how much is in your stockpile. You can track inventory levels, expiration dates, storage locations, and automatically update your stockpile when orders arrive.',
            },
            {
                question: 'How does the order management feature work?',
                answer:
                    'The order management feature allows you to track incoming peptide orders, automatically sync them into your stockpile when they arrive, and maintain a complete history of all your orders. You can track order status, expected delivery dates, vendor information, and automatically update inventory levels when orders are received.',
            },
        ],
    },
    {
        title: 'Features & Tools',
        faqs: [
            {
                question: 'What features are included?',
                answer:
                    'The Pep Planner includes protocol management, stockpile tracking, order management, vendor organization, research calendar, advanced analytics, dosage calculator, protocol history, goal tracking, and multi-device support.',
            },
            {
                question: 'How do I calculate peptide reconstitution dosages?',
                answer:
                    'The Pep Planner includes a built-in reconstitution calculator that makes it easy to calculate peptide dosages. Simply enter the peptide amount, desired concentration, and reconstitution volume, and the calculator will provide accurate dosage calculations.',
            },
            {
                question: 'Is the Recon Calculator really always free?',
                answer:
                    'Yes. The Reconstitution Calculator is always available — no subscription, no trial, no caps. Safety-critical tooling should never sit behind a paywall.',
            },
            {
                question: 'What analytics are available?',
                answer:
                    'The Pep Planner provides advanced analytics including protocol adherence tracking, dosing history, inventory trends, spending analysis, and research progress metrics.',
            },
        ],
    },
    {
        title: 'Data & Security',
        faqs: [
            {
                question: 'Is my research data secure?',
                answer:
                    'Yes, all data is encrypted and stored securely in the cloud using industry-standard security practices. We use Firebase\'s secure infrastructure with encryption in transit and at rest, and we never share your data with third parties.',
            },
            {
                question: 'Can I sync data across devices?',
                answer:
                    'Yes, The Pep Planner includes cloud sync so your research data is available on all your devices — web and mobile. Cloud sync requires a Research+ or Founder plan.',
            },
            {
                question: 'Does The Pep Planner work offline?',
                answer:
                    'The Pep Planner works as a Progressive Web App that can function offline for basic viewing and data entry. Your data is automatically synced when you\'re back online.',
            },
        ],
    },
    {
        title: 'Support & Help',
        faqs: [
            {
                question: 'What kind of support is available?',
                answer:
                    'The Pep Planner offers comprehensive support including help documentation, email support, and a knowledge base with guides and best practices.',
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
