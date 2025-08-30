import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POINTERS = [
    { id: 'today-research', text: "View your daily schedule for peptides and supplements.", position: 'bottom' },
    { id: 'supplements-goals', text: "Track your supplements, goals, and progress.", position: 'left' },
    { id: 'action-buttons', text: "Quickly add new orders, vendors, and more.", position: 'top' },
    { id: 'body-metrics', text: "Log and visualize your body metrics over time.", position: 'top' },
    { id: 'incoming', text: "Keep an eye on incoming orders and group buys.", position: 'left' },
    { id: 'analytics', text: "Analyze your spending, compliance, and research data.", position: 'top' },
    { id: 'badges', text: "Earn badges for your achievements and milestones.", position: 'top' },
];

const Pointer = ({ from, to, position }) => {
    const isHorizontal = position === 'left' || position === 'right';
    const midX = from.x + (to.x - from.x) / 2;
    const midY = from.y + (to.y - from.y) / 2;

    const path = isHorizontal
        ? `M ${from.x} ${from.y} C ${midX} ${from.y} ${midX} ${to.y} ${to.x} ${to.y}`
        : `M ${from.x} ${from.y} C ${from.x} ${midY} ${to.x} ${midY} ${to.x} ${to.y}`;

    return (
        <g>
            <motion.path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            />
            <motion.circle
                cx={to.x}
                cy={to.y}
                r="4"
                fill="white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.7 }}
            />
        </g>
    );
};

export default function DashboardOnboarding({ open, onComplete, theme }) {
    const [positions, setPositions] = useState({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const svgRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        let rafId;

        const calculatePositions = () => {
            const newPositions = { ...positions };
            POINTERS.forEach(p => {
                const el = document.querySelector(`[data-tour-id="${p.id}"]`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    newPositions[p.id] = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        rect
                    };
                }
            });
            setPositions(newPositions);
            rafId = requestAnimationFrame(calculatePositions);
        };

        calculatePositions();
        return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Ensure the current step is visible
    useEffect(() => {
        if (!open) return;
        const step = POINTERS[currentIndex];
        const el = step ? document.querySelector(`[data-tour-id="${step.id}"]`) : null;
        if (el && typeof el.scrollIntoView === 'function') {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        }
    }, [open, currentIndex]);

    const getTargetPos = (pos, pointer) => {
        const MARGIN = 20;
        switch (pointer.position) {
            case 'top': return { x: pos.rect.left + pos.rect.width / 2, y: pos.rect.top - MARGIN };
            case 'bottom': return { x: pos.rect.left + pos.rect.width / 2, y: pos.rect.bottom + MARGIN };
            case 'left': return { x: pos.rect.left - MARGIN, y: pos.rect.top + pos.rect.height / 2 };
            case 'right': return { x: pos.rect.right + MARGIN, y: pos.rect.top + pos.rect.height / 2 };
            default: return { x: 0, y: 0 };
        }
    };

    const step = POINTERS[currentIndex];
    const from = step ? positions[step.id] : null;
    const targetPos = from ? getTargetPos(from, step) : null;

    const canPrev = currentIndex > 0;
    const canNext = currentIndex < POINTERS.length - 1;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[10000] bg-black/70"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence mode="wait">
                        {from && (
                            <motion.svg key={`dash-line-${currentIndex}`} ref={svgRef} width="100%" height="100%" className="absolute inset-0 pointer-events-none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                                <Pointer from={from} to={targetPos} position={step.position} />
                            </motion.svg>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {from && (
                            <motion.div
                                key={`dash-tip-${currentIndex}`}
                                className="absolute p-3 rounded text-center text-white font-semibold text-sm bg-black/60 max-w-xs"
                                style={{
                                    left: targetPos.x,
                                    top: targetPos.y,
                                    transform: 'translate(-50%, -110%)'
                                }}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                            >
                                {step.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border flex items-center gap-1 p-1">
                        <button
                            disabled={!canPrev}
                            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                            className="px-3 py-1.5 text-sm rounded-full disabled:opacity-40"
                            style={{ color: theme.text }}
                        >
                            Back
                        </button>
                        <div className="px-3 text-xs" style={{ color: theme.textMuted }}>
                            {currentIndex + 1} / {POINTERS.length}
                        </div>
                        {canNext ? (
                            <button
                                onClick={() => setCurrentIndex(i => Math.min(POINTERS.length - 1, i + 1))}
                                className="px-3 py-1.5 text-sm rounded-full text-white"
                                style={{ backgroundColor: theme.primary }}
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={onComplete}
                                className="px-3 py-1.5 text-sm rounded-full text-white"
                                style={{ backgroundColor: theme.primary }}
                            >
                                Finish
                            </button>
                        )}
                        <button
                            onClick={onComplete}
                            className="px-3 py-1.5 text-sm rounded-full"
                            style={{ color: theme.text }}
                        >
                            Skip
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


