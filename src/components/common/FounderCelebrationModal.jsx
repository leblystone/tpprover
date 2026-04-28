import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Sparkles, Crown, Star } from 'lucide-react';

/**
 * Founding Member celebration modal.
 *
 * Opens when a founding member taps their badge. Shows a short
 * confetti-style CSS animation and explains what "Founding Member" means
 * to them — price grandfathering, first feature access, and a permanent
 * thank-you.
 */
export default function FounderCelebrationModal({ open, onClose, theme, user }) {
    const closeBtnRef = useRef(null);

    useEffect(() => {
    if (open) {
        const t = setTimeout(() => closeBtnRef.current?.focus(), 100);
        return () => clearTimeout(t);
    }
  }, [open]);

    if (!open) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
                zIndex: 99999,
                backgroundColor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                style={{
                    backgroundColor: theme?.cardBackground || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Founding Member"
            >
                {/* Animated gold header */}
                <div className="relative overflow-hidden px-6 pt-7 pb-5 text-center"
                    style={{ background: 'linear-gradient(135deg, #C8922A 0%, #E8C55A 40%, #D4A030 70%, #B8832A 100%)' }}
                >
                    {/* Floating sparkle particles */}
                    <div className="absolute inset-0 pointer-events-none" aria-hidden>
                        {[...Array(14)].map((_, i) => (
                            <span
                                key={i}
                                className="absolute block rounded-full opacity-0"
                                style={{
                                    width: `${4 + (i % 5) * 3}px`,
                                    height: `${4 + (i % 5) * 3}px`,
                                    backgroundColor: i % 3 === 0 ? '#fff7d6' : i % 3 === 1 ? '#fff' : '#ffe08a',
                                    left: `${5 + (i * 7) % 90}%`,
                                    top: `${10 + (i * 13) % 80}%`,
                                    animation: `founderParticle ${1.4 + (i % 5) * 0.3}s ease-out ${(i % 7) * 0.12}s forwards`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)' }}>
                            <Crown size={32} color="#fff" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight drop-shadow">
                            Founding Member
                        </h2>
                    </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                    <p className="text-sm leading-relaxed text-center" style={{ color: theme?.text }}>
                        You were here before Research+ launched — and that means everything.
                        As a Founding Researcher, you're permanently recognized as part of the team that built this from day one.
                    </p>

                    <div className="space-y-2">
                        {[
                            { icon: Star,    text: 'First access to every new feature before anyone else' },
                            { icon: Crown,   text: 'Permanently grandfathered at your original price — forever' },
                            { icon: Sparkles,text: 'Founding Member badge shown on your profile and future community features' },
                        ].map(({ icon: Icon, text }, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div
                                    className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #D4A030, #E8C55A)', boxShadow: '0 2px 6px rgba(200,146,42,0.3)' }}
                                >
                                    <Icon size={13} color="#3A2B10" strokeWidth={2.5} />
                                </div>
                                <p className="text-xs leading-relaxed pt-0.5" style={{ color: theme?.textLight }}>
                                    {text}
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] text-center font-medium pt-1" style={{ color: theme?.textLight }}>
                        Thank you for believing in The Pep Planner. 💛
                    </p>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex justify-center">
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-full text-sm font-semibold active:scale-95 transition-transform"
                        style={{ background: 'linear-gradient(135deg, #C8922A, #E8C55A)', color: '#3A2B10' }}
                    >
                        Proud to be a Founder ✨
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 rounded-full hover:opacity-70 transition-opacity"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                    aria-label="Close"
                >
                    <X size={16} />
                </button>

                <style>{`
                    @keyframes founderParticle {
                        0%   { opacity: 0; transform: translateY(0) scale(0); }
                        20%  { opacity: 0.9; transform: translateY(-12px) scale(1); }
                        100% { opacity: 0; transform: translateY(-40px) scale(0.5); }
                    }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
