import React, { useState, useEffect, useMemo } from 'react';
import OverlayTour from './OverlayTour';
import { useNavigate } from 'react-router-dom';
import { isNative } from '../../utils/platform';

const TOUR_STEPS = [
    {
        target: 'body',
        content: "The Pep Planner helps organize, track, and ultimately make your research easier! Developed with the pep community in mind; it's the cornerstone tool you need. Take the next 30 days and take a look around! Happy researching! 🧪\n\nLet's take a quick tour of your research management system. We'll visit each main page to show you what it does.",
        title: 'Welcome!',
        placement: 'center',
        path: '/app/dashboard',
    },
    {
        target: 'body',
        content: "**Dashboard** - Your command center 📊\n\nGet a complete overview of your research at a glance. See your active protocols, upcoming doses, recent orders, and key metrics all in one place.",
        title: 'Dashboard Overview',
        placement: 'center',
        path: '/app/dashboard',
    },
    {
        target: 'body',
        content: "**Protocols** - Plan your research 🗓️\n\nCreate detailed schedules for single peptides or complex stacks. Define dosages, durations, and frequencies. Start protocols to automatically schedule everything on your calendar.",
        title: 'Protocols',
        placement: 'center',
        path: '/app/protocols',
    },
    {
        target: 'body',
        content: "**Reconstitute** - Track your vials 🧪\n\nCalculate reconstitution doses, track every vial you prepare, and choose your delivery method (pipette or pen). Keep everything organized with color-coded pens.",
        title: 'Reconstitute',
        placement: 'center',
        path: '/app/recon',
    },
    {
        target: 'body',
        content: "**Stockpile** - Your inventory 📦\n\nTrack everything you have on hand, organized by peptide and vendor. Get alerts when you're low on stock and easily send items to the recon calculator.",
        title: 'Stockpile',
        placement: 'center',
        path: '/app/stockpile',
    },
    {
        target: 'body',
        content: "**Orders** - Track purchases 🚚\n\nManage domestic, international, and group buys all in one place. When orders are delivered, items automatically appear in your stockpile.",
        title: 'Orders',
        placement: 'center',
        path: '/app/orders',
    },
    {
        target: 'body',
        content: "**Vendors** - Your source directory 👥\n\nKeep track of contact info, payment methods, and private notes for every source. Use labels to remember your experiences and share trusted sources.",
        title: 'Vendors',
        placement: 'center',
        path: '/app/vendors',
    },
    {
        target: 'body',
        content: "**Calendar** - Your research schedule 🗓️\n\nSee your complete research schedule with monthly and weekly views. Everything syncs automatically from your active protocols and orders.",
        title: 'Calendar',
        placement: 'center',
        path: '/app/calendar',
    },
    {
        target: 'body',
        content: "That's it! You're ready to start organizing your research. 🎉\n\nEach page has helpful tips and empty states to guide you. You can always restart this tour from Settings if you need a refresher.\n\nHappy researching!",
        title: "You're all set! ✅",
        placement: 'center',
        path: '/app/dashboard',
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
            // Use replace to avoid navigation stack issues
            navigate(firstPath, { replace: true });
        }
        // Start with longer delay to ensure DOM is stable
        const timer = setTimeout(() => setRun(true), 100);
        return () => clearTimeout(timer);
    }, [startTour, tourSteps, navigate]);

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
        
        // First, hide the tour to prevent render conflicts
        setRun(false);
        
        if (window.location.pathname !== nextPath) {
            // Use replace to avoid navigation stack issues
            navigate(nextPath, { replace: true });
        }
        
        // Wait for navigation to complete and DOM to stabilize before showing tour again
        setTimeout(() => {
            setStepIndex(clamped);
            setRun(true);
        }, 150);
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
            // Only show install prompt for PWA (web), not for native apps
            onRequestInstall={!isNative() ? () => {
                try {
                    if (installPrompt) {
                        installPrompt.prompt();
                        return;
                    }
                } catch {}
                try {
                    alert('To install the app: use your browser menu and choose "Install App".');
                } catch {}
            } : undefined}
            theme={theme}
        />
    );
}

