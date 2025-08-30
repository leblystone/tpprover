import React, { useState, useEffect, useMemo } from 'react';
import OverlayTour from './OverlayTour';
import { useNavigate } from 'react-router-dom';

const TOUR_STEPS = [
    {
        target: '[data-tour="sidebar-recon"]',
        content: "Here's where the magic happens! 🧪\n\n- Track every vial you reconstitute and link it to a vendor.\n- Choose your delivery method: syringe 💉 or pen 🖊️.\n- Pick a color for your pen to keep things organized!\n- Use the calculator to figure out your doses.",
        title: 'Reconstitution',
        path: '/recon',
    },
    {
        target: '[data-tour="sidebar-protocols"]',
        content: "This is where you plan your research! 🗓️\n\n- Create detailed schedules for **single peptides** or complex **stacks**.\n- Define dosages, durations, and frequencies (daily, weekly, or cycles).\n- Press the **▶️ Start Protocol** button to automatically schedule everything on your calendar.\n- You can also **share** your protocols with other researchers! 🤝",
        title: 'Protocols',
        path: '/protocols',
    },
    {
        target: '[data-tour="sidebar-calendar"]',
        content: "Your research, all in one place! 🗓️\n\n- **Monthly View:** Get a bird's-eye view of your schedule. See at a glance which days have planned doses, washouts, or group buys.\n- **Weekly View:** Zoom in for the details. See your specific doses for each day and mark them as complete as you go.\n- **Automatic Scheduling:** Everything is synced! Your active protocols, washouts, and group buys will appear here automatically.",
        title: 'Calendar',
        path: '/calendar',
    },
    {
        target: '[data-tour="sidebar-stockpile"]',
        content: "Your personal inventory system! 📦\n\n- Keep track of everything you have on hand, organized by **peptide** and **vendor**.\n- Delivered orders are **automatically added** here, so your inventory is always up-to-date.\n- Get alerts when you're **low on stock**.\n- Send any item directly to the **Recon Calculator** 💧 to plan your next vial.",
        title: 'Stockpile',
        path: '/stockpile',
    },
    {
        target: '[data-tour="sidebar-orders"]',
        content: "Track your orders from start to finish! 🚚\n\n- Manage **domestic**, **international**, and **group buys** all in one place.\n- When an order is **\"Delivered\"**, its items are automatically added to your **Stockpile**. 📦\n- Attach **receipts** or **lab results** to any order to keep your records organized. 📎",
        title: 'Orders',
        path: '/orders',
    },
    {
        target: '[data-tour="sidebar-vendors"]',
        content: "Your personal address book for every source. 👥\n\n- Keep track of contact info, accepted **payment methods** 💳, and your own private notes.\n- Use **labels** like \"Fast Shipping\" to remember your experiences.\n- Add their social media or email for **one-click access** to a DM or new message! 🚀\n- You can also **share** your trusted sources with fellow researchers. 🤫",
        title: 'Vendors',
        path: '/vendors',
    },
    {
        target: '[data-tour="sidebar-announcements"]',
        content: "Stay in the loop! 📣\n\n- Get the latest **news and updates** directly from The Pep Planner team.\n- Be the first to know about **new features** and improvements.\n- React to posts to **share your feedback** and help shape the future of the app! 👍",
        title: 'Announcements',
        path: '/announcements',
    },
    {
        target: '[data-tour="topbar-glossary"]',
        content: "Your quick reference guide! 📖\n\n- Look up peptides for **quick, high-level details**.\n- This is for **research purposes only** and is not medical advice. 🚩\n- Coming soon: **AI-powered summaries** for even more data! 🤖",
        title: 'Peptide Glossary',
        path: '/dashboard',
    },
    {
        target: '[data-tour="topbar-import"]',
        content: "Save time on data entry! 📄\n\n- Use your camera to **scan images** of your research notes.\n- **Upload spreadsheets** to import data directly into your planner.\n- Perfect for migrating from an old tracking system!",
        title: 'Import (OCR)',
        path: '/dashboard',
    },
    {
        target: 'body',
        content: "That's the grand tour of The Pep Planner!\n\nFeel free to explore and start organizing your research.\nIf you ever need a refresher you can restart this tour from your Settings.\n\nHappy researching!",
        placement: 'center',
        title: "You're all set! ✅",
        path: '/dashboard',
    }
];

const renderContent = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => (
        <div key={i}>
            {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                }
                return part;
            })}
        </div>
    ));
};

const TourTooltip = ({ index, step, backProps, closeProps, primaryProps, tooltipProps, isLastStep, theme }) => {
    const content = (
        <div {...tooltipProps} className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full border animate-fade-in" style={{ borderColor: theme.border }}>
            {step.title && <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>{step.title}</h2>}
            <div className="text-sm" style={{ color: theme.text }}>{renderContent(step.content)}</div>
            <div className="flex items-center justify-between mt-4">
                <button {...closeProps} className="text-xs hover:underline" style={{ color: theme.textMuted }}>Skip tour</button>
                <div className="flex items-center gap-2">
                    {index > 0 && (
                        <button {...backProps} className="px-3 py-1.5 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}`}}>
                            Back
                        </button>
                    )}
                    <button {...primaryProps} className="px-3 py-1.5 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: theme.primary }}>
                        {isLastStep ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (isLastStep && step.placement === 'center') {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    return content;
};

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
};

export default function Tour({ theme, startTour, onTourEnd, installPrompt }) {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const tourSteps = useMemo(() => TOUR_STEPS, []);

    useEffect(() => {
        if (!startTour) return;
        setStepIndex(0);
        const firstStep = tourSteps[0];
        const firstPath = getPathForStep(firstStep);
        if (window.location.pathname !== firstPath) {
            navigate(firstPath);
        }
        // Start immediately after a frame to ensure any overlays unmount
        requestAnimationFrame(() => setRun(true));
    }, [startTour, tourSteps]);

    useEffect(() => {
        // Keep 'run' state in sync with prop in case it's toggled while mounted
        if (!startTour) {
            setRun(false)
        }
    }, [startTour])

    const goToStep = (nextIndex) => {
        const clamped = Math.max(0, Math.min(tourSteps.length - 1, nextIndex));
        const nextStep = tourSteps[clamped];
        const nextPath = getPathForStep(nextStep);
        if (window.location.pathname !== nextPath) {
            navigate(nextPath);
        }
        // Delay index update slightly to allow route to render targets
        setTimeout(() => setStepIndex(clamped), 50);
    };
    
    const getPathForStep = (step) => {
        return step.path || '/dashboard';
    };
    
    return (
        <OverlayTour
            open={run}
            steps={tourSteps.map(s => ({ target: s.target, content: renderContent(s.content), title: s.title, position: s.placement || 'right' }))}
            currentIndex={stepIndex}
            onIndexChange={goToStep}
            onFinish={() => { setRun(false); onTourEnd(); }}
            onRequestInstall={() => {
                try {
                    if (installPrompt) {
                        installPrompt.prompt();
                        return;
                    }
                } catch {}
                try {
                    alert('To install the app: use your browser menu and choose "Install App".');
                } catch {}
            }}
            theme={theme}
        />
    );
}
